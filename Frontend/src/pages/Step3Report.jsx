import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import {
  HiOutlineArrowLeft,
  HiSparkles,
  HiOutlineCheckCircle,
  HiChatBubbleLeftRight,
  HiUserCircle,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineLightBulb,
  HiOutlineAcademicCap,
  HiOutlineShieldCheck,
  HiOutlineExclamationCircle,
  HiOutlineInformationCircle,
  HiOutlineCodeBracket,
} from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import CodingReportSection from '../components/coding/CodingReportSection';
import RecoveryPlanSetupModal from '../components/recovery/RecoveryPlanSetupModal';
import { RiRoadMapLine, RiSparklingLine, RiArrowRightLine } from 'react-icons/ri';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

const STANDARD_CRITERIA_NAMES = [
  'Technical Accuracy',
  'Conceptual Understanding',
  'Practical Knowledge',
  'Depth of Explanation',
  'Problem-Solving Ability',
  'Communication Clarity',
];

function Step3Report({ report }) {
  const navigate = useNavigate();
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [evidenceFilter, setEvidenceFilter] = useState('all'); // 'all' | 'correct' | 'partially_correct' | 'incorrect' | 'missing'
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);

  const toggleQuestion = (index) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Derive unified analytics, supporting backward compatibility with legacy interview reports
  const analytics = useMemo(() => {
    if (!report) return null;
    if (report.analytics && Array.isArray(report.analytics.criterionScores)) {
      return report.analytics;
    }

    // Dynamic derivation for legacy reports
    const questions = Array.isArray(report.questions) ? report.questions : [];
    const totalQuestions = questions.length || 1;
    let sumCorrectness = 0;
    let sumComms = 0;
    let sumConfidence = 0;
    let sumScore = 0;

    questions.forEach((q) => {
      sumScore += Number(q.score) || 0;
      sumCorrectness += Number(q.correctness) || Number(q.score) || 0;
      sumComms += Number(q.communication) || Number(q.score) || 0;
      sumConfidence += Number(q.confidence) || Number(q.score) || 0;
    });

    const avgScore = sumScore / totalQuestions;
    const avgCorrectness = sumCorrectness / totalQuestions;
    const avgComms = sumComms / totalQuestions;
    const avgDepth = sumConfidence / totalQuestions;

    const criterionScores = [
      { name: 'Technical Accuracy', score: Math.round(avgCorrectness * 10) / 10, maxScore: 10, percentage: Math.round(avgCorrectness * 10) },
      { name: 'Conceptual Understanding', score: Math.round(avgCorrectness * 10) / 10, maxScore: 10, percentage: Math.round(avgCorrectness * 10) },
      { name: 'Practical Knowledge', score: Math.round(avgScore * 10) / 10, maxScore: 10, percentage: Math.round(avgScore * 10) },
      { name: 'Depth of Explanation', score: Math.round(avgDepth * 10) / 10, maxScore: 10, percentage: Math.round(avgDepth * 10) },
      { name: 'Problem-Solving Ability', score: Math.round(avgScore * 10) / 10, maxScore: 10, percentage: Math.round(avgScore * 10) },
      { name: 'Communication Clarity', score: Math.round(avgComms * 10) / 10, maxScore: 10, percentage: Math.round(avgComms * 10) },
    ];

    const sorted = [...criterionScores].sort((a, b) => b.score - a.score);

    return {
      overallScore: Math.round(avgScore * 10) / 10,
      percentageScore: Math.round(avgScore * 10),
      criterionScores,
      strongestCompetencies: sorted.slice(0, 2).map((c) => c.name),
      weakestCompetencies: sorted.slice(-2).reverse().map((c) => c.name),
      recurringGaps: ['Review core architectural patterns and provide detailed examples.'],
      keyStrengths: ['Demonstrated clear communication across recorded questions.'],
      studyRecommendations: ['Deepen technical explanations with specific metrics and implementation trade-offs.'],
    };
  }, [report]);

  // Aggregate all evidence items across all questions for the global Evidence Explorer
  const allEvidenceItems = useMemo(() => {
    if (!report?.questions) return [];
    const items = [];

    report.questions.forEach((q, qIdx) => {
      const qNum = qIdx + 1;
      const evObj = q.evidenceEvaluation;

      if (evObj && Array.isArray(evObj.criteria)) {
        evObj.criteria.forEach((crit) => {
          if (Array.isArray(crit.evidence)) {
            crit.evidence.forEach((ev) => {
              if (ev.text || ev.explanation) {
                items.push({
                  questionIndex: qNum,
                  questionText: q.question,
                  criterionName: crit.name,
                  text: ev.text,
                  classification: ev.classification || 'correct',
                  explanation: ev.explanation,
                });
              }
            });
          }
        });
      } else if (q.answer && q.feedback) {
        // Legacy fallback evidence item
        items.push({
          questionIndex: qNum,
          questionText: q.question,
          criterionName: 'General Performance',
          text: q.answer.slice(0, 160),
          classification: Number(q.score) >= 7 ? 'correct' : (Number(q.score) >= 4 ? 'partially_correct' : 'incorrect'),
          explanation: q.feedback,
        });
      }
    });

    return items;
  }, [report]);

  // Filtered evidence items
  const filteredEvidence = useMemo(() => {
    if (evidenceFilter === 'all') return allEvidenceItems;
    if (evidenceFilter === 'incorrect') {
      return allEvidenceItems.filter((e) => e.classification === 'incorrect' || e.classification === 'misunderstanding' || e.classification === 'unsupported_claim');
    }
    return allEvidenceItems.filter((e) => e.classification === evidenceFilter);
  }, [allEvidenceItems, evidenceFilter]);

  if (!report) {
    return (
      <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-yellow-400 font-black uppercase tracking-widest font-poppins text-sm">
          Compiling Evidence-Based Report...
        </div>
      </div>
    );
  }

  // Radar Data for visual dimension overview
  const radarData = (analytics?.criterionScores || []).map((c) => ({
    subject: c.name.replace(' Ability', '').replace(' of Explanation', ''),
    score: c.percentage || c.score * 10,
    fullMark: 100,
  }));

  // Bar Data for question efficiency
  const barData = (report.questions || []).map((q, i) => ({
    name: `Q${i + 1}`,
    score: Number(q.score) || 0,
  }));

  const overallPercent = Math.round(
    report.finalScore !== undefined ? (report.finalScore <= 10 ? report.finalScore * 10 : report.finalScore) : (analytics?.percentageScore || 0)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-poppins p-4 sm:p-6 md:p-12 overflow-x-hidden selection:bg-yellow-400 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header Navigation */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <motion.button
            whileHover={{ x: -4 }}
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-slate-400 hover:text-yellow-400 transition-colors group cursor-pointer w-fit"
          >
            <HiOutlineArrowLeft className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Archive</span>
          </motion.button>

          <div className="flex items-center gap-2">
            <HiOutlineShieldCheck className="text-yellow-400 text-xl" />
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tighter">
              Interview <span className="text-yellow-400">Analysis</span>
            </h1>
          </div>
        </header>

        {/* Session Packaging & Specification Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950 shadow-sm">
            {report.interviewMode === 'time_based' ? 'Time-Based Interview' : 'Question-Based Interview'}
          </span>
          {report.interviewMode === 'time_based' && report.selectedDurationMinutes && (
            <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-slate-200 border border-slate-800">
              {report.selectedDurationMinutes} Minutes Max
            </span>
          )}
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-slate-200 border border-slate-800">
            {report.targetQuestionCount || report.selectedQuestionCount || report.questions?.length || 0} Questions
          </span>
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-yellow-400 border border-yellow-400/30">
            {report.creditsCharged || 50} Credits Spent
          </span>
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-800">
            Medium Difficulty
          </span>
          <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-slate-300 border border-slate-800">
            60s / Answer
          </span>
          {report.role && (
            <span className="px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-900 text-blue-400 border border-blue-900/40">
              Role: {report.role}
            </span>
          )}
        </div>

        {/* MODULE 5: Personalized Recovery Plan CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-slate-900 border border-yellow-400/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-3 bg-yellow-400/20 border border-yellow-400/40 rounded-2xl text-yellow-400 shrink-0">
              <RiRoadMapLine className="text-2xl" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-slate-950">
                  New • Module 5
                </span>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Personalized Recovery Plan
                </h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Convert this evaluation's identified gaps and evidence into an adaptive, day-by-day study roadmap with progress tracking and reassessment.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsRecoveryModalOpen(true)}
            className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <RiSparklingLine className="text-sm" />
            Generate Recovery Plan
            <RiArrowRightLine className="text-sm" />
          </button>
        </motion.div>

        {/* SECTION A: Overall Performance Summary & Aggregate Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aggregate Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center relative overflow-hidden flex flex-col justify-center items-center shadow-xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
            <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-3">
              Overall Performance
            </h2>
            <div className="text-7xl sm:text-8xl font-black text-white leading-none tracking-tighter mb-2">
              {overallPercent}
              <span className="text-yellow-400 text-3xl sm:text-4xl ml-1">%</span>
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-2">
              {overallPercent >= 80
                ? 'High Proficiency — Outstanding evidence demonstration'
                : overallPercent >= 60
                ? 'Moderate Proficiency — Solid technical foundation with gaps'
                : 'Needs Reinforcement — Review gaps and study recommendations'}
            </p>
          </motion.div>

          {/* Radar Chart Visual */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 flex flex-col items-center justify-center min-h-[260px] shadow-xl"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Competency Radar
            </span>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                  <Radar name="Candidate" dataKey="score" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Key Strengths & Weaknesses Snapshot */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between shadow-xl space-y-4"
          >
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                <HiOutlineCheckCircle className="text-sm" /> Demonstrated Strengths
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {(analytics?.keyStrengths || []).slice(0, 3).map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-2">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span className="line-clamp-2">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-2">
                <HiOutlineExclamationCircle className="text-sm" /> Observed Technical Gaps
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {(analytics?.recurringGaps || []).slice(0, 2).map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-amber-950/20 border border-amber-900/40 rounded-lg p-2">
                    <span className="text-amber-400 font-bold shrink-0">•</span>
                    <span className="line-clamp-2">{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>

        {/* SECTION B: Evaluation Breakdown (6 Core Criteria Matrix) */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <HiOutlineAcademicCap className="text-yellow-400 text-xl" />
                Six-Criterion Evaluation Breakdown
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against category-weighted rubrics with evidence-grounded scoring.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 font-bold">
                Top: {analytics?.strongestCompetencies?.join(', ') || 'Technical Accuracy'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(analytics?.criterionScores || []).map((crit, idx) => {
              const isStrong = (analytics?.strongestCompetencies || []).includes(crit.name);
              const isWeak = (analytics?.weakestCompetencies || []).includes(crit.name);

              return (
                <div
                  key={idx}
                  className={`bg-slate-950/60 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    isStrong
                      ? 'border-emerald-500/40 bg-emerald-950/10'
                      : isWeak
                      ? 'border-amber-500/30'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-black text-slate-200">{crit.name}</span>
                    <span
                      className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                        crit.score >= 8
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : crit.score >= 5
                          ? 'bg-yellow-400/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {crit.score} / 10
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          crit.score >= 8
                            ? 'bg-emerald-400'
                            : crit.score >= 5
                            ? 'bg-yellow-400'
                            : 'bg-red-400'
                        }`}
                        style={{ width: `${Math.min(100, (crit.score / 10) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                      <span>{crit.percentage || Math.round(crit.score * 10)}% proficiency</span>
                      {isStrong && <span className="text-emerald-400 font-bold uppercase">Strongest</span>}
                      {isWeak && <span className="text-amber-400 font-bold uppercase">Focus Area</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION C: Evidence Explorer */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <HiOutlineCodeBracket className="text-yellow-400 text-xl" />
                Evidence Explorer
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every awarded score mapped to exact transcripts and verified candidate citations.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `All (${allEvidenceItems.length})` },
                { id: 'correct', label: 'Correct' },
                { id: 'partially_correct', label: 'Partial' },
                { id: 'incorrect', label: 'Misunderstood / Gaps' },
                { id: 'missing', label: 'Missing' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEvidenceFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    evidenceFilter === tab.id
                      ? 'bg-yellow-400 text-slate-950 font-black shadow-xs'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredEvidence.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              No evidence items matching the selected filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvidence.slice(0, 8).map((ev, i) => {
                const isCorrect = ev.classification === 'correct';
                const isPartial = ev.classification === 'partially_correct';

                return (
                  <div
                    key={i}
                    className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Q{ev.questionIndex} • {ev.criterionName}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isCorrect
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : isPartial
                              ? 'bg-yellow-950 text-yellow-400 border border-yellow-800/50'
                              : 'bg-red-950 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {ev.classification.replace('_', ' ')}
                        </span>
                      </div>

                      {ev.text && (
                        <div className="bg-slate-900/90 rounded-xl p-2.5 border-l-2 border-yellow-400 text-xs font-mono text-slate-200 italic mb-2">
                          "{ev.text}"
                        </div>
                      )}

                      <p className="text-xs text-slate-300 leading-relaxed">{ev.explanation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION D: Actionable Study Recommendations & Technical Gap Roadmap */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <HiOutlineLightBulb className="text-yellow-400 text-xl" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Actionable Study Recommendations
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {(analytics?.studyRecommendations || []).map((rec, i) => (
              <div
                key={i}
                className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION: Live Coding Evaluation & Test Results */}
        <CodingReportSection report={report} />

        {/* SECTION E: Question-Wise Deep Dive with Expandable Evidence Inspector */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <HiSparkles className="text-yellow-400" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                Question-Wise Analysis ({report.questions?.length || 0})
              </h3>
            </div>
          </div>

          {/* Efficiency Bar Chart per Question */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-6 mb-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
              Efficiency per Question
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis domain={[0, 10]} hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={36}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.score >= 7 ? '#34d399' : entry.score >= 4 ? '#fbbf24' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Question List Cards */}
          <div className="space-y-4">
            {report.questions?.map((q, index) => {
              const isExpanded = Boolean(expandedQuestions[index]);
              const ev = q.evidenceEvaluation;
              const qScore = Number(q.score) || 0;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-900/40 border border-slate-800 hover:border-slate-700/80 rounded-3xl p-6 sm:p-7 transition-all space-y-4 shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex gap-3 sm:gap-4 items-start">
                      <span className="text-yellow-400 font-black text-lg sm:text-xl italic shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <h4 className="text-slate-100 font-bold text-base sm:text-lg leading-snug">
                          {q.question}
                        </h4>
                        {ev?.category && (
                          <span className="inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">
                            Category: {ev.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-2xl">
                      <span className="text-xl sm:text-2xl font-black text-white">{qScore}</span>
                      <span className="text-slate-500 font-bold text-xs">/10</span>
                    </div>
                  </div>

                  {/* Candidate Transcript */}
                  <div className="bg-slate-950/60 rounded-2xl p-4 border-l-4 border-slate-600">
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase mb-1.5 tracking-wider">
                      <HiUserCircle className="text-sm" /> Candidate Transcript
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm font-medium leading-relaxed italic">
                      {q.answer ? `"${q.answer}"` : 'No response recorded.'}
                    </p>
                  </div>

                  {/* AI Feedback & Quick Diagnostics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5">
                      <div className="flex items-center gap-1.5 text-yellow-400 text-[10px] font-black uppercase mb-2 tracking-wider">
                        <HiChatBubbleLeftRight className="text-sm" /> Evaluator Feedback
                      </div>
                      <p className="text-slate-300 text-xs leading-relaxed italic">
                        "{q.feedback || ev?.summaryFeedback || 'Evaluation recorded.'}"
                      </p>
                    </div>

                    <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                      <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase mb-2 tracking-wider">
                        <HiOutlineCheckCircle className="text-sm" /> Dimension Snapshot
                      </div>
                      <div className="grid grid-cols-3 text-center gap-2">
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">Accuracy</p>
                          <p className="text-sm text-white font-black">{q.correctness || qScore}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">Comms</p>
                          <p className="text-sm text-white font-black">{q.communication || qScore}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-500 font-bold uppercase">Confidence</p>
                          <p className="text-sm text-white font-black">
                            {ev?.evaluationConfidence ? `${Math.round(ev.evaluationConfidence * 100)}%` : `${q.confidence || 7}/10`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Evidence Inspector Button */}
                  {ev && Array.isArray(ev.criteria) && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => toggleQuestion(index)}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-slate-300 hover:text-yellow-400 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <HiOutlineInformationCircle className="text-yellow-400 text-sm" />
                          {isExpanded ? 'Hide Evidence Breakdown' : 'Explore Supporting Answer Evidence'}
                        </span>
                        {isExpanded ? <HiOutlineChevronUp /> : <HiOutlineChevronDown />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-4"
                          >
                            <h5 className="text-xs font-black uppercase tracking-wider text-yellow-400">
                              Criterion Evidence & Citations
                            </h5>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {ev.criteria.map((c, cIdx) => (
                                <div key={cIdx} className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-200">{c.name}</span>
                                    <span className="text-xs font-mono font-bold text-yellow-400">{c.score}/10</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400">{c.reasoning}</p>

                                  {Array.isArray(c.evidence) && c.evidence.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      {c.evidence.map((eItem, eIdx) => (
                                        <div key={eIdx} className="text-[10px] bg-slate-950 p-2 rounded-lg border-l-2 border-emerald-400">
                                          {eItem.text && (
                                            <p className="font-mono text-slate-300 italic mb-0.5">"{eItem.text}"</p>
                                          )}
                                          <p className="text-slate-400">{eItem.explanation}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* SECTION F: Real-Time Adaptive Trajectory & Topic Performance */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-yellow-400/10 text-yellow-400">
                  <HiOutlineAcademicCap className="text-lg" />
                </span>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-300">
                  Adaptive Trajectory & Competency Steering
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Traceable log of real-time difficulty adaptation, topic pivots, and knowledge-gap diagnostics throughout the interview.
              </p>
            </div>
            {report.adaptiveState?.currentDifficulty && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Final Difficulty Tier:</span>
                <span className={`font-black uppercase tracking-wider ${
                  report.adaptiveState.currentDifficulty === 'advanced' ? 'text-purple-400' :
                  report.adaptiveState.currentDifficulty === 'beginner' ? 'text-emerald-400' : 'text-yellow-400'
                }`}>
                  {report.adaptiveState.currentDifficulty}
                </span>
              </div>
            )}
          </div>

          {/* Difficulty Trajectory Step Graph */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Question-by-Question Difficulty Progression
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {(report.questions || []).map((q, idx) => {
                const diff = (q.difficulty || 'intermediate').toLowerCase();
                const score = typeof q.score === 'number' ? q.score : 0;
                let colorClass = 'border-yellow-400/30 bg-yellow-400/5 text-yellow-400';
                if (diff === 'beginner' || diff === 'easy') {
                  colorClass = 'border-emerald-400/30 bg-emerald-400/5 text-emerald-400';
                } else if (diff === 'advanced' || diff === 'hard') {
                  colorClass = 'border-purple-400/30 bg-purple-400/5 text-purple-400';
                }

                return (
                  <div key={idx} className={`p-3 rounded-2xl border ${colorClass} space-y-1.5`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">Q{idx + 1}</span>
                      <span className="text-xs font-mono font-black">{score}/10</span>
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider">{diff}</p>
                    <p className="text-[10px] text-slate-400 truncate" title={q.topic || 'General'}>
                      {q.topic || 'General'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Topic Performance Grid */}
          {Array.isArray(report.adaptiveState?.topicPerformance) && report.adaptiveState.topicPerformance.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Topic Mastery & Knowledge Breakdown
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {report.adaptiveState.topicPerformance.map((tp, idx) => {
                  let statusBg = 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20';
                  if (tp.status === 'strong') statusBg = 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20';
                  else if (tp.status === 'weak') statusBg = 'bg-rose-400/10 text-rose-400 border-rose-400/20';

                  return (
                    <div key={idx} className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-200">{tp.topic}</p>
                        <p className="text-[10px] text-slate-500">{tp.totalQuestions} question{tp.totalQuestions > 1 ? 's' : ''} evaluated</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBg}`}>
                          {tp.status}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-300">{tp.avgScore}/10</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Steering Decision History */}
          {Array.isArray(report.adaptiveState?.decisionHistory) && report.adaptiveState.decisionHistory.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Interviewer Steering Decision Trail
              </h4>
              <div className="space-y-2">
                {report.adaptiveState.decisionHistory.map((d, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-yellow-400">
                        Q{d.questionIndex + 1}
                      </span>
                      <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                        {d.action ? d.action.replace(/_/g, ' ') : 'Steering Action'}
                      </span>
                      <span className="text-slate-400">• {d.reason}</span>
                    </div>
                    {d.targetTopic && (
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        Target: {d.targetTopic}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Module 5 Recovery Plan Setup Modal */}
        <RecoveryPlanSetupModal
          isOpen={isRecoveryModalOpen}
          onClose={() => setIsRecoveryModalOpen(false)}
          interviewId={report._id}
          role={report.role || 'Software Engineer'}
          score={overallPercent}
        />
      </div>
    </div>
  );
}

export default Step3Report;
