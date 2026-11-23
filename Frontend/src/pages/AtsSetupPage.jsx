import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiFileSearchLine,
  RiCoinsLine,
  RiSparklingLine,
  RiArrowRightLine,
  RiInformationLine,
  RiBuilding4Line,
  RiBriefcaseLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import ResumeUploadDropzone from '../components/ats/ResumeUploadDropzone';
import { backendServerUrl } from '../App';

export default function AtsSetupPage() {
  const { userData } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [rawJobDescription, setRawJobDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [pastResumes, setPastResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const res = await axios.get(`${backendServerUrl}/api/ats/resumes`, {
          withCredentials: true,
        });
        if (res.data?.success && res.data.resumes?.length > 0) {
          setPastResumes(res.data.resumes);
        }
      } catch (err) {
        // Non-blocking
      }
    };
    fetchResumes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file && !selectedResumeId) {
      toast.error('Please upload a resume file or select an existing one.');
      return;
    }
    if (!jobTitle.trim()) {
      toast.error('Please enter the target job title.');
      return;
    }
    if (!rawJobDescription.trim()) {
      toast.error('Please paste the job description text.');
      return;
    }

    if ((userData?.credits ?? 0) < 10) {
      toast.error('You need at least 10 credits to run an ATS analysis. Please reload credits.');
      navigate('/pricing');
      return;
    }

    setLoading(true);
    setLoadingStep('Uploading and parsing document structure...');

    try {
      let finalAnalysisId = null;

      if (file) {
        // Direct upload & analyze
        setLoadingStep('Evaluating resume against job requirements...');
        const formData = new FormData();
        formData.append('resume', file);
        formData.append('jobTitle', jobTitle.trim());
        formData.append('companyName', companyName.trim());
        formData.append('rawJobDescription', rawJobDescription.trim());

        const res = await axios.post(`${backendServerUrl}/api/ats/analyze-direct`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        });

        if (res.data?.success) {
          finalAnalysisId = res.data.analysis?._id;
        }
      } else {
        // Use existing resume
        setLoadingStep('Analyzing job criteria & computing ATS score...');
        const res = await axios.post(
          `${backendServerUrl}/api/ats/analyze`,
          {
            resumeId: selectedResumeId,
            jobTitle: jobTitle.trim(),
            companyName: companyName.trim(),
            rawJobDescription: rawJobDescription.trim(),
          },
          { withCredentials: true }
        );

        if (res.data?.success) {
          finalAnalysisId = res.data.analysis?._id;
        }
      }

      if (finalAnalysisId) {
        toast.success('ATS analysis completed successfully!');
        navigate(`/ats/analysis/${finalAnalysisId}`);
      }
    } catch (err) {
      console.error('Error running ATS analysis:', err);
      toast.error(err.response?.data?.message || 'Failed to complete ATS analysis.');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f4] dark:bg-slate-950 flex flex-col font-poppins transition-colors duration-200">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-100 text-yellow-800 dark:bg-yellow-400/15 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-400/30">
              Module 7 Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white">
            Configure ATS Job Compatibility Match
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload your resume and provide target job details to generate an evidence-based match scorecard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Resume Selection */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">
                  1. Candidate Resume
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Select a previously uploaded resume or upload a new PDF, DOCX, or TXT file.
                </p>

                {pastResumes.length > 0 && !file && (
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select Previous Resume
                    </label>
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="h-11 w-full text-xs px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                    >
                      <option value="" className="dark:bg-slate-900">— Or upload a new file below —</option>
                      {pastResumes.map((r) => (
                        <option key={r._id} value={r._id} className="dark:bg-slate-900">
                          {r.originalFileName} ({r.fileType.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <ResumeUploadDropzone
                  file={file}
                  setFile={(f) => {
                    setFile(f);
                    if (f) setSelectedResumeId('');
                  }}
                  isParsing={false}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Free document extraction (0 credits)</span>
                <span>Max 10MB</span>
              </div>
            </div>

            {/* Right Column: Job Description Input */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-1">
                  2. Target Job Description
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Paste the requirements, responsibilities, and role description.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Job Title *
                </label>
                <div className="relative">
                  <RiBriefcaseLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Full Stack Engineer"
                    className="h-11 w-full text-xs pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name (Optional)
                </label>
                <div className="relative">
                  <RiBuilding4Line className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Google, Microsoft, Amazon, or Startup"
                    className="h-11 w-full text-xs pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Job Description Text *
                </label>
                <textarea
                  required
                  rows={7}
                  value={rawJobDescription}
                  onChange={(e) => setRawJobDescription(e.target.value)}
                  placeholder="Paste complete job description, requirements, responsibilities, and qualifications..."
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono leading-relaxed custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-400/20 flex items-center justify-center text-yellow-700 dark:text-yellow-400 shrink-0">
                <RiCoinsLine className="text-base" />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Cost: 10 Credits per Complete Analysis
                </p>
                <p className="text-[11px] text-slate-400">
                  Balance: {userData?.credits ?? 0} credits available
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`h-12 w-full sm:w-auto px-8 rounded-xl bg-[#F7D63A] hover:bg-[#ffe04d] text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 cursor-pointer border border-yellow-400/80 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>{loadingStep || 'Evaluating Job Match...'}</span>
                </>
              ) : (
                <>
                  <span>Run ATS Compatibility Match</span>
                  <RiArrowRightLine />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
