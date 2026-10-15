import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiArrowRight, HiOutlineClock, HiOutlineDocumentText, HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import { RiShieldCheckLine } from 'react-icons/ri';

function PastSessionsList({ sessions, loading, onRefresh }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mx-auto mb-4" />
        <div className="space-y-3">
          <div className="h-12 bg-slate-800/60 rounded-xl" />
          <div className="h-12 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="w-full bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center text-slate-400">
        <HiOutlineDocumentText className="text-4xl mx-auto text-slate-600 mb-2" />
        <h4 className="text-sm font-bold text-slate-300">No Past Sessions Found</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Start your first cross-examination above to probe real projects, verify scale claims, and identify preparation gaps.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <RiShieldCheckLine className="text-yellow-400 text-base" />
          Recent Cross-Examination Sessions ({sessions.length})
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
          >
            Refresh List
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sessions.map((session) => {
          const isCompleted = session.status === 'completed';
          const answered = session.answeredCount || 0;
          const total = session.totalQuestions || 0;
          const formattedDate = session.createdAt
            ? new Date(session.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          return (
            <motion.div
              key={session.sessionId}
              whileHover={{ scale: 1.01 }}
              className="bg-slate-900/70 border border-slate-800 hover:border-yellow-400/40 transition-colors rounded-xl p-4 flex flex-col justify-between gap-3 text-left shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider ${
                      isCompleted
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/40'
                        : 'bg-yellow-950/80 text-yellow-400 border border-yellow-800/40'
                    }`}
                  >
                    {isCompleted ? 'Completed' : 'In Progress'}
                  </span>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                    <HiOutlineClock />
                    {formattedDate}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100 truncate">
                  {session.targetRole || session.sessionTitle || 'Cross-Examination'}
                </h4>
                {session.targetDomain && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{session.targetDomain}</p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <HiOutlineQuestionMarkCircle className="text-yellow-400 text-sm" />
                  <span>
                    {answered} / {total} Answered
                  </span>
                </div>

                <button
                  onClick={() => navigate(`/cross-examination/${session.sessionId}`)}
                  className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 hover:text-yellow-300 transition-colors group"
                >
                  {isCompleted ? 'Review' : 'Resume'}
                  <HiArrowRight className="text-sm group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default PastSessionsList;
