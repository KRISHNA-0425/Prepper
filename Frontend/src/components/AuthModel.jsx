import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaTimes } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import Auth from '../pages/Auth';

function AuthModel({ onClose }) {
    const { userData } = useSelector((state) => state.user);

    // Automatically close when user logs in
    useEffect(() => {
        if (userData) {
            onClose();
        }
    }, [userData, onClose]);

    return (
        <AnimatePresence>
            <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4'>
                {/* Modal Container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className='relative w-full max-w-md'
                >
                    {/* Close Button */}
                    <button 
                        onClick={onClose}
                        className='absolute top-5 right-5 z-[110] p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-200 transition-colors cursor-pointer select-none shadow-sm'
                        aria-label="Close login dialog"
                    >
                        <FaTimes size={16} />
                    </button>

                    {/* Auth Component Wrapper */}
                    <div className='overflow-hidden rounded-3xl shadow-2xl'>
                        <Auth isModel={true} />
                    </div>
                </motion.div>
                
                {/* Backdrop Click to Close */}
                <div 
                    className='absolute inset-0 -z-10' 
                    onClick={onClose} 
                />
            </div>
        </AnimatePresence>
    );
}

export default AuthModel;
