import React from 'react';
import { motion } from 'framer-motion';

function ModeCard({ icon, title, desc, color }) {
    return (
        <motion.div
            variants={{
                hidden: { scale: 0.9, opacity: 0 },
                visible: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
            }}
            whileHover={{ y: -10 }}
            className='group relative bg-white/45 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/60 dark:border-slate-800 shadow-lg overflow-hidden transition-colors duration-200'
        >
            <div className={`absolute -top-10 -right-10 w-32 h-32 ${color} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity`} />

            <div className={`w-16 h-16 ${color} text-slate-950 rounded-2xl flex items-center justify-center text-3xl shadow-lg mb-6 group-hover:rotate-12 transition-transform duration-500`}>
                {icon}
            </div>

            <h3 className='font-black text-2xl text-slate-900 dark:text-white mb-3 tracking-tight'>
                {title}
            </h3>

            <p className='text-sm md:text-base text-yellow-950/70 dark:text-slate-300 font-medium leading-relaxed'>
                {desc}
            </p>

            <div className='mt-8 flex items-center gap-2'>
                <div className={`h-2 w-2 rounded-full ${color} animate-pulse`} />
                <span className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Mode Active</span>
            </div>
        </motion.div>
    );
}

export default ModeCard;
