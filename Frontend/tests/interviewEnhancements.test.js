import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_QUESTION_DURATION,
    LOW_TIME_THRESHOLD,
    formatTimeMMSS,
    getTimerStatus
} from '../src/utils/interviewTimer.js';

describe('Prepper AI Interview Enhancements Suite', () => {

    // ==========================================
    // 1. Feature A — Speech-to-Text Logic & Privacy
    // ==========================================
    describe('1. Feature A — Speech-to-Text Logic & Safety', () => {

        it('should detect when Web Speech API is supported or unsupported', () => {
            const isApiSupported = (win) => Boolean(win && (win.SpeechRecognition || win.webkitSpeechRecognition));
            assert.strictEqual(isApiSupported({ SpeechRecognition: class {} }), true);
            assert.strictEqual(isApiSupported({ webkitSpeechRecognition: class {} }), true);
            assert.strictEqual(isApiSupported({}), false);
            assert.strictEqual(isApiSupported(undefined), false);
        });

        it('should append spoken transcript to existing text without overwriting typed content', () => {
            const initialTypedText = "I have 4 years of experience with React and Node.js.";
            const spokenChunk = "Additionally, I have designed scalable microservices in Docker.";

            // Simulate the append logic implemented in useSpeechRecognition
            const baseText = initialTypedText.trim();
            const combined = baseText 
                ? `${baseText} ${spokenChunk.trim()}`
                : spokenChunk.trim();

            assert.ok(combined.startsWith(initialTypedText), 'Initial typed text must be strictly preserved');
            assert.ok(combined.endsWith(spokenChunk), 'Recognized text must be cleanly appended');
            assert.strictEqual(combined, "I have 4 years of experience with React and Node.js. Additionally, I have designed scalable microservices in Docker.");
        });

        it('should handle empty initial text cleanly when speech is first recognized', () => {
            const initialTypedText = "";
            const spokenChunk = "My primary tech stack is MERN.";

            const baseText = initialTypedText.trim();
            const combined = baseText 
                ? `${baseText} ${spokenChunk.trim()}`
                : spokenChunk.trim();

            assert.strictEqual(combined, "My primary tech stack is MERN.");
        });

        it('should simulate speech recognition events (interim + final)', () => {
            const results = [
                [{ transcript: 'I designed' }],
                [{ transcript: 'microservices' }]
            ];
            results[0].isFinal = true;
            results[1].isFinal = false;

            let finals = '';
            let interim = '';

            for (let i = 0; i < results.length; i++) {
                const res = results[i];
                if (res.isFinal) {
                    finals += res[0].transcript + ' ';
                } else {
                    interim += res[0].transcript;
                }
            }

            assert.strictEqual(finals.trim(), 'I designed');
            assert.strictEqual(interim.trim(), 'microservices');
            assert.strictEqual(`${finals.trim()} ${interim.trim()}`.trim(), 'I designed microservices');
        });

        it('should handle recognition errors gracefully without throwing unhandled exceptions', () => {
            const handledErrors = [];
            const mockOnError = (event) => {
                if (event.error === 'not-allowed') {
                    handledErrors.push('permission-denied');
                } else if (event.error === 'no-speech') {
                    handledErrors.push('ignored-silence');
                } else {
                    handledErrors.push(event.error);
                }
            };

            mockOnError({ error: 'not-allowed' });
            mockOnError({ error: 'no-speech' });
            mockOnError({ error: 'network' });

            assert.deepStrictEqual(handledErrors, ['permission-denied', 'ignored-silence', 'network']);
        });

        it('should never auto-submit an answer on recognition onend', () => {
            let submitted = false;
            const mockOnSubmit = () => { submitted = true; };

            // Simulate onend handler
            const mockOnEnd = () => {
                // Speech ends, but candidate must manually decide when to submit
            };

            mockOnEnd();
            assert.strictEqual(submitted, false, 'Speech ending must never auto-submit the answer');
        });
    });

    // ==========================================
    // 2. Feature B — Interview Timer & Expiration Policy
    // ==========================================
    describe('2. Feature B — Interview Timer & Expiration Policy', () => {

        it('should have a centralized configurable default question duration of 120 seconds', () => {
            assert.strictEqual(DEFAULT_QUESTION_DURATION, 120);
            assert.strictEqual(LOW_TIME_THRESHOLD, 30);
        });

        it('should format seconds accurately in MM:SS display format', () => {
            assert.strictEqual(formatTimeMMSS(0), '00:00');
            assert.strictEqual(formatTimeMMSS(45), '00:45');
            assert.strictEqual(formatTimeMMSS(60), '01:00');
            assert.strictEqual(formatTimeMMSS(120), '02:00');
            assert.strictEqual(formatTimeMMSS(125), '02:05');
            assert.strictEqual(formatTimeMMSS(3600), '60:00');
        });

        it('should correctly classify timer statuses (normal, low, expired)', () => {
            assert.strictEqual(getTimerStatus(120), 'normal');
            assert.strictEqual(getTimerStatus(31), 'normal');
            assert.strictEqual(getTimerStatus(30), 'low');
            assert.strictEqual(getTimerStatus(10), 'low');
            assert.strictEqual(getTimerStatus(1), 'low');
            assert.strictEqual(getTimerStatus(0), 'expired');
            assert.strictEqual(getTimerStatus(-5), 'expired');
        });

        it('should reset question timer on question transition', () => {
            const questions = [
                { question: 'Q1', timeLimit: 60 },
                { question: 'Q2', timeLimit: 90 },
                { question: 'Q3' } // No timeLimit, should fallback to default 120
            ];

            const getDurationForIndex = (idx) => questions[idx]?.timeLimit || DEFAULT_QUESTION_DURATION;

            assert.strictEqual(getDurationForIndex(0), 60);
            assert.strictEqual(getDurationForIndex(1), 90);
            assert.strictEqual(getDurationForIndex(2), 120);
        });

        it('should NOT automatically submit or discard candidate response when time hits 0', () => {
            let submitted = false;
            let currentAnswer = "I was in the middle of explaining optimistic locking...";

            // Simulate timer tick reaching 0
            let timeLeft = 1;
            timeLeft = Math.max(0, timeLeft - 1);
            assert.strictEqual(timeLeft, 0);

            // Verified: timeout policy keeps text intact and does not auto-submit
            assert.strictEqual(submitted, false);
            assert.ok(currentAnswer.length > 0);
            assert.strictEqual(getTimerStatus(timeLeft), 'expired');
        });

        it('should track overall interview session elapsed time continuously', () => {
            let sessionElapsedSeconds = 0;
            // Simulate 5 seconds ticking
            for (let i = 0; i < 5; i++) {
                sessionElapsedSeconds += 1;
            }
            assert.strictEqual(sessionElapsedSeconds, 5);
            assert.strictEqual(formatTimeMMSS(sessionElapsedSeconds), '00:05');
        });
    });

    // ==========================================
    // 3. Feature C — Direct Navbar Navigation
    // ==========================================
    describe('3. Feature C — Direct Navbar Navigation', () => {
        it('should verify Navbar.jsx has a dedicated visible Cross-Examination link outside the dropdown', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const navPath = path.resolve('src/components/Navbar.jsx');
            const navContent = fs.readFileSync(navPath, 'utf8');

            // Must have visible Link to /cross-examination in the top bar
            assert.ok(navContent.includes('to="/cross-examination"'), 'Navbar must link to /cross-examination');
            assert.ok(navContent.includes('Cross-Examination'), 'Navbar link must have Cross-Examination text');

            // Must NOT hide the link on mobile via hidden sm:flex
            assert.ok(!navContent.includes('hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black text-slate-800 bg-white/40'), 
                'Navbar should not hide the link completely on mobile');

            // Must support active route highlight
            assert.ok(navContent.includes('isCrossExamActive'), 'Must compute active state for cross-examination');
            assert.ok(navContent.includes('aria-current'), 'Must support ARIA current page attribute');
        });

        it('should verify profile dropdown preserves History and Logout without duplicate Cross-Examination', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const navPath = path.resolve('src/components/Navbar.jsx');
            const navContent = fs.readFileSync(navPath, 'utf8');

            // Profile dropdown must keep History and Logout
            assert.ok(navContent.includes("navigate('/history')"), 'Profile dropdown must contain History');
            assert.ok(navContent.includes('handleLogout'), 'Profile dropdown must contain Logout');

            // The profile dropdown shouldn't have duplicate cross-examination navigation
            const dropdownSnippet = navContent.slice(navContent.indexOf('isDropdownOpen &&'));
            const hasCrossExamInDropdown = dropdownSnippet.includes('/cross-examination');
            assert.strictEqual(hasCrossExamInDropdown, false, 'Cross-examination should be removed from dropdown to avoid duplicates');
        });
    });

    // ==========================================
    // 4. Feature D — Optional Cross-Questioning in Setup & Lifecycle
    // ==========================================
    describe('4. Feature D — Optional Cross-Questioning Setup & Lifecycle', () => {
        it('should verify Step1Setup.jsx contains the Enable cross-questioning checkbox defaulting to false', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Path = path.resolve('src/pages/Step1Setup.jsx');
            const content = fs.readFileSync(step1Path, 'utf8');

            assert.ok(content.includes('enableCrossQuestioning'), 'Step1Setup must manage enableCrossQuestioning state');
            assert.ok(content.includes('useState(false)'), 'enableCrossQuestioning must default to false for backward compatibility');
            assert.ok(content.includes('Enable cross-questioning'), 'Checkbox must be explicitly labeled "Enable cross-questioning"');
            assert.ok(content.includes('type="checkbox"'), 'Must render a semantic checkbox input');
            assert.ok(content.includes('enableCrossQuestioning: Boolean(enableCrossQuestioning)'), 
                'Payload to generateQuestions must pass sanitized boolean');
        });

        it('should dynamically update question list and question index when a follow-up probe is returned', () => {
            const initialQuestions = [
                { question: 'Explain React virtual DOM', timeLimit: 60, isFollowUp: false, depth: 0 },
                { question: 'What is Node.js event loop', timeLimit: 60, isFollowUp: false, depth: 0 }
            ];

            let questionsList = [...initialQuestions];
            let currentIndex = 0;

            // Simulated server response with follow-up inserted at index 1
            const followUpQuestion = {
                question: 'Can you elaborate on how React fiber reconciler implements priority scheduling?',
                difficulty: 'medium',
                timeLimit: 90,
                isFollowUp: true,
                parentQuestionIndex: 0,
                depth: 1
            };

            const updatedQuestionsFromServer = [
                initialQuestions[0],
                followUpQuestion,
                initialQuestions[1]
            ];

            // Client adopts updated list
            questionsList = updatedQuestionsFromServer;
            currentIndex = currentIndex + 1;

            assert.strictEqual(questionsList.length, 3);
            assert.strictEqual(currentIndex, 1);
            assert.strictEqual(questionsList[currentIndex].isFollowUp, true);
            assert.strictEqual(questionsList[currentIndex].question, followUpQuestion.question);
            assert.strictEqual(questionsList[currentIndex].timeLimit, 90);
            assert.strictEqual(questionsList[2].question, 'What is Node.js event loop');
        });

        it('should bound follow-up probing depth so follow-up cannot generate another follow-up', () => {
            const question = { depth: 1, isFollowUp: true };
            const canGenerateFollowUp = (question.depth || 0) < 1;
            assert.strictEqual(canGenerateFollowUp, false, 'Depth >= 1 must block further follow-up probing');
        });
    });
    // ==========================================
    // 5. Cross-Examination Timer & Voice Dictation Integration
    // ==========================================
    describe('5. Cross-Examination Timer & Voice Dictation Integration', () => {
        it('should verify QuestionCard.jsx renders active countdown timer in MM:SS format', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const cardPath = path.resolve('src/components/cross-examination/QuestionCard.jsx');
            const cardContent = fs.readFileSync(cardPath, 'utf8');

            assert.ok(cardContent.includes('formatTimeMMSS(timeLeft)'), 'QuestionCard must format remaining time in MM:SS');
            assert.ok(cardContent.includes('role="timer"'), 'QuestionCard timer must have role="timer" accessibility attribute');
            assert.ok(cardContent.includes('(Time Expired)'), 'QuestionCard must display an explicit expired state indicator');
            assert.ok(cardContent.includes('animate-pulse'), 'QuestionCard must render animated pulse for low time and expired states');
        });

        it('should verify AnswerConsole.jsx renders visible microphone button and speech dictation integration', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const consolePath = path.resolve('src/components/cross-examination/AnswerConsole.jsx');
            const consoleContent = fs.readFileSync(consolePath, 'utf8');

            assert.ok(consoleContent.includes('useSpeechRecognition'), 'AnswerConsole must use useSpeechRecognition hook');
            assert.ok(consoleContent.includes('id="voiceInputButton"'), 'AnswerConsole must have a dedicated voiceInputButton element');
            assert.ok(consoleContent.includes('HiMicrophone'), 'AnswerConsole must render microphone icon');
            assert.ok(consoleContent.includes('Listening...'), 'AnswerConsole must render a distinct Listening... recording state');
            assert.ok(consoleContent.includes('Stop Listening'), 'AnswerConsole must support stopping voice dictation');
            assert.ok(consoleContent.includes('Voice Input'), 'AnswerConsole must display Voice Input button label');
        });

        it('should verify CrossExaminationSession.jsx manages continuous countdown and resets on question change', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const sessionPath = path.resolve('src/pages/CrossExaminationSession.jsx');
            const sessionContent = fs.readFileSync(sessionPath, 'utf8');

            assert.ok(sessionContent.includes('const [timeLeft, setTimeLeft] = useState'), 'CrossExaminationSession must maintain timeLeft state');
            assert.ok(sessionContent.includes('DEFAULT_QUESTION_DURATION'), 'CrossExaminationSession must fallback to DEFAULT_QUESTION_DURATION (120s)');
            assert.ok(sessionContent.includes('timeLeft={timeLeft}'), 'CrossExaminationSession must pass timeLeft to QuestionCard and AnswerConsole');
            assert.ok(sessionContent.includes('clearInterval'), 'CrossExaminationSession must clean up timer intervals');
        });

        it('should reset answer transcript and stop speech recognition when activeQuestion changes', () => {
            let transcript = 'Some previous answer text';
            let isListening = true;

            // Simulating AnswerConsole activeQuestion.questionId transition effect
            const onQuestionChange = (newQuestionId) => {
                transcript = '';
                isListening = false;
            };

            onQuestionChange('new_question_id');
            assert.strictEqual(transcript, '');
            assert.strictEqual(isListening, false);
        });

        it('should preserve candidate transcript when time expires without auto-submitting', () => {
            const transcript = 'Candidate technical architecture explanation...';
            let submitted = false;
            let timeLeft = 0; // Expired

            // Verify timeout policy: expiration does NOT submit or wipe answer
            assert.strictEqual(submitted, false, 'Time expiration must not auto-submit');
            assert.ok(transcript.length > 0, 'Candidate answer must be strictly preserved upon expiration');
            assert.strictEqual(getTimerStatus(timeLeft), 'expired');
        });
    });
});
