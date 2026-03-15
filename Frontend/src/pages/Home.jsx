import React, { useState } from 'react'
import Navbar from '../components/Navbar'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import { HiSparkles, HiArrowRight } from "react-icons/hi";
import { RiHistoryLine, RiRobot2Line, RiBarChartGroupedLine, RiShieldFlashLine } from "react-icons/ri";
import AuthModel from '../components/AuthModel';
import { useNavigate } from 'react-router-dom';
import FeatureCard from '../components/FeatureCard';
import CapabilityCard from '../components/CapabilityCard';
import ModeCard from '../components/ModeCard';

function Home() {
    const { userData } = useSelector((state) => state.user);
    const [showAuth, setShowAuth] = useState(false);
    const navigate = useNavigate();

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.3 }
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

    return (
        <div className='min-h-screen bg-[#F5EC5A] flex flex-col relative overflow-x-hidden font-poppins selection:bg-slate-900 selection:text-yellow-400'>
            
            {/* Ambient Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                        rotate: [0, 5, 0],
                        x: [0, 20, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-white/20 rounded-full blur-[100px]"
                />
            </div>

            <Navbar />

            <main className='flex-1 flex flex-col items-center px-6 py-12 md:py-20 z-10'>
                
                {/* ── AI Badge ── */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    className='bg-white/40 backdrop-blur-md text-[10px] md:text-xs px-5 py-2.5 rounded-full flex items-center gap-2 border border-white/50 text-yellow-950 font-black shadow-sm mb-10 cursor-default tracking-widest'
                >
                    <HiSparkles className='text-yellow-600 animate-pulse text-lg' />
                    AI-POWERED INTERVIEW PREPARATION
                </motion.div>

                {/* ── Hero Section ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className='text-center max-w-5xl'
                >
                    <motion.h1 variants={itemVariants} className='text-5xl md:text-8xl font-black leading-[1.1] text-slate-900 mb-8 tracking-tighter'>
                        Master Your Next <br />
                        <span className='relative inline-block'>
                            Interview with
                            <motion.span
                                whileHover={{ scale: 1.05, rotate: 0 }}
                                className='ml-3 bg-slate-900 text-[#F5EC5A] px-6 py-2 rounded-2xl inline-block -rotate-2 transition-all duration-300 shadow-xl cursor-default'
                            >
                                PREPPER
                            </motion.span>
                        </span>
                    </motion.h1>

                    <motion.p variants={itemVariants} className='text-lg md:text-xl text-yellow-950/70 font-medium max-w-2xl mx-auto mb-10 leading-relaxed'>
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
                            className='group w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(15,23,42,0.25)] hover:bg-slate-800 transition-all'
                        >
                            Get Started Free
                            <HiArrowRight className='text-yellow-400 group-hover:translate-x-1 transition-transform' />
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.03, backgroundColor: "rgba(255, 255, 255, 0.6)" }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => {
                                if (!userData) return setShowAuth(true);
                                navigate('/history');
                            }}
                            className='w-full sm:w-auto flex items-center justify-center gap-3 bg-white/40 backdrop-blur-md text-slate-900 border-2 border-white/60 px-10 py-5 rounded-2xl font-black text-lg shadow-sm transition-all group'
                        >
                            View History
                            <RiHistoryLine className='text-slate-500 group-hover:rotate-[360deg] transition-transform duration-700 ease-in-out' />
                        </motion.button>
                    </motion.div>

                    {/* Feature Grid */}
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        className='grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full max-w-6xl mb-32'
                    >
                        <FeatureCard
                            icon={<RiRobot2Line size={28} />}
                            title="Personalized Roadmaps"
                            desc="Select your specific tech stack and seniority for custom roadmaps."
                            delay={0.1}
                        />
                        <FeatureCard
                            icon={<RiBarChartGroupedLine size={28} />}
                            title="Voice-First Coaching"
                            desc="Real-time conversations that evaluate your clarity and depth."
                            delay={0.2}
                        />
                        <FeatureCard
                            icon={<RiShieldFlashLine size={28} />}
                            title="Pressure Testing"
                            desc="Practice under timed constraints to manage interview anxiety."
                            delay={0.3}
                        />
                    </motion.div>

                    {/* ── AI CAPABILITIES SECTION ── */}
                    <div className='w-full text-left mb-32'>
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className='mb-12 flex-col text-center items-center gap-4 text-3xl md:text-5xl'
                        >
                            <h2 className='text-4xl md:text-6xl font-black text-slate-900 tracking-tighter'>
                                AI <span className='text-white bg-slate-900 px-5 py-1 rounded-2xl shadow-xl'>Capabilities</span>
                            </h2>
                            <p className='text-yellow-950/60 mt-4 font-medium text-lg'>Choose how you want to be challenged</p>
                        </motion.div>

                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className='grid grid-cols-1 lg:grid-cols-2 gap-8'
                        >
                            <CapabilityCard 
                                image={"/Ai-answer-check.jpeg"}
                                title="Answer Evaluation"
                                desc="Get instant, detailed feedback on the technical accuracy and soft skills of your verbal responses using our advanced LLM scoring engine."
                            />
                            <CapabilityCard 
                                image={"/resume-interview.jpeg"}
                                title="Resume Based Interview"
                                desc="Upload your PDF and our AI will pivot questions specifically to target your past projects, skills, and unique professional history."
                            />
                            <CapabilityCard 
                                image={'/report-download.jpeg'}
                                title="Report Download"
                                desc="Post-session, generate a comprehensive PDF performance report containing growth roadmaps and suggested technical improvements."
                            />
                            <CapabilityCard 
                                image={'/history-report.jpeg'}
                                title="History Analysis"
                                desc="Visualize your progress over time. Identify recurring filler words, tone shifts, and technical gaps through historical data analysis."
                            />
                        </motion.div>
                    </div>

                    {/* ── INTERVIEW MODES SECTION ── */}
                    <div className='w-full max-w-6xl mb-20'>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className='text-center mb-16'
                        >
                            <h2 className='text-4xl md:text-6xl font-black text-slate-900 tracking-tighter'>
                                Tailored <span className='text-white bg-slate-900 px-5 py-1 rounded-2xl shadow-xl'>Modes</span>
                            </h2>
                            <p className='text-yellow-950/60 mt-4 font-medium text-lg'>Choose how you want to be challenged</p>
                        </motion.div>

                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className='grid grid-cols-1 md:grid-cols-3 gap-8 text-left'
                        >
                            <ModeCard 
                                title="HR Mode"
                                desc="Focus on behavioral questions, culture fit, and situational leadership scenarios common in final rounds."
                                icon="🤝"
                                color="bg-[#F7D63A]"
                            />
                            <ModeCard 
                                title="Technical Mode"
                                desc="Deep dive into system design, coding logic, and tech-stack specific fundamental architecture questions."
                                icon="💻"
                                color="bg-[#F7D63A]"
                            />
                            <ModeCard 
                                title="Confidence Detection"
                                desc="A specialized mode that focus strictly on your speech pace, filler words, and body language."
                                icon="⚡"
                                color="bg-[#F7D63A]"
                            />
                        </motion.div>
                    </div>

                </motion.div>
            </main>

            <AnimatePresence>
                {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
            </AnimatePresence>
        </div>
    )
}



export default Home;