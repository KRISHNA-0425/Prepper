import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  HiSparkles,
  HiBriefcase,
  HiTrendingUp,
  HiCode,
  HiClock,
  HiCollection,
  HiShieldCheck,
  HiArrowRight,
} from 'react-icons/hi';
import { RiCodeSSlashLine, RiCoinsLine, RiTerminalBoxLine } from 'react-icons/ri';
import { IoArrowBackOutline } from 'react-icons/io5';
import { backendServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';
import Navbar from '../components/Navbar';

const TRACK_PRESETS = [
  'Full Stack Developer',
  'Backend Engineer',
  'Frontend Engineer',
  'Algorithms & Data Structures',
  'Systems Software Engineer',
];

const LANGUAGE_OPTIONS = [
  { slug: 'javascript', name: 'JavaScript (Node.js)' },
  { slug: 'python', name: 'Python 3' },
  { slug: 'java', name: 'Java (OpenJDK)' },
  { slug: 'cpp', name: 'C++ (G++)' },
  { slug: 'c', name: 'C (GCC)' },
  { slug: 'typescript', name: 'TypeScript' },
  { slug: 'go', name: 'Go' },
];

const CATEGORY_OPTIONS = [
  'Problem Solving',
  'Arrays and Strings',
  'Hash Maps and Sets',
  'Linked Lists',
  'Stacks and Queues',
  'Trees and Graphs',
  'Dynamic Programming',
];

const DURATION_OPTIONS = [
  { value: '30', label: '30 Mins', desc: 'Quick assessment' },
  { value: '45', label: '45 Mins', desc: 'Standard interview' },
  { value: '60', label: '60 Mins', desc: 'In-depth round' },
  { value: '90', label: '90 Mins', desc: 'Comprehensive' },
  { value: 'untimed', label: 'Self-Paced', desc: 'No time limit' },
];

export default function CodingSetup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  // Form State
  const [role, setRole] = useState('Full Stack Developer');
  const [experience, setExperience] = useState('1-3 years');
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [languageOptions, setLanguageOptions] = useState(LANGUAGE_OPTIONS);
  const [codingCategory, setCodingCategory] = useState('Problem Solving');
  const [codingDifficulty, setCodingDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(2); // 1 to 5
  const [durationMinutes, setDurationMinutes] = useState('45'); // '30' | '45' | '60' | '90' | 'untimed'

  // Fetch dynamically available languages from backend
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${backendServerUrl}/api/coding/languages`, { withCredentials: true })
      .then((res) => {
        if (mounted && Array.isArray(res.data?.languages) && res.data.languages.length > 0) {
          setLanguageOptions(res.data.languages);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Loading State
  const [loading, setLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  // Credit calculation: 10 credits per question
  const CREDITS_PER_QUESTION = 10;
  const requiredCredits = questionCount * CREDITS_PER_QUESTION;
  const userBalance = Number(userData?.credits ?? 0);
  const hasSufficientCredits = userBalance >= requiredCredits;

  const handleStartCoding = async (e) => {
    e.preventDefault();
    if (loading || isSubmittingRef.current) return;

    if (!userData) {
      toast.error('Please sign in or create an account to start coding interviews.');
      return;
    }

    if (!role.trim()) {
      toast.error('Please specify a target role or focus track.');
      return;
    }

    if (!hasSufficientCredits) {
      toast.error(
        `Insufficient credits. You need ${requiredCredits} credits for ${questionCount} questions, but currently have ${userBalance}.`
      );
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);
    const toastId = toast.loading('Initializing isolated sandbox & generating coding challenges...');

    try {
      const payload = {
        role: role.trim(),
        experience: experience.trim(),
        mode: 'Coding',
        interviewType: 'coding',
        codingLanguage,
        codingCategory,
        codingDifficulty,
        selectedQuestionCount: questionCount,
        durationMinutes: durationMinutes !== 'untimed' ? Number(durationMinutes) : undefined,
        interviewMode: durationMinutes !== 'untimed' ? 'time_based' : 'question_based',
      };

      const result = await axios.post(
        `${backendServerUrl}/api/interview/generateQuestions`,
        payload,
        { withCredentials: true }
      );

      toast.dismiss(toastId);

      // Synchronize updated credit balance with Redux
      if (typeof result.data.creditsLeft === 'number' && userData) {
        dispatch(setUserData({ ...userData, credits: result.data.creditsLeft }));
      }

      toast.success('Live coding workspace initialized!');
      navigate(`/coding/${result.data.interviewId}`, {
        state: { sessionData: result.data },
      });
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error starting live coding interview:', err);
      const data = err.response?.data;
      let errMsg = data?.message || 'Failed to initialize coding session. Please try again.';

      if (data?.errorCode === 'FREE_MODEL_DAILY_LIMIT_EXCEEDED') {
        errMsg =
          "The AI provider's daily model limit has been reached. Please try again later. Any deducted credits were fully refunded.";
      }

      if (typeof data?.creditsLeft === 'number' && userData) {
        dispatch(setUserData({ ...userData, credits: data.creditsLeft }));
      }

      toast.error(errMsg, { duration: 6000 });
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5EC5A] font-poppins flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-4xl bg-white/85 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_rgba(0,0,0,0.08)] border border-white p-6 sm:p-10 space-y-8"
        >
          {/* Header & Back Action */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors cursor-pointer group"
            >
              <IoArrowBackOutline className="text-base group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200/80 rounded-full text-indigo-900 text-xs font-black">
              <RiCodeSSlashLine className="text-indigo-600 text-sm" />
              <span>Live Monaco IDE Sandbox</span>
            </div>
          </div>

          {/* Title Hero */}
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span>Live Coding Interview</span>
              <span className="text-xs px-2.5 py-0.5 bg-yellow-400 text-slate-950 font-black rounded-md tracking-wider uppercase">
                Module 4
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-2xl">
              Compile, execute, and debug genuine code in C, C++, Python, Java, or JavaScript with custom input,
              automated test cases, and AI algorithmic feedback.
            </p>
          </div>

          <form onSubmit={handleStartCoding} className="space-y-6">
            {/* Grid 1: Role & Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiBriefcase className="text-slate-400 text-xs" /> Target Role / Track
                </label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Backend Software Engineer"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />

                {/* Role Quick Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {TRACK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRole(preset)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                        role === preset
                          ? 'bg-slate-900 text-yellow-400'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiTrendingUp className="text-slate-400 text-xs" /> Experience Level
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="Fresher (0-1 years)">Fresher (0-1 years)</option>
                  <option value="Intermediate (1-3 years)">Intermediate (1-3 years)</option>
                  <option value="Mid-Senior (3-5 years)">Mid-Senior (3-5 years)</option>
                  <option value="Senior / Staff (5+ years)">Senior / Staff (5+ years)</option>
                </select>
              </div>
            </div>

            {/* Grid 2: Language, Topic, Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiCode className="text-indigo-500 text-xs" /> Primary Language
                </label>
                <select
                  value={codingLanguage}
                  onChange={(e) => setCodingLanguage(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  {languageOptions.map((lang) => (
                    <option key={lang.slug} value={lang.slug}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiCollection className="text-indigo-500 text-xs" /> Problem Category
                </label>
                <select
                  value={codingCategory}
                  onChange={(e) => setCodingCategory(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <HiShieldCheck className="text-indigo-500 text-xs" /> Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                  {['easy', 'medium', 'hard'].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setCodingDifficulty(diff)}
                      className={`py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        codingDifficulty === diff
                          ? diff === 'easy'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : diff === 'hard'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-900 text-yellow-400 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 1: Question Count Selector (1 to 5 questions) */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-800 block">Number of Coding Problems</span>
                  <span className="text-[10px] text-slate-500">
                    Choose how many coding challenges you want to solve (1 to 5)
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-indigo-600">{questionCount}</span>
                  <span className="text-xs font-bold text-slate-500">
                    {questionCount === 1 ? 'Problem' : 'Problems'}
                  </span>
                </div>
              </div>

              {/* Question Count Pill Group */}
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                      questionCount === cnt
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-400/30'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {cnt} {cnt === 1 ? 'Q' : 'Qs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Feature 2: Time Limit / Duration Selector */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-800 block">Session Time Limit</span>
                  <span className="text-[10px] text-slate-500">
                    Choose session countdown duration or practice self-paced
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {durationMinutes === 'untimed' ? 'Untimed' : `${durationMinutes} Minutes`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const isSelected = durationMinutes === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDurationMinutes(opt.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-900 text-white border-yellow-400 shadow-md'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <span className={`text-xs font-black ${isSelected ? 'text-yellow-400' : 'text-slate-900'}`}>
                        {opt.label}
                      </span>
                      <span className={`text-[9px] font-medium block mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {opt.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feature 3: Credit System & Balance Summary */}
            <div
              className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                hasSufficientCredits
                  ? 'bg-indigo-950 text-white border-indigo-900 shadow-lg'
                  : 'bg-red-50 text-slate-900 border-red-300'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RiCoinsLine className={hasSufficientCredits ? 'text-yellow-400 text-lg' : 'text-red-500 text-lg'} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    Total Cost: <span className="text-yellow-400 font-black">{requiredCredits} Credits</span>
                  </span>
                  <span className="text-xs opacity-40">•</span>
                  <span className="text-xs font-medium opacity-80">
                    Current Balance: <span className="font-bold">{userBalance}</span>
                  </span>
                </div>
                <p className="text-[11px] opacity-75">
                  {hasSufficientCredits
                    ? `Balance after launch: ${userBalance - requiredCredits} credits. Run tests and debug with 0 extra cost.`
                    : `You need ${requiredCredits - userBalance} more credits to launch this session.`}
                </p>
              </div>

              {!hasSufficientCredits && (
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow transition cursor-pointer self-start sm:self-auto"
                >
                  Get Credits
                </button>
              )}
            </div>

            {/* Launch Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading || !hasSufficientCredits}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-yellow-400 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  <span>Preparing Workspace...</span>
                </>
              ) : (
                <>
                  <span>Launch Live Coding Session</span>
                  <HiArrowRight className="text-base" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
