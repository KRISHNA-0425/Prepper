import React from 'react'
import Timer from '../components/Timer';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMicrophone, HiCheckBadge, HiArrowRight } from "react-icons/hi2";
import { useState } from 'react';
import { useRef } from 'react';

function Step2Interview({ interviewData, onFinish }) {

    const { interviewId, questions, userName } = interviewData;

    const [isMicOn, setIsMicOn] = useState(false);
    const [isIntroPhase, setIsIntroPhase] = useState(true);

    const [isAIPlaying, setIsAIPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState('')
    const [timeLeft, setTimeLeft] = useState(
        questions[0]?.timeLimit || 60
    )

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subtitle, setSubtitle] = useState('');

    const recognitionRef = useRef(null);


    const currentQuestion = questions[currentIndex];

    return (
        <div className='h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 md:p-6 font-poppins overflow-hidden'>
            {/* Main Container - Fixed Height [85vh] prevents any overflow */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white flex flex-col lg:flex-row overflow-hidden'
            >

                {/* Left Column: AI Monitor - Fixed width, fills vertical height */}
                <div className='w-full lg:w-[30%] bg-slate-900 flex flex-col items-center p-6 space-y-4 relative shrink-0' >
                    <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-yellow-400/10 blur-3xl pointer-events-none' />

                    {/* AI Video - Auto resizes to fit container */}
                    <motion.div

                        className='w-full aspect-video lg:aspect-square rounded-l-4xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-800 relative z-10'
                    >
                        <video
                            src='https://res.cloudinary.com/dflf8j84g/video/upload/v1774549693/AI_asking_questions_202603262250_fgjdiw.mp4'
                            autoPlay loop muted playsInline
                            className='w-full h-full object-cover opacity-90'
                        />
                        <div className='absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full'>
                            <div className='w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse' />
                            <span className='text-[8px] font-bold text-white uppercase tracking-widest'>Live</span>
                        </div>
                    </motion.div>

                    {/* Status HUD - Flex-1 ensures it fills the remaining height on the left */}
                    <div className='w-full flex-1 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 flex flex-col justify-between relative z-10' >
                        <div className='space-y-3'>
                            <div className='flex justify-between items-center' >
                                <span className='text-[9px] uppercase tracking-[0.2em] font-black text-slate-400'>Status</span>
                                <span className='text-[10px] font-black text-yellow-400 uppercase flex items-center gap-2'>
                                    <span className='w-1 h-1 bg-yellow-400 rounded-full animate-ping' />
                                    AI Active
                                </span>
                            </div>
                            <div className='h-px bg-white/10' />
                        </div>

                        <div className='flex justify-center py-2' >
                            <Timer timeLeft={30} totalTime={60} />
                        </div>

                        <div className='space-y-3'>
                            <div className='h-px bg-white/10' />
                            <div className='grid grid-cols-2 gap-3' >
                                <div className='bg-white/5 rounded-xl p-2 text-center'>
                                    <p className='text-lg font-black text-white'>{currentIndex + 1}</p>
                                    <p className='text-[8px] uppercase font-bold text-slate-500'>Current</p>
                                </div>
                                <div className='bg-white/5 rounded-xl p-2 text-center'>
                                    <p className='text-lg font-black text-slate-400'>{questions?.length}</p>
                                    <p className='text-[8px] uppercase font-bold text-slate-500'>Total</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Interaction Hub */}
                <div className='flex-1 flex flex-col p-6 md:p-10 bg-white relative overflow-hidden' >
                    {/* Header - Shrink-0 keeps it from compressing */}
                    <div className='mb-4 shrink-0'>
                        <motion.div className='inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-yellow-400 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2'>
                            <HiCheckBadge /> Technical Assessment
                        </motion.div>
                        <h1 className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>AI Smart Interview</h1>
                    </div>

                    {/* Question Content - Shrink-0 keeps it from compressing */}
                    <div className='mb-4 shrink-0'>
                        <p className='text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1'>Question {currentIndex + 1} of {questions.length} </p>
                        <div className='text-lg md:text-xl font-bold text-slate-800 leading-tight border-l-4 border-yellow-400 pl-4'>
                            {currentQuestion?.question}
                        </div>
                    </div>



                    {/* Answer Input - flex-1 + min-h-0 is the secret to removing scroll */}
                    <div className='flex-1 flex flex-col min-h-0'>
                        <div className='relative flex-1 min-h-0'>
                            <textarea
                                placeholder='Type your response here...'
                                className='w-full h-full bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 outline-none focus:border-yellow-400 focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-300 resize-none shadow-inner'
                            />
                            <div className='absolute bottom-4 right-6 text-[8px] font-bold text-slate-300 uppercase tracking-widest'>
                                Secure line active...
                            </div>
                        </div>

                        {/* Controls - Shrink-0 prevents button from disappearing */}
                        <div className='flex items-center gap-3 mt-4 shrink-0' >
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className='w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-900 text-yellow-400 shadow-lg shrink-0'
                            >
                                <HiMicrophone size={22} />
                            </motion.button>

                            <motion.button
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.98 }}
                                className='flex-1 bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-xl hover:shadow-yellow-400/20 transition-all'
                            >
                                Submit Answer
                                <HiArrowRight size={16} className='text-yellow-400' />
                            </motion.button>
                        </div>
                    </div>

                    {/* Decorative watermark */}
                    <div className='absolute -bottom-6 -right-6 text-[80px] font-black text-slate-50 pointer-events-none select-none z-[-1] uppercase'>
                        Prepper
                    </div>
                </div>

            </motion.div>
        </div>
    )
}

export default Step2Interview;