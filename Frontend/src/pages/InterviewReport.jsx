import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { backendServerUrl } from '../App';
import Step3Report from './Step3Report';

function InterviewReport() {

    const { id } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        const fetchReport = async () => {
            try {
                const result = await axios.get(backendServerUrl + '/api/interview/report/' + id, { withCredentials: true });
                if (isMounted) {
                    setReport(result.data);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError(err.response?.data?.message || 'Failed to load interview report');
                }
            }
        };
        fetchReport();
        return () => {
            isMounted = false;
        };
    }, [id]);

    if (error) {
        return (
            <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-poppins">
                <div className="bg-red-950/30 border border-red-800/50 rounded-3xl p-8 max-w-md w-full">
                    <p className="text-red-400 font-bold mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/history')}
                        className="px-6 py-2.5 bg-yellow-400 text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform cursor-pointer"
                    >
                        Back to Archive
                    </button>
                </div>
            </div>
        );
    }

    return (
        <Step3Report report={report} />
    );
}

export default InterviewReport;