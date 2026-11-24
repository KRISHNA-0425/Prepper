import React from 'react';
import { motion } from 'framer-motion';

function FeatureCard({ icon, desc, title }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className='group bg-white/40 dark:bg-slate-900/60 backdrop-blur-md p-8 sm:p-10 rounded-[3rem] border border-white/70 dark:border-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden h-full flex flex-col transition-all duration-200'
        >
            {/* Hover Glow Effect */}
            <div className='absolute -inset-1 bg-gradient-to-br from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-2xl' />

            {/* Icon Container */}
            <div className='bg-[#F7D63A] w-16 h-16 rounded-2xl flex items-center justify-center mb-8 text-slate-950 shadow-inner group-hover:scale-105 transition-transform duration-300 shrink-0'>
                {icon}
            </div>

            <h3 className='font-black text-2xl text-slate-900 dark:text-white mb-4 tracking-tight leading-tight'>
                {title}
            </h3>

            <p className='text-sm md:text-base text-yellow-950/70 dark:text-slate-300 font-medium leading-relaxed mb-6 flex-grow'>
                {desc}
            </p>

            {/* Hover Accent Progress Bar */}
            <div className='h-1.5 w-full bg-slate-900/5 dark:bg-white/5 absolute bottom-0 left-0 overflow-hidden'>
                <div className='h-full w-full bg-[#F7D63A]' />
            </div>
        </motion.div>
    );
}

export default FeatureCard;
