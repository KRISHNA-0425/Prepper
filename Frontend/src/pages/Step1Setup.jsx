import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HiCheckCircle, HiMicrophone, HiChartBar, HiBriefcase, HiTrendingUp, HiArrowRight, HiSparkles, HiCode, HiCollection, HiX } from 'react-icons/hi'
import { FaFileArrowUp } from "react-icons/fa6";
import { RiUserVoiceLine } from 'react-icons/ri'
import axios from 'axios'
import { backendServerUrl } from '../App';
import toast from 'react-hot-toast';

function Step1Setup({ onStart }) {
    const [role, setRole] = useState('')
    const [experience, setExperience] = useState('0-1')
    const [mode, setMode] = useState('Technical')
    const [resumeFile, setResumeFile] = useState(null)
    const [skills, setSkills] = useState([])
    const [projects, setProjects] = useState([])
    const [resumeText, setResumeText] = useState('')
    const [anaylsisDone, setAnaylsisDone] = useState(false)
    const [anaylzing, setAnaylzing] = useState(false)

    const handleUploadResume = async (e) => {
        if (e) e.stopPropagation();
        if (!resumeFile || anaylzing) return;
        setAnaylzing(true);

        const formData = new FormData()
        formData.append("resume", resumeFile)

        try {
            const result = await axios.post(backendServerUrl + '/api/interview/resume', formData, { withCredentials: true })
            setRole(result.data.role || '')
            setExperience(result.data.experience || '0-1')
            setProjects(result.data.projects || [])
            setSkills(result.data.skills || [])
            setResumeText(result.data.resumeText || '')
            setAnaylsisDone(true)
            toast.success("Profile Analyse Complete")
        } catch (error) {
            console.error('Error in handleUploadResume', error);
            toast.error("unable to anaylse resume")
        } finally {
            setAnaylzing(false);
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        onStart({ role, experience, mode, skills, projects, resumeText });
    };

    return (
        <div className='text-lg font-bold ' > 
            {onStart}
        </div>
    )
}

export default Step1Setup;