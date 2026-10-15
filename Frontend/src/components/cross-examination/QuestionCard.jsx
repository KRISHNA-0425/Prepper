import React from 'react';
import { motion } from 'framer-motion';
import { HiOutlineClock } from 'react-icons/hi';
import { RiFocus2Line } from 'react-icons/ri';
import { formatTimeMMSS } from '../../utils/interviewTimer';

function QuestionCard({ question, currentNumber, totalQuestions, timeLeft = 120, totalTime = 120 }) {
  if (!question) {
    return null;
  }

  const safeQuestion = {
    questionId: question.questionId || 'unknown',
    questionText: question.questionText || 'Question prompt unavailable',
    inquiryType: question.inquiryType || 'TECHNICAL_INQUIRY',
    difficulty: question.difficulty || 'medium',
    timeLimit: question.timeLimit || totalTime || 120,
    order: question.order || currentNumber || 1,
  };

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

  const isExpired = timeLeft <= 0;
  const isLowTime = timeLeft > 0 && timeLeft <= 30;

  return (
    <motion.div
      key={safeQuestion.questionId}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md mb-6 text-left"
    >
      {/* Top Metadata Badges & Active Countdown Timer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/80 mb-5">
        <div className="flex flex-wrap items-center gap-2">
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

          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <RiFocus2Line className="text-yellow-400 text-sm" />
            {formatInquiryType(safeQuestion.inquiryType)}
          </span>
        </div>

        {/* Visible Active Countdown Timer */}
        <div className="flex items-center gap-2" role="timer" aria-label={isExpired ? "Time expired" : `${timeLeft} seconds remaining`}>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-black border transition-all shadow-xs ${
              isExpired
                ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-500/20 animate-pulse'
                : isLowTime
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 animate-pulse'
                : 'bg-slate-950/90 text-yellow-400 border-slate-700/80'
            }`}
          >
            <HiOutlineClock className={`text-sm ${isLowTime ? 'animate-spin' : isExpired ? 'text-red-400' : 'text-yellow-400'}`} />
            <span className="font-bold">{formatTimeMMSS(timeLeft)}</span>
            {isExpired ? (
              <span className="text-[10px] uppercase font-black text-red-400 tracking-wider ml-0.5">
                (Time Expired)
              </span>
            ) : isLowTime ? (
              <span className="text-[10px] uppercase font-black text-amber-400 tracking-wider ml-0.5">
                Low Time
              </span>
            ) : (
              <span className="text-[10px] uppercase text-slate-400 tracking-wider ml-0.5">
                Remaining
              </span>
            )}
          </span>
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
