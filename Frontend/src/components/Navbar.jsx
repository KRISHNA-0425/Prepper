import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion, AnimatePresence } from 'framer-motion'
import { RiRobot3Line, RiCoinsLine, RiLogoutBoxRLine, RiArrowDownSLine, RiFlashlightLine, RiHistoryLine, RiMenu3Line, RiCloseLine } from "react-icons/ri";
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { backendServerUrl } from '../App';
import { setUserData } from '../redux/userSlice';
import AuthModel from './AuthModel';

function Navbar() {
    const { userData } = useSelector((state) => state.user);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [showCreditPopup, setShowCreditPopup] = useState(false)
    const [showAuth, setShowAuth] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const navLinks = [
        { name: 'Dashboard', href: '/dashboard' },
        { name: 'Mock Tests', href: '/tests' },
        { name: 'Resources', href: '/resources' }
    ];

    const handleLogout = async () => {
        try {
            await axios.get(`${backendServerUrl}/api/auth/logout`, { withCredentials: true });
            dispatch(setUserData(null));
            setIsDropdownOpen(false);
            setIsMobileMenuOpen(false);
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
                className='w-full max-w-6xl bg-white/30 backdrop-blur-xl rounded-2xl md:rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white/60 px-4 md:px-6 py-3 flex items-center justify-between relative'
            >
                {/* Logo Section */}
                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                    <motion.div whileHover={{ scale: 1.05 }} className='flex items-center gap-2 md:gap-3 cursor-pointer group'>
                        <div className='bg-[#F7D63A] p-2 md:p-2.5 rounded-xl md:rounded-2xl shadow-sm group-hover:rotate-12 transition-transform duration-300'>
                            <RiRobot3Line size={20} className="text-[#8B7D10] md:w-6 md:h-6" />
                        </div>
                        <h1 className='text-lg md:text-xl font-black text-slate-800 tracking-tighter'>PREPPER</h1>
                    </motion.div>
                </Link>

                {/* Desktop Nav Links */}
                <div className='hidden lg:flex items-center gap-1 bg-white/20 p-1 rounded-full border border-white/30'>
                    {navLinks.map((item) => (
                        <motion.button
                            key={item.name}
                            onClick={() => navigate(item.href)}
                            whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.5)" }}
                            className='px-5 py-2 rounded-full text-sm font-bold text-slate-700 transition-all'
                        >
                            {item.name}
                        </motion.button>
                    ))}
                </div>

                {/* User Actions & Hamburger */}
                <div className='flex items-center gap-2 md:gap-3'>
                    {userData ? (
                        <div className='flex items-center gap-2 md:bg-white/40 md:p-1.5 md:pr-3 rounded-full md:border md:border-white/50 relative'>
                            
                            {/* Credits - Hidden on very small screens, shown as icon only */}
                            <div className='relative'>
                                <motion.button
                                    onClick={() => {
                                        setShowCreditPopup(!showCreditPopup);
                                        setIsDropdownOpen(false);
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className='flex items-center gap-1.5 bg-[#F7D63A] hover:bg-[#ffe04d] px-3 md:px-4 py-2 rounded-full shadow-sm'
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
                                            className='absolute right-0 mt-4 w-64 md:w-72 bg-[#fdf8d7] border border-yellow-200/50 rounded-2xl md:rounded-[2rem] p-4 md:p-6 shadow-2xl backdrop-blur-md z-[60]'
                                        >
                                            <div className='flex flex-col items-center text-center gap-3'>
                                                <RiFlashlightLine size={24} className="text-yellow-700 p-3 bg-yellow-400/20 rounded-full w-10 h-10 md:w-12 md:h-12" />
                                                <h3 className='font-bold text-slate-800 text-sm md:text-base'>Fuel Your Practice</h3>
                                                <p className='text-[10px] md:text-xs text-slate-600 leading-relaxed'>
                                                    You have <span className='font-bold text-yellow-700'>{userData.credits} credits</span>.
                                                </p>
                                                <button onClick={() => navigate('/pricing')} className='w-full py-2.5 bg-yellow-400 text-white font-black rounded-xl md:rounded-2xl text-xs md:text-sm'>
                                                    Top Up
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Profile Dropdown - Desktop Only */}
                            <div className='hidden md:block relative'>
                                <motion.div
                                    onClick={() => {
                                        setIsDropdownOpen(!isDropdownOpen);
                                        setShowCreditPopup(false);
                                    }}
                                    className='flex items-center gap-1 cursor-pointer bg-white/50 p-1 rounded-full'
                                >
                                    <div className='w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-slate-800 flex items-center justify-center border-2 border-white shadow-sm text-yellow-400 font-black text-xs lg:text-sm'>
                                        {userData.name.charAt(0).toUpperCase()}
                                    </div>
                                    <RiArrowDownSLine className={`text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </motion.div>

                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.95 }}
                                            className='absolute right-0 mt-4 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3'
                                        >
                                            <div className='px-5 py-4 bg-slate-50 rounded-xl mb-1'>
                                                <p className='text-[10px] uppercase font-bold text-slate-400'>Identity</p>
                                                <p className='text-sm font-black text-slate-800 truncate'>{userData.name}</p>
                                            </div>
                                            <button onClick={() => {navigate('/history'); setIsDropdownOpen(false)}} className='w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-yellow-50 rounded-xl font-bold transition-all'>
                                                <RiHistoryLine size={18} /> History
                                            </button>
                                            <button onClick={handleLogout} className='w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl font-bold transition-all'>
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
                            className='hidden md:block bg-[#F7D63A] text-[#8B7D10] px-6 py-2.5 rounded-full font-black text-sm shadow-md'
                        >
                            Get Started
                        </motion.button>
                    )}

                    {/* Hamburger Menu Icon */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className='lg:hidden p-2 text-slate-800 bg-white/40 rounded-xl border border-white/50'
                    >
                        {isMobileMenuOpen ? <RiCloseLine size={24} /> : <RiMenu3Line size={24} />}
                    </button>
                </div>
            </motion.div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className='absolute top-24 left-4 right-4 bg-white/90 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl overflow-hidden lg:hidden'
                    >
                        <div className='p-6 flex flex-col gap-4'>
                            {navLinks.map((link) => (
                                <button 
                                    key={link.name}
                                    onClick={() => { navigate(link.href); setIsMobileMenuOpen(false); }}
                                    className='text-left text-lg font-black text-slate-800 py-2 border-b border-slate-100'
                                >
                                    {link.name}
                                </button>
                            ))}
                            
                            {userData ? (
                                <div className='flex flex-col gap-4 mt-2'>
                                    <button onClick={() => { navigate('/history'); setIsMobileMenuOpen(false); }} className='flex items-center gap-3 text-slate-700 font-bold'>
                                        <RiHistoryLine size={20} /> Interview History
                                    </button>
                                    <button onClick={handleLogout} className='flex items-center gap-3 text-red-500 font-bold'>
                                        <RiLogoutBoxRLine size={20} /> Logout
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => { setShowAuth(true); setIsMobileMenuOpen(false); }}
                                    className='w-full bg-[#F7D63A] text-[#8B7D10] py-4 rounded-2xl font-black text-center mt-2'
                                >
                                    Get Started
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {showAuth && <AuthModel onClose={() => setShowAuth(false)} />}
        </div>
    )
}

export default Navbar;