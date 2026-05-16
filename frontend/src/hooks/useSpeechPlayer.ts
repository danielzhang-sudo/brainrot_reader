import { useState, useRef, useEffect } from "react";

export function useSpeechPlayer() {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [wpm, setWpmState] = useState<number>(250);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const wpmRef = useRef<number>(250);

  wordsRef.current = words;
  currentIndexRef.current = currentIndex;
  wpmRef.current = wpm;

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (synthRef.current) synthRef.current.cancel();
  };

  // --- RE-ENGINEERED SPEED CALCULATOR ---
  // Maps WPM targets to aggressive rate multipliers that match the console test snippet
  const getCalculatedRate = (targetWpm: number): number => {
    if (targetWpm <= 150) return 0.8;
    if (targetWpm <= 300) return 1.5;
    if (targetWpm <= 450) return 3.2;
    // Scaled exponential curve to break through standard engine limits up to 600+ WPM
    return 5.0 + ((targetWpm - 450) / 50); 
  };

  const setWpm = (newWpm: number) => {
    setWpmState(newWpm);
    wpmRef.current = newWpm;

    if (isPlaying) {
      if (isMobileDevice()) {
        if (timerRef.current) clearInterval(timerRef.current);
        const msPerWord = (60 / newWpm) * 1000;
        timerRef.current = setInterval(() => {
          const nextIndex = currentIndexRef.current + 1;
          if (nextIndex >= wordsRef.current.length) {
            pause();
            setCurrentIndex(wordsRef.current.length - 1);
          } else {
            setCurrentIndex(nextIndex);
            if (nextIndex % 6 === 0) speakMobileChunk(nextIndex);
          }
        }, msPerWord);
        speakMobileChunk(currentIndexRef.current);
      } else {
        if (synthRef.current) {
          synthRef.current.cancel(); 
          executeLaptopPlay(); 
        }
      }
    }
  };

  const isMobileDevice = () => {
    if (typeof window === "undefined") return false;
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  };

  const play = () => {
    if (!synthRef.current || wordsRef.current.length === 0) return;
    cleanup();
    setIsPlaying(true);

    if (isMobileDevice()) {
      const msPerWord = (60 / wpmRef.current) * 1000;
      timerRef.current = setInterval(() => {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= wordsRef.current.length) {
          pause();
          setCurrentIndex(wordsRef.current.length - 1);
        } else {
          setCurrentIndex(nextIndex);
          if (nextIndex % 6 === 0) speakMobileChunk(nextIndex);
        }
      }, msPerWord);
      speakMobileChunk(currentIndexRef.current);
    } else {
      executeLaptopPlay();
    }
  };

  const executeLaptopPlay = () => {
    if (!synthRef.current) return;
    
    const remainingWords = wordsRef.current.slice(currentIndexRef.current);
    const fullTextString = remainingWords.join(" ");
    
    const utterance = new SpeechSynthesisUtterance(fullTextString);
    
    // Applying the updated rate curve
    utterance.rate = getCalculatedRate(wpmRef.current);

    let baseIndex = currentIndexRef.current;
    let lastWordCharPos = -1;
    let wordsCounted = 0;

    utterance.onboundary = (event) => {
      if (event.name === "word") {
        if (event.charIndex !== lastWordCharPos) {
          const visualIndex = baseIndex + wordsCounted;
          if (visualIndex < wordsRef.current.length) {
            setCurrentIndex(visualIndex);
            wordsCounted++;
          }
          lastWordCharPos = event.charIndex;
        }
      }
    };

    utterance.onend = () => {
      if (synthRef.current && !synthRef.current.speaking) {
        setIsPlaying(false);
      }
    };
    
    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const speakMobileChunk = (startIndex: number) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const chunk = wordsRef.current.slice(startIndex, startIndex + 15).join(" ");
    if (!chunk.trim()) return;
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.rate = getCalculatedRate(wpmRef.current);
    synthRef.current.speak(utterance);
  };

  const pause = () => {
    cleanup();
    setIsPlaying(false);
  };

  const streamEpub = async (file: File) => {
    setIsProcessing(true);
    setWords([]);
    setCurrentIndex(0);
    cleanup();
    setIsPlaying(false);
    
    // CHROME FIX: Prime Chrome's audio engine inside this click gesture event loop
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const primingUtterance = new SpeechSynthesisUtterance("");
      window.speechSynthesis.speak(primingUtterance);
    }
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8090/api/v1/parse-epub-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);
          if (parsed.done) break;
          setWords((prev) => [...prev, ...parsed.words]);
        }
      }
    } catch (err) {
      console.error("Streaming connection dropped:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    words,
    currentIndex,
    isPlaying,
    isProcessing,
    wpm,
    setWpm,
    streamEpub,
    play,
    pause,
    setCurrentIndex,
  };
}