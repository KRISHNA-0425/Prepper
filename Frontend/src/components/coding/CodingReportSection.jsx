import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCodeBracket,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiCpuChip,
  HiSparkles,
  HiChevronDown,
  HiChevronUp,
  HiClipboardDocument,
  HiClipboardDocumentCheck,
  HiShieldCheck,
  HiLightBulb,
} from 'react-icons/hi2';

export default function CodingReportSection({ report }) {
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [activeTabs, setActiveTabs] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);

  const submissions = report.codingSubmissions || [];
  const problems = report.codingProblems || [];

  if (submissions.length === 0 && problems.length === 0) {
    return null;
  }

  // Calculate aggregate metrics
  let totalTestsPassed = 0;
  let totalTestsCount = 0;
  let maxTimeMs = 0;
  let maxMemoryKb = 0;

  submissions.forEach((sub) => {
    totalTestsPassed += sub.passedTestCases || 0;
    totalTestsCount += sub.totalTestCases || 0;
    if ((sub.overallExecutionTimeMs || 0) > maxTimeMs) {
      maxTimeMs = sub.overallExecutionTimeMs;
    }
    if ((sub.overallMemoryKb || 0) > maxMemoryKb) {
      maxMemoryKb = sub.overallMemoryKb;
    }
  });

  const passPercentage = totalTestsCount > 0 ? Math.round((totalTestsPassed / totalTestsCount) * 100) : 100;

  const handleCopy = (code, key) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const getActiveTab = (idx) => activeTabs[idx] || 'code';
  const setActiveTab = (idx, tab) => {
    setActiveTabs((prev) => ({ ...prev, [idx]: tab }));
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
            <HiCodeBracket className="w-6 h-6 text-cyan-400" />
            Live Coding <span className="text-cyan-400">Evaluation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Sandbox execution results, deterministic test-case validation, and AI algorithmic analysis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-cyan-950/60 border border-cyan-800/50 rounded-xl text-cyan-400 text-xs font-bold">
            {report.codingLanguage ? report.codingLanguage.toUpperCase() : 'CODE'}
          </span>
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-xs font-bold">
            {submissions.length} / {problems.length || submissions.length} Problems Submitted
          </span>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Test Pass Rate
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {passPercentage}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {totalTestsPassed} of {totalTestsCount} tests passed
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Peak Execution Time
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 flex items-center justify-center gap-1">
            <HiClock className="w-5 h-5 text-cyan-400 opacity-80" />
            {maxTimeMs}ms
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Fast sandbox response
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Memory Overhead
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 flex items-center justify-center gap-1">
            <HiCpuChip className="w-5 h-5 text-purple-400 opacity-80" />
            {maxMemoryKb}KB
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Bounded memory footprint
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
            Security Isolation
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 flex items-center justify-center gap-1 mt-1">
            <HiShieldCheck className="w-6 h-6 text-emerald-400" />
            SANDBOXED
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Judge0 CE / Linux cgroups
          </div>
        </div>
      </div>

      {/* Problem Cards List */}
      <div className="space-y-4">
        {problems.map((problem, idx) => {
          const submission = submissions.find((s) => s.problemIndex === idx) || submissions[idx] || null;
          const isExpanded = expandedIndex === idx;
          const activeTab = getActiveTab(idx);

          return (
            <div
              key={idx}
              className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-lg transition-all"
            >
              {/* Card Header */}
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="p-5 sm:p-6 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition select-none"
              >
                <div className="flex items-center gap-3.5">
                  <span className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400 font-black text-sm flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {problem.title || `Coding Challenge #${idx + 1}`}
                      </h3>
                      {problem.difficulty && (
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            problem.difficulty === 'Easy'
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                              : problem.difficulty === 'Hard'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {problem.category || 'Problem Solving'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {submission && (
                    <div className="hidden sm:flex items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1 ${
                          submission.passedTestCases === submission.totalTestCases
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                        }`}
                      >
                        {submission.passedTestCases === submission.totalTestCases ? (
                          <HiCheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <HiXCircle className="w-3.5 h-3.5" />
                        )}
                        {submission.passedTestCases}/{submission.totalTestCases} Tests Passed
                      </span>
                    </div>
                  )}

                  <button className="text-slate-400 hover:text-white transition">
                    {isExpanded ? <HiChevronUp className="w-5 h-5" /> : <HiChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-t border-slate-800/80 px-5 sm:px-6 pb-6 pt-4 space-y-4"
                  >
                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-3 border-b border-slate-800 text-xs">
                      <button
                        onClick={() => setActiveTab(idx, 'code')}
                        className={`py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
                          activeTab === 'code'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <HiCodeBracket className="w-4 h-4" /> Submitted Solution
                      </button>

                      <button
                        onClick={() => setActiveTab(idx, 'tests')}
                        className={`py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
                          activeTab === 'tests'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <HiCheckCircle className="w-4 h-4" /> Test Case Verification
                      </button>

                      <button
                        onClick={() => setActiveTab(idx, 'ai')}
                        className={`py-2 border-b-2 font-bold transition flex items-center gap-1.5 ${
                          activeTab === 'ai'
                            ? 'border-purple-400 text-purple-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <HiSparkles className="w-4 h-4" /> AI Code Analysis
                      </button>
                    </div>

                    {/* Tab 1: Submitted Code */}
                    {activeTab === 'code' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Language: {submission?.language || report.codingLanguage || 'Source Code'}</span>
                          {submission?.sourceCode && (
                            <button
                              onClick={() => handleCopy(submission.sourceCode, `code_${idx}`)}
                              className="flex items-center gap-1 text-slate-400 hover:text-cyan-400 transition"
                            >
                              {copiedKey === `code_${idx}` ? (
                                <>
                                  <HiClipboardDocumentCheck className="w-4 h-4 text-emerald-400" />
                                  <span className="text-emerald-400">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <HiClipboardDocument className="w-4 h-4" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        <pre className="p-4 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
                          {submission?.sourceCode || '// No code submitted for this challenge.'}
                        </pre>
                      </div>
                    )}

                    {/* Tab 2: Test Case Verification */}
                    {activeTab === 'tests' && (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-400">
                          Sandbox executed {submission?.totalTestCases || 0} test cases with strict output normalization.
                        </div>

                        <div className="space-y-2">
                          {(submission?.testResults || []).map((test, tIdx) => (
                            <div
                              key={tIdx}
                              className={`p-3 rounded-xl border text-xs font-mono space-y-1 ${
                                test.passed
                                  ? 'bg-slate-950/80 border-emerald-900/40 text-slate-200'
                                  : 'bg-rose-950/20 border-rose-900/50 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1.5">
                                  {test.passed ? (
                                    <HiCheckCircle className="w-4 h-4 text-emerald-400" />
                                  ) : (
                                    <HiXCircle className="w-4 h-4 text-rose-400" />
                                  )}
                                  {test.isHidden ? `Hidden Test Case #${tIdx + 1}` : `Visible Test Case #${tIdx + 1}`}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {test.executionTimeMs || 0}ms • {test.memoryKb || 0}KB
                                </span>
                              </div>

                              {!test.isHidden ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                                  <div>
                                    <span className="text-slate-500">Input:</span> {test.input}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Expected:</span>{' '}
                                    <span className="text-emerald-400">{test.expectedOutput}</span>
                                  </div>
                                  <div className="sm:col-span-2">
                                    <span className="text-slate-500">Your Output:</span>{' '}
                                    <span className={test.passed ? 'text-emerald-400' : 'text-rose-400'}>
                                      {test.actualOutput || test.stdout || '(no output)'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[11px] text-slate-400 italic pt-0.5">
                                  Input and expected output are masked to preserve evaluation security integrity.
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: AI Code Analysis */}
                    {activeTab === 'ai' && (
                      <div className="space-y-4">
                        {submission?.evaluation ? (
                          <>
                            {/* Score Breakdown Cards */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Correctness</div>
                                <div className="text-lg font-black text-cyan-400">
                                  {submission.evaluation.correctness}%
                                </div>
                              </div>
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Efficiency</div>
                                <div className="text-lg font-black text-purple-400">
                                  {submission.evaluation.efficiency}%
                                </div>
                              </div>
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Time Big-O</div>
                                <div className="text-sm font-black text-emerald-400 mt-1">
                                  {submission.evaluation.timeComplexity || 'O(n)'}
                                </div>
                              </div>
                              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Space Big-O</div>
                                <div className="text-sm font-black text-indigo-400 mt-1">
                                  {submission.evaluation.spaceComplexity || 'O(1)'}
                                </div>
                              </div>
                            </div>

                            {/* Interviewer Feedback */}
                            {submission.evaluation.overallFeedback && (
                              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                                <div className="font-bold text-purple-400 flex items-center gap-1.5">
                                  <HiSparkles className="w-4 h-4" /> AI Interviewer Feedback
                                </div>
                                <p className="text-slate-300 leading-relaxed">
                                  {submission.evaluation.overallFeedback}
                                </p>
                              </div>
                            )}

                            {/* Strengths & Suggestions */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {submission.evaluation.strengths?.length > 0 && (
                                <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl space-y-1.5">
                                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                                    <HiCheckCircle className="w-4 h-4" /> Code Strengths
                                  </div>
                                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                                    {submission.evaluation.strengths.map((st, sIdx) => (
                                      <li key={sIdx}>{st}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {submission.evaluation.suggestions?.length > 0 && (
                                <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-xl space-y-1.5">
                                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                                    <HiLightBulb className="w-4 h-4 text-cyan-400" /> Optimization Suggestions
                                  </div>
                                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                                    {submission.evaluation.suggestions.map((sg, gIdx) => (
                                      <li key={gIdx}>{sg}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-6 text-slate-400 text-xs">
                            No automated AI analysis available for this submission.
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
