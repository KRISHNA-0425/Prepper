import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { RiCoinsLine, RiLogoutBoxRLine, RiArrowDownSLine, RiFlashlightLine, RiHistoryLine, RiShieldFlashLine, RiCodeSSlashLine, RiRoadMapLine, RiBuilding4Line, RiFileSearchLine } from "react-icons/ri";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';
import ThemeToggle from './ui/ThemeToggle';

function Navbar() {
    const { userData } = useSelector((state) => state.user);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCreditPopup, setShowCreditPopup] = useState(false);
    const [showAuth, setShowAuth] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const isCrossExamActive = location.pathname.startsWith('/cross-examination');
    const isLiveCodingActive = location.pathname.startsWith('/coding');
    const isRecoveryPlanActive = location.pathname.startsWith('/recovery-plans');
    const isCompanyActive = location.pathname.startsWith('/company-interview');
    const isAtsActive = location.pathname.startsWith('/ats');

    const handleLogout = async () => {
        try {
            await axios.get(`${backendServerUrl}/api/auth/logout`, { withCredentials: true });
            dispatch(setUserData(null));
            setIsDropdownOpen(false);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className='w-full flex items-center justify-center px-4 pt-4 md:pt-6 font-poppins relative z-50'>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className='w-full max-w-6xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/80 dark:border-slate-800/80 px-4 md:px-6 py-3 flex items-center justify-between relative transition-colors duration-200'
            >
                {/* Logo Section & Dedicated Nav Links */}
                <div className='flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar max-w-[calc(100vw-180px)] md:max-w-none py-1'>
                    <Link to="/" aria-label="Prepper AI Home">
                        <motion.div whileHover={{ scale: 1.05 }} className='flex items-center gap-2 md:gap-3 cursor-pointer group'>
                            <img 
                                src="/logo.svg" 
                                alt="Prepper Logo" 
                                className="w-9 h-9 md:w-11 md:h-11 object-contain drop-shadow-[0_0_12px_rgba(0,242,254,0.4)] group-hover:rotate-6 transition-transform duration-300"
                            />
                            <h1 className='text-lg md:text-xl font-black text-slate-800 dark:text-white tracking-tighter'>PREPPER</h1>
                        </motion.div>
                    </Link>

                    {/* Dedicated Cross-Examination Navigation Item */}
                    <Link 
                        to="/cross-examination" 
                        aria-label="Cross-Examination"
                        aria-current={isCrossExamActive ? "page" : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs border ${
                            isCrossExamActive 
                                ? 'bg-yellow-400/30 text-yellow-900 border-yellow-400/70 shadow-sm ring-1 ring-yellow-400/40 dark:bg-yellow-400/20 dark:text-yellow-300 dark:border-yellow-400/50' 
                                : 'bg-white/50 hover:bg-white/80 text-slate-800 border-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/60'
                        }`}
                    >
                        <RiShieldFlashLine className="text-yellow-600 dark:text-yellow-400 text-sm shrink-0" />
                        <span className="hidden sm:inline">Cross-Examination</span>
                        <span className="sm:hidden text-[11px]">Cross-Exam</span>
                    </Link>

                    {/* Dedicated Live Coding Navigation Item */}
                    <Link 
                        to="/coding" 
                        aria-label="Live Coding"
                        aria-current={isLiveCodingActive ? "page" : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs border ${
                            isLiveCodingActive 
                                ? 'bg-indigo-500/20 text-indigo-950 border-indigo-400/70 shadow-sm ring-1 ring-indigo-400/40 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-400/50' 
                                : 'bg-white/50 hover:bg-white/80 text-slate-800 border-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/60'
                        }`}
                    >
                        <RiCodeSSlashLine className="text-indigo-600 dark:text-indigo-400 text-sm shrink-0" />
                        <span className="hidden sm:inline">Live Coding</span>
                        <span className="sm:hidden text-[11px]">Coding</span>
                    </Link>

                    {/* Module 5: Recovery Plans Navigation Item */}
                    <Link 
                        to="/recovery-plans" 
                        aria-label="Recovery Plans"
                        aria-current={isRecoveryPlanActive ? "page" : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs border ${
                            isRecoveryPlanActive 
                                ? 'bg-emerald-500/20 text-emerald-950 border-emerald-400/70 shadow-sm ring-1 ring-emerald-400/40 dark:bg-emerald-500/30 dark:text-emerald-200 dark:border-emerald-400/50' 
                                : 'bg-white/50 hover:bg-white/80 text-slate-800 border-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/60'
                        }`}
                    >
                        <RiRoadMapLine className="text-emerald-600 dark:text-emerald-400 text-sm shrink-0" />
                        <span className="hidden sm:inline">Recovery Plan</span>
                        <span className="sm:hidden text-[11px]">Recovery</span>
                    </Link>

                    {/* Module 6: Company Simulation Navigation Item */}
                    <Link 
                        to="/company-interview" 
                        aria-label="Company Simulation"
                        aria-current={isCompanyActive ? "page" : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs border ${
                            isCompanyActive 
                                ? 'bg-amber-400/30 text-amber-950 border-amber-400/70 shadow-sm ring-1 ring-amber-400/40 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/50' 
                                : 'bg-white/50 hover:bg-white/80 text-slate-800 border-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/60'
                        }`}
                    >
                        <RiBuilding4Line className="text-amber-600 dark:text-amber-400 text-sm shrink-0" />
                        <span className="hidden sm:inline">Company Prep</span>
                        <span className="sm:hidden text-[11px]">Company</span>
                    </Link>

                    {/* Module 7: AI ATS & Job Match Navigation Item */}
                    <Link 
                        to="/ats" 
                        aria-label="ATS Intelligence"
                        aria-current={isAtsActive ? "page" : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all shadow-xs border ${
                            isAtsActive 
                                ? 'bg-blue-400/30 text-blue-950 border-blue-400/70 shadow-sm ring-1 ring-blue-400/40 dark:bg-blue-400/20 dark:text-blue-300 dark:border-blue-400/50' 
                                : 'bg-white/50 hover:bg-white/80 text-slate-800 border-white/70 dark:bg-slate-800/60 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700/60'
                        }`}
                    >
                        <RiFileSearchLine className="text-blue-600 dark:text-blue-400 text-sm shrink-0" />
                        <span className="hidden sm:inline">ATS Intelligence</span>
                        <span className="sm:hidden text-[11px]">ATS</span>
                    </Link>
                </div>

                {/* User Actions & Theme Toggle */}
                <div className='flex items-center gap-2 md:gap-3'>
                    {/* Universal Theme Toggle */}
                    <ThemeToggle />

                    {userData ? (
                        <div className='flex items-center gap-2 md:bg-white/40 dark:md:bg-slate-800/50 md:p-1.5 md:pr-3 rounded-full md:border md:border-white/50 dark:md:border-slate-700/50 relative'>
                            
                            {/* Credits / Top-Up Section */}
                            <div className='relative'>
                                <motion.button
                                    onClick={() => {
                                        setShowCreditPopup(!showCreditPopup);
                                        setIsDropdownOpen(false);
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className='flex items-center gap-1.5 bg-[#F7D63A] hover:bg-[#ffe04d] px-3 md:px-4 py-2 rounded-full shadow-sm'
                                    aria-label="View practice credits"
                                >
                                    <RiCoinsLine className='text-[#8B7D10]' size={16} />
                                    <span className='text-xs font-black text-[#8B7D10]'>{userData.credits || 0}</span>
                                </motion.button>

                                <AnimatePresence>
                                    {showCreditPopup && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.9 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.9 }}
                                            className='absolute right-0 mt-4 w-64 md:w-72 bg-[#fdf8d7] dark:bg-slate-900 border border-yellow-200/50 dark:border-slate-800 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-2xl backdrop-blur-md z-[60]'
                                        >
                                            <div className='flex flex-col items-center text-center gap-3'>
                                                <RiFlashlightLine size={24} className="text-yellow-700 dark:text-yellow-400 p-3 bg-yellow-400/20 dark:bg-yellow-400/10 rounded-full w-10 h-10 md:w-12 md:h-12" />
                                                <h3 className='font-bold text-slate-800 dark:text-white text-sm md:text-base'>Fuel Your Practice</h3>
                                                <p className='text-[10px] md:text-xs text-slate-600 dark:text-slate-400 leading-relaxed'>
                                                    You have <span className='font-bold text-yellow-700 dark:text-yellow-400'>{userData.credits} credits</span>.
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        navigate('/pricing');
                                                        setShowCreditPopup(false);
                                                    }} 
                                                    className='w-full py-2.5 bg-yellow-400 text-slate-950 font-black rounded-xl md:rounded-2xl text-xs md:text-sm hover:bg-yellow-500 transition-colors cursor-pointer'
                                                >
                                                    Top Up
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Profile Dropdown */}
                            <div className='relative'>
                                <motion.button
                                    onClick={() => {
                                        setIsDropdownOpen(!isDropdownOpen);
                                        setShowCreditPopup(false);
                                    }}
                                    className='flex items-center gap-1 cursor-pointer bg-white/50 dark:bg-slate-800/80 p-1 rounded-full'
                                    aria-label="Open user menu"
                                    aria-expanded={isDropdownOpen}
                                >
                                    <div className='w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800 dark:bg-yellow-400/20 flex items-center justify-center border-2 border-white dark:border-slate-700 shadow-sm text-yellow-400 dark:text-yellow-300 font-black text-xs lg:text-sm'>
                                        {userData.name.charAt(0).toUpperCase()}
                                    </div>
                                    <RiArrowDownSLine className={`text-slate-500 dark:text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </motion.button>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                            className='absolute right-0 mt-4 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-3'
                                        >
                                            <div className='px-5 py-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl mb-1'>
                                                <p className='text-[10px] uppercase font-bold text-slate-400'>Identity</p>
                                                <p className='text-sm font-black text-slate-800 dark:text-white truncate'>{userData.name}</p>
                                            </div>
                                            <button 
                                                onClick={() => { navigate('/history'); setIsDropdownOpen(false); }} 
                                                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer'
                                            >
                                                <RiHistoryLine size={18} /> History
                                            </button>
                                            <button 
                                                onClick={() => { navigate('/history?type=cross'); setIsDropdownOpen(false); }} 
                                                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer'
                                            >
                                                <RiShieldFlashLine size={18} className="text-yellow-600 dark:text-yellow-400 shrink-0" /> Cross-Exam History
                                            </button>
                                            <button 
                                                onClick={() => { navigate('/ats/new'); setIsDropdownOpen(false); }} 
                                                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer'
                                            >
                                                <RiFileSearchLine size={18} className="text-blue-600 dark:text-blue-400 shrink-0" /> New ATS Match
                                            </button>
                                            <button 
                                                onClick={() => { navigate('/ats/history'); setIsDropdownOpen(false); }} 
                                                className='w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-slate-800 rounded-xl font-bold transition-all cursor-pointer'
                                            >
                                                <RiFileSearchLine size={18} className="text-blue-600 dark:text-blue-400 shrink-0" /> ATS Analyses History
                                            </button>
                                            <button 
                                                onClick={handleLogout} 
                                                className='w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl font-bold transition-all cursor-pointer'
                                            >
                                                <RiLogoutBoxRLine size={18} /> Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <motion.button
                            onClick={() => setShowAuth(true)}
                            whileTap={{ scale: 0.95 }}
                            className='bg-[#F7D63A] text-slate-950 px-6 py-2.5 rounded-full font-black text-sm shadow-md hover:bg-[#ffe04d] transition-colors cursor-pointer'
                        >
                            Get Started
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    );
}

export default Navbar;