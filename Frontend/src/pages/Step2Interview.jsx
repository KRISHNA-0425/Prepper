import React, { useEffect, useState, useRef, useCallback } from 'react';
import Timer from '../components/Timer';
import { motion } from 'framer-motion';
import { HiMicrophone, HiCheckBadge, HiArrowRight, HiSpeakerWave } from "react-icons/hi2";
import { RiTimeLine, RiQuestionAnswerLine } from "react-icons/ri";
import toast from 'react-hot-toast';
import { backendServerUrl } from '../App';
import axios from 'axios';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import useQuestionSpeech from '../hooks/useQuestionSpeech';
import { formatTimeMMSS } from '../utils/interviewTimer';

function Step2Interview({ interviewData, onFinish }) {
    const videoRef = useRef(null);
    const lastSpokenIndexRef = useRef(-1);

    const {
        interviewId,
        questions: initialQuestions = [],
        userName,
        mode,
        interviewMode = 'question_based',
        selectedDurationMinutes = null,
        targetQuestionCount = initialQuestions.length || 10,
        expiresAt = null,
        currentQuestionDeadline = null,
        currentQuestionIndex = 0,
        startedAt = null,
    } = interviewData;

    const [questionsList, setQuestionsList] = useState(initialQuestions);
    const [currentIndex, setCurrentIndex] = useState(() => {
        const serverIdx = Number(interviewData?.currentQuestionIndex || currentQuestionIndex || 0);
        return Math.max(0, Math.min(initialQuestions.length > 0 ? initialQuestions.length - 1 : 0, serverIdx));
    });
    const [answer, setAnswer] = useState('');
    const [, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(false);
    const [isFinished, setIsFinished] = useState(false);

    // Synchronized question speech and video controller
    const {
        isSpeaking: isAIPlaying,
        isBlocked: isAudioBlocked,
        hasActivated,
        speakQuestion,
        replayQuestion: triggerReplayQuestion,
        cancelSpeech,
        requestAudioActivation,
    } = useQuestionSpeech({
        videoRef,
    });

    // Strict 60-Second Question Duration with server-side deadline synchronization
    const computeInitialQuestionTimeLeft = useCallback(() => {
        if (currentQuestionDeadline) {
            const remaining = Math.floor((new Date(currentQuestionDeadline).getTime() - Date.now()) / 1000);
            return Math.max(0, Math.min(60, remaining));
        }
        return 60;
    }, [currentQuestionDeadline]);

    const [timeLeft, setTimeLeft] = useState(computeInitialQuestionTimeLeft);
    const [totalQuestionTime, setTotalQuestionTime] = useState(60);

    // Overall session elapsed time restored from server startedAt timestamp
    const computeInitialElapsed = useCallback(() => {
        const startTime = startedAt || interviewData?.startedAt;
        if (startTime) {
            const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
            return Math.max(0, elapsed);
        }
        return 0;
    }, [startedAt, interviewData?.startedAt]);

    const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(computeInitialElapsed);

    // Overall session countdown for Time-Based Mode
    const computeSessionTimeLeft = useCallback(() => {
        if (interviewMode !== 'time_based' || !expiresAt) return null;
        const remaining = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
        return Math.max(0, remaining);
    }, [interviewMode, expiresAt]);

    const [sessionTimeLeft, setSessionTimeLeft] = useState(computeSessionTimeLeft);

    const currentQuestion = questionsList[currentIndex];

    // Speech-to-text integration
    const handleTranscriptChange = useCallback((newTranscript) => {
        setAnswer(newTranscript);
    }, []);

    const {
        isListening,
        stopListening,
        toggleListening,
        syncBaseText,
    } = useSpeechRecognition({
        onTranscriptChange: handleTranscriptChange,
        currentAnswer: answer,
    });

    // Keep answerRef synchronized for timeout auto-submit
    const answerRef = useRef(answer);
    useEffect(() => {
        answerRef.current = answer;
    }, [answer]);

    // Ensure microphone stops while AI speaks
    useEffect(() => {
        if (isAIPlaying) {
            stopListening();
        }
    }, [isAIPlaying, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopListening();
            cancelSpeech();
        };
    }, [stopListening, cancelSpeech]);

    // Replay active question audio
    const replayQuestion = () => {
        if (currentQuestion && currentQuestion.question) {
            triggerReplayQuestion(currentQuestion.question, currentQuestion._id || `step2-q-${currentIndex}`);
        }
    };

    // Auto-speak question on index change
    useEffect(() => {
        if (currentQuestion && lastSpokenIndexRef.current !== currentIndex && !isFinished) {
            lastSpokenIndexRef.current = currentIndex;
            const qPrompt = currentIndex === 0
                ? `Hello ${userName || 'Candidate'}. I am your AI interviewer. Let's begin. Question 1: ${currentQuestion.question}`
                : currentQuestion.question;
            speakQuestion(qPrompt, currentQuestion._id || `step2-q-${currentIndex}`);
        }
    }, [currentIndex, currentQuestion, userName, isFinished, speakQuestion]);

    // Finish Interview Handler
    const finishInterview = useCallback(async () => {
        stopListening();
        cancelSpeech();
        setIsSubmitting(true);
        setIsFinished(true);
        const loadToast = toast.loading("Generating comprehensive assessment report...");

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/finish',
                { interviewId },
                { withCredentials: true }
            );

            toast.success("Interview Complete!", { id: loadToast });

            if (onFinish) {
                onFinish(result.data);
            }
        } catch (error) {
            toast.error("Error finalizing results", { id: loadToast });
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    }, [cancelSpeech, interviewId, onFinish, stopListening]);

    // Overall Session Countdown for Time-Based Mode
    useEffect(() => {
        if (interviewMode !== 'time_based' || isFinished) return;

        const interval = setInterval(() => {
            const remaining = computeSessionTimeLeft();
            setSessionTimeLeft(remaining);
            if (remaining !== null && remaining <= 0) {
                clearInterval(interval);
                toast("Overall session duration expired. Finalizing interview...", { icon: '⏱️' });
                finishInterview();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [interviewMode, computeSessionTimeLeft, isFinished, finishInterview]);

    // Overall Session Elapsed Time Timer
    useEffect(() => {
        if (isFinished) return;

        const interval = setInterval(() => {
            setSessionElapsedSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isFinished]);

    // Submit Answer Handler
    const handleSubmit = async (overrideAnswer = null) => {
        if (isSubmittingRef.current || isSubmitting || isAIPlaying) return;
        isSubmittingRef.current = true;
        stopListening();
        cancelSpeech();
        setIsSubmitting(true);
        const loadToast = toast.loading("Evaluating your response...");

        const currentAnswerText = typeof overrideAnswer === 'string' ? overrideAnswer : answer;
        const timeSpent = Math.max(0, totalQuestionTime - timeLeft);

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/submitAnswer', {
                interviewId,
                answer: currentAnswerText.trim(),
                questionIndex: currentIndex,
                timeTaken: timeSpent,
            }, { withCredentials: true });

            toast.success("Answer Recorded", { id: loadToast });
            setFeedback(result.data.feedback || '');

            let nextQuestions = questionsList;
            if (Array.isArray(result.data.questions) && result.data.questions.length > 0) {
                nextQuestions = result.data.questions;
                setQuestionsList(nextQuestions);
            }

            const targetAllocation = targetQuestionCount || nextQuestions.length;
            const nextIdx = typeof result.data.currentQuestionIndex === 'number'
                ? result.data.currentQuestionIndex
                : currentIndex + 1;

            const isAllocationExhausted = Boolean(
                result.data.isAllocationExhausted ||
                (nextQuestions.length >= targetAllocation && nextIdx >= nextQuestions.length)
            );
            const isSessionOver = Boolean(
                result.data.isSessionExpired ||
                (interviewMode === 'time_based' && sessionTimeLeft !== null && sessionTimeLeft <= 0)
            );

            if (isAllocationExhausted || isSessionOver || nextIdx >= nextQuestions.length) {
                await finishInterview();
            } else {
                setCurrentIndex(nextIdx);
                setAnswer('');
                syncBaseText('');

                // Synchronize next question timer with server deadline
                if (result.data.currentQuestionDeadline) {
                    const remaining = Math.floor((new Date(result.data.currentQuestionDeadline).getTime() - Date.now()) / 1000);
                    setTimeLeft(Math.max(0, Math.min(60, remaining)));
                } else {
                    setTimeLeft(60);
                }
                setTotalQuestionTime(60);
                setFeedback('');
            }
        } catch (error) {
            const errStatus = error.response?.status;
            const errMsg = error.response?.data?.message || "Failed to submit answer. Please try again.";

            // If conflict due to already advanced question index, resync
            if (errStatus === 409 && typeof error.response?.data?.currentQuestionIndex === 'number') {
                setCurrentIndex(error.response.data.currentQuestionIndex);
                toast.error("Session re-synchronized: " + errMsg, { id: loadToast });
            } else if (errStatus === 410) {
                toast.error("Session expired. Finalizing...", { id: loadToast });
                await finishInterview();
            } else {
                toast.error(errMsg, { id: loadToast });
            }
            console.error("submitAnswer error:", error);
        } finally {
            isSubmittingRef.current = false;
            setIsSubmitting(false);
        }
    };

    // Strict 60-Second Question Countdown Timer with Auto-Submit on Expiration
    const autoSubmittedRef = useRef(false);

    useEffect(() => {
        if (isAIPlaying || isSubmitting || isFinished) return;

        if (timeLeft <= 0) {
            if (!autoSubmittedRef.current) {
                autoSubmittedRef.current = true;
                toast("Time expired for this question. Auto-submitting response...", { icon: '⏱️' });
                handleSubmit(answerRef.current);
            }
            return;
        }

        autoSubmittedRef.current = false;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isAIPlaying, isSubmitting, isFinished]);

    return (
        <div className='h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 md:p-6 font-poppins overflow-hidden'>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white flex flex-col lg:flex-row overflow-hidden'
            >
                {/* Left Column: AI Presenter, Timers & Progress */}
                <div className='w-full lg:w-[32%] bg-slate-900 flex flex-col items-center p-5 md:p-6 space-y-4 relative shrink-0'>
                    <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-yellow-400/10 blur-3xl pointer-events-none' />

                    {/* AI Video Presenter */}
                    <motion.div className='w-full aspect-video lg:aspect-square max-h-52 lg:max-h-none rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-800 relative z-10'>
                        <video
                            ref={videoRef}
                            src='https://res.cloudinary.com/dflf8j84g/video/upload/v1774549693/AI_asking_questions_202603262250_fgjdiw.mp4'
                            muted
                            playsInline
                            className={`w-full h-full object-cover transition-opacity duration-500 ${isAIPlaying ? 'opacity-100' : 'opacity-60'}`}
                        />
                        <div className='absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10'>
                            <div className={`w-2 h-2 rounded-full ${isAIPlaying ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
                            <span className='text-[9px] font-bold text-white uppercase tracking-wider'>
                                {isAIPlaying ? 'AI Speaking' : 'Candidate Turn'}
                            </span>
                        </div>

                        {/* Autoplay blocked recovery button */}
                        {(isAudioBlocked || (!hasActivated && currentIndex === 0)) && (
                            <button
                                type="button"
                                id="enableAudioButton"
                                onClick={() => requestAudioActivation(currentQuestion?.question, currentQuestion?._id || `step2-q-${currentIndex}`)}
                                className="absolute bottom-3 right-3 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all z-20 cursor-pointer"
                                title="Browser blocked audio. Click to enable interviewer voice."
                            >
                                <HiSpeakerWave className="text-xs" /> Enable Audio
                            </button>
                        )}
                    </motion.div>

                    {/* Timer & Session Status Panel */}
                    <div className='w-full flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col justify-between relative z-10'>
                        <div className='space-y-2'>
                            {interviewMode === 'time_based' ? (
                                <div className='flex justify-between items-center text-slate-300'>
                                    <span className='text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5'>
                                        <RiTimeLine className="text-yellow-400 text-sm" /> Session Time Left
                                    </span>
                                    <span className='text-xs font-mono font-black text-yellow-400 tracking-wider'>
                                        {formatTimeMMSS(sessionTimeLeft ?? (selectedDurationMinutes ? selectedDurationMinutes * 60 : 1800))}
                                    </span>
                                </div>
                            ) : (
                                <div className='flex justify-between items-center text-slate-300'>
                                    <span className='text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5'>
                                        <RiTimeLine className="text-yellow-400 text-sm" /> Session Elapsed
                                    </span>
                                    <span className='text-xs font-mono font-black text-yellow-400 tracking-wider'>
                                        {formatTimeMMSS(sessionElapsedSeconds)}
                                    </span>
                                </div>
                            )}
                            <div className='h-px bg-white/10' />
                        </div>

                        {/* Visible 60-Second Question Countdown Timer */}
                        <div className='flex flex-col items-center py-2 space-y-1'>
                            <Timer timeLeft={timeLeft} totalTime={totalQuestionTime} />
                            <span className='text-[8px] font-black uppercase tracking-widest text-slate-400'>
                                60s Answer Timer (Auto-Submits)
                            </span>
                        </div>

                        {/* Question Progression Counter */}
                        <div className='grid grid-cols-2 gap-2.5'>
                            <div className='bg-white/5 rounded-xl p-2 text-center border border-white/5'>
                                <p className='text-base font-black text-white'>{currentIndex + 1}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-400'>Question</p>
                            </div>
                            <div className='bg-white/5 rounded-xl p-2 text-center border border-white/5'>
                                <p className='text-base font-black text-slate-300'>{targetQuestionCount || questionsList.length}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-400'>Target Qs</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Question Content, Speech Input & Editor */}
                <div className='flex-1 flex flex-col p-6 md:p-8 bg-white relative overflow-hidden'>
                    <div className='mb-3 shrink-0 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-yellow-400 rounded-lg text-[9px] font-black uppercase tracking-widest'>
                                <HiCheckBadge /> {mode} • {interviewMode === 'time_based' ? 'Time-Based' : 'Question-Based'}
                            </div>
                            <span className='text-[8px] font-black uppercase tracking-wider px-2 py-0.5 bg-yellow-400/20 text-yellow-800 rounded-md border border-yellow-400/30'>
                                Medium
                            </span>
                            {currentQuestion?.isFollowUp && (
                                <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg shadow-xs'>
                                    <RiQuestionAnswerLine /> Follow-up Probe
                                </span>
                            )}
                        </div>
                        <span className='text-xs font-mono font-bold text-slate-400'>
                            {currentIndex + 1} / {targetQuestionCount || questionsList.length}
                        </span>
                    </div>

                    {/* Active Question Display */}
                    <div className='mb-4 shrink-0'>
                        <div className='flex items-center justify-between mb-1'>
                            <p className='text-slate-400 font-bold text-[9px] uppercase tracking-widest'>
                                Question {currentIndex + 1}
                            </p>
                            <div className='flex items-center gap-2'>
                                {isAudioBlocked ? (
                                    <button
                                        type="button"
                                        onClick={() => requestAudioActivation(currentQuestion?.question, currentQuestion?._id || `step2-q-${currentIndex}`)}
                                        className='inline-flex items-center gap-1 px-2.5 py-0.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm transition-all'
                                    >
                                        <HiSpeakerWave className='text-xs' /> Enable Audio
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        id="replayQuestionVoiceButton"
                                        onClick={replayQuestion}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all border ${
                                            isAIPlaying
                                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300 animate-pulse'
                                                : 'bg-slate-100 hover:bg-yellow-400 hover:text-slate-950 text-slate-600 border-slate-200'
                                        }`}
                                        title={isAIPlaying ? "AI Interviewer is speaking..." : "Replay question audio"}
                                    >
                                        <HiSpeakerWave className={`text-xs ${isAIPlaying ? 'animate-bounce' : ''}`} />
                                        <span>{isAIPlaying ? 'Speaking...' : 'Replay'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className='text-base md:text-lg font-bold text-slate-800 leading-snug border-l-4 border-yellow-400 pl-4 py-0.5'>
                            {currentQuestion?.question}
                        </div>
                    </div>

                    {/* Answer Editor & Speech-to-Text */}
                    <div className='flex-1 flex flex-col min-h-0'>
                        <div className='relative flex-1 min-h-0 flex flex-col'>
                            <textarea
                                id="candidateAnswerInput"
                                value={answer}
                                onChange={(e) => {
                                    setAnswer(e.target.value);
                                    syncBaseText(e.target.value);
                                }}
                                placeholder='Type your response or click the microphone to speak. Answer will auto-submit when the 60s timer expires...'
                                aria-label="Candidate answer input"
                                className='w-full flex-1 bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 outline-none focus:border-yellow-400 focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-400 resize-none shadow-inner text-sm leading-relaxed'
                            />

                            {/* Active Recording State Banner */}
                            {isListening && (
                                <div className='absolute top-3 right-4 flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-full shadow-sm'>
                                    <span className='w-2 h-2 bg-red-500 rounded-full animate-ping' />
                                    <span className='text-[9px] font-black text-red-600 uppercase tracking-widest'>
                                        Listening...
                                    </span>
                                </div>
                            )}

                            <p className='text-[10px] text-slate-400 mt-1.5 flex items-center justify-between'>
                                <span>Strict 60-second limit. Auto-submits on timeout.</span>
                                <span>{answer.trim().length} characters</span>
                            </p>
                        </div>

                        {/* Actions Bar */}
                        <div className='flex items-center gap-3 mt-4 shrink-0'>
                            {/* Microphone Toggle Button */}
                            <motion.button
                                type="button"
                                onClick={toggleListening}
                                disabled={isSubmitting || isAIPlaying}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                aria-label={isListening ? "Stop voice input" : "Start voice input"}
                                title={isAIPlaying ? "Microphone disabled while AI is speaking" : isListening ? "Stop voice recording" : "Click to speak your answer"}
                                className={`w-14 h-14 flex items-center justify-center rounded-2xl shadow-lg shrink-0 transition-all ${
                                    isListening 
                                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
                                        : 'bg-slate-900 text-yellow-400 hover:bg-slate-800'
                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                <HiMicrophone size={22} className={isListening ? 'animate-bounce' : ''} />
                            </motion.button>

                            {/* Submit Answer Button */}
                            <motion.button
                                type="button"
                                onClick={() => handleSubmit()}
                                disabled={isSubmitting || isAIPlaying}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.98 }}
                                className='flex-1 bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl hover:shadow-yellow-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                {isSubmitting ? 'Evaluating...' : currentIndex < questionsList.length - 1 ? 'Submit & Next' : 'Submit & Finish'}
                                <HiArrowRight size={16} className='text-yellow-400' />
                            </motion.button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default Step2Interview;
