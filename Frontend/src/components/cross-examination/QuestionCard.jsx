import React from 'react';
import { formatTimeMMSS } from '../../utils/interviewTimer';

function QuestionCard({
  question,
  currentNumber = 1,
  
  timeLeft = 120,
  totalTime = 120,
}) {
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

  const isExpired = timeLeft <= 0;
  const isLowTime = timeLeft > 0 && timeLeft <= 30;

  return (
    <div className="shrink-0 mb-4 text-left">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
          QUESTION {currentNumber || safeQuestion.order}
        </p>

        {/* Accessible countdown timer display */}
        <div
          role="timer"
          aria-label={isExpired ? "Time expired" : `${timeLeft} seconds remaining`}
          className="text-xs font-mono font-bold text-slate-400 flex items-center gap-1.5"
        >
          <span
            className={`transition-colors ${
              isExpired
                ? 'text-red-500 font-bold animate-pulse'
                : isLowTime
                ? 'text-amber-500 font-bold animate-pulse'
                : 'text-slate-400'
            }`}
          >
            {formatTimeMMSS(timeLeft)}
            {isExpired && ' (Time Expired)'}
          </span>
        </div>
      </div>

      {/* Bold Question Typography with Narrow Yellow Vertical Line */}
      <div className="text-xl lg:text-2xl font-bold text-slate-900 leading-snug border-l-4 border-yellow-400 pl-4 py-1">
        {safeQuestion.questionText}
      </div>
    </div>
  );
}

export default QuestionCard;
