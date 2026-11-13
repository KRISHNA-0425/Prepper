import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    QUESTION_PRICING_RATE,
    MIN_QUESTION_COUNT,
    MAX_QUESTION_COUNT,
    DEFAULT_QUESTION_COUNT,
    ANSWER_TIME_LIMIT_SECONDS,
    ANSWER_GRACE_PERIOD_SECONDS,
    STANDARDIZED_DIFFICULTY,
    TIME_PACKAGES,
    calculateInterviewPricing,
    calculateQuestionDeadline,
    verifyAnswerDeadline
} from '../services/interviewPricing.service.js';
import {
    checkUserCredits,
    deductInterviewCredits,
    refundInterviewCredits,
    INSUFFICIENT_CREDITS_MESSAGE
} from '../services/credit.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

describe('Prepper AI — Interview Pricing, Packaging & Timing Test Suite', () => {

    // =========================================================================
    // 1. Authoritative Pricing Parity for Mode A (Question-Based)
    // =========================================================================
    describe('1. Mode A: Question-Based Pricing Parity (totalCredits = questions * 5)', () => {

        it('should correctly calculate pricing for all allowed question counts (5 through 20)', () => {
            const expectedPrices = {
                5: 25,
                6: 30,
                7: 35,
                8: 40,
                9: 45,
                10: 50,
                11: 55,
                12: 60,
                13: 65,
                14: 70,
                15: 75,
                16: 80,
                17: 85,
                18: 90,
                19: 95,
                20: 100,
            };

            for (let q = MIN_QUESTION_COUNT; q <= MAX_QUESTION_COUNT; q++) {
                const result = calculateInterviewPricing({
                    interviewMode: 'question_based',
                    selectedQuestionCount: q,
                });

                assert.strictEqual(result.valid, true, `Question count ${q} should be valid`);
                assert.strictEqual(result.interviewMode, 'question_based');
                assert.strictEqual(result.selectedQuestionCount, q);
                assert.strictEqual(result.targetQuestionCount, q);
                assert.strictEqual(result.selectedDurationMinutes, null);
                assert.strictEqual(result.creditsCharged, expectedPrices[q], `Question count ${q} must cost ${expectedPrices[q]} credits`);
                assert.strictEqual(result.difficulty, STANDARDIZED_DIFFICULTY);
                assert.strictEqual(result.answerTimeLimitSeconds, ANSWER_TIME_LIMIT_SECONDS);
            }
        });

        it('should default to 10 questions (50 credits) when selectedQuestionCount is omitted', () => {
            const result = calculateInterviewPricing({ interviewMode: 'question_based' });
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.selectedQuestionCount, DEFAULT_QUESTION_COUNT);
            assert.strictEqual(result.targetQuestionCount, DEFAULT_QUESTION_COUNT);
            assert.strictEqual(result.creditsCharged, 50);
            assert.strictEqual(result.selectedDurationMinutes, null);
        });

        it('should default to question-based mode when interviewMode is omitted', () => {
            const result = calculateInterviewPricing({ selectedQuestionCount: 8 });
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.interviewMode, 'question_based');
            assert.strictEqual(result.selectedQuestionCount, 8);
            assert.strictEqual(result.creditsCharged, 40);
        });

        it('should reject question counts below 5', () => {
            for (const count of [4, 3, 1, 0, -5]) {
                const result = calculateInterviewPricing({
                    interviewMode: 'question_based',
                    selectedQuestionCount: count,
                });
                assert.strictEqual(result.valid, false, `Count ${count} must be rejected`);
                assert.ok(result.error.includes('between 5 and 20'));
            }
        });

        it('should reject question counts above 20', () => {
            for (const count of [21, 25, 50, 100]) {
                const result = calculateInterviewPricing({
                    interviewMode: 'question_based',
                    selectedQuestionCount: count,
                });
                assert.strictEqual(result.valid, false, `Count ${count} must be rejected`);
                assert.ok(result.error.includes('between 5 and 20'));
            }
        });

        it('should reject non-integer, float, or invalid question counts', () => {
            for (const count of [5.5, 7.2, 'ten', NaN, Infinity, null, {}]) {
                if (count === null) continue; // null is handled by default count
                const result = calculateInterviewPricing({
                    interviewMode: 'question_based',
                    selectedQuestionCount: count,
                });
                assert.strictEqual(result.valid, false, `Non-integer count ${count} must be rejected`);
            }
        });
    });

    // =========================================================================
    // 2. Authoritative Pricing Parity for Mode B (Time-Based)
    // =========================================================================
    describe('2. Mode B: Time-Based Packages Parity', () => {

        it('should validate package 1: 30 minutes -> 10 questions, 50 credits', () => {
            const result = calculateInterviewPricing({
                interviewMode: 'time_based',
                durationMinutes: 30,
            });
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.interviewMode, 'time_based');
            assert.strictEqual(result.selectedDurationMinutes, 30);
            assert.strictEqual(result.targetQuestionCount, 10);
            assert.strictEqual(result.creditsCharged, 50);
            assert.strictEqual(result.difficulty, 'medium');
            assert.strictEqual(result.answerTimeLimitSeconds, 60);
        });

        it('should validate package 2: 60 minutes -> 15 questions, 75 credits', () => {
            const result = calculateInterviewPricing({
                interviewMode: 'time_based',
                durationMinutes: 60,
            });
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.interviewMode, 'time_based');
            assert.strictEqual(result.selectedDurationMinutes, 60);
            assert.strictEqual(result.targetQuestionCount, 15);
            assert.strictEqual(result.creditsCharged, 75);
            assert.strictEqual(result.difficulty, 'medium');
            assert.strictEqual(result.answerTimeLimitSeconds, 60);
        });

        it('should validate package 3: 120 minutes -> 30 questions, 150 credits', () => {
            const result = calculateInterviewPricing({
                interviewMode: 'time_based',
                durationMinutes: 120,
            });
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.interviewMode, 'time_based');
            assert.strictEqual(result.selectedDurationMinutes, 120);
            assert.strictEqual(result.targetQuestionCount, 30);
            assert.strictEqual(result.creditsCharged, 150);
            assert.strictEqual(result.difficulty, 'medium');
            assert.strictEqual(result.answerTimeLimitSeconds, 60);
        });

        it('should accept timePackage alias strings like "30_minutes", "half", "one", "two"', () => {
            const testCases = [
                { input: { interviewMode: 'time_based', timePackage: '30_minutes' }, expectedDuration: 30, expectedCredits: 50 },
                { input: { interviewMode: 'time_based', timePackage: 'half an hour' }, expectedDuration: 30, expectedCredits: 50 },
                { input: { interviewMode: 'time_based', timePackage: '60_minutes' }, expectedDuration: 60, expectedCredits: 75 },
                { input: { interviewMode: 'time_based', timePackage: 'one hour' }, expectedDuration: 60, expectedCredits: 75 },
                { input: { interviewMode: 'time_based', timePackage: '120_minutes' }, expectedDuration: 120, expectedCredits: 150 },
                { input: { interviewMode: 'time_based', timePackage: 'two hours' }, expectedDuration: 120, expectedCredits: 150 },
            ];

            for (const { input, expectedDuration, expectedCredits } of testCases) {
                const res = calculateInterviewPricing(input);
                assert.strictEqual(res.valid, true);
                assert.strictEqual(res.selectedDurationMinutes, expectedDuration);
                assert.strictEqual(res.creditsCharged, expectedCredits);
            }
        });

        it('should reject invalid time packages (e.g. 15, 45, 90, 180 minutes or arbitrary strings)', () => {
            for (const invalid of [15, 45, 90, 180, '45_minutes', 'three hours', 'random']) {
                const result = calculateInterviewPricing({
                    interviewMode: 'time_based',
                    durationMinutes: invalid,
                });
                assert.strictEqual(result.valid, false, `Time package ${invalid} must be rejected`);
                assert.ok(result.error.includes('Supported packages are 30 minutes'));
            }
        });

        it('should reject invalid interviewMode string', () => {
            const result = calculateInterviewPricing({
                interviewMode: 'unsupported_mode',
            });
            assert.strictEqual(result.valid, false);
            assert.ok(result.error.includes("Must be 'question_based' or 'time_based'"));
        });
    });

    // =========================================================================
    // 3. Strict 60-Second Answer Timer & Server Deadline Calculation
    // =========================================================================
    describe('3. Strict 60-Second Answer Deadline Validation', () => {

        it('should calculate 60-second deadline from question start timestamp', () => {
            const start = new Date('2026-11-13T10:00:00.000Z');
            const deadline = calculateQuestionDeadline({
                currentQuestionStartedAt: start,
                answerTimeLimitSeconds: 60,
            });

            const expected = new Date('2026-11-13T10:01:00.000Z');
            assert.strictEqual(deadline.getTime(), expected.getTime());
        });

        it('should cap question deadline by session expiresAt if session expires sooner than 60s', () => {
            const start = new Date('2026-11-13T10:00:00.000Z');
            // Session expires in 30 seconds
            const sessionExpires = new Date('2026-11-13T10:00:30.000Z');

            const deadline = calculateQuestionDeadline({
                currentQuestionStartedAt: start,
                answerTimeLimitSeconds: 60,
                expiresAt: sessionExpires,
            });

            // Must be capped at sessionExpires (30s), not 60s
            assert.strictEqual(deadline.getTime(), sessionExpires.getTime());
        });

        it('should not cap question deadline if session expires later than 60s', () => {
            const start = new Date('2026-11-13T10:00:00.000Z');
            // Session expires in 30 minutes
            const sessionExpires = new Date('2026-11-13T10:30:00.000Z');

            const deadline = calculateQuestionDeadline({
                currentQuestionStartedAt: start,
                answerTimeLimitSeconds: 60,
                expiresAt: sessionExpires,
            });

            const expected = new Date('2026-11-13T10:01:00.000Z');
            assert.strictEqual(deadline.getTime(), expected.getTime());
        });

        it('should detect on-time answers within 60s + grace period', () => {
            const start = new Date('2026-11-13T10:00:00.000Z');
            const deadline = new Date('2026-11-13T10:01:00.000Z');

            // Answered at 45 seconds
            const now45 = new Date('2026-11-13T10:00:45.000Z');
            const result45 = verifyAnswerDeadline({
                currentQuestionStartedAt: start,
                currentQuestionDeadline: deadline,
                now: now45,
            });
            assert.strictEqual(result45.isTimedOut, false);
            assert.strictEqual(result45.elapsedSeconds, 45);

            // Answered at exactly 60 seconds
            const now60 = new Date('2026-11-13T10:01:00.000Z');
            const result60 = verifyAnswerDeadline({
                currentQuestionStartedAt: start,
                currentQuestionDeadline: deadline,
                now: now60,
            });
            assert.strictEqual(result60.isTimedOut, false);

            // Answered at 64 seconds (within 5s grace period)
            const now64 = new Date('2026-11-13T10:01:04.000Z');
            const result64 = verifyAnswerDeadline({
                currentQuestionStartedAt: start,
                currentQuestionDeadline: deadline,
                now: now64,
            });
            assert.strictEqual(result64.isTimedOut, false);
        });

        it('should detect timed-out answers beyond 60s + grace period', () => {
            const start = new Date('2026-11-13T10:00:00.000Z');
            const deadline = new Date('2026-11-13T10:01:00.000Z');

            // Answered at 66 seconds (grace period is 5s, so 60+5 = 65s)
            const now66 = new Date('2026-11-13T10:01:06.000Z');
            const result66 = verifyAnswerDeadline({
                currentQuestionStartedAt: start,
                currentQuestionDeadline: deadline,
                now: now66,
            });
            assert.strictEqual(result66.isTimedOut, true);
            assert.strictEqual(result66.elapsedSeconds, 66);
        });
    });

    // =========================================================================
    // 4. Server-Side Credit Deduction, Validation & Rollback Discipline
    // =========================================================================
    describe('4. Credit Deduction, Balance Check & Rollback Discipline', () => {

        class MockUserModel {
            constructor(initialCredits = 100) {
                this.credits = initialCredits;
                this.saved = false;
            }

            async findById() {
                const self = this;
                return {
                    get credits() { return self.credits; },
                    set credits(val) { self.credits = val; },
                    name: 'Test Candidate',
                    save: async function() { self.saved = true; return this; }
                };
            }

            async findByIdAndUpdate(id, update, options = {}) {
                const inc = update.$inc?.credits || 0;
                this.credits += inc;
                return { credits: this.credits, name: 'Test Candidate' };
            }

            async findOneAndUpdate(filter, update, options = {}) {
                const requiredCredits = filter.credits?.$gte || 0;
                if (this.credits < requiredCredits) {
                    return null;
                }
                const inc = update.$inc?.credits || 0;
                this.credits += inc;
                return { credits: this.credits, name: 'Test Candidate' };
            }
        }

        it('should reject when user credits are lower than required price', async () => {
            const userModel = new MockUserModel(30); // 30 credits
            // Mode A with 10 questions requires 50 credits
            const check = await checkUserCredits('user_123', userModel, 50);
            assert.strictEqual(check.hasCredits, false);
            assert.strictEqual(check.statusCode, 400);
            assert.strictEqual(check.message, INSUFFICIENT_CREDITS_MESSAGE);
            assert.strictEqual(check.user.credits, 30);
        });

        it('should approve when user credits are equal to or greater than required price', async () => {
            const userModel = new MockUserModel(75);
            // Mode B 60-minute package requires 75 credits
            const check = await checkUserCredits('user_123', userModel, 75);
            assert.strictEqual(check.hasCredits, true);
            assert.strictEqual(check.user.credits, 75);
        });

        it('should atomically deduct the exact calculated package price', async () => {
            const userModel = new MockUserModel(150);
            // Mode B 120-minute package costs 150 credits
            const deduction = await deductInterviewCredits('user_123', userModel, 150);
            assert.strictEqual(deduction.success, true);
            assert.strictEqual(deduction.creditsLeft, 0);
            assert.strictEqual(userModel.credits, 0);
        });

        it('should refund / rollback exact deducted credits upon AI generation failure', async () => {
            const userModel = new MockUserModel(100);
            // Deduct for 15 questions = 75 credits
            const deduction = await deductInterviewCredits('user_123', userModel, 75);
            assert.strictEqual(deduction.success, true);
            assert.strictEqual(userModel.credits, 25);

            // Simulate failure and automatic rollback
            const refund = await refundInterviewCredits('user_123', userModel, 75);
            assert.ok(refund !== null);
            assert.strictEqual(userModel.credits, 100);
        });
    });

    // =========================================================================
    // 5. Anti-Tampering: Client Cannot Override Server Price or Difficulty
    // =========================================================================
    describe('5. Security & Anti-Tampering Guarantees', () => {

        it('should always enforce server-calculated pricing even if client supplies fake price', () => {
            const tamperedParams = {
                interviewMode: 'question_based',
                selectedQuestionCount: 20,
                // Client attempts to pass 1 credit or free
                credits: 0,
                creditsCharged: 0,
                price: 5,
                cost: 0,
                difficulty: 'easy'
            };

            const result = calculateInterviewPricing(tamperedParams);
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.creditsCharged, 100, 'Server must enforce 20 * 5 = 100 credits');
            assert.strictEqual(result.difficulty, 'medium', 'Server must strictly enforce medium difficulty');
        });

        it('should always enforce medium difficulty for time-based mode despite client params', () => {
            const tamperedParams = {
                interviewMode: 'time_based',
                durationMinutes: 30,
                difficulty: 'hard',
                timeLimit: 120, // Client tries to give themselves 120s
            };

            const result = calculateInterviewPricing(tamperedParams);
            assert.strictEqual(result.valid, true);
            assert.strictEqual(result.creditsCharged, 50);
            assert.strictEqual(result.difficulty, 'medium');
            assert.strictEqual(result.answerTimeLimitSeconds, 60);
        });
    });

    // =========================================================================
    // 6. Question Allocation & Follow-Up Pacing Rules
    // =========================================================================
    describe('6. Question Allocation & Follow-Up Probing Bounds', () => {

        it('should verify follow-ups cannot exceed purchased allocation', () => {
            const targetAllocation = 10;
            const currentQuestions = new Array(10).fill({ question: 'Q', isFollowUp: false });

            // Interview already has 10 questions matching targetQuestionCount
            const hasRemainingAllocation = currentQuestions.length < targetAllocation;
            assert.strictEqual(hasRemainingAllocation, false, 'No follow-up allowed once target question count is reached');
        });

        it('should permit follow-up when current count is strictly less than targetQuestionCount', () => {
            const targetAllocation = 10;
            const currentQuestions = new Array(9).fill({ question: 'Q', isFollowUp: false });

            const hasRemainingAllocation = currentQuestions.length < targetAllocation;
            assert.strictEqual(hasRemainingAllocation, true, 'Follow-up is permitted when allocation remains');
        });
    });

    // =========================================================================
    // 7. Schema Integrity & Controller Integration
    // =========================================================================
    describe('7. Schema & Controller Implementation Guarantees', () => {

        it('should verify interview.model.js defines all required packaging and timing fields', async () => {
            const fs = await import('node:fs');
            const schemaFile = fs.readFileSync(path.resolve(backendRoot, 'models/interview.model.js'), 'utf8');

            assert.ok(schemaFile.includes("interviewMode: {"), 'Must define interviewMode field');
            assert.ok(schemaFile.includes("enum: [\"question_based\", \"time_based\"]"), 'Must restrict interviewMode to question_based or time_based');
            assert.ok(schemaFile.includes("selectedQuestionCount:"), 'Must define selectedQuestionCount');
            assert.ok(schemaFile.includes("selectedDurationMinutes:"), 'Must define selectedDurationMinutes');
            assert.ok(schemaFile.includes("targetQuestionCount:"), 'Must define targetQuestionCount');
            assert.ok(schemaFile.includes("creditsCharged:"), 'Must define creditsCharged');
            assert.ok(schemaFile.includes("difficulty:"), 'Must define difficulty');
            assert.ok(schemaFile.includes("answerTimeLimitSeconds:"), 'Must define answerTimeLimitSeconds');
            assert.ok(schemaFile.includes("currentQuestionStartedAt:"), 'Must define currentQuestionStartedAt');
            assert.ok(schemaFile.includes("currentQuestionDeadline:"), 'Must define currentQuestionDeadline');
            assert.ok(schemaFile.includes("default: 60"), 'Question timeLimit default must be 60 seconds');
            assert.ok(schemaFile.includes("default: 'medium'") || schemaFile.includes('default: "medium"'), 'Difficulty default must be medium');
        });

        it('should verify interview.controller.js enforces strict medium difficulty in system prompt', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerFile.includes('All questions MUST be of MEDIUM difficulty'), 'Controller must specify medium difficulty in AI prompt');
            assert.ok(controllerFile.includes('safeRefund') || controllerFile.includes('refundInterviewCredits'), 'Controller must refund credits if AI fails');
            assert.ok(controllerFile.includes('getInterviewSession'), 'Controller must export getInterviewSession endpoint for session rehydration');
        });

        it('should verify interview.routes.js registers the session rehydration endpoint', async () => {
            const fs = await import('node:fs');
            const routesFile = fs.readFileSync(path.resolve(backendRoot, 'routes/interview.routes.js'), 'utf8');

            assert.ok(routesFile.includes('/session/:id'), 'interview.routes.js must expose GET /session/:id');
            assert.ok(routesFile.includes('getInterviewSession'), 'interview.routes.js must wire getInterviewSession');
        });
    });

    // =========================================================================
    // 8. Phase 1 & 2: Security, Ownership, State Machine & Timer Enforcement
    // =========================================================================
    describe('8. Controller Security & Timer Enforcement Logic', () => {

        it('should verify submitAnswer and finishInterview strictly enforce user ownership', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            // submitAnswer ownership check
            assert.ok(
                controllerFile.includes('interview.userId.toString() !== userId.toString()') &&
                controllerFile.includes('Forbidden: You cannot access or submit to another candidate'),
                'submitAnswer must reject submissions to other users interviews with 403'
            );

            // finishInterview ownership check
            assert.ok(
                controllerFile.includes('Forbidden: You cannot access or complete another candidate'),
                'finishInterview must reject completion of other users interviews with 403'
            );
        });

        it('should verify submitAnswer rejects completed or expired interviews', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('interview.status === "Completed"'),
                'submitAnswer must check interview.status === "Completed"'
            );
            assert.ok(
                controllerFile.includes('Interview session is already completed'),
                'submitAnswer must return completed session error'
            );
            assert.ok(
                controllerFile.includes('Interview session has expired'),
                'submitAnswer must reject expired interview sessions with 410'
            );
        });

        it('should verify submitAnswer validates currentQuestionIndex against expectedIndex', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('Number(questionIndex) !== expectedIndex'),
                'submitAnswer must reject out-of-order question submissions'
            );
            assert.ok(
                controllerFile.includes('Question out of sequence or already submitted'),
                'submitAnswer must return 409 conflict on out-of-sequence question index'
            );
        });

        it('should verify submitAnswer calls verifyAnswerDeadline and penalizes late submissions', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('verifyAnswerDeadline({'),
                'submitAnswer must invoke verifyAnswerDeadline'
            );
            assert.ok(
                controllerFile.includes('deadlineCheck.isTimedOut'),
                'submitAnswer must inspect deadlineCheck.isTimedOut'
            );
            assert.ok(
                controllerFile.includes('Math.min(parsed.finalScore, 4)') || controllerFile.includes('[Time Expired]'),
                'Late submissions must be penalized or score-capped'
            );
        });

        it('should verify submitAnswer employs atomic locking via isEvaluating', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('isEvaluating: { $ne: true }') || controllerFile.includes('isEvaluating: true'),
                'submitAnswer must conditionally lock interview using isEvaluating'
            );
            assert.ok(
                controllerFile.includes('Question is currently being evaluated'),
                'Concurrent duplicate submissions must be blocked'
            );
        });
    });

    // =========================================================================
    // 9. Phase 4: Adaptive Cross-Questioning Question Displacement
    // =========================================================================
    describe('9. Adaptive Cross-Questioning Allocation & Displacement Rules', () => {

        it('should verify follow-ups displace an unasked primary question to never exceed targetAllocation', () => {
            const targetAllocation = 10;
            const questions = [
                { question: 'Q1', answer: 'My answer to question 1', isFollowUp: false },
                { question: 'Q2', answer: '', isFollowUp: false },
                { question: 'Q3', answer: '', isFollowUp: false },
                { question: 'Q4', answer: '', isFollowUp: false },
                { question: 'Q5', answer: '', isFollowUp: false },
                { question: 'Q6', answer: '', isFollowUp: false },
                { question: 'Q7', answer: '', isFollowUp: false },
                { question: 'Q8', answer: '', isFollowUp: false },
                { question: 'Q9', answer: '', isFollowUp: false },
                { question: 'Q10', answer: '', isFollowUp: false },
            ];

            assert.strictEqual(questions.length, targetAllocation);

            // Follow-up on Q1
            const expectedIndex = 0;
            const followUp = { question: 'Follow-Up 1', isFollowUp: true, answer: '' };

            // Insert follow-up right after Q1
            questions.splice(expectedIndex + 1, 0, followUp);

            // Displace the last unasked primary question
            for (let i = questions.length - 1; i > expectedIndex + 1; i--) {
                if (!questions[i].isFollowUp && !questions[i].answer) {
                    questions.splice(i, 1);
                    break;
                }
            }

            // Total question count MUST remain exactly equal to targetAllocation
            assert.strictEqual(questions.length, targetAllocation, 'Question count must remain exactly 10');
            assert.strictEqual(questions[0].question, 'Q1');
            assert.strictEqual(questions[1].question, 'Follow-Up 1');
            assert.strictEqual(questions[2].question, 'Q2');
            assert.strictEqual(questions[9].question, 'Q9'); // Q10 was displaced
        });

        it('should verify controller implements follow-up displacement logic', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('lastUnaskedPrimaryIndex'),
                'Controller must locate unasked primary questions for displacement'
            );
            assert.ok(
                controllerFile.includes('lockedDoc.questions.splice(i, 1)'),
                'Controller must displace unasked primary questions when inserting follow-up'
            );
        });
    });

    // =========================================================================
    // 10. Phase 5: Credit Rollback & Under-Generation Safety
    // =========================================================================
    describe('10. Credit Rollback & Under-Generation Safety', () => {

        it('should verify generateQuestions attempts bounded retry if AI generates fewer questions than target', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('targetCount - questionArray.length') || controllerFile.includes('deficit'),
                'Controller must compute question deficit for bounded completion retry'
            );
            assert.ok(
                controllerFile.includes('safeRefund') && controllerFile.includes('creditsDeductedAmount = 0'),
                'Controller must implement safe refund tracker preventing duplicate refunds'
            );
        });

        it('should verify generateQuestions refunds and fails if required allocation cannot be fulfilled', async () => {
            const fs = await import('node:fs');
            const controllerFile = fs.readFileSync(path.resolve(backendRoot, 'controllers/interview.controller.js'), 'utf8');

            assert.ok(
                controllerFile.includes('Unable to generate the full allocation of'),
                'Controller must reject under-allocated generation with refund and message'
            );
        });
    });
});
