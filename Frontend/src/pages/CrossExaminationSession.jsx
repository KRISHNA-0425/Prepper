import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineExclamationCircle,
  HiOutlineStop,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { HiCheckBadge, HiSpeakerWave } from 'react-icons/hi2';
import { RiLoader4Line, RiTimeLine } from 'react-icons/ri';
import Timer from '../components/Timer';
import QuestionCard from '../components/cross-examination/QuestionCard';
import AnswerConsole from '../components/cross-examination/AnswerConsole';
import useQuestionSpeech from '../hooks/useQuestionSpeech';
import PreparationReport from '../components/cross-examination/PreparationReport';
import { DEFAULT_QUESTION_DURATION, formatTimeMMSS } from '../utils/interviewTimer';
import {
  getCrossExaminationSession,
  submitCrossExamAnswer,
  advanceCrossExamQuestion,
  completeCrossExamSession,
  sanitizeCandidateQuestion,
} from '../utils/crossExaminationApi';

function CrossExaminationSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);

  // Session State
  const [session, setSession] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Interaction State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);

  // Active question countdown timer (configurable default of 120s)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_QUESTION_DURATION);
  const [totalQuestionTime, setTotalQuestionTime] = useState(DEFAULT_QUESTION_DURATION);

  // Overall session elapsed time in seconds
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  // Derived session and question state (declared before hooks/effects to prevent TDZ reference errors)
  const isCompleted = session?.status === 'completed';
  const isCurrentAnswered = Boolean(
    activeQuestion &&
    Array.isArray(session?.questions) &&
    session.questions.find((q) => q.questionId === activeQuestion.questionId)?.status === 'answered'
  );
  const activeQuestionId = activeQuestion?.questionId;
  const activeQuestionTimeLimit = activeQuestion?.timeLimit;

  // Audible AI Question Speech Synthesis (Synchronized video and voice)
  const {
    isSpeaking: isAISpeaking,
    isBlocked: isAudioBlocked,
    isSupported: _isAudioSupported,
    hasActivated,
    playbackState: _playbackState,
    speakQuestion,
    replayQuestion,
    cancelSpeech,
    requestAudioActivation,
  } = useQuestionSpeech({
    videoRef,
  });

  // Fetch Session Data from Server
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setIsLoading(true);
      setLoadError(null);
      const data = await getCrossExaminationSession(sessionId);
      const sessionDoc = data.session;
      setSession(sessionDoc);

      // Determine active question
      if (sessionDoc.currentQuestion) {
        setActiveQuestion(sanitizeCandidateQuestion(sessionDoc.currentQuestion));
      } else if (Array.isArray(sessionDoc.questions)) {
        const current = sessionDoc.questions.find((q) => q.status === 'current');
        setActiveQuestion(sanitizeCandidateQuestion(current) || null);
      }
    } catch (err) {
      console.error('Failed to load cross-examination session:', err);
      const statusCode = err.response?.status;
      if (statusCode === 401) {
        setLoadError('Please log in to view this cross-examination session.');
      } else if (statusCode === 404) {
        setLoadError('Session not found or you do not have permission to access it.');
      } else {
        setLoadError(err.response?.data?.message || err.message || 'Error loading session');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Automatically speak active question aloud (deduped, cancelled on question change/completion)
  useEffect(() => {
    if (activeQuestion && activeQuestion.questionText && !isCompleted && !isLoading) {
      speakQuestion(activeQuestion.questionText, activeQuestion.questionId);
    }
    return () => {
      cancelSpeech();
    };
  }, [activeQuestion, isCompleted, isLoading, speakQuestion, cancelSpeech]);

  // Synchronize timer when active question changes
  useEffect(() => {
    if (activeQuestionId) {
      const duration = activeQuestionTimeLimit || DEFAULT_QUESTION_DURATION;
      setTimeLeft(duration);
      setTotalQuestionTime(duration);
    }
  }, [activeQuestionId, activeQuestionTimeLimit]);

  // Active countdown timer effect: continuous updates, cleans up on unmount or question change
  useEffect(() => {
    if (isSubmitting || isAdvancing || isCompleting || !activeQuestion || isCurrentAnswered) return;
    if (timeLeft <= 0) return; // Expired, pause at 0 (never auto-submits or discards answer)

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isSubmitting, isAdvancing, isCompleting, activeQuestion, isCurrentAnswered]);

  // Session elapsed timer effect: tracks overall interview session elapsed time continuously
  useEffect(() => {
    if (isCompleted || isLoading) return;

    const interval = setInterval(() => {
      setSessionElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted, isLoading]);

  // Handle Answer Submission
  const handleSubmitAnswer = async ({ questionId, rawTranscript, autoAdvance }) => {
    cancelSpeech();
    if (isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading('Recording response on server...');

    try {
      const response = await submitCrossExamAnswer(sessionId, {
        questionId,
        rawTranscript,
        autoAdvance,
      });

      toast.success('Response accepted', { id: toastId });

      // Update question statuses in session
      if (response.nextQuestion) {
        setActiveQuestion(sanitizeCandidateQuestion(response.nextQuestion));
      } else if (response.progress?.isFinished) {
        // If all questions answered, complete session
        await handleFinalizeSession();
        return;
      }

      // Re-fetch to synchronize state exactly with backend truth
      await fetchSession();
    } catch (err) {
      console.error('Submit answer error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit answer';
      toast.error(msg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Manual Advance
  const handleAdvance = async () => {
    cancelSpeech();
    if (isAdvancing) return;

    setIsAdvancing(true);
    const toastId = toast.loading('Advancing to next question...');

    try {
      const response = await advanceCrossExamQuestion(sessionId);

      if (response.isFinished) {
        toast.success('All questions answered! Completing examination.', { id: toastId });
        await handleFinalizeSession();
      } else if (response.currentQuestion) {
        setActiveQuestion(sanitizeCandidateQuestion(response.currentQuestion));
        toast.dismiss(toastId);
        await fetchSession();
      }
    } catch (err) {
      console.error('Advance error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to advance';
      toast.error(msg, { id: toastId });
    } finally {
      setIsAdvancing(false);
    }
  };

  // Complete Session Logic
  const handleFinalizeSession = async () => {
    cancelSpeech();
    setIsCompleting(true);
    const toastId = toast.loading('Finalizing cross-examination...');

    try {
      const response = await completeCrossExamSession(sessionId);
      toast.success('Examination completed successfully!', { id: toastId });
      setSession(response.session);
      setActiveQuestion(null);
      setShowEndConfirmModal(false);
    } catch (err) {
      console.error('Complete error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to complete session';
      toast.error(msg, { id: toastId });
    } finally {
      setIsCompleting(false);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 font-poppins">
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 shadow-2xl">
          <RiLoader4Line className="text-4xl text-yellow-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Retrieving Cross-Examination Session...
          </p>
        </div>
      </div>
    );
  }

  // Error State
  if (loadError || !session) {
    return (
      <div className="min-h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 font-poppins">
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-8 text-center max-w-md mx-auto shadow-2xl border border-slate-800">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 text-2xl mx-auto mb-4">
            <HiOutlineExclamationCircle />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Unable to Load Session</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {loadError || 'The requested cross-examination session could not be retrieved.'}
          </p>
          <button
            onClick={() => navigate('/cross-examination')}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Return to Setup
          </button>
        </div>
      </div>
    );
  }

  const totalQuestions = session.progress?.totalQuestions || session.questions?.length || 0;
  const currentNumber = activeQuestion?.order || (session.progress?.answeredCount || 0) + 1;
  const isLastQuestion = currentNumber >= totalQuestions;

  // Render Completed Preparation Report
  if (isCompleted) {
    return (
      <div className="min-h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 md:p-6 font-poppins">
        <div className="w-full max-w-5xl bg-slate-950 rounded-[2.5rem] p-6 md:p-10 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto">
          <PreparationReport
            session={session}
            initialReport={session.report}
            onReportUpdated={(updatedReport) => {
              setSession((prev) => (prev ? { ...prev, report: updatedReport } : prev));
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-3 sm:p-4 md:p-6 font-poppins selection:bg-yellow-400 selection:text-slate-900 overflow-hidden">
      {/* Centered Main Interview Container: Two-Column Layout */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl h-[88vh] min-h-[600px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.12)] border border-white flex flex-col lg:flex-row overflow-hidden relative"
      >
        {/* Left Sidebar: 31% width, deep navy background */}
        <div className="w-full lg:w-[31%] bg-slate-900 flex flex-col p-5 md:p-6 space-y-4 relative shrink-0 overflow-y-auto">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-yellow-400/10 blur-3xl pointer-events-none" />

          {/* A. Interviewer Avatar / Video Frame */}
          <motion.div className="w-full aspect-video lg:aspect-[4/3] max-h-48 lg:max-h-none rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-800 relative z-10 shrink-0">
            <video
              ref={videoRef}
              src="https://res.cloudinary.com/dflf8j84g/video/upload/v1774549693/AI_asking_questions_202603262250_fgjdiw.mp4"
              muted
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${isAISpeaking ? 'opacity-100' : 'opacity-70'}`}
            />
            {/* Candidate Turn / AI Speaking Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
              <div className={`w-2 h-2 rounded-full ${isAISpeaking ? 'bg-emerald-400 animate-ping' : 'bg-yellow-400'}`} />
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">
                {isAISpeaking ? 'AI SPEAKING' : 'CANDIDATE TURN'}
              </span>
            </div>

            {/* Browser Autoplay Blocked or Initial Audio Activation Action */}
            {(isAudioBlocked || (!hasActivated && !isCompleted && !isLoading)) && (
              <button
                type="button"
                id="enableAudioButton"
                onClick={() => requestAudioActivation(activeQuestion?.questionText, activeQuestion?.questionId)}
                className="absolute bottom-3 right-3 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-slate-900 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all z-20 cursor-pointer"
                title="Browser blocked audible autoplay. Click to enable interviewer voice."
              >
                <HiSpeakerWave className="text-xs" /> Enable Audio
              </button>
            )}
          </motion.div>

          {/* B & C. Session Elapsed Timer & Circular Countdown Card */}
          <div className="w-full flex-1 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 flex flex-col justify-between relative z-10">
            {/* Session Elapsed Row */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <RiTimeLine className="text-yellow-400 text-sm" /> SESSION ELAPSED
                </span>
                <span className="text-xs font-mono font-black text-yellow-400 tracking-wider">
                  {formatTimeMMSS(sessionElapsedSeconds)}
                </span>
              </div>
              <div className="h-px bg-white/10" />
            </div>

            {/* Circular Question Countdown */}
            <div className="flex justify-center py-2">
              <Timer timeLeft={timeLeft} totalTime={totalQuestionTime} />
            </div>

            {/* D. Question Statistics Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                <p className="text-lg font-black text-white">{currentNumber}</p>
                <p className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">QUESTION</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 text-center border border-white/5">
                <p className="text-lg font-black text-slate-300">{totalQuestions}</p>
                <p className="text-[8px] uppercase font-bold text-slate-400 tracking-wider">TOTAL</p>
              </div>
            </div>
          </div>

          {/* End Session Trigger */}
          <button
            onClick={() => setShowEndConfirmModal(true)}
            disabled={isCompleting}
            className="text-[10px] uppercase font-bold text-slate-400 hover:text-red-400 flex items-center justify-center gap-1.5 transition-colors py-1 shrink-0"
          >
            <HiOutlineStop className="text-xs" /> End Session Early
          </button>
        </div>

        {/* Right Workspace: 69% width, clean white background */}
        <div className="flex-1 flex flex-col p-6 md:p-8 lg:p-10 bg-white relative overflow-y-auto justify-between text-left">
          {/* A. Header Row */}
          <div className="shrink-0 flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-yellow-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
              <HiCheckBadge className="text-yellow-400 text-sm" /> TECHNICAL ASSESSMENT
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {currentNumber} / {totalQuestions}
            </span>
          </div>

          {/* B. Question Section */}
          <QuestionCard
            question={activeQuestion}
            currentNumber={currentNumber}
            totalQuestions={totalQuestions}
            timeLeft={timeLeft}
            totalTime={totalQuestionTime}
            isSpeaking={isAISpeaking}
            onReplay={() => replayQuestion(activeQuestion?.questionText, activeQuestion?.questionId)}
            isAudioBlocked={isAudioBlocked}
            onEnableAudio={() => requestAudioActivation(activeQuestion?.questionText, activeQuestion?.questionId)}
          />

          {/* C, D, E. Answer Editor, Guidance & Action Bar */}
          {activeQuestion && (
            <AnswerConsole
              activeQuestion={activeQuestion}
              isAnswered={isCurrentAnswered}
              onSubmitAnswer={handleSubmitAnswer}
              onAdvanceQuestion={handleAdvance}
              isSubmitting={isSubmitting}
              isAdvancing={isAdvancing}
              timeLeft={timeLeft}
              isLastQuestion={isLastQuestion}
              isAISpeaking={isAISpeaking}
            />
          )}
        </div>
      </motion.div>

      {/* End Session Early Confirmation Modal */}
      <AnimatePresence>
        {showEndConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setShowEndConfirmModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                aria-label="Close modal"
              >
                <HiOutlineXMark className="text-lg" />
              </button>

              <h3 className="text-lg font-bold text-white mb-2">Conclude Cross-Examination?</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Ending now will finalize your session with responses submitted so far. Remaining questions will be
                marked skipped.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Continue Interview
                </button>
                <button
                  onClick={handleFinalizeSession}
                  disabled={isCompleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isCompleting ? 'Finalizing...' : 'Yes, End Session'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CrossExaminationSession;
