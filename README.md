# 🤖 Prepper AI — Enterprise Full-Stack AI Technical Interview Platform

<p align="center">
  <img src="https://img.shields.io/badge/MERN%20Stack-Production--Ready-00D8FF?style=for-the-badge&logo=react&logoColor=black" alt="MERN Stack" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Monaco_Editor-1E1E1E?style=for-the-badge&logo=visualstudiocode&logoColor=007ACC" alt="Monaco Editor" />
  <img src="https://img.shields.io/badge/Node.js%20%2B%20Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB%20Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/OpenRouter%20AI-6366F1?style=for-the-badge&logo=openai&logoColor=white" alt="OpenRouter" />
  <img src="https://img.shields.io/badge/Razorpay-11397b?style=for-the-badge&logo=razorpay&logoColor=white" alt="Razorpay" />
  <img src="https://img.shields.io/badge/License-ISC-yellow.svg?style=for-the-badge" alt="License" />
</p>

---

## 🌟 Executive Summary

**Prepper AI** is an enterprise-grade, full-stack AI technical interview preparation and candidate evaluation platform built with the MERN stack (MongoDB, Express, React, Node.js). It simulates high-stakes technical, behavioral, project-defense, and live coding interviews with human-caliber AI feedback, real-time code execution, dynamic difficulty steering, and evidence-grounded performance analytics.

The platform is designed around four tightly integrated core modules:
1. **Module 1 — Conversational Mock Interview Engine**: Audio/speech-driven conceptual interviews based on candidate resumes and job roles with 6-criterion rubric scoring.
2. **Module 2 — Dedicated Cross-Examination & Deep-Dive Probing**: Targeted resume project defense engine with progressive escalation, claim verification, and hallucination-resistant transcript grounding.
3. **Module 3 — Adaptive Questioning & Real-Time Steering**: Dynamic difficulty adjustment (Beginner $\leftrightarrow$ Intermediate $\leftrightarrow$ Advanced) with streak-based state transitions, weak-area detection, and Section F Trajectory reporting.
4. **Module 4 — Isolated Live Coding Execution Engine & Workspace**: A zero-cost (₹0 infrastructure), in-backend multi-language code execution engine with Monaco Editor, dynamic host compiler registry, ephemeral process sandboxing, hidden test case protection, concurrency limits, and a fully resizable dual-splitter workspace.

---

## 🏗️ High-Level System Architecture

Prepper AI integrates a responsive React single-page application with an Express REST API backend, MongoDB persistence, OpenRouter AI intelligence, and a sandboxed host-level child-process execution engine.

```mermaid
flowchart TD
    subgraph Client["Candidate Frontend (React 19 + Vite)"]
        UI_Home["Landing & Capabilities"]
        UI_Auth["Firebase / JWT Auth"]
        UI_Dash["Dashboard & History"]
        UI_Pricing["Credit Pricing & Razorpay Modal"]
        
        subgraph InterviewViews["Interview Workspaces"]
            V_Standard["Module 1: Voice Interview (/interview)"]
            V_Cross["Module 2: Cross-Examination (/cross-examination)"]
            V_Coding["Module 4: Resizable Monaco Coding Workspace (/coding/:id)"]
            V_Report["Analytics & Scorecard (/report/:id)"]
        end
    end

    subgraph BackendAPI["Backend Application (Node.js + Express)"]
        MW_Auth["Auth Middleware (JWT Verify)"]
        MW_Rate["Rate Limiter (express-rate-limit)"]
        MW_Upload["Multer PDF Processor (pdfjs-dist)"]
        
        subgraph Controllers["API Controllers"]
            C_Auth["auth.controller.js"]
            C_Interview["interview.controller.js"]
            C_Cross["crossExamination.controller.js"]
            C_Coding["coding.controller.js"]
            C_Payment["payment.controller.js"]
        end

        subgraph CoreServices["Domain Services"]
            S_OpenRouter["openRouter.service.js (LLM Engine)"]
            S_Pricing["interviewPricing.service.js (Credit Math)"]
            S_Adaptive["adaptiveQuestion.service.js (Module 3)"]
            S_CrossExam["answerAnalysis.service.js (Module 2)"]
            S_Evaluation["answerEvaluation.service.js (Evidence Scoring)"]
        end

        subgraph CodeExecutionEngine["Module 4: Zero-Cost Execution Subsystem"]
            S_Adapter["executionAdapter.service.js"]
            S_LocalProv["local.provider.js"]
            S_Registry["languageRegistry.js (Compiler Discovery)"]
            S_Runner["testCaseRunner.js (Hidden Test Masking)"]
            S_ExecService["execution.service.js (Process Sandboxing)"]
            S_Limits["executionLimits.js & executionValidator.js"]
        end
    end

    subgraph DataStorage["Persistence & External Services"]
        DB_Mongo[(MongoDB Atlas / Local)]
        EXT_OpenRouter["OpenRouter AI (Meta Llama / Nemotron)"]
        EXT_Razorpay["Razorpay Payment Gateway"]
        EXT_HostRuntimes["Local Host Runtimes (Node, Python3, GCC, G++, Java, Go)"]
    end

    %% Client to Backend
    Client -->|HTTPS / REST API| MW_Rate
    MW_Rate --> MW_Auth
    MW_Auth --> Controllers
    MW_Upload --> C_Interview
    MW_Upload --> C_Cross

    %% Controllers to Services
    C_Interview --> S_OpenRouter
    C_Interview --> S_Adaptive
    C_Interview --> S_Evaluation
    C_Interview --> S_Pricing

    C_Cross --> S_OpenRouter
    C_Cross --> S_CrossExam
    C_Cross --> S_Pricing

    C_Coding --> S_Adapter
    C_Coding --> S_Pricing
    S_Adapter --> S_LocalProv
    S_LocalProv --> S_Runner
    S_Runner --> S_ExecService
    S_ExecService --> S_Registry
    S_ExecService --> S_Limits

    %% Services to External
    Controllers --> DB_Mongo
    S_OpenRouter --> EXT_OpenRouter
    C_Payment --> EXT_Razorpay
    S_ExecService -->|Isolated Child Process (Spawn)| EXT_HostRuntimes
```

---

## 🛠️ Complete Technology Stack

| Layer | Technology | Version | Purpose & Architectural Role |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React** | `^19.0.0` | Declarative UI, component lifecycle, hooks, context |
| **Build Tool** | **Vite** | `^7.3.1` | Ultra-fast HMR, Rollup production bundling, asset optimization |
| **Styling** | **Tailwind CSS** | `^3.4.17` | Utility-first responsive design, dark-mode styling, fluid layouts |
| **Animations** | **Framer Motion** | `^12.4.7` | Smooth transitions, modal overlays, progress bars, interactive cards |
| **Code Editor** | **Monaco Editor** | `@monaco-editor/react ^4.7.0` | VS Code-powered syntax highlighting, auto-indent, code formatting |
| **Charts & Gauges** | **Recharts & Circular Progressbar** | `^2.15.1` / `^2.1.0` | Visualizing category mastery, difficulty trajectories, score meters |
| **State Management** | **Redux Toolkit** | `^2.5.1` | Global auth, user credits, interview sessions, modal states |
| **HTTP Client** | **Axios** | `^1.7.9` | Interceptor-managed API calls with cookie authentication |
| **Backend Runtime** | **Node.js** | `v18+` / `v20+` | Asynchronous event-driven JavaScript server runtime |
| **Web Framework** | **Express.js** | `^4.21.2` | RESTful routing, middleware pipeline, error management |
| **Database** | **MongoDB Atlas** | `v7.0+` | NoSQL document database, ACID transactions, complex aggregations |
| **ODM** | **Mongoose** | `^8.10.1` | Strict schema validation, pre/post hooks, virtual fields |
| **AI Orchestration** | **OpenRouter API** | — | Meta Llama 3.3 70B, Nvidia Nemotron, fault-tolerant retry workflows |
| **PDF Processing** | **`pdfjs-dist` & Multer** | `^4.10.38` / `^1.4.5` | In-memory resume text extraction without disk pollution |
| **Payment Gateway** | **Razorpay Node SDK** | `^2.9.5` | Webhook verification, order creation, dynamic credit wallet reloads |
| **Security & Sandbox**| **Child Process (`child_process.spawn`)** | Built-in | Ephemeral compilation, execution timeouts, memory caps, secret masking |
