# 💻 Module 4: Zero-Cost Live Coding Execution Engine & Workspace

## Overview
Module 4 provides a production-grade, multi-language live coding environment operating strictly within a ₹0 infrastructure budget.

## Execution Architecture
- **In-Backend Subprocess Sandboxing**: Uses `child_process.spawn` within the Node.js Express backend.
- **Dynamic Host Runtimes**: Discovers compilers on startup (`node`, `python3`, `g++`, `gcc`, `javac`, `ts-node`, `go`).
- **Resource Hardening**:
  - `CHILD_KILL_TIMEOUT_MS`: 5000ms hard process tree termination.
  - `MAX_OUTPUT_BYTES`: 64KB buffer truncation.
  - V8 Memory Caps: `--max-old-space-size=256`.
  - Secret Isolation: `process.env` completely stripped of MongoDB URIs, JWT secrets, and payment keys.
- **Fail-Closed 503 Policy**: Strictly disallows unisolated subprocess execution in production without dedicated kernel sandboxes.
- **Monaco Workspace**:
  - Horizontal resizable splitter (20% to 75%).
  - Vertical resizable console splitter (45px to 75%) with one-click collapse/expand.
  - Hidden test case masking ensuring zero test case leakage.
  - `localStorage` dimension persistence.
