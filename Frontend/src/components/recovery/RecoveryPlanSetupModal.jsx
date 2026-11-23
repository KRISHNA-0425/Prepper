import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCalendarCheckLine, RiTimeLine, RiCloseLine, RiSparklingLine, RiRoadMapLine, RiCheckLine } from 'react-icons/ri';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { backendServerUrl } from '../../App';

export default function RecoveryPlanSetupModal({
  isOpen,
  onClose,
  interviewId,
  role = 'Software Engineer',
  score = 0,
}) {
  const navigate = useNavigate();
  const [duration, setDuration] = useState(14);
  const [dailyMinutes, setDailyMinutes] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const durationOptions = [
    { days: 7, label: '7-Day Sprint', desc: 'High-intensity review of critical failure modes and blockers.' },
    { days: 14, label: '14-Day Balanced', desc: 'Optimal blend of foundational theory, coding drills & tradeoffs.' },
    { days: 30, label: '30-Day Mastery', desc: 'Comprehensive curriculum with spaced repetition and deep drills.' },
  ];

  const timeOptions = [
    { minutes: 30, label: '30 mins/day', desc: 'Focused single drill' },
    { minutes: 45, label: '45 mins/day', desc: 'Recommended balance' },
    { minutes: 60, label: '60 mins/day', desc: 'Theory + code drill' },
    { minutes: 90, label: '90 mins/day', desc: 'Deep immersion' },
  ];

  const handleGenerate = async () => {
    if (!interviewId) {
      toast.error('Missing interview session reference');
      return;
    }

    try {
      setIsGenerating(true);
      const res = await axios.post(
        `${backendServerUrl}/api/recovery-plans/generate`,
        {
          interviewId,
          scheduleDurationDays: duration,
          dailyStudyMinutes: dailyMinutes,
        },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.plan) {
        toast.success(res.data.isExisting ? 'Retrieved your recovery plan' : 'Recovery plan generated!');
        onClose();
        navigate(`/recovery-plans/${res.data.plan._id}`);
      } else {
        toast.error(res.data?.message || 'Failed to generate recovery plan');
      }
    } catch (err) {
      console.error('Error generating recovery plan:', err);
      toast.error(err.response?.data?.message || 'Failed to generate recovery plan');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700/80 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white font-poppins transition-colors duration-200"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer select-none"
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-yellow-400/10 dark:bg-yellow-400/10 border border-yellow-400/40 rounded-xl text-yellow-600 dark:text-yellow-400">
              <RiRoadMapLine className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Personalized Interview Recovery Plan
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Turn your interview evaluation into a structured, evidence-grounded study roadmap.
              </p>
            </div>
          </div>

          {/* Context pill */}
          <div className="mb-6 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Target Role: <strong className="text-slate-900 dark:text-white">{role}</strong></span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Evaluation Baseline: <strong className="text-yellow-600 dark:text-yellow-400">{score}/100</strong></span>
          </div>

          {/* Duration Selector */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <RiCalendarCheckLine className="text-yellow-600 dark:text-yellow-400" />
              1. Choose Schedule Duration
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {durationOptions.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDuration(opt.days)}
                  className={`p-3.5 rounded-xl text-left border transition cursor-pointer ${
                    duration === opt.days
                      ? 'bg-yellow-50 dark:bg-yellow-400/15 border-yellow-400 text-slate-950 dark:text-white shadow-md ring-1 ring-yellow-400/40'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{opt.label}</span>
                    {duration === opt.days && <RiCheckLine className="text-yellow-600 dark:text-yellow-400" />}
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Study Time Selector */}
          <div className="mb-8">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <RiTimeLine className="text-cyan-600 dark:text-cyan-400" />
              2. Select Daily Study Commitment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {timeOptions.map((t) => (
                <button
                  key={t.minutes}
                  type="button"
                  onClick={() => setDailyMinutes(t.minutes)}
                  className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                    dailyMinutes === t.minutes
                      ? 'bg-cyan-50 dark:bg-cyan-500/15 border-cyan-400 text-slate-950 dark:text-white shadow-md ring-1 ring-cyan-400/40'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">{t.label}</span>
                    {dailyMinutes === t.minutes && <RiCheckLine className="text-cyan-600 dark:text-cyan-400 text-xs" />}
                  </div>
                  <p className="text-[10px] opacity-75">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-11 px-6 rounded-xl text-xs font-black uppercase tracking-wider bg-[#F7D63A] hover:bg-[#ffe04d] text-slate-950 transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 border border-yellow-400/80"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Synthesizing Curriculum...
                </>
              ) : (
                <>
                  <RiSparklingLine className="text-base text-slate-950" />
                  Generate Recovery Plan
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
