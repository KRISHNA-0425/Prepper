import React, { useState, useEffect } from 'react';
import Step2Interview from './Step2Interview';
import Step3Report from './Step3Report';
import Step1Setup from './Step1Setup';
import { motion } from 'framer-motion';
import axios from 'axios';
import { backendServerUrl } from '../App';

function InterviewPage() {
    const [step, setStep] = useState(1);
    const [interviewData, setInterviewData] = useState(null);
    const [finalReport, setFinalReport] = useState(null);

    // Rehydrate active interview session on refresh if available
    useEffect(() => {
        const activeId = sessionStorage.getItem('activeInterviewId');
        if (activeId && !interviewData && step === 1) {
            axios.get(`${backendServerUrl}/api/interview/session/${activeId}`, { withCredentials: true })
                .then(res => {
                    const isExpired = Boolean(res.data?.expiresAt && new Date(res.data.expiresAt).getTime() <= Date.now());
                    if (res.data && res.data.status !== 'Completed' && !isExpired && !res.data.isSessionExpired) {
                        setInterviewData(res.data);
                        setStep(2);
                    } else {
                        sessionStorage.removeItem('activeInterviewId');
                    }
                })
                .catch(() => {
                    sessionStorage.removeItem('activeInterviewId');
                });
        }
    }, [interviewData, step]);

    // Called when Step 1 (Setup) is done
    const handleStartInterview = (data) => {
        if (data?.interviewId) {
            sessionStorage.setItem('activeInterviewId', data.interviewId);
        }
        setInterviewData(data);
        setStep(2);
    };

    // Called when Step 2 (Interview) is finished
    const handleInterviewFinished = (reportData) => {
        sessionStorage.removeItem('activeInterviewId');
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
