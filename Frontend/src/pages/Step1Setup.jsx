import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiCheckCircle, HiMicrophone, HiChartBar, HiBriefcase, HiTrendingUp, HiArrowRight, HiSparkles, HiCode, HiCollection, HiX } from 'react-icons/hi'
import { FaFileArrowUp } from "react-icons/fa6";
import { RiUserVoiceLine } from 'react-icons/ri'
import axios from 'axios'
import { backendServerUrl } from '../App';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';

function Step1Setup({ onStart }) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState('')
    const [experience, setExperience] = useState('')
    const [mode, setMode] = useState('Technical')
    const [resumeFile, setResumeFile] = useState(null)
    const [skills, setSkills] = useState([])
    const [projects, setProjects] = useState([])
    const [resumeText, setResumeText] = useState('')
    const [anaylsisDone, setAnaylsisDone] = useState(false)
    const [anaylzing, setAnaylzing] = useState(false)

    const { userData } = useSelector((state) => state.user)
    const dispatch = useDispatch()

    // Micro-interaction variants
    const itemVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: i => ({
            opacity: 1,
            x: 0,
            transition: { delay: i * 0.1, type: "spring", stiffness: 100 }
        })
    };

    const handleUploadResume = async (e) => {
        if (e) e.stopPropagation();
        if (!resumeFile || anaylzing) return;

        setAnaylzing(true);
        const loadToast = toast.loading("AI is scanning your profile...");

        const formData = new FormData()
        formData.append("resume", resumeFile)

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/resume', formData, { withCredentials: true })

            // Artificial delay for smoother UX transition
            setRole(result.data.role || '')
            setExperience(result.data.experience || '')
            setProjects(result.data.projects || [])
            setSkills(result.data.skills || [])
            setResumeText(result.data.resumeText || '')
            setAnaylsisDone(true)

            toast.success("Profile Sync Complete!", { id: loadToast });
        } catch (error) {
            console.error('Error in handleUploadResume', error);
            toast.error("Unable to analyze resume. Please refresh or try again later", { id: loadToast });
        } finally {
            setAnaylzing(false);
        }
    }

    // const handleSubmit = (e) => {
    //     e.preventDefault();
    //     onStart();
    // };

    const handleStart = async () => {
        setLoading(true);
        try {
            const result = await axios.post(backendServerUrl + '/api/interview/generateQuestions',
                { role, experience, mode, skills, projects, resumeText }, { withCredentials: true }
            )
            console.log(result.data)

            if (userData) {
                dispatch(setUserData({ ...userData, credits: result.data.creditsLeft }))
            }
            setLoading(false);

            onStart(result.data)

        } catch (error) {
            console.log("error in handleStart", error);
            setLoading(false);
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='h-screen w-full flex items-center justify-center bg-[#F5EC5A] p-4 font-poppins overflow-hidden'
        >
            <div className='w-full max-w-6xl bg-white rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.1)] grid md:grid-cols-2 overflow-hidden h-[90vh] max-h-[800px]'>

                {/* --- Left Column: Branding --- */}
                <motion.div
                    initial={{ x: -50 }}
                    animate={{ x: 0 }}
                    className='relative bg-slate-900 p-8 md:p-10 flex flex-col justify-center text-white overflow-hidden'
                >
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.2, 0.4, 0.2]
                        }}
                        transition={{ duration: 8, repeat: Infinity }}
                        className='absolute -top-20 -left-20 w-64 h-64 bg-yellow-400/20 rounded-full blur-3xl'
                    />

                    <div className='relative z-10'>
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: -2 }}
                            className='inline-flex px-4 h-12 bg-yellow-400 rounded-2xl items-center justify-center text-slate-900 text-2xl mb-6 shadow-lg font-black cursor-pointer'
                        >
                            <HiSparkles className="mr-2" /> <span>PREPPER</span>
                        </motion.div>

                        <h1 className='text-3xl md:text-5xl font-black mb-4 tracking-tighter leading-tight'>
                            Ready to <br /> <span className='text-yellow-400'>Level Up?</span>
                        </h1>
                        <p className='text-slate-400 text-base mb-8 max-w-sm'>
                            Simulate real-world pressures with our specialized AI interview engine.
                        </p>

                        <div className='space-y-3'>
                            {[
                                { icon: <HiCheckCircle />, text: "Automated Resume Parsing", color: "text-yellow-400" },
                                { icon: <HiMicrophone />, text: "Smart Voice Interview", color: "text-blue-400" },
                                { icon: <HiChartBar />, text: "Detailed Analytics", color: "text-green-400" }
                            ].map((item, i) => (
                                <motion.div
                                    custom={i}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    whileHover={{ x: 10, backgroundColor: "rgba(255,255,255,0.05)" }}
                                    key={i}
                                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-all cursor-default"
                                >
                                    <span className={`${item.color} text-xl`}>{item.icon}</span>
                                    <span className="text-slate-200 font-bold text-sm">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* --- Right Column: Form --- */}
                <motion.div className='p-6 md:p-12 flex flex-col justify-center bg-white overflow-hidden'>
                    <motion.div
                        layout
                        className='max-w-md mx-auto w-full space-y-6'
                    >
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <h2 className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>Interview Setup</h2>
                            <p className='text-slate-500 font-medium text-xs'>Fill details or let AI handle it</p>
                        </motion.div>

                        <form className='space-y-4'>
                            <motion.div layout className='group space-y-1'>
                                <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-yellow-600 transition-colors'><HiBriefcase /> Job Role</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Frontend Engineer"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800'
                                />
                            </motion.div>

                            <motion.div className='flex flex-col gap-2'>
                                <div className='space-y-1'>
                                    <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><HiTrendingUp /> Level</label>
                                    {/* <select value={experience} onChange={(e) => setExperience(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:border-yellow-400 cursor-pointer'><option value="0-1">Freshman</option><option value="2-4">Intermediate</option><option value="5+">Senior</option></select> */}
                                    <input
                                        type="text"
                                        className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800'
                                        placeholder='Experience e.g.-2 years '
                                        onChange={(e) => setExperience(e.target.value)}
                                        value={experience}
                                    />
                                </div>
                                <div className='space-y-1'>
                                    <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><RiUserVoiceLine /> Mode</label>
                                    <select value={mode} onChange={(e) => setMode(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:border-yellow-400 cursor-pointer'><option value="Technical">Technical</option><option value="HR">HR/Behavioral</option></select>
                                </div>
                            </motion.div>

                            <AnimatePresence mode='wait'>
                                {!anaylsisDone ? (
                                    <motion.div
                                        key="uploader"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        layout
                                        className='border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-yellow-50/50 hover:border-yellow-400 transition-all group'
                                        onClick={() => document.getElementById("resumeUpload").click()}
                                    >
                                        <FaFileArrowUp className='text-2xl mx-auto text-slate-400 group-hover:text-yellow-600 group-hover:scale-110 transition-all mb-1' />
                                        <input type="file" accept='application/pdf' id="resumeUpload" className='hidden' onChange={(e) => setResumeFile(e.target.files[0])} />
                                        <p className='text-xs font-bold text-slate-600 truncate'>{resumeFile ? resumeFile.name : "Upload resume (optional)"}</p>
                                        {resumeFile && (
                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                type="button"
                                                onClick={handleUploadResume}
                                                className='mt-2 px-6 py-1.5 bg-slate-900 rounded-lg text-[10px] font-black text-white uppercase shadow-lg'
                                            >
                                                {anaylzing ? "Analyzing..." : "Sync with AI"}
                                            </motion.button>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="results"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        layout
                                        className='bg-slate-900 rounded-xl p-4 text-white relative border-l-4 border-yellow-400 shadow-xl'
                                    >
                                        <motion.button
                                            whileHover={{ rotate: 90 }}
                                            onClick={() => { setAnaylsisDone(false); setResumeFile(null) }}
                                            className='absolute top-2 right-2 text-slate-500 hover:text-white transition-colors'
                                        >
                                            <HiX />
                                        </motion.button>
                                        <div className='flex items-center gap-2 mb-2 text-yellow-400 text-[10px] font-black uppercase tracking-widest'><HiSparkles className='animate-pulse' /> Extraction Complete</div>
                                        <div className='grid grid-cols-2 gap-4'>
                                            <div>
                                                <p className='text-[9px] uppercase font-black text-slate-500 mb-1 flex items-center gap-1'><HiCode /> Skills</p>
                                                <div className='flex flex-wrap gap-1'>
                                                    {skills.map((s, i) => (
                                                        <span key={i} className='bg-white/10 text-[9px] px-2 py-0.5 rounded-md border border-white/5'>{s}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <p className='text-[9px] uppercase font-black text-slate-500 mb-1 flex  items-center gap-1'><HiCollection /> Projects</p>
                                                <div className='flex  flex-wrap gap-1'>
                                                    {projects.map((p, i) => (
                                                        <span key={i} className='bg-white/10 text-[12px] px-2 py-0.5 rounded-md border border-white/5'>{p}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <motion.button
                                layout
                                onClick={handleStart}
                                disabled={!role || !experience || anaylzing || loading}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className='w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all group disabled:opacity-50'
                            >
                                {loading ? "Starting..." : "Start Interview"}
                                <HiArrowRight className='text-yellow-400 group-hover:translate-x-1 transition-transform' />
                            </motion.button>
                        </form>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    )
}

export default Step1Setup;