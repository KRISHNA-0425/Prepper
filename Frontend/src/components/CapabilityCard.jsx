import React from 'react'
import { motion } from 'framer-motion'

/**
 * CapabilityCard — Minimalist landscape version
 * Removed CTA links and floating arrows for a cleaner aesthetic.
 */
function CapabilityCard({ image, title, desc, tag }) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            whileHover="hovered"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
                hidden: { y: 24, opacity: 0 },
                visible: { 
                    y: 0, 
                    opacity: 1, 
                    transition: { type: 'spring', stiffness: 90, damping: 18 } 
                },
            }}
            className='group relative bg-white/35 backdrop-blur-lg rounded-[2.5rem] border border-white/55 overflow-hidden shadow-sm flex flex-col md:flex-row items-stretch h-full transition-shadow duration-500 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]  '
        >
            {/* ── Image panel ── */}
            <div className='relative md:w-[42%] h-52 md:h-auto overflow-hidden flex-shrink-0'>
                <motion.img
                    src={image}
                    alt={title}
                    variants={{ hovered: { scale: 1.08 } }}
                    transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className='w-full h-full object-cover'
                />

                {/* Gradient overlay */}
                <div className='absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/60 via-black/20 to-transparent' />

                {/* Optional floating tag */}
                {tag && (
                    <span className='absolute top-4 left-4 bg-[#F7D63A] text-[#7A6B0A] text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full shadow-md z-10'>
                        {tag}
                    </span>
                )}
            </div>

            {/* ── Content panel ── */}
            <div className='relative flex flex-col justify-center gap-3 p-8 md:p-10 md:w-[58%]'>

                {/* Subtle background glow on hover */}
                <motion.div
                    variants={{ hovered: { opacity: 1 } }}
                    initial={{ opacity: 0 }}
                    className='pointer-events-none absolute inset-0 bg-gradient-to-br from-[#F7D63A]/10 via-transparent to-transparent -z-10'
                />

                {/* Title */}
                <h4 className='font-extrabold text-[1.4rem] leading-tight text-slate-900 tracking-tight'>
                    {title}
                </h4>

                {/* Animated divider */}
                <motion.div
                    variants={{ 
                        hovered: { width: '4rem', backgroundColor: '#7A6B0A' } 
                    }}
                    initial={{ width: '2rem' }}
                    className='h-[3px] bg-slate-900 rounded-full opacity-60'
                />

                {/* Description */}
                <p className='text-sm md:text-base text-yellow-950/70 font-medium leading-relaxed'>
                    {desc}
                </p>
            </div>

            {/* Card border highlight on hover */}
            <motion.div
                variants={{ hovered: { opacity: 1 } }}
                initial={{ opacity: 0 }}
                className='pointer-events-none absolute inset-0 rounded-[2.5rem] ring-2 ring-inset ring-[#F7D63A]/30 z-20'
            />
        </motion.div>
    )
}

export default CapabilityCard;