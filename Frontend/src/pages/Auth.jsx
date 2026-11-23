import React from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../utils/firebase';
import axios from 'axios';
import { backendServerUrl } from '../App';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { useNavigate } from 'react-router-dom';

function Auth({ isModel = false }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleGoogleAuth = async () => {
        try {
            const response = await signInWithPopup(auth, provider);
            const user = response.user;
            const name = user.displayName;
            const email = user.email;

            const result = await axios.post(
                `${backendServerUrl}/api/auth/googleAuth`,
                { name, email },
                { withCredentials: true }
            );

            dispatch(setUserData(result.data.user));

            if (!isModel) {
                navigate('/');
            }
        } catch (error) {
            console.error('Google Auth Error:', error);
            dispatch(setUserData(null));
        }
    };

    return (
        <div className={`${isModel ? 'p-0' : 'min-h-screen py-16 px-4 sm:px-6'} bg-[#fbf9f4] dark:bg-slate-950 flex items-center justify-center overflow-hidden relative font-poppins transition-colors duration-200`}>
            {/* Ambient Background Elements */}
            {!isModel && (
                <>
                    <div className="absolute w-72 h-72 rounded-full bg-amber-200/30 dark:bg-yellow-500/10 blur-3xl -top-16 -left-16 pointer-events-none" />
                    <div className="absolute w-64 h-64 rounded-full bg-yellow-200/30 dark:bg-indigo-500/10 blur-3xl -bottom-12 -right-10 pointer-events-none" />
                </>
            )}

            {/* Form Card */}
            <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-10 relative z-10 shadow-xl transition-colors duration-200">
                {/* Logo Section */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <img 
                        src="/logo.svg" 
                        alt="Prepper Logo" 
                        className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(0,242,254,0.4)] hover:scale-110 transition-transform duration-300 cursor-pointer"
                    />
                    <span className="font-black text-2xl tracking-tighter text-slate-900 dark:text-white">
                        PREPPER
                    </span>
                </div>

                {/* Headline */}
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white text-center leading-snug mb-2">
                    Your AI companion
                    <br />
                    <span className="inline-flex items-center gap-2 bg-[#F7D63A] text-slate-950 rounded-full px-4 py-1 mt-2 text-xl sm:text-2xl font-black">
                        <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 15l-5 3.4 1.9-5.8L4 9.4h6.1z" />
                        </svg>
                        starts here
                    </span>
                </h2>

                {/* Subtitle */}
                <p className="text-center text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-8 mt-2">
                    Sign in to accelerate your career with AI-guided interview simulations.
                </p>

                {/* Google Button */}
                <button 
                    onClick={handleGoogleAuth} 
                    className="w-full h-12 flex items-center justify-center gap-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-yellow-400 dark:hover:border-yellow-400 active:scale-[0.98] transition-all duration-150 shadow-xs cursor-pointer select-none"
                >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Terms */}
                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6 leading-relaxed">
                    By continuing, you agree to our{' '}
                    <span className="underline cursor-pointer text-slate-700 dark:text-slate-300 font-medium">Terms of Service</span>
                    {' '}and{' '}
                    <span className="underline cursor-pointer text-slate-700 dark:text-slate-300 font-medium">Privacy Policy</span>
                </p>
            </div>
        </div>
    );
}

export default Auth;
