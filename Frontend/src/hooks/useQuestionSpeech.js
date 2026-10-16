import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Custom React hook for audible AI question speech synthesis.
 * 
 * Features:
 * - Automatically speaks active questions via browser SpeechSynthesis.
 * - Prevents duplicate speech on React rerenders, Strict Mode, or timer ticks using lastSpokenIdRef.
 * - Cancels obsolete speech when questions change or unmount.
 * - Handles browser autoplay restrictions by exposing isBlocked & requestAudioActivation.
 * - Coordinates speech state (isSpeaking, isBlocked, isSupported) for avatar animation and mic muting.
 * - Provides explicit replayQuestion control.
 */
export function useQuestionSpeech({
    onStart,
    onEnd,
    onError,
} = {}) {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [hasActivated, setHasActivated] = useState(false);
    const preferredVoiceRef = useRef(null);
    const lastSpokenIdRef = useRef(null);
    const keepAliveIntervalRef = useRef(null);

    const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    // Load voices safely without blocking synthesis
    useEffect(() => {
        if (!isSupported) return;

        const loadVoices = () => {
            try {
                const voices = window.speechSynthesis.getVoices();
                if (!voices || voices.length === 0) return;
                const targetVoice = voices.find(v =>
                    v.name.toLowerCase().includes('google us english') ||
                    v.name.toLowerCase().includes('zira') ||
                    v.name.toLowerCase().includes('samantha') ||
                    (v.name.toLowerCase().includes('female') && v.lang.includes('en'))
                ) || voices.find(v => v.lang.includes('en'));
                preferredVoiceRef.current = targetVoice || voices[0];
            } catch (err) {
                console.warn('Error loading voices:', err);
            }
        };

        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        return () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
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

    // Chrome keep-alive heartbeat to prevent speech timeout on long sentences
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

    // Cancel speech cleanly
    const cancelSpeech = useCallback(() => {
        clearKeepAlive();
        if (isSupported) {
            try {
                window.speechSynthesis.cancel();
            } catch {
                // ignore
            }
        }
        setIsSpeaking(false);
    }, [isSupported, clearKeepAlive]);

    // Speak question aloud
    const speakQuestion = useCallback((text, questionId, { force = false } = {}) => {
        if (!isSupported || !text) return;

        // Prevent duplicate speech on rerenders or 1-second countdown ticks
        if (!force && lastSpokenIdRef.current === questionId) {
            return;
        }

        cancelSpeech();
        lastSpokenIdRef.current = questionId;

        const utterance = new SpeechSynthesisUtterance(text);
        if (preferredVoiceRef.current) {
            utterance.voice = preferredVoiceRef.current;
        }
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
            setIsBlocked(false);
            setHasActivated(true);
            startKeepAlive();
            onStart?.();
        };

        utterance.onend = () => {
            clearKeepAlive();
            setIsSpeaking(false);
            onEnd?.();
        };

        utterance.onerror = (event) => {
            clearKeepAlive();
            setIsSpeaking(false);
            if (event.error === 'not-allowed') {
                setIsBlocked(true);
            }
            onError?.(event);
        };

        try {
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('SpeechSynthesis.speak failed:', err);
            setIsSpeaking(false);
            setIsBlocked(true);
        }
    }, [isSupported, cancelSpeech, clearKeepAlive, startKeepAlive, onStart, onEnd, onError]);

    // Replay current question explicitly
    const replayQuestion = useCallback((text, questionId) => {
        speakQuestion(text, questionId, { force: true });
    }, [speakQuestion]);

    // Unblock / activate audio after browser autoplay restriction
    const requestAudioActivation = useCallback((text, questionId) => {
        setHasActivated(true);
        setIsBlocked(false);
        if (isSupported) {
            try {
                window.speechSynthesis.resume();
            } catch {
                // ignore
            }
        }
        if (text && questionId) {
            speakQuestion(text, questionId, { force: true });
        }
    }, [isSupported, speakQuestion]);

    return {
        isSpeaking,
        isBlocked,
        isSupported,
        hasActivated,
        speakQuestion,
        replayQuestion,
        cancelSpeech,
        requestAudioActivation,
    };
}

export default useQuestionSpeech;
