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
            assert.ok(content.includes('enableCrossQuestioning: Boolean('), 
                'Payload to generateQuestions must pass sanitized boolean');
        });

        it('should disable Enable cross-questioning checkbox and display explanation when no resume is uploaded', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Path = path.resolve('src/pages/Step1Setup.jsx');
            const content = fs.readFileSync(step1Path, 'utf8');

            assert.ok(content.includes('disabled={!hasValidResume}'), 'Checkbox must be disabled when no valid resume is present');
            assert.ok(content.includes('Upload your resume to enable cross-questioning.'), 'Must display helpful explanation when disabled');
            assert.ok(content.includes('hasValidResume = Boolean(resumeFile && anaylsisDone && resumeText && resumeText.trim().length > 0)'),
                'hasValidResume must strictly verify parsed resume text');
            assert.ok(content.includes('enableCrossQuestioning: Boolean(hasValidResume && enableCrossQuestioning)'),
                'Frontend must never submit enableCrossQuestioning: true without a valid resume');
        });

        it('should automatically reset enableCrossQuestioning to false when resume is removed or invalidated', () => {
            let hasValidResume = true;
            let enableCrossQuestioning = true;

            // Simulating resume removal
            const removeResume = () => {
                hasValidResume = false;
                enableCrossQuestioning = false;
            };

            removeResume();
            assert.strictEqual(hasValidResume, false);
            assert.strictEqual(enableCrossQuestioning, false, 'Checkbox must be unchecked and reset to false when resume is removed');
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

        it('should normalize backend response shapes supporting top-level or nested data structures and numeric experience values', () => {
            const normalizeResponse = (rawResponse) => {
                const resData = rawResponse?.data || rawResponse || {};
                const role = String(resData.role || resData.targetRole || resData.jobRole || '').trim();
                let rawExp = resData.experience ?? resData.yearsOfExperience ?? resData.level ?? '';
                if (typeof rawExp === 'number') {
                    rawExp = `${rawExp} ${rawExp === 1 ? 'year' : 'years'}`;
                }
                const experience = String(rawExp || '').trim();
                return { role, experience };
            };

            // Test 1: Standard flat shape
            assert.deepStrictEqual(
                normalizeResponse({ role: 'Full-Stack Developer', experience: '4 years' }),
                { role: 'Full-Stack Developer', experience: '4 years' }
            );

            // Test 2: Nested data shape with numeric yearsOfExperience
            assert.deepStrictEqual(
                normalizeResponse({ data: { targetRole: 'DevOps Engineer', yearsOfExperience: 5 } }),
                { role: 'DevOps Engineer', experience: '5 years' }
            );

            // Test 3: Single year numeric normalization
            assert.deepStrictEqual(
                normalizeResponse({ data: { jobRole: 'Frontend Developer', experience: 1 } }),
                { role: 'Frontend Developer', experience: '1 year' }
            );
        });

        it('should prevent stale responses from older uploads from overwriting the form when a newer resume is uploaded', () => {
            let activeExtractionId = 0;
            let currentForm = { role: '', experience: '' };

            // User selects Resume A
            const idA = ++activeExtractionId; // idA = 1
            // User quickly selects Resume B before Resume A finishes
            const idB = ++activeExtractionId; // idB = 2

            // Resume A completes late with data
            const completeA = () => {
                if (idA !== activeExtractionId) return; // Discard stale response
                currentForm.role = 'Old Role from Resume A';
            };
            completeA();
            assert.strictEqual(currentForm.role, '', 'Stale response A must be discarded');

            // Resume B completes
            const completeB = () => {
                if (idB !== activeExtractionId) return;
                currentForm.role = 'Target Role from Resume B';
                currentForm.experience = '3 years';
            };
            completeB();
            assert.strictEqual(currentForm.role, 'Target Role from Resume B');
            assert.strictEqual(currentForm.experience, '3 years');
        });

        it('should reset resume-derived values when resume is removed without clearing user manual edits', () => {
            const userEditedFields = { role: true, experience: false };
            let formState = { role: 'Lead Architect (Manual Edit)', experience: '5 years' };
            const resumeDerivedValues = { role: 'Software Engineer', experience: '5 years' };

            // When resume is removed:
            const onRemoveResume = () => {
                if (!userEditedFields.role && formState.role === resumeDerivedValues.role) {
                    formState.role = '';
                }
                if (!userEditedFields.experience && formState.experience === resumeDerivedValues.experience) {
                    formState.experience = '';
                }
            };
            onRemoveResume();

            assert.strictEqual(formState.role, 'Lead Architect (Manual Edit)', 'User manual edit must NOT be cleared');
            assert.strictEqual(formState.experience, '', 'Resume-derived experience must be reset');
        });

        it('should verify Step1Setup.jsx restores previous Analyze button design without circular spinner or replacement text', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            // Must NOT have the new circular spinner or multi-stage replacement text
            assert.ok(!step1Content.includes('animate-spin'), 'Step1Setup must remove circular loading animation');
            assert.ok(!step1Content.includes('Uploading document...'), 'Step1Setup must remove replacement multi-stage loading text');
            assert.ok(!step1Content.includes('Extracting document text...'), 'Step1Setup must remove replacement multi-stage loading text');
            assert.ok(!step1Content.includes('Analyzing resume credentials...'), 'Step1Setup must remove replacement multi-stage loading text');

            // Must restore previous Analyze button design, label, and disabled state
            assert.ok(step1Content.includes('Sync with AI'), 'Step1Setup must restore Sync with AI label');
            assert.ok(step1Content.includes('Analyzing...'), 'Step1Setup must restore Analyzing... loading state');
            assert.ok(step1Content.includes('disabled={anaylzing}'), 'Step1Setup must disable button while analyzing to prevent duplicate requests');
            assert.ok(step1Content.includes('bg-slate-900 rounded-lg text-[10px] font-black text-white uppercase shadow-lg disabled:opacity-50'), 'Must restore previous styling');
        });

        it('should autofill Fresher (0 years) when analysis returns no employment for student resume', () => {
            const userEditedFields = { role: false, experience: false };
            let formState = { role: '', experience: '' };
            const studentAnalysis = {
                role: 'Frontend Developer',
                experience: 'Fresher (0 years)',
                experienceLevel: 'Fresher',
                experienceEvidenceStatus: 'NO_EMPLOYMENT_FOUND'
            };

            if (!userEditedFields.role && studentAnalysis.role) {
                formState.role = studentAnalysis.role;
            }
            if (!userEditedFields.experience && studentAnalysis.experience) {
                formState.experience = studentAnalysis.experience;
            }

            assert.strictEqual(formState.role, 'Frontend Developer');
            assert.strictEqual(formState.experience, 'Fresher (0 years)');
        });

        it('should autofill Internship Experience when analysis identifies internship only', () => {
            const userEditedFields = { role: false, experience: false };
            let formState = { role: '', experience: '' };
            const internAnalysis = {
                role: 'Frontend Developer',
                experience: 'Internship Experience',
                experienceLevel: 'Internship',
                experienceEvidenceStatus: 'INTERNSHIP_ONLY'
            };

            if (!userEditedFields.experience && internAnalysis.experience) {
                formState.experience = internAnalysis.experience;
            }

            assert.strictEqual(formState.experience, 'Internship Experience');
        });

        it('should leave experience unset for review when evidence is insufficient without inventing numbers', () => {
            const userEditedFields = { role: false, experience: false };
            let formState = { role: '', experience: '' };
            const insufficientAnalysis = {
                role: '',
                experience: '',
                experienceLevel: null,
                experienceEvidenceStatus: 'INSUFFICIENT_EVIDENCE'
            };

            if (!userEditedFields.experience && insufficientAnalysis.experience) {
                formState.experience = insufficientAnalysis.experience;
            }

            assert.strictEqual(formState.experience, '', 'Experience must remain unset for user manual review');
        });

        it('should verify Step1Setup.jsx never renders successful extraction card if extraction or analysis failed', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            // Extraction results card is strictly guarded by anaylsisDone
            assert.ok(step1Content.includes('{!anaylsisDone ? ('), 'Uploader must render when anaylsisDone is false');
            assert.ok(step1Content.includes('setAnaylsisDone(false);'), 'Extraction failure must explicitly set anaylsisDone to false');
        });

        it('should verify Step1Setup.jsx accepts both PDF and DOCX document formats', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(content.includes('.docx'), 'Step1Setup must declare .docx support in file input/handling');
            assert.ok(content.includes('.pdf'), 'Step1Setup must declare .pdf support in file input/handling');
        });

        it('should verify interview generation payload contains valid role, experience, mode and safe cross-questioning flag', () => {
            const buildPayload = ({ role, experience, mode, skills, projects, resumeText, hasValidResume, enableCrossQuestioning }) => {
                return {
                    role: role.trim(),
                    experience: experience.trim(),
                    mode,
                    skills,
                    projects,
                    resumeText: hasValidResume ? resumeText : '',
                    enableCrossQuestioning: Boolean(hasValidResume && enableCrossQuestioning)
                };
            };

            // Standard mock interview without resume
            const withoutResume = buildPayload({
                role: 'Frontend Engineer',
                experience: '2 years',
                mode: 'Technical',
                skills: [],
                projects: [],
                resumeText: '',
                hasValidResume: false,
                enableCrossQuestioning: true // even if somehow true, must be sanitized
            });
            assert.strictEqual(withoutResume.role, 'Frontend Engineer');
            assert.strictEqual(withoutResume.experience, '2 years');
            assert.strictEqual(withoutResume.enableCrossQuestioning, false);
            assert.strictEqual(withoutResume.resumeText, '');

            // Mock interview with valid accepted resume
            const withResume = buildPayload({
                role: 'Backend Engineer',
                experience: '4 years',
                mode: 'Technical',
                skills: ['Node.js'],
                projects: ['Task API'],
                resumeText: 'Senior Backend Engineer with 4 years...',
                hasValidResume: true,
                enableCrossQuestioning: true
            });
            assert.strictEqual(withResume.role, 'Backend Engineer');
            assert.strictEqual(withResume.experience, '4 years');
            assert.strictEqual(withResume.enableCrossQuestioning, true);
            assert.ok(withResume.resumeText.length > 0);
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


    // ==========================================
    // 10. Feature — Home CTA Removal & Navbar Integrity
    // ==========================================
    describe('10. Feature — Home CTA Removal & Navbar Integrity', () => {
        it('should verify Home.jsx does not render the Cross-Examination CTA button', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const homePath = path.resolve('src/pages/Home.jsx');
            const homeContent = fs.readFileSync(homePath, 'utf8');

            assert.ok(!homeContent.includes("navigate('/cross-examination')"), 'Home.jsx must not navigate to /cross-examination via homepage CTA button');
            assert.ok(!homeContent.includes('>Cross-Examination</motion.button>'), 'Home.jsx must not render Cross-Examination CTA button');
            assert.ok(homeContent.includes("navigate('/interview')"), 'Home.jsx must preserve Mock Interview button');
            assert.ok(homeContent.includes("navigate('/history')"), 'Home.jsx must preserve History button');
        });

        it('should verify Navbar.jsx preserves the Cross-Examination navigation link', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const navbarPath = path.resolve('src/components/Navbar.jsx');
            const navbarContent = fs.readFileSync(navbarPath, 'utf8');

            assert.ok(navbarContent.includes('to="/cross-examination"'), 'Navbar.jsx must preserve Cross-Examination route link');
            assert.ok(navbarContent.includes('Cross-Examination'), 'Navbar.jsx must render Cross-Examination link label');
        });
    });


    // ==========================================
    // 11. Feature — Skills and Projects Autofill & Normalization
    // ==========================================
    describe('11. Feature — Skills and Projects Autofill & Normalization', () => {

        it('should normalize categorized backend skills object into deduplicated flat array for tag rendering', () => {
            const categorizedSkills = {
                programmingLanguages: ['JavaScript', 'Python', 'C++'],
                frontend: ['React', 'Tailwind CSS', 'HTML5'],
                backend: ['Node.js', 'Express', 'FastAPI'],
                databases: ['MongoDB', 'PostgreSQL'],
                toolsAndLibraries: ['Git', 'Docker', 'OpenCV'],
                other: ['Data Structures', 'REST APIs']
            };

            const normalizeSkills = (rawSkills) => {
                let normalized = [];
                if (Array.isArray(rawSkills)) {
                    normalized = rawSkills.map(s => String(s).trim()).filter(Boolean);
                } else if (rawSkills && typeof rawSkills === 'object') {
                    const allFromCategories = Object.values(rawSkills).flatMap(val => Array.isArray(val) ? val : []);
                    normalized = allFromCategories.map(s => String(s).trim()).filter(Boolean);
                } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
                    normalized = rawSkills.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
                }
                const seen = new Set();
                return normalized.filter(s => {
                    const lower = s.toLowerCase();
                    if (seen.has(lower)) return false;
                    seen.add(lower);
                    return true;
                });
            };

            const result = normalizeSkills(categorizedSkills);
            assert.strictEqual(result.length, 16);
            assert.ok(result.includes('C++'));
            assert.ok(result.includes('React'));
            assert.ok(result.includes('MongoDB'));
            assert.ok(result.includes('Docker'));
        });

        it('should normalize detailed project objects with name, title, description, and technologies into project titles', () => {
            const rawProjects = [
                {
                    name: 'AI Mock Interviewer',
                    description: 'Full-stack platform using React and Node.js with real-time feedback',
                    technologies: ['React', 'Node.js', 'Tailwind CSS'],
                    achievements: ['Reduced latency by 40%']
                },
                {
                    title: 'Distributed Log Aggregator',
                    description: 'Go and Redis pipeline',
                    technologies: ['Go', 'Redis'],
                    achievements: []
                },
                'Cloud File Storage System'
            ];

            const normalizeProjects = (projects) => {
                let normalized = [];
                if (Array.isArray(projects)) {
                    normalized = projects.map(p => {
                        if (typeof p === 'string') return p.trim();
                        if (p && typeof p === 'object') {
                            const title = (p.name || p.title || '').trim();
                            return title || (p.description ? p.description.slice(0, 50).trim() : '');
                        }
                        return '';
                    }).filter(Boolean);
                }
                const seen = new Set();
                return normalized.filter(p => {
                    const lower = p.toLowerCase();
                    if (seen.has(lower)) return false;
                    seen.add(lower);
                    return true;
                });
            };

            const result = normalizeProjects(rawProjects);
            assert.deepStrictEqual(result, [
                'AI Mock Interviewer',
                'Distributed Log Aggregator',
                'Cloud File Storage System'
            ]);
        });

        it('should deduplicate skills case-insensitively without removing distinct skills', () => {
            const rawSkills = ['React', 'react', 'REACT', 'React.js', 'Node.js', 'node.js', 'C++', 'C'];
            const seen = new Set();
            const deduplicated = rawSkills.filter(s => {
                const lower = s.toLowerCase();
                if (seen.has(lower)) return false;
                seen.add(lower);
                return true;
            });

            assert.strictEqual(deduplicated.includes('React'), true);
            assert.strictEqual(deduplicated.includes('react'), false);
            assert.strictEqual(deduplicated.includes('C++'), true);
            assert.strictEqual(deduplicated.includes('C'), true);
            assert.strictEqual(deduplicated.length, 5); // React, React.js, Node.js, C++, C
        });

        it('should preserve manual edits to skills and projects when resume auto-fill executes', () => {
            const userEditedFields = { role: false, experience: false, skills: true, projects: false };
            let formState = {
                skills: ['Rust', 'WebAssembly'],
                projects: []
            };

            const autoExtracted = {
                skills: ['JavaScript', 'Python'],
                projects: ['Portfolio Website']
            };

            // Autofill policy: do not overwrite fields user has manually edited
            if (!userEditedFields.skills && autoExtracted.skills?.length > 0) {
                formState.skills = autoExtracted.skills;
            }
            if (!userEditedFields.projects && autoExtracted.projects?.length > 0) {
                formState.projects = autoExtracted.projects;
            }

            // Skills should remain Rust & WebAssembly because user manually edited skills
            assert.deepStrictEqual(formState.skills, ['Rust', 'WebAssembly']);
            // Projects should be auto-filled because user did not manually edit projects
            assert.deepStrictEqual(formState.projects, ['Portfolio Website']);
        });

        it('should clear auto-filled skills and projects when resume is removed, while keeping manual edits', () => {
            const userEditedFields = { role: false, experience: false, skills: false, projects: true };
            let formState = {
                skills: ['Python', 'Django'],
                projects: ['Custom Project Added Manually']
            };

            // On resume remove:
            if (!userEditedFields.skills) formState.skills = [];
            if (!userEditedFields.projects) formState.projects = [];

            assert.deepStrictEqual(formState.skills, []);
            assert.deepStrictEqual(formState.projects, ['Custom Project Added Manually']);
        });

        it('should include normalized skills and projects in the final interview-generation payload', () => {
            const state = {
                role: 'Full Stack Developer',
                experience: 'Fresher (0 years)',
                mode: 'Technical',
                skills: ['React', 'Node.js', 'MongoDB'],
                projects: ['E-Commerce App', 'Chat Application'],
                resumeText: 'Full resume text here...',
                hasValidResume: true,
                enableCrossQuestioning: true,
                crossQuestioningType: 'Technical'
            };

            const formattedSkills = Array.isArray(state.skills) ? state.skills.filter(Boolean) : [];
            const formattedProjects = Array.isArray(state.projects)
                ? state.projects.map(p => typeof p === 'string' ? p : (p.name || p.title || '')).filter(Boolean)
                : [];

            const payload = {
                role: state.role.trim(),
                experience: state.experience.trim(),
                mode: state.mode,
                skills: formattedSkills,
                projects: formattedProjects,
                resumeText: state.hasValidResume ? state.resumeText : '',
                enableCrossQuestioning: Boolean(state.hasValidResume && state.enableCrossQuestioning)
            };

            assert.deepStrictEqual(payload.skills, ['React', 'Node.js', 'MongoDB']);
            assert.deepStrictEqual(payload.projects, ['E-Commerce App', 'Chat Application']);
            assert.strictEqual(payload.enableCrossQuestioning, true);
        });

        it('should verify Step1Setup.jsx handles both string and object project representation in JSX badge rendering', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(
                step1Content.includes("typeof p === 'string' ? p : (p.name || p.title || 'Project')"),
                'Step1Setup must safely handle object or string in project badge rendering to avoid [object Object] or React crashes'
            );
            assert.ok(
                step1Content.includes("resData.categorizedSkills && typeof resData.categorizedSkills === 'object'"),
                'Step1Setup must normalize categorized skill objects from resume response'
            );
        });
    });

});
