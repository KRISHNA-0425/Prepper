import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom React hook for robust, privacy-preserving browser-native speech recognition.
 * 
 * Features:
 * - Appends recognized speech to existing typed text without overwriting.
 * - Supports real-time interim results.
 * - Graceful permission and error handling.
 * - Safe unmount and transition cleanup.
 * - Prevents duplicate recognition instances.
 */
export function useSpeechRecognition({ onTranscriptChange, currentAnswer = '' }) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState(null);
    const [interimText, setInterimText] = useState('');

    const recognitionRef = useRef(null);
    const baseTextRef = useRef('');
    const isExplicitlyStoppedRef = useRef(false);

    // Check browser support
    const isSupported = typeof window !== 'undefined' && 
        Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

    // Keep baseTextRef updated with the latest typed answer when NOT actively transcribing
    const syncBaseText = useCallback((text) => {
        baseTextRef.current = text;
    }, []);

    // Stop recognition cleanly
    const stopListening = useCallback(() => {
        isExplicitlyStoppedRef.current = true;
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore if already stopped
            }
        }
        setIsListening(false);
        setInterimText('');
    }, []);

    // Start recognition
    const startListening = useCallback(() => {
        if (!isSupported) {
            toast.error("Speech recognition is not supported in this browser. Please type your answer.");
            return;
        }

        // Stop any running instance before starting
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch {
                // Ignore
            }
            recognitionRef.current = null;
        }

        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;
        isExplicitlyStoppedRef.current = false;
        setError(null);

        // Snapshot current answer as prefix so voice input appends to what candidate typed
        baseTextRef.current = currentAnswer;

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onresult = (event) => {
            let sessionFinals = '';
            let sessionInterim = '';

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                const text = res[0]?.transcript || '';
                if (res.isFinal) {
                    sessionFinals += text + ' ';
                } else {
                    sessionInterim += text;
                }
            }

            const spokenContent = (sessionFinals + sessionInterim).trim();
            setInterimText(sessionInterim.trim());

            if (onTranscriptChange) {
                const prefix = (baseTextRef.current || '').trim();
                const combined = prefix 
                    ? `${prefix} ${spokenContent}` 
                    : spokenContent;
                onTranscriptChange(combined);
            }
        };

        recognition.onerror = (event) => {
            console.warn("Speech recognition event error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                const permErr = "Microphone permission was denied. Please allow microphone access in your browser settings to use voice input.";
                setError(permErr);
                toast.error(permErr);
            } else if (event.error === 'audio-capture') {
                const audioErr = "No microphone was found or microphone is currently busy.";
                setError(audioErr);
                toast.error(audioErr);
            } else if (event.error === 'network') {
                const netErr = "Speech recognition network error. Please check your internet connection.";
                setError(netErr);
                toast.error(netErr);
            } else if (event.error !== 'no-speech') {
                setError(`Speech recognition error: ${event.error}`);
            }
            setIsListening(false);
            setInterimText('');
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimText('');
            // Do NOT auto-submit answer on recognition end
        };

        try {
            recognition.start();
        } catch (err) {
            console.error("Failed to start speech recognition:", err);
            setError("Unable to access microphone. Please check permissions.");
            setIsListening(false);
        }
    }, [isSupported, currentAnswer, onTranscriptChange]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Universal cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch {
                    // Ignore cleanup error
                }
                recognitionRef.current = null;
            }
        };
    }, []);

    return {
        isListening,
        isSupported,
        error,
        interimText,
        startListening,
        stopListening,
        toggleListening,
        syncBaseText,
    };
}

export default useSpeechRecognition;
