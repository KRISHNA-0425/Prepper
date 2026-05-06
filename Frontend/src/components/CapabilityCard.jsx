import React from 'react'
import { motion } from 'framer-motion'

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
            className='group rounded-2xl  relative bg-white/60 backdrop-blur-xl border border-white/80 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-stretch h-full transition-all duration-500 hover:shadow-[0_30px_60px_rgba(15,23,42,0.12)] hover:border-yellow-500/30'
        >
            {/* ── Image panel ── */}
            <div className='relative md:w-[45%] h-48 md:h-auto overflow-hidden flex-shrink-0 bg-white/40'>
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
                        className='absolute top-4 left-4 bg-gradient-to-r from-yellow-200 to-[#F7D63A] text-yellow-900 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full shadow-[0_4px_12px_rgba(247,214,58,0.3)] z-10 border border-white/40'
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
                    className='pointer-events-none absolute -inset-4 bg-gradient-to-br from-yellow-100/50 via-amber-50/30 to-transparent blur-3xl -z-10'
                />

                {/* Title */}
                <motion.h4 
                    variants={{ hovered: { x: 4 } }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className='font-extrabold text-xl md:text-2xl leading-tight text-slate-900 tracking-tight'
                >
                    {title}
                </motion.h4>

                {/* Animated divider */}
                <motion.div
                    variants={{ 
                        hovered: { width: '4rem', backgroundImage: 'linear-gradient(to right, #eab308, #ca8a04)' } 
                    }}
                    initial={{ width: '2rem', backgroundImage: 'linear-gradient(to right, #94a3b8, #94a3b8)' }}
                    className='h-1 my-1'
                />

                {/* Description */}
                <p className='text-sm md:text-base text-slate-600 font-medium leading-relaxed group-hover:text-slate-800 transition-colors duration-300'>
                    {desc}
                </p>
                
                {/* Decorative Arrow Icon Elements */}
                {/* <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-500 ease-out">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-100 to-yellow-50 border border-yellow-200 text-yellow-700 flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div> */}
            </div>

            {/* Card border highlight on hover */}
            <motion.div
                variants={{ hovered: { opacity: 1 } }}
                initial={{ opacity: 0 }}
                className='pointer-events-none absolute inset-0 ring-2 ring-inset ring-yellow-400/30 z-20'
            />
        </motion.div>
    )
}

export default CapabilityCard;
