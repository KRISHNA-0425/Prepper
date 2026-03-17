import React, { useState } from 'react'
import Step1Setup from './Step1Setup'
import Step2Interview from './Step2Interview'
import Step3Report from './Step3Report'

function InterviewPage() {

    const [step, setStep] = useState(1)
    const [interviewData, setInterviewData] = useState(null)


    return (
        <div className='min-h-screen bg-[#F5EC5A] ' >
            {step === 1 && (<Step1Setup onStart={(data) => { setInterviewData(data); setStep(2) }} />)}
            {step === 2 && (<Step2Interview interviewData={interviewData} onFinish={(report) => { setInterviewData(report); setStep(2) }} />)}
            {step === 3 && <Step3Report report={interviewData} />}
        </div>
    )
}

export default InterviewPage
