# 🏛️ Architecture & Domain Contracts: AI Resume & Project Cross-Examination

This document specifies the domain design, persistence schema, privacy trade-offs, state machine transitions, and verification rules for the **AI Resume & Project Cross-Examination** module in Prepper AI.

---

## 1. Domain Entities & Claim Provenance

A core requirement of cross-examination is that **no claim may be fabricated** or assumed without provenance. Every examined claim is traced back to an explicit statement in the candidate's uploaded resume or project details.

### Claim Categorization (`CLAIM_CATEGORIES`)
1. `TECHNICAL_SKILL`: Specific language, framework, algorithm, or methodology proficiency.
2. `PROJECT_CONTRIBUTION`: Individual contribution distinct from team accomplishments.
3. `ARCHITECTURE_DECISION`: Component boundaries, state management, protocols, caching, patterns.
4. `SCALE_METRIC`: Throughput, latency, RPS, database volume, concurrent users, cost savings.
5. `TOOL_OR_DATABASE`: Specific DBMS, cache, message broker, ORM, build tool.
6. `DEPLOYMENT_INFRASTRUCTURE`: Cloud providers, containers, CI/CD pipelines, orchestrators.
7. `RESPONSIBILITY_AND_OWNERSHIP`: Roles held, modules owned, incident response participation.
8. `PROBLEM_STATEMENT`: Business or technical challenge addressed by a project.
9. `FAILURE_HANDLING`: Debugging, disaster recovery, circuit breakers, retry policies.

### Provenance Types (`PROVENANCE_TYPES`)
- `EXPLICIT_SOURCE_STATEMENT`: Direct quote extracted from resume text. **Mandatory** `sourceExcerpt` required.
- `AI_INFERRED_CATEGORY`: Category inferred from the context of an explicit claim.
- `CANDIDATE_CLARIFICATION`: Stated by the candidate in answer to an inquiry probe.

---

## 2. Privacy & Persistence Trade-Off

Rather than persisting full raw PDF binary buffers or unbounded resume strings in every interview session:
- **`resumeTextExcerpt`**: Bounded to 4,000 characters (max) containing only the relevant sections (skills, projects, work experience).
- **`resumeHash`**: SHA-256 digest of the raw resume text. Allows the backend to detect duplicate uploads and link future sessions to the same resume version without duplicating data.
- **Immediate Cleanup**: Raw files in `Backend/public/` are unlinked immediately after parsing.

---

## 3. Session State Machine & Allowed Transitions

```
               ┌───────────┐
               │   DRAFT   │
               └─────┬─────┘
                     │ (start session)
                     ▼
         ┌───────────────────────┐
         │        ACTIVE         │◀─────────┐
         └───┬───────────────┬───┘          │ (answer recorded,
             │ (awaiting     │              │  next question queued)
             │  candidate)   │              │
             ▼               │ (completed)  │
   ┌───────────────────┐     │              │
   │  AWAITING_ANSWER  │─────┴──────────────┘
   └─────────┬─────────┘     │
             │               │
             ▼               ▼
      ┌─────────────┐  ┌───────────┐
      │  COMPLETED  │  │  FAILED   │ / ABANDONED
      └─────────────┘  └───────────┘
```

| Source Status | Allowed Target Statuses | Reason |
| :--- | :--- | :--- |
| `draft` | `active`, `abandoned`, `failed` | Candidate begins or cancels before questions start |
| `active` | `awaiting_answer`, `completed`, `failed`, `abandoned` | Asking a question or finishing session |
| `awaiting_answer` | `active`, `completed`, `failed`, `abandoned` | Answer received or timer expired |
| `completed` | *None (Terminal)* | Immutable finalized report |
| `failed` | *None (Terminal)* | Immutable error state |
| `abandoned` | *None (Terminal)* | User left or cancelled |

---

## 4. Question & Follow-Up Relationships

- **Primary Questions**: `depth = 0`, `parentQuestionId = null`. Directly target high-priority claims (`targetClaimIds`).
- **Follow-Up Probes**: `depth >= 1`, linked to `parentQuestionId`. Generated in response to ambiguity, trade-off depth, or contradictions discovered during answer evaluation.
- **Maximum Depth**: Capped at 3 to prevent rabbit holes and enforce session pacing.

---

## 5. Backward Compatibility & Database Migration

- **Zero Impact on Existing Collections**:
  - `User`: Intact. No schema changes.
  - `Interview`: Intact. Existing mock interview records and reports remain readable and queryable.
  - `Payment`: Intact. Credit accounting logic untouched.
- **New Collection**: `CrossExaminationSession` (table/collection `crossexaminationsessions`).
- **Indexes**:
  - `{ userId: 1, createdAt: -1 }` for rapid retrieval of candidate session history.
  - `{ userId: 1, status: 1 }` for fast active session recovery.
