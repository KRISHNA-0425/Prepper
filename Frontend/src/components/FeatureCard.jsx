import React from 'react'
import {motion} from 'framer-motion'

function FeatureCard({icon, desc, title, delay}) {
    return (
        <motion.div
            variants={{
                hidden: { y: 40, opacity: 0 },
                visible: { y: 0, opacity: 1 }
            }}
            whileHover={{
                y: -12,
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                transition: { duration: 0.3 }
            }}
            className='group bg-white/30 backdrop-blur-md p-10 rounded-[3rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)] relative overflow-hidden h-full flex flex-col'
        >
            {/* Hover Glow Effect */}
            <div className='absolute -inset-1 bg-gradient-to-br from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-2xl' />

            {/* Floating Icon Container */}
            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay * 1.5 }}
                className='bg-[#F7D63A] w-16 h-16 rounded-2xl flex items-center justify-center mb-8 text-yellow-950 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500'
            >
                {icon}
            </motion.div>

            <h3 className='font-black text-2xl text-slate-900 mb-4 tracking-tight leading-tight'>
                {title}
            </h3>

            <p className='text-sm md:text-base text-yellow-950/70 font-medium leading-relaxed mb-6 flex-grow'>
                {desc}
            </p>

            {/* Hover Accent Progress Bar */}
            <div className='h-1.5 w-full bg-slate-900/5 absolute bottom-0 left-0 overflow-hidden'>
                <motion.div
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.4 }}
                    className='h-full w-full bg-slate-900'
                />
            </div>
        </motion.div>
    )
}

export default FeatureCard
