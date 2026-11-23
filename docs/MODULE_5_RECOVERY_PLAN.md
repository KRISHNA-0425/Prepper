# Module 5: Personalized Interview Recovery Plan

## Overview & Purpose

Module 5 transforms raw interview evaluations into evidence-grounded, actionable, day-by-day recovery plans. Rather than presenting static critique or generic advice, Prepper AI harvests authentic performance findings across **all three evaluation engines** (conversational voice interviews, cross-examination claim interrogation, and live coding executions) and synthesizes an adaptive curriculum calibrated to the candidate's target role, experience level, and available study time.

```
       ┌───────────────────────────────┐
       │   Multi-Source Evidence       │
       │   • Standard Interviews       │
       │   • Cross-Examination Gaps    │
       │   • Live Coding Failures      │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │   Evidence Harvester          │
       │   • Extract Missing Concepts  │
       │   • Extract Code Test Errors  │
       │   • Retain Source Citations   │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │  AI Curriculum Synthesizer    │
       │  (With Deterministic Fallback)│
       │  • 7, 14, or 30-Day Schedules │
       │  • Prerequisite Ordering      │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │   Interactive Recovery Plan   │
       │   • Day-by-Day Task Timeline  │
       │   • Candidate Study Notes     │
       │   • Progress Recalculation    │
       └──────────────┬────────────────┘
                      │
                      ▼
       ┌───────────────────────────────┐
       │   Reassessment Engine         │
       │   • Weakness-Targeted Drill   │
       │   • Baseline vs New Score     │
       │   • Measured Score Delta      │
       └───────────────────────────────┘
```

---

## Key Capabilities

1. **Multi-Source Evidence Harvesting**:
   - Collects verified knowledge gaps, low question scores, and rubric deficiencies from standard interviews (`Interview.questions[].evidenceEvaluation` & `adaptiveState.identifiedKnowledgeGaps`).
   - Integrates preparation gaps, unverified claims, and contradiction findings from Cross-Examination sessions (`CrossExaminationSession.report.preparationGaps`).
   - Captures runtime exceptions, failed test case ratios, and algorithmic complexity flaws from live coding submissions (`CodingSubmission.evaluation` & `testResults`).

2. **Full Evidence Traceability**:
   - Every weakness, strength, and task links to its original source record (`sourceType`, `sourceId`, `questionOrProblemId`, `competency`, `evidenceExcerpt`, `identifiedFinding`).
   - Zero hallucination guarantee: tasks are strictly grounded in genuine evaluation data.

3. **Adaptive Pacing & Prerequisite Sequencing**:
   - Candidates choose between 7-Day Sprint, 14-Day Balanced, or 30-Day Mastery schedules.
   - Paced according to chosen daily study commitment (30, 45, 60, or 90 minutes/day).
   - Pedagogical order: Foundational concepts and misconception resolution first, hands-on implementation drills second, architectural tradeoffs third, and timed mock reassessment drills last.

4. **Deterministic Fallback Engine**:
   - If external AI is unavailable, times out, or quota is exhausted, `recoveryPlanFallback.js` deterministically structures verified weaknesses into a rigorous study schedule without inventing fictitious content.

5. **Anti-IDOR Ownership & Idempotent Generation**:
   - Compound unique index `{ userId: 1, interviewId: 1, scheduleDurationDays: 1 }` guarantees zero duplicate plans on network retries or double-clicks.
   - Strict ownership checks enforce that candidates can only view, start, update, or reassess their own plans.

6. **Reassessment Integrity**:
   - Measures candidate recovery on the exact same 0-100 rubric scale.
   - Computes authentic `scoreDelta` = `reassessmentScore` - `originalScore`.
   - Records verified improvements and remaining gaps separately.

---

## Data Schema Reference (`RecoveryPlan`)

| Field | Type | Description |
|---|---|---|
| `userId` | `ObjectId (Ref: User)` | Owner candidate ID (Indexed) |
| `interviewId` | `ObjectId (Ref: Interview)` | Source interview session ID (Indexed) |
| `targetRole` | `String` | Role target (e.g., "Full Stack Engineer") |
| `scheduleDurationDays` | `Number` | Duration enum: `7`, `14`, or `30` |
| `dailyStudyMinutes` | `Number` | Daily commitment: `30`, `45`, `60`, or `90` |
| `status` | `String` | `'not_started' \| 'in_progress' \| 'completed' \| 'abandoned'` |
| `isFallbackGenerated` | `Boolean` | True if deterministic engine generated the plan |
| `strengths` | `Array<Strength>` | Verified strengths with evidence traceability |
| `criticalWeaknesses` | `Array<Weakness>` | Identified gaps with severity, snippets & evidence citations |
| `tasks` | `Array<Task>` | Day-by-day tasks with outcomes, checklists, notes & status |
| `progress` | `Object` | `{ totalTasks, completedTasks, completionPercentage, currentDay }` |
| `reassessment` | `Object` | `{ status, originalScore, reassessmentScore, scoreDelta, questions[] }` |

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/recovery-plans/generate` | Idempotent plan generation from interview evidence |
| `GET` | `/api/recovery-plans` | Retrieve all recovery plans owned by authenticated user |
| `GET` | `/api/recovery-plans/:planId` | Retrieve single plan with anti-IDOR check |
| `PATCH` | `/api/recovery-plans/:planId/start` | Activate plan (transitions from `not_started` to `in_progress`) |
| `PATCH` | `/api/recovery-plans/:planId/tasks/:taskId` | Update task status ('pending', 'in_progress', 'completed') and notes |
| `POST` | `/api/recovery-plans/:planId/reassess/start` | Generate 3-5 targeted verification questions for weaknesses |
| `POST` | `/api/recovery-plans/:planId/reassess/submit` | Submit reassessment answers, grade on 0-100 rubric & compute delta |
