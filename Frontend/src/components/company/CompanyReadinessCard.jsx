import React from 'react';
import { motion } from 'framer-motion';
import {
  RiShieldCheckLine,
  RiThumbUpLine,
  RiAlertLine,
  RiCloseCircleLine,
  RiCompass3Line,
  RiCheckDoubleLine,
  RiArrowRightLine,
  RiAwardLine,
  RiUserStarLine,
  RiSparklingLine,
} from 'react-icons/ri';

export default function CompanyReadinessCard({
  readinessScore = 0,
  hireVerdict = 'Hire',
  fitLevel = 'Meets Expectations',
  companyName = 'Target Company',
  roundTitle = 'Technical Round',
  strengths = [],
  gaps = [],
  cultureFeedback = '',
  nextRoundRecommendation = '',
  onGenerateRecoveryPlan,
}) {
  const getVerdictConfig = (verdict) => {
    switch (verdict) {
      case 'Strong Hire':
        return {
          bg: 'bg-emerald-500/15',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500 text-slate-950',
          icon: RiShieldCheckLine,
          label: 'Strong Hire',
          description: 'Candidate exceeds senior engineering bar across technical depth, system thinking, and company culture.',
        };
      case 'Hire':
        return {
          bg: 'bg-green-500/15',
          border: 'border-green-500/40',
          text: 'text-green-400',
          badgeBg: 'bg-green-500 text-slate-950',
          icon: RiThumbUpLine,
          label: 'Hire',
          description: 'Candidate satisfies engineering expectations and exhibits solid problem-solving with minor gaps.',
        };
      case 'Leaning Hire':
        return {
          bg: 'bg-cyan-500/15',
          border: 'border-cyan-500/40',
          text: 'text-cyan-400',
          badgeBg: 'bg-cyan-500 text-slate-950',
          icon: RiUserStarLine,
          label: 'Leaning Hire',
          description: 'Promising fundamentals with minor conceptual ambiguities; warrants verification in subsequent rounds.',
        };
      case 'Leaning No Hire':
        return {
          bg: 'bg-amber-500/15',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500 text-slate-950',
          icon: RiAlertLine,
          label: 'Leaning No Hire',
          description: 'Noticeable technical or algorithmic inconsistencies compared to typical company standards.',
        };
      default:
        return {
          bg: 'bg-rose-500/15',
          border: 'border-rose-500/40',
          text: 'text-rose-400',
          badgeBg: 'bg-rose-500 text-white',
          icon: RiCloseCircleLine,
          label: 'No Hire',
          description: 'Significant gaps observed against company core competencies and problem-solving standards.',
        };
    }
  };

  const getFitBadge = (fit) => {
    if (fit === 'Exceeds Expectations') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
    if (fit === 'Meets Expectations') {
      return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40';
    }
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  };

  const verdictConfig = getVerdictConfig(hireVerdict);
  const VerdictIcon = verdictConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-6 font-poppins relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/5 blur-3xl pointer-events-none rounded-full" />

      {/* Header & Score Gauge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
              {companyName} Simulation
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {roundTitle}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${getFitBadge(fitLevel)}`}>
              {fitLevel}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Company Readiness Scorecard
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            Simulated performance benchmarked against publicly known {companyName} hiring expectations and evaluation rubrics.
          </p>
        </div>

        {/* Readiness Circular / Badge Gauge */}
        <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border-2 border-yellow-400/30 shadow-inner">
            <span className="text-2xl font-black text-yellow-400">
              {Math.round(readinessScore)}
            </span>
            <span className="absolute bottom-2 text-[9px] font-bold text-slate-500 uppercase">
              / 100
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Hiring Verdict
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${verdictConfig.badgeBg}`}>
                <VerdictIcon className="text-sm" />
                {verdictConfig.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-[200px] line-clamp-2">
              {verdictConfig.description}
            </p>
          </div>
        </div>
      </div>

      {/* Qualitative Feedback & Culture Fit */}
      {cultureFeedback && (
        <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60 text-xs sm:text-sm text-slate-300 leading-relaxed flex items-start gap-3">
          <RiCompass3Line className="text-yellow-400 text-lg shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-yellow-400 block mb-0.5">
              {companyName} Principles & Culture Alignment
            </span>
            <p>{cultureFeedback}</p>
          </div>
        </div>
      )}

      {/* Strengths & Gaps Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Strengths */}
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <RiCheckDoubleLine className="text-base" />
            Demonstrated Strengths
          </h4>
          {strengths && strengths.length > 0 ? (
            <ul className="space-y-1.5">
              {strengths.map((str, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No specific strengths captured.</p>
          )}
        </div>

        {/* Identified Gaps */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <RiAlertLine className="text-base" />
            Critical Preparation Gaps
          </h4>
          {gaps && gaps.length > 0 ? (
            <ul className="space-y-1.5">
              {gaps.map((gap, idx) => (
                <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No major gaps identified.</p>
          )}
        </div>
      </div>

      {/* Next Round Recommendation & Module 5 Recovery Bridge */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <RiAwardLine className="text-yellow-400" />
            Recommended Next Step
          </span>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {nextRoundRecommendation || `Focus on deepening algorithmic complexity analysis and system trade-offs for subsequent ${companyName} rounds.`}
          </p>
        </div>

        {onGenerateRecoveryPlan && (
          <button
            type="button"
            onClick={onGenerateRecoveryPlan}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
          >
            <RiSparklingLine className="text-sm" />
            Generate Recovery Plan (Module 5)
          </button>
        )}
      </div>
    </motion.div>
  );
}
