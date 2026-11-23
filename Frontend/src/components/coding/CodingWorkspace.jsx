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
  HiBeaker,
  HiClock as HiHistory
} from 'react-icons/hi2';
import axios from 'axios';
import toast from 'react-hot-toast';
import { backendServerUrl } from '../../App';

export const SUPPORTED_LANGUAGES = [
  { id: 1, name: 'C (GCC)', slug: 'c', monacoLang: 'c' },
  { id: 2, name: 'C++ (G++)', slug: 'cpp', monacoLang: 'cpp' },
  { id: 3, name: 'Python 3', slug: 'python', monacoLang: 'python' },
  { id: 4, name: 'Java (OpenJDK)', slug: 'java', monacoLang: 'java' },
  { id: 5, name: 'JavaScript (Node.js)', slug: 'javascript', monacoLang: 'javascript' },
  { id: 6, name: 'TypeScript', slug: 'typescript', monacoLang: 'typescript' },
  { id: 7, name: 'Go', slug: 'go', monacoLang: 'go' },
];

export default function CodingWorkspace({
  interviewId,
  problems = [],
  currentProblemIndex = 0,
  onProblemChange,
  onFinishInterview,
  initialLanguage = 'javascript',
  durationMinutes = null,
  expiresAt = null,
}) {
  const [activeProblemIdx, setActiveProblemIdx] = useState(currentProblemIndex);
  const [availableLanguages, setAvailableLanguages] = useState(SUPPORTED_LANGUAGES);
  const [selectedLang, setSelectedLang] = useState(() => {
    const found = SUPPORTED_LANGUAGES.find((l) => l.slug === initialLanguage);
    return found || SUPPORTED_LANGUAGES[4]; // Default JavaScript
  });

  // Dynamically load languages verified by backend
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${backendServerUrl}/api/coding/languages`, { withCredentials: true })
      .then((res) => {
        if (mounted && Array.isArray(res.data?.languages) && res.data.languages.length > 0) {
          setAvailableLanguages(res.data.languages);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const currentProblem = problems[activeProblemIdx] || null;

  // Code state per problem and per language
  const [codeMap, setCodeMap] = useState({});
  const [customInput, setCustomInput] = useState('');
  const [useCustomInput, setUseCustomInput] = useState(false);
  const [candidateExplanation, setCandidateExplanation] = useState('');

  // Execution states
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningSamples, setIsRunningSamples] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' | 'console' | 'ai' | 'history'
  const [activeTestCaseIdx, setActiveTestCaseIdx] = useState(0);

  // Results & History
  const [lastRunResults, setLastRunResults] = useState(null);
  const [rawConsoleOutput, setRawConsoleOutput] = useState('');
  const [submissionHistory, setSubmissionHistory] = useState({});
  const [pastSubmissionsList, setPastSubmissionsList] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const workspaceRef = useRef(null);

  // Overall Session Countdown Timer
  const [timeLeft, setTimeLeft] = useState(() => {
    if (expiresAt) {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    if (durationMinutes) {
      return Number(durationMinutes) * 60;
    }
    return null;
  });

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.error('Session time limit has reached zero!', { icon: '⏱️' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatMMSS = (sec) => {
    if (sec === null) return null;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

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

  // Mode 1: Run Code (Custom Input Execution - 0 Credits)
  const handleRunCode = async () => {
    if (!currentProblem || isRunning || isRunningSamples || isSubmitting) return;

    setIsRunning(true);
    setActiveTab('console');
    const toastId = toast.loading('Running code with custom input...');

    try {
      const response = await axios.post(
        `${backendServerUrl}/api/coding/run`,
        {
          interviewId,
          problemIndex: activeProblemIdx,
          language: selectedLang.slug,
          sourceCode: currentCode,
          customInput: customInput || '',
        },
        { withCredentials: true }
      );

      const data = response.data;
      const combined = [
        data.stdout ? `=== STDOUT ===\n${data.stdout}` : '',
        data.stderr ? `=== STDERR ===\n${data.stderr}` : '',
        data.compileOutput ? `=== COMPILATION ERROR ===\n${data.compileOutput}` : '',
      ].filter(Boolean).join('\n\n') || '(No output produced)';

      setRawConsoleOutput(combined);
      toast.dismiss(toastId);
      if (data.exitCode === 0) {
        toast.success(`Executed successfully (${data.executionTimeMs}ms)`);
      } else {
        toast.error(`Execution failed with status: ${data.statusDescription}`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || err.message || 'Execution error';
      toast.error(msg);
      setRawConsoleOutput(`Execution Error:\n${msg}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Mode 2: Run Sample Tests (Visible Test Cases - 0 Credits)
  const handleRunSampleTests = async () => {
    if (!currentProblem || isRunning || isRunningSamples || isSubmitting) return;

    setIsRunningSamples(true);
    setActiveTab('tests');
    const toastId = toast.loading('Running visible sample test cases...');

    try {
      const response = await axios.post(
        `${backendServerUrl}/api/coding/sample-tests`,
        {
          interviewId,
          problemIndex: activeProblemIdx,
          language: selectedLang.slug,
          sourceCode: currentCode,
        },
        { withCredentials: true }
      );

      setLastRunResults(response.data);
      toast.dismiss(toastId);
      if (response.data.allPassed) {
        toast.success(`Passed all ${response.data.totalCount} sample test cases!`);
      } else {
        toast.error(`Passed ${response.data.passedCount}/${response.data.totalCount} sample test cases`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      const msg = err.response?.data?.message || err.message || 'Sample test execution error';
      toast.error(msg);
      setLastRunResults({
        passedCount: 0,
        totalCount: currentProblem.visibleTestCases?.length || 1,
        allPassed: false,
        results: [
          {
            testCaseIndex: 1,
            passed: false,
            input: 'Sample Test',
            expectedOutput: 'Valid execution',
            actualOutput: '',
            stderr: msg,
            error: msg,
            statusDescription: 'Execution Error',
          },
        ],
      });
    } finally {
      setIsRunningSamples(false);
    }
  };

  // Mode 3: Submit Solution (Full evaluation against hidden test cases + AI Review)
  const handleFinalSubmit = async () => {
    if (!currentProblem || isRunning || isRunningSamples || isSubmitting) return;

    setIsSubmitting(true);
    setActiveTab('ai');
    const toastId = toast.loading('Evaluating against full test suite & generating AI review...');

    try {
      const response = await axios.post(
        `${backendServerUrl}/api/coding/submit`,
        {
          interviewId,
          problemIndex: activeProblemIdx,
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
      setPastSubmissionsList((prev) => [
        {
          id: subData.submissionId,
          problemIndex: activeProblemIdx,
          language: selectedLang.name,
          verdict: subData.verdict,
          passed: `${subData.passedCount}/${subData.totalCount}`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      setLastRunResults({
        passedCount: subData.passedCount,
        totalCount: subData.totalCount,
        allPassed: subData.allPassed,
        results: subData.testResults,
        maxTimeMs: subData.maxTimeMs,
        maxMemoryKb: subData.maxMemoryKb,
      });

      toast.dismiss(toastId);
      if (subData.allPassed) {
        toast.success(`Verdict: ${subData.verdict}! All test cases passed.`);
      } else {
        toast.error(`Verdict: ${subData.verdict} (${subData.passedCount}/${subData.totalCount} passed)`);
      }
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
          {/* Session Timer if time limit configured */}
          {timeLeft !== null && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                timeLeft < 300
                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800 animate-pulse'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="Time remaining for this coding session"
            >
              <HiClock className="w-3.5 h-3.5 text-amber-400" />
              <span>{formatMMSS(timeLeft)}</span>
            </div>
          )}

          {/* Language Selector */}
          <select
            value={selectedLang.slug}
            onChange={(e) => {
              const lang = availableLanguages.find((l) => l.slug === e.target.value);
              if (lang) setSelectedLang(lang);
            }}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium cursor-pointer"
          >
            {availableLanguages.map((lang) => (
              <option key={lang.slug || lang.id} value={lang.slug}>
                {lang.name}
              </option>
            ))}
          </select>

          {/* Reset Code */}
          <button
            onClick={handleResetCode}
            title="Reset code to default template"
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
          <div className="flex-1 min-h-[300px] lg:min-h-[360px] relative">
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

          {/* Custom Input Drawer when toggled */}
          {useCustomInput && (
            <div className="bg-slate-900/90 border-t border-slate-800 p-2.5 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center justify-between">
                <span>Standard Input (stdin):</span>
                <span className="text-[10px] text-slate-500 lowercase">passed to program standard input</span>
              </label>
              <textarea
                rows={2}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Enter input parameters..."
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-200 outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          )}

          {/* Action Ribbon: Custom Input toggle & 3 Execution Buttons */}
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

            <div className="flex items-center gap-2">
              {/* Mode 1: Run Code */}
              <button
                onClick={handleRunCode}
                disabled={isRunning || isRunningSamples || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 disabled:opacity-50 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700 transition"
              >
                <HiPlay className="w-3.5 h-3.5 text-cyan-400" />
                {isRunning ? 'Running...' : 'Run Code'}
              </button>

              {/* Mode 2: Run Sample Tests */}
              <button
                onClick={handleRunSampleTests}
                disabled={isRunning || isRunningSamples || isSubmitting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/80 active:bg-cyan-800 disabled:opacity-50 text-cyan-300 font-semibold text-xs rounded-lg transition"
              >
                <HiBeaker className="w-3.5 h-3.5 text-cyan-400" />
                {isRunningSamples ? 'Testing...' : 'Run Sample Tests'}
              </button>

              {/* Mode 3: Submit Solution */}
              <button
                onClick={handleFinalSubmit}
                disabled={isRunning || isRunningSamples || isSubmitting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-lg shadow-emerald-900/20 transition"
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

                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-2.5 border-b-2 font-medium flex items-center gap-1.5 transition ${
                    activeTab === 'history'
                      ? 'border-amber-400 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HiHistory className="w-3.5 h-3.5" />
                  Submissions ({pastSubmissionsList.length})
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

            {/* Drawer Body Container */}
            <div className="flex-1 overflow-y-auto p-4 text-xs">
              {/* Tab 1: Test Cases */}
              {activeTab === 'tests' && (
                <div className="space-y-3">
                  {lastRunResults?.results ? (
                    <div>
                      {/* Test case tabs header */}
                      <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                        {lastRunResults.results.map((res, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveTestCaseIdx(i)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-mono text-xs transition ${
                              activeTestCaseIdx === i
                                ? res.passed
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {res.passed ? (
                              <HiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <HiXCircle className="w-3.5 h-3.5 text-rose-400" />
                            )}
                            Case {i + 1}
                            {res.isHidden && (
                              <span className="text-[10px] opacity-75 font-sans">(Hidden)</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Active Test Case Detail */}
                      {lastRunResults.results[activeTestCaseIdx] && (
                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2 font-mono">
                          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-900">
                            <span
                              className={`font-semibold ${
                                lastRunResults.results[activeTestCaseIdx].passed
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              Status: {lastRunResults.results[activeTestCaseIdx].statusDescription}
                            </span>
                            <span className="text-slate-500 font-sans text-[11px]">
                              Runtime: {lastRunResults.results[activeTestCaseIdx].executionTimeMs || 0}ms
                            </span>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Input:</span>
                            <pre className="text-slate-300 whitespace-pre-wrap">
                              {lastRunResults.results[activeTestCaseIdx].input || '(empty)'}
                            </pre>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Expected Output:</span>
                            <pre className="text-emerald-400 whitespace-pre-wrap">
                              {lastRunResults.results[activeTestCaseIdx].expectedOutput || '(empty)'}
                            </pre>
                          </div>

                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Actual Output:</span>
                            <pre
                              className={`whitespace-pre-wrap ${
                                lastRunResults.results[activeTestCaseIdx].passed
                                  ? 'text-emerald-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {lastRunResults.results[activeTestCaseIdx].actualOutput || '(empty)'}
                            </pre>
                          </div>

                          {lastRunResults.results[activeTestCaseIdx].error && (
                            <div className="pt-1">
                              <span className="text-rose-400 block text-[10px] uppercase font-sans">Error Output:</span>
                              <pre className="text-rose-300 text-[11px] whitespace-pre-wrap">
                                {lastRunResults.results[activeTestCaseIdx].error}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 space-y-1">
                      <p>Run code or sample tests to view evaluation results.</p>
                      <p className="text-[11px] text-slate-600">
                        Supports C, C++, Python, Java, and JavaScript with 0 credit deduction for runs.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Console Output */}
              {activeTab === 'console' && (
                <div className="font-mono text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 min-h-[160px] whitespace-pre-wrap">
                  {rawConsoleOutput ? (
                    <span className="text-slate-300">{rawConsoleOutput}</span>
                  ) : (
                    <span className="text-slate-600 italic">No output yet. Click 'Run Code' to execute.</span>
                  )}
                </div>
              )}

              {/* Tab 3: AI Code Evaluation */}
              {activeTab === 'ai' && (
                <div>
                  {currentSubmission?.aiEvaluation ? (
                    <div className="space-y-4">
                      {/* Metric Badges */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                          <span className="text-[10px] text-slate-500 uppercase block">Score</span>
                          <span className="text-lg font-bold text-purple-400">
                            {currentSubmission.aiEvaluation.score}/100
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                          <span className="text-[10px] text-slate-500 uppercase block">Correctness</span>
                          <span className="text-lg font-bold text-emerald-400">
                            {currentSubmission.aiEvaluation.correctness}/100
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                          <span className="text-[10px] text-slate-500 uppercase block">Time Complexity</span>
                          <span className="text-sm font-bold text-cyan-400">
                            {currentSubmission.aiEvaluation.timeComplexity}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center">
                          <span className="text-[10px] text-slate-500 uppercase block">Space Complexity</span>
                          <span className="text-sm font-bold text-cyan-400">
                            {currentSubmission.aiEvaluation.spaceComplexity}
                          </span>
                        </div>
                      </div>

                      {/* Feedback Text */}
                      {currentSubmission.aiEvaluation.overallFeedback && (
                        <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-lg">
                          <span className="text-xs font-semibold text-purple-300 block mb-1">
                            Interviewer Analysis
                          </span>
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {currentSubmission.aiEvaluation.overallFeedback}
                          </p>
                        </div>
                      )}

                      {/* Suggestions */}
                      {currentSubmission.aiEvaluation.suggestions?.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-semibold text-slate-400 block">
                            Optimization Suggestions:
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                            {currentSubmission.aiEvaluation.suggestions.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 space-y-1">
                      <p>Submit your solution to receive AI technical evaluation.</p>
                      <p className="text-[11px] text-slate-600">
                        Evaluates algorithmic Big-O complexity, correctness, and code readability.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Submissions History */}
              {activeTab === 'history' && (
                <div className="space-y-2">
                  {pastSubmissionsList.length > 0 ? (
                    <div className="divide-y divide-slate-800">
                      {pastSubmissionsList.map((sub, i) => (
                        <div key={i} className="py-2.5 flex items-center justify-between font-mono text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                sub.verdict === 'Accepted'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {sub.verdict}
                            </span>
                            <span className="text-slate-300 font-sans">{sub.language}</span>
                          </div>
                          <div className="flex items-center gap-4 text-slate-400">
                            <span>Passed: {sub.passed}</span>
                            <span className="text-[11px] text-slate-500">{sub.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      No submissions recorded for this problem yet.
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
