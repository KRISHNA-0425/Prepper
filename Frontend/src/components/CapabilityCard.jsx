import React from 'react';
import { motion } from 'framer-motion';

/**
 * CapabilityCard — Premium minimalist landscape version
 */
function CapabilityCard({ image, title, desc, tag }) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            whileHover="hovered"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                hidden: { y: 30, opacity: 0, scale: 0.98 },
                visible: { 
                    y: 0, 
                    opacity: 1, 
                    scale: 1,
                    transition: { type: 'spring', stiffness: 90, damping: 20, mass: 0.8 } 
                },
                hovered: {
                    y: -8,
                    transition: { type: 'spring', stiffness: 400, damping: 25 }
                }
            }}
            className='group rounded-2xl relative bg-white/60 dark:bg-slate-900/70 backdrop-blur-xl border border-white/80 dark:border-slate-800 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex flex-col md:flex-row items-stretch h-full transition-all duration-500 hover:shadow-[0_30px_60px_rgba(15,23,42,0.12)] hover:border-yellow-500/40'
        >
            {/* ── Image panel ── */}
            <div className='relative md:w-[45%] h-48 md:h-auto overflow-hidden flex-shrink-0 bg-white/40 dark:bg-slate-800/40'>
                <motion.img
                    src={image}
                    alt={title}
                    variants={{ hovered: { scale: 1.05 } }}
                    transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
                    className='w-full h-full object-contain origin-center p-3'
                />

                {/* Floating tag */}
                {tag && (
                    <motion.span 
                        variants={{ hovered: { y: -2, scale: 1.05 } }}
                        className='absolute top-4 left-4 bg-gradient-to-r from-yellow-200 to-[#F7D63A] text-yellow-950 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(247,214,58,0.3)] z-10 border border-white/40'
                    >
                        {tag}
                    </motion.span>
                )}
            </div>

            {/* ── Content panel ── */}
            <div className='relative flex flex-col justify-center gap-2 p-5 md:p-8 md:w-[55%]'>
                {/* Subtle background glow on hover */}
                <motion.div
                    variants={{ hovered: { opacity: 1, scale: 1.1 } }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                    className='pointer-events-none absolute -inset-4 bg-gradient-to-br from-yellow-100/50 via-amber-50/30 to-transparent dark:from-yellow-500/10 dark:via-slate-800/20 blur-3xl -z-10'
                />

                <h3 className='font-black text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight'>
                    {title}
                </h3>
                <p className='text-xs md:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed'>
                    {desc}
                </p>
            </div>
        </motion.div>
    );
}

export default CapabilityCard;
