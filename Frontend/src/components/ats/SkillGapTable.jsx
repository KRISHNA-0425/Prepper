import React from 'react';
import { RiAlertLine, RiLightbulbLine, RiFileWarningLine } from 'react-icons/ri';

export default function SkillGapTable({ gaps = [] }) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs text-center">
        <p className="text-sm font-bold text-slate-700">No critical skill gaps identified!</p>
        <p className="text-xs text-slate-400 mt-1">Your resume demonstrates coverage across the target job requirements.</p>
      </div>
    );
  }

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'High':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <RiAlertLine className="text-amber-500" />
            Targeted Skill Gap Analysis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Prioritized technologies and competencies missing or weakly documented relative to the job requirements.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
          {gaps.length} Gaps Found
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="pb-3 pr-4">Skill</th>
              <th className="pb-3 px-3">Type</th>
              <th className="pb-3 px-3">Priority</th>
              <th className="pb-3 px-4">Why It Matters</th>
              <th className="pb-3 pl-4">Suggested Practical Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gaps.map((gap, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 pr-4 font-bold text-slate-800">
                  {gap.skill}
                </td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold uppercase text-[10px] ${
                      gap.importance === 'mandatory'
                        ? 'bg-red-100 text-red-800'
                        : gap.importance === 'preferred'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {gap.importance || 'preferred'}
                  </span>
                </td>
                <td className="py-3.5 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${getPriorityStyle(
                      gap.impactPriority
                    )}`}
                  >
                    {gap.impactPriority}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600 max-w-xs leading-relaxed">
                  {gap.whyItMatters}
                </td>
                <td className="py-3.5 pl-4 text-slate-700 max-w-sm">
                  <div className="flex items-start gap-1.5 bg-amber-50/60 p-2 rounded-xl border border-amber-100/80">
                    <RiLightbulbLine className="text-amber-600 shrink-0 mt-0.5 text-xs" />
                    <span className="text-[11px] leading-tight text-slate-700">
                      {gap.suggestedActivity}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
