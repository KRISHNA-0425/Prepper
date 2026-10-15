# Prepper AI — Cross-Examination Preparation Report Architecture (Phase 8)

## 1. Overview & Architectural Role

The **Cross-Examination Preparation Report** is the evaluation and synthesis module of the AI Resume & Project Cross-Examination system. It translates persisted interview questions, candidate answer transcripts, granular evaluations, and project claims into evidence-grounded, actionable interview preparation guidance.

Unlike generic interview feedback tools, Prepper AI reports are strictly tied to observed session evidence: every strength, preparation gap, and recommendation is backed by traceable question-and-answer references without fabricating unverified metrics or making character judgments.

---

## 2. Versioning & Schema Contracts

- **Report Schema Version**: `1.0.0` (`REPORT_SCHEMA_VERSION`)
- **Synthesis Methodology**: `evidence-grounded-synthesis-v1` (`REPORT_METHODOLOGY`)

### Core Schema Fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `reportId` | `string` | Unique domain ID prefixed with `rpt_` |
| `version` | `string` | Schema version (`1.0.0`) |
| `generatedAt` | `Date` | Timestamp of report generation |
| `completedAt` | `Date` | Timestamp of session completion |
| `executiveSummary` | `string` | Concise 3–4 sentence evidence-grounded assessment |
| `methodology` | `string` | Versioned synthesis methodology |
| `completionState` | `object` | `{ totalQuestions, answeredCount, skippedCount, evaluatedCount, unexaminedClaimsCount }` |
| `verifiedClaimsCount` | `number` | Count of claims confirmed with direct evidence (`DEMONSTRATED`) |
| `unverifiedClaimsCount` | `number` | Count of claims partially supported or with insufficient evidence |
| `contradictionsCount` | `number` | Count of claims with unresolved factual discrepancies |
| `claimVerificationMatrix` | `Array<ClaimItem>` | Granular claim-by-claim status with linked question/answer references |
| `demonstratedStrengths` | `Array<StrengthItem>` | Demonstrated technical capabilities linked to question/answer evidence |
| `preparationGaps` | `Array<GapItem>` | Identified omissions or ambiguities categorized by severity (`HIGH`, `MEDIUM`, `LOW`) |
| `alternativeApproachesAcknowledged` | `Array<AltItem>` | Valid alternative architectural decisions legitimately proposed without penalty |
| `unresolvedContradictions` | `Array<ContraItem>` | Explicit contradictions between resume excerpt and candidate answers |
| `studyRecommendations` | `Array<RecItem>` | Prioritized study topics with concrete operational guidance |
| `dimensionScores` | `Array<DimensionItem>` | Interpretable readiness ratings across 12 dimensions |
| `limitations` | `Array<string>` | Disclosures on unexamined claims, unavailable evaluations, and scope |
| `evaluationCoverage` | `object` | `{ questionsEvaluated, evaluationsFailedOrUnavailable, unexaminedTopicsCount }` |

---

## 3. Scoring & Fairness Policy

1. **No Misleading Precision**: Prepper AI avoids arbitrary numerical percentages or simulated "honesty scores". Readiness is categorized into interpretable tiers (`STRONG`, `MODERATE`, `WEAK`, `INSUFFICIENT_EVIDENCE`, `UNAVAILABLE`).
2. **Missing Evaluation Handling**: If an answer could not be evaluated by the AI provider due to timeout or limits, it is marked as `UNAVAILABLE` or `evaluationsFailedOrUnavailable`. It is **never converted to zero or counted as a candidate failure**.
3. **Alternative Solutions Recognized**: Candidates who propose valid alternative engineering patterns (e.g. event-driven queues or optimistic locking instead of synchronous distributed locks) are categorized under `alternativeApproachesAcknowledged` and rewarded rather than penalized.
4. **No Moral/Character Judgments**: Findings are strictly confined to observed technical explanations and trade-off depth.

---

## 4. Report APIs & Authorization

All report endpoints require valid authentication via JWT cookies (`isAuth`) and enforce server-side resource ownership (`userId` check).

### Endpoints

#### 1. Retrieve Preparation Report
- **Route**: `GET /api/cross-examination/sessions/:sessionId/report`
- **Access**: Protected (Session Owner)
- **Response**: `200 OK` with sanitized candidate report, or `400 Bad Request` if session is not yet completed.

#### 2. Generate or Regenerate Preparation Report
- **Route**: `POST /api/cross-examination/sessions/:sessionId/report[?regenerate=true]`
- **Access**: Protected (Session Owner)
- **Idempotency**: Repeated calls without `?regenerate=true` return the existing persisted report without re-computation or duplicate records. When `?regenerate=true` is passed, the report is re-synthesized atomically.

---

## 5. Candidate Privacy & Sanitization

Candidate-facing responses pass through `sanitizeReportForCandidate`:
- Strips internal database IDs (`_id`, `__v`).
- Prevents leakage of internal prompt templates, private evaluator instructions, or chain-of-thought rationale.

---

## 6. Resilience & Graceful Fallback

1. **Prompt Injection Defense**: Untrusted candidate answers and resume excerpts are wrapped in strict delimiters (`<<<VERIFIED_SESSION_EVIDENCE>>>`). System prompts explicitly direct the AI to treat input as passive text and ignore prompt injection.
2. **Deterministic Fallback**: If the external AI service times out or returns malformed text, `reportGeneration.service.js` automatically synthesizes the `executiveSummary` and prioritized `studyRecommendations` deterministically from observed question evaluations. Report generation **never crashes or blocks the user**.

---

## 7. Automated Test Verification

### Backend Tests
```bash
# Full test suite across contracts, service, and API
npm test
```
- `Backend/tests/reportGeneration.service.test.js`: 13 passing tests.
- `Backend/tests/crossExamination.api.test.js`: 49 passing tests (including Phase 8 report suites).
- `Backend/tests/crossExamination.contracts.test.js`: 9 passing tests.

### Frontend Tests
```bash
cd Frontend
npm test
npm run build
```
- `Frontend/tests/crossExaminationFrontend.test.js`: 32 passing tests.
- Production Vite build: 0 errors.
