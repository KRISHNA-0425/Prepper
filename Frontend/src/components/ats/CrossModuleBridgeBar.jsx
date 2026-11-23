import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiMicLine,
  RiCodeSSlashLine,
  RiRoadMapLine,
  RiBuilding4Line,
  RiArrowRightLine,
} from 'react-icons/ri';

export default function CrossModuleBridgeBar({
  jobTitle = 'Software Engineer',
  companyName = '',
  requiredSkills = [],
  missingSkills = [],
  analysisId = '',
}) {
  const navigate = useNavigate();

  const handleStartInterview = () => {
    // Navigate to Module 1 with query parameters
    navigate('/interview', {
      state: {
        prefillRole: jobTitle,
        prefillCompany: companyName,
        prefillSkills: requiredSkills.slice(0, 8),
        sourceAtsId: analysisId,
      },
    });
  };

  const handleStartCoding = () => {
    // Navigate to Module 4 Coding Setup
    navigate('/coding', {
      state: {
        prefillCategory: 'Problem Solving',
        prefillLanguage: 'javascript',
      },
    });
  };

  const handleStartRecoveryPlan = () => {
    // Navigate to Module 5 Recovery Plans
    navigate('/recovery-plans', {
      state: {
        prefillRole: `${jobTitle}${companyName ? ' at ' + companyName : ''}`,
        sourceType: 'ats_analysis',
        sourceId: analysisId,
        weaknesses: missingSkills.map((s) => ({
          skill: typeof s === 'string' ? s : s.skill,
          importance: s.importance || 'mandatory',
          suggestedActivity: s.suggestedActivity || 'Targeted technical review',
        })),
      },
    });
  };

  const handleStartCompanyInterview = () => {
    // Navigate to Module 6 Company Interview Setup
    navigate('/company-interview', {
      state: {
        prefillCompany: companyName || 'Target Company',
        prefillRole: jobTitle,
      },
    });
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
      <div className="mb-6 pb-4 border-b border-slate-700/60">
        <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider block mb-1">
          Next Step Preparation Journey
        </span>
        <h3 className="text-xl font-black">
          Prepare for this Specific Role with Prepper AI Modules
        </h3>
        <p className="text-xs text-slate-300 mt-1 max-w-xl">
          Directly bridge your ATS findings into realistic mock interviews, targeted coding drills, and multi-day remediation programs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Module 1: Voice Interview */}
        <div
          onClick={handleStartInterview}
          className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg mb-3">
              <RiMicLine />
            </div>
            <h4 className="font-bold text-sm text-white group-hover:text-blue-300 transition-colors">
              Role Interview
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Conduct conversational AI mock interview tailored to {jobTitle}.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-400">
            <span>Start Practice</span>
            <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module 4: Live Coding */}
        <div
          onClick={handleStartCoding}
          className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-lg mb-3">
              <RiCodeSSlashLine />
            </div>
            <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
              Live Coding Drills
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Monaco editor workspace testing required data structures and algorithms.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-400">
            <span>Solve Problems</span>
            <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module 5: Recovery Plan */}
        <div
          onClick={handleStartRecoveryPlan}
          className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-lg mb-3">
              <RiRoadMapLine />
            </div>
            <h4 className="font-bold text-sm text-white group-hover:text-yellow-300 transition-colors">
              Recovery Plan (Module 5)
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Convert {missingSkills.length} identified skill gaps into a 7 or 14-day study roadmap.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-yellow-400">
            <span>Generate Roadmap</span>
            <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Module 6: Company Simulation */}
        <div
          onClick={handleStartCompanyInterview}
          className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 p-4 rounded-2xl cursor-pointer transition-all duration-300 group flex flex-col justify-between"
        >
          <div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-3">
              <RiBuilding4Line />
            </div>
            <h4 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
              Company Simulation
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              7-round hiring bar simulation calibrated to {companyName || 'enterprise'} standards.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-400">
            <span>Simulate Rounds</span>
            <RiArrowRightLine className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
