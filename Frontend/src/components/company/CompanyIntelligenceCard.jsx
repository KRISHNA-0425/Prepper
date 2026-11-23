import React from 'react';
import {
  RiBuilding4Line,
  RiCompass3Line,
  RiShieldCheckLine,
  RiCpuLine,
  RiInformationLine,
  RiFlashlightLine,
} from 'react-icons/ri';

export default function CompanyIntelligenceCard({ company }) {
  if (!company) return null;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-5 font-poppins">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
              {company.tier || 'Enterprise Tech'}
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {company.industry || 'Technology'}
            </span>
            {company.isVerified ? (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <RiShieldCheckLine /> Verified Profile
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                AI Synthesized Intelligence
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {company.name} Interview Intelligence
          </h3>
        </div>

        <p className="text-xs text-slate-400 max-w-sm">
          {company.description}
        </p>
      </div>

      {/* Interview Culture & Engineering Standards */}
      <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs sm:text-sm text-slate-300 leading-relaxed">
        <span className="font-bold text-yellow-400 block mb-1 flex items-center gap-1.5">
          <RiCompass3Line /> Interview Culture & Evaluation Rigor
        </span>
        {company.interviewCulture}
      </div>

      {/* Principles & Tech Stack Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Behavioral Principles */}
        {company.behavioralPrinciples && company.behavioralPrinciples.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <RiFlashlightLine className="text-amber-400" />
              Core Principles & Values Evaluated
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {company.behavioralPrinciples.map((pr, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 text-slate-200 border border-slate-700"
                >
                  {pr}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tech Stack Focus */}
        {company.techStackFocus && company.techStackFocus.length > 0 && (
          <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <RiCpuLine className="text-cyan-400" />
              Primary Technologies & Frameworks
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {company.techStackFocus.map((tech, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-800 text-cyan-300 border border-slate-700"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
        <RiInformationLine className="text-slate-500 text-base shrink-0" />
        <span>{company.disclaimer || 'Publicly documented interview preparation patterns; not affiliated with official corporate hiring evaluations.'}</span>
      </div>
    </div>
  );
}
