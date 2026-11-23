# Prepper AI — Deprecation Notice: Local Judge0 Docker Infrastructure

> **Notice**: As per Prepper AI Module 4 architecture constraints (Zero Infrastructure Budget, No Local Docker, No PostgreSQL, No Redis, Render Free Tier compatibility), the Docker Compose and Judge0 CE configurations in this folder are **archived/deprecated**.

### Runtime Execution Architecture
Module 4 code execution is decoupled into the pluggable execution adapter:
- **Location**: `Backend/services/coding/executionAdapter.service.js`
- **Supported Providers**:
  1. `mock` (Default Hermetic Provider): Simulates C, C++, Python, Java, JavaScript, compilation errors, runtime exceptions, TLE, and output without running code in the Node process or requiring external services. Ideal for local dev, testing, and 100% free hosting.
  2. `go-judge`: Standalone unprivileged micro-sandbox binary communicating via lightweight HTTP REST (`POST /run`).
  3. `piston`: Standard multi-language REST code execution engine.

### Zero-Budget Render & Vercel Compatibility
- The Express backend running on Render Free tier never executes candidate code directly (`child_process` execution is forbidden for security).
- No background Docker daemon, PostgreSQL, or Redis instances are required to run the coding interview environment.
