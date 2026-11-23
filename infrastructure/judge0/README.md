# Prepper AI — Judge0 Community Edition (CE) Infrastructure

## 1. Overview: What is Judge0 & Why Prepper AI Uses It

**Judge0 Community Edition (CE)** is an open-source, robust, multi-language code execution engine designed to execute untrusted code in a sandboxed, resource-bounded environment.

### Why Prepper AI Uses Judge0 CE
1. **Zero Recurring Infrastructure Cost (₹0)**: Self-hostable locally via Docker without paid subscriptions, API keys, or cloud platform lock-in.
2. **True Kernel-Level Sandbox Isolation**: Submitted code is executed in isolated Linux namespaces using `isolate` and cgroups, guaranteeing process, memory, and filesystem boundaries.
3. **Multi-Language Architecture**: Out-of-the-box support for over 60 languages, including JavaScript (Node.js), Python 3, C++, Java, TypeScript, C, C#, and Go.
4. **Deterministic Metrics**: Captures precise execution duration (down to milliseconds), memory usage (KB), exit codes, standard output (`stdout`), standard error (`stderr`), and compiler diagnostics.
5. **Architectural Decoupling**: Untrusted candidate code is never executed inside Prepper AI's Express backend process or main application container.

---

## 2. Prerequisites & Installation Requirements

Before starting the execution engine, ensure your host has the following:

- **Docker Desktop** (or Docker Engine on Linux) with Docker Compose v2.
  - On Windows: Ensure **WSL 2 backend** is enabled in Docker Desktop settings.
- **Port Availability**:
  - `2358` (Judge0 Server API)
  - Note: Postgres (`5432`) and Redis (`6379`) are isolated to Docker's internal bridge network and **not exposed** to the host.

---

## 3. Directory Layout

```text
infrastructure/judge0/
├── docker-compose.yml   # Official multi-container deployment (Server, Worker, DB, Redis)
├── judge0.conf          # Configuration parameters, resource limits, and internal credentials
├── .env.example         # Template environment variables
└── README.md            # Comprehensive operational documentation (this file)
```

---

## 4. Initial Setup & Environment Configuration

1. **Navigate to the Judge0 directory**:
   ```bash
   cd infrastructure/judge0
   ```

2. **Verify Configuration**:
   The `judge0.conf` file is pre-configured with secure default internal passwords for local development:
   - `REDIS_PASSWORD`: Password for internal Redis queue.
   - `POSTGRES_PASSWORD`: Password for the internal results PostgreSQL store.
   - `JUDGE0_TELEMETRY_ENABLE=false`: Telemetry disabled for privacy and performance.

3. **Backend Environment**:
   In `Backend/.env`, ensure the following environment variable points to your local instance:
   ```env
   JUDGE0_API_URL=http://localhost:2358
   ```

---

## 5. Operational Commands

### Starting Judge0
To start the Judge0 server, asynchronous worker, Redis queue, and Postgres database in detached background mode:
```bash
docker compose -f infrastructure/judge0/docker-compose.yml up -d
```

### Checking Container Health & Status
```bash
docker compose -f infrastructure/judge0/docker-compose.yml ps
```

### Viewing Real-Time Logs
```bash
# View all container logs
docker compose -f infrastructure/judge0/docker-compose.yml logs -f

# View worker logs specifically (where code execution happens)
docker compose -f infrastructure/judge0/docker-compose.yml logs -f worker
```

### Stopping Judge0
```bash
docker compose -f infrastructure/judge0/docker-compose.yml down
```

### Stopping Judge0 and Cleaning Volumes
```bash
docker compose -f infrastructure/judge0/docker-compose.yml down -v
```

---

## 6. Verifying Health & Testing Execution

### 1. API Health Check
Run in PowerShell or terminal:
```bash
curl http://localhost:2358/about
```
Expected output:
```json
{
  "version": "1.13.1",
  "arch": "x86_64"
}
```

### 2. Supported Languages Verification
```bash
curl http://localhost:2358/languages
```

### 3. Testing a Synchronous Submission via CLI
**Test JavaScript Execution:**
```bash
curl -X POST "http://localhost:2358/submissions?wait=true" \
  -H "Content-Type: application/json" \
  -d '{"source_code": "console.log(40 + 2);", "language_id": 63}'
```
Expected output:
```json
{
  "stdout": "42\n",
  "status": {
    "id": 3,
    "description": "Accepted"
  }
}
```

---

## 7. Supported Programming Languages & IDs

Prepper AI queries `/languages` dynamically from Judge0. The core mappings include:

| Language | Judge0 ID | Monaco Identifier | File Extension |
| :--- | :--- | :--- | :--- |
| **JavaScript (Node.js)** | 63 | `javascript` | `.js` |
| **Python 3** | 71 | `python` | `.py` |
| **C++ (GCC)** | 54 | `cpp` | `.cpp` |
| **Java (OpenJDK)** | 62 | `java` | `.java` |
| **TypeScript** | 74 | `typescript` | `.ts` |
| **C (GCC)** | 50 | `c` | `.c` |
| **C# (Mono)** | 51 | `csharp` | `.cs` |
| **Go** | 60 | `go` | `.go` |

---

## 8. Security Boundaries & Resource Limits

1. **Kernel Namespace Isolation**:
   Containers run with Linux kernel namespaces (`isolate`), isolating process table, mount points, IPC, and network sockets.
2. **Network Isolation**:
   Untrusted code executed inside the worker container has **zero external network access**, preventing SSRF, reverse shells, and external data exfiltration.
3. **Execution Limits (configured in `judge0.conf`)**:
   - `CPU_TIME_LIMIT`: 5.0 seconds.
   - `WALL_TIME_LIMIT`: 10.0 seconds.
   - `MEMORY_LIMIT`: 128,000 KB (128 MB).
   - `MAX_PROCESSES_AND_OR_THREADS`: 64 (mitigates fork-bombs).
4. **Internal Port Restriction**:
   PostgreSQL (`5432`) and Redis (`6379`) ports are **never bound to host interfaces**; communication is strictly contained within the internal Docker bridge network (`judge0_default`).
5. **Test Case Privacy**:
   Hidden test case inputs and expected outputs are evaluated exclusively on the server and are **never transmitted to the frontend**.

---

## 9. Troubleshooting & Common Errors

| Error Description | Cause | Resolution |
| :--- | :--- | :--- |
| `Judge0 health check failed / ECONNREFUSED` | Containers are not running. | Run `docker compose -f infrastructure/judge0/docker-compose.yml up -d` and check `docker ps`. |
| `Status 5: Time Limit Exceeded (TLE)` | Code contains an infinite loop or excessive recursion. | Optimize the algorithmic complexity to run within the 5.0s CPU limit. |
| `Status 6: Compilation Error` | Syntax error or missing header/class in compiled languages (C++, Java). | Check the `compileOutput` diagnostic message returned by the API. |
| `Status 11: Runtime Error (NZEC)` | Process exited with non-zero status code (e.g., uncaught exception or index error). | Check standard error (`stderr`) details for line number and stack trace. |
| `Privileged mode error on worker startup` | Docker daemon does not permit privileged containers. | Ensure Docker Desktop is in Linux Container mode with WSL2 integration enabled. |
