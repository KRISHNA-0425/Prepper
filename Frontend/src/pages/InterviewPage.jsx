import React, { useState } from 'react';
import Step2Interview from './Step2Interview';
import Step3Report from './Step3Report';
import Step1Setup from './Step1Setup'
import { motion } from 'framer-motion'


function InterviewPage() {
    const [step, setStep] = useState(1);
    const [interviewData, setInterviewData] = useState(null);
    const [finalReport, setFinalReport] = useState(null);

    // Called when Step 1 (Setup) is done
    const handleStartInterview = (data) => {
        setInterviewData(data);
        setStep(2);
    };

    // Called when Step 2 (Interview) is finished
    const handleInterviewFinished = (reportData) => {
        console.log("PARENT RECEIVED DATA:", reportData);
        setFinalReport(reportData);
        setStep(3); // Move to Step 3
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {step === 1 && (
                <Step1Setup onStart={handleStartInterview} />
            )}

            {step === 2 && interviewData && (
                <Step2Interview
                    interviewData={interviewData}
                    onFinish={handleInterviewFinished}
                />
            )}

            {step === 3 && finalReport && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <Step3Report report={finalReport} />
                </motion.div>
            )}
        </div>
    );
}

export default InterviewPage;