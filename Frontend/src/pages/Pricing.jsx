import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    HiOutlineArrowLeft,
    HiOutlineCheckCircle,
    HiSparkles,
    HiBolt,
    HiCircleStack
} from 'react-icons/hi2';

function Pricing() {
    const navigate = useNavigate();

    const containerVars = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const cardVars = {
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 80 } }
    };

    // INR Pricing Data (Psychological pricing: ₹399, ₹999, ₹3999)
    const tiers = [
        {
            id: 'refill',
            name: 'Quick Refill',
            icon: <HiBolt className="text-2xl text-slate-400" />,
            credits: 150,
            interviews: 3,
            price: 399, // ~ $4.80
            description: 'Perfect for a quick practice run before the big day.',
            features: [
                '150 Total Credits',
                'Valid for 3 Full Interviews',
                'Standard Performance Diagnostics',
                'Basic AI Voices'
            ],
            cta: 'Buy 150 Credits',
            isPopular: false
        },
        {
            id: 'arsenal',
            name: 'Arsenal Pack',
            icon: <HiSparkles className="text-2xl text-yellow-400" />,
            credits: 500,
            interviews: 10,
            price: 999, // ~ $12.00
            description: 'The ideal stack for active candidates applying to multiple roles.',
            features: [
                '500 Total Credits',
                'Valid for 10 Full Interviews',
                'Deep-Dive Analytics & History',
                'Premium Ultra-Realistic Voices',
                'Priority Processing Queue'
            ],
            cta: 'Buy 500 Credits',
            isPopular: true
        },
        {
            id: 'bulk',
            name: 'Command Center',
            icon: <HiCircleStack className="text-2xl text-emerald-400" />,
            credits: 2000,
            interviews: 40,
            price: 3499, // ~ $42.00
            description: 'Massive volume for serious preparers, bootcamps, or career coaches.',
            features: [
                '2,000 Total Credits',
                'Valid for 40 Full Interviews',
                'Export White-label PDF Reports',
                'Custom Job Role Targeting',
                'Lifetime Validity'
            ],
            cta: 'Buy 2000 Credits',
            isPopular: false
        }
    ];

    return (
        <div className='min-h-screen bg-slate-950 text-slate-200 font-poppins p-4 md:p-12 overflow-x-hidden relative'>
            <div className='max-w-7xl mx-auto relative z-10'>

                {/* Top Navigation */}
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ x: -5 }}
                    onClick={() => navigate(-1)}
                    className='flex items-center gap-2 text-slate-500 hover:text-yellow-400 transition-colors mb-12 group w-max'
                >
                    <HiOutlineArrowLeft className="text-lg group-hover:scale-110 transition-transform" />
                    <span className='text-[10px] font-black uppercase tracking-[0.2em]'>Return to Dashboard</span>
                </motion.button>

                {/* Header */}
                <div className='flex flex-col items-center text-center mb-16 space-y-6'>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <h1 className='text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-4'>
                            Recharge <span className='text-yellow-400'>Credits</span>
                        </h1>
                        <p className='text-slate-400 max-w-xl mx-auto text-sm md:text-base px-4'>
                            Flexible pay-as-you-go pricing. One standard AI interview consumes <strong>50 credits</strong>. No monthly subscriptions.
                        </p>
                    </motion.div>
                </div>

                {/* Pricing Cards Grid */}
                <motion.div
                    variants={containerVars}
                    initial="hidden"
                    animate="visible"
                    className='grid lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto'
                >
                    {tiers.map((tier) => (
                        <motion.div
                            key={tier.id}
                            variants={cardVars}
                            whileHover={{ y: -10 }}
                            className={`relative group bg-slate-900/40 backdrop-blur-xl border rounded-[2.5rem] p-8 flex flex-col h-full transition-all duration-500 ${tier.isPopular
                                    ? 'border-yellow-400/50 shadow-[0_20px_40px_rgba(251,191,36,0.05)] lg:-mt-8 lg:mb-8'
                                    : 'border-slate-800 hover:border-slate-600 hover:bg-slate-900/60'
                                }`}
                        >
                            {tier.isPopular && (
                                <div className='absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg shadow-yellow-400/20 z-20 flex items-center gap-1'>
                                    <HiSparkles className="text-sm" /> Recommended
                                </div>
                            )}

                            <div className='relative z-10 flex-1 flex flex-col'>
                                <div className='flex items-center justify-between mb-4'>
                                    <h3 className={`text-xl font-black uppercase tracking-tighter ${tier.isPopular ? 'text-white' : 'text-slate-300'}`}>
                                        {tier.name}
                                    </h3>
                                    <div className='w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center border border-white/5'>
                                        {tier.icon}
                                    </div>
                                </div>
                                <p className='text-slate-500 text-xs mb-6 min-h-[40px]'>
                                    {tier.description}
                                </p>

                                <div className='mb-8'>
                                    <div className='flex items-end gap-1 mb-2'>
                                        <span className='text-5xl font-black text-white tracking-tighter'>
                                            ₹{tier.price.toLocaleString('en-IN')}
                                        </span>
                                        <span className='text-slate-500 text-sm font-bold mb-1'>INR</span>
                                    </div>
                                    <div className='inline-flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10'>
                                        <span className='w-2 h-2 rounded-full bg-yellow-400 animate-pulse' />
                                        <p className='text-[10px] font-black text-slate-300 uppercase tracking-widest'>
                                            +{tier.credits} Credits Added
                                        </p>
                                    </div>
                                </div>

                                <ul className='space-y-4 mb-10 flex-1'>
                                    {tier.features.map((feat, idx) => (
                                        <li key={idx} className='flex items-start gap-3 text-sm text-slate-300'>
                                            <HiOutlineCheckCircle className={`shrink-0 text-lg ${tier.isPopular ? 'text-yellow-400' : 'text-emerald-400'}`} />
                                            <span>{feat}</span>
                                        </li>
                                    ))}
                                </ul>

                                <button className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 ${tier.isPopular
                                        ? 'bg-yellow-400 text-slate-950 hover:bg-yellow-300 hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:scale-[1.02]'
                                        : 'bg-slate-800 text-white hover:bg-slate-700 hover:scale-[1.02]'
                                    }`}>
                                    Buy {tier.credits} Credits
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[13vw] font-black text-white/[0.01] pointer-events-none select-none uppercase tracking-tighter z-0 w-full text-center'>
                CREDITS
            </div>
        </div>
    );
}

export default Pricing;