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
import { DEFAULT_QUESTION_DURATION, formatTimeMMSS } from '../utils/interviewTimer';

function Step2Interview({ interviewData, onFinish }) {
    const videoRef = useRef(null);
    const lastSpokenIndexRef = useRef(-1);

    const { interviewId, questions: initialQuestions = [], userName, mode } = interviewData;

    const [questionsList, setQuestionsList] = useState(initialQuestions);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    // Configurable duration per question with fallback to centralized DEFAULT_QUESTION_DURATION (120s)
    const initialDuration = initialQuestions[0]?.timeLimit || DEFAULT_QUESTION_DURATION;
    const [timeLeft, setTimeLeft] = useState(initialDuration);
    const [totalQuestionTime, setTotalQuestionTime] = useState(initialDuration);

    // Overall interview session elapsed time
    const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

    const currentQuestion = questionsList[currentIndex];

    // Speech-to-text integration: appends to typed text, handles errors and permissions cleanly
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

    // Ensure candidate microphone does not transcribe interviewer audio while AI is speaking
    useEffect(() => {
        if (isAIPlaying) {
            stopListening();
        }
    }, [isAIPlaying, stopListening]);

    // Universal Cleanup on unmount
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

    // Sequence Workflow: Automatically starts question speech and synchronized video on index change
    useEffect(() => {
        if (currentQuestion && lastSpokenIndexRef.current !== currentIndex && !isFinished) {
            lastSpokenIndexRef.current = currentIndex;
            const qPrompt = currentIndex === 0
                ? `Hello ${userName || 'Candidate'}. I am your AI interviewer. Let's begin. Question 1: ${currentQuestion.question}`
                : currentQuestion.question;
            speakQuestion(qPrompt, currentQuestion._id || `step2-q-${currentIndex}`);
        }
    }, [currentIndex, currentQuestion, userName, isFinished, speakQuestion]);

    // Question Countdown Timer Logic (NO auto-submit on expiration)
    useEffect(() => {
        if (isAIPlaying || isSubmitting || isFinished) return;
        if (timeLeft <= 0) return; // Expired, pause at 0, candidate still decides when to submit

        const timer = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft, isAIPlaying, isSubmitting, isFinished]);

    // Overall Session Elapsed Time Timer
    useEffect(() => {
        if (isFinished) return;

        const interval = setInterval(() => {
            setSessionElapsedSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isFinished]);

    // Finish and Submit Handlers
    const finishInterview = async () => {
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
    };

    const handleSubmit = async () => {
        if (isSubmitting || isAIPlaying) return;
        stopListening();
        cancelSpeech();
        setIsSubmitting(true);
        const loadToast = toast.loading("Evaluating your response...");

        const timeSpent = Math.max(0, totalQuestionTime - timeLeft);

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/submitAnswer', {
                interviewId,
                answer: answer.trim(),
                questionIndex: currentIndex,
                timeTaken: timeSpent,
            }, { withCredentials: true });

            toast.success("Answer Recorded", { id: loadToast });
            setFeedback(result.data.feedback || '');

            // If adaptive cross-questioning inserted a follow-up, adopt updated questions list
            let nextQuestions = questionsList;
            if (Array.isArray(result.data.questions) && result.data.questions.length > 0) {
                nextQuestions = result.data.questions;
                setQuestionsList(nextQuestions);
            }

            if (currentIndex < nextQuestions.length - 1) {
                const nextIdx = currentIndex + 1;
                const nextQ = nextQuestions[nextIdx];
                const nextDuration = nextQ?.timeLimit || DEFAULT_QUESTION_DURATION;

                setCurrentIndex(nextIdx);
                setAnswer('');
                syncBaseText('');
                setTimeLeft(nextDuration);
                setTotalQuestionTime(nextDuration);
                setFeedback('');
            } else {
                await finishInterview();
            }
        } catch (error) {
            toast.error("Failed to submit answer. Please try again.", { id: loadToast });
            console.error("submitAnswer error:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isExpired = timeLeft <= 0;

    return (
        <div className='h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 md:p-6 font-poppins overflow-hidden'>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white flex flex-col lg:flex-row overflow-hidden'
            >
                {/* Left Column: AI Avatar, Timers & Progress */}
                <div className='w-full lg:w-[32%] bg-slate-900 flex flex-col items-center p-5 md:p-6 space-y-4 relative shrink-0' >
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
                    <div className='w-full flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col justify-between relative z-10' >
                        <div className='space-y-2'>
                            <div className='flex justify-between items-center text-slate-300'>
                                <span className='text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5'>
                                    <RiTimeLine className="text-yellow-400 text-sm" /> Session Elapsed
                                </span>
                                <span className='text-xs font-mono font-black text-yellow-400 tracking-wider'>
                                    {formatTimeMMSS(sessionElapsedSeconds)}
                                </span>
                            </div>
                            <div className='h-px bg-white/10' />
                        </div>

                        {/* Visible Question Countdown Timer */}
                        <div className='flex justify-center py-2'>
                            <Timer timeLeft={timeLeft} totalTime={totalQuestionTime} />
                        </div>

                        {/* Question Progression Counter */}
                        <div className='grid grid-cols-2 gap-2.5'>
                            <div className='bg-white/5 rounded-xl p-2 text-center border border-white/5'>
                                <p className='text-base font-black text-white'>{currentIndex + 1}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-400'>Question</p>
                            </div>
                            <div className='bg-white/5 rounded-xl p-2 text-center border border-white/5'>
                                <p className='text-base font-black text-slate-300'>{questionsList.length}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-400'>Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Question Content, Speech Input & Editor */}
                <div className='flex-1 flex flex-col p-6 md:p-8 bg-white relative overflow-hidden' >
                    <div className='mb-3 shrink-0 flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <div className='inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-yellow-400 rounded-lg text-[9px] font-black uppercase tracking-widest'>
                                <HiCheckBadge /> {mode} Assessment
                            </div>
                            {currentQuestion?.isFollowUp && (
                                <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg shadow-xs'>
                                    <RiQuestionAnswerLine /> Follow-up Probe
                                </span>
                            )}
                        </div>
                        <span className='text-xs font-mono font-bold text-slate-400'>
                            {currentIndex + 1} / {questionsList.length}
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
                                placeholder='Type your response or click the microphone to speak. You can edit your text anytime before submitting...'
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

                            {/* Expired state informational note (does NOT auto-submit or wipe text) */}
                            {isExpired && (
                                <div className='mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between'>
                                    <span>Time has expired for this question. You may review and submit your response whenever you are ready.</span>
                                </div>
                            )}

                            <p className='text-[10px] text-slate-400 mt-1.5 flex items-center justify-between'>
                                <span>Voice input appends speech to your typed answer. Private and browser-native.</span>
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
                                onClick={handleSubmit}
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
