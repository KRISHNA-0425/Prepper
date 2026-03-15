import React from 'react'
import Navbar from '../components/Navbar'
import { motion } from 'framer-motion'

function Home() {
    return (
        <div className='min-h-screen bg-[#F5EC5A] flex flex-col relative overflow-hidden'>
            {/* Background Decoration */}
            <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-white/20 rounded-full blur-3xl pointer-events-none" />
            
            <Navbar />

            {/* Hero Section Placeholder */}
            <main className='flex-1 flex flex-col items-center justify-center px-6 text-center z-10'>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <h1 className='text-5xl md:text-7xl font-extrabold text-slate-900 mb-6'>
                        Practice makes <br/>
                        <span className='text-[#8B7D10] italic'>Permanent.</span>
                    </h1>
                    <p className='text-lg text-slate-700 max-w-2xl mx-auto mb-10'>
                        The AI interviewer that listens, evaluates, and helps you land the job you actually want.
                    </p>
                </motion.div>
            </main>
        </div>
    )
}

export default Home