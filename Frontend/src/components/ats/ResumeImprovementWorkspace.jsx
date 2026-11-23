import React, { useState } from 'react';
import {
  RiCheckLine,
  RiCloseLine,
  RiFileCopyLine,
  RiSparklingLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
} from 'react-icons/ri';
import toast from 'react-hot-toast';

export default function ResumeImprovementWorkspace({
  improvements = {},
  onUpdateStatus,
}) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'bullets' | 'projects' | 'keywords'
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied improved text to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const summary = improvements.professionalSummary || {};
  const bullets = improvements.experienceBullets || [];
  const projects = improvements.projectImprovements || [];
  const keywords = improvements.keywordRecommendations || [];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <RiSparklingLine className="text-yellow-500" />
            Interactive Resume Improvement Workspace
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Targeted enhancements using strong action verbs, technical context, and JD keywords without fabricating unverified metrics.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'summary' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('bullets')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'bullets' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Experience ({bullets.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'projects' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'keywords' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Keywords ({keywords.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Professional Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                Original Summary
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">
                {summary.original || 'No summary detected in resume.'}
              </p>
            </div>

            {/* Suggested */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <RiSparklingLine /> Tailored ATS Summary
                </span>
                <button
                  onClick={() => copyToClipboard(summary.suggested, 'summary')}
                  className="p-1 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                  title="Copy improved text"
                >
                  {copiedId === 'summary' ? <RiCheckDoubleLine /> : <RiFileCopyLine />}
                  <span>{copiedId === 'summary' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {summary.suggested}
              </p>
              {summary.rationale && (
                <p className="text-[11px] text-emerald-700 mt-3 pt-2 border-t border-emerald-100/80 italic">
                  Rationale: {summary.rationale}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Experience Bullets */}
      {activeTab === 'bullets' && (
        <div className="space-y-4">
          {bullets.map((bullet, idx) => (
            <div
              key={bullet.id || idx}
              className={`p-4 rounded-2xl border transition-all ${
                bullet.status === 'accepted'
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : bullet.status === 'rejected'
                  ? 'border-slate-200 bg-slate-50 opacity-60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-bold text-slate-700">
                  {bullet.company} — <span className="text-slate-500 font-normal">{bullet.role}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bullet.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : bullet.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {bullet.status || 'pending'}
                  </span>
                  {onUpdateStatus && (
                    <>
                      <button
                        onClick={() => onUpdateStatus('bullet', bullet.id, 'accepted')}
                        className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                        title="Accept suggestion"
                      >
                        <RiCheckLine />
                      </button>
                      <button
                        onClick={() => onUpdateStatus('bullet', bullet.id, 'rejected')}
                        className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer"
                        title="Reject suggestion"
                      >
                        <RiCloseLine />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => copyToClipboard(bullet.suggested, bullet.id)}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                    title="Copy bullet"
                  >
                    {copiedId === bullet.id ? <RiCheckDoubleLine className="text-emerald-600" /> : <RiFileCopyLine />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Original</span>
                  {bullet.original}
                </div>
                <div className="p-3 rounded-xl bg-yellow-50/60 border border-yellow-100 text-slate-800 font-medium">
                  <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Suggested (Action Verb: {bullet.actionVerb})</span>
                  {bullet.suggested}
                </div>
              </div>

              {bullet.rationale && (
                <p className="text-[11px] text-slate-500 mt-2 pl-1">
                  💡 {bullet.rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Project Improvements */}
      {activeTab === 'projects' && (
        <div className="space-y-4">
          {projects.map((proj, idx) => (
            <div key={proj.id || idx} className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 text-sm">{proj.projectName}</h4>
                <button
                  onClick={() => copyToClipboard(proj.suggestedDescription, proj.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  {copiedId === proj.id ? <RiCheckDoubleLine className="text-emerald-600" /> : <RiFileCopyLine />}
                  <span>Copy</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mb-3">
                <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Original</span>
                  {proj.originalDescription || 'Basic description'}
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-slate-800 font-medium">
                  <span className="text-[10px] font-bold text-blue-700 uppercase block mb-1">Enhanced Description</span>
                  {proj.suggestedDescription}
                </div>
              </div>

              {proj.rationale && (
                <p className="text-[11px] text-slate-500 pl-1">
                  💡 {proj.rationale}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Keyword Recommendations */}
      {activeTab === 'keywords' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {keywords.map((kw, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-black text-slate-800 text-sm px-2.5 py-0.5 bg-yellow-100 rounded-lg text-yellow-900">
                  {kw.keyword}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Recommended Placement
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-2">
                📍 {kw.placementSuggestion}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {kw.context}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
