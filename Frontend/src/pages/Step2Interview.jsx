
// work flow

// 1.mount

// 2.Load voice

// 3.Question Speak

// 4.Mic On

// 5.Timmer running

// 6.Submit

// 7.Feedback Speak

// 8.Next Question

// 9.Repeat

// 10.Finish

import React from 'react'
import AIVideo from '/AI_asking_questions_202603262250.mp4';
import Timer from '../components/Timer';



function Step2Interview({ interviewData, onFinish }) {

    // const { interviewId, questions, userName } = interviewData;



    return (
        <div className='min-h-sreen bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300 flex items-center justify-center p-4 sm:p-6' >
            {/* left side */}
            <div className='w-full max-w-350 min-h-[80vh] bg-yellow-100 rounded-3xl shadow-2xl border border-gray flex flex-col lg:flex-row overflow-hidden' >
                {/* video section */}

                <div className='w-full lg:w-[35%] bg-yellow-100 flex flex-col items-center p-6 space-y-6 border-r ' >
                    <div className='w-full max-w-md rounded-2xl overflow-hidden shadow-xl ' >
                        <video src={AIVideo}
                            muted
                            playsInline
                            preload='auto'
                            className='w-full h-auto object-cover'
                        />

                    </div>

                    {/* subtitle */}

                    {/* timmer */}

                    <div className='w-full max-w-md rounded-2xl shadow-md p-6 space-y-5 ' >
                        <div className=' flex justify-between items-center ' >
                            <span className=' text-sm text-zinc-700 ' >
                                Interview Status
                            </span>

                            <span className='text-sm font-semibold text-yellow-500 ' >
                                AI Speaking
                            </span>

                        </div>
                        <div className=' h-px bg-yellow-300  ' ></div>

                        <div className='flex justify-center ' >
                            <Timer timeLeft='30' totalTime='60' />
                        </div>

                        <div className=' h-px bg-yellow-300  ' ></div>

                        <div className='grid grid-cols-2 gap-6 text-center' >
                            <div>
                                <span className='text-2xl text-yellow-500' >1</span>
                                <span className='text-xs text-zinc-700' >current question</span>
                            </div>
                            <div>
                                <span className='text-2xl text-yellow-500' >5</span>
                                <span className='text-xs text-zinc-700'>total question</span>
                            </div>

                        </div>

                    </div>

                </div>
            </div>
        </div>
    )
}

export default Step2Interview
