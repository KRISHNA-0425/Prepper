import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Standardized Playback Lifecycle States:
 * idle -> loading -> playing -> finished (or error)
 */
export const PLAYBACK_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  FINISHED: 'finished',
  ERROR: 'error',
};

/**
 * Custom React hook for synchronized AI interviewer video playback and audible question voice.
 * 
 * Architecture & Features:
 * - Controlled Playback Lifecycle: idle -> loading -> playing -> finished / error.
 * - Synchronizes silent interviewer video element with SpeechSynthesis audio timeline (Case B).
 * - Plays video loop during speech, automatically pauses/stops video when speech completes or cancels.
 * - Prevents Chromium V8 garbage collection bug by anchoring active utterance to persistent ref and window.
 * - Heartbeat keep-alive mechanism to prevent Chrome 15-second speech silence bug.
 * - Deduplicates speech triggers across React rerenders, Strict Mode, and 1-second countdown timer updates.
 * - Cancels speech and pauses video cleanly when question changes, session ends, or component unmounts.
 * - Browser Autoplay handling: detects 'not-allowed' errors and exposes requestAudioActivation / enableAudio.
 */
export function useQuestionSpeech({
  videoRef: externalVideoRef = null,
  onStart,
  onEnd,
  onError,
  onStateChange,
} = {}) {
  const [playbackState, setPlaybackState] = useState(PLAYBACK_STATE.IDLE);
  const [isBlocked, setIsBlocked] = useState(false);
  const [hasActivated, setHasActivated] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);

  const internalVideoRef = useRef(null);
  const videoRef = externalVideoRef || internalVideoRef;

  const preferredVoiceRef = useRef(null);
  const lastSpokenIdRef = useRef(null);
  const activeUtteranceRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Broadcast state changes if callback provided
  useEffect(() => {
    onStateChange?.(playbackState);
  }, [playbackState, onStateChange]);

  // Load natural English speech voice safely without blocking initialization
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) return;
        const targetVoice = voices.find((v) =>
          v.name.toLowerCase().includes('google us english') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('samantha') ||
          (v.name.toLowerCase().includes('female') && v.lang.includes('en'))
        ) || voices.find((v) => v.lang.includes('en'));
        preferredVoiceRef.current = targetVoice || voices[0];
      } catch (err) {
        console.warn('Error loading speech voices:', err);
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current);
      }
    };
  }, [isSupported]);

  // Clear keep-alive timer
  const clearKeepAlive = useCallback(() => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  // Chrome keep-alive heartbeat: prevents speech synthesis from stalling on utterances > 15s
  const startKeepAlive = useCallback(() => {
    clearKeepAlive();
    keepAliveIntervalRef.current = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearKeepAlive();
      }
    }, 10000);
  }, [clearKeepAlive]);

  // Cleanly pause and reset video playback
  const pauseVideo = useCallback(() => {
    const video = videoRef?.current;
    if (video) {
      try {
        video.loop = false;
        video.pause();
      } catch {
        // ignore video pause exceptions
      }
    }
  }, [videoRef]);

  // Start synchronized video playback
  const playVideo = useCallback(() => {
    const video = videoRef?.current;
    if (video) {
      try {
        video.loop = true; // Loop smoothly while speech continues
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            // Autoplay rejection or video aborted
            console.warn('Interviewer video play interrupted or blocked:', err);
          });
        }
      } catch (err) {
        console.warn('Interviewer video play exception:', err);
      }
    }
  }, [videoRef]);

  // Stop all active playback (audio and video) and return to IDLE state
  const stopPlayback = useCallback(() => {
    clearKeepAlive();
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current = null;
      if (typeof window !== 'undefined' && window.__prepperActiveUtterance) {
        window.__prepperActiveUtterance = null;
      }
    }
    pauseVideo();
    if (isMountedRef.current) {
      setPlaybackState(PLAYBACK_STATE.IDLE);
    }
  }, [isSupported, clearKeepAlive, pauseVideo]);

  // speakQuestion: Starts synchronized video and spoken question
  const speakQuestion = useCallback((text, questionId, { force = false } = {}) => {
    if (!text) return;

    if (!isSupported) {
      console.warn('SpeechSynthesis is not supported in this browser environment.');
      setPlaybackState(PLAYBACK_STATE.FINISHED);
      return;
    }

    // Deduplicate against identical question ID unless explicitly forced (prevents timer ticks restarting speech)
    if (!force && lastSpokenIdRef.current === questionId) {
      return;
    }

    // Cancel existing utterance and pause video
    clearKeepAlive();
    if (isSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    pauseVideo();

    lastSpokenIdRef.current = questionId;
    setCurrentQuestionId(questionId);
    setPlaybackState(PLAYBACK_STATE.LOADING);
    setErrorMessage(null);

    const utterance = new SpeechSynthesisUtterance(text);
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Retain persistent reference to prevent V8 garbage collection mid-speech
    activeUtteranceRef.current = utterance;
    if (typeof window !== 'undefined') {
      window.__prepperActiveUtterance = utterance;
    }

    utterance.onstart = () => {
      if (!isMountedRef.current) return;
      if (activeUtteranceRef.current !== utterance) return;

      setPlaybackState(PLAYBACK_STATE.PLAYING);
      setIsBlocked(false);
      setHasActivated(true);
      setErrorMessage(null);
      startKeepAlive();
      playVideo();
      onStart?.();
    };

    utterance.onend = () => {
      clearKeepAlive();
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
        if (typeof window !== 'undefined' && window.__prepperActiveUtterance === utterance) {
          window.__prepperActiveUtterance = null;
        }
      }

      if (!isMountedRef.current) return;
      pauseVideo();
      setPlaybackState(PLAYBACK_STATE.FINISHED);
      onEnd?.();
    };

    utterance.onerror = (event) => {
      clearKeepAlive();
      if (activeUtteranceRef.current === utterance) {
        activeUtteranceRef.current = null;
        if (typeof window !== 'undefined' && window.__prepperActiveUtterance === utterance) {
          window.__prepperActiveUtterance = null;
        }
      }

      if (!isMountedRef.current) return;
      pauseVideo();

      if (event && (event.error === 'not-allowed' || event.error === 'audio-busy')) {
        setIsBlocked(true);
        setErrorMessage('Browser blocked audible autoplay. Click Enable Audio to start.');
        setPlaybackState(PLAYBACK_STATE.ERROR);
      } else if (event?.error && event.error !== 'canceled' && event.error !== 'interrupted') {
        setErrorMessage('Speech playback error: ' + event.error);
        setPlaybackState(PLAYBACK_STATE.ERROR);
      } else {
        // Canceled or interrupted due to navigation / advance
        setPlaybackState(PLAYBACK_STATE.IDLE);
      }

      onError?.(event);
    };

    // Microtask timeout to avoid race condition when calling speak immediately after cancel in Chromium
    const executeSpeak = () => {
      if (!isMountedRef.current || activeUtteranceRef.current !== utterance) return;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('SpeechSynthesis.speak failed:', err);
        pauseVideo();
        setIsBlocked(true);
        setErrorMessage('Speech playback could not be started.');
        setPlaybackState(PLAYBACK_STATE.ERROR);
      }
    };

    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      setTimeout(executeSpeak, 50);
    } else {
      executeSpeak();
    }
  }, [isSupported, clearKeepAlive, pauseVideo, playVideo, startKeepAlive, onStart, onEnd, onError]);

  // Replay question explicitly (force = true)
  const replayQuestion = useCallback((text, questionId) => {
    speakQuestion(text, questionId, { force: true });
  }, [speakQuestion]);

  // Request audio activation in a user gesture context (resolves autoplay restrictions)
  const requestAudioActivation = useCallback((text, questionId) => {
    setHasActivated(true);
    setIsBlocked(false);
    setErrorMessage(null);

    if (isSupported) {
      try {
        window.speechSynthesis.resume();
      } catch {
        // ignore
      }
    }

    // Video user-gesture priming
    const video = videoRef?.current;
    if (video) {
      try {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    if (text && questionId !== undefined && questionId !== null) {
      speakQuestion(text, questionId, { force: true });
    }
  }, [isSupported, videoRef, speakQuestion]);

  return {
    playbackState,
    isSpeaking: playbackState === PLAYBACK_STATE.PLAYING,
    isPlaying: playbackState === PLAYBACK_STATE.PLAYING,
    isLoading: playbackState === PLAYBACK_STATE.LOADING,
    isFinished: playbackState === PLAYBACK_STATE.FINISHED,
    isError: playbackState === PLAYBACK_STATE.ERROR,
    isBlocked,
    hasActivated,
    errorMessage,
    currentQuestionId,
    videoRef,
    speakQuestion,
    replayQuestion,
    stopPlayback,
    cancelSpeech: stopPlayback,
    requestAudioActivation,
    enableAudio: requestAudioActivation,
  };
}

export default useQuestionSpeech;
