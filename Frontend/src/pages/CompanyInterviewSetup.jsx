import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiBuilding4Line,
  RiBriefcaseLine,
  RiGitMergeLine,
  RiSparklingLine,
  RiCoinsLine,
  RiArrowRightLine,
  RiHistoryLine,
  RiLightbulbLine,
  RiCodeSSlashLine,
  RiFileList3Line,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import CompanySelector from '../components/company/CompanySelector';
import CompanyIntelligenceCard from '../components/company/CompanyIntelligenceCard';
import RoundSelector from '../components/company/RoundSelector';
import { backendServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';

export default function CompanyInterviewSetup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyIntelligence, setCompanyIntelligence] = useState(null);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isSearchingCustom, setIsSearchingCustom] = useState(false);

  // Form Fields
  const [targetDesignation, setTargetDesignation] = useState('Software Engineer');
  const [jobCategory, setJobCategory] = useState('Fullstack');
  const [experienceLevel, setExperienceLevel] = useState('Mid-Level');
  const [requiredSkills, setRequiredSkills] = useState('Data Structures, Algorithms, Distributed Systems, Problem Solving');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedRound, setSelectedRound] = useState('technical_round_1');
  const [recommendedRoundId, setRecommendedRoundId] = useState('technical_round_1');

  const [isStarting, setIsStarting] = useState(false);

  const location = useLocation();

  // Cross-module bridge integration (Module 7 ATS -> Module 6 Company Simulation prefill)
  useEffect(() => {
    if (location.state?.prefillRole) {
      setTargetDesignation(location.state.prefillRole);
    }
    if (location.state?.prefillSkills) {
      if (Array.isArray(location.state.prefillSkills)) {
        setRequiredSkills(location.state.prefillSkills.join(', '));
      } else if (typeof location.state.prefillSkills === 'string') {
        setRequiredSkills(location.state.prefillSkills);
      }
    }
    if (location.state?.prefillCompany && companies.length > 0) {
      const match = companies.find(
        (c) => c.name?.toLowerCase() === location.state.prefillCompany.toLowerCase()
      );
      if (match) {
        handleSelectCompany(match);
      }
    }
  }, [location.state, companies]);

  // Fetch premier companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoadingCompanies(true);
        const res = await axios.get(`${backendServerUrl}/api/company-interview/companies`, {
          withCredentials: true,
        });
        if (res.data?.success && res.data?.data) {
          setCompanies(res.data.data);
          if (res.data.data.length > 0) {
            handleSelectCompany(res.data.data[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load companies:', err);
        toast.error('Could not load company catalog. Using offline cache.');
      } finally {
        setIsLoadingCompanies(false);
      }
    };
    fetchCompanies();
  }, []);

  // Fetch company intelligence
  const handleSelectCompany = async (company) => {
    setSelectedCompany(company);
    try {
      const res = await axios.get(
        `${backendServerUrl}/api/company-interview/companies/${company.slug || company.name.toLowerCase().replace(/\s+/g, '-')}`,
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.data) {
        setCompanyIntelligence(res.data.data);
        if (res.data.data.supportedRounds?.length > 0) {
          setSelectedRound(res.data.data.supportedRounds[0].roundId);
        }
      }
    } catch (err) {
      console.error('Error fetching intelligence:', err);
      setCompanyIntelligence(company);
    }
  };

  // Custom company search / synthesis
  const handleCustomCompanySearch = async (customCompanyName) => {
    try {
      setIsSearchingCustom(true);
      const res = await axios.post(
        `${backendServerUrl}/api/company-interview/intelligence`,
        { companyName: customCompanyName },
        { withCredentials: true }
      );
      if (res.data?.success && res.data?.data) {
        const intel = res.data.data;
        setCompanyIntelligence(intel);
        setSelectedCompany(intel);
        if (intel.supportedRounds?.length > 0) {
          setSelectedRound(intel.supportedRounds[0].roundId);
        }
        toast.success(`Generated intelligence for ${intel.name}!`);
      }
    } catch (err) {
      console.error('Custom company intelligence failed:', err);
      toast.error('Failed to analyze company. Please try another name.');
    } finally {
      setIsSearchingCustom(false);
    }
  };

  // Launch Simulation
  const handleLaunchSimulation = async () => {
    if (!userData) {
      toast.error('Please log in to launch a company simulation.');
      return;
    }

    if ((userData.credits || 0) < 50) {
      toast.error('Insufficient credits! Company simulations require 50 credits.');
      navigate('/pricing');
      return;
    }

    try {
      setIsStarting(true);
      const payload = {
        companyName: selectedCompany?.name || 'Google',
        targetDesignation,
        jobCategory,
        experienceLevel,
        interviewRound: selectedRound,
        requiredSkills: requiredSkills.split(',').map((s) => s.trim()).filter(Boolean),
        jobDescription: jobDescription.trim(),
      };

      const res = await axios.post(
        `${backendServerUrl}/api/company-interview/create-session`,
        payload,
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data) {
        // Deduct 50 credits locally in Redux
        dispatch(setUserData({
          ...userData,
          credits: Math.max(0, (userData.credits || 0) - 50),
        }));

        toast.success('Simulation initialized! Starting interview...');
        navigate(`/company-interview/${res.data.data.sessionId}`);
      }
    } catch (err) {
      console.error('Failed to launch simulation:', err);
      const errorMsg = err.response?.data?.message || 'Failed to start company simulation.';
      toast.error(errorMsg);
    } finally {
      setIsStarting(false);
    }
  };

  const currentRounds = companyIntelligence?.supportedRounds || [
    { roundId: 'online_assessment', name: 'Online Assessment (OA)', format: 'coding', typicalQuestionCount: 3, recommendedDuration: 60, focusAreas: ['DSA', 'LeetCode'] },
    { roundId: 'technical_round_1', name: 'Technical Round 1', format: 'conceptual', typicalQuestionCount: 4, recommendedDuration: 45, focusAreas: ['Algorithms', 'Data Structures'] },
    { roundId: 'technical_round_2', name: 'Technical Round 2', format: 'conceptual', typicalQuestionCount: 4, recommendedDuration: 45, focusAreas: ['System Principles', 'Architecture'] },
    { roundId: 'system_design', name: 'System Design Round', format: 'system_design', typicalQuestionCount: 2, recommendedDuration: 60, focusAreas: ['Scalability', 'Distributed Systems'] },
    { roundId: 'hiring_manager', name: 'Hiring Manager Round', format: 'behavioral', typicalQuestionCount: 4, recommendedDuration: 45, focusAreas: ['Ownership', 'Past Impact'] },
    { roundId: 'behavioral', name: 'Behavioral & Leadership', format: 'behavioral', typicalQuestionCount: 4, recommendedDuration: 45, focusAreas: ['Leadership Principles', 'Culture Fit'] },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-poppins pb-20 selection:bg-yellow-400 selection:text-slate-950">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 pt-8 space-y-8">
        {/* Banner Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-yellow-400/10 via-slate-900 to-indigo-500/10 border border-slate-800 relative overflow-hidden">
          <div className="space-y-2 z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-yellow-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                <RiSparklingLine /> Module 6
              </span>
              <span className="text-xs font-medium text-slate-400">
                Company-Specific Interview Simulation
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Simulate Interviews at Premier Tech Companies
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Experience authentic round-by-round interviews tailored to engineering expectations, company-specific evaluation principles, and role seniority at Google, Amazon, Microsoft, and custom companies.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 z-10 shrink-0">
            <Link
              to="/company-interview/history"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition"
            >
              <RiHistoryLine className="text-yellow-400 text-sm" />
              Past Simulations
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-yellow-400/30 text-yellow-400 text-xs font-bold">
              <RiCoinsLine className="text-sm" />
              50 Credits / Session
            </div>
          </div>
        </div>

        {/* 1. Target Company Selection */}
        <section className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <CompanySelector
            companies={companies}
            selectedCompany={selectedCompany}
            onSelectCompany={handleSelectCompany}
            onCustomCompanySearch={handleCustomCompanySearch}
            isSearchingCustom={isSearchingCustom}
          />

          {/* Company Intelligence Preview */}
          {companyIntelligence && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <CompanyIntelligenceCard company={companyIntelligence} />
            </motion.div>
          )}
        </section>

        {/* 2. Role, Category & Seniority Configuration */}
        <section className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <RiBriefcaseLine className="text-yellow-400 text-base" />
            2. Configure Role & Seniority
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Target Designation / Title
              </label>
              <input
                type="text"
                value={targetDesignation}
                onChange={(e) => setTargetDesignation(e.target.value)}
                placeholder="e.g. Senior Software Engineer - L5"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-yellow-400 transition"
              />
            </div>

            {/* Job Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Engineering Discipline
              </label>
              <select
                value={jobCategory}
                onChange={(e) => setJobCategory(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="Fullstack">Fullstack Engineering</option>
                <option value="Backend">Backend Engineering</option>
                <option value="Frontend">Frontend Engineering</option>
                <option value="DevOps">DevOps / Cloud Architecture</option>
                <option value="System Design">System Design & Infrastructure</option>
                <option value="Machine Learning">AI / Machine Learning</option>
                <option value="Data Engineering">Data Engineering</option>
                <option value="Mobile">Mobile (iOS / Android)</option>
              </select>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-yellow-400 transition cursor-pointer"
              >
                <option value="Entry">Entry Level (0 - 2 years)</option>
                <option value="Mid-Level">Mid-Level (3 - 5 years)</option>
                <option value="Senior">Senior Engineer (6 - 8 years)</option>
                <option value="Lead">Staff / Principal / Lead (8+ years)</option>
              </select>
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              Primary Skills & Tech Stacks (comma-separated)
            </label>
            <input
              type="text"
              value={requiredSkills}
              onChange={(e) => setRequiredSkills(e.target.value)}
              placeholder="e.g. Distributed Systems, Go, Kubernetes, Kafka, High-Throughput APIs"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-yellow-400 transition"
            />
          </div>

          {/* Optional Job Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <RiFileList3Line className="text-slate-400" />
                Job Description or Company Preparation Notes (Optional)
              </span>
              <span className="text-[11px] text-slate-500">Helps calibrate custom questions</span>
            </label>
            <textarea
              rows={3}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste specific requirements from the target company's job posting or team requirements..."
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-yellow-400 transition placeholder-slate-600 resize-none"
            />
          </div>
        </section>

        {/* 3. Interview Round Selection */}
        <section className="bg-slate-900/60 p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <RoundSelector
            rounds={currentRounds}
            selectedRound={selectedRound}
            onSelectRound={setSelectedRound}
            recommendedRoundId={recommendedRoundId}
          />
        </section>

        {/* 4. Launch Simulation Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                Ready to simulate {selectedCompany?.name || 'Company'} interview?
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/40 font-bold">
                50 Credits
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Session includes AI speech audio, live rubric evaluation, readiness scorecard, and Module 5 recovery plan integration.
            </p>
          </div>

          <button
            type="button"
            disabled={isStarting}
            onClick={handleLaunchSimulation}
            className="px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-wider bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-xl shadow-yellow-400/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isStarting ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Initializing Simulation...
              </>
            ) : (
              <>
                <RiSparklingLine className="text-lg" />
                Launch Simulation
                <RiArrowRightLine className="text-lg" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
