import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiArrowLeftLine,
  RiBuilding4Line,
  RiBriefcaseLine,
  RiCheckLine,
  RiCloseLine,
  RiSparklingLine,
  RiTimeLine,
  RiShieldCheckLine,
  RiDeleteBinLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import AtsScoreGauge from '../components/ats/AtsScoreGauge';
import AtsDimensionBreakdown from '../components/ats/AtsDimensionBreakdown';
import SkillGapTable from '../components/ats/SkillGapTable';
import ResumeImprovementWorkspace from '../components/ats/ResumeImprovementWorkspace';
import CrossModuleBridgeBar from '../components/ats/CrossModuleBridgeBar';
import { backendServerUrl } from '../App';

export default function AtsAnalysisReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await axios.get(`${backendServerUrl}/api/ats/analysis/${id}`, {
          withCredentials: true,
        });
        if (res.data?.success) {
          setAnalysis(res.data.analysis);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load ATS analysis report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handleUpdateImprovementStatus = async (itemType, itemId, status) => {
    try {
      const res = await axios.patch(
        `${backendServerUrl}/api/ats/analysis/${id}/improvement`,
        { itemType, itemId, status },
        { withCredentials: true }
      );
      if (res.data?.success) {
        setAnalysis((prev) => ({
          ...prev,
          resumeImprovements: res.data.resumeImprovements,
        }));
        toast.success(`Improvement suggestion ${status}`);
      }
    } catch (err) {
      toast.error('Failed to update improvement status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this ATS analysis? This cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${backendServerUrl}/api/ats/analysis/${id}`, {
        withCredentials: true,
      });
      toast.success('Analysis report deleted');
      navigate('/ats/history');
    } catch (err) {
      toast.error('Failed to delete analysis');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-base font-bold text-slate-800">Loading ATS Compatibility Report...</h2>
          <p className="text-xs text-slate-400 mt-1">Retrieving 7-dimension scoring breakdown and skill gaps.</p>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
            <RiCloseLine />
          </div>
          <h2 className="text-lg font-black text-slate-800 mb-2">Analysis Report Not Found</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'This report may have been deleted or belongs to another user.'}</p>
          <Link
            to="/ats"
            className="px-5 py-2.5 bg-yellow-400 text-slate-900 font-black rounded-xl text-xs"
          >
            Back to ATS Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { jobDetails, scoring, skillGaps, strengths, resumeImprovements, readinessReport } = analysis;
  const reqSkills = jobDetails?.extractedRequirements?.requiredTechnicalSkills || [];
  const prefSkills = jobDetails?.extractedRequirements?.preferredTechnicalSkills || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/ats"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer shadow-xs"
              title="Back to Dashboard"
            >
              <RiArrowLeftLine className="text-base" />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-yellow-100 text-yellow-800">
                  ATS Scorecard
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                {jobDetails?.jobTitle}
                {jobDetails?.companyName && (
                  <span className="text-slate-400 text-base font-normal">
                    at {jobDetails.companyName}
                  </span>
                )}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RiDeleteBinLine className="text-sm" />
              <span>Delete</span>
            </button>
            <Link
              to="/ats/new"
              className="px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black text-xs shadow-xs"
            >
              New Match
            </Link>
          </div>
        </div>

        {/* Top Summary Banner */}
        {readinessReport?.summary && (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0 mt-0.5">
              <RiSparklingLine />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-0.5">
                Executive Readiness Summary
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {readinessReport.summary}
              </p>
            </div>
          </div>
        )}

        {/* Score Gauge & 7-Dimension Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <AtsScoreGauge
              score={scoring?.overallScore || 0}
              matchCategory={scoring?.matchCategory || 'Moderate Match'}
            />
          </div>

          <div className="lg:col-span-2">
            <AtsDimensionBreakdown
              dimensionScores={scoring?.dimensionScores || {}}
            />
          </div>
        </div>

        {/* Required vs Preferred Skills Matrix */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="mb-5 pb-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-800">
              Requirements Coverage Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Extracted skills compared directly against job requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Required Skills */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-3">
                Mandatory Technical Skills ({reqSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {reqSkills.map((s, idx) => {
                  const isMissing = (skillGaps || []).some(
                    (g) => g.skill.toLowerCase() === s.toLowerCase() && g.importance === 'mandatory'
                  );
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        isMissing
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {isMissing ? <RiCloseLine /> : <RiCheckLine />}
                      <span>{s}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Preferred Skills */}
            <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-3">
                Preferred Nice-to-Have Skills ({prefSkills.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {prefSkills.map((s, idx) => {
                  const isMissing = (skillGaps || []).some(
                    (g) => g.skill.toLowerCase() === s.toLowerCase() && g.importance === 'preferred'
                  );
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 ${
                        isMissing
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {isMissing ? <RiCloseLine /> : <RiCheckLine />}
                      <span>{s}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Strengths Cards */}
        {strengths && strengths.length > 0 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
            <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
              <RiShieldCheckLine className="text-emerald-500" />
              Verified Candidate Strengths
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {strengths.map((str, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100">
                  <h4 className="font-bold text-slate-800 text-xs mb-1">{str.area}</h4>
                  <p className="text-xs text-slate-600 mb-2">{str.evidence}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold italic">
                    Why it matters: {str.relevanceToJob}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Gap Analysis Table */}
        <SkillGapTable gaps={skillGaps || []} />

        {/* Interactive Resume Improvement Workspace */}
        <ResumeImprovementWorkspace
          improvements={resumeImprovements || {}}
          onUpdateStatus={handleUpdateImprovementStatus}
        />

        {/* Cross-Module Bridge Action Bar */}
        <CrossModuleBridgeBar
          jobTitle={jobDetails?.jobTitle}
          companyName={jobDetails?.companyName}
          requiredSkills={reqSkills}
          missingSkills={skillGaps || []}
          analysisId={analysis._id}
        />
      </main>
    </div>
  );
}
