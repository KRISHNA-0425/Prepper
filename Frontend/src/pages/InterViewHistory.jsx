import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendServerUrl } from '../App'
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { HiCalendarDays, HiCpuChip, HiChevronRight, HiMagnifyingGlass, HiOutlineArrowLeft } from 'react-icons/hi2';

function InterViewHistory() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Animation Variants
    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const cardVars = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
    };

    useEffect(() => {
        const getMyInterviews = async () => {
            try {
                const result = await axios.get(backendServerUrl + '/api/interview/getInterview', { 
                    withCredentials: true 
                });
                setInterviews(Array.isArray(result.data) ? result.data : [result.data]);
            } catch (error) {
                console.error(`Error in getMyInterviews:`, error);
                toast.error("Failed to load interview history");
            } finally {
                setLoading(false);
            }
        };
        getMyInterviews();
    }, []);

    if (loading) return (
        <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center gap-4">
            <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full"
            />
            <p className="text-yellow-400 font-black tracking-widest text-[10px] uppercase">Retrieving Data...</p>
        </div>
    );

    return (
        <div className='min-h-screen bg-slate-950 text-slate-200 font-poppins p-4 md:p-12 overflow-x-hidden'>
            <div className='max-w-5xl mx-auto'>
                
                {/* Back Button */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -5 }}
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-slate-500 hover:text-yellow-400 transition-colors mb-8 group"
                >
                    <HiOutlineArrowLeft className="text-lg group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Return to Console</span>
                </motion.button>

                {/* Header Section */}
                <header className='mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6'>
                    <div>
                        <motion.div 
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className='flex items-center gap-2 text-yellow-400 mb-2'
                        >
                            <HiCpuChip className='text-xl' />
                            <span className='text-[10px] font-black uppercase tracking-[0.3em]'>System Archive</span>
                        </motion.div>
                        <h1 className='text-4xl md:text-5xl font-black text-white tracking-tighter'>
                            Interview <span className='text-yellow-400'>History</span>
                        </h1>
                    </div>
                    <p className='text-slate-500 text-sm font-medium'>
                        Total Sessions Logged: <span className='text-white font-bold'>{interviews.length}</span>
                    </p>
                </header>

                <AnimatePresence>
                    {interviews.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-32 bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-800"
                        >
                            <HiMagnifyingGlass className='text-6xl text-slate-700 mx-auto mb-4' />
                            <p className="text-slate-500 font-bold text-lg">No session records found.</p>
                            <button 
                                onClick={() => navigate('/interview')}
                                className='mt-6 px-8 py-3 bg-yellow-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform'
                            >
                                Start First Interview
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div 
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
                                        <div className='flex flex-col gap-2'>
                                            <div className='flex items-center gap-3'>
                                                <h3 className='font-black text-white text-xl md:text-2xl uppercase tracking-tighter group-hover:text-yellow-400 transition-colors'>
                                                    {item.role}
                                                </h3>
                                                <span className={`px-3 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                                                    item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            
                                            <div className='flex items-center gap-4 text-slate-500'>
                                                <div className='flex items-center gap-1.5'>
                                                    <HiCpuChip className='text-xs' />
                                                    <span className='text-[10px] font-bold uppercase tracking-widest'>{item.mode}</span>
                                                </div>
                                                <div className='flex items-center gap-1.5'>
                                                    <HiCalendarDays className='text-xs' />
                                                    <span className='text-[10px] font-bold uppercase tracking-widest'>
                                                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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

                {/* Decorative background text */}
                <div className='fixed -bottom-10 -left-10 text-[180px] font-black text-white/[0.02] pointer-events-none select-none uppercase tracking-tighter'>
                    Archive
                </div>
            </div>
        </div>
    )
}

export default InterViewHistory;