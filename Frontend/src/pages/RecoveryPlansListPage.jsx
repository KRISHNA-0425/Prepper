import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  RiRoadMapLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiArrowRightLine,
  RiHistoryLine,
  RiAddLine,
  RiAwardLine,
  RiCompass3Line,
} from 'react-icons/ri';
import { backendServerUrl } from '../App';
import Navbar from '../components/Navbar';

export default function RecoveryPlansListPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const atsBridgeData = location.state?.sourceType === 'ats_analysis' ? location.state : null;

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${backendServerUrl}/api/recovery-plans`, {
        withCredentials: true,
      });
      if (res.data?.success) {
        setPlans(res.data.plans || []);
      }
    } catch (err) {
      console.error('Error fetching recovery plans:', err);
      setError(err.response?.data?.message || 'Failed to load recovery plans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-poppins selection:bg-yellow-400 selection:text-slate-950 transition-colors duration-200">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-yellow-100 text-yellow-900 dark:bg-yellow-400/15 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-400/30">
                Module 5
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Personalized Recovery Plans
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Track your day-by-day remediation roadmaps, review notes, and validate measurable score improvement.
            </p>
          </div>

          <Link
            to="/history"
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-yellow-400 border border-slate-200 dark:border-yellow-400/30 flex items-center gap-2 self-start sm:self-center transition shadow-sm cursor-pointer"
          >
            <RiHistoryLine />
            Select from Interview History
          </Link>
        </div>

        {/* ATS Bridge Active Banner */}
        {atsBridgeData && (
          <div className="mb-8 p-5 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                ATS Analysis Bridge Active
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Remediating gaps for: {atsBridgeData.prefillRole}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {atsBridgeData.weaknesses?.length || 0} missing technical requirements identified in your ATS report.
              </p>
            </div>
            <Link
              to="/history"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition"
            >
              Select Interview Session to Link
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Recovery Programs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-center max-w-md mx-auto">
            <p className="text-xs text-red-600 dark:text-red-300 mb-3">{error}</p>
            <button
              onClick={fetchPlans}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {!loading && !error && plans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {plans.map((p) => {
              const progress = p.progress || { completionPercentage: 0, completedTasks: 0, totalTasks: 0 };
              const isCompleted = p.status === 'completed';
              const isInProgress = p.status === 'in_progress';

              return (
                <motion.div
                  key={p._id}
                  whileHover={{ y: -4 }}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {p.scheduleDurationDays}-Day Plan
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                          : (isInProgress ? 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700')
                      }`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-1">
                      {p.targetRole}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {p.overallAssessment}
                    </p>

                    {/* Progress bar */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500 dark:text-slate-400">Progress</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{progress.completionPercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-emerald-400"
                          style={{ width: `${progress.completionPercentage}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-500 text-right">
                        {progress.completedTasks} of {progress.totalTasks} Tasks Completed
                      </div>
                    </div>
                  </div>

                  {/* Card Action Link */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Baseline: <strong className="text-yellow-600 dark:text-yellow-400">{p.reassessment?.originalScore ?? 0}/100</strong>
                    </span>

                    <Link
                      to={`/recovery-plans/${p._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-400 hover:text-yellow-500 transition"
                    >
                      Open Plan <RiArrowRightLine />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && plans.length === 0 && (
          <div className="p-12 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 text-center max-w-xl mx-auto space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mx-auto text-3xl">
              <RiCompass3Line />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">No Recovery Plans Yet</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Complete an interview session or select an existing evaluated interview from your history to generate a personalized recovery roadmap.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                to="/history"
                className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-400 text-slate-950 hover:bg-yellow-300 transition shadow-lg shadow-yellow-400/20"
              >
                Browse Interview History
              </Link>
              <Link
                to="/interview"
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
              >
                Start New Interview
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
