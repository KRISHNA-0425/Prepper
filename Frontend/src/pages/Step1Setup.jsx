import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiCheckCircle, HiMicrophone, HiChartBar, HiBriefcase, HiTrendingUp, HiArrowRight, HiSparkles, HiCode, HiCollection, HiX } from 'react-icons/hi'
import { FaFileArrowUp } from "react-icons/fa6";
import { RiUserVoiceLine } from 'react-icons/ri'
import axios from 'axios'
import { backendServerUrl } from '../App';
import toast from 'react-hot-toast';

function Step1Setup({ onStart }) {
    const [role, setRole] = useState('')
    const [experience, setExperience] = useState('0-1')
    const [mode, setMode] = useState('Technical')
    const [resumeFile, setResumeFile] = useState(null)
    const [skills, setSkills] = useState([])
    const [projects, setProjects] = useState([])
    const [resumeText, setResumeText] = useState('')
    const [anaylsisDone, setAnaylsisDone] = useState(false)
    const [anaylzing, setAnaylzing] = useState(false)

    const handleUploadResume = async (e) => {
        if (e) e.stopPropagation();
        if (!resumeFile || anaylzing) return;
        setAnaylzing(true);

        const formData = new FormData()
        formData.append("resume", resumeFile)

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/resume', formData, { withCredentials: true })
            setRole(result.data.role || '')
            setExperience(result.data.experience || '0-1')
            setProjects(result.data.projects || [])
            setSkills(result.data.skills || [])
            setResumeText(result.data.resumeText || '')
            setAnaylsisDone(true)
            toast.success("Profile Analyse Complete")
        } catch (error) {
            console.error('Error in handleUploadResume', error);
            toast.error("unable to anaylse resume")
        } finally {
            setAnaylzing(false);
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onStart({ role, experience, mode, skills, projects, resumeText });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='h-screen w-full flex items-center justify-center bg-[#F5EC5A] p-4 font-poppins overflow-hidden'
        >
            <div className='w-full max-w-6xl bg-white rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.1)] grid md:grid-cols-2 overflow-hidden h-[90vh] max-h-[800px]'>
                
                {/* --- Left Column: Branding --- */}
                <motion.div className='relative bg-slate-900 p-8 md:p-10 flex flex-col justify-center text-white overflow-hidden'>
                    <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 10, repeat: Infinity }} className='absolute -top-20 -left-20 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl' />
                    <div className='relative z-10'>
                        <div className='inline-flex px-4 h-12 bg-yellow-400 rounded-2xl items-center justify-center text-slate-900 text-2xl mb-6 shadow-lg font-black'>
                            <HiSparkles className="mr-2" /> <span>PREPPER</span>
                        </div>
                        <h1 className='text-3xl md:text-5xl font-black mb-4 tracking-tighter'>Ready to <span className='text-yellow-400'>Level Up?</span></h1>
                        <p className='text-slate-400 text-base mb-8 max-w-sm'>AI-driven interview practice tailored to your career path.</p>
                        
                        <div className='space-y-3'>
                            {[{ icon: <HiCheckCircle />, text: "Automated Resume Parsing", color: "text-yellow-400" },
                              { icon: <HiMicrophone />, text: "Smart Voice Interview", color: "text-blue-400" },
                              { icon: <HiChartBar />, text: "Detailed Performance Report", color: "text-green-400" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5">
                                    <span className={`${item.color} text-xl`}>{item.icon}</span>
                                    <span className="text-slate-200 font-bold text-sm">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* --- Right Column: Form --- */}
                <motion.div className='p-6 md:p-10 flex flex-col justify-center bg-white overflow-hidden'>
                    <div className='max-w-md mx-auto w-full space-y-6'>
                        <div>
                            <h2 className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>Interview Setup</h2>
                            <p className='text-slate-500 font-medium text-xs'>Configure or sync your profile</p>
                        </div>

                        <form onSubmit={handleSubmit} className='space-y-4'>
                            <div className='group space-y-1'>
                                <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-focus-within:text-yellow-600'><HiBriefcase /> Job Role</label>
                                <input required type="text" placeholder="e.g. Frontend Engineer" value={role} onChange={(e) => setRole(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 transition-all font-semibold text-slate-800' />
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                                <div className='space-y-1'>
                                    <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><HiTrendingUp /> Experience</label>
                                    <select value={experience} onChange={(e) => setExperience(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 font-bold text-slate-700 appearance-none outline-none focus:border-yellow-400 cursor-pointer'><option value="0-1">Freshman</option><option value="2-4">Intermediate</option><option value="5+">Senior</option></select>
                                </div>
                                <div className='space-y-1'>
                                    <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><RiUserVoiceLine /> Mode</label>
                                    <select value={mode} onChange={(e) => setMode(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 font-bold text-slate-700 appearance-none outline-none focus:border-yellow-400 cursor-pointer'><option value="Technical">Technical</option><option value="HR">HR / Behavioral</option></select>
                                </div>
                            </div>

                            {/* Resume Upload Section */}
                            {!anaylsisDone ? (
                                <div className='border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-all' onClick={() => document.getElementById("resumeUpload").click()}>
                                    <FaFileArrowUp className='text-2xl mx-auto text-yellow-600 mb-1' />
                                    <input type="file" accept='application/pdf' id="resumeUpload" className='hidden' onChange={(e) => setResumeFile(e.target.files[0])} />
                                    <p className='text-xs font-bold text-slate-600 truncate'>{resumeFile ? resumeFile.name : "Upload resume (optional)"}</p>
                                    {resumeFile && (
                                        <button type="button" onClick={handleUploadResume} className='mt-2 px-6 py-1.5 bg-yellow-400 rounded-lg text-[10px] font-black text-slate-900 uppercase hover:shadow-lg transition-all'>
                                            {anaylzing ? "Analyzing..." : "Analyse Profile"}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='bg-slate-900 rounded-xl p-4 text-white relative border-l-4 border-yellow-400'>
                                    <button onClick={() => {setAnaylsisDone(false); setResumeFile(null)}} className='absolute top-2 right-2 text-slate-500 hover:text-white'><HiX /></button>
                                    <div className='flex items-center gap-2 mb-2 text-yellow-400 text-xs font-black uppercase tracking-widest'><HiSparkles /> Analyse Complete</div>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div>
                                            <p className='text-[9px] uppercase font-black text-slate-500 mb-1 flex items-center gap-1'><HiCode /> Skills Detected</p>
                                            <div className='flex flex-wrap gap-1'>{skills.slice(0, 4).map((s, i) => <span key={i} className='bg-white/10 text-[9px] px-2 py-0.5 rounded-md'>{s}</span>)}</div>
                                        </div>
                                        <div>
                                            <p className='text-[9px] uppercase font-black text-slate-500 mb-1 flex items-center gap-1'><HiCollection /> Projects Found</p>
                                            <p className='text-[10px] font-bold truncate text-slate-200'>{projects[0] || 'N/A'}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <motion.button disabled={!role || anaylzing} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} type="submit" className='w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all group disabled:opacity-50'>
                                Start Interview <HiArrowRight className='text-yellow-400 group-hover:translate-x-1 transition-transform' />
                            </motion.button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    )
}

export default Step1Setup;