#!/usr/bin/env bash
# ==============================================================================
# Prepper AI — Module 4: Standalone Docker-Free Go-Judge Worker Setup Script
# Target OS: Ubuntu 20.04 / 22.04 / 24.04 LTS or Debian 11 / 12
# Architecture: AMD64 (x86_64) or ARM64 (aarch64)
# Requirements: Root/sudo access. ZERO Docker, ZERO PostgreSQL, ZERO Redis.
# ==============================================================================

set -euo pipefail

echo "===================================================================="
echo " PREPPER AI — LINUX EXECUTION WORKER DEPLOYMENT (DOCKER-FREE)"
echo "===================================================================="

# 1. Root Check
if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root (use sudo ./deploy-go-judge-worker.sh)" >&2
   exit 1
fi

# 2. Detect Architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)
    GO_JUDGE_ARCH="amd64"
    ;;
  aarch64|arm64)
    GO_JUDGE_ARCH="arm64"
    ;;
  *)
    echo "Error: Unsupported CPU architecture: $ARCH (requires x86_64 or aarch64)" >&2
    exit 1
    ;;
esac
echo "[1/7] Detected architecture: $ARCH (using $GO_JUDGE_ARCH binary)"

# 3. Update System & Install Language Toolchains
echo "[2/7] Installing language compilers and runtimes..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  build-essential \
  gcc \
  g++ \
  python3 \
  python3-minimal \
  default-jdk-headless \
  curl \
  wget \
  ca-certificates \
  openssl

# Install Node.js LTS if not present
if ! command -v node &> /dev/null; then
  echo "Installing Node.js LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Toolchains installed:"
echo " - GCC:    $(gcc --version | head -n1)"
echo " - G++:    $(g++ --version | head -n1)"
echo " - Python: $(python3 --version)"
echo " - Java:   $(java -version 2>&1 | head -n1)"
echo " - Node:   $(node --version)"

# 4. Create Dedicated Worker Directory
INSTALL_DIR="/opt/go-judge"
echo "[3/7] Setting up install directory at $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 5. Fetch Standalone Go-Judge Binary
LATEST_VERSION="v1.8.6"
BINARY_URL="https://github.com/criyle/go-judge/releases/download/${LATEST_VERSION}/exec_server_linux_${GO_JUDGE_ARCH}"

echo "[4/7] Downloading precompiled Go-Judge binary (${LATEST_VERSION} for ${GO_JUDGE_ARCH})..."
curl -fsSL -o "$INSTALL_DIR/go-judge" "$BINARY_URL"
chmod +x "$INSTALL_DIR/go-judge"

# 6. Generate Cryptographic Secret Token
TOKEN_FILE="$INSTALL_DIR/.auth_token"
if [[ -f "$TOKEN_FILE" ]]; then
  AUTH_TOKEN=$(cat "$TOKEN_FILE")
  echo "[5/7] Preserving existing authentication token"
else
  AUTH_TOKEN=$(openssl rand -hex 32)
  echo "$AUTH_TOKEN" > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
  echo "[5/7] Generated new secure authentication token"
fi

# 7. Configure systemd Service with Transient Scopes and Token Auth
echo "[6/7] Creating systemd service (/etc/systemd/system/go-judge.service)..."
cat <<EOF > /etc/systemd/system/go-judge.service
[Unit]
Description=Go-Judge Sandbox Execution Engine
Documentation=https://github.com/criyle/go-judge
After=network.target dbus.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/go-judge
ExecStart=/opt/go-judge/go-judge \\
    -http-addr 0.0.0.0:5050 \\
    -auth-token ${AUTH_TOKEN} \\
    -silent

Restart=always
RestartSec=3

# Resource and Sandbox Security Isolation
CapabilityBoundingSet=CAP_SYS_ADMIN CAP_SETUID CAP_SETGID CAP_SYS_CHROOT
LimitNPROC=infinity
LimitCORE=infinity

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable go-judge.service
systemctl restart go-judge.service

# 8. Verify Local Health
sleep 2
echo "[7/7] Verifying Go-Judge health check..."
HEALTH_CHECK=$(curl -s -H "Authorization: Bearer ${AUTH_TOKEN}" http://127.0.0.1:5050/version || echo "FAILED")

if [[ "$HEALTH_CHECK" == *"version"* ]] || [[ "$HEALTH_CHECK" == *"go-judge"* ]]; then
  echo ">>> Go-Judge service is active and responding!"
else
  echo "Warning: Go-Judge service responded with: $HEALTH_CHECK"
fi

PUBLIC_IP=$(curl -s https://api.ipify.org || echo "<YOUR-WORKER-PUBLIC-IP>")

echo ""
echo "===================================================================="
echo " PREPPER AI WORKER DEPLOYMENT COMPLETE!"
echo "===================================================================="
echo " Worker HTTP Port: 5050"
echo " Auth Secret:      $AUTH_TOKEN"
echo ""
echo " Add these environment variables to your Render Web Service:"
echo "--------------------------------------------------------------------"
echo "CODE_EXECUTION_ENABLED=true"
echo "CODE_EXECUTION_PROVIDER=go-judge"
echo "CODE_EXECUTION_URL=http://${PUBLIC_IP}:5050"
echo "CODE_EXECUTION_API_KEY=${AUTH_TOKEN}"
echo "CODE_EXECUTION_TIMEOUT=12000"
echo "MAX_CONCURRENT_EXECUTIONS=10"
echo "===================================================================="
