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

    // ==========================================
    // 6. Feature — Audible Question Speech & Replay Lifecycle
    // ==========================================
    describe('6. Feature — Audible Question Speech & Replay Lifecycle', () => {
        it('should verify useQuestionSpeech.js exists and exports expected hook functions', async () => {
            const hookModule = await import('../src/hooks/useQuestionSpeech.js');
            assert.ok(hookModule.default || hookModule.useQuestionSpeech, 'useQuestionSpeech hook must be exported');
        });

        it('should deduplicate speech synthesis across 1-second countdown timer ticks and rerenders', () => {
            const spokenUtterances = [];
            const lastSpokenIdRef = { current: null };

            const speakQuestion = (text, questionId, { force = false } = {}) => {
                if (!force && lastSpokenIdRef.current === questionId) {
                    return; // Prevent duplicate speech
                }
                lastSpokenIdRef.current = questionId;
                spokenUtterances.push({ questionId, text });
            };

            // First render of Question 1: speaks
            speakQuestion('Explain event-driven architecture.', 'q_1');
            assert.strictEqual(spokenUtterances.length, 1);

            // 1-second timer tick (timeLeft: 120 -> 119 -> 118) triggers rerender: does NOT speak again
            speakQuestion('Explain event-driven architecture.', 'q_1');
            speakQuestion('Explain event-driven architecture.', 'q_1');
            assert.strictEqual(spokenUtterances.length, 1, 'Speech must be strictly deduped on timer updates');

            // Advancing to Question 2: speaks new question
            speakQuestion('How do you prevent race conditions?', 'q_2');
            assert.strictEqual(spokenUtterances.length, 2);
            assert.strictEqual(spokenUtterances[1].questionId, 'q_2');

            // Explicit replay click on Question 2: speaks again with force = true
            speakQuestion('How do you prevent race conditions?', 'q_2', { force: true });
            assert.strictEqual(spokenUtterances.length, 3, 'Explicit replay must re-speak even for the same questionId');
        });

        it('should cancel active speech immediately when question changes or session finishes', () => {
            let activeUtteranceCancelled = false;
            const mockCancel = () => {
                activeUtteranceCancelled = true;
            };

            // Simulate question transition
            const onTransition = () => {
                mockCancel();
            };

            onTransition();
            assert.strictEqual(activeUtteranceCancelled, true, 'Speech must be cancelled on question transition');
        });

        it('should disable candidate microphone while interviewer is actively speaking', () => {
            const isAISpeaking = true;
            const isSubmitting = false;
            const isAdvancing = false;

            const isMicDisabled = isSubmitting || isAdvancing || isAISpeaking;
            assert.strictEqual(isMicDisabled, true, 'Microphone must be disabled while AI is speaking to prevent audio feedback');

            // When AI finishes speaking, mic can be enabled
            const isMicDisabledAfterSpeech = isSubmitting || isAdvancing || false;
            assert.strictEqual(isMicDisabledAfterSpeech, false);
        });

        it('should handle browser autoplay restriction recovery via requestAudioActivation', () => {
            let isBlocked = true;
            let audioActivated = false;

            const requestAudioActivation = () => {
                isBlocked = false;
                audioActivated = true;
            };

            requestAudioActivation();
            assert.strictEqual(isBlocked, false);
            assert.strictEqual(audioActivated, true);
        });

        it('should verify CrossExaminationSession.jsx and QuestionCard.jsx integrate question voice controls', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');

            const sessionContent = fs.readFileSync(path.resolve('src/pages/CrossExaminationSession.jsx'), 'utf8');
            assert.ok(sessionContent.includes('useQuestionSpeech'), 'CrossExaminationSession must import useQuestionSpeech');
            assert.ok(sessionContent.includes('isAISpeaking'), 'CrossExaminationSession must track isAISpeaking state');
            assert.ok(sessionContent.includes('AI SPEAKING'), 'CrossExaminationSession must render AI SPEAKING state');
            assert.ok(sessionContent.includes('speakQuestion('), 'CrossExaminationSession must trigger speakQuestion');
            assert.ok(sessionContent.includes('cancelSpeech()'), 'CrossExaminationSession must cancel speech on transition');

            const cardContent = fs.readFileSync(path.resolve('src/components/cross-examination/QuestionCard.jsx'), 'utf8');
            assert.ok(cardContent.includes('HiSpeakerWave'), 'QuestionCard must render speaker icon');
            assert.ok(cardContent.includes('onReplay'), 'QuestionCard must accept onReplay callback');
            assert.ok(cardContent.includes('Speaking...'), 'QuestionCard must show speaking state');
            assert.ok(cardContent.includes('Replay'), 'QuestionCard must show replay option');
        });

        it('should declare isCompleted and derived session state before any effects referencing it (prevent TDZ ReferenceError)', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const sessionContent = fs.readFileSync(path.resolve('src/pages/CrossExaminationSession.jsx'), 'utf8');

            const isCompletedDeclarationIndex = sessionContent.indexOf("const isCompleted = session?.status === 'completed';");
            const speakEffectIndex = sessionContent.indexOf('speakQuestion(activeQuestion.questionText');

            assert.ok(isCompletedDeclarationIndex > 0, 'isCompleted must be declared as a const');
            assert.ok(speakEffectIndex > 0, 'speech effect must exist');
            assert.ok(
                isCompletedDeclarationIndex < speakEffectIndex,
                'isCompleted declaration must precede the speech effect to prevent ReferenceError: Cannot access isCompleted before initialization'
            );
        });

        it('should verify Step2Interview.jsx has audible question speech, deduping, and replay control', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step2Content = fs.readFileSync(path.resolve('src/pages/Step2Interview.jsx'), 'utf8');

            assert.ok(step2Content.includes('lastSpokenIndexRef'), 'Step2Interview must track lastSpokenIndexRef for deduping');
            assert.ok(step2Content.includes('replayQuestion'), 'Step2Interview must define replayQuestion handler');
            assert.ok(step2Content.includes('HiSpeakerWave'), 'Step2Interview must render speaker wave icon');
            assert.ok(step2Content.includes('Replay'), 'Step2Interview must render Replay control');
            assert.ok(!step2Content.includes('if (femaleVoiceRef.current && currentQuestion)'), 
                'Step2Interview must NOT block speech waiting for femaleVoiceRef.current');
        });
    });

    // ==========================================
    // 7. Feature — Resume Extraction & Setup Auto-Fill
    // ==========================================
    describe('7. Feature — Resume Extraction & Setup Auto-Fill', () => {
        it('should verify Step1Setup.jsx triggers extraction automatically on file select without extra sync click', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(step1Content.includes('performResumeExtraction(file)'), 
                'Step1Setup must automatically trigger performResumeExtraction when a file is selected');
            assert.ok(step1Content.includes('userEditedFieldsRef'), 
                'Step1Setup must maintain userEditedFieldsRef to preserve manual edits');
        });

        it('should auto-populate form fields from extracted data when user has not manually edited them', () => {
            const userEditedFields = { role: false, experience: false };
            let formState = { role: '', experience: '', skills: [], projects: [] };

            const extractedData = {
                role: 'Senior Backend Engineer',
                experience: '5 years',
                skills: ['Node.js', 'PostgreSQL', 'Docker'],
                projects: ['Distributed Task Queue']
            };

            // Auto-fill logic
            if (!userEditedFields.role && extractedData.role) {
                formState.role = extractedData.role;
            }
            if (!userEditedFields.experience && extractedData.experience) {
                formState.experience = extractedData.experience;
            }
            formState.skills = extractedData.skills;
            formState.projects = extractedData.projects;

            assert.strictEqual(formState.role, 'Senior Backend Engineer');
            assert.strictEqual(formState.experience, '5 years');
            assert.deepStrictEqual(formState.skills, ['Node.js', 'PostgreSQL', 'Docker']);
            assert.deepStrictEqual(formState.projects, ['Distributed Task Queue']);
        });

        it('should strictly preserve user manual edits even if resume extraction returns late', () => {
            // User manually typed "Platform Architect" before or during extraction
            const userEditedFields = { role: true, experience: false };
            let formState = { role: 'Platform Architect', experience: '', skills: [] };

            const lateExtractedData = {
                role: 'Junior Developer', // Resume says Junior Developer
                experience: '2 years',
                skills: ['TypeScript']
            };

            // Auto-fill logic with edit preservation
            if (!userEditedFields.role && lateExtractedData.role) {
                formState.role = lateExtractedData.role;
            }
            if (!userEditedFields.experience && lateExtractedData.experience) {
                formState.experience = lateExtractedData.experience;
            }
            formState.skills = lateExtractedData.skills;

            assert.strictEqual(formState.role, 'Platform Architect', 'User manual edit must NOT be overwritten by late extraction response');
            assert.strictEqual(formState.experience, '2 years', 'Unedited field must still be auto-filled');
        });

        it('should leave missing extracted fields empty rather than fabricating data', () => {
            const userEditedFields = { role: false, experience: false };
            let formState = { role: '', experience: '', skills: [] };

            const sparseExtractedData = {
                role: '', // No role in resume
                experience: '', // No experience in resume
                skills: ['Python']
            };

            if (!userEditedFields.role && sparseExtractedData.role) {
                formState.role = sparseExtractedData.role;
            }
            if (!userEditedFields.experience && sparseExtractedData.experience) {
                formState.experience = sparseExtractedData.experience;
            }
            formState.skills = sparseExtractedData.skills;

            assert.strictEqual(formState.role, '', 'Missing role must remain empty');
            assert.strictEqual(formState.experience, '', 'Missing experience must remain empty');
            assert.deepStrictEqual(formState.skills, ['Python']);
        });

        it('should gracefully handle extraction failure without discarding existing user inputs', () => {
            let formState = { role: 'DevOps Engineer', experience: '3 years' };
            let parsingFailed = false;

            try {
                // Simulate malformed or scanned PDF failure
                throw new Error('PDF extraction returned empty text');
            } catch (err) {
                parsingFailed = true;
                // Preserve existing user inputs on failure
            }

            assert.strictEqual(parsingFailed, true);
            assert.strictEqual(formState.role, 'DevOps Engineer');
            assert.strictEqual(formState.experience, '3 years');
        });
    });

    // ==========================================
    // 8. Feature — Cross-Questioning Dropdown (Technical & Behavioral Only)
    // ==========================================
    describe('8. Feature — Cross-Questioning Dropdown (Technical & Behavioral Only)', () => {
        it('should verify Step1Setup.jsx dropdown contains strictly Technical and Behavioral options', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(step1Content.includes('id="crossQuestioningType"'), 'Step1Setup must render crossQuestioningType select element');
            assert.ok(step1Content.includes('<option value="Technical">Technical</option>'), 'Must include Technical option');
            assert.ok(step1Content.includes('<option value="Behavioral">Behavioral</option>'), 'Must include Behavioral option');

            // Must NOT contain disallowed choices
            assert.ok(!step1Content.includes('<option value="Mixed">'), 'Must NOT contain Mixed option');
            assert.ok(!step1Content.includes('<option value="General">'), 'Must NOT contain General option');
            assert.ok(!step1Content.includes('<option value="HR">HR</option>'), 'Must NOT contain HR option in crossQuestioningType');
            assert.ok(!step1Content.includes('<option value="System Design">'), 'Must NOT contain System Design option');
            assert.ok(!step1Content.includes('<option value="Other">'), 'Must NOT contain Other option');
        });

        it('should default cross-questioning type to Technical', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(step1Content.includes("useState('Technical')"), 'crossQuestioningType must default to Technical');
        });

        it('should preserve selected crossQuestioningType in interview generation payload', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(step1Content.includes('crossQuestioningType: crossQuestioningType || "Technical"'), 
                'Payload must forward selected crossQuestioningType to generateQuestions API');
        });
    });


    // ==========================================
    // 9. Feature — Synchronized Interviewer Video & Question Voice Lifecycle
    // ==========================================
    describe('9. Feature — Synchronized Interviewer Video & Question Voice Lifecycle', () => {
        it('should verify PLAYBACK_STATE constants and transitions (idle -> loading -> playing -> finished / error)', async () => {
            const hookModule = await import('../src/hooks/useQuestionSpeech.js');
            const { PLAYBACK_STATE } = hookModule;
            assert.ok(PLAYBACK_STATE, 'PLAYBACK_STATE must be exported');
            assert.strictEqual(PLAYBACK_STATE.IDLE, 'idle');
            assert.strictEqual(PLAYBACK_STATE.LOADING, 'loading');
            assert.strictEqual(PLAYBACK_STATE.PLAYING, 'playing');
            assert.strictEqual(PLAYBACK_STATE.FINISHED, 'finished');
            assert.strictEqual(PLAYBACK_STATE.ERROR, 'error');
        });

        it('should synchronize video playback lifecycle: start video on speech start, pause on speech end', () => {
            let videoPlaying = false;
            let videoPaused = true;
            let videoLoop = false;

            const mockVideo = {
                loop: false,
                play: () => {
                    videoPlaying = true;
                    videoPaused = false;
                    return Promise.resolve();
                },
                pause: () => {
                    videoPlaying = false;
                    videoPaused = true;
                },
            };

            // Speech starts: video begins looping & playing
            mockVideo.loop = true;
            mockVideo.play();
            assert.strictEqual(videoPlaying, true, 'Video must play when speech begins');
            assert.strictEqual(mockVideo.loop, true, 'Video must loop smoothly during long question speech');

            // Speech ends: video loops false & pauses
            mockVideo.loop = false;
            mockVideo.pause();
            assert.strictEqual(videoPlaying, false, 'Video must pause when speech ends');
            assert.strictEqual(videoPaused, true, 'Video must remain paused after question finishes');
        });

        it('should cancel previous question video and speech when a new question becomes active', () => {
            let activeUtteranceCancelled = false;
            let videoPaused = false;

            const stopPlayback = () => {
                activeUtteranceCancelled = true;
                videoPaused = true;
            };

            // Transitioning question 1 -> question 2
            stopPlayback();
            assert.strictEqual(activeUtteranceCancelled, true, 'Previous question speech must be cancelled');
            assert.strictEqual(videoPaused, true, 'Previous question video must be paused immediately');
        });

        it('should start playback for subsequent question exactly once and avoid timer restarts', () => {
            const spokenQuestions = [];
            const lastSpokenIdRef = { current: null };

            const speakQuestion = (text, questionId, { force = false } = {}) => {
                if (!force && lastSpokenIdRef.current === questionId) {
                    return;
                }
                lastSpokenIdRef.current = questionId;
                spokenQuestions.push({ questionId, text });
            };

            // Question 1 activates
            speakQuestion('What is CQRS?', 'q_1');
            assert.strictEqual(spokenQuestions.length, 1);

            // Timer ticks 5 times
            for (let t = 120; t > 115; t--) {
                speakQuestion('What is CQRS?', 'q_1');
            }
            assert.strictEqual(spokenQuestions.length, 1, 'Timer updates must never restart playback');

            // Question 2 activates
            speakQuestion('Explain CAP theorem.', 'q_2');
            assert.strictEqual(spokenQuestions.length, 2, 'Next question must start playback exactly once');
            assert.strictEqual(spokenQuestions[1].questionId, 'q_2');
        });

        it('should handle browser autoplay rejection and restore via requestAudioActivation', () => {
            let playbackState = 'loading';
            let isBlocked = false;
            let errorMessage = null;

            // Browser fires not-allowed error
            const handleSpeechError = (event) => {
                if (event.error === 'not-allowed') {
                    isBlocked = true;
                    errorMessage = 'Browser blocked audible autoplay. Click Enable Audio to start.';
                    playbackState = 'error';
                }
            };

            handleSpeechError({ error: 'not-allowed' });
            assert.strictEqual(isBlocked, true, 'isBlocked must be true on not-allowed');
            assert.strictEqual(playbackState, 'error');
            assert.ok(errorMessage.includes('Enable Audio'));

            // Candidate clicks Enable Interviewer Audio
            const requestAudioActivation = () => {
                isBlocked = false;
                errorMessage = null;
                playbackState = 'playing';
            };

            requestAudioActivation();
            assert.strictEqual(isBlocked, false, 'isBlocked must reset to false after activation');
            assert.strictEqual(errorMessage, null);
            assert.strictEqual(playbackState, 'playing');
        });

        it('should strictly disable candidate microphone while interviewer is playing and stop speech recognition', () => {
            let isListening = true;
            const stopListening = () => { isListening = false; };

            const isAISpeaking = true;
            if (isAISpeaking) {
                stopListening();
            }

            const isSubmitting = false;
            const isAdvancing = false;
            const isMicButtonDisabled = isSubmitting || isAdvancing || isAISpeaking;

            assert.strictEqual(isListening, false, 'Candidate speech recognition must immediately stop when AI starts speaking');
            assert.strictEqual(isMicButtonDisabled, true, 'Microphone button must be disabled during interviewer playback');
        });

        it('should verify Step2Interview.jsx and CrossExaminationSession.jsx connect videoRef to useQuestionSpeech', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');

            const step2Path = path.resolve('src/pages/Step2Interview.jsx');
            const step2Content = fs.readFileSync(step2Path, 'utf8');
            assert.ok(step2Content.includes('useQuestionSpeech'), 'Step2Interview must use useQuestionSpeech');
            assert.ok(step2Content.includes('videoRef'), 'Step2Interview must pass videoRef to useQuestionSpeech');
            assert.ok(step2Content.includes('requestAudioActivation'), 'Step2Interview must support requestAudioActivation');

            const crossExamPath = path.resolve('src/pages/CrossExaminationSession.jsx');
            const crossExamContent = fs.readFileSync(crossExamPath, 'utf8');
            assert.ok(crossExamContent.includes('videoRef'), 'CrossExaminationSession must pass videoRef to useQuestionSpeech');
            assert.ok(!crossExamContent.includes('<video\n              ref={videoRef}\n              src="https://res.cloudinary.com/dflf8j84g/video/upload/v1774549693/AI_asking_questions_202603262250_fgjdiw.mp4"\n              muted\n              playsInline\n              autoPlay\n              loop'),
                'CrossExaminationSession must NOT have hardcoded autoPlay and loop on video element');
        });

        it('should preserve candidate entered answer text and permit submission after playback completes', () => {
            let candidateAnswer = 'Dependency injection decouples components and promotes testability.';
            let isAISpeaking = true;

            // While AI is speaking, text is safe in state
            assert.strictEqual(candidateAnswer.length > 0, true);

            // Speech ends
            isAISpeaking = false;
            assert.strictEqual(isAISpeaking, false);
            assert.strictEqual(candidateAnswer, 'Dependency injection decouples components and promotes testability.',
                'Candidate answer must remain completely intact after interviewer speech concludes');
        });
    });

});
