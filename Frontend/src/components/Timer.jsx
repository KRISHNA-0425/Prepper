import React from 'react';
import { buildStyles, CircularProgressbar } from 'react-circular-progressbar';
import { motion } from 'framer-motion';
import 'react-circular-progressbar/dist/styles.css';

function Timer({ timeLeft, totalTime }) {
    const percentage = (timeLeft / totalTime) * 100;

    // Dynamic color: Greenish -> Yellow -> Red
    const getColor = () => {
        if (percentage > 50) return "#fbbf24"; // Yellow-400
        if (percentage > 20) return "#f59e0b"; // Amber-500
        return "#ef4444"; // Red-500
    };

    return (
        <motion.div 
            // Simple pulse effect when time is running low
            animate={timeLeft <= 10 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className='w-20 h-20 font-black' 
        >
            <CircularProgressbar
                value={percentage}
                text={`${timeLeft}s`}
                strokeWidth={10}
                styles={buildStyles({
                    textSize: '24px',
                    pathColor: getColor(),
                    textColor: '#F59E0B', // Slate-800 to match your UI
                    trailColor: '#e2e8f0', // Slate-200
                    pathTransitionDuration: 1, // Smooth sweep
                    strokeLinecap: 'round',
                })}
            />
        </motion.div>
    );
}

export default Timer;