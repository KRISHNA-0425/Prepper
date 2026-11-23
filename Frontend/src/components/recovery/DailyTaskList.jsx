import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiCheckLine,
  RiTimeLine,
  RiFilter3Line,
  RiFlagLine,
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiServerLine,
  RiFlashlightLine,
  RiRefreshLine,
  RiArrowRightSLine,
} from 'react-icons/ri';

export default function DailyTaskList({
  tasks = [],
  scheduleDurationDays = 14,
  onTaskClick,
  onToggleStatus,
  updatingTaskId,
}) {
  const [selectedDay, setSelectedDay] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (selectedDay !== 'all' && t.dayNumber !== Number(selectedDay)) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    return true;
  });

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'coding_practice':
        return <RiCodeSSlashLine className="text-indigo-400" />;
      case 'system_design':
        return <RiServerLine className="text-cyan-400" />;
      case 'mock_drill':
        return <RiFlashlightLine className="text-yellow-400" />;
      case 'revision':
        return <RiRefreshLine className="text-emerald-400" />;
      default:
        return <RiBookOpenLine className="text-amber-400" />;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">High</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-700/50 text-slate-400 border border-slate-600/40">Low</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</span>;
    }
  };

  return (
    <div className="space-y-5 font-poppins">
      {/* Header and Filter Controls */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <RiFilter3Line className="text-yellow-400 text-lg" />
            <h3 className="font-bold text-base text-white">Daily Tasks & Milestones</h3>
            <span className="text-xs text-slate-400 font-semibold ml-2">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>

          {/* Quick Status Pill Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['all', 'pending', 'in_progress', 'completed'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-lg font-bold capitalize transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-yellow-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Day Carousel / Button Group */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
          <button
            type="button"
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              selectedDay === 'all'
                ? 'bg-white text-slate-900'
                : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            All Days ({scheduleDurationDays})
          </button>
          {Array.from({ length: scheduleDurationDays }, (_, i) => i + 1).map((day) => {
            const dayTasks = tasks.filter((t) => t.dayNumber === day);
            const isAllDayCompleted = dayTasks.length > 0 && dayTasks.every((t) => t.status === 'completed');

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(String(day))}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  selectedDay === String(day)
                    ? 'bg-yellow-400 text-slate-950 font-black'
                    : (isAllDayCompleted ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white')
                }`}
              >
                <span>Day {day}</span>
                {isAllDayCompleted && <RiCheckLine className="text-xs" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task Cards List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => {
              const isUpdating = updatingTaskId === task.taskId;
              const isCompleted = task.status === 'completed';
              const isInProgress = task.status === 'in_progress';

              return (
                <motion.div
                  layout
                  key={task.taskId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer ${
                    isCompleted
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 opacity-80'
                      : (isInProgress
                          ? 'bg-slate-900 border-cyan-500/40 shadow-lg shadow-cyan-500/5'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md')
                  }`}
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        Day {task.dayNumber}
                      </span>
                      {getPriorityBadge(task.priority)}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 capitalize">
                        {getCategoryIcon(task.category)}
                        {task.category.replace('_', ' ')}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                        <RiTimeLine className="text-slate-500" />
                        {task.estimatedMinutes} min
                      </span>
                    </div>

                    <h4 className={`text-base font-bold tracking-tight ${isCompleted ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {task.title}
                    </h4>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>

                    {task.relatedWeaknessTopic && (
                      <div className="text-[11px] font-semibold text-yellow-400/90 flex items-center gap-1 pt-1">
                        <RiFlagLine className="text-xs shrink-0" />
                        Targets: <span>{task.relatedWeaknessTopic}</span>
                      </div>
                    )}
                  </div>

                  {/* Task Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onToggleStatus(task, isCompleted ? 'pending' : 'completed')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : (isInProgress
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700')
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <RiCheckLine className="text-sm font-black" />
                          Done
                        </>
                      ) : (isInProgress ? 'In Progress' : 'Mark Done')}
                    </button>

                    <button
                      type="button"
                      onClick={() => onTaskClick(task)}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                      title="View Details"
                    >
                      <RiArrowRightSLine className="text-base" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
              <RiBookOpenLine className="text-3xl text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-300">No tasks match your filter</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the day or status filters above.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
