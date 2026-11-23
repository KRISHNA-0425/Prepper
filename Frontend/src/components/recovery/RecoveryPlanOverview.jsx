import React from 'react';
import { motion } from 'framer-motion';
import {
  RiShieldCheckLine,
  RiAlertLine,
  RiCheckDoubleLine,
  RiCalendarEventLine,
  RiTimeLine,
  RiFlashlightLine,
  RiInformationLine,
  RiAwardLine,
} from 'react-icons/ri';

export default function RecoveryPlanOverview({ plan, onStartPlan, isStarting }) {
  if (!plan) return null;

  const progress = plan.progress || {
    totalTasks: plan.tasks?.length || 0,
    completedTasks: 0,
    completionPercentage: 0,
    currentDay: 1,
  };

  const getSourceBadge = (sourceType) => {
    switch (sourceType) {
      case 'cross_examination':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">Cross-Exam</span>;
      case 'coding_interview':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Live Coding</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Interview</span>;
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/40">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">High Priority</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">Moderate</span>;
    }
  };

  return (
    <div className="space-y-6 font-poppins">
      {/* Fallback Notice Banner if applicable */}
      {plan.isFallbackGenerated && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <RiInformationLine className="text-amber-400 text-lg shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <strong className="font-bold text-amber-300">Deterministic Recovery Roadmap:</strong>{' '}
            {plan.fallbackReason || 'Derived strictly from your recorded evaluation evidence and knowledge gaps without AI hallucinations.'}
          </div>
        </div>
      )}

      {/* Hero Overview Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                Module 5 Recovery Plan
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {plan.scheduleDurationDays}-Day Plan
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                plan.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : (plan.status === 'in_progress' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700')
              }`}>
                {plan.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              Recovery Roadmap: {plan.targetRole}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              {plan.overallAssessment}
            </p>
          </div>

          {/* Quick Metrics & Start Action */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Baseline Score</span>
                <span className="text-base font-black text-yellow-400">
                  {plan.reassessment?.originalScore ?? 0}/100
                </span>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <span className="text-slate-400 block text-[10px]">Daily Commitment</span>
                <span className="text-base font-black text-white flex items-center gap-1">
                  <RiTimeLine className="text-cyan-400 text-xs" />
                  {plan.dailyStudyMinutes}m
                </span>
              </div>
            </div>

            {plan.status === 'not_started' && onStartPlan && (
              <button
                type="button"
                onClick={onStartPlan}
                disabled={isStarting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RiFlashlightLine />
                {isStarting ? 'Starting...' : 'Activate Recovery Plan'}
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <RiCheckDoubleLine className="text-emerald-400 text-base" />
              Overall Completion: <span className="text-emerald-400">{progress.completionPercentage}%</span>
            </div>
            <div className="text-slate-400 font-medium">
              <span className="text-white font-bold">{progress.completedTasks}</span> of {progress.totalTasks} Tasks Completed
              <span className="mx-2 text-slate-600">|</span>
              Current Day: <strong className="text-yellow-400">Day {progress.currentDay}</strong> of {plan.scheduleDurationDays}
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/50">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress.completionPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-emerald-400 to-teal-400"
            />
          </div>
        </div>
      </div>

      {/* Dual Column: Verified Strengths vs Critical Weaknesses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identified Strengths Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <RiShieldCheckLine className="text-lg" />
              </div>
              <h3 className="font-bold text-base text-white">Demonstrated Strengths</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {plan.strengths?.length || 0} Identified
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {plan.strengths && plan.strengths.length > 0 ? (
              plan.strengths.map((str, idx) => (
                <div
                  key={str.strengthId || idx}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-emerald-300 text-sm">{str.topic}</span>
                    {str.evidence?.sourceType && getSourceBadge(str.evidence.sourceType)}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{str.description}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No explicit strengths isolated.</p>
            )}
          </div>
        </div>

        {/* Critical Weaknesses & Evidence Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <RiAlertLine className="text-lg" />
              </div>
              <h3 className="font-bold text-base text-white">Targeted Weaknesses & Gaps</h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {plan.criticalWeaknesses?.length || 0} Targeted
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {plan.criticalWeaknesses && plan.criticalWeaknesses.length > 0 ? (
              plan.criticalWeaknesses.map((w, idx) => (
                <div
                  key={w.weaknessId || idx}
                  className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-sm">{w.topic}</span>
                    <div className="flex items-center gap-1.5">
                      {getSeverityBadge(w.severity)}
                      {w.evidence?.sourceType && getSourceBadge(w.evidence.sourceType)}
                    </div>
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">{w.description}</p>
                  {w.misconceptionSnippet && (
                    <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 italic">
                      Excerpt: "{w.misconceptionSnippet.slice(0, 140)}..."
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No critical weaknesses recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
