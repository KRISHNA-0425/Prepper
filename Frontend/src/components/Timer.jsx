import React from 'react';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import { motion } from 'framer-motion';
import 'react-circular-progressbar/dist/styles.css';
import { getTimerStatus, LOW_TIME_THRESHOLD } from '../utils/interviewTimer';

function Timer({ timeLeft, totalTime = 120 }) {
    const safeTotal = Math.max(1, totalTime);
    const clampedTime = Math.max(0, timeLeft);
    const percentage = Math.max(0, Math.min(100, (clampedTime / safeTotal) * 100));
    const status = getTimerStatus(clampedTime);

    // Dynamic color: Green/Yellow -> Amber -> Red (Expired)
    const getColor = () => {
        if (status === 'expired') return "#ef4444"; // Red-500
        if (status === 'low') return "#f59e0b";     // Amber-500
        return "#fbbf24";                          // Yellow-400
    };

    const isLowTime = status === 'low';
    const isExpired = status === 'expired';

    return (
        <div 
            className='flex flex-col items-center justify-center gap-1.5'
            role="timer"
            aria-label={isExpired ? "Question time expired" : `${clampedTime} seconds remaining for question`}
            aria-live="polite"
            aria-atomic="true"
        >
            <motion.div 
                animate={isLowTime ? { scale: [1, 1.06, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className='w-20 h-20 font-black' 
            >
                <CircularProgressbar
                    value={isExpired ? 100 : percentage}
                    text={isExpired ? '0s' : `${clampedTime}s`}
                    strokeWidth={10}
                    styles={buildStyles({
                        textSize: isExpired ? '28px' : '24px',
                        pathColor: getColor(),
                        textColor: getColor(),
                        trailColor: isExpired ? '#fee2e2' : 'rgba(255, 255, 255, 0.1)',
                        pathTransitionDuration: 0.5,
                        strokeLinecap: 'round',
                    })}
                />
            </motion.div>

            {isExpired ? (
                <span className='px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[9px] font-black uppercase tracking-wider text-red-400 animate-pulse'>
                    Time Expired
                </span>
            ) : isLowTime ? (
                <span className='px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider text-amber-400'>
                    Low Time
                </span>
            ) : (
                <span className='text-[9px] font-bold uppercase tracking-widest text-slate-400'>
                    Time Left
                </span>
            )}
        </div>
    );
}

export default Timer;
