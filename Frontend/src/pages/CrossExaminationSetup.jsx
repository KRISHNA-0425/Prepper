import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineArrowLeft,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi';
import { FaFileArrowUp } from 'react-icons/fa6';
import { RiShieldFlashLine, RiCpuLine } from 'react-icons/ri';
import Navbar from '../components/Navbar';
import PastSessionsList from '../components/cross-examination/PastSessionsList';
import {
  createCrossExaminationSession,
  getMyCrossExaminationSessions,
  validateSessionSetupInput,
  generateIdempotencyKey,
  CROSS_EXAM_BOUNDS,
} from '../utils/crossExaminationApi';

function CrossExaminationSetup() {
  const navigate = useNavigate();
  const { userData } = useSelector((state) => state.user);

  // Form State
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'text'
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetDomain, setTargetDomain] = useState('General Software Engineering');
  const [questionCount, setQuestionCount] = useState(CROSS_EXAM_BOUNDS.DEFAULT_QUESTION_COUNT);

  // Interaction State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [loadingPastSessions, setLoadingPastSessions] = useState(true);
  const [pastSessions, setPastSessions] = useState([]);

  // Stable idempotency key across retries for the same attempt
  const currentIdempotencyKeyRef = useRef(null);

  // Load past sessions
  const fetchPastSessions = useCallback(async () => {
    if (!userData) return;
    try {
      setLoadingPastSessions(true);
      const data = await getMyCrossExaminationSessions(10);
      setPastSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (err) {
      console.warn('Failed to fetch past cross-examinations:', err.message);
    } finally {
      setLoadingPastSessions(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchPastSessions();
  }, [fetchPastSessions]);

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setValidationError('');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setValidationError('Only PDF documents are supported for upload.');
        return;
      }
      if (file.size > CROSS_EXAM_BOUNDS.MAX_FILE_SIZE_BYTES) {
        setValidationError('File size exceeds the 10MB limit.');
        return;
      }
      setResumeFile(file);
    }
  };

  const handleFileSelect = (e) => {
    setValidationError('');
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setValidationError('Only PDF documents are supported for upload.');
        return;
      }
      if (file.size > CROSS_EXAM_BOUNDS.MAX_FILE_SIZE_BYTES) {
        setValidationError('File size exceeds the 10MB limit.');
        return;
      }
      setResumeFile(file);
    }
  };

  // Submit Handler
  const handleStartSession = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!userData) {
      toast.error('Please log in to start a cross-examination session.');
      return;
    }

    // Client-side validation
    const validation = validateSessionSetupInput({
      resumeFile: inputMode === 'upload' ? resumeFile : null,
      resumeText: inputMode === 'text' ? resumeText : null,
      questionCount,
    });

    if (!validation.isValid) {
      setValidationError(validation.error);
      toast.error(validation.error);
      return;
    }

    // Ensure stable idempotency key for this logical attempt
    if (!currentIdempotencyKeyRef.current) {
      currentIdempotencyKeyRef.current = generateIdempotencyKey();
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Extracting resume claims and preparing cross-examination...');

    try {
      const response = await createCrossExaminationSession({
        resumeFile: inputMode === 'upload' ? resumeFile : null,
        resumeText: inputMode === 'text' ? resumeText.trim() : null,
        targetRole: targetRole.trim(),
        targetDomain: targetDomain.trim(),
        questionCount,
        idempotencyKey: currentIdempotencyKeyRef.current,
      });

      toast.success(
        response.isIdempotentReplay
          ? 'Resumed existing cross-examination session.'
          : 'Cross-examination session created successfully!',
        { id: toastId }
      );

      // Reset idempotency key for future new attempts
      currentIdempotencyKeyRef.current = null;

      const sessionId = response?.session?.sessionId || response?.session?._id;
      if (sessionId) {
        navigate(`/cross-examination/${sessionId}`);
      } else {
        toast.error('Session created but session ID is missing.', { id: toastId });
      }
    } catch (err) {
      console.error('Session creation failed:', err);
      const serverMessage =
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initialize session';

      setValidationError(serverMessage);
      toast.error(serverMessage, { id: toastId });
      // Keep currentIdempotencyKeyRef.current intact so retrying reuses the same idempotency key
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-poppins selection:bg-yellow-400 selection:text-slate-900 pb-20">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-yellow-400 transition-colors group"
          >
            <HiOutlineArrowLeft className="text-base group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>

          <span className="text-[11px] font-bold text-yellow-400/90 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1 rounded-full flex items-center gap-1.5 uppercase tracking-wider">
            <RiShieldFlashLine className="text-sm" />
            Source-Grounded Probing
          </span>
        </div>

        {/* Hero Title */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3">
            Resume & Project <br />
            <span className="text-yellow-400 inline-block">Cross-Examination</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Upload your resume or paste its text. Our engine extracts verified technical claims, isolates architecture
            boundaries, and probes the depth of your actual project implementation.
          </p>
        </div>

        {/* Setup Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md mb-12"
        >
          <form onSubmit={handleStartSession} className="space-y-6">
            {/* Input Mode Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Resume Input Method
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/70 p-1.5 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('upload');
                    setValidationError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'upload'
                      ? 'bg-yellow-400 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FaFileArrowUp className="text-sm" />
                  Upload PDF Resume
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode('text');
                    setValidationError('');
                  }}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    inputMode === 'text'
                      ? 'bg-yellow-400 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <HiOutlineDocumentText className="text-base" />
                  Paste Resume Text
                </button>
              </div>
            </div>

            {/* Resume File Upload Box */}
            {inputMode === 'upload' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Resume Document (.pdf)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                    isDragging
                      ? 'border-yellow-400 bg-yellow-400/5 scale-[1.01]'
                      : resumeFile
                      ? 'border-emerald-500/60 bg-emerald-950/20'
                      : 'border-slate-700/80 bg-slate-950/50 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="file"
                    id="resumeUploadInput"
                    accept=".pdf,application/pdf"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {resumeFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <HiOutlineCheckCircle className="text-4xl text-emerald-400" />
                      <p className="text-sm font-bold text-slate-200">{resumeFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                      <FaFileArrowUp className="text-3xl text-yellow-400 mb-1" />
                      <p className="text-sm font-bold text-slate-200">
                        Drag and drop your PDF resume here, or <span className="text-yellow-400 underline">browse</span>
                      </p>
                      <p className="text-xs text-slate-500">Supported format: PDF (Max size: 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resume Text Input Box */}
            {inputMode === 'text' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="resumeTextArea" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Paste Resume Content
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      resumeText.length > CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS
                        ? 'text-red-400 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {resumeText.length.toLocaleString()} / {CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS.toLocaleString()}{' '}
                    chars
                  </span>
                </div>
                <textarea
                  id="resumeTextArea"
                  rows={8}
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="Paste your resume content, experience descriptions, and technical project details here..."
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-sans leading-relaxed"
                />
              </div>
            )}

            {/* Target Role & Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="targetRoleInput" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Target Role (Optional)
                </label>
                <input
                  id="targetRoleInput"
                  type="text"
                  maxLength={120}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>
              <div>
                <label htmlFor="targetDomainInput" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Target Technical Domain
                </label>
                <input
                  id="targetDomainInput"
                  type="text"
                  maxLength={120}
                  value={targetDomain}
                  onChange={(e) => setTargetDomain(e.target.value)}
                  placeholder="e.g. Distributed Systems & Cloud Infrastructure"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                />
              </div>
            </div>

            {/* Question Count Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Question Count
                </label>
                <span className="text-xs font-bold text-yellow-400 font-mono">
                  {questionCount} Probing Questions
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[3, 4, 5, 6, 7, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      questionCount === num
                        ? 'bg-yellow-400 text-slate-950 shadow-sm font-black'
                        : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Validation Error Banner */}
            <AnimatePresence>
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="bg-red-950/40 border border-red-800/60 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-300"
                >
                  <HiOutlineExclamationCircle className="text-red-400 text-base shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy & Provenance Guarantee Note */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
              <HiOutlineInformationCircle className="text-yellow-400 text-base shrink-0 mt-0.5" />
              <span>
                <strong>Zero Fabrication Guarantee:</strong> Questions are strictly grounded in claims extracted from your
                resume. Internal evaluation rubrics are kept server-side to ensure candidate fairness.
              </span>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
                isSubmitting
                  ? 'bg-yellow-400/60 text-slate-900 cursor-not-allowed'
                  : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 hover:shadow-yellow-400/20 active:scale-[0.99]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RiCpuLine className="text-lg animate-spin" />
                  Analyzing Claims & Generating Blueprint...
                </>
              ) : (
                <>
                  <HiOutlineSparkles className="text-lg" />
                  Begin Cross-Examination
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Past Sessions List */}
        <div className="mt-8">
          <PastSessionsList
            sessions={pastSessions}
            loading={loadingPastSessions}
            onRefresh={fetchPastSessions}
          />
        </div>
      </main>
    </div>
  );
}

export default CrossExaminationSetup;
