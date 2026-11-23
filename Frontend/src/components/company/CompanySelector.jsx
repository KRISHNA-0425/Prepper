import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  RiBuilding4Line,
  RiSearchLine,
  RiCheckLine,
  RiSparklingLine,
  RiGlobalLine,
} from 'react-icons/ri';

export default function CompanySelector({
  companies = [],
  selectedCompany,
  onSelectCompany,
  onCustomCompanySearch,
  isSearchingCustom,
}) {
  const [customInput, setCustomInput] = useState('');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customInput.trim()) {
      onCustomCompanySearch(customInput.trim());
    }
  };

  return (
    <div className="space-y-6 font-poppins">
      <div>
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <RiBuilding4Line className="text-yellow-600 dark:text-yellow-400 text-base" />
          1. Select or Search Target Company
        </label>

        {/* Custom Company Search Input */}
        <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-base" />
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Search or enter any company (e.g. Netflix, Meta, Uber, Stripe, Oracle, startup)..."
              className="h-11 w-full pl-10 pr-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 transition"
            />
          </div>
          <button
            type="submit"
            disabled={!customInput.trim() || isSearchingCustom}
            className="h-11 px-5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-yellow-400 border border-yellow-400/30 flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
          >
            {isSearchingCustom ? (
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <RiSparklingLine />
            )}
            Analyze
          </button>
        </form>
      </div>

      {/* Grid of Premier Companies */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {companies.map((comp) => {
          const isSelected = selectedCompany?.slug === comp.slug || selectedCompany?.name === comp.name;

          return (
            <motion.button
              key={comp.slug || comp.name}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectCompany(comp)}
              className={`p-4 rounded-xl text-left border transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-yellow-50 dark:bg-yellow-400/15 border-yellow-400 text-slate-950 dark:text-white shadow-md ring-1 ring-yellow-400/40'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg text-base ${isSelected ? 'bg-yellow-400 text-slate-950 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    <RiBuilding4Line />
                  </div>
                  {isSelected && <RiCheckLine className="text-yellow-600 dark:text-yellow-400 text-base" />}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 mb-0.5">
                  {comp.name}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{comp.industry || 'Technology'}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium">{comp.supportedRounds?.length || 3} Rounds</span>
                <span className="text-yellow-600 dark:text-yellow-400 font-bold">{comp.tier?.replace('Tier 1 ', '') || 'Tech'}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
