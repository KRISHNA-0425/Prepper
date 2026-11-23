import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCloseLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiCheckboxCircleLine,
  RiBookmark3Line,
  RiFileTextLine,
  RiSaveLine,
  RiSparklingLine,
} from 'react-icons/ri';

export default function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onSaveTask,
  isSaving,
}) {
  const [status, setStatus] = useState(task?.status || 'pending');
  const [notes, setNotes] = useState(task?.candidateNotes || '');

  useEffect(() => {
    if (task) {
      setStatus(task.status || 'pending');
      setNotes(task.candidateNotes || '');
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    onSaveTask(task.taskId, {
      status,
      candidateNotes: notes,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-poppins">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-white max-h-[90vh] overflow-y-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <RiCloseLine className="text-xl" />
          </button>

          {/* Header Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
              Day {task.dayNumber}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold capitalize bg-slate-800 text-slate-300 border border-slate-700">
              {task.category?.replace('_', ' ')}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              {task.priority} Priority
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <RiTimeLine className="text-slate-500" />
              {task.estimatedMinutes} Minutes
            </span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-4">
            {task.title}
          </h3>

          {/* Description */}
          <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs sm:text-sm text-slate-300 leading-relaxed">
            {task.description}
          </div>

          {/* Expected Outcome & Completion Criteria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs">
              <span className="font-bold text-yellow-400 flex items-center gap-1.5 mb-1.5">
                <RiSparklingLine /> Expected Outcome
              </span>
              <p className="text-slate-300 leading-relaxed">{task.expectedOutcome}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs">
              <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                <RiCheckboxCircleLine /> Completion Criteria
              </span>
              <p className="text-slate-300 leading-relaxed">{task.completionCriteria}</p>
            </div>
          </div>

          {/* Grounded Evidence Excerpt if present */}
          {task.evidence && (
            <div className="mb-6 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Original Interview Evidence Citation
                </span>
                <span className="text-cyan-400 text-[10px] font-bold">
                  {task.evidence.sourceType?.replace('_', ' ')}
                </span>
              </div>
              <p className="text-slate-300 italic">
                {task.evidence.evidenceExcerpt || task.evidence.identifiedFinding}
              </p>
            </div>
          )}

          {/* Candidate Notes Field */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <RiFileTextLine className="text-yellow-400" />
              Your Study Notes & Key Learnings
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record your code snippets, explanations, Big-O notes, or key reflections here..."
              className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/80 transition"
            />
          </div>

          {/* Status Selection and Save Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold mr-2">Status:</span>
              {['pending', 'in_progress', 'completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition cursor-pointer ${
                    status === st
                      ? (st === 'completed'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : (st === 'in_progress' ? 'bg-cyan-500 text-slate-950 font-black' : 'bg-yellow-400 text-slate-950 font-black'))
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-yellow-400/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RiSaveLine className="text-sm" />
                {isSaving ? 'Saving...' : 'Save Updates'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
