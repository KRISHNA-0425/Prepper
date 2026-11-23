import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiSparkles,
  HiArrowRight,
  HiBriefcase,
  HiCode,
  HiX,
} from 'react-icons/hi';
import { FaFileArrowUp } from 'react-icons/fa6';
import { RiShieldFlashLine, RiCpuLine, RiHistoryLine } from 'react-icons/ri';
import { IoArrowBackOutline } from 'react-icons/io5';
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
  const [showPastSessionsModal, setShowPastSessionsModal] = useState(false);

  // Stable idempotency key across retries for the same attempt
  const currentIdempotencyKeyRef = useRef(null);

  // Micro-interaction variants
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.1, type: 'spring', stiffness: 100 },
    }),
  };

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
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen w-full flex items-center justify-center bg-[#F5EC5A] p-3 sm:p-4 md:p-6 lg:p-8 font-poppins overflow-y-auto"
      >
        <div className="w-full max-w-6xl bg-white rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.1)] grid grid-cols-1 md:grid-cols-2 overflow-hidden my-auto md:h-[90vh] md:max-h-[840px]">
          {/* --- Left Column: Branding --- */}
          <motion.div
            initial={{ x: -50 }}
            animate={{ x: 0 }}
            className="relative bg-slate-900 p-6 sm:p-8 md:p-10 flex flex-col justify-center text-white overflow-hidden min-h-0"
          >
            <button
              type="button"
              aria-label="Back to home"
              className="absolute top-5 left-5 md:top-8 md:left-8 z-50 p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onClick={() => navigate('/')}
            >
              <IoArrowBackOutline size={26} className="text-yellow-500" />
            </button>

            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl"
            />

            <div className="relative z-10">
              <motion.div
                whileHover={{ scale: 1.05, rotate: -2 }}
                className="inline-flex px-4 h-12 bg-yellow-400 rounded-2xl items-center justify-center text-slate-900 text-2xl mb-6 shadow-lg font-black cursor-pointer"
              >
                <HiSparkles className="mr-2" /> <span>PREPPER</span>
              </motion.div>

              <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-tight">
                Cross-Examination <br /> <span className="text-yellow-400">Interview</span>
              </h1>
              <p className="text-slate-400 text-base mb-8 max-w-sm">
                Deep-dive into your real projects, verify scale claims, and identify preparation gaps with our
                specialized AI cross-examination engine.
              </p>

              <div className="space-y-3">
                {[
                  { icon: <RiShieldFlashLine />, text: 'Source-Grounded Probing', color: 'text-yellow-400' },
                  { icon: <HiOutlineSparkles />, text: 'Architecture Boundary Check', color: 'text-blue-400' },
                  { icon: <HiOutlineCheckCircle />, text: 'Zero Fabrication Guarantee', color: 'text-green-400' },
                ].map((item, i) => (
                  <motion.div
                    custom={i}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ x: 10, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-all cursor-default"
                  >
                    <span className={`${item.color} text-xl`}>{item.icon}</span>
                    <span className="text-slate-200 font-bold text-sm">{item.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* --- Right Column: Form --- */}
          <motion.div className="p-6 md:px-8 md:py-6 lg:p-10 flex flex-col bg-white overflow-y-auto min-h-0 custom-scrollbar">
            <motion.div layout className="max-w-md mx-auto w-full space-y-4 my-auto py-2">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                    Cross-Examination Setup
                  </h2>
                  {pastSessions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPastSessionsModal(true)}
                      className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RiHistoryLine /> Past ({pastSessions.length})
                    </button>
                  )}
                </div>
                <p className="text-slate-500 font-medium text-xs">Fill details or let AI extract from your resume</p>
              </motion.div>

              <form onSubmit={handleStartSession} className="space-y-4">
                {/* Resume Input Mode Toggle Tabs */}
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('upload');
                      setValidationError('');
                    }}
                    className={`py-2 px-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      inputMode === 'upload'
                        ? 'bg-slate-900 text-yellow-400 shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FaFileArrowUp className="text-sm" />
                    Upload PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                      setValidationError('');
                    }}
                    className={`py-2 px-3 rounded-lg font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      inputMode === 'text'
                        ? 'bg-slate-900 text-yellow-400 shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <HiOutlineDocumentText className="text-base" />
                    Paste Text
                  </button>
                </div>

                {/* Upload Mode Box */}
                {inputMode === 'upload' && (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all group relative ${
                      isDragging
                        ? 'border-yellow-400 bg-yellow-50/50 scale-[1.01]'
                        : resumeFile
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-200 hover:bg-yellow-50/50 hover:border-yellow-400'
                    }`}
                    onClick={() => document.getElementById('resumeUploadInput').click()}
                  >
                    <input
                      type="file"
                      id="resumeUploadInput"
                      accept=".pdf,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {resumeFile ? (
                      <div className="flex flex-col items-center gap-1">
                        <HiOutlineCheckCircle className="text-2xl text-emerald-600 mb-0.5" />
                        <p className="text-xs font-bold text-slate-800 truncate max-w-full">{resumeFile.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {(resumeFile.size / (1024 * 1024)).toFixed(2)} MB • Click or drop to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <FaFileArrowUp className="text-2xl mx-auto text-slate-400 group-hover:text-yellow-600 group-hover:scale-110 transition-all mb-1" />
                        <p className="text-xs font-bold text-slate-600 truncate">
                          Drag and drop your PDF resume, or <span className="text-yellow-600 underline">browse</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supported format: PDF (Max size: 10MB)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Paste Mode Box */}
                {inputMode === 'text' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="resumeTextArea"
                        className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400"
                      >
                        <HiOutlineDocumentText /> Resume Content
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          resumeText.length > CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS
                            ? 'text-red-600 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {resumeText.length.toLocaleString()} /{' '}
                        {CROSS_EXAM_BOUNDS.MAX_RESUME_TEXT_CHARS.toLocaleString()} chars
                      </span>
                    </div>
                    <textarea
                      id="resumeTextArea"
                      rows={4}
                      value={resumeText}
                      onChange={(e) => {
                        setResumeText(e.target.value);
                        setValidationError('');
                      }}
                      placeholder="Paste your resume content, experience descriptions, and technical project details here..."
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800 text-xs custom-scrollbar"
                    />
                  </div>
                )}

                {/* Target Role & Technical Domain Inputs */}
                <motion.div className="space-y-3">
                  <div className="group space-y-1">
                    <label
                      htmlFor="targetRoleInput"
                      className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-yellow-600 transition-colors"
                    >
                      <HiBriefcase /> Target Role{' '}
                      <span className="text-slate-300 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      id="targetRoleInput"
                      type="text"
                      maxLength={120}
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800"
                    />
                  </div>

                  <div className="group space-y-1">
                    <label
                      htmlFor="targetDomainInput"
                      className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-yellow-600 transition-colors"
                    >
                      <HiCode /> Target Technical Domain
                    </label>
                    <input
                      id="targetDomainInput"
                      type="text"
                      maxLength={120}
                      value={targetDomain}
                      onChange={(e) => setTargetDomain(e.target.value)}
                      placeholder="e.g. Distributed Systems & Cloud Infrastructure"
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800"
                    />
                  </div>
                </motion.div>

                {/* Question Allocation Selector */}
                <motion.div layout className="p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 block">Question Allocation</span>
                      <span className="text-[10px] text-slate-500">3 to 10 probing inquiries</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900">{questionCount}</span>
                      <span className="text-[10px] font-bold text-slate-500 ml-1">Questions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[3, 4, 5, 6, 7, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuestionCount(num)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          questionCount === num
                            ? 'bg-slate-900 text-yellow-400 shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-yellow-400 hover:text-slate-900'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Zero Fabrication Guarantee Note */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-600 leading-snug">
                  <HiOutlineInformationCircle className="text-yellow-600 text-base shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-slate-800 font-bold">Zero Fabrication Guarantee:</strong> Questions are
                    strictly grounded in claims extracted from your resume. Internal evaluation rubrics are kept
                    server-side to ensure candidate fairness.
                  </span>
                </div>

                {/* Validation Error Banner */}
                <AnimatePresence>
                  {validationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-xs text-red-600 font-medium"
                    >
                      <HiOutlineExclamationCircle className="text-red-500 text-base shrink-0 mt-0.5" />
                      <span>{validationError}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit Action Button */}
                <motion.button
                  layout
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RiCpuLine className="text-xl animate-spin text-yellow-400" />
                      <span>Analyzing Claims & Generating Blueprint...</span>
                    </>
                  ) : (
                    <>
                      <span>Begin Cross-Examination</span>
                      <HiArrowRight className="text-yellow-400 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Past Sessions Modal */}
      <AnimatePresence>
        {showPastSessionsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-poppins"
            onClick={() => setShowPastSessionsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <RiHistoryLine className="text-yellow-400 text-xl" />
                  <h3 className="text-lg font-black text-white">Past Cross-Examinations</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close past sessions"
                  onClick={() => setShowPastSessionsModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <HiX size={20} />
                </button>
              </div>

              <PastSessionsList
                sessions={pastSessions}
                loading={loadingPastSessions}
                onRefresh={fetchPastSessions}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default CrossExaminationSetup;
