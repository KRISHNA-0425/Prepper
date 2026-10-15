import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { HiOutlineArrowLeft, HiOutlineStop } from 'react-icons/hi';
import { RiShieldFlashLine } from 'react-icons/ri';

function SessionHeader({ session, onCompleteEarly, isCompleting }) {
  const navigate = useNavigate();

  const total = session?.progress?.totalQuestions || session?.questions?.length || 0;
  const answered = session?.progress?.answeredCount || session?.answersCount || 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
  const isCompleted = session?.status === 'completed';

  return (
    <header className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl backdrop-blur-md text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cross-examination')}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Return to Cross-Examination Hub"
            aria-label="Return to Cross-Examination Hub"
          >
            <HiOutlineArrowLeft className="text-base" />
          </button>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full tracking-wider flex items-center gap-1">
                <RiShieldFlashLine />
                {session?.targetRole || 'Technical Candidate'}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                  isCompleted
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                    : 'bg-yellow-950/80 text-yellow-400 border border-yellow-800/40'
                }`}
              >
                {isCompleted ? 'Completed' : 'Active Probe'}
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-lg">
              {session?.sessionTitle || 'Project Cross-Examination'}
            </h1>
          </div>
        </div>

        {/* Action Button */}
        {!isCompleted && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={onCompleteEarly}
              disabled={isCompleting}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-950/40 hover:bg-red-950/70 border border-red-800/50 text-red-300 hover:text-red-200 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <HiOutlineStop className="text-sm" />
              {isCompleting ? 'Finishing...' : 'End Session'}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar & Status */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-slate-400">
          <span>
            Examination Progress:{' '}
            <strong className="text-yellow-400 font-mono">
              {answered} of {total}
            </strong>{' '}
            questions answered
          </span>
          <span className="font-mono text-slate-300">{progressPercent}%</span>
        </div>

        <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="bg-yellow-400 h-full rounded-full"
          />
        </div>
      </div>
    </header>
  );
}

export default SessionHeader;
