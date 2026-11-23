import React from 'react';
import {
  RiCodeSSlashLine,
  RiBriefcaseLine,
  RiFolderLine,
  RiStarLine,
  RiFileListLine,
  RiKeynoteLine,
  RiGraduationCapLine,
} from 'react-icons/ri';

export default function AtsDimensionBreakdown({ dimensionScores = {} }) {
  const dimensions = [
    {
      key: 'requiredSkills',
      label: 'Required Technical Skills',
      weight: '30%',
      icon: <RiCodeSSlashLine className="text-blue-600" />,
      bg: 'bg-blue-50',
      barColor: 'bg-blue-500',
      data: dimensionScores.requiredSkills || { score: 0, maxScore: 30, percentage: 0, explanation: 'Matches required technical skills.' },
    },
    {
      key: 'experienceRelevance',
      label: 'Experience & Seniority Alignment',
      weight: '20%',
      icon: <RiBriefcaseLine className="text-purple-600" />,
      bg: 'bg-purple-50',
      barColor: 'bg-purple-500',
      data: dimensionScores.experienceRelevance || { score: 0, maxScore: 20, percentage: 0, explanation: 'Years of engineering experience.' },
    },
    {
      key: 'projectRelevance',
      label: 'Project Relevance & Practical Application',
      weight: '15%',
      icon: <RiFolderLine className="text-emerald-600" />,
      bg: 'bg-emerald-50',
      barColor: 'bg-emerald-500',
      data: dimensionScores.projectRelevance || { score: 0, maxScore: 15, percentage: 0, explanation: 'Practical architecture evidence.' },
    },
    {
      key: 'preferredSkills',
      label: 'Preferred & Nice-to-Have Skills',
      weight: '10%',
      icon: <RiStarLine className="text-yellow-600" />,
      bg: 'bg-yellow-50',
      barColor: 'bg-yellow-500',
      data: dimensionScores.preferredSkills || { score: 0, maxScore: 10, percentage: 0, explanation: 'Secondary skill coverage.' },
    },
    {
      key: 'responsibilitiesAlignment',
      label: 'Responsibilities & Domain Alignment',
      weight: '10%',
      icon: <RiFileListLine className="text-indigo-600" />,
      bg: 'bg-indigo-50',
      barColor: 'bg-indigo-500',
      data: dimensionScores.responsibilitiesAlignment || { score: 0, maxScore: 10, percentage: 0, explanation: 'Domain scope and ownership.' },
    },
    {
      key: 'keywordCoverage',
      label: 'ATS Keyword Coverage',
      weight: '10%',
      icon: <RiKeynoteLine className="text-rose-600" />,
      bg: 'bg-rose-50',
      barColor: 'bg-rose-500',
      data: dimensionScores.keywordCoverage || { score: 0, maxScore: 10, percentage: 0, explanation: 'Keyword matching frequency.' },
    },
    {
      key: 'educationRelevance',
      label: 'Education & Certifications',
      weight: '5%',
      icon: <RiGraduationCapLine className="text-teal-600" />,
      bg: 'bg-teal-50',
      barColor: 'bg-teal-500',
      data: dimensionScores.educationRelevance || { score: 0, maxScore: 5, percentage: 0, explanation: 'Degree and credential alignment.' },
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-black text-slate-800">
            7-Dimension Scoring Breakdown
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Explainable audit trail showing point allocation across each evaluation pillar.
          </p>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          Total: 100%
        </span>
      </div>

      <div className="space-y-5">
        {dimensions.map((dim) => {
          const pct = Math.min(100, Math.max(0, dim.data.percentage || 0));
          return (
            <div key={dim.key} className="group">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${dim.bg} flex items-center justify-center text-sm shrink-0`}>
                    {dim.icon}
                  </div>
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    {dim.label}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    Weight: {dim.weight}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-800 text-xs sm:text-sm">
                    {dim.data.score || 0} / {dim.data.maxScore || 10} pts
                  </span>
                  <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                    ({pct}%)
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${dim.barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Explainable rationale */}
              <p className="text-[11px] text-slate-500 pl-9">
                {dim.data.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
