import React from 'react';
import { motion } from 'framer-motion';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { HiOutlineArrowLeft, HiSparkles, HiOutlineCheckCircle, HiChatBubbleLeftRight, HiUserCircle } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell 
} from 'recharts';

function Step3Report({ report }) {
    const navigate = useNavigate();

    if (!report) return (
        <div className="h-screen w-full bg-slate-950 flex items-center justify-center">
            <div className="animate-pulse text-yellow-400 font-black uppercase tracking-widest">
                Compiling Report...
            </div>
        </div>
    );

    // Data for Radar Chart (Metrics Overview)
    const radarData = [
        { subject: 'Confidence', A: (report.confidence || 0) * 10, fullMark: 100 },
        { subject: 'Comms', A: (report.communication || 0) * 10, fullMark: 100 },
        { subject: 'Correctness', A: (report.correctness || 0) * 10, fullMark: 100 },
    ];

    // CRITICAL FIX: Changed questionsWiseScore to questions here!
    const barData = report.questions?.map((q, i) => ({
        name: `Q${i + 1}`,
        score: Number(q.score) || 0
    })) || [];

    const metrics = [
        { label: 'Confidence', value: report.confidence || 0, color: '#fbbf24' },
        { label: 'Communication', value: report.communication || 0, color: '#60a5fa' },
        { label: 'Correctness', value: report.correctness || 0, color: '#34d399' }
    ];

    return (
        <div className='min-h-screen bg-slate-950 text-slate-200 font-poppins p-4 md:p-12 overflow-x-hidden'>
            <div className='max-w-6xl mx-auto'>
                
                {/* Header Section */}
                <header className='flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6'>
                    <motion.button 
                        whileHover={{ x: -5 }}
                        onClick={() => navigate('/history')}
                        className='flex items-center gap-2 text-slate-500 hover:text-yellow-400 transition-colors group'
                    >
                        <HiOutlineArrowLeft />
                        <span className='text-[10px] font-black uppercase tracking-[0.2em]'>Back to Archive</span>
                    </motion.button>

                    <div className='text-right'>
                        <h1 className='text-3xl font-black text-white uppercase tracking-tighter'>
                            Interview <span className='text-yellow-400'>Analysis</span>
                        </h1>
                    </div>
                </header>

                <div className='grid lg:grid-cols-3 gap-8'>
                    
                    {/* LEFT COLUMN: Circular Metrics & Radar */}
                    <div className='lg:col-span-1 space-y-6'>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className='bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-10 text-center relative overflow-hidden'
                        >
                            <div className='absolute top-0 left-0 w-full h-1 bg-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]' />
                            <h2 className='text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4'>Aggregate Score</h2>
                            <div className='text-8xl font-black text-white leading-none mb-4'>
                                {Math.round(report.finalScore || 0)}<span className='text-yellow-400 text-2xl'>%</span>
                            </div>
                        </motion.div>

                        {/* Radar Chart Visual */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className='bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-4 h-64 flex items-center justify-center overflow-hidden'
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                    <PolarGrid stroke="#1e293b" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                                    <Radar name="Candidate" dataKey="A" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.3} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Traditional Circulars */}
                        <motion.div className='bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 space-y-8'>
                            {metrics.map((m, i) => (
                                <div key={i} className='flex items-center gap-6'>
                                    <div className='w-14 h-14 shrink-0'>
                                        <CircularProgressbar 
                                            value={m.value * 10} 
                                            text={`${m.value}`}
                                            styles={buildStyles({
                                                pathColor: m.color,
                                                textColor: '#fff',
                                                textSize: '32px',
                                                trailColor: '#1e293b'
                                            })}
                                        />
                                    </div>
                                    <span className='text-xs font-black uppercase tracking-widest text-slate-400'>{m.label}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* RIGHT COLUMN: Question Breakdown & Bar Chart */}
                    <div className='lg:col-span-2 space-y-4'>
                        
                        {/* Bar Chart Header */}
                        <div className='bg-slate-900/30 border border-slate-800 rounded-[2rem] p-6 mb-6'>
                            <h3 className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6'>Efficiency per Module</h3>
                            <div className='h-52 w-full'>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                                        <YAxis domain={[0, 10]} hide />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '14px', color: '#fff' }}
                                            itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }}
                                        />
                                        <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={40}>
                                            {barData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.score >= 7 ? '#34d399' : (entry.score >= 4 ? '#fbbf24' : '#ef4444')} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* List Breakdown */}
                        <div className='flex items-center gap-2 mb-6 px-4'>
                            <HiSparkles className='text-yellow-400' />
                            <h3 className='text-sm font-black uppercase tracking-widest text-slate-400'>Question-Wise Insights</h3>
                        </div>

                        {report.questions?.map((q, index) => (
                            <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className='group bg-slate-900/30 border border-slate-800 rounded-[2rem] p-6 md:p-8 hover:border-slate-700 transition-all'
                            >
                                <div className='flex justify-between items-start gap-4 mb-6'>
                                    <div className='flex gap-4'>
                                        <span className='text-yellow-400 font-black text-xl italic'>0{index + 1}</span>
                                        <h4 className='text-slate-200 font-bold text-lg leading-snug'>{q.question}</h4>
                                    </div>
                                    <div className='text-right shrink-0 bg-white/5 px-4 py-2 rounded-2xl'>
                                        <span className='text-2xl font-black text-white'>{q.score || 0}</span>
                                        <span className='text-slate-600 font-bold text-xs'>/10</span>
                                    </div>
                                </div>

                                {/* ADDED: User's Transcript */}
                                <div className='mb-6 bg-white/5 rounded-2xl p-5 border-l-4 border-slate-500'>
                                    <div className='flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase mb-2 tracking-widest'>
                                        <HiUserCircle className="text-sm" /> Your Transcript
                                    </div>
                                    <p className='text-slate-300 text-sm font-medium leading-relaxed italic'>
                                        {q.answer || "No response recorded."}
                                    </p>
                                </div>

                                <div className='grid md:grid-cols-2 gap-4'>
                                    <div className='bg-black/20 rounded-2xl p-5 border border-white/5'>
                                        <div className='flex items-center gap-2 text-yellow-400 text-[9px] font-black uppercase mb-3 tracking-widest'>
                                            <HiChatBubbleLeftRight className="text-sm" /> AI Feedback
                                        </div>
                                        <p className='text-slate-400 text-xs italic leading-relaxed'>"{q.feedback || "Awaiting evaluation..."}"</p>
                                    </div>

                                    <div className='bg-black/20 rounded-2xl p-5 border border-white/5 flex flex-col justify-center'>
                                        <div className='flex items-center gap-2 text-emerald-400 text-[9px] font-black uppercase mb-3 tracking-widest'>
                                            <HiOutlineCheckCircle className="text-sm" /> Diagnostic
                                        </div>
                                        <div className='flex justify-between'>
                                            <div className='text-center flex-1'>
                                                <p className='text-[8px] text-slate-500 font-bold uppercase'>Comms</p>
                                                <p className='text-sm text-white font-black'>{q.communication || 0}</p>
                                            </div>
                                            <div className='w-px h-8 bg-slate-800' />
                                            <div className='text-center flex-1'>
                                                <p className='text-[8px] text-slate-500 font-bold uppercase'>Accuracy</p>
                                                <p className='text-sm text-white font-black'>{q.correctness || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Step3Report;