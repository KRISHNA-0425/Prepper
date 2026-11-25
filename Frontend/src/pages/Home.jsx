import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { HiSparkles, HiArrowRight } from 'react-icons/hi';
import { 
    RiHistoryLine, 
    RiShieldCheckLine, 
    RiRefreshLine, 
    RiTerminalBoxLine 
} from 'react-icons/ri';
import AuthModel from '../components/AuthModel';
import { useNavigate } from 'react-router-dom';

const TIER_FILTERS = [
    { key: 'all', label: 'All 6 Modules' },
    { key: 'core', label: 'Core Release' },
    { key: 'learning', label: 'Learning Loop' },
    { key: 'advanced', label: 'Advanced Modules' },
];

const CAPABILITIES = [
    {
        id: 'module-01',
        moduleNumber: 'MODULE 01',
        tierBadge: 'CORE • P0',
        tier: 'core',
        title: 'AI Resume & Project Cross-Examination',
        desc: 'Extracts claims from your resume and asks targeted follow-ups on architecture, trade-offs, security, and impact—clarifying inconsistencies instead of guessing.',
        image: '/features/feature_cross_exam.jpg',
        route: '/cross-examination',
        tag: 'CLAIM-DEFENSE REPORT',
    },
    {
        id: 'module-02',
        moduleNumber: 'MODULE 02',
        tierBadge: 'CORE • P0',
        tier: 'core',
        title: 'Evidence-Based Interview Evaluation',
        desc: 'Scores every answer against role-specific rubrics, attaching exact transcript excerpts, confidence flags, and deterministic weighted totals.',
        image: '/features/feature_evidence_eval.jpg',
        route: '/interview',
        tag: 'VERIFIED RUBRIC SCORE',
    },
    {
        id: 'module-03',
        moduleNumber: 'MODULE 03',
        tierBadge: 'CORE • P0/P1',
        tier: 'core',
        title: 'Adaptive Interview Difficulty',
        desc: 'Updates per-skill mastery from rubric evidence and selects the next question within bounded difficulty steps while protecting role coverage.',
        image: '/features/feature_adaptive_diff.jpg',
        route: '/interview',
        tag: 'EXPLAINABLE SELECTION',
    },
    {
        id: 'module-04',
        moduleNumber: 'MODULE 04',
        tierBadge: 'ADVANCED • P2',
        tier: 'advanced',
        title: 'Live Coding Interview with AI Evaluation',
        desc: 'Combines an in-browser editor, isolated test-execution sandbox, and AI follow-ups on complexity, edge cases, and code quality.',
        image: '/features/feature_live_coding.jpg',
        route: '/coding',
        tag: 'ISOLATED SANDBOX',
    },
    {
        id: 'module-05',
        moduleNumber: 'MODULE 05',
        tierBadge: 'LOOP • P1',
        tier: 'learning',
        title: 'Personalized Interview Recovery Plan',
        desc: 'Converts repeated rubric gaps into prioritized daily tasks sized to your schedule, closing the loop with fresh reassessment prompts.',
        image: '/features/feature_recovery_plan.jpg',
        route: '/recovery-plans',
        tag: 'GAP-TO-ACTION LOOP',
    },
    {
        id: 'module-06',
        moduleNumber: 'MODULE 06',
        tierBadge: 'ADVANCED • P2',
        tier: 'advanced',
        title: 'Company-Specific Interview Simulation',
        desc: 'Maps your job description and verified public company sources into round-specific simulations with clear attribution and labeled assumptions.',
        image: '/features/feature_company_sim.jpg',
        route: '/company-interview',
        tag: 'VERIFIED SOURCE REGISTRY',
    },
];

const DELIVERY_TIERS = [
    {
        id: 'tier-core',
        title: 'Core Release',
        badge: 'MODULES 01, 02 & 03 • P0',
        desc: 'Resume cross-examination, evidence-based scoring, and bounded adaptive difficulty work together to form the primary interview loop.',
        icon: RiShieldCheckLine,
    },
    {
        id: 'tier-learning',
        title: 'Learning Loop',
        badge: 'MODULE 05 • P1',
        desc: 'Turns rubric weaknesses into a prioritized, time-boxed recovery plan with fresh reassessment prompts to track real progress.',
        icon: RiRefreshLine,
    },
    {
        id: 'tier-advanced',
        title: 'Advanced Modules',
        badge: 'MODULES 04 & 06 • P2',
        desc: 'Isolated live coding execution and source-attributed company simulations layered cleanly onto the shared evaluation engine.',
        icon: RiTerminalBoxLine,
    },
];

const CORE_PRINCIPLES = [
    {
        title: 'Traceable Scores',
        desc: 'Every score links to a transcript excerpt, rubric criterion, or test result.',
    },
    {
        title: 'Guardrailed Context',
        desc: 'Uses your resume and target job description without inventing experience.',
    },
    {
        title: 'Consistent Progress',
        desc: 'Compares performance across sessions with versioned rubrics.',
    },
    {
        title: 'Modular Services',
        desc: 'Shared session, transcript, and scoring engine across every mode.',
    },
    {
        title: 'Responsible Scoring',
        desc: 'Evaluates technical depth rather than accent, emotion, or speaking style.',
    },
];

function Home() {
    const { userData } = useSelector((state) => state.user);
    const [showAuth, setShowAuth] = useState(false);
    const [activeTier, setActiveTier] = useState('all');
    const navigate = useNavigate();

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 30, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1, 
            transition: { type: "spring", stiffness: 80, damping: 15 } 
        }
    };

    const filteredCapabilities = activeTier === 'all' 
        ? CAPABILITIES 
        : CAPABILITIES.filter((c) => c.tier === activeTier);

    const handleFeatureAction = (route) => {
        if (!userData) {
            setShowAuth(true);
        } else {
            navigate(route);
        }
    };

    return (
        <div className='min-h-screen bg-[#F5EC5A] dark:bg-slate-950 flex flex-col relative overflow-x-hidden font-poppins selection:bg-slate-900 selection:text-yellow-400 transition-colors duration-200'>
            
            {/* Ambient Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, 0],
                        x: [0, 20, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-white/20 dark:bg-yellow-500/10 rounded-full blur-[100px]"
                />
            </div>

            <Navbar />

            <main className='flex-1 flex flex-col items-center px-6 py-12 md:py-20 z-10'>
                
                {/* ── Hero Section ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className='text-center max-w-5xl'
                >
                    <motion.h1 variants={itemVariants} className='text-5xl md:text-8xl font-black leading-[1.1] text-slate-900 dark:text-white mb-8 tracking-tighter'>
                        Master Your Next <br />
                        <span className='relative inline-block'>
                            Interview with
                            <motion.span
                                whileHover={{ scale: 1.05, rotate: 0 }}
                                className='ml-3 bg-slate-900 text-[#F5EC5A] dark:bg-yellow-400 dark:text-slate-950 px-6 py-2 rounded-2xl inline-block -rotate-2 transition-all duration-300 shadow-xl cursor-default'
                            >
                                PREPPER
                            </motion.span>
                        </span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className='text-lg md:text-xl text-yellow-950/70 dark:text-slate-300 font-medium max-w-2xl mx-auto mb-10 leading-relaxed'>
                        The AI companion that listens, evaluates, and coaches you through real-world job interview scenarios.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div variants={itemVariants} className='flex flex-col sm:flex-row items-center justify-center gap-4 mb-24 w-full'>
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (!userData) return setShowAuth(true);
                                navigate('/interview');
                            }}
                            className='group w-full sm:w-auto bg-slate-900 dark:bg-yellow-400 text-white dark:text-slate-950 px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(15,23,42,0.25)] hover:bg-slate-800 dark:hover:bg-yellow-300 transition-all cursor-pointer'
                        >
                            Mock Interview
                            <HiArrowRight className='text-yellow-400 dark:text-slate-950 group-hover:translate-x-1 transition-transform' />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (!userData) return setShowAuth(true);
                                navigate('/history');
                            }}
                            className='w-full sm:w-auto flex items-center justify-center gap-3 bg-white/40 dark:bg-slate-900/60 backdrop-blur-md text-slate-900 dark:text-white border-2 border-white/60 dark:border-slate-800 px-8 py-5 rounded-2xl font-black text-lg shadow-sm transition-all group cursor-pointer'
                        >
                            History
                            <RiHistoryLine className='text-slate-500 dark:text-slate-400 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out' />
                        </motion.button>
                    </motion.div>

                    {/* ── SECTION 1: AI CAPABILITIES (6 MODULES SPLIT GRID) ── */}
                    <div id="capabilities" className='w-full text-left mb-28'>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className='mb-8 flex flex-col text-center items-center gap-3'
                        >
                            <h2 className='text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center gap-3 flex-wrap'>
                                <span>AI</span>
                                <span className='text-white bg-slate-900 dark:bg-yellow-400 dark:text-slate-950 px-5 py-1 rounded-2xl shadow-xl'>
                                    Capabilities
                                </span>
                            </h2>
                            <p className='text-yellow-950/70 dark:text-slate-400 font-medium text-base md:text-lg max-w-2xl text-pretty'>
                                Six connected modules that challenge your resume claims, score answers against evidence, adapt difficulty, and build your recovery plan.
                            </p>

                            {/* Tier Filter Tabs */}
                            <div className='flex flex-wrap items-center justify-center gap-2 mt-4' role="tablist" aria-label="Filter capabilities by delivery tier">
                                {TIER_FILTERS.map((tab) => {
                                    const isActive = activeTier === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            role="tab"
                                            aria-selected={isActive}
                                            onClick={() => setActiveTier(tab.key)}
                                            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                                                isActive
                                                    ? 'bg-slate-900 text-[#F5EC5A] dark:bg-yellow-400 dark:text-slate-950 shadow-md scale-105'
                                                    : 'bg-white/45 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-slate-800 hover:bg-white/70 dark:hover:bg-slate-800/80'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>

                        {/* 2-Column Split Cards Grid */}
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 w-full'>
                            {filteredCapabilities.map((cap) => (
                                <motion.article
                                    key={cap.id}
                                    whileHover={{ scale: 1.02 }}
                                    transition={{ duration: 0.2 }}
                                    onClick={() => handleFeatureAction(cap.route)}
                                    className='group h-full flex flex-col sm:flex-row rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/80 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-xl hover:border-yellow-400/50 transition-colors duration-200 cursor-pointer'
                                >
                                    {/* Image Panel */}
                                    <div className='sm:w-5/12 min-h-48 sm:min-h-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center shrink-0 relative'>
                                        <img 
                                            src={cap.image} 
                                            alt={cap.title}
                                            className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                                            loading="lazy"
                                        />
                                    </div>

                                    {/* Content Panel */}
                                    <div className='sm:w-7/12 p-6 flex flex-col justify-between gap-4'>
                                        <div className='flex flex-col gap-2'>
                                            <div className='flex items-center justify-between gap-2'>
                                                <span className='inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-900 text-[#F5EC5A] dark:bg-yellow-400 dark:text-slate-950 font-black text-[11px] uppercase tracking-wider'>
                                                    {cap.moduleNumber}
                                                </span>
                                                <span className='text-[11px] font-bold text-yellow-950/60 dark:text-slate-400 uppercase tracking-wider'>
                                                    {cap.tierBadge}
                                                </span>
                                            </div>

                                            <h3 className='font-black text-xl text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors'>
                                                {cap.title}
                                            </h3>

                                            <p className='text-xs sm:text-sm text-yellow-950/75 dark:text-slate-300 font-medium leading-relaxed'>
                                                {cap.desc}
                                            </p>
                                        </div>

                                        {/* Footer */}
                                        <div className='flex items-center justify-between gap-2 pt-3 border-t border-slate-900/10 dark:border-slate-800'>
                                            <div className='flex items-center gap-2'>
                                                <span className='w-2 h-2 rounded-full bg-slate-900 dark:bg-yellow-400' aria-hidden="true" />
                                                <span className='text-[10px] font-black text-slate-800 dark:text-slate-300 uppercase tracking-widest'>
                                                    {cap.tag}
                                                </span>
                                            </div>
                                            <HiArrowRight className='text-slate-900 dark:text-yellow-400 text-lg group-hover:translate-x-1 transition-transform' />
                                        </div>
                                    </div>
                                </motion.article>
                            ))}
                        </div>
                    </div>

                    {/* ── SECTION 2: DELIVERY TIERS (TAILORED SCOPE - 3 ICON CARDS) ── */}
                    <div id="delivery-tiers" className='w-full max-w-6xl mb-28 text-left'>
                        <div className='text-center mb-12 flex flex-col items-center gap-3'>
                            <h2 className='text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter flex items-center justify-center gap-3 flex-wrap'>
                                <span>Tailored</span>
                                <span className='text-white bg-slate-900 dark:bg-yellow-400 dark:text-slate-950 px-5 py-1 rounded-2xl shadow-xl'>
                                    Scope
                                </span>
                            </h2>
                            <p className='text-yellow-950/70 dark:text-slate-400 font-medium text-base md:text-lg max-w-2xl text-pretty'>
                                Six modular capabilities sharing one interview session, rubric, and analytics foundation.
                            </p>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                            {DELIVERY_TIERS.map((tier) => {
                                const IconComponent = tier.icon;
                                return (
                                    <motion.article
                                        key={tier.id}
                                        whileHover={{ scale: 1.02 }}
                                        transition={{ duration: 0.2 }}
                                        className='h-full flex flex-col justify-between gap-6 p-8 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/80 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-yellow-400/40 transition-colors duration-200 group'
                                    >
                                        <div className='flex flex-col gap-4'>
                                            <div className='w-14 h-14 rounded-2xl bg-slate-900 text-[#F5EC5A] dark:bg-yellow-400 dark:text-slate-950 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0'>
                                                <IconComponent />
                                            </div>
                                            <h3 className='font-black text-2xl text-slate-900 dark:text-white tracking-tight'>
                                                {tier.title}
                                            </h3>
                                            <p className='text-sm text-yellow-950/75 dark:text-slate-300 font-medium leading-relaxed'>
                                                {tier.desc}
                                            </p>
                                        </div>
                                        <div className='flex items-center gap-2 pt-4 border-t border-slate-900/10 dark:border-slate-800'>
                                            <span className='w-2 h-2 rounded-full bg-slate-900 dark:bg-yellow-400' aria-hidden="true" />
                                            <span className='text-xs font-bold text-yellow-950/60 dark:text-slate-400 uppercase tracking-wider'>
                                                {tier.badge}
                                            </span>
                                        </div>
                                    </motion.article>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── SECTION 3: PRODUCT PRINCIPLES STRIP ── */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className='w-full max-w-6xl mb-20 rounded-3xl bg-white/50 dark:bg-slate-900/60 backdrop-blur-xl border border-white/80 dark:border-slate-800 p-8 md:p-10 flex flex-col gap-8 shadow-md text-left'
                    >
                        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900/10 dark:border-slate-800 pb-6'>
                            <div className='flex flex-col gap-1'>
                                <span className='text-xs font-black tracking-widest uppercase text-yellow-800 dark:text-yellow-400'>
                                    SHARED FOUNDATION
                                </span>
                                <h3 className='text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight'>
                                    Built on Evidence Over Impressions
                                </h3>
                            </div>
                            <span className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-[#F5EC5A] dark:bg-yellow-400/10 dark:text-yellow-300 dark:border dark:border-yellow-400/30 font-bold text-xs uppercase tracking-wider self-start md:self-auto'>
                                <span className='w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse' aria-hidden="true" />
                                5 CORE PRINCIPLES
                            </span>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6'>
                            {CORE_PRINCIPLES.map((principle, pIdx) => (
                                <div key={pIdx} className='flex flex-col gap-1.5'>
                                    <h4 className='font-black text-base text-slate-900 dark:text-white tracking-tight'>
                                        {principle.title}
                                    </h4>
                                    <p className='text-xs sm:text-sm text-yellow-950/70 dark:text-slate-300 font-medium leading-relaxed'>
                                        {principle.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                </motion.div>
            </main>

            <AnimatePresence>
                {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
            </AnimatePresence>
        </div>
    );
}

export default Home;
