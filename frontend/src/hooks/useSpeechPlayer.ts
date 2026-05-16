import { useState, useRef, useEffect } from "react";

export function useSpeechPlayer() {
  const [words, setWords] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [wpm, setWpmState] = useState<number>(250);
  
  // Library Focus Navigation States
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [currentChapterIdx, setCurrentChapterIdx] = useState<number>(0);
  const [totalChaptersCount, setTotalChaptersCount] = useState<number>(0);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const wpmRef = useRef<number>(250);

  wordsRef.current = words;
  currentIndexRef.current = currentIndex;
  wpmRef.current = wpm;

  // Track boundary triggers for internal auto-advance routing
  const onChapterFinishedRef = useRef<(() => void) | null>(null);

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

  // --- CRITICAL HIGH-SPEED EXPONENTIAL MULTIPLIER ---
  // Overrides native browser limits to force real 500+ WPM pacing
  const getCalculatedRate = (targetWpm: number): number => {
    if (targetWpm <= 150) return 0.8;
    if (targetWpm <= 300) return 1.5;
    if (targetWpm <= 450) return 3.2;
    // Exponentially scale multiplier to bust through native caps
    return 5.0 + ((targetWpm - 450) / 40); 
  };

  const setWpm = (newWpm: number) => {
    setWpmState(newWpm);
    wpmRef.current = newWpm;
    if (isPlaying) {
      if (isMobileDevice()) {
        if (timerRef.current) clearInterval(timerRef.current);
        const msPerWord = (60 / newWpm) * 1000;
        timerRef.current = setInterval(runMobileTimerTick, msPerWord);
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

  const runMobileTimerTick = () => {
    const nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= wordsRef.current.length) {
      handleChapterCompletion();
    } else {
      setCurrentIndex(nextIndex);
      if (nextIndex % 6 === 0) speakMobileChunk(nextIndex);
    }
  };

  const handleChapterCompletion = () => {
    cleanup();
    setIsPlaying(false);
    if (onChapterFinishedRef.current) {
      onChapterFinishedRef.current();
    }
  };

  const play = (useTTS: boolean = true) => {
    if (wordsRef.current.length === 0) return;
    cleanup();
    setIsPlaying(true);

    if (!useTTS) return; 

    if (isMobileDevice()) {
      const msPerWord = (60 / wpmRef.current) * 1000;
      timerRef.current = setInterval(runMobileTimerTick, msPerWord);
      speakMobileChunk(currentIndexRef.current);
    } else {
      executeLaptopPlay();
    }
  };

  const executeLaptopPlay = () => {
    if (!synthRef.current) return;
    const remainingText = wordsRef.current.slice(currentIndexRef.current).join(" ");
    if (!remainingText.trim()) return;
    
    const utterance = new SpeechSynthesisUtterance(remainingText);
    
    // FIXED: Now accurately using the non-linear high-speed curve calculation mapping
    utterance.rate = getCalculatedRate(wpmRef.current);

    let baseIndex = currentIndexRef.current;
    let lastWordCharPos = -1;
    let wordsCounted = 0;

    utterance.onboundary = (event) => {
      if (event.name === "word" && event.charIndex !== lastWordCharPos) {
        const visualIndex = baseIndex + wordsCounted;
        if (visualIndex < wordsRef.current.length) {
          setCurrentIndex(visualIndex);
          wordsCounted++;
        }
        lastWordCharPos = event.charIndex;
      }
    };

    utterance.onend = () => {
      if (synthRef.current && !synthRef.current.speaking && isPlaying) {
        handleChapterCompletion();
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
    
    // FIXED: Ensured mobile short chunks scale with the high-speed multiplier as well
    utterance.rate = getCalculatedRate(wpmRef.current);
    synthRef.current.speak(utterance);
  };

  const pause = () => {
    cleanup();
    setIsPlaying(false);
  };

  const fetchChapterStream = async (bookName: string, chapterIdx: number) => {
    setIsProcessing(true);
    setWords([]);
    setCurrentIndex(0);
    cleanup();
    setIsPlaying(false);

    try {
      const response = await fetch(
        `http://localhost:8090/api/v1/library/stream-chapter?book=${encodeURIComponent(bookName)}&chapter_index=${chapterIdx}`
      );
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
      setSelectedBook(bookName);
      setCurrentChapterIdx(chapterIdx);
    } catch (err) {
      console.error("Failed downloading chunk segments:", err);
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
    selectedBook,
    currentChapterIdx,
    totalChaptersCount,
    setTotalChaptersCount,
    fetchChapterStream,
    play,
    pause,
    setCurrentIndex,
    setIsPlaying,
    onChapterFinishedRef
  };
}