import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineCheckBadge,
  HiOutlineShieldCheck,
  HiOutlineExclamationTriangle,
  HiOutlineBookOpen,
  HiOutlineLightBulb,
  HiOutlineArrowRight,
  HiOutlineArrowPath,
  HiOutlineDocumentText,
  HiOutlineInformationCircle,
  HiOutlineXMark,
  HiOutlineHome,
  HiOutlineQuestionMarkCircle,
  HiOutlineSparkles,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
} from 'react-icons/hi2';
import { RiLoader4Line } from 'react-icons/ri';
import toast from 'react-hot-toast';
import { generateCrossExamReport } from '../../utils/crossExaminationApi';

function PreparationReport({ session, initialReport, onReportUpdated }) {
  const navigate = useNavigate();
  const [report, setReport] = useState(initialReport || session?.report);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeEvidenceModal, setActiveEvidenceModal] = useState(null);
  const [showClaimsMatrix, setShowClaimsMatrix] = useState(false);

  const sessionId = session?.sessionId || session?._id;

  // Handle report regeneration
  const handleRegenerate = async () => {
    if (!sessionId || isRegenerating) return;
    setIsRegenerating(true);
    const toastId = toast.loading('Synthesizing fresh evidence-linked report...');
    try {
      const data = await generateCrossExamReport(sessionId, true);
      if (data && data.report) {
        setReport(data.report);
        if (typeof onReportUpdated === 'function') {
          onReportUpdated(data.report);
        }
        toast.success('Report successfully regenerated!', { id: toastId });
      }
    } catch (err) {
      console.error('Failed to regenerate report:', err);
      toast.error(err.response?.data?.message || 'Error regenerating report', { id: toastId });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Find question and answer matching evidence reference
  const openEvidenceModal = (ref) => {
    if (!ref || !session?.questions) return;
    const targetQ = session.questions.find((q) => q.questionId === ref.questionId);
    const targetA = session.answers?.find((a) => a.questionId === ref.questionId);
    setActiveEvidenceModal({
      question: targetQ || { questionText: 'Question reference not found' },
      answer: targetA || { rawTranscript: 'Candidate transcript recorded for this probe.' },
      ref,
    });
  };

  if (!report) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-xl mx-auto my-6">
        <RiLoader4Line className="text-3xl text-yellow-400 animate-spin mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-2">Compiling Preparation Report...</h3>
        <p className="text-xs text-slate-400 mb-6">
          Aggregating verified claims, dimension assessments, and actionable recommendations.
        </p>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
        >
          {isRegenerating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    );
  }

  const completion = report.completionState || {
    totalQuestions: session?.questions?.length || 0,
    answeredCount: session?.answersCount || session?.answers?.length || 0,
    skippedCount: 0,
    evaluatedCount: 0,
    unexaminedClaimsCount: 0,
  };

  const strengths = Array.isArray(report.demonstratedStrengths) ? report.demonstratedStrengths : [];
  const gaps = Array.isArray(report.preparationGaps) ? report.preparationGaps : [];
  const alternativeApproaches = Array.isArray(report.alternativeApproachesAcknowledged)
    ? report.alternativeApproachesAcknowledged
    : [];
  const recommendations = Array.isArray(report.studyRecommendations) ? report.studyRecommendations : [];
  const dimensionScores = Array.isArray(report.dimensionScores) ? report.dimensionScores : [];
  const claimsMatrix = Array.isArray(report.claimVerificationMatrix) ? report.claimVerificationMatrix : [];
  const limitations = Array.isArray(report.limitations) ? report.limitations : [];

  return (
    <div className="w-full space-y-8 animate-fadeIn text-left">
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                <HiOutlineCheckBadge className="text-xs" />
                Session Finalized
              </span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-slate-800 px-2.5 py-0.5 rounded-full">
                v{report.version || '1.0.0'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cross-Examination Preparation Report
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {session?.targetRole || 'Engineering Candidate'} &bull; {session?.targetDomain || 'General Software Engineering'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              title="Regenerate preparation report synthesis"
            >
              <HiOutlineArrowPath className={`text-sm ${isRegenerating ? 'animate-spin text-yellow-400' : ''}`} />
              {isRegenerating ? 'Refreshing...' : 'Regenerate'}
            </button>
            <button
              onClick={() => navigate('/cross-examination')}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg"
            >
              New Session
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineSparkles className="text-yellow-400 text-sm" />
            <span className="text-[11px] font-black uppercase tracking-wider text-yellow-400 font-mono">
              Executive Readiness Summary
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            {report.executiveSummary || report.summary || 'Summary unavailable.'}
          </p>
        </div>
      </div>

      {/* 2. Coverage & Metric Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center shadow-lg">
          <p className="text-2xl font-black text-yellow-400 font-mono">
            {completion.answeredCount} / {completion.totalQuestions}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Questions Answered</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center shadow-lg">
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {completion.evaluatedCount}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Evidence Evaluated</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center shadow-lg">
          <p className="text-2xl font-black text-sky-400 font-mono">
            {report.verifiedClaimsCount || 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Demonstrated Claims</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center shadow-lg">
          <p className="text-2xl font-black text-slate-400 font-mono">
            {completion.unexaminedClaimsCount || 0}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">Unexamined Claims</p>
        </div>
      </div>

      {/* 3. Dimension Readiness Overview (No arbitrary numbers; transparent evidence states) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineShieldCheck className="text-yellow-400 text-xl" />
              Examination Dimension Readiness
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Reflects demonstrated technical reasoning across observed questions. Topics not tested are explicitly marked as unavailable.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dimensionScores.map((dim) => {
            const isStrong = dim.demonstratedLevel === 'STRONG';
            const isMod = dim.demonstratedLevel === 'MODERATE';
            const isWeak = dim.demonstratedLevel === 'WEAK';

            const badgeColor = isStrong
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
              : isMod
              ? 'bg-yellow-950/80 text-yellow-400 border-yellow-800/80'
              : isWeak
              ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
              : 'bg-slate-950 text-slate-400 border-slate-800';

            return (
              <div
                key={dim.dimension}
                className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-slate-200">
                    {dim.dimension.replace(/_/g, ' ')}
                  </span>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                    {dim.demonstratedLevel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {dim.rationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Demonstrated Strengths (Evidence-Linked) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <HiOutlineCheckBadge className="text-emerald-400 text-xl" />
          Demonstrated Technical Strengths
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Architectural solutions, trade-offs, and design choices directly substantiated by your answers.
        </p>

        {strengths.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No strong technical assertions substantiated yet.</p>
        ) : (
          <div className="space-y-3">
            {strengths.map((s, idx) => (
              <div
                key={s.id || idx}
                className="bg-slate-950/60 border border-emerald-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <strong className="text-xs font-bold text-emerald-300 block mb-0.5">
                    {s.title}
                  </strong>
                  <p className="text-xs text-slate-300 leading-relaxed">{s.description}</p>
                </div>
                {s.evidenceReferences?.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.evidenceReferences.map((ref, rIdx) => (
                      <button
                        key={rIdx}
                        onClick={() => openEvidenceModal(ref)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-yellow-400 border border-slate-800 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <HiOutlineDocumentText className="text-xs" />
                        Source Q
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Valid Alternative Technical Approaches Acknowledged */}
      {alternativeApproaches.length > 0 && (
        <div className="bg-slate-900/90 border border-sky-900/50 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineLightBulb className="text-sky-400 text-xl" />
            <h2 className="text-lg font-bold text-white">Valid Alternative Approaches Acknowledged</h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Prepper AI respects valid engineering design choices. The following alternative solutions were recognized as legitimate technical decisions rather than penalized.
          </p>

          <div className="space-y-3">
            {alternativeApproaches.map((alt, idx) => (
              <div
                key={alt.id || idx}
                className="bg-slate-950/60 border border-sky-800/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider block mb-1">
                    {alt.topic}
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">{alt.description}</p>
                </div>
                {alt.questionId && (
                  <button
                    onClick={() => openEvidenceModal({ questionId: alt.questionId, answerId: alt.answerId })}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-sky-400 border border-slate-800 rounded-lg transition-colors shrink-0"
                  >
                    View Source Q
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Prioritized Preparation Gaps */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <HiOutlineExclamationTriangle className="text-yellow-400 text-xl" />
          Prioritized Preparation Gaps
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Specific technical omissions, ambiguities, or trade-offs that need clearer justification in upcoming interviews.
        </p>

        {gaps.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No significant preparation gaps were observed.</p>
        ) : (
          <div className="space-y-3">
            {gaps.map((gap, idx) => {
              const isHigh = gap.severity === 'HIGH';
              const isMed = gap.severity === 'MEDIUM';
              const badgeStyle = isHigh
                ? 'bg-red-950/80 text-red-400 border-red-800/80'
                : isMed
                ? 'bg-yellow-950/80 text-yellow-400 border-yellow-800/80'
                : 'bg-slate-950 text-slate-400 border-slate-800';

              return (
                <div
                  key={gap.id || idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                        {gap.severity} Priority
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {gap.topic?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1.5">{gap.gapDescription}</p>
                  </div>
                  {gap.evidenceReferences?.length > 0 && (
                    <button
                      onClick={() => openEvidenceModal(gap.evidenceReferences[0])}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-yellow-400 border border-slate-800 rounded-lg transition-colors shrink-0"
                    >
                      View Q&A
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Actionable Study Recommendations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
          <HiOutlineBookOpen className="text-yellow-400 text-xl" />
          Targeted Study & Preparation Tasks
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          Concrete exercises and concepts tailored to address your specific gaps.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div
              key={rec.id || idx}
              className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-white">{rec.topic}</span>
                  <span className="text-[10px] font-mono font-bold uppercase text-yellow-400 bg-yellow-950/60 border border-yellow-800/60 px-2 py-0.5 rounded-full">
                    {rec.priority || 'MEDIUM'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">{rec.recommendation}</p>
              </div>

              {Array.isArray(rec.targetAreas) && rec.targetAreas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-800/60">
                  {rec.targetAreas.map((area, aIdx) => (
                    <span
                      key={aIdx}
                      className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 8. Collapsible Resume Claim Verification Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <div
          onClick={() => setShowClaimsMatrix(!showClaimsMatrix)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <HiOutlineDocumentText className="text-yellow-400 text-xl" />
              Resume Claim Verification Matrix ({claimsMatrix.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of extracted resume statements and corroboration status.
            </p>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors">
            {showClaimsMatrix ? <HiOutlineChevronUp className="text-xl" /> : <HiOutlineChevronDown className="text-xl" />}
          </button>
        </div>

        {showClaimsMatrix && (
          <div className="mt-6 space-y-3 pt-4 border-t border-slate-800">
            {claimsMatrix.map((claim) => {
              const isDemonstrated = claim.verificationStatus === 'DEMONSTRATED';
              const isUnexamined = claim.verificationStatus === 'UNEXAMINED';
              const isContra = claim.verificationStatus === 'UNRESOLVED_CONTRADICTION';

              const statusBadge = isDemonstrated
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                : isContra
                ? 'bg-red-950/80 text-red-400 border-red-800'
                : isUnexamined
                ? 'bg-slate-950 text-slate-400 border-slate-800'
                : 'bg-yellow-950/80 text-yellow-400 border-yellow-800';

              return (
                <div
                  key={claim.claimId}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {claim.projectTitle} &bull; {claim.category}
                      </span>
                    </div>
                    <p className="text-slate-200 font-medium mb-1">{claim.statement}</p>
                    {claim.sourceExcerpt && (
                      <p className="text-[11px] text-slate-400 italic font-mono bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800/60 inline-block">
                        &ldquo;{claim.sourceExcerpt}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                      {claim.verificationStatus}
                    </span>
                    {claim.evidenceReferences?.length > 0 && (
                      <button
                        onClick={() => openEvidenceModal(claim.evidenceReferences[0])}
                        className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-yellow-400 border border-slate-800 rounded-md transition-colors"
                      >
                        Source Q
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 9. Limitations & Evidence Sufficiency Disclosures */}
      <div className="bg-slate-950/80 border border-slate-800/80 rounded-3xl p-6 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-slate-200 font-bold mb-1">
          <HiOutlineInformationCircle className="text-yellow-400 text-lg" />
          Evaluation Scope & Limitations
        </div>
        {limitations.map((lim, idx) => (
          <p key={idx} className="leading-relaxed pl-6 relative">
            <span className="absolute left-2 text-slate-500">&bull;</span>
            {lim}
          </p>
        ))}
      </div>

      {/* 10. Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
        <button
          onClick={() => navigate('/cross-examination')}
          className="w-full sm:w-auto px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          Start New Cross-Examination
          <HiOutlineArrowRight className="text-sm" />
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
        >
          <HiOutlineHome className="text-sm" />
          Home Dashboard
        </button>
      </div>

      {/* Evidence Source Detail Modal */}
      <AnimatePresence>
        {activeEvidenceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-left max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                <div className="flex items-center gap-2">
                  <HiOutlineDocumentText className="text-yellow-400 text-lg" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Source Question & Candidate Transcript
                  </h3>
                </div>
                <button
                  onClick={() => setActiveEvidenceModal(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                >
                  <HiOutlineXMark className="text-xl" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Question Text
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 bg-slate-950 border border-slate-800 rounded-2xl p-4 leading-relaxed font-sans">
                    {activeEvidenceModal.question?.questionText}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                    Submitted Answer Transcript
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 bg-slate-950 border border-slate-800 rounded-2xl p-4 leading-relaxed whitespace-pre-wrap font-sans">
                    {activeEvidenceModal.answer?.rawTranscript || 'Transcript unavailable.'}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setActiveEvidenceModal(null)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PreparationReport;
