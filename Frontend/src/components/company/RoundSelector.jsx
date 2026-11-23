import React from 'react';
import { motion } from 'framer-motion';
import {
  RiGitMergeLine,
  RiTimeLine,
  RiCheckLine,
  RiSparklingLine,
  RiCodeSSlashLine,
  RiServerLine,
  RiChat1Line,
  RiLightbulbLine,
} from 'react-icons/ri';

export default function RoundSelector({
  rounds = [],
  selectedRound,
  onSelectRound,
  recommendedRoundId,
}) {
  const getFormatBadge = (format) => {
    switch (format) {
      case 'coding':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <RiCodeSSlashLine /> Coding
          </span>
        );
      case 'system_design':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <RiServerLine /> System Design
          </span>
        );
      case 'behavioral':
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <RiChat1Line /> Behavioral
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-400/15 text-yellow-300 border border-yellow-400/30">
            <RiLightbulbLine /> Conceptual
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-poppins">
      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <RiGitMergeLine className="text-yellow-400 text-base" />
        3. Select Interview Round
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rounds.map((round) => {
          const isSelected = selectedRound === round.roundId;
          const isRecommended = recommendedRoundId === round.roundId;

          return (
            <motion.button
              key={round.roundId}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectRound(round.roundId)}
              className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-yellow-400/15 border-yellow-400 text-white shadow-lg shadow-yellow-400/10 ring-1 ring-yellow-400/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {getFormatBadge(round.format)}
                    {isRecommended && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950">
                        <RiSparklingLine /> Recommended
                      </span>
                    )}
                  </div>
                  {isSelected && <RiCheckLine className="text-yellow-400 text-base" />}
                </div>

                <h4 className="font-bold text-sm text-white mb-1.5">
                  {round.name}
                </h4>

                <div className="flex flex-wrap gap-1 mb-3">
                  {round.focusAreas?.slice(0, 3).map((f, i) => (
                    <span
                      key={i}
                      className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <RiTimeLine className="text-slate-500" />
                  {round.recommendedDuration} mins
                </span>
                <span className="font-semibold text-slate-300">
                  {round.typicalQuestionCount} Questions
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
