## 🏢 Pull Request: Module 6 — Company-Specific Interview Simulation & Master Cross-Module Integration

### 1. Overview
This PR delivers **Module 6: Company-Specific Interview Simulation Engine** and integrates it end-to-end with Modules 1 through 5 in Prepper AI.

### 2. Key Capabilities Introduced
- **Curated & On-Demand Intelligence**: 9 premier technology enterprise profiles (Google, Microsoft, Amazon, Adobe, IBM, TCS, Infosys, Accenture, Deloitte) plus LLM on-demand crawler.
- **7-Round Simulation Architecture**: Online Assessment, Technical Round 1, Technical Round 2, System Design, Hiring Manager, Behavioral & Leadership, Final HR & Culture.
- **Role Readiness & Hiring Verdicts**: Five-tier classification (`Strong Hire`, `Hire`, `Leaning Hire`, `Leaning No Hire`, `No Hire`), readiness score (0-100), and fit level.
- **Multi-Module Cross-Wiring**:
  - Module 1: Web Speech speech-to-text recognition and text-to-speech audio playback.
  - Module 2: Grounded evidence evaluation with 6-rubric scoring.
  - Module 3: Dynamic adaptive question difficulty steering with streak policies and transition banners.
  - Module 4: Live Monaco Code Editor workspace integration for Online Assessment rounds.
  - Module 5: Seamless evidence harvesting of company gaps into personalized recovery remediation roadmaps.
- **Financial & Security Controls**: Atomic 50-credit verification, automatic refund rollback on persistence failure, strict anti-IDOR authorization checks.

### 3. Verification & Test Matrix
- **E2E Cross-Module Integration Suite**: 11 / 11 tests passing (`Backend/tests/companyInterviewIntegration.e2e.test.js`)
- **Backend Unit Tests**: 8 / 8 tests passing (`Backend/tests/companyInterview.test.js`)
- **Backend Regression Suite**: 123 / 123 tests passing across Modules 1–6
- **Frontend Regression Suite**: 215 / 215 tests passing (`Frontend/tests/companyInterviewFrontend.test.js` + full regression)
- **Production Build**: Vite / Rollup build succeeds cleanly in ~14s

### 4. Checklist
- [x] Zero external paid services or infrastructure added (₹0 budget preserved)
- [x] Strict MERN architecture preserved (Node.js, Express, MongoDB Atlas, React 19)
- [x] All Mermaid diagrams validated and GitHub markdown rendering verified
- [x] All automated tests passing locally and in CI
