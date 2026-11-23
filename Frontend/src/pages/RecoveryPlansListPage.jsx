import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen bg-slate-950 text-white font-poppins selection:bg-yellow-400 selection:text-slate-950">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                Module 5
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Personalized Recovery Plans
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Track your day-by-day remediation roadmaps, review notes, and validate measurable score improvement.
            </p>
          </div>

          <Link
            to="/history"
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-yellow-400 border border-yellow-400/30 flex items-center gap-2 self-start sm:self-center transition shadow-md"
          >
            <RiHistoryLine />
            Select from Interview History
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Recovery Programs...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center max-w-md mx-auto">
            <p className="text-xs text-red-300 mb-3">{error}</p>
            <button
              onClick={fetchPlans}
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
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
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-xl flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {p.scheduleDurationDays}-Day Plan
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : (isInProgress ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700')
                      }`}>
                        {p.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">
                      {p.targetRole}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                      {p.overallAssessment}
                    </p>

                    {/* Progress bar */}
                    <div className="space-y-1.5 mb-5">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-emerald-400">{progress.completionPercentage}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
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
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      Baseline: <strong className="text-yellow-400">{p.reassessment?.originalScore ?? 0}/100</strong>
                    </span>

                    <Link
                      to={`/recovery-plans/${p._id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-yellow-400 hover:text-yellow-300 transition"
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
          <div className="p-12 sm:p-16 rounded-3xl bg-slate-900 border border-slate-800/80 text-center max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 flex items-center justify-center mx-auto text-3xl">
              <RiCompass3Line />
            </div>

            <h3 className="text-xl font-black text-white">No Recovery Plans Yet</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
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
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
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
