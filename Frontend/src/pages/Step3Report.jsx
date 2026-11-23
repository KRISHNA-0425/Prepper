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

        
    </div>
  );
}
export default Step3Report;
