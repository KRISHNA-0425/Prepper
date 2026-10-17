import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { backendServerUrl } from '../App';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCalendarDays, HiCpuChip, HiChevronRight, HiMagnifyingGlass, HiOutlineArrowLeft } from 'react-icons/hi2';
import { RiShieldFlashLine } from 'react-icons/ri';

function InterViewHistory() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Derive active tab from URL query parameter (defaults to 'normal')
    const currentType = searchParams.get('type');
    const activeTab = currentType === 'cross' ? 'cross' : 'normal';

    const handleTabChange = (type) => {
        if (type === activeTab) return;
        setSearchParams({ type });
    };

    // Animation Variants
    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 }
        }
    };

    const cardVars = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
    };

    useEffect(() => {
        let isMounted = true;
        const fetchInterviews = async () => {
            setLoading(true);
            setError(null);
            try {
                const result = await axios.get(
                    `${backendServerUrl}/api/interview/getInterview?type=${activeTab}`,
                    { withCredentials: true }
                );
                if (isMounted) {
                    setInterviews(Array.isArray(result.data) ? result.data : [result.data]);
                }
            } catch (err) {
                console.error('Error fetching interview history:', err);
                if (isMounted) {
                    setError('Failed to load interview history');
                    toast.error('Failed to load interview history');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchInterviews();

        return () => {
            isMounted = false;
        };
    }, [activeTab]);

    return (
        <div className='min-h-screen bg-slate-950 text-slate-200 font-poppins p-4 md:p-12 overflow-x-hidden'>
            <div className='max-w-5xl mx-auto'>
                
                {/* Back Button */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -5 }}
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-yellow-400 transition-colors mb-6 group cursor-pointer"
                >
                    <HiOutlineArrowLeft className="text-lg group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Console</span>
                </motion.button>

                {/* Section Navigation Tabs */}
                <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md mb-8 w-fit max-w-full overflow-x-auto">
                    <button
                        type="button"
                        onClick={() => handleTabChange('normal')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            activeTab === 'normal'
                                ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <HiCpuChip className="text-base" />
                        <span>Standard History</span>
                        {activeTab === 'normal' && !loading && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-950/20 text-slate-950">
                                {interviews.length}
                            </span>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleTabChange('cross')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            activeTab === 'cross'
                                ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                        }`}
                    >
                        <RiShieldFlashLine className="text-base text-current" />
                        <span>Cross-Examination</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest ${
                            activeTab === 'cross'
                                ? 'bg-slate-950 text-yellow-400'
                                : 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                        }`}>
                            Probing
                        </span>
                        {activeTab === 'cross' && !loading && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-950 text-yellow-400">
                                {interviews.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Header Section */}
                <header className='mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6'>
                    <div>
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className='flex items-center gap-2 text-yellow-400 mb-2'
                        >
                            {activeTab === 'cross' ? <RiShieldFlashLine className='text-xl' /> : <HiCpuChip className='text-xl' />}
                            <span className='text-[10px] font-black uppercase tracking-[0.3em]'>
                                {activeTab === 'cross' ? 'System Archive • Cross-Examination & Probing' : 'System Archive • Standard Interviews'}
                            </span>
                        </motion.div>
                        <h1 className='text-4xl md:text-5xl font-black text-white tracking-tighter'>
                            {activeTab === 'cross' ? (
                                <>Cross-Exam <span className='text-yellow-400'>History</span></>
                            ) : (
                                <>Interview <span className='text-yellow-400'>History</span></>
                            )}
                        </h1>
                    </div>
                    {!loading && (
                        <p className='text-slate-500 text-sm font-medium'>
                            Total Sessions Logged: <span className='text-white font-bold'>{interviews.length}</span>
                        </p>
                    )}
                </header>

                {/* Loading State */}
                {loading ? (
                    <div className="py-32 w-full flex flex-col items-center justify-center gap-4 bg-slate-900/20 rounded-3xl border border-slate-800/50">
                        <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"
                        />
                        <p className="text-yellow-400 font-black tracking-widest text-[10px] uppercase">
                            Retrieving {activeTab === 'cross' ? 'Cross-Examination' : 'Standard'} Data...
                        </p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20 px-6 bg-red-950/20 rounded-3xl border border-red-900/40">
                        <p className="text-red-400 font-bold mb-4">{error}</p>
                        <button
                            type="button"
                            onClick={() => handleTabChange(activeTab)}
                            className="px-6 py-2.5 bg-yellow-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform"
                        >
                            Retry
                        </button>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        {interviews.length === 0 ? (
                            <motion.div 
                                key={`empty-${activeTab}`}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="text-center py-28 px-6 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-800"
                            >
                                {activeTab === 'cross' ? (
                                    <>
                                        <RiShieldFlashLine className='text-6xl text-slate-700 mx-auto mb-4' />
                                        <h3 className="text-white font-bold text-lg mb-1">No cross-examination records found</h3>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                                            Interviews started with &quot;Enable cross-questioning&quot; enabled appear here with deep-dive probing logs.
                                        </p>
                                        <button 
                                            type="button"
                                            onClick={() => navigate('/interview')}
                                            className='mt-6 px-8 py-3 bg-yellow-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform cursor-pointer'
                                        >
                                            Start Cross-Examination
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <HiMagnifyingGlass className='text-6xl text-slate-700 mx-auto mb-4' />
                                        <h3 className="text-white font-bold text-lg mb-1">No standard session records found</h3>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                                            Standard interview sessions without adaptive cross-questioning appear here.
                                        </p>
                                        <button 
                                            type="button"
                                            onClick={() => navigate('/interview')}
                                            className='mt-6 px-8 py-3 bg-yellow-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform cursor-pointer'
                                        >
                                            Start First Interview
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div 
                                key={`list-${activeTab}`}
                                variants={containerVars}
                                initial="hidden"
                                animate="visible"
                                className='grid gap-6'
                            >
                                {interviews.map((item) => (
                                    <motion.div 
                                        variants={cardVars}
                                        key={item._id}
                                        whileHover={{ x: 10, backgroundColor: "rgba(30, 41, 59, 0.8)" }}
                                        onClick={() => navigate(`/report/${item._id}`)}
                                        className='group relative bg-slate-900/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-slate-800 hover:border-yellow-400/50 cursor-pointer transition-all duration-300'
                                    >
                                        <div className='absolute inset-0 bg-yellow-400/5 opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity pointer-events-none' />
                                        
                                        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10'>
                                            <div className='flex flex-col gap-2.5'>
                                                <div className='flex flex-wrap items-center gap-2.5'>
                                                    <h3 className='font-black text-white text-xl md:text-2xl uppercase tracking-tighter group-hover:text-yellow-400 transition-colors'>
                                                        {item.role}
                                                    </h3>
                                                    <span className={`px-3 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                        item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                    }`}>
                                                        {item.status || 'Completed'}
                                                    </span>

                                                    {item.enableCrossQuestioning && (
                                                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                                                            <RiShieldFlashLine className="text-[10px]" />
                                                            <span>Cross-Exam ({item.crossQuestioningType || 'Technical'})</span>
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className='flex flex-wrap items-center gap-4 text-slate-500'>
                                                    {item.experience && (
                                                        <div className='flex items-center gap-1.5'>
                                                            <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>{item.experience}</span>
                                                        </div>
                                                    )}
                                                    <div className='flex items-center gap-1.5'>
                                                        <HiCpuChip className='text-xs' />
                                                        <span className='text-[10px] font-bold uppercase tracking-widest'>{item.mode}</span>
                                                    </div>
                                                    {Array.isArray(item.questions) && item.questions.length > 0 && (
                                                        <div className='flex items-center gap-1.5'>
                                                            <span className='text-[10px] font-bold uppercase tracking-widest text-slate-400'>
                                                                {item.questions.length} {item.questions.length === 1 ? 'Question' : 'Questions'}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className='flex items-center gap-1.5'>
                                                        <HiCalendarDays className='text-xs' />
                                                        <span className='text-[10px] font-bold uppercase tracking-widest'>
                                                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-4 md:pt-0'>
                                                <div className='text-left md:text-right'>
                                                    <div className='flex items-baseline md:justify-end gap-1'>
                                                        <span className='text-3xl font-black text-white group-hover:text-yellow-400 transition-colors'>
                                                            {item.finalScore || 0}
                                                        </span>
                                                        <span className='text-sm font-black text-slate-600'>%</span>
                                                    </div>
                                                    <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1'>Aggregate Score</p>
                                                </div>
                                                
                                                <div className='w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:bg-yellow-400 transition-all duration-300 shadow-lg group-hover:shadow-yellow-400/20'>
                                                    <HiChevronRight className='text-xl text-slate-400 group-hover:text-slate-950 transition-colors' />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}

                {/* Decorative background text */}
                <div className='fixed -bottom-10 -left-10 text-[180px] font-black text-white/[0.02] pointer-events-none select-none uppercase tracking-tighter'>
                    Archive
                </div>
            </div>
        </div>
    );
}

export default InterViewHistory;
