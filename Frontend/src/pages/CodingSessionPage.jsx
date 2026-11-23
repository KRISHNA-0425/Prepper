import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { IoArrowBackOutline } from 'react-icons/io5';
import { RiCodeSSlashLine, RiCheckDoubleLine } from 'react-icons/ri';
import { backendServerUrl } from '../App';
import CodingWorkspace from '../components/coding/CodingWorkspace';

export default function CodingSessionPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [sessionData, setSessionData] = useState(() => location.state?.sessionData || null);
  const [loading, setLoading] = useState(() => !location.state?.sessionData);
  const [error, setError] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);

  // Fetch session data if not available in navigation state (e.g. user refreshed)
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${backendServerUrl}/api/interview/session/${sessionId}`, {
        withCredentials: true,
      });
      setSessionData(res.data);
    } catch (err) {
      console.error('Failed to load coding session:', err);
      const msg = err.response?.data?.message || 'Failed to retrieve active coding interview session.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionData) {
      fetchSession();
    }
  }, [sessionData, fetchSession]);

  const handleFinishInterview = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    const toastId = toast.loading('Finalizing coding evaluation & compiling report...');

    try {
      await axios.post(
        `${backendServerUrl}/api/interview/finish`,
        { interviewId: sessionId },
        { withCredentials: true }
      );
      toast.dismiss(toastId);
      toast.success('Interview completed!');
      navigate(`/report/${sessionId}`);
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error finalizing interview:', err);
      // Navigate to report anyway if report exists
      navigate(`/report/${sessionId}`);
    } finally {
      setIsFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center font-poppins text-white space-y-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading your coding interview environment...</p>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-poppins">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-red-950/60 border border-red-800/60 rounded-2xl flex items-center justify-center mx-auto text-red-400 text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-100">Session Not Found</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to retrieve this coding session.'}</p>
          <button
            onClick={() => navigate('/coding')}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Create New Coding Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col overflow-hidden font-poppins">
      {/* Top Header Bar */}
      <header className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to exit? Your submissions are saved.')) {
                navigate('/coding');
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            <IoArrowBackOutline className="text-sm" />
            <span className="hidden sm:inline">Exit Session</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <RiCodeSSlashLine className="text-indigo-400 text-sm" />
            <span className="text-xs font-bold text-slate-200 truncate max-w-[200px] sm:max-w-xs">
              {sessionData.role || 'Live Coding Interview'}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 hidden md:inline">
              Active Round
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFinishInterview}
            disabled={isFinishing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-lg shadow-md transition disabled:opacity-50 cursor-pointer"
          >
            <RiCheckDoubleLine className="text-sm" />
            <span>Finish Interview</span>
          </button>
        </div>
      </header>

      {/* Main Coding Workspace */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodingWorkspace
          interviewId={sessionId}
          problems={sessionData.codingProblems || []}
          initialLanguage={sessionData.codingLanguage || 'javascript'}
          durationMinutes={sessionData.selectedDurationMinutes}
          expiresAt={sessionData.expiresAt}
          onFinishInterview={handleFinishInterview}
        />
      </div>
    </div>
  );
}
