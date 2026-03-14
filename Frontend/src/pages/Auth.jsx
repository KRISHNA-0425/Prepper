import React from 'react'

function Auth() {
    return (
        <div className="min-h-screen bg-[#F5EC5A] flex items-center justify-center px-6 py-20 overflow-hidden relative">

            {/* Background blobs */}
            <div className="absolute w-72 h-72 rounded-full bg-[#F9F37A] -top-16 -left-16 animate-pulse" />
            <div className="absolute w-48 h-48 rounded-full bg-[#F9F37A] -bottom-12 -right-10 animate-pulse delay-700" />
            <div className="absolute w-36 h-36 rounded-full bg-[#F9F37A] top-1/2 right-[10%] animate-pulse delay-1000" />

            {/* Card */}
            <div className="w-full max-w-md bg-[#FFFDE7] border border-[#F9F046] rounded-3xl p-10 relative z-10 shadow-xl animate-[cardIn_0.6s_cubic-bezier(0.34,1.56,0.64,1)_both]">

                {/* Logo row */}
                <div className="flex items-center justify-center gap-3 mb-7">
                    <div className="bg-[#F5EC5A] rounded-xl p-2 flex items-center justify-center hover:rotate-[-10deg] hover:scale-110 transition-transform duration-300 cursor-pointer">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#1a1a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            <circle cx="12" cy="16" r="1" fill="#1a1a00" />
                        </svg>
                    </div>
                    <span className="font-extrabold text-2xl tracking-widest text-[#1a1a00]">
                        PEPPER
                    </span>
                </div>

                {/* Headline */}
                <h2 className="text-3xl font-bold text-[#1a1a00] text-center leading-snug mb-2">
                    Your AI companion
                    <br />
                    <span className="inline-flex items-center gap-2 bg-[#F5EC5A] rounded-full px-4 py-1 mt-2 text-2xl">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="#1a1a00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 15l-5 3.4 1.9-5.8L4 9.4h6.1z" />
                        </svg>
                        starts here
                    </span>
                </h2>

                {/* Subtitle */}
                <p className="text-center text-[#5a5500] text-sm mb-8">
                    Sign in to continue with Pepper
                </p>

                {/* Google Button */}
                <button className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-2xl border-[1.5px] border-[#e8df00] bg-white text-[#1a1a00] font-medium text-base hover:bg-[#F5EC5A] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95 transition-all duration-200">
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continue with Google
                </button>

                {/* Divider */}
                {/* <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-[#e8df00]" />
                    <span className="text-xs text-[#8a8000]">or</span>
                    <div className="flex-1 h-px bg-[#e8df00]" />
                </div> */}

                {/* Email Button
                <button className="w-full py-3 rounded-2xl border-[1.5px] border-[#e8df00] bg-transparent text-[#1a1a00] font-medium text-sm hover:bg-[#F5EC5A] hover:-translate-y-0.5 hover:scale-[1.01] active:scale-95 transition-all duration-200">
                    Continue with email
                </button> */}

                {/* Terms */}
                <p className="text-center text-xs text-[#8a8000] mt-6 leading-relaxed">
                    By continuing, you agree to our{' '}
                    <span className="underline cursor-pointer text-[#5a5500]">Terms of Service</span>
                    {' '}and{' '}
                    <span className="underline cursor-pointer text-[#5a5500]">Privacy Policy</span>
                </p>

                

            </div>

            {/* Card entrance animation */}
            <style>{`
                @keyframes cardIn {
                    from { opacity: 0; transform: translateY(40px) scale(0.95); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

        </div>
    )
}

export default Auth