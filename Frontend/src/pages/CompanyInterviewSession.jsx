import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  RiBuilding4Line,
  RiTimeLine,
  RiMicLine,
  RiMicOffLine,
  RiVolumeUpLine,
  RiSendPlaneFill,
  RiCheckDoubleLine,
  RiArrowRightLine,
  RiSparklingLine,
  RiStopCircleLine,
  RiCodeSSlashLine,
  RiInformationLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import Navbar from '../components/Navbar';
import { backendServerUrl } from '../App';

export default function CompanyInterviewSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [candidateAnswer, setCandidateAnswer] = useState('');
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Audio / Speech Recognition
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);

  // Question Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Submitted Answer Feedback State
  const [lastFeedback, setLastFeedback] = useState(null);

  // Fetch session on load
  useEffect(() => {
    const fetchSession = async () => {
      try {
        setIsLoadingSession(true);
        const res = await axios.get(
          `${backendServerUrl}/api/company-interview/session/${sessionId}`,
          { withCredentials: true }
        );
        if (res.data?.success && res.data?.data) {
          const s = res.data.data;
          setSession(s);

          // Find first unanswered question
          const unansweredIdx = s.questions.findIndex((q) => !q.candidateAnswer);
          if (unansweredIdx !== -1) {
            setCurrentQuestionIndex(unansweredIdx);
          } else if (s.status === 'completed') {
            navigate(`/company-interview/report/${sessionId}`);
          }
        }
      } catch (err) {
        console.error('Failed to load session:', err);
        toast.error('Could not load company interview session.');
        navigate('/company-interview');
      } finally {
        setIsLoadingSession(false);
      }
    };
    fetchSession();
  }, [sessionId, navigate]);

  // Question Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  // Web Speech API - Voice Dictation Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setCandidateAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in this browser. Please type your answer.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.success('Microphone activated! Speak clearly.');
      } catch (e) {
        console.error('Failed to start speech:', e);
      }
    }
  };

  // Text-to-Speech Read Aloud
  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Submit Answer
  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim()) {
      toast.error('Please speak or type your answer before submitting.');
      return;
    }

    const currentQ = session?.questions?.[currentQuestionIndex];
    if (!currentQ) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    try {
      setIsSubmitting(true);
      const res = await axios.post(
        `${backendServerUrl}/api/company-interview/submit-answer`,
        {
          sessionId,
          questionId: currentQ._id,
          candidateAnswer: candidateAnswer.trim(),
        },
        { withCredentials: true }
      );

      if (res.data?.success && res.data?.data) {
        setLastFeedback(res.data.data.evaluation);
        toast.success('Answer evaluated against company criteria!');

        // Update local session question
        const updatedQuestions = [...session.questions];
        updatedQuestions[currentQuestionIndex] = {
          ...updatedQuestions[currentQuestionIndex],
          candidateAnswer: candidateAnswer.trim(),
          score: res.data.data.evaluation.overallScore,
          evaluation: res.data.data.evaluation,
        };
        setSession({ ...session, questions: updatedQuestions });
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      toast.error(err.response?.data?.message || 'Failed to submit answer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Next Question
  const handleNextQuestion = () => {
    setLastFeedback(null);
    setCandidateAnswer('');
    setSecondsElapsed(0);

    if (currentQuestionIndex + 1 < (session?.questions?.length || 0)) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      handleFinishInterview();
    }
  };

  // Finish Interview
  const handleFinishInterview = async () => {
    try {
      setIsFinishing(true);
      const res = await axios.post(
        `${backendServerUrl}/api/company-interview/finish`,
        { sessionId },
        { withCredentials: true }
      );

      if (res.data?.success) {
        toast.success('Interview simulation completed!');
        navigate(`/company-interview/report/${sessionId}`);
      }
    } catch (err) {
      console.error('Failed to finish interview:', err);
      toast.error('Error generating final company report.');
      navigate(`/company-interview/report/${sessionId}`);
    } finally {
      setIsFinishing(false);
    }
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-poppins text-white">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-lg font-bold">Configuring Company Simulation Workspace...</h3>
        <p className="text-xs text-slate-400 mt-1">Calibrating round expectations and persona</p>
      </div>
    );
  }

  const currentQ = session?.questions?.[currentQuestionIndex];
  const totalQuestions = session?.questions?.length || 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const companyInfo = session?.companySimulation || {};

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-poppins pb-24 selection:bg-yellow-400 selection:text-slate-950">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {/* Header Ribbon */}
        <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-400 text-slate-950 font-black text-xl">
              <RiBuilding4Line />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-yellow-400/20 text-yellow-400 border border-yellow-400/40">
                  {companyInfo.companyName || 'Target Company'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                  {companyInfo.roundTitle || 'Technical Round'}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-white">
                {companyInfo.targetDesignation || 'Software Engineer'} Simulation
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:self-center">
            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono">
              <RiTimeLine className="text-yellow-400" />
              {formatTimer(secondsElapsed)}
            </div>

            {/* Question Counter */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
              Q{currentQuestionIndex + 1} of {totalQuestions}
            </div>

            {/* Finish Early Button */}
            <button
              type="button"
              disabled={isFinishing}
              onClick={handleFinishInterview}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 transition cursor-pointer"
            >
              Finish Early
            </button>
          </div>
        </div>

        {/* Module 4 Live Coding Workspace Link for Online Assessment rounds */}
        {(session?.interviewType === 'coding' || (session?.codingProblems && session.codingProblems.length > 0)) && (
          <div className="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-400">
                <RiCodeSSlashLine className="text-base" /> Module 4: Live Coding Assessment Active
              </span>
              <p className="text-xs text-slate-300">
                This round includes executable coding challenges. You can write and verify your solution in the Monaco Editor workspace with sandboxed test case execution.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/coding/${sessionId}`)}
              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <RiCodeSSlashLine />
              Open Monaco Coding Workspace
            </button>
          </div>
        )}

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5 px-1">
          {session?.questions?.map((q, idx) => {
            const isCompleted = !!q.candidateAnswer;
            const isCurrent = idx === currentQuestionIndex;

            return (
              <div
                key={idx}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  isCurrent
                    ? 'bg-yellow-400'
                    : isCompleted
                    ? 'bg-emerald-500'
                    : 'bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {/* Current Question Display Card */}
        {currentQ && (
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1}
                </span>
                <span className="text-slate-600">•</span>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentQ.competency || 'Core Competency'}
                </span>
              </div>

              {/* Text-to-Speech button */}
              <button
                type="button"
                onClick={() => speakQuestion(currentQ.question)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  isSpeaking
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <RiStopCircleLine className="animate-spin text-sm" />
                    Stop Voice
                  </>
                ) : (
                  <>
                    <RiVolumeUpLine className="text-sm text-yellow-400" />
                    Read Aloud
                  </>
                )}
              </button>
            </div>

            {/* Question Text */}
            <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">
              {currentQ.question}
            </p>

            {/* Expected Criteria or Hint */}
            {currentQ.expectedCriteria && currentQ.expectedCriteria.length > 0 && (
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1">
                  <RiInformationLine className="text-yellow-400" />
                  Key Evaluation Rubrics:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentQ.expectedCriteria.map((crit, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[11px]"
                    >
                      {crit}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Answer Input Workspace */}
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span>Your Response</span>
              <span className="text-slate-500 font-normal">
                (Type or dictate via speech)
              </span>
            </label>

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border-yellow-400/30'
              }`}
            >
              {isListening ? (
                <>
                  <RiMicOffLine className="text-sm" />
                  Recording... (Click to Stop)
                </>
              ) : (
                <>
                  <RiMicLine className="text-sm" />
                  Start Voice Answer
                </>
              )}
            </button>
          </div>

          <textarea
            rows={7}
            value={candidateAnswer}
            onChange={(e) => setCandidateAnswer(e.target.value)}
            disabled={isSubmitting || !!lastFeedback}
            placeholder="Structure your answer clearly. Explain your thought process, algorithmic trade-offs, architecture decisions, and edge-case handling..."
            className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-sm sm:text-base text-white focus:outline-none focus:border-yellow-400 transition placeholder-slate-600 resize-none font-mono leading-relaxed"
          />

          {/* Action Row */}
          {!lastFeedback ? (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {candidateAnswer.split(/\s+/).filter(Boolean).length} words
              </span>

              <button
                type="button"
                disabled={isSubmitting || !candidateAnswer.trim()}
                onClick={handleSubmitAnswer}
                className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-lg shadow-yellow-400/20 flex items-center gap-2 transition cursor-pointer disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    Evaluating against Rubrics...
                  </>
                ) : (
                  <>
                    <RiSendPlaneFill />
                    Submit Answer
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Inline Rubric Evaluation Feedback */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <RiCheckboxCircleLine className="text-emerald-400 text-lg" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Question Evaluation
                  </span>
                </div>
                <div className="px-3 py-1 rounded-lg bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 text-xs font-black">
                  Score: {lastFeedback.overallScore} / 100
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {lastFeedback.feedback}
              </p>

              {lastFeedback.strengths?.length > 0 && (
                <div className="text-xs text-emerald-400 space-y-1">
                  <span className="font-bold">Strengths:</span>
                  <div className="text-slate-300 pl-2">
                    {lastFeedback.strengths.join(' • ')}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-400 hover:bg-yellow-300 text-slate-950 flex items-center gap-2 transition cursor-pointer"
                >
                  {isLastQuestion ? 'View Final Company Report' : 'Next Question'}
                  <RiArrowRightLine />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
