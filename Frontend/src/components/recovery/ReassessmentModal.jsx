import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCloseLine,
  RiAwardLine,
  RiCheckDoubleLine,
  RiQuestionLine,
  RiSparklingLine,
  RiArrowRightLine,
  RiArrowUpLine,
  RiAlertLine,
  RiSendPlaneLine,
} from 'react-icons/ri';
import axios from 'axios';
import toast from 'react-hot-toast';
import { backendServerUrl } from '../../App';

export default function ReassessmentModal({
  isOpen,
  onClose,
  plan,
  onReassessmentUpdated,
}) {
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  if (!isOpen || !plan) return null;

  const reassessment = plan.reassessment || { status: 'not_eligible', questions: [] };
  const isCompleted = reassessment.status === 'completed';
  const hasQuestions = Array.isArray(reassessment.questions) && reassessment.questions.length > 0;

  const handleStartQuestions = async () => {
    try {
      setIsInitializing(true);
      const res = await axios.post(
        `${backendServerUrl}/api/recovery-plans/${plan._id}/reassess/start`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.plan) {
        toast.success('Reassessment questions generated!');
        onReassessmentUpdated(res.data.plan);
      }
    } catch (err) {
      console.error('Error starting reassessment:', err);
      toast.error(err.response?.data?.message || 'Failed to start reassessment');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAnswerChange = (qId, val) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmitAnswers = async () => {
    const formattedAnswers = reassessment.questions.map((q) => ({
      questionId: q.questionId,
      answer: answers[q.questionId] || q.candidateAnswer || '',
    }));

    const missing = formattedAnswers.some((a) => !a.answer || a.answer.trim().length < 10);
    if (missing) {
      toast.error('Please provide thoughtful answers (at least 1-2 sentences) to all questions before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(
        `${backendServerUrl}/api/recovery-plans/${plan._id}/reassess/submit`,
        { answers: formattedAnswers },
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.plan) {
        toast.success('Reassessment completed! Performance comparison ready.');
        onReassessmentUpdated(res.data.plan);
      }
    } catch (err) {
      console.error('Error submitting reassessment:', err);
      toast.error(err.response?.data?.message || 'Failed to evaluate reassessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-poppins">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-white max-h-[92vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <RiAwardLine className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Recovery Reassessment & Validation
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">
                Measure authentic score improvement on the exact competencies identified as weaknesses.
              </p>
            </div>
          </div>

          {/* Step 1: Not Initialized Yet */}
          {!hasQuestions && !isCompleted && (
            <div className="py-8 text-center space-y-4">
              <div className="max-w-md mx-auto p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 leading-relaxed">
                You will be presented with 3 to 5 targeted verification questions directly mapped to your recorded interview weaknesses.
              </div>
              <button
                type="button"
                onClick={handleStartQuestions}
                disabled={isInitializing}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-400/20 flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-50"
              >
                {isInitializing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Generating Targeted Questions...
                  </>
                ) : (
                  <>
                    <RiSparklingLine className="text-base" />
                    Begin Reassessment Drill
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Answer Questions */}
          {hasQuestions && !isCompleted && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200">
                Provide clear, thorough explanations demonstrating your resolution of past misconceptions and technical gaps.
              </div>

              {reassessment.questions.map((q, idx) => (
                <div
                  key={q.questionId || idx}
                  className="p-4 sm:p-5 rounded-xl bg-slate-800/50 border border-slate-700/70 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                      Question {idx + 1} • {q.topic}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                    {q.questionText}
                  </h4>
                  <textarea
                    rows={4}
                    value={answers[q.questionId] !== undefined ? answers[q.questionId] : (q.candidateAnswer || '')}
                    onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                    placeholder="Type your structured explanation, code considerations, or architectural tradeoffs..."
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/80 transition"
                  />
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Save & Exit Later
                </button>
                <button
                  type="button"
                  onClick={handleSubmitAnswers}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-400/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      Evaluating Answers...
                    </>
                  ) : (
                    <>
                      <RiSendPlaneLine className="text-sm" />
                      Submit Reassessment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Completed Score Delta Comparison */}
          {isCompleted && (
            <div className="space-y-6">
              {/* Score Delta Hero Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 text-center">
                <div className="flex items-center justify-center gap-6 mb-3">
                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Baseline Score
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-300">
                      {reassessment.originalScore}/100
                    </span>
                  </div>

                  <div className="flex items-center text-emerald-400 font-black text-xl">
                    <RiArrowRightLine />
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Reassessment Score
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                      {reassessment.reassessmentScore}/100
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <RiArrowUpLine className="text-sm" />
                  Score Delta: {reassessment.scoreDelta >= 0 ? `+${reassessment.scoreDelta}` : reassessment.scoreDelta} Points
                </div>
              </div>

              {/* Observed Improvements */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <RiCheckDoubleLine /> Verified Improvements
                </h4>
                <div className="space-y-2">
                  {reassessment.improvementsObserved && reassessment.improvementsObserved.length > 0 ? (
                    reassessment.improvementsObserved.map((imp, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                        {imp}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">No score improvements recorded above threshold.</p>
                  )}
                </div>
              </div>

              {/* Remaining Gaps */}
              {reassessment.remainingGaps && reassessment.remainingGaps.length > 0 && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <RiAlertLine /> Recommended Future Focus Areas
                  </h4>
                  <div className="space-y-2">
                    {reassessment.remainingGaps.map((gap, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                        {gap}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800 text-right">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
                >
                  Close Reassessment
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
