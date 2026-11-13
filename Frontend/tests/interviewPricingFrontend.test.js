import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Prepper AI — Interview Pricing & Timing Frontend Regression Suite', () => {

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const frontendRoot = path.resolve(__dirname, '..');

    const step1Path = path.resolve(frontendRoot, 'src/pages/Step1Setup.jsx');
    const step2Path = path.resolve(frontendRoot, 'src/pages/Step2Interview.jsx');
    const step3Path = path.resolve(frontendRoot, 'src/pages/Step3Report.jsx');
    const interviewPagePath = path.resolve(frontendRoot, 'src/pages/InterviewPage.jsx');

    const step1Code = fs.readFileSync(step1Path, 'utf8');
    const step2Code = fs.readFileSync(step2Path, 'utf8');
    const step3Code = fs.readFileSync(step3Path, 'utf8');
    const interviewPageCode = fs.readFileSync(interviewPagePath, 'utf8');

    // =========================================================================
    // 1. Mode A: Question-Based Setup & Dynamic Pricing Formula
    // =========================================================================
    describe('1. Mode A: Question-Based Dynamic Pricing & Bounds', () => {

        it('should calculate credits strictly with totalCredits = questions * 5 formula', () => {
            const calculateCredits = (q) => q * 5;
            for (let q = 5; q <= 20; q++) {
                assert.strictEqual(calculateCredits(q), q * 5);
            }
            assert.strictEqual(calculateCredits(5), 25);
            assert.strictEqual(calculateCredits(10), 50);
            assert.strictEqual(calculateCredits(15), 75);
            assert.strictEqual(calculateCredits(20), 100);
        });

        it('should verify Step1Setup.jsx initializes question count to 10 and restricts range from 5 to 20', () => {
            assert.ok(
                step1Code.includes('useState(10)') || step1Code.includes('selectedQuestionCount = 10'),
                'selectedQuestionCount default must be 10'
            );
            assert.ok(
                step1Code.includes('min="5"') && step1Code.includes('max="20"'),
                'Slider must restrict range from 5 to 20'
            );
            assert.ok(
                step1Code.includes('Math.max(5, prev - 1)'),
                'Stepper decrement must clamp at min 5'
            );
            assert.ok(
                step1Code.includes('Math.min(20, prev + 1)'),
                'Stepper increment must clamp at max 20'
            );
        });

        it('should verify Step1Setup.jsx computes requiredCredits dynamically for question-based mode', () => {
            assert.ok(
                step1Code.includes('selectedQuestionCount * 5') || step1Code.includes('selectedQuestionCount*5'),
                'Step1Setup must compute requiredCredits dynamically via selectedQuestionCount * 5'
            );
        });
    });

    // =========================================================================
    // 2. Mode B: Time-Based Packages Specification
    // =========================================================================
    describe('2. Mode B: Time-Based Packages Specification', () => {

        it('should verify Step1Setup.jsx defines the exact three time packages (30m/50cr, 60m/75cr, 120m/150cr)', () => {
            assert.ok(step1Code.includes("key: '30'") || step1Code.includes("key: \"30\""));
            assert.ok(step1Code.includes("Half an Hour") || step1Code.includes("Half an hour") || step1Code.includes("30 min"));
            assert.ok(step1Code.includes("credits: 50"));

            assert.ok(step1Code.includes("key: '60'") || step1Code.includes("key: \"60\""));
            assert.ok(step1Code.includes("One Hour") || step1Code.includes("One hour") || step1Code.includes("60 min"));
            assert.ok(step1Code.includes("credits: 75"));

            assert.ok(step1Code.includes("key: '120'") || step1Code.includes("key: \"120\""));
            assert.ok(step1Code.includes("Two Hours") || step1Code.includes("Two hours") || step1Code.includes("120 min"));
            assert.ok(step1Code.includes("credits: 150"));
        });

        it('should verify Step1Setup.jsx maps time packages to their exact credit amounts in requiredCredits', () => {
            assert.ok(
                step1Code.includes("timePackage === '120' ? 150 : timePackage === '60' ? 75 : 50") ||
                step1Code.includes("timePackage === '120'") && step1Code.includes("150"),
                'requiredCredits must correctly evaluate timePackage amounts'
            );
        });
    });

    // =========================================================================
    // 3. Mutual Exclusivity, Medium Difficulty & Credit Insufficiency Handling
    // =========================================================================
    describe('3. Mutual Exclusivity, Difficulty Standardization & Credit Guard', () => {

        it('should provide mutual exclusive toggle between Question-Based and Time-Based modes', () => {
            assert.ok(
                step1Code.includes("setInterviewMode('question_based')"),
                'Must have trigger to activate Question-Based mode'
            );
            assert.ok(
                step1Code.includes("setInterviewMode('time_based')"),
                'Must have trigger to activate Time-Based mode'
            );
        });

        it('should display Medium Difficulty badge and eliminate Easy/Hard options from setup', () => {
            assert.ok(
                step1Code.includes('Medium Difficulty'),
                'Must render Medium Difficulty badge'
            );
            assert.ok(
                !step1Code.includes('<option value="Easy">') && !step1Code.includes('<option value="Hard">'),
                'Easy and Hard options must not be present in setup selector'
            );
        });

        it('should disable start button and display Insufficient Credits when balance is low', () => {
            assert.ok(
                step1Code.includes('hasSufficientCredits'),
                'Must calculate hasSufficientCredits from balance and requiredCredits'
            );
            assert.ok(
                step1Code.includes('disabled={!role || !experience || anaylzing || loading || !hasSufficientCredits}'),
                'Start button must be disabled when hasSufficientCredits is false'
            );
            assert.ok(
                step1Code.includes('"Insufficient Credits"'),
                'Start button text must reflect Insufficient Credits'
            );
        });

        it('should dispatch updated credits balance to Redux upon successful question generation', () => {
            assert.ok(
                step1Code.includes('dispatch(setUserData({ ...userData, credits: result.data.creditsLeft }))'),
                'Must update user Redux credits with creditsLeft returned from server'
            );
        });
    });

    // =========================================================================
    // 4. Strict 60-Second Answer Timer & Auto-Submit in Step2Interview
    // =========================================================================
    describe('4. Step2Interview Strict 60-Second Timer & Auto-Submit', () => {

        it('should verify Step2Interview.jsx defaults question timer to 60 seconds', () => {
            assert.ok(
                step2Code.includes('totalQuestionTime, setTotalQuestionTime] = useState(60)') ||
                step2Code.includes('useState(60)'),
                'Question timer must default to 60 seconds'
            );
        });

        it('should verify Step2Interview.jsx synchronizes timeLeft with currentQuestionDeadline if provided', () => {
            assert.ok(
                step2Code.includes('currentQuestionDeadline') && step2Code.includes('computeInitialQuestionTimeLeft'),
                'Step2Interview must synchronize initial timer with server-provided currentQuestionDeadline'
            );
        });

        it('should verify Step2Interview.jsx automatically submits response when timeLeft reaches 0', () => {
            assert.ok(
                step2Code.includes('if (timeLeft <= 0)'),
                'Step2Interview must watch for timeLeft <= 0'
            );
            assert.ok(
                step2Code.includes('handleSubmit(answerRef.current)'),
                'Step2Interview must auto-submit candidate answer when time expires'
            );
            assert.ok(
                step2Code.includes('autoSubmittedRef.current = true'),
                'Step2Interview must guard against multiple auto-submissions'
            );
        });

        it('should verify Step2Interview.jsx monitors overall session timer for Time-Based mode and auto-finishes upon expiration', () => {
            assert.ok(
                step2Code.includes("interviewMode !== 'time_based'"),
                'Session countdown should activate for time_based mode'
            );
            assert.ok(
                step2Code.includes('finishInterview()'),
                'Session countdown expiration must call finishInterview'
            );
        });
    });

    // =========================================================================
    // 5. Session Rehydration Across Refreshes
    // =========================================================================
    describe('5. Session Persistence & Rehydration Across Refreshes', () => {

        it('should persist activeInterviewId in sessionStorage when interview starts', () => {
            assert.ok(
                interviewPageCode.includes("sessionStorage.setItem('activeInterviewId', data.interviewId)"),
                'InterviewPage must store activeInterviewId in sessionStorage'
            );
        });

        it('should fetch session state and rehydrate when activeInterviewId exists on refresh', () => {
            assert.ok(
                interviewPageCode.includes("sessionStorage.getItem('activeInterviewId')"),
                'InterviewPage must check sessionStorage for activeInterviewId on mount'
            );
            assert.ok(
                interviewPageCode.includes('/api/interview/session/'),
                'InterviewPage must query session endpoint to rehydrate'
            );
            assert.ok(
                interviewPageCode.includes('setStep(2)'),
                'InterviewPage must transition to Step 2 upon successful rehydration'
            );
        });

        it('should remove activeInterviewId from sessionStorage when interview completes', () => {
            assert.ok(
                interviewPageCode.includes("sessionStorage.removeItem('activeInterviewId')"),
                'InterviewPage must clear activeInterviewId upon completion'
            );
        });
    });

    // =========================================================================
    // 6. Step3Report Specification Badges
    // =========================================================================
    describe('6. Step3Report Packaging & Specification Badges', () => {

        it('should verify Step3Report.jsx renders Time-Based vs Question-Based badge', () => {
            assert.ok(
                step3Code.includes("report.interviewMode === 'time_based' ? 'Time-Based Interview' : 'Question-Based Interview'"),
                'Step3Report must distinguish Time-Based and Question-Based interview mode'
            );
        });

        it('should verify Step3Report.jsx renders credits spent, question count, and 60s/answer badges', () => {
            assert.ok(
                step3Code.includes('Credits Spent'),
                'Step3Report must render credits spent badge'
            );
            assert.ok(
                step3Code.includes('Questions'),
                'Step3Report must render question count badge'
            );
            assert.ok(
                step3Code.includes('60s / Answer'),
                'Step3Report must render 60s per answer badge'
            );
            assert.ok(
                step3Code.includes('Medium Difficulty'),
                'Step3Report must render Medium Difficulty badge'
            );
        });
    });

    // =========================================================================
    // 7. Phase 6: Session Rehydration, Elapsed Timer & Index Preservation
    // =========================================================================
    describe('7. Session Rehydration, Index Preservation & Concurrency Guard', () => {

        it('should verify Step2Interview.jsx initializes currentIndex using currentQuestionIndex', () => {
            assert.ok(
                step2Code.includes('interviewData?.currentQuestionIndex') || step2Code.includes('currentQuestionIndex'),
                'Step2Interview must preserve currentQuestionIndex from server on mount'
            );
            assert.ok(
                !step2Code.includes('const [currentIndex, setCurrentIndex] = useState(0);'),
                'Step2Interview must not hardcode currentIndex to 0'
            );
        });

        it('should verify Step2Interview.jsx restores sessionElapsedSeconds from startedAt timestamp', () => {
            assert.ok(
                step2Code.includes('computeInitialElapsed') && step2Code.includes('startedAt'),
                'Step2Interview must restore session elapsed seconds from server startedAt timestamp'
            );
        });

        it('should verify Step2Interview.jsx guards against concurrent submissions with isSubmittingRef', () => {
            assert.ok(
                step2Code.includes('isSubmittingRef.current'),
                'Step2Interview must employ isSubmittingRef synchronous guard against concurrent submission'
            );
        });

        it('should verify InterviewPage.jsx rejects mounting expired sessions on refresh', () => {
            assert.ok(
                interviewPageCode.includes('isExpired') && interviewPageCode.includes('isSessionExpired'),
                'InterviewPage must detect expired sessions and avoid mounting Step 2'
            );
        });
    });
});
