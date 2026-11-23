import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiPlay,
  HiCheckCircle,
  HiXCircle,
  HiArrowPath,
  HiClock,
  HiCpuChip,
  HiSparkles,
  HiChevronRight,
  HiChevronLeft,
  HiArrowsPointingOut,
  HiArrowsPointingIn,
  HiCommandLine,
  HiDocumentText,
  HiShieldCheck,
  HiCodeBracket,
} from 'react-icons/hi2';
import axios from 'axios';
import toast from 'react-hot-toast';
import { backendServerUrl } from '../../App';

export const SUPPORTED_LANGUAGES = [
  { id: 63, name: 'JavaScript (Node.js)', slug: 'javascript', monacoLang: 'javascript' },
  { id: 71, name: 'Python 3', slug: 'python', monacoLang: 'python' },
  { id: 54, name: 'C++ (GCC)', slug: 'cpp', monacoLang: 'cpp' },
  { id: 62, name: 'Java (OpenJDK)', slug: 'java', monacoLang: 'java' },
  { id: 74, name: 'TypeScript', slug: 'typescript', monacoLang: 'typescript' },
  { id: 60, name: 'Go', slug: 'go', monacoLang: 'go' },
];

export default function CodingWorkspace({
  interviewId,
  problems = [],
  currentProblemIndex = 0,
  onProblemChange,
  onFinishInterview,
  initialLanguage = 'javascript',
}) {
  const [activeProblemIdx, setActiveProblemIdx] = useState(currentProblemIndex);
  const [selectedLang, setSelectedLang] = useState(() => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.slug === initialLanguage);
    return found || SUPPORTED_LANGUAGES[0];
  });

  const currentProblem = problems[activeProblemIdx] || null;

  // Code state per problem and per language
  const [codeMap, setCodeMap] = useState({});
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [candidateExplanation, setCandidateExplanation] = useState('');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'console' | 'ai'
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);

  // Results
  const [lastRunResults, setLastRunResults] = useState(null);
  const [submissionHistory, setSubmissionHistory] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef(null);

  // Initialize starter code when problem or language changes
  useEffect(() => {
    if (!currentProblem) return;
    const key = `${activeProblemIdx}_${selectedLang.slug}`;
    if (!codeMap[key]) {
      const starter =
        currentProblem.starterCode?.[selectedLang.slug] ||
        `// Write your ${selectedLang.name} solution here\n`;
      setCodeMap((prev) => ({ ...prev, [key]: starter }));
    }
  }, [activeProblemIdx, selectedLang.slug, currentProblem]);

  const currentCodeKey = `${activeProblemIdx}_${selectedLang.slug}`;
  const currentCode = codeMap[currentCodeKey] || '';

  const handleCodeChange = (newVal) => {
    setCodeMap((prev) => ({ ...prev, [currentCodeKey]: newVal || '' }));
  };

  const handleResetCode = () => {
    if (!currentProblem) return;
    const starter =
      currentProblem.starterCode?.[selectedLang.slug] ||
      `// Write your ${selectedLang.name} solution here\n`;
    setCodeMap((prev) => ({ ...prev, [currentCodeKey]: starter }));
    toast.success('Code reset to default starter template');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      workspaceRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Run Code (Visible Tests Only - Zero Credits Charged)
  const handleRunCode = async () => {
    if (!currentProblem || isRunning || isSubmitting) return;

    setIsRunning(true);
    setActiveTab('tests');
    const toastId = toast.loading('Executing code in secure sandbox...');

    try {
      const response = await axios.post(
        `${backendServerUrl}/api/coding/run`,
        {
          interviewId,
          problemIndex: activeProblemIdx,
          languageId: selectedLang.id,
          language: selectedLang.slug,
          sourceCode: currentCode,
          customInput: useCustomInput ? customInput : null,
        },
        { withCredentials: true }
      );

      setLastRunResults(response.data);
      toast.dismiss(toastId);
      if (response.data.allPassed) {
        toast.success(`Passed all ${response.data.totalCount} visible test cases!`);
      } else {
        toast.error(`Passed ${response.data.passedCount}/${response.data.totalCount} test cases`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || err.message || 'Execution error';
      toast.error(msg);
      setLastRunResults({
        passedCount: 0,
        totalCount: currentProblem.visibleTestCases?.length || 1,
        allPassed: false,
        results: [
          {
            testCaseIndex: 1,
            passed: false,
            input: customInput || 'Default visible test',
            expectedOutput: 'Valid execution',
            actualOutput: '',
            stderr: msg,
            error: msg,
            statusDescription: 'Compilation / Runtime Error',
          },
        ],
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Solution (Visible + Hidden Tests + AI Evaluation)
  const handleFinalSubmit = async () => {
    if (!currentProblem || isRunning || isSubmitting) return;

    setIsSubmitting(true);
    setActiveTab('ai');
    const toastId = toast.loading('Running full test suite & AI evaluation...');

    try {
      const response = await axios.post(
        `${backendServerUrl}/api/coding/submit`,
        {
          interviewId,
          problemIndex: activeProblemIdx,
          languageId: selectedLang.id,
          language: selectedLang.slug,
          sourceCode: currentCode,
          candidateExplanation,
        },
        { withCredentials: true }
      );

      const subData = response.data;
      setSubmissionHistory((prev) => ({
        ...prev,
        [activeProblemIdx]: subData,
      }));
      setLastRunResults({
        passedCount: subData.passedTestCases,
        totalCount: subData.totalTestCases,
        allPassed: subData.allPassed,
        results: subData.testResults,
        maxTimeMs: subData.overallExecutionTimeMs,
        maxMemoryKb: subData.overallMemoryKb,
      });

      toast.dismiss(toastId);
      toast.success(
        `Problem ${activeProblemIdx + 1} submitted! Pass rate: ${subData.passedTestCases}/${subData.totalTestCases}`
      );
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || err.message || 'Submission error';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSubmission = submissionHistory[activeProblemIdx] || null;

  return (
    <div
      ref={workspaceRef}
      className={`min-h-[85vh] bg-slate-950 text-slate-100 flex flex-col rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
      }`}
    >
      {/* Top Navbar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-800/50 rounded-lg text-cyan-400 font-semibold text-sm">
            <HiCodeBracket className="w-4 h-4 text-cyan-400" />
            <span>Problem {activeProblemIdx + 1} of {problems.length}</span>
          </div>
          <span className="text-slate-400 text-sm font-medium truncate max-w-xs md:max-w-md">
            {currentProblem?.title || 'Coding Problem'}
          </span>
          {currentProblem?.difficulty && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                currentProblem.difficulty === 'Easy'
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                  : currentProblem.difficulty === 'Hard'
                  ? 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              }`}
            >
              {currentProblem.difficulty}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={selectedLang.slug}
            onChange={(e) => {
              const lang = SUPPORTED_LANGUAGES.find((l) => l.slug === e.target.value);
              if (lang) setSelectedLang(lang);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.slug}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* Reset Code */}
          <button
            onClick={handleResetCode}
            title="Reset code to template"
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <HiArrowPath className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workspace'}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            {isFullscreen ? (
              <HiArrowsPointingIn className="w-4 h-4" />
            ) : (
              <HiArrowsPointingOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Panel: Problem Description (col-span-5) */}
        <div className="lg:col-span-5 border-r border-slate-800 flex flex-col bg-slate-900/40 overflow-y-auto p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">
              {currentProblem?.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 bg-slate-800 rounded">{currentProblem?.category}</span>
              {currentProblem?.optimalTimeComplexity && (
                <span className="px-2 py-0.5 bg-slate-800 text-cyan-400 rounded">
                  Time: {currentProblem.optimalTimeComplexity}
                </span>
              )}
            </div>
          </div>

          {/* Description Body */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
            {currentProblem?.description}
          </div>

          {/* Constraints */}
          {currentProblem?.constraints && currentProblem.constraints.length > 0 && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HiShieldCheck className="w-4 h-4 text-cyan-400" />
                Constraints
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 font-mono">
                {currentProblem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Visible Examples Preview */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HiDocumentText className="w-4 h-4 text-cyan-400" />
              Example Test Cases
            </h4>
            {(currentProblem?.visibleTestCases || []).map((tc, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 font-mono"
              >
                <div className="text-slate-400">
                  <span className="text-slate-500">Input:</span> {tc.input || '(empty)'}
                </div>
                <div className="text-emerald-400">
                  <span className="text-slate-500">Output:</span> {tc.expectedOutput}
                </div>
                {tc.explanation && (
                  <div className="text-slate-400 font-sans italic text-[11px] pt-1">
                    Explanation: {tc.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Problem Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <button
              disabled={activeProblemIdx === 0}
              onClick={() => {
                const nextIdx = Math.max(0, activeProblemIdx - 1);
                setActiveProblemIdx(nextIdx);
                onProblemChange?.(nextIdx);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-xs rounded-lg transition"
            >
              <HiChevronLeft className="w-4 h-4" /> Previous Problem
            </button>

            {activeProblemIdx < problems.length - 1 ? (
              <button
                onClick={() => {
                  const nextIdx = activeProblemIdx + 1;
                  setActiveProblemIdx(nextIdx);
                  onProblemChange?.(nextIdx);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded-lg transition"
              >
                Next Problem <HiChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => onFinishInterview?.()}
                className="flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-purple-900/30 transition"
              >
                Finish Coding Interview
              </button>
            )}
          </div>
        </div>

        {/* Right Panel: Editor & Execution Console (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 min-h-0 overflow-hidden">
          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-[300px] lg:min-h-[380px] relative">
            <Editor
              height="100%"
              theme="vs-dark"
              language={selectedLang.monacoLang}
              value={currentCode}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13.5,
                tabSize: 4,
                automaticLayout: true,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Action Ribbon: Custom Input toggle & Run / Submit Buttons */}
          <div className="h-14 bg-slate-900/90 border-t border-b border-slate-800 px-4 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
              <input
                type="checkbox"
                checked={useCustomInput}
                onChange={(e) => setUseCustomInput(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>Custom Input</span>
            </label>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-cyan-400 font-semibold text-xs rounded-lg border border-slate-700 transition"
              >
                <HiPlay className="w-3.5 h-3.5" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              <button
                onClick={handleFinalSubmit}
                disabled={isRunning || isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-900/20 transition"
              >
                <HiCheckCircle className="w-3.5 h-3.5" />
                {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
              </button>
            </div>
          </div>

          {/* Bottom Drawer: Console & Test Results */}
          <div className="h-64 bg-slate-900/70 flex flex-col min-h-0">
            {/* Drawer Header Tabs */}
            <div className="flex items-center justify-between px-4 bg-slate-900 border-b border-slate-800 text-xs">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`py-2.5 border-b-2 font-medium flex items-center gap-1.5 transition ${
                    activeTab === 'tests'
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HiCommandLine className="w-3.5 h-3.5" />
                  Test Cases ({lastRunResults?.totalCount || currentProblem?.visibleTestCases?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('console')}
                  className={`py-2.5 border-b-2 font-medium flex items-center gap-1.5 transition ${
                    activeTab === 'console'
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HiDocumentText className="w-3.5 h-3.5" />
                  Console Output
                </button>

                <button
                  onClick={() => setActiveTab('ai')}
                  className={`py-2.5 border-b-2 font-medium flex items-center gap-1.5 transition ${
                    activeTab === 'ai'
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HiSparkles className="w-3.5 h-3.5" />
                  AI Evaluation
                  {currentSubmission && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </button>
              </div>

              {lastRunResults && (
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <HiClock className="w-3 h-3 text-cyan-400" />
                    {lastRunResults.maxTimeMs || 0}ms
                  </span>
                  <span className="flex items-center gap-1">
                    <HiCpuChip className="w-3 h-3 text-purple-400" />
                    {lastRunResults.maxMemoryKb || 0}KB
                  </span>
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="flex-1 p-4 overflow-y-auto text-xs font-mono">
              {/* Tab 1: Test Cases */}
              {activeTab === 'tests' && (
                <div className="space-y-3">
                  {useCustomInput ? (
                    <div className="space-y-2">
                      <div className="text-slate-400 text-[11px]">Custom Standard Input (stdin):</div>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom input to feed standard input..."
                        className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                  ) : (
                    <>
                      {/* Pills for each test case */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {(lastRunResults?.results || currentProblem?.visibleTestCases || []).map(
                          (item, idx) => {
                            const passed = item.passed;
                            return (
                              <button
                                key={idx}
                                onClick={() => setActiveTestCaseIdx(idx)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
                                  activeTestCaseIdx === idx
                                    ? 'bg-slate-800 text-white border border-slate-700'
                                    : 'bg-slate-950 text-slate-400 hover:bg-slate-800/60'
                                }`}
                              >
                                {passed === true && (
                                  <HiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                )}
                                {passed === false && (
                                  <HiXCircle className="w-3.5 h-3.5 text-rose-400" />
                                )}
                                <span>{item.isHidden ? `Hidden #${idx + 1}` : `Case #${idx + 1}`}</span>
                              </button>
                            );
                          }
                        )}
                      </div>

                      {/* Active Test Case Detail */}
                      {(() => {
                        const activeItem =
                          lastRunResults?.results?.[activeTestCaseIdx] ||
                          currentProblem?.visibleTestCases?.[activeTestCaseIdx] ||
                          null;

                        if (!activeItem) {
                          return (
                            <div className="text-slate-500 py-6 text-center">
                              Click "Run Code" to execute test cases.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                            <div>
                              <div className="text-slate-500 text-[11px]">Input:</div>
                              <pre className="text-slate-200 mt-0.5 whitespace-pre-wrap">
                                {activeItem.input || '(empty)'}
                              </pre>
                            </div>

                            <div>
                              <div className="text-slate-500 text-[11px]">Expected Output:</div>
                              <pre className="text-emerald-400 mt-0.5 whitespace-pre-wrap">
                                {activeItem.expectedOutput || '(empty)'}
                              </pre>
                            </div>

                            {activeItem.actualOutput !== undefined && (
                              <div>
                                <div className="text-slate-500 text-[11px]">Your Output:</div>
                                <pre
                                  className={`mt-0.5 whitespace-pre-wrap ${
                                    activeItem.passed ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {activeItem.actualOutput || activeItem.stdout || '(no output)'}
                                </pre>
                              </div>
                            )}

                            {activeItem.error && (
                              <div>
                                <div className="text-rose-500 text-[11px]">Execution Error:</div>
                                <pre className="text-rose-400 mt-0.5 whitespace-pre-wrap">
                                  {activeItem.error}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}

              {/* Tab 2: Console Output */}
              {activeTab === 'console' && (
                <div className="space-y-3">
                  <div className="text-slate-400 text-[11px]">Standard Output / Compiler Diagnostic:</div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 whitespace-pre-wrap">
                    {lastRunResults?.results?.map((r) => r.stdout || r.stderr).filter(Boolean).join('\n') ||
                      'No console output captured yet.'}
                  </pre>
                </div>
              )}

              {/* Tab 3: AI Evaluation */}
              {activeTab === 'ai' && (
                <div>
                  {!currentSubmission ? (
                    <div className="text-center py-6 text-slate-400 space-y-2">
                      <HiSparkles className="w-8 h-8 text-purple-400 mx-auto opacity-60" />
                      <div>Submit your final solution to receive AI technical evaluation.</div>
                    </div>
                  ) : (
                    <div className="space-y-3 font-sans">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-center">
                          <div className="text-[11px] text-slate-400">Score</div>
                          <div className="text-lg font-bold text-cyan-400">
                            {currentSubmission.evaluation?.score || 0}%
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-center">
                          <div className="text-[11px] text-slate-400">Time Complexity</div>
                          <div className="text-sm font-semibold text-purple-400">
                            {currentSubmission.evaluation?.timeComplexity || 'O(n)'}
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-center">
                          <div className="text-[11px] text-slate-400">Space Complexity</div>
                          <div className="text-sm font-semibold text-indigo-400">
                            {currentSubmission.evaluation?.spaceComplexity || 'O(1)'}
                          </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-center">
                          <div className="text-[11px] text-slate-400">Test Cases</div>
                          <div className="text-sm font-semibold text-emerald-400">
                            {currentSubmission.passedTestCases}/{currentSubmission.totalTestCases}
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300">
                        <span className="font-semibold text-purple-400">Interviewer Summary: </span>
                        {currentSubmission.evaluation?.overallFeedback || 'Solution verified.'}
                      </div>

                      {currentSubmission.evaluation?.suggestions?.length > 0 && (
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs space-y-1">
                          <div className="font-semibold text-cyan-400">Optimization Suggestions:</div>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                            {currentSubmission.evaluation.suggestions.map((s, idx) => (
                              <li key={idx}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
