import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCheckBadge,
  HiOutlineQuestionMarkCircle,
  HiOutlineClock,
  HiOutlineArrowRight,
  HiOutlineHome,
} from 'react-icons/hi2';
import { RiShieldCheckLine } from 'react-icons/ri';

function SessionCompletion({ session }) {
  const navigate = useNavigate();

  const total = session?.questions?.length || 0;
  const answered = Array.isArray(session?.questions)
    ? session.questions.filter((q) => q.status === 'answered').length
    : session?.answersCount || 0;
  const skipped = total - answered;

  const completedTime = session?.report?.completedAt
    ? new Date(session.report.completedAt).toLocaleString()
    : new Date().toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-md text-center max-w-2xl mx-auto"
    >
      <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-3xl mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <HiOutlineCheckBadge />
      </div>

      <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full inline-block mb-3">
        Examination Completed
      </span>

      <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
        {session?.targetRole || 'Cross-Examination'} Finished
      </h2>

      <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
        {session?.report?.summary ||
          'Your project claims and answer transcripts have been securely archived. Your responses are ready for technical evaluation.'}
      </p>

      {/* Metrics Breakdown Grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-yellow-400 font-mono">{total}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Total Probes</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-emerald-400 font-mono">{answered}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Answered</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-slate-400 font-mono">{skipped}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Skipped</p>
        </div>
      </div>

      {/* Audit & Evaluation Phase Info Note */}
      <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 text-left mb-8 flex items-start gap-3 leading-relaxed">
        <RiShieldCheckLine className="text-yellow-400 text-xl shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200 block mb-0.5">Evaluation Phase Ready</strong>
          Session state has finalized without data loss. Detailed claim corroboration, architecture verification, and
          gap analysis will be processed in the upcoming evaluation report phase.
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => navigate('/cross-examination')}
          className="w-full sm:w-auto px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          New Cross-Examination
          <HiOutlineArrowRight className="text-sm" />
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
        >
          <HiOutlineHome className="text-sm" />
          Home Dashboard
        </button>
      </div>
    </motion.div>
  );
}

export default SessionCompletion;
