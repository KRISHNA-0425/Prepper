import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiCheckCircle, HiMicrophone, HiChartBar, HiBriefcase, HiTrendingUp, HiArrowRight, HiSparkles, HiCode, HiCollection, HiX } from 'react-icons/hi'
import { FaFileArrowUp } from "react-icons/fa6";
import { RiUserVoiceLine } from 'react-icons/ri'
import axios from 'axios'
import { backendServerUrl } from '../App';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { IoArrowBackOutline } from "react-icons/io5";
import { useNavigate } from 'react-router-dom';

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
    const [enableCrossQuestioning, setEnableCrossQuestioning] = useState(false);
    const [crossQuestioningType, setCrossQuestioningType] = useState('Technical');
    const userEditedFieldsRef = useRef({ role: false, experience: false });
    const uploadedFileRef = useRef(null);
    const activeExtractionIdRef = useRef(0);
    const resumeDerivedValuesRef = useRef({ role: '', experience: '' });

    // Derived validation: cross-questioning is strictly enabled only when a valid resume has been parsed
    const hasValidResume = Boolean(resumeFile && anaylsisDone && resumeText && resumeText.trim().length > 0);

    // Automatically disable and reset cross-questioning if the resume is removed or invalidated
    useEffect(() => {
        if (!hasValidResume && enableCrossQuestioning) {
            setEnableCrossQuestioning(false);
        }
    }, [hasValidResume, enableCrossQuestioning]);

    const navigate = useNavigate();

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

    const performResumeExtraction = async (file) => {
        if (!file) return;
        if (uploadedFileRef.current === file && anaylsisDone) return;

        const fileName = (file.name || '').toLowerCase();
        const isSupported = fileName.endsWith('.pdf') || fileName.endsWith('.docx') || fileName.endsWith('.doc');
        if (!isSupported) {
            toast.error("Please upload a PDF or Word (.docx) document");
            return;
        }

        const extractionId = ++activeExtractionIdRef.current;
        setResumeFile(file);
        uploadedFileRef.current = file;
        setAnaylzing(true);
        const loadToast = toast.loading("Extracting and parsing resume details...");

        const formData = new FormData();
        formData.append("resume", file);

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/resume', formData, { withCredentials: true });

            // Discard stale response if another file was uploaded or resume was cleared
            if (extractionId !== activeExtractionIdRef.current || !uploadedFileRef.current) {
                return;
            }

            // Normalize response fields from backend API
            const resData = result.data?.data || result.data || {};
            const extractedRole = String(resData.role || resData.targetRole || resData.jobRole || '').trim();
            let rawExp = resData.experience ?? resData.yearsOfExperience ?? resData.experienceLevel ?? resData.level ?? '';
            if (typeof rawExp === 'number') {
                rawExp = rawExp <= 0 ? 'Fresher (0 years)' : `${rawExp} ${rawExp === 1 ? 'year' : 'years'}`;
            }
            const extractedExperience = String(rawExp || '').trim();
            // Normalize skills: support flat array, categorized object, or legacy schema
            let extractedSkills = [];
            if (Array.isArray(resData.skills)) {
                extractedSkills = resData.skills.map(s => String(s).trim()).filter(Boolean);
            } else if (resData.categorizedSkills && typeof resData.categorizedSkills === 'object') {
                extractedSkills = Object.values(resData.categorizedSkills)
                    .flatMap(val => Array.isArray(val) ? val : [val])
                    .map(s => String(s).trim())
                    .filter(Boolean);
            } else if (resData.skills && typeof resData.skills === 'object') {
                extractedSkills = Object.values(resData.skills)
                    .flatMap(val => Array.isArray(val) ? val : [val])
                    .map(s => String(s).trim())
                    .filter(Boolean);
            }
            extractedSkills = Array.from(new Set(extractedSkills));

            // Normalize projects: support string array, detailed object array, or nested keyProjects
            let extractedProjects = [];
            const rawProjectsList = resData.projects || resData.detailedProjects || resData.keyProjects || [];
            if (Array.isArray(rawProjectsList)) {
                extractedProjects = rawProjectsList.map(p => {
                    if (typeof p === 'string') return p.trim();
                    if (p && typeof p === 'object') return String(p.name || p.title || '').trim();
                    return '';
                }).filter(Boolean);
            }
            extractedProjects = Array.from(new Set(extractedProjects));

            const extractedResumeText = resData.resumeText || '';

            let populatedAny = false;

            // Auto-populate relevant fields preserving manual user edits
            if (!userEditedFieldsRef.current.role && extractedRole) {
                setRole(extractedRole);
                resumeDerivedValuesRef.current.role = extractedRole;
                populatedAny = true;
            }
            if (!userEditedFieldsRef.current.experience && extractedExperience) {
                setExperience(extractedExperience);
                resumeDerivedValuesRef.current.experience = extractedExperience;
                populatedAny = true;
            }
            setProjects(extractedProjects);
            setSkills(extractedSkills);
            if (extractedResumeText) {
                setResumeText(extractedResumeText);
            }
            setAnaylsisDone(true);

            if (extractedRole && extractedExperience) {
                toast.success("Resume parsed! Target Role and Experience populated automatically.", { id: loadToast });
            } else if (populatedAny || extractedSkills.length) {
                toast.success("Resume parsed! Some fields populated. Please review and fill any remaining fields.", { id: loadToast });
            } else {
                toast.success("Resume text extracted! Please enter your target role and experience.", { id: loadToast });
            }
        } catch (error) {
            console.error('Error in resume extraction', error);
            if (extractionId === activeExtractionIdRef.current) {
                setAnaylsisDone(false);
                const errMsg = error.response?.data?.message || "Could not extract text from document. You can still enter details manually.";
                toast.error(errMsg, { id: loadToast });
            }
        } finally {
            if (extractionId === activeExtractionIdRef.current) {
                setAnaylzing(false);
            }
        }
    };

    const handleUploadResume = async (e) => {
        if (e) e.stopPropagation();
        if (!resumeFile) return;
        await performResumeExtraction(resumeFile);
    };

    // const handleSubmit = (e) => {
    //     e.preventDefault();
    //     onStart();
    // };

    const handleStart = async () => {
        setLoading(true);
        try {
            const result = await axios.post(backendServerUrl + '/api/interview/generateQuestions',
                {
                    role,
                    experience,
                    mode,
                    skills,
                    projects,
                    resumeText: hasValidResume ? resumeText : '',
                    enableCrossQuestioning: Boolean(hasValidResume && enableCrossQuestioning),
                    crossQuestioningType: crossQuestioningType || "Technical"
                },
                { withCredentials: true }
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
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='min-h-screen w-full flex items-center justify-center bg-[#F5EC5A] p-3 sm:p-4 md:p-6 lg:p-8 font-poppins overflow-y-auto'
            >
                <div className='w-full max-w-6xl bg-white rounded-[2rem] sm:rounded-[2.5rem] md:rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.1)] grid grid-cols-1 md:grid-cols-2 overflow-hidden my-auto md:h-[90vh] md:max-h-[840px]'>

                    {/* --- Left Column: Branding --- */}
                    <motion.div
                        initial={{ x: -50 }}
                        animate={{ x: 0 }}
                        className='relative bg-slate-900 p-6 sm:p-8 md:p-10 flex flex-col justify-center text-white overflow-hidden min-h-0'
                    >
                        <button
                            type="button" 
                            aria-label="Back to home"
                            className='absolute top-5 left-5 md:top-8 md:left-8 z-50 p-2 hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400'
                            onClick={() => navigate("/")}
                        >
                            <IoArrowBackOutline size={26} className='text-yellow-500' />
                        </button>
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
                    <motion.div className='p-6 md:px-8 md:py-6 lg:p-10 flex flex-col bg-white overflow-y-auto min-h-0 custom-scrollbar'>
                        <motion.div
                            layout
                            className='max-w-md mx-auto w-full space-y-5 my-auto py-2'
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
                                        onChange={(e) => { userEditedFieldsRef.current.role = true; setRole(e.target.value); }}
                                        className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800'
                                    />
                                </motion.div>

                                <motion.div className='flex flex-col gap-2'>
                                    <div className='space-y-1'>
                                        <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><HiTrendingUp /> Level</label>
                                        <input
                                            type="text"
                                            className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-yellow-400 focus:bg-white transition-all font-semibold text-slate-800'
                                            placeholder='Experience e.g.-2 years '
                                            onChange={(e) => { userEditedFieldsRef.current.experience = true; setExperience(e.target.value); }}
                                            value={experience}
                                        />
                                    </div>
                                    <div className='space-y-1'>
                                        <label className='flex items-center gap-2 text-[10px] font-black uppercase text-slate-400'><RiUserVoiceLine /> Mode</label>
                                        <select value={mode} onChange={(e) => setMode(e.target.value)} className='w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 font-bold text-slate-700 outline-none focus:border-yellow-400 cursor-pointer'><option value="Technical">Technical</option><option value="HR">HR/Behavioral</option></select>
                                    </div>
                                </motion.div>

                                {/* Feature D: Optional Cross-Questioning Option */}
                                <motion.div layout className={`p-3.5 border-2 rounded-xl transition-colors space-y-2.5 ${!hasValidResume ? 'bg-slate-50/60 border-slate-100 opacity-80' : 'bg-slate-50 border-slate-100 hover:border-yellow-400/60'}`}>
                                    <label htmlFor="enableCrossQuestioning" className={`flex items-start gap-3 select-none ${hasValidResume ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}>
                                        <input
                                            type="checkbox"
                                            id="enableCrossQuestioning"
                                            name="enableCrossQuestioning"
                                            checked={enableCrossQuestioning}
                                            disabled={!hasValidResume}
                                            onChange={(e) => setEnableCrossQuestioning(e.target.checked)}
                                            className={`mt-0.5 w-4 h-4 rounded border-slate-300 focus:ring-yellow-400 accent-yellow-500 ${hasValidResume ? 'cursor-pointer text-yellow-500' : 'cursor-not-allowed opacity-60 text-slate-400'}`}
                                        />
                                        <div className='flex-1'>
                                            <span className='text-xs font-black text-slate-800 block'>
                                                Enable cross-questioning
                                            </span>
                                            <span className='text-[10px] text-slate-500 leading-tight block mt-0.5'>
                                                Allows the AI to ask relevant follow-up questions based on your answers to test depth and clarity.
                                            </span>
                                            {!hasValidResume && (
                                                <span className='text-[11px] font-semibold text-amber-600 block mt-1.5'>
                                                    Upload your resume to enable cross-questioning.
                                                </span>
                                            )}
                                        </div>
                                    </label>

                                    {enableCrossQuestioning && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className='pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-3'
                                        >
                                            <label htmlFor="crossQuestioningType" className='text-[10px] font-black uppercase text-slate-500'>
                                                Cross-Questioning Type
                                            </label>
                                            <select
                                                id="crossQuestioningType"
                                                name="crossQuestioningType"
                                                value={crossQuestioningType}
                                                onChange={(e) => setCrossQuestioningType(e.target.value)}
                                                className='bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 outline-none focus:border-yellow-400 cursor-pointer'
                                            >
                                                <option value="Technical">Technical</option>
                                                <option value="Behavioral">Behavioral</option>
                                            </select>
                                        </motion.div>
                                    )}
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
                                            <input type="file" accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document' id="resumeUpload" className='hidden' onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    performResumeExtraction(file);
                                                }
                                            }} />
                                            <p className='text-xs font-bold text-slate-600 truncate'>{resumeFile ? resumeFile.name : "Upload resume (optional)"}</p>
                                            {resumeFile && (
                                                <motion.button
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    type="button"
                                                    disabled={anaylzing}
                                                    onClick={handleUploadResume}
                                                    className='mt-2 px-6 py-1.5 bg-slate-900 rounded-lg text-[10px] font-black text-white uppercase shadow-lg disabled:opacity-50'
                                                >
                                                    {anaylzing ? "Analyzing..." : "Sync with AI"}
                                                </motion.button>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="results"
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            layout
                                            className='bg-slate-900 rounded-xl p-3.5 text-white border-l-4 border-yellow-400 shadow-xl flex flex-col max-h-56 sm:max-h-64'
                                        >
                                            {/* Panel Header with Non-overlapping Close Button */}
                                            <div className='flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0'>
                                                <div className='flex items-center gap-2 text-yellow-400 text-[10px] font-black uppercase tracking-widest'>
                                                    <HiSparkles className='animate-pulse' />
                                                    Extraction Complete
                                                </div>
                                                <motion.button
                                                    whileHover={{ rotate: 90 }}
                                                    type="button"
                                                    aria-label="Dismiss extracted resume data"
                                                    onClick={() => {
                                                        setAnaylsisDone(false);
                                                        setResumeFile(null);
                                                        uploadedFileRef.current = null;
                                                        activeExtractionIdRef.current++;
                                                        setResumeText('');
                                                        setSkills([]);
                                                        setProjects([]);
                                                        setEnableCrossQuestioning(false);
                                                        if (!userEditedFieldsRef.current.role && role === resumeDerivedValuesRef.current.role) {
                                                            setRole('');
                                                        }
                                                        if (!userEditedFieldsRef.current.experience && experience === resumeDerivedValuesRef.current.experience) {
                                                            setExperience('');
                                                        }
                                                        resumeDerivedValuesRef.current = { role: '', experience: '' };
                                                    }}
                                                    className='p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-yellow-400 transition-colors'
                                                >
                                                    <HiX size={16} />
                                                </motion.button>
                                            </div>

                                            {/* Scrollable Content Container for Skills and Projects */}
                                            <div 
                                                tabIndex={0}
                                                aria-label="Extracted skills and projects"
                                                className='overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0 focus:outline-none focus:ring-1 focus:ring-yellow-400/40 rounded'
                                            >
                                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                                                    {/* Skills Column */}
                                                    <div className='min-w-0'>
                                                        <p className='text-[9px] uppercase font-black text-slate-400 mb-1.5 flex items-center gap-1'>
                                                            <HiCode className='text-yellow-400' /> Skills {skills.length > 0 && <span className='text-slate-500 font-semibold'>({skills.length})</span>}
                                                        </p>
                                                        <div className='flex flex-wrap gap-1'>
                                                            {skills.length ? skills.map((s, i) => (
                                                                <span 
                                                                    key={i} 
                                                                    className='bg-white/10 text-slate-200 text-[9px] font-medium px-2 py-0.5 rounded-md border border-white/5 break-words max-w-full'
                                                                >
                                                                    {s}
                                                                </span>
                                                            )) : (
                                                                <span className='text-[9px] text-slate-400 italic'>None listed</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Projects Column */}
                                                    <div className='min-w-0'>
                                                        <p className='text-[9px] uppercase font-black text-slate-400 mb-1.5 flex items-center gap-1'>
                                                            <HiCollection className='text-yellow-400' /> Projects {projects.length > 0 && <span className='text-slate-500 font-semibold'>({projects.length})</span>}
                                                        </p>
                                                        <div className='flex flex-wrap gap-1.5'>
                                                            {projects.length ? projects.map((p, i) => (
                                                                <span 
                                                                    key={i} 
                                                                    className='bg-white/10 text-slate-200 text-[11px] px-2.5 py-1 rounded-md border border-white/5 break-words whitespace-normal max-w-full inline-block leading-snug' 
                                                                    title={typeof p === 'string' ? p : (p.description ? `${p.name || p.title || 'Project'}: ${p.description}` : (p.name || p.title || 'Project'))}
                                                                >
                                                                    <span className='font-semibold text-slate-100 block'>
                                                                        {typeof p === 'string' ? p : (p.name || p.title || 'Project')}
                                                                    </span>
                                                                    {typeof p === 'object' && p && p.description && (
                                                                        <span className='block text-[9px] text-slate-400 font-normal mt-0.5 break-words'>
                                                                            {p.description}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            )) : (
                                                                <span className='text-[9px] text-slate-400 italic'>None listed</span>
                                                            )}
                                                        </div>
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
                                    className='w-full bg-slate-900 text-white py-3.5 md:py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2'
                                >
                                    {loading ? "Starting..." : "Start Interview"}
                                    <HiArrowRight className='text-yellow-400 group-hover:translate-x-1 transition-transform' />
                                </motion.button>
                            </form>
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </>
    )
}

export default Step1Setup;
