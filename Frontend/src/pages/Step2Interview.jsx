import React, { useEffect, useState, useRef } from 'react'
import Timer from '../components/Timer';
import { motion, AnimatePresence } from 'framer-motion';
import { HiMicrophone, HiCheckBadge, HiArrowRight } from "react-icons/hi2";
import toast from 'react-hot-toast';

function Step2Interview({ interviewData, onFinish }) {
    const femaleVoiceRef = useRef(null);
    const videoRef = useRef(null);
    const recognitionRef = useRef(null);

    const { interviewId, questions, userName, mode } = interviewData;

    const [isMicOn, setIsMicOn] = useState(false);
    const [isAIPlaying, setIsAIPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit || 60);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentQuestion = questions[currentIndex];

    // 1. Load Voice
    useEffect(() => {
        const loadVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            const targetVoice = voices.find(v =>
                v.name.toLowerCase().includes('google us english') || 
                v.name.toLowerCase().includes('zira') ||
                v.name.toLowerCase().includes('samantha') ||
                (v.name.toLowerCase().includes('female') && v.lang.includes('en'))
            ) || voices.find(v => v.lang.includes('en'));

            femaleVoiceRef.current = targetVoice;
        };

        loadVoice();
        window.speechSynthesis.onvoiceschanged = loadVoice;
        return () => window.speechSynthesis.cancel();
    }, []);

    // 2. Speak Logic with Video Control
    const speak = (text) => {
        return new Promise((resolve) => {
            if (!window.speechSynthesis) {
                resolve();
                return;
            }

            window.speechSynthesis.cancel();
            const humanText = text.replace(/,/g, ", ...").replace(/\./g, ", ...");
            const utterance = new SpeechSynthesisUtterance(humanText);

            if (femaleVoiceRef.current) utterance.voice = femaleVoiceRef.current;
            utterance.rate = 0.9;

            utterance.onstart = () => {
                setIsAIPlaying(true);
                if (videoRef.current) videoRef.current.play();
            };

            utterance.onend = () => {
                setIsAIPlaying(false);
                if (videoRef.current) {
                    videoRef.current.pause();
                    videoRef.current.currentTime = 0; 
                }
                resolve();
            };

            window.speechSynthesis.speak(utterance);
        });
    };

    // 3. Speech to Text (Mic Logic)
    const startMic = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return toast.error("Browser doesn't support Speech Recognition");

        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            setAnswer(transcript);
        };

        recognitionRef.current.start();
        setIsMicOn(true);
    };

    const stopMic = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsMicOn(false);
        }
    };

    // 4. Workflow Effect (Speak then start Mic)
    useEffect(() => {
        if (femaleVoiceRef.current) {
            const runSequence = async () => {
                if (currentIndex === 0) {
                    await speak(`Hello ${userName || 'Candidate'}. I am your AI interviewer. Let's begin.`);
                }
                await speak(currentQuestion?.question);
                startMic(); // Automatically start recording after AI stops
            };
            runSequence();
        }
    }, [currentIndex, femaleVoiceRef.current]);

    // 5. Timer Logic
    useEffect(() => {
        if (timeLeft <= 0 || isAIPlaying) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isAIPlaying]);

    return (
        <div className='h-screen w-full bg-[#F5EC5A] flex items-center justify-center p-4 md:p-6 font-poppins overflow-hidden'>
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className='w-full max-w-7xl h-[85vh] bg-white/80 backdrop-blur-xl rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] border border-white flex flex-col lg:flex-row overflow-hidden'
            >
                {/* Left Column: AI Monitor */}
                <div className='w-full lg:w-[30%] bg-slate-900 flex flex-col items-center p-6 space-y-4 relative shrink-0' >
                    <div className='absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-yellow-400/10 blur-3xl pointer-events-none' />

                    <motion.div className='w-full aspect-video lg:aspect-square rounded-l-4xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-800 relative z-10'>
                        <video
                            ref={videoRef}
                            src='https://res.cloudinary.com/dflf8j84g/video/upload/v1774549693/AI_asking_questions_202603262250_fgjdiw.mp4'
                            muted playsInline
                            className={`w-full h-full object-cover transition-opacity duration-500 ${isAIPlaying ? 'opacity-100' : 'opacity-60'}`}
                        />
                        <div className='absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded-full'>
                            <div className={`w-1.5 h-1.5 rounded-full ${isAIPlaying ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className='text-[8px] font-bold text-white uppercase tracking-widest'>{isAIPlaying ? 'AI Speaking' : 'Listening'}</span>
                        </div>
                    </motion.div>

                    <div className='w-full flex-1 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-5 flex flex-col justify-between relative z-10' >
                        <div className='space-y-3'>
                            <div className='flex justify-between items-center' >
                                <span className='text-[9px] uppercase tracking-[0.2em] font-black text-slate-400'>Status</span>
                                <span className='text-[10px] font-black text-yellow-400 uppercase flex items-center gap-2'>
                                    <span className='w-1 h-1 bg-yellow-400 rounded-full animate-ping' />
                                    AI Active
                                </span>
                            </div>
                            <div className='h-px bg-white/10' />
                        </div>

                        <div className='flex justify-center py-2' >
                            <Timer timeLeft={timeLeft} totalTime={currentQuestion?.timeLimit || 60} />
                        </div>

                        <div className='grid grid-cols-2 gap-3' >
                            <div className='bg-white/5 rounded-xl p-2 text-center'>
                                <p className='text-lg font-black text-white'>{currentIndex + 1}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-500'>Current</p>
                            </div>
                            <div className='bg-white/5 rounded-xl p-2 text-center'>
                                <p className='text-lg font-black text-slate-400'>{questions?.length}</p>
                                <p className='text-[8px] uppercase font-bold text-slate-500'>Total</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Interaction Hub */}
                <div className='flex-1 flex flex-col p-6 md:p-10 bg-white relative overflow-hidden' >
                    <div className='mb-4 shrink-0'>
                        <div className='inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-yellow-400 rounded-lg text-[9px] font-black uppercase tracking-widest mb-2'>
                            <HiCheckBadge /> {mode} Assessment
                        </div>
                        <h1 className='text-2xl font-black text-slate-900 tracking-tighter uppercase'>AI Smart Interview</h1>
                    </div>

                    <div className='mb-4 shrink-0'>
                        <p className='text-slate-400 font-bold text-[9px] uppercase tracking-widest mb-1'>Question {currentIndex + 1} of {questions.length} </p>
                        <div className='text-lg md:text-xl font-bold text-slate-800 leading-tight border-l-4 border-yellow-400 pl-4'>
                            {currentQuestion?.question}
                        </div>
                    </div>

                    <div className='flex-1 flex flex-col min-h-0'>
                        <div className='relative flex-1 min-h-0'>
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder='Type or speak your response here...'
                                className='w-full h-full bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 outline-none focus:border-yellow-400 focus:bg-white transition-all text-slate-700 font-medium placeholder:text-slate-300 resize-none shadow-inner'
                            />
                            {isMicOn && (
                                <div className='absolute top-4 right-6 flex items-center gap-2'>
                                    <span className='w-2 h-2 bg-red-500 rounded-full animate-ping' />
                                    <span className='text-[8px] font-black text-red-500 uppercase tracking-widest'>Recording</span>
                                </div>
                            )}
                        </div>

                        <div className='flex items-center gap-3 mt-4 shrink-0' >
                            <motion.button
                                onClick={isMicOn ? stopMic : startMic}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`w-14 h-14 flex items-center justify-center rounded-2xl shadow-lg shrink-0 transition-colors ${isMicOn ? 'bg-red-500 text-white' : 'bg-slate-900 text-yellow-400'}`}
                            >
                                <HiMicrophone size={22} className={isMicOn ? 'animate-pulse' : ''} />
                            </motion.button>

                            <motion.button
                                whileHover={{ x: 5 }}
                                whileTap={{ scale: 0.98 }}
                                className='flex-1 bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 shadow-xl hover:shadow-yellow-400/20 transition-all'
                            >
                                Submit Answer
                                <HiArrowRight size={16} className='text-yellow-400' />
                            </motion.button>
                        </div>
                    </div>

                    <div className='absolute -bottom-6 -right-6 text-[80px] font-black text-slate-50 pointer-events-none select-none z-[-1] uppercase text-opacity-10'>
                        Prepper
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export default Step2Interview;