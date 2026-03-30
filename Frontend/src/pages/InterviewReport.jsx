import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { backendServerUrl } from '../App';
import Step3Report from './Step3Report';

function InterviewReport() {

    const { id } = useParams()

    const [report, setReport] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const result = await axios.get(backendServerUrl + '/api/interview/report/' + id, { withCredentials: true })
                console.log(result.data)
                setReport(result.data);
            } catch (error) {
                console.log(error);
            }
        }
        fetchReport();
    },[])

    return (
        <Step3Report report={report} />
    )
}

export default InterviewReport