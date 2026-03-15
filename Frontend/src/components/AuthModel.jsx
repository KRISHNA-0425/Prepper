import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from 'framer-motion';
import Auth from '../pages/Auth';

function AuthModel({ onClose }) {
    const { userData } = useSelector((state) => state.user)

    // Automatically close when user logs in
    useEffect(() => {
        if (userData) {
            onClose() // if user exists close the model
        }
    }, [userData, onClose])

    return (
        <AnimatePresence>
            <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-4'>
                {/* Modal Container */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className='relative w-full max-w-md'
                >
                    {/* Close Button */}
                    <button 
                        onClick={onClose} // Fixed typo: was onclose
                        className='absolute top-6 right-6 z-[110] p-2 bg-white/10 hover:bg-white/20 rounded-full text-slate-800 transition-colors'
                    >
                        <FaTimes size={20} />
                    </button>

                    {/* Auth Component Wrapper */}
                    <div className='overflow-hidden rounded-[2.5rem] shadow-2xl'>
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
    )
}

export default AuthModel