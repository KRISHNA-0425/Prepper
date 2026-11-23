import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiBuilding4Line,
  RiArrowLeftLine,
  RiHistoryLine,
  RiArrowRightLine,
  RiCalendarLine,
  RiSparklingLine,
  RiShieldCheckLine,
  RiThumbUpLine,
  RiAlertLine,
  RiCloseCircleLine,
  RiRoadMapLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import RecoveryPlanSetupModal from '../components/recovery/RecoveryPlanSetupModal';
import { backendServerUrl } from '../App';

export default function CompanyInterviewHistory() {
  const navigate = useNavigate();

  const [simulations, setSimulations] = useState([]);
  const [filterVerdict, setFilterVerdict] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Recovery Plan modal state
  const [selectedForRecovery, setSelectedForRecovery] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(
          `${backendServerUrl}/api/company-interview/history`,
          { withCredentials: true }
        );
        if (res.data?.success && res.data?.data) {
          setSimulations(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load company simulation history:', err);
        toast.error('Could not load simulation history.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'Strong Hire':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Hire':
        return 'bg-green-500/20 text-green-300 border-green-500/40';
      case 'Leaning Hire':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Leaning No Hire':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const filteredSimulations = simulations.filter((sim) => {
    if (filterVerdict === 'ALL') return true;
    const verdict = sim.companySimulation?.readinessAssessment?.hireVerdict || 'Hire';
    return verdict.toLowerCase().replace(/\s+/g, '_') === filterVerdict.toLowerCase();
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-poppins pb-24 selection:bg-yellow-400 selection:text-slate-950">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950">
                Module 6
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Performance Tracking
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Company Simulation History
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Track your interview readiness across target companies, roles, and interview rounds.
            </p>
          </div>

          <Link
            to="/company-interview"
            className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
          >
            <RiSparklingLine className="text-base" />
            New Simulation
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['ALL', 'strong_hire', 'hire', 'leaning_hire', 'leaning_no_hire', 'no_hire'].map((v) => {
            const label = v === 'ALL' ? 'All Verdicts' : v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const isActive = filterVerdict === v;

            return (
              <button
                key={v}
                type="button"
                onClick={() => setFilterVerdict(v)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isActive
                    ? 'bg-yellow-400 text-slate-950 border-yellow-400'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* History List */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400">Loading simulations...</p>
          </div>
        ) : filteredSimulations.length === 0 ? (
          <div className="p-12 rounded-3xl bg-slate-900/40 border border-slate-800 text-center space-y-3">
            <RiBuilding4Line className="text-4xl text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">No company simulations found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Simulate technical, behavioral, or system design interviews for companies like Google, Microsoft, and Amazon.
            </p>
            <div className="pt-2">
              <Link
                to="/company-interview"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-400 text-slate-950"
              >
                Launch First Simulation
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSimulations.map((sim) => {
              const comp = sim.companySimulation || {};
              const readiness = comp.readinessAssessment || {};
              const verdict = readiness.hireVerdict || 'Hire';
              const score = readiness.readinessScore ?? sim.overallScore ?? 70;

              return (
                <div
                  key={sim._id}
                  className="p-5 sm:p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between gap-4"
                >
                  <div>
                    {/* Top Row: Company & Date */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-400 border border-yellow-400/40">
                          {comp.companyName || 'Company'}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <RiCalendarLine />
                          {new Date(sim.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${getVerdictBadge(verdict)}`}>
                        {verdict}
                      </span>
                    </div>

                    {/* Role & Round */}
                    <h3 className="text-base font-bold text-white mb-1">
                      {comp.targetDesignation || sim.role || 'Software Engineer'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {comp.roundTitle || 'Technical Round'} • {comp.jobCategory || 'Engineering'}
                    </p>
                  </div>

                  {/* Bottom Stats & CTA */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">
                        Readiness Score
                      </span>
                      <span className="text-sm font-black text-yellow-400">
                        {Math.round(score)} / 100
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedForRecovery(sim)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition cursor-pointer flex items-center gap-1"
                      >
                        <RiRoadMapLine />
                        Plan
                      </button>

                      <Link
                        to={`/company-interview/report/${sim._id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center gap-1"
                      >
                        Report
                        <RiArrowRightLine />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Module 5 Recovery Plan Modal */}
        {selectedForRecovery && (
          <RecoveryPlanSetupModal
            isOpen={!!selectedForRecovery}
            onClose={() => setSelectedForRecovery(null)}
            interviewId={selectedForRecovery._id}
            role={`${selectedForRecovery.companySimulation?.companyName || 'Company'} - ${selectedForRecovery.companySimulation?.targetDesignation || selectedForRecovery.role || 'Software Engineer'}`}
            score={selectedForRecovery.companySimulation?.readinessAssessment?.readinessScore ?? selectedForRecovery.overallScore ?? 75}
          />
        )}
      </main>
    </div>
  );
}
