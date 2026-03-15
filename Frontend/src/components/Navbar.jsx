import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { RiRobot3Line, RiCoinsLine, RiLogoutBoxRLine, RiArrowDownSLine, RiFlashlightLine } from "react-icons/ri";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';

function Navbar() {
    const { userData } = useSelector((state) => state.user);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCreditPopup, setShowCreditPopup] = useState(false)
    const navigate = useNavigate();

    const dispatch = useDispatch()

    const handleLogout = async () => {
        try {
            await axios.get(`${backendServerUrl}/api/auth/logout`, { withCredentials: true });
            dispatch(setUserData(null))
            window.location.reload();
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className='w-full flex items-center justify-center px-4 pt-6 font-poppins relative z-50'>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
                className='w-full max-w-6xl bg-white/30 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/60 px-6 py-3 flex items-center justify-between relative'
            >
                {/* Logo Section */}
                <Link to="/">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className='flex items-center gap-3 cursor-pointer group'
                    >
                        <div className='bg-[#F7D63A] p-2.5 rounded-2xl shadow-sm group-hover:rotate-12 transition-transform duration-300'>
                            <RiRobot3Line size={24} className="text-[#8B7D10]" />
                        </div>
                        <h1 className='text-xl font-black text-slate-800 tracking-tighter'>
                            PREPPER
                        </h1>
                    </motion.div>
                </Link>

                {/* Navigation Links */}
                <div className='hidden md:flex items-center gap-1 bg-white/20 p-1 rounded-full border border-white/30'>
                    {['Dashboard', 'Mock Tests', 'Resources'].map((item) => (
                        <motion.a
                            key={item}
                            href={`#${item.toLowerCase().replace(' ', '-')}`}
                            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
                            className='px-5 py-2 rounded-full text-sm font-bold text-slate-700 transition-all'
                        >
                            {item}
                        </motion.a>
                    ))}
                </div>

                {/* User Section */}
                <div className='flex items-center gap-3'>
                    {userData ? (
                        <div className='flex items-center gap-2 bg-white/40 p-1.5 pr-3 rounded-full border border-white/50 relative shadow-sm'>

                            {/* Credits Badge */}
                            <div className='relative'>
                                <motion.button
                                    onClick={() => {
                                        setShowCreditPopup(!showCreditPopup);
                                        setIsDropdownOpen(false);
                                    }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className='flex items-center gap-1.5 bg-[#F7D63A] hover:bg-[#ffe04d] px-4 py-2 rounded-full shadow-sm transition-colors'
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
                                            className='absolute right-0 mt-4 w-72 bg-[#fdf8d7] border border-yellow-200/50 rounded-[2rem] p-6 shadow-2xl backdrop-blur-md'
                                        >
                                            <div className='flex flex-col items-center text-center gap-3'>
                                                <div className='p-3 bg-yellow-400/20 rounded-full'>
                                                    <RiFlashlightLine size={24} className="text-yellow-700" />
                                                </div>
                                                <h3 className='font-bold text-slate-800'>Fuel Your Practice</h3>
                                                <p className='text-xs text-slate-600 leading-relaxed'>
                                                    You currently have <span className='font-bold text-yellow-700'>{userData.credits} credits</span> left. Each interview takes 5 credits.
                                                </p>
                                                <button
                                                    onClick={() => navigate('/pricing')}
                                                    className='w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-white font-black rounded-2xl text-sm transition-all shadow-md active:scale-95'
                                                >
                                                    Top Up Now
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Profile Dropdown */}
                            {/* Profile Dropdown */}
                            <div className='relative'>
                                <motion.div
                                    onClick={() => {
                                        setIsDropdownOpen(!isDropdownOpen);
                                        setShowCreditPopup(false);
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    className='flex items-center gap-1 cursor-pointer bg-white/50 p-1 rounded-full'
                                >
                                    <div className='w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border-2 border-white shadow-sm text-yellow-400 font-black text-sm'>
                                        {userData.name.charAt(0).toUpperCase()}
                                    </div>
                                    <RiArrowDownSLine className={`text-slate-500 transition-transform duration-500 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </motion.div>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                            className='absolute right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-2 overflow-hidden'
                                        >
                                            {/* Identity Header */}
                                            <div className='px-5 py-4 bg-slate-50 rounded-[1.5rem] mb-1'>
                                                <p className='text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1'>Identity</p>
                                                <p className='text-sm font-black text-slate-800 truncate'>{userData.name}</p>
                                            </div>

                                            {/* History Link */}
                                            <button
                                                onClick={() => {
                                                    navigate('/history');
                                                    setIsDropdownOpen(false);
                                                }}
                                                className='w-full flex items-center gap-3 px-5 py-3 text-sm text-slate-600 hover:bg-yellow-50 hover:text-yellow-700 rounded-xl transition-all font-bold group'
                                            >
                                                <div className='p-1.5 bg-slate-100 group-hover:bg-yellow-100 rounded-lg transition-colors'>
                                                    <RiFlashlightLine size={16} /> {/* Or RiHistoryLine if you import it */}
                                                </div>
                                                Interview History
                                            </button>

                                            {/* Divider */}
                                            <div className='h-px bg-slate-50 mx-4 my-1' />

                                            {/* Logout Button */}
                                            <button
                                                onClick={handleLogout}
                                                className='w-full flex items-center gap-3 px-5 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold group'
                                            >
                                                <div className='p-1.5 bg-red-50 rounded-lg'>
                                                    <RiLogoutBoxRLine size={16} className="group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                                Logout
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    ) : (
                        <Link to="/auth">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className='bg-[#F7D63A] text-[#8B7D10] px-8 py-3 rounded-full font-black text-sm shadow-[0_10px_20px_rgba(247,214,58,0.3)] hover:bg-[#ffe252] transition-all'
                            >
                                Get Started
                            </motion.button>
                        </Link>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export default Navbar;