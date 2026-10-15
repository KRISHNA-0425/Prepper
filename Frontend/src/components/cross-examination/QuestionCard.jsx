import React from 'react';
import { HiOutlineClock, HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import { RiFocus2Line, RiCpuLine } from 'react-icons/ri';
import { sanitizeCandidateQuestion } from '../../utils/crossExaminationApi';

function QuestionCard({ question, currentNumber, totalQuestions }) {
  // Defensive client-side sanitization to strictly prevent exposing evaluator metadata
  const safeQuestion = sanitizeCandidateQuestion(question);

  if (!safeQuestion) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <RiCpuLine className="text-3xl text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">No active question currently selected.</p>
      </div>
    );
  }

  // Format inquiry type into human-friendly label
  const formatInquiryType = (type) => {
    if (!type) return 'Technical Inquiry';
    return type
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Difficulty badge colors
  const getDifficultyBadge = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40';
      case 'hard':
        return 'bg-amber-950/60 text-amber-400 border-amber-800/40';
      case 'medium':
      default:
        return 'bg-yellow-950/60 text-yellow-400 border-yellow-800/40';
    }
  };

  return (
    <motion.div
      key={safeQuestion.questionId}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md mb-6 text-left"
    >
      {/* Top Metadata Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-4 border-b border-slate-800/80 mb-5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-1 rounded-full font-mono">
            Question {currentNumber || safeQuestion.order || 1} of {totalQuestions || '?'}
          </span>

          <span
            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border tracking-wider ${getDifficultyBadge(
              safeQuestion.difficulty
            )}`}
          >
            {safeQuestion.difficulty || 'Medium'} Tier
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1 font-medium bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <RiFocus2Line className="text-yellow-400 text-sm" />
            {formatInquiryType(safeQuestion.inquiryType)}
          </span>

          {safeQuestion.timeLimit && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
              <HiOutlineClock className="text-slate-500" />
              ~{safeQuestion.timeLimit}s suggested
            </span>
          )}
        </div>
      </div>

      {/* Question Prompt */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-100 leading-snug tracking-tight font-sans">
          {safeQuestion.questionText}
        </h2>
      </div>
    </motion.div>
  );
}

export default QuestionCard;
