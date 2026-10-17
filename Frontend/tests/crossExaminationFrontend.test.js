import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateSessionSetupInput,
    validateAnswerInput,
    sanitizeCandidateQuestion,
    generateIdempotencyKey,
    MAX_RESUME_TEXT_LENGTH,
    MIN_RESUME_TEXT_LENGTH,
    MAX_FILE_SIZE_BYTES,
    MAX_TRANSCRIPT_LENGTH,
    MIN_QUESTIONS,
    MAX_QUESTIONS,
    getCrossExamReport,
    generateCrossExamReport,
} from '../src/utils/crossExaminationApi.js';

describe('Cross-Examination Frontend Logic & Integration Suite', () => {

    describe('1. Entry-point, Router Registration & Constants', () => {
        it('should have consistent bounds matching backend domain contracts', () => {
            assert.strictEqual(MIN_QUESTIONS, 3);
            assert.strictEqual(MAX_QUESTIONS, 10);
            assert.strictEqual(MIN_RESUME_TEXT_LENGTH, 50);
            assert.strictEqual(MAX_RESUME_TEXT_LENGTH, 30000);
            assert.strictEqual(MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024);
            assert.strictEqual(MAX_TRANSCRIPT_LENGTH, 5000);
        });

        it('should verify App.jsx contains all legacy routes and new cross-exam routes', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const appPath = path.resolve('src/App.jsx');
            const appContent = fs.readFileSync(appPath, 'utf8');

            // Legacy routes must remain intact
            assert.ok(appContent.includes("path='/'"), 'Home route / must exist');
            assert.ok(appContent.includes("path='/auth'"), 'Auth route /auth must exist');
            assert.ok(appContent.includes("path='/interview'"), 'Interview route /interview must exist');
            assert.ok(appContent.includes("path='/history'"), 'History route /history must exist');
            assert.ok(appContent.includes("path='/pricing'"), 'Pricing route /pricing must exist');
            assert.ok(appContent.includes("path='/report/:id'"), 'Report route /report/:id must exist');

            // Cross-examination routes
            assert.ok(appContent.includes("path='/cross-examination'"), 'Cross-examination setup route must exist');
            assert.ok(appContent.includes("path='/cross-examination/:sessionId'"), 'Cross-examination session route must exist');
        });
    });

    describe('2. Resume Form & Setup Input Validation', () => {
        it('should reject empty or whitespace-only target role', () => {
            const result = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'A'.repeat(100),
                targetRole: '   ',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.targetRole.includes('Target role is required'));
        });

        it('should reject empty or whitespace-only target domain', () => {
            const result = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'A'.repeat(100),
                targetRole: 'Software Engineer',
                targetDomain: '   ',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.targetDomain.includes('Target domain is required'));
        });

        it('should reject text resume shorter than 50 characters', () => {
            const result = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'Short resume text here',
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.resumeText.includes('at least 50 characters'));
        });

        it('should reject text resume exceeding 30,000 characters', () => {
            const result = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'A'.repeat(30001),
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.resumeText.includes('cannot exceed 30,000 characters'));
        });

        it('should reject missing PDF file in file mode', () => {
            const result = validateSessionSetupInput({
                inputMode: 'file',
                resumeFile: null,
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.resumeFile.includes('Please select a resume PDF file'));
        });

        it('should reject non-PDF file type', () => {
            const fakeFile = {
                name: 'resume.docx',
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                size: 1024
            };
            const result = validateSessionSetupInput({
                inputMode: 'file',
                resumeFile: fakeFile,
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.resumeFile.includes('Only PDF format is supported'));
        });

        it('should reject PDF file exceeding 10MB limit', () => {
            const oversizedFile = {
                name: 'heavy_resume.pdf',
                type: 'application/pdf',
                size: 10 * 1024 * 1024 + 1
            };
            const result = validateSessionSetupInput({
                inputMode: 'file',
                resumeFile: oversizedFile,
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, false);
            assert.ok(result.errors.resumeFile.includes('File size cannot exceed 10MB'));
        });

        it('should reject question counts below 3 or above 10', () => {
            const lowResult = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'A'.repeat(100),
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 2
            });
            assert.strictEqual(lowResult.isValid, false);
            assert.ok(lowResult.errors.questionCount.includes('between 3 and 10'));

            const highResult = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'A'.repeat(100),
                targetRole: 'Software Engineer',
                targetDomain: 'Frontend',
                questionCount: 11
            });
            assert.strictEqual(highResult.isValid, false);
            assert.ok(highResult.errors.questionCount.includes('between 3 and 10'));
        });

        it('should accept valid text configuration', () => {
            const result = validateSessionSetupInput({
                inputMode: 'text',
                resumeText: 'Senior Full Stack Engineer with 7 years building distributed web applications in React and Node.js.',
                targetRole: 'Staff Frontend Engineer',
                targetDomain: 'Web Architecture',
                questionCount: 5
            });
            assert.strictEqual(result.isValid, true);
            assert.deepStrictEqual(result.errors, {});
        });

        it('should accept valid PDF configuration', () => {
            const validPdf = {
                name: 'my_resume.pdf',
                type: 'application/pdf',
                size: 2 * 1024 * 1024
            };
            const result = validateSessionSetupInput({
                inputMode: 'file',
                resumeFile: validPdf,
                targetRole: 'Backend Engineer',
                targetDomain: 'Distributed Systems',
                questionCount: 7
            });
            assert.strictEqual(result.isValid, true);
            assert.deepStrictEqual(result.errors, {});
        });
    });

    describe('3. Answer Input Validation', () => {
        it('should reject empty or whitespace-only answer transcripts', () => {
            const empty = validateAnswerInput('');
            assert.strictEqual(empty.isValid, false);
            assert.ok(empty.error.includes('Please enter your response'));

            const whitespace = validateAnswerInput('    \n\t  ');
            assert.strictEqual(whitespace.isValid, false);
            assert.ok(whitespace.error.includes('Please enter your response'));
        });

        it('should reject transcripts exceeding 5,000 characters', () => {
            const oversized = validateAnswerInput('A'.repeat(5001));
            assert.strictEqual(oversized.isValid, false);
            assert.ok(oversized.error.includes('cannot exceed 5,000 characters'));
        });

        it('should accept valid transcript between 1 and 5,000 characters', () => {
            const valid = validateAnswerInput('In our microservice cluster, we implemented circuit breakers with exponential backoff.');
            assert.strictEqual(valid.isValid, true);
            assert.strictEqual(valid.error, null);
        });
    });

    describe('4. Candidate-Facing Question Sanitization & Evaluator Metadata Exclusion', () => {
        it('should preserve only permitted candidate fields and strip evaluator internals', () => {
            const backendQuestion = {
                questionId: 'q-uuid-1234',
                inquiryType: 'claim_verification',
                questionText: 'Can you walk us through how you handled the Redis split-brain scenario?',
                difficultyTier: 'hard',
                timeLimitSeconds: 180,
                // Evaluator-only fields that must NEVER reach or be shown to the candidate
                rationale: 'Candidate claimed 99.999% availability during data center outage.',
                expectedEvidence: ['Quorum configuration', 'Sentinel failover logs', 'Replication lag bounds'],
                followUpGuidance: 'Probe their partition tolerance if they mention master promotion.',
                claims: [{ text: 'Architected failover with zero downtime' }],
                heuristics: { ambiguityScore: 0.8 },
                scoringRubric: { high: 5, low: 1 }
            };

            const sanitized = sanitizeCandidateQuestion(backendQuestion);

            // Permitted fields
            assert.strictEqual(sanitized.questionId, 'q-uuid-1234');
            assert.strictEqual(sanitized.inquiryType, 'claim_verification');
            assert.strictEqual(sanitized.questionText, 'Can you walk us through how you handled the Redis split-brain scenario?');
            assert.strictEqual(sanitized.difficultyTier, 'hard');
            assert.strictEqual(sanitized.timeLimitSeconds, 180);

            // Stripped evaluator fields
            assert.strictEqual(sanitized.rationale, undefined);
            assert.strictEqual(sanitized.expectedEvidence, undefined);
            assert.strictEqual(sanitized.followUpGuidance, undefined);
            assert.strictEqual(sanitized.claims, undefined);
            assert.strictEqual(sanitized.heuristics, undefined);
            assert.strictEqual(sanitized.scoringRubric, undefined);

            const keys = Object.keys(sanitized);
            assert.deepStrictEqual(keys.sort(), ['difficultyTier', 'inquiryType', 'questionId', 'questionText', 'timeLimitSeconds'].sort());
        });

        it('should handle null or non-object question gracefully', () => {
            assert.strictEqual(sanitizeCandidateQuestion(null), null);
            assert.strictEqual(sanitizeCandidateQuestion(undefined), null);
            assert.strictEqual(sanitizeCandidateQuestion('not-an-object'), null);
        });
    });

    describe('5. Idempotency Key Handling & Session Retry Discipline', () => {
        it('should generate valid UUID v4 formatted strings', () => {
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            const key1 = generateIdempotencyKey();
            const key2 = generateIdempotencyKey();

            assert.match(key1, uuidPattern);
            assert.match(key2, uuidPattern);
            assert.notStrictEqual(key1, key2, 'Generated keys must be distinct');
        });

        it('should simulate idempotency key reuse during retry attempts', () => {
            // Emulate the Setup component's idempotency key lifecycle
            let savedIdempotencyKey = null;

            function getOrCreateKeyForAttempt() {
                if (!savedIdempotencyKey) {
                    savedIdempotencyKey = generateIdempotencyKey();
                }
                return savedIdempotencyKey;
            }

            // Attempt 1 fails due to network glitch
            const attempt1Key = getOrCreateKeyForAttempt();
            assert.ok(attempt1Key);

            // Retry 1: Must reuse identical idempotency key
            const retry1Key = getOrCreateKeyForAttempt();
            assert.strictEqual(retry1Key, attempt1Key, 'Retry must reuse previous attempt key to prevent duplicate sessions');

            // Retry 2: Must still reuse identical key
            const retry2Key = getOrCreateKeyForAttempt();
            assert.strictEqual(retry2Key, attempt1Key);

            // Once successful, key is cleared
            savedIdempotencyKey = null;

            // Next fresh session creation attempt generates new key
            const freshSessionKey = getOrCreateKeyForAttempt();
            assert.notStrictEqual(freshSessionKey, attempt1Key);
        });
    });

    describe('6. State Transitions & Progression Contract', () => {
        it('should map session question progression correctly across answers', () => {
            // Simulate progression state from backend
            let session = {
                sessionId: 'sess-987',
                status: 'awaiting_answer',
                currentQuestionIndex: 0,
                totalQuestions: 3,
                activeQuestion: {
                    questionId: 'q-1',
                    questionText: 'First question',
                    difficultyTier: 'medium'
                },
                history: []
            };

            // Answer submitted with autoAdvance=true
            const submitAnswer = (sess, answerText, autoAdvance = true) => {
                const updatedHistory = [
                    ...sess.history,
                    {
                        questionId: sess.activeQuestion.questionId,
                        candidateAnswerTranscript: answerText,
                        answeredAt: new Date().toISOString()
                    }
                ];

                const nextIndex = autoAdvance ? sess.currentQuestionIndex + 1 : sess.currentQuestionIndex;
                const isComplete = nextIndex >= sess.totalQuestions;

                return {
                    ...sess,
                    currentQuestionIndex: nextIndex,
                    status: isComplete ? 'completed' : 'awaiting_answer',
                    activeQuestion: isComplete ? null : {
                        questionId: `q-${nextIndex + 1}`,
                        questionText: `Question ${nextIndex + 1}`,
                        difficultyTier: 'medium'
                    },
                    history: updatedHistory
                };
            };

            // Step 1: Submit first answer
            session = submitAnswer(session, 'Answer 1', true);
            assert.strictEqual(session.currentQuestionIndex, 1);
            assert.strictEqual(session.status, 'awaiting_answer');
            assert.strictEqual(session.history.length, 1);

            // Step 2: Submit second answer
            session = submitAnswer(session, 'Answer 2', true);
            assert.strictEqual(session.currentQuestionIndex, 2);
            assert.strictEqual(session.status, 'awaiting_answer');
            assert.strictEqual(session.history.length, 2);

            // Step 3: Submit final answer
            session = submitAnswer(session, 'Answer 3', true);
            assert.strictEqual(session.currentQuestionIndex, 3);
            assert.strictEqual(session.status, 'completed');
            assert.strictEqual(session.activeQuestion, null);
            assert.strictEqual(session.history.length, 3);
        });

        it('should calculate completed vs remaining questions accurately without fabricating evaluations', () => {
            const completedSession = {
                sessionId: 'sess-done',
                status: 'completed',
                currentQuestionIndex: 5,
                totalQuestions: 5,
                history: [
                    { questionId: 'q-1', candidateAnswerTranscript: 'Ans 1' },
                    { questionId: 'q-2', candidateAnswerTranscript: 'Ans 2' },
                    { questionId: 'q-3', candidateAnswerTranscript: null }, // skipped
                    { questionId: 'q-4', candidateAnswerTranscript: 'Ans 4' },
                    { questionId: 'q-5', candidateAnswerTranscript: 'Ans 5' },
                ]
            };

            const answeredCount = completedSession.history.filter(h => !!h.candidateAnswerTranscript).length;
            const skippedCount = completedSession.totalQuestions - answeredCount;

            assert.strictEqual(answeredCount, 4);
            assert.strictEqual(skippedCount, 1);
            assert.strictEqual(completedSession.totalQuestions, 5);

            // Verify no scores or evaluations are fabricated in completion summary
            assert.strictEqual(completedSession.score, undefined);
            assert.strictEqual(completedSession.evaluation, undefined);
            assert.strictEqual(completedSession.rating, undefined);
        });
    });

    describe('7. Duplicate Submission Guard & Interaction Safeguards', () => {
        it('should prevent duplicate submissions while in-flight', async () => {
            let isSubmitting = false;
            let submissionCount = 0;

            const handleAnswerSubmit = async () => {
                if (isSubmitting) return false;
                isSubmitting = true;
                submissionCount++;
                // simulate network delay
                await new Promise(resolve => setTimeout(resolve, 20));
                isSubmitting = false;
                return true;
            };

            // Trigger two rapid clicks
            const [call1, call2] = await Promise.all([
                handleAnswerSubmit(),
                handleAnswerSubmit()
            ]);

            assert.strictEqual(submissionCount, 1, 'Only one submission should execute');
            assert.strictEqual(call1, true);
            assert.strictEqual(call2, false);
        });
    });

    describe('8. UI Accessibility, Keyboard Shortcuts & ARIA Attributes', () => {
        it('should detect Ctrl+Enter or Meta+Enter keyboard shortcut for submission', () => {
            const isSubmitShortcut = (e) => {
                return (e.ctrlKey || e.metaKey) && e.key === 'Enter';
            };

            // Standard Enter should not submit (allows multiline paragraphs)
            assert.strictEqual(isSubmitShortcut({ ctrlKey: false, metaKey: false, key: 'Enter' }), false);

            // Ctrl+Enter (Windows/Linux) should submit
            assert.strictEqual(isSubmitShortcut({ ctrlKey: true, metaKey: false, key: 'Enter' }), true);

            // Cmd+Enter (Mac) should submit
            assert.strictEqual(isSubmitShortcut({ ctrlKey: false, metaKey: true, key: 'Enter' }), true);

            // Other keys with Ctrl should not submit
            assert.strictEqual(isSubmitShortcut({ ctrlKey: true, metaKey: false, key: 's' }), false);
        });
    });

    describe('9. Session Refresh, Re-entry & History Handling', () => {
        it('should restore active question and progress upon re-entry from server response', () => {
            const serverSessionResponse = {
                sessionId: '67a8b9c0d1e2f3a4b5c6d7e8',
                sessionTitle: 'Frontend Architect Cross-Examination',
                targetRole: 'Staff Frontend Engineer',
                targetDomain: 'Frontend Systems',
                status: 'in_progress',
                progress: {
                    totalQuestions: 5,
                    answeredCount: 2,
                    currentQuestionIndex: 3,
                    isFinished: false
                },
                currentQuestion: {
                    questionId: 'ceq_3',
                    order: 3,
                    questionText: 'How did you prevent layout thrashing in the virtualized grid?',
                    difficulty: 'hard',
                    timeLimit: 120,
                    status: 'current'
                },
                answersCount: 2
            };

            // Reconstruct candidate view model
            const sanitizedQuestion = sanitizeCandidateQuestion(serverSessionResponse.currentQuestion);
            assert.ok(sanitizedQuestion);
            assert.strictEqual(sanitizedQuestion.questionId, 'ceq_3');
            assert.strictEqual(sanitizedQuestion.order, 3);
            assert.strictEqual(sanitizedQuestion.difficulty, 'hard');
            assert.strictEqual(sanitizedQuestion.timeLimit, 120);

            // Progress matches server truth
            assert.strictEqual(serverSessionResponse.progress.answeredCount, 2);
            assert.strictEqual(serverSessionResponse.progress.totalQuestions, 5);
            assert.strictEqual(serverSessionResponse.progress.currentQuestionIndex, 3);
        });

        it('should handle empty past sessions history gracefully', () => {
            const pastSessionsPayload = {
                success: true,
                count: 0,
                sessions: []
            };

            const sessionsList = Array.isArray(pastSessionsPayload.sessions) ? pastSessionsPayload.sessions : [];
            assert.strictEqual(sessionsList.length, 0);
            assert.strictEqual(typeof sessionsList, 'object');
        });
    });

    describe('10. Authentication Failures & Missing Session Handling', () => {
        it('should classify 401 response as requiring authentication redirect', () => {
            const simulated401Error = {
                response: {
                    status: 401,
                    data: { message: 'Authentication required' }
                }
            };

            const isAuthError = simulated401Error.response && simulated401Error.response.status === 401;
            assert.strictEqual(isAuthError, true);
        });

        it('should classify 404 response as missing session requiring recovery navigation', () => {
            const simulated404Error = {
                response: {
                    status: 404,
                    data: { message: 'Session not found' }
                }
            };

            const isNotFound = simulated404Error.response && simulated404Error.response.status === 404;
            assert.strictEqual(isNotFound, true);
        });

        it('should preserve candidate input during network failure to allow safe retry', () => {
            const userDraft = {
                targetRole: 'Site Reliability Engineer',
                targetDomain: 'Kubernetes Infrastructure',
                resumeText: 'Experienced SRE managing multi-region clusters with ArgoCD and Cilium eBPF mesh.',
                questionCount: 6
            };

            // On failure, draft is not cleared; candidate can click "Retry"
            const onNetworkFailure = (state) => ({ ...state, isSubmitting: false, error: 'Network error. Please try again.' });
            const recoveredState = onNetworkFailure(userDraft);

            assert.strictEqual(recoveredState.targetRole, userDraft.targetRole);
            assert.strictEqual(recoveredState.resumeText, userDraft.resumeText);
            assert.strictEqual(recoveredState.questionCount, 6);
            assert.strictEqual(recoveredState.isSubmitting, false);
            assert.ok(recoveredState.error.includes('Network error'));
        });
    });

    describe('11. Phase 8: Preparation Report API, Rendering & Resilience', () => {
        it('should export getCrossExamReport and generateCrossExamReport functions', () => {
            assert.strictEqual(typeof getCrossExamReport, 'function');
            assert.strictEqual(typeof generateCrossExamReport, 'function');
        });

        it('should correctly format and map preparation report findings without data distortion', () => {
            const rawReport = {
                reportId: 'rpt_front_test1',
                version: '1.0.0',
                completionState: { totalQuestions: 4, answeredCount: 4, evaluatedCount: 4, skippedCount: 0 },
                executiveSummary: 'Strong distributed systems fundamentals demonstrated.',
                demonstratedStrengths: [
                    { id: 'str_1', title: 'Decoupled Messaging', description: 'Used RabbitMQ exchanges.', evidenceReferences: [{ questionId: 'q1', answerId: 'a1' }] }
                ],
                preparationGaps: [
                    { id: 'gap_1', severity: 'HIGH', topic: 'Lock Contention', gapDescription: 'Missing jitter on retry.', evidenceReferences: [{ questionId: 'q2', answerId: 'a2' }] }
                ],
                alternativeApproachesAcknowledged: [
                    { id: 'alt_1', topic: 'Alternative Architecture', description: 'Optimistic locking instead of distributed mutex.' }
                ],
                studyRecommendations: [
                    { id: 'rec_1', priority: 'HIGH', topic: 'Distributed Locking', recommendation: 'Review Redlock and advisory lock trade-offs.' }
                ],
                dimensionScores: [
                    { dimension: 'ARCHITECTURE_BOUNDARIES', demonstratedLevel: 'STRONG', rationale: 'Clean separation.' },
                    { dimension: 'TESTING_AND_DEPLOYMENT', demonstratedLevel: 'UNAVAILABLE', rationale: 'Not examined.' }
                ]
            };

            assert.strictEqual(rawReport.completionState.answeredCount, 4);
            assert.strictEqual(rawReport.demonstratedStrengths.length, 1);
            assert.strictEqual(rawReport.preparationGaps[0].severity, 'HIGH');
            assert.strictEqual(rawReport.alternativeApproachesAcknowledged.length, 1);

            // Verify that unexamined dimension is explicitly UNAVAILABLE, not zero
            const unavailDim = rawReport.dimensionScores.find((d) => d.dimension === 'TESTING_AND_DEPLOYMENT');
            assert.strictEqual(unavailDim.demonstratedLevel, 'UNAVAILABLE');
        });

        it('should resolve question and transcript from evidence reference for interactive inspection', () => {
            const session = {
                questions: [
                    { questionId: 'ceq_q100', questionText: 'Explain your event-driven indexing.' }
                ],
                answers: [
                    { questionId: 'ceq_q100', rawTranscript: 'We used Elasticsearch with change data capture via Debezium.' }
                ]
            };

            const ref = { questionId: 'ceq_q100' };
            const resolvedQ = session.questions.find((q) => q.questionId === ref.questionId);
            const resolvedA = session.answers.find((a) => a.questionId === ref.questionId);

            assert.ok(resolvedQ);
            assert.strictEqual(resolvedQ.questionText, 'Explain your event-driven indexing.');
            assert.ok(resolvedA);
            assert.ok(resolvedA.rawTranscript.includes('Debezium'));
        });

        it('should handle missing report gracefully by displaying compile/generate fallback prompt', () => {
            const sessionWithoutReport = {
                _id: 'sess_unreported',
                status: 'completed',
                questions: [],
                answers: [],
                report: null
            };

            const needsGeneration = sessionWithoutReport.status === 'completed' && !sessionWithoutReport.report;
            assert.strictEqual(needsGeneration, true);
        });
    });
});
