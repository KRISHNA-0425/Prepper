import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  RiArrowLeftLine,
  RiAwardLine,
  RiRoadMapLine,
  RiRefreshLine,
  RiHistoryLine,
} from 'react-icons/ri';
import { backendServerUrl } from '../App';
import Navbar from '../components/Navbar';
import RecoveryPlanOverview from '../components/recovery/RecoveryPlanOverview';
import DailyTaskList from '../components/recovery/DailyTaskList';
import TaskDetailModal from '../components/recovery/TaskDetailModal';
import ReassessmentModal from '../components/recovery/ReassessmentModal';

export default function RecoveryPlanDashboard() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isStarting, setIsStarting] = useState(false);

  // Modals state
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const [isReassessmentOpen, setIsReassessmentOpen] = useState(false);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${backendServerUrl}/api/recovery-plans/${planId}`, {
        withCredentials: true,
      });
      if (res.data?.success && res.data?.plan) {
        setPlan(res.data.plan);
      } else {
        setError(res.data?.message || 'Failed to load recovery plan');
      }
    } catch (err) {
      console.error('Error fetching recovery plan:', err);
      setError(err.response?.data?.message || 'Error loading recovery plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (planId) {
      fetchPlan();
    }
  }, [planId]);

  const handleStartPlan = async () => {
    try {
      setIsStarting(true);
      const res = await axios.patch(
        `${backendServerUrl}/api/recovery-plans/${planId}/start`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.plan) {
        setPlan(res.data.plan);
        toast.success('Recovery plan activated! Let us crush these goals.');
      }
    } catch (err) {
      console.error('Error starting plan:', err);
      toast.error(err.response?.data?.message || 'Failed to start recovery plan');
    } finally {
      setIsStarting(false);
    }
  };

  const handleToggleTaskStatus = async (task, targetStatus) => {
    try {
      setUpdatingTaskId(task.taskId);
      const res = await axios.patch(
        `${backendServerUrl}/api/recovery-plans/${planId}/tasks/${task.taskId}`,
        { status: targetStatus },
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.plan) {
        setPlan(res.data.plan);
        toast.success(`Task marked as ${targetStatus.replace('_', ' ')}`);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleSaveTaskDetails = async (taskId, { status, candidateNotes }) => {
    try {
      setIsSavingTask(true);
      const res = await axios.patch(
        `${backendServerUrl}/api/recovery-plans/${planId}/tasks/${taskId}`,
        { status, candidateNotes },
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.plan) {
        setPlan(res.data.plan);
        setIsTaskModalOpen(false);
        toast.success('Task details and notes updated');
      }
    } catch (err) {
      console.error('Error saving task:', err);
      toast.error(err.response?.data?.message || 'Failed to save task updates');
    } finally {
      setIsSavingTask(false);
    }
  };

  const isReassessmentEligible =
    plan &&
    (plan.progress?.completionPercentage >= 50 ||
      plan.status === 'completed' ||
      plan.reassessment?.status === 'ready' ||
      plan.reassessment?.status === 'in_progress' ||
      plan.reassessment?.status === 'completed');

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-slate-950 text-slate-800 dark:text-white font-poppins selection:bg-yellow-400 selection:text-slate-950 transition-colors duration-200">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            to="/recovery-plans"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
          >
            <RiArrowLeftLine className="text-sm" />
            Back to Recovery Plans
          </Link>

          <div className="flex items-center gap-2">
            {isReassessmentEligible && (
              <button
                type="button"
                onClick={() => setIsReassessmentOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 hover:brightness-110 active:scale-95 transition shadow-lg shadow-emerald-400/20 flex items-center gap-1.5 cursor-pointer"
              >
                <RiAwardLine className="text-base" />
                {plan.reassessment?.status === 'completed' ? 'View Reassessment Results' : 'Take Reassessment'}
              </button>
            )}

            <button
              type="button"
              onClick={fetchPlan}
              className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-xs"
              title="Refresh"
            >
              <RiRefreshLine />
            </button>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="p-16 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-bold uppercase tracking-wider">Loading Recovery Roadmap...</p>
          </div>
        )}

        {error && (
          <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center max-w-lg mx-auto">
            <h4 className="font-bold text-white mb-2">Unable to load recovery plan</h4>
            <p className="text-xs text-red-300 mb-4">{error}</p>
            <Link
              to="/recovery-plans"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition"
            >
              Return to Plan List
            </Link>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && plan && (
          <div className="space-y-8">
            <RecoveryPlanOverview
              plan={plan}
              onStartPlan={handleStartPlan}
              isStarting={isStarting}
            />

            <DailyTaskList
              tasks={plan.tasks || []}
              scheduleDurationDays={plan.scheduleDurationDays || 14}
              updatingTaskId={updatingTaskId}
              onToggleStatus={handleToggleTaskStatus}
              onTaskClick={(task) => {
                setSelectedTask(task);
                setIsTaskModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Task Detail Modal */}
        <TaskDetailModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          task={selectedTask}
          onSaveTask={handleSaveTaskDetails}
          isSaving={isSavingTask}
        />

        {/* Reassessment Modal */}
        <ReassessmentModal
          isOpen={isReassessmentOpen}
          onClose={() => setIsReassessmentOpen(false)}
          plan={plan}
          onReassessmentUpdated={(updatedPlan) => setPlan(updatedPlan)}
        />
      </main>
    </div>
  );
}
