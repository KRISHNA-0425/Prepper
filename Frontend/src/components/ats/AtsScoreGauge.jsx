import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { RiInformationLine, RiShieldCheckLine } from 'react-icons/ri';

export default function AtsScoreGauge({ score = 0, matchCategory = 'Moderate Match' }) {
  const getScoreColor = (val) => {
    if (val >= 85) return '#10B981'; // Emerald 500
    if (val >= 70) return '#059669'; // Green 600
    if (val >= 55) return '#F59E0B'; // Amber 500
    if (val >= 40) return '#F97316'; // Orange 500
    return '#EF4444'; // Red 500
  };

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'Excellent Match':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Strong Match':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate Match':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Weak Match':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  const primaryColor = getScoreColor(score);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col items-center text-center relative overflow-hidden">
      <div className="w-40 h-40 sm:w-48 sm:h-48 relative mb-4">
        <CircularProgressbar
          value={score}
          text={`${score}%`}
          styles={buildStyles({
            pathColor: primaryColor,
            textColor: '#1E293B',
            trailColor: '#F1F5F9',
            textSize: '22px',
            strokeLinecap: 'round',
          })}
        />
      </div>

      <div className="flex flex-col items-center">
        <span className={`px-4 py-1 rounded-full text-xs font-black tracking-wide uppercase border mb-2 ${getBadgeStyle(matchCategory)}`}>
          {matchCategory}
        </span>
        <h3 className="text-lg font-black text-slate-800 mb-1">
          ATS Compatibility Score
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Calculated via weighted 7-dimension evaluation comparing your resume against mandatory and preferred job criteria.
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <RiInformationLine className="shrink-0 text-slate-400 text-sm" />
        <span>Algorithm alignment metric. Does not guarantee interview shortlisting.</span>
      </div>
    </div>
  );
}
