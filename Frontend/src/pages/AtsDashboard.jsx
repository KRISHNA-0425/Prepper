import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  RiFileSearchLine,
  RiAddLine,
  RiHistoryLine,
  RiCoinsLine,
  RiArrowRightLine,
  RiCheckLine,
  RiBuilding4Line,
  RiSparklingLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import { backendServerUrl } from '../App';

export default function AtsDashboard() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        const res = await axios.get(`${backendServerUrl}/api/ats/analyses?limit=5`, {
          withCredentials: true,
        });
        if (res.data?.success) {
          setAnalyses(res.data.analyses || []);
        }
      } catch (err) {
        console.error('Failed to load ATS analyses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
  }, []);

  const totalAnalyses = analyses.length;
  const avgScore =
    totalAnalyses > 0
      ? Math.round(analyses.reduce((acc, a) => acc + (a.scoring?.overallScore || 0), 0) / totalAnalyses)
      : null;

  const getBadgeStyle = (category) => {
    switch (category) {
      case 'Excellent Match':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Strong Match':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Moderate Match':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Weak Match':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-red-100 text-red-800 border-red-300';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-poppins">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                Module 7
              </span>
              <span className="text-xs font-bold text-slate-400">
                Resume-to-Job ATS Intelligence
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
              ATS Compatibility & Application Intelligence
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
              Match your resume against exact job descriptions, discover prioritized skill gaps, and get grounded, non-hallucinated bullet rewrites.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/ats/history"
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <RiHistoryLine className="text-sm" />
              <span>History</span>
            </Link>
            <Link
              to="/ats/new"
              className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <RiAddLine className="text-base" />
              <span>New Job Match</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0">
              <RiFileSearchLine />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Analyses Run</p>
              <p className="text-2xl font-black text-slate-800">{totalAnalyses}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0">
              <RiSparklingLine />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Average ATS Score</p>
              <p className="text-2xl font-black text-slate-800">
                {avgScore !== null ? `${avgScore}%` : '—'}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center text-2xl shrink-0">
              <RiCoinsLine />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Available Credits</p>
              <p className="text-2xl font-black text-slate-800">{userData?.credits ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Recent Analyses & Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent List */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-base">
                Recent Job Matches
              </h3>
              {analyses.length > 0 && (
                <Link to="/ats/history" className="text-xs font-bold text-blue-600 hover:underline">
                  View all
                </Link>
              )}
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading your ATS analyses...
              </div>
            ) : analyses.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl mx-auto mb-3">
                  <RiFileSearchLine />
                </div>
                <p className="font-bold text-slate-700 text-sm">No job matches run yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                  Upload your resume and paste a target job description to compute your ATS compatibility score.
                </p>
                <Link
                  to="/ats/new"
                  className="px-4 py-2 bg-yellow-400 text-slate-900 font-black rounded-xl text-xs inline-flex items-center gap-1 shadow-xs"
                >
                  <RiAddLine /> Match Your First Job
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.map((item) => (
                  <div
                    key={item._id}
                    onClick={() => navigate(`/ats/analysis/${item._id}`)}
                    className="p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                          {item.jobDetails?.jobTitle}
                        </span>
                        {item.jobDetails?.companyName && (
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <RiBuilding4Line className="text-slate-400" />
                            {item.jobDetails.companyName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.resumeId?.originalFileName || 'Resume'} •{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-black text-slate-800 text-base">
                          {item.scoring?.overallScore}%
                        </span>
                        <span
                          className={`block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border mt-0.5 ${getBadgeStyle(
                            item.scoring?.matchCategory
                          )}`}
                        >
                          {item.scoring?.matchCategory}
                        </span>
                      </div>
                      <RiArrowRightLine className="text-slate-300 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ATS Optimization Guide */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400 block mb-1">
                ATS Architecture
              </span>
              <h3 className="font-black text-base mb-3">
                How Prepper ATS Evaluates
              </h3>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <RiCheckLine className="text-emerald-400 shrink-0 mt-0.5 text-sm" />
                  <span>
                    <strong>7-Dimension Scoring</strong>: Mandatory skills (30%), experience (20%), projects (15%), preferred skills (10%), responsibilities (10%), keywords (10%), education (5%).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <RiCheckLine className="text-emerald-400 shrink-0 mt-0.5 text-sm" />
                  <span>
                    <strong>Zero Hallucinations</strong>: We improve bullets and summaries strictly using verified resume facts without inventing fake metrics.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <RiCheckLine className="text-emerald-400 shrink-0 mt-0.5 text-sm" />
                  <span>
                    <strong>Cross-Module Bridges</strong>: Seamlessly bridge missing skills into Module 5 Recovery Plans and Module 6 Company Simulations.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60">
              <Link
                to="/ats/new"
                className="w-full py-2.5 bg-yellow-400 text-slate-900 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>Start New Analysis</span>
                <RiArrowRightLine />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
