import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiCheckCircle,
  HiExclamationCircle,
} from 'react-icons/hi';
import { HiMicrophone, HiArrowRight } from 'react-icons/hi2';
import { RiLoader4Line } from 'react-icons/ri';
import { CROSS_EXAM_BOUNDS, validateAnswerInput } from '../../utils/crossExaminationApi';
import useSpeechRecognition from '../../hooks/useSpeechRecognition';

function AnswerConsole({
  activeQuestion,
  isAnswered,
  onSubmitAnswer,
  onAdvanceQuestion,
  isSubmitting,
  isAdvancing,
  timeLeft = 120,
  isLastQuestion = false,
}) {
  const [transcript, setTranscript] = useState('');
  const [autoAdvance] = useState(true);
  const [validationError, setValidationError] = useState('');

  const isExpired = timeLeft <= 0;
  const charCount = transcript.trim().length;
  const isOverLimit = charCount > CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS;

  // Speech-to-text integration: appends recognized speech to existing typed text
  const handleTranscriptChange = useCallback((newTranscript) => {
    setTranscript(newTranscript);
    setValidationError('');
  }, []);

  const {
    isListening,
    toggleListening,
    stopListening,
    syncBaseText,
  } = useSpeechRecognition({
    onTranscriptChange: handleTranscriptChange,
    currentAnswer: transcript,
  });

  // Reset answer console state cleanly when active question changes
  useEffect(() => {
    setTranscript('');
    syncBaseText('');
    setValidationError('');
    stopListening();
  }, [activeQuestion?.questionId, syncBaseText, stopListening]);

  // Stop listening when answer is submitted or answered
  useEffect(() => {
    if (isAnswered || isSubmitting || isAdvancing) {
      stopListening();
    }
  }, [isAnswered, isSubmitting, isAdvancing, stopListening]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setValidationError('');
    stopListening();

    if (isSubmitting || isAdvancing) return;

    const validation = validateAnswerInput(transcript);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    onSubmitAnswer({
      questionId: activeQuestion.questionId,
      rawTranscript: transcript.trim(),
      autoAdvance,
    });
  };

  const handleKeyDown = (e) => {
    // Cmd+Enter or Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 text-left">
      {/* If currently answered and awaiting manual advance */}
      {isAnswered ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-slate-200 rounded-2xl gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 text-3xl shadow-sm">
            <HiCheckCircle />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Answer Accepted</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Your response has been securely recorded. Advance to the next cross-examination inquiry when ready.
            </p>
          </div>

          <button
            onClick={onAdvanceQuestion}
            disabled={isAdvancing}
            className="mt-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isAdvancing ? (
              <>
                <RiLoader4Line className="animate-spin text-base" />
                Loading Next Question...
              </>
            ) : (
              <>
                Next Question
                <HiArrowRight className="text-base text-yellow-400" />
              </>
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 justify-between">
          {/* Textarea container with microphone listening indicator */}
          <div className="relative flex-1 min-h-0 flex flex-col mb-3">
            <textarea
              id="candidateAnswerInput"
              rows={7}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                syncBaseText(e.target.value);
                setValidationError('');
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder="Type your response or click the microphone to speak. You can edit your text anytime before submitting..."
              aria-label="Candidate answer input"
              className="w-full flex-1 bg-slate-50 p-5 rounded-2xl border-2 border-slate-100 outline-none focus:border-yellow-400 focus:bg-white transition-all text-slate-800 font-medium placeholder:text-slate-400 resize-none shadow-inner text-sm leading-relaxed"
            />

            {/* Active Speech Recognition Banner */}
            {isListening && (
              <div className="absolute top-3 right-4 flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">
                  Listening...
                </span>
              </div>
            )}

            {/* Time Expired Advisory Banner */}
            {isExpired && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                <span>Time has expired for this question. You may review and submit your response whenever you are ready.</span>
              </div>
            )}

            {/* Validation Banner */}
            <AnimatePresence>
              {validationError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2"
                >
                  <HiExclamationCircle className="text-base text-red-500 shrink-0" />
                  <span>{validationError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer beneath the editor */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>Voice input appends speech to your typed answer. Private and browser-native.</span>
              <span className={isOverLimit ? 'text-red-500 font-bold' : ''}>
                {charCount.toLocaleString()} / {CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS.toLocaleString()} chars
              </span>
            </div>
          </div>

          {/* Bottom action row: Microphone Button + Submit Button */}
          <div className="flex items-center gap-3 mt-2 shrink-0">
            {/* Microphone Toggle Button */}
            <motion.button
              type="button"
              id="voiceInputButton"
              onClick={toggleListening}
              disabled={isSubmitting || isAdvancing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              aria-label={isListening ? 'Stop voice dictation' : 'Start voice dictation'}
              title={isListening ? 'Stop Listening' : 'Voice Input'}
              className={`h-14 px-5 flex items-center justify-center gap-2 rounded-2xl shadow-lg shrink-0 transition-all font-bold text-xs uppercase tracking-wider ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-red-500/30'
                  : 'bg-slate-900 text-yellow-400 hover:bg-slate-800'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <HiMicrophone size={20} className={isListening ? 'animate-bounce' : ''} />
              <span className="hidden sm:inline font-mono">
                {isListening ? 'Stop Listening' : 'Voice Input'}
              </span>
            </motion.button>

            {/* Submit & Next Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting || isAdvancing}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 shadow-xl hover:shadow-yellow-400/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? 'Evaluating...'
                : isLastQuestion
                ? 'SUBMIT & FINISH'
                : 'SUBMIT & NEXT'}
              <HiArrowRight size={16} className="text-yellow-400" />
            </motion.button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AnswerConsole;
