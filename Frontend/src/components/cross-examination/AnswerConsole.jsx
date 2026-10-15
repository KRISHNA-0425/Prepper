import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlinePaperAirplane,
  HiOutlineArrowRight,
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
} from 'react-icons/hi';
import { HiMicrophone } from 'react-icons/hi2';
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
}) {
  const [transcript, setTranscript] = useState('');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [validationError, setValidationError] = useState('');

  const isExpired = timeLeft <= 0;
  const charCount = transcript.trim().length;
  const isOverLimit = charCount > CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS;

  // Speech-to-text integration: appends to typed text without overwriting
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
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-md text-left">
      {/* If currently answered and awaiting manual advance */}
      {isAnswered ? (
        <div className="py-6 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800/40 flex items-center justify-center text-emerald-400 text-2xl">
            <HiOutlineCheckCircle />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-100">Answer Accepted</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Your response has been securely recorded on the server. Advance to the next cross-examination inquiry when
              ready.
            </p>
          </div>

          <button
            onClick={onAdvanceQuestion}
            disabled={isAdvancing}
            className="mt-2 px-8 py-3.5 bg-yellow-400 hover:bg-yellow-300 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg transition-all disabled:opacity-50"
          >
            {isAdvancing ? (
              <>
                <RiLoader4Line className="animate-spin text-base" />
                Loading Next Question...
              </>
            ) : (
              <>
                Next Question
                <HiOutlineArrowRight className="text-base" />
              </>
            )}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="answerTranscriptArea" className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Your Technical Response
            </label>
            <span
              className={`text-xs font-mono font-medium ${
                isOverLimit ? 'text-red-400 font-bold' : 'text-slate-500'
              }`}
            >
              {charCount.toLocaleString()} / {CROSS_EXAM_BOUNDS.MAX_ANSWER_CHARS.toLocaleString()} chars
            </span>
          </div>

          {/* Textarea container with microphone listening indicator */}
          <div className="relative">
            <textarea
              id="answerTranscriptArea"
              rows={7}
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                syncBaseText(e.target.value);
                setValidationError('');
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder="Type your explanation here, or click the microphone to dictate your response... (Ctrl + Enter to submit)"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 font-sans leading-relaxed disabled:opacity-60 resize-none shadow-inner"
            />

            {/* Active Speech Recognition Banner */}
            {isListening && (
              <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500/20 border border-red-500/40 px-3 py-1 rounded-full shadow-sm backdrop-blur-md">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                  Listening...
                </span>
              </div>
            )}
          </div>

          {/* Time Expired Advisory Banner (Answer NOT discarded or auto-submitted) */}
          {isExpired && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-center gap-2"
            >
              <HiOutlineExclamationCircle className="text-base text-red-400 shrink-0" />
              <span>
                Suggested time has expired for this question. You may review, polish, or finish dictating your response, then submit when ready.
              </span>
            </motion.div>
          )}

          {/* Validation Banner */}
          <AnimatePresence>
            {validationError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="p-3 bg-red-950/50 border border-red-800/50 rounded-xl text-xs text-red-300 flex items-center gap-2"
              >
                <HiOutlineExclamationCircle className="text-base text-red-400 shrink-0" />
                <span>{validationError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy and Dictation Helper Note */}
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Voice input appends speech to your typed answer. Private and browser-native.</span>
            {isListening && (
              <span className="text-red-400 font-semibold animate-pulse">Speak clearly into your microphone</span>
            )}
          </div>

          {/* Footer Controls: Microphone Toggle + Auto-advance + Submit Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-3">
              {/* Visible Microphone Control Button */}
              <motion.button
                type="button"
                id="voiceInputButton"
                onClick={toggleListening}
                disabled={isSubmitting || isAdvancing}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                aria-label={isListening ? "Stop voice dictation" : "Start voice dictation"}
                title={isListening ? "Click to stop microphone" : "Click to dictate your answer"}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all border shadow-sm ${
                  isListening
                    ? 'bg-red-500 text-white border-red-400 animate-pulse shadow-red-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border-slate-700 hover:border-yellow-400/50'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <HiMicrophone size={16} className={isListening ? 'animate-bounce' : ''} />
                <span>{isListening ? 'Stop Listening' : 'Voice Input'}</span>
              </motion.button>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={autoAdvance}
                  onChange={(e) => setAutoAdvance(e.target.checked)}
                  className="w-4 h-4 rounded text-yellow-400 bg-slate-950 border-slate-700 focus:ring-yellow-400 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span className="hidden sm:inline">Auto-advance</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || charCount === 0 || isOverLimit}
              className={`py-3 px-8 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md ${
                isSubmitting || charCount === 0 || isOverLimit
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                  : 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="animate-spin text-base" />
                  Recording Response...
                </>
              ) : (
                <>
                  <HiOutlinePaperAirplane className="text-sm" />
                  Submit Answer
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default AnswerConsole;
