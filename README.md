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

---

## 🎯 Deep Dive: Module 1 — Conversational Mock Interview Engine

### 1.1 Overview & Objective
Module 1 delivers an authentic, conversational voice- and text-driven technical interview simulation tailored to the candidate's target job role, experience level, and resume projects. It replicates the initial technical screening and behavioral assessment conducted by engineering leads.

### 1.2 Resume Processing Pipeline
When a candidate uploads a PDF resume:
1. **In-Memory Streaming**: Multer intercepts the multipart upload into a memory buffer without persisting sensitive files to the filesystem.
2. **Deterministic Text Extraction**: `pdfjs-dist` parses the PDF document page-by-page, extracting raw textual content, headers, projects, technologies, and work history.
3. **Entity & Role Normalization**: The backend extracts key skills, tech stacks, and domain expertise to calibrate question generation.

### 1.3 6-Criterion Evaluation Matrix
Every candidate answer is evaluated across 6 weighted rubrics:

| Metric | Description | Weight |
| :--- | :--- | :---: |
| **Technical Accuracy** | Factual correctness, proper API/concept naming, and conceptual precision. | 25% |
| **Completeness** | Depth of coverage, edge case consideration, and answering all question facets. | 20% |
| **Structure & Clarity** | Use of logical frameworks (STAR, PREP, top-down structure) and readability. | 15% |
| **Problem-Solving** | Systematic thinking, engineering trade-offs, and design rationale. | 15% |
| **Communication Quality** | Conciseness, tone, professional vocabulary, and confidence indicators. | 15% |
| **Behavioral Alignment** | Ownership, collaboration, conflict resolution, and leadership principles. | 10% |

### 1.4 Module 1 Interview Sequence Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Candidate (Browser)
    participant Client as Frontend (Step2Interview)
    participant API as Express API (/api/interview)
    participant DB as MongoDB Atlas
    participant AI as OpenRouter AI (LLM)

    Candidate->>Client: Enters Job Role, Experience & Uploads Resume PDF
    Client->>API: POST /api/interview/create (Multipart Form)
    API->>API: Parse PDF via pdfjs-dist & Deduct Credits
    API->>AI: Generate initial tailored question set
    AI-->>API: Return JSON array of questions with categories
    API->>DB: Save new Interview session (status: 'in-progress')
    API-->>Client: Return sessionId & first question

    loop For each interview question
        Client->>Candidate: Display question text & play AI voice audio
        Candidate->>Client: Speaks answer (Web Speech API / Mic) or types text
        Client->>API: POST /api/interview/submit-answer (answerText, timeTaken)
        API->>AI: Evaluate answer against 6 rubrics + determine next question
        AI-->>API: Return rubric scores, qualitative feedback, & follow-up
        API->>DB: Update question with scores, feedback & trajectory
        API-->>Client: Return answer feedback & next question
    end

    Candidate->>Client: Clicks "Finish Interview"
    Client->>API: POST /api/interview/finish
    API->>AI: Compile Executive Scorecard & Study Roadmap
    AI-->>API: Return comprehensive evaluation report
    API->>DB: Update interview status to 'completed'
    API-->>Client: Redirect to /report/:id (Comprehensive Scorecard)
```

---

## 🔍 Deep Dive: Module 2 — Dedicated Cross-Examination & Deep-Dive Probing

### 2.1 Overview & Architectural Separation
Module 2 is an independent, high-pressure interrogation module designed to verify candidate authenticity and test deep architectural understanding. While Module 1 assesses general knowledge, Module 2 specifically probes claimed achievements, project architectures, and metrics listed on the candidate's resume.

- **Dedicated Routing**: Fully decoupled into `/cross-examination` and `/cross-examination/:sessionId`, distinct from the standard `/interview` route.
- **Dedicated History Tracking**: Candidates can view their dedicated Cross-Examination records separately from standard interviews in the dashboard.

### 2.2 Project Opportunity Extraction
1. **Claim Harvesting**: Scans the candidate resume for quantifiable metrics (e.g. *"reduced latency by 40%"*, *"handled 1M requests/day"*).
2. **Anchor Project Selection**: Focuses on the most complex claimed project to construct a high-context interrogation persona.
3. **Plausibility & Trap Generation**: Constructs targeted architectural questions to check if the candidate genuinely built the system or merely listed buzzwords.

### 2.3 Progressive Pressure Escalation Ladder
The cross-examination engine escalates questioning through four distinct pressure tiers based on candidate responses:

```mermaid
stateDiagram-v2
    [*] --> Tier1_Clarification: Project Anchor Identified
    
    Tier1_Clarification --> Tier2_TechnicalDrilldown: Direct Architecture Answer
    Tier1_Clarification --> Tier1_Clarification: Vague Answer (Re-prompt)

    Tier2_TechnicalDrilldown --> Tier3_ArchitectureChallenge: Confident Technical Defense
    Tier2_TechnicalDrilldown --> Tier1_Clarification: High Hesitation / Retreat

    Tier3_ArchitectureChallenge --> Tier4_StressAndTradeoffs: Edge-Case Validated
    Tier3_ArchitectureChallenge --> Tier2_TechnicalDrilldown: Partial Concession

    Tier4_StressAndTradeoffs --> [*]: Interrogation Complete (Report Generated)

    state Tier1_Clarification {
        description: "Verify role, tech stack choices, team size, and core architecture."
    }
    state Tier2_TechnicalDrilldown {
        description: "Deep dive into data models, concurrency, caching, and API contracts."
    }
    state Tier3_ArchitectureChallenge {
        description: "Simulate system failures, traffic spikes, and state synchronization bugs."
    }
    state Tier4_StressAndTradeoffs {
        description: "Force candidate to defend unpopular trade-offs and alternative designs."
    }
```

### 2.4 Hallucination-Resistant Transcript Grounding
To prevent AI hallucination during intense cross-examination, the evaluation engine enforces **transcript substring grounding**:
- Every identified strength, technical gap, or inconsistency must cite verbatim substrings from the candidate's actual answers.
- Any critique without direct textual evidence is pruned during schema sanitization.
