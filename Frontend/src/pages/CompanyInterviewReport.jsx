import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiBuilding4Line,
  RiArrowLeftLine,
  RiRoadMapLine,
  RiSparklingLine,
  RiCheckDoubleLine,
  RiAlertLine,
  RiFileTextLine,
  RiHistoryLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import CompanyReadinessCard from '../components/company/CompanyReadinessCard';
import RecoveryPlanSetupModal from '../components/recovery/RecoveryPlanSetupModal';
import { backendServerUrl } from '../App';

export default function CompanyInterviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  useEffect(() => {
    const fetchSessionReport = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get(
          `${backendServerUrl}/api/company-interview/session/${id}`,
          { withCredentials: true }
        );
        if (res.data?.success && res.data?.data) {
          setSession(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
        toast.error('Could not load company interview report.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessionReport();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-poppins text-white">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold">Assembling Company Readiness Scorecard...</h3>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-poppins text-white px-4">
        <p className="text-sm text-slate-400 mb-4">Report not found.</p>
        <Link
          to="/company-interview"
          className="px-4 py-2 rounded-xl bg-yellow-400 text-slate-950 font-bold text-xs"
        >
          Back to Company Prep
        </Link>
      </div>
    );
  }

  const companySim = session.companySimulation || {};
  const readiness = companySim.readinessAssessment || {};
  const readinessScore = readiness.readinessScore ?? session.overallScore ?? 75;
  const hireVerdict = readiness.hireVerdict || 'Hire';
  const fitLevel = readiness.fitLevel || 'Meets Expectations';

  return (
    <div className="min-h-screen bg-slate-950 text-white font-poppins pb-24 selection:bg-yellow-400 selection:text-slate-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            to="/company-interview"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
          >
            <RiArrowLeftLine />
            Back to Company Simulation Hub
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/company-interview/history"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition"
            >
              <RiHistoryLine className="text-yellow-400" />
              All Simulations
            </Link>

            <button
              type="button"
              onClick={() => setIsRecoveryModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <RiSparklingLine />
              Generate Recovery Plan
            </button>
          </div>
        </div>

        {/* Company Readiness Card */}
        <CompanyReadinessCard
          readinessScore={readinessScore}
          hireVerdict={hireVerdict}
          fitLevel={fitLevel}
          companyName={companySim.companyName || 'Target Company'}
          roundTitle={companySim.roundTitle || 'Technical Round'}
          strengths={readiness.strengths || []}
          gaps={readiness.gaps || []}
          cultureFeedback={readiness.cultureFitAssessment || ''}
          nextRoundRecommendation={readiness.nextRoundRecommendation || ''}
          onGenerateRecoveryPlan={() => setIsRecoveryModalOpen(true)}
        />

        {/* Question-by-Question Deep Dive */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <RiFileTextLine className="text-yellow-400" />
              Round Performance & Answers ({session.questions?.length || 0})
            </h3>
            <span className="text-xs text-slate-400">
              Evaluated against {companySim.companyName} rubrics
            </span>
          </div>

          <div className="space-y-4">
            {session.questions?.map((q, idx) => (
              <div
                key={idx}
                className="p-5 sm:p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4"
              >
                {/* Question Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400">
                      Q{idx + 1}.
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {q.competency || 'Technical Knowledge'}
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg text-xs font-black bg-slate-800 text-yellow-400 border border-yellow-400/20 self-start sm:self-auto">
                    Score: {q.score ?? 0} / 100
                  </div>
                </div>

                {/* Question Prompt */}
                <p className="text-sm sm:text-base font-medium text-slate-200">
                  {q.question}
                </p>

                {/* Candidate Answer */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-mono">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Your Response:
                  </span>
                  {q.candidateAnswer || <span className="text-slate-600 italic">No answer submitted.</span>}
                </div>

                {/* Qualitative Feedback */}
                {q.evaluation?.feedback && (
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <span className="font-bold text-slate-300">Feedback: </span>
                    {q.evaluation.feedback}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Module 5 Recovery Plan Bridge Card */}
        <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-slate-900 to-indigo-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                Module 5 Integration
              </span>
              <span className="text-xs text-emerald-400 font-semibold">
                Personalized Recovery Plan
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white">
              Bridge Identified Gaps for {companySim.companyName}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Generate a multi-day structured curriculum with actionable daily practice tasks, reference architectures, and targeted reassessments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsRecoveryModalOpen(true)}
            className="px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
          >
            <RiRoadMapLine className="text-base" />
            Create Recovery Plan
          </button>
        </section>

        {/* Module 5 Recovery Plan Modal */}
        <RecoveryPlanSetupModal
          isOpen={isRecoveryModalOpen}
          onClose={() => setIsRecoveryModalOpen(false)}
          interviewId={session._id}
          role={`${companySim.companyName || 'Company'} - ${companySim.targetDesignation || session.role || 'Software Engineer'}`}
          score={readinessScore}
        />
      </main>
    </div>
  );
}
