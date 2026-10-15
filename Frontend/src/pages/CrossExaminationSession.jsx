import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineExclamationCircle,
  HiOutlineArrowLeft,
  HiOutlineQuestionMarkCircle,
  HiOutlineXMark,
} from 'react-icons/hi2';
import { RiLoader4Line } from 'react-icons/ri';
import Navbar from '../components/Navbar';
import SessionHeader from '../components/cross-examination/SessionHeader';
import QuestionCard from '../components/cross-examination/QuestionCard';
import AnswerConsole from '../components/cross-examination/AnswerConsole';
import SessionCompletion from '../components/cross-examination/SessionCompletion';
import PreparationReport from '../components/cross-examination/PreparationReport';
import { DEFAULT_QUESTION_DURATION } from '../utils/interviewTimer';
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

  // Synchronize timer when active question changes
  useEffect(() => {
    if (activeQuestion) {
      const duration = activeQuestion.timeLimit || DEFAULT_QUESTION_DURATION;
      setTimeLeft(duration);
      setTotalQuestionTime(duration);
    }
  }, [activeQuestion?.questionId, activeQuestion?.timeLimit]);

  // Determine if active question is already answered and waiting for manual advance
  const isCurrentAnswered = Boolean(
    activeQuestion &&
    Array.isArray(session?.questions) &&
    session.questions.find((q) => q.questionId === activeQuestion.questionId)?.status === 'answered'
  );

  // Active countdown timer effect: continuous updates, cleans up on unmount or question change
  useEffect(() => {
    if (isSubmitting || isAdvancing || isCompleting || !activeQuestion || isCurrentAnswered) return;
    if (timeLeft <= 0) return; // Expired, pause at 0 (never auto-submits or discards answer)

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isSubmitting, isAdvancing, isCompleting, activeQuestion, isCurrentAnswered]);

  // Handle Answer Submission
  const handleSubmitAnswer = async ({ questionId, rawTranscript, autoAdvance }) => {
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
      <div className="min-h-screen bg-slate-950 text-slate-100 font-poppins flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
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
      <div className="min-h-screen bg-slate-950 text-slate-100 font-poppins flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 text-2xl mb-4">
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

  const isCompleted = session.status === 'completed';
  const totalQuestions = session.progress?.totalQuestions || session.questions?.length || 0;
  const currentNumber = activeQuestion?.order || (session.progress?.answeredCount || 0) + 1;

  // isCurrentAnswered hoisted above

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-poppins selection:bg-yellow-400 selection:text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
        <SessionHeader
          session={session}
          onCompleteEarly={() => setShowEndConfirmModal(true)}
          isCompleting={isCompleting}
        />

        {isCompleted ? (
          <PreparationReport
            session={session}
            initialReport={session.report}
            onReportUpdated={(updatedReport) => {
              setSession((prev) => (prev ? { ...prev, report: updatedReport } : prev));
            }}
          />
        ) : (
          <div>
            <QuestionCard
              question={activeQuestion}
              currentNumber={currentNumber}
              totalQuestions={totalQuestions}
              timeLeft={timeLeft}
              totalTime={totalQuestionTime}
            />

            {activeQuestion && (
              <AnswerConsole
                activeQuestion={activeQuestion}
                isAnswered={isCurrentAnswered}
                onSubmitAnswer={handleSubmitAnswer}
                onAdvanceQuestion={handleAdvance}
                isSubmitting={isSubmitting}
                isAdvancing={isAdvancing}
                timeLeft={timeLeft}
              />
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal for Ending Session Early */}
      <AnimatePresence>
        {showEndConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <HiOutlineExclamationCircle className="text-yellow-400 text-lg" />
                  End Cross-Examination Early?
                </h3>
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <HiOutlineXMark className="text-lg" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Are you sure you want to finalize this session? Any remaining unanswered questions will be marked as{' '}
                <strong className="text-slate-200">skipped</strong>. You will not be able to submit further answers once
                completed.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEndConfirmModal(false)}
                  disabled={isCompleting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Continue Interview
                </button>
                <button
                  onClick={handleFinalizeSession}
                  disabled={isCompleting}
                  className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isCompleting ? <RiLoader4Line className="animate-spin text-sm" /> : null}
                  Confirm & Complete
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
