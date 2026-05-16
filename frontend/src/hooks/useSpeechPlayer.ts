import { useState, useRef, useEffect } from "react";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8090`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090");

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

  // Voice selection state
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null);

  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const wpmRef = useRef<number>(250);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  wordsRef.current = words;
  currentIndexRef.current = currentIndex;
  wpmRef.current = wpm;
  selectedVoiceRef.current = selectedVoice;

  const onChapterFinishedRef = useRef<(() => void) | null>(null);

  const loadVoices = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;
    setAvailableVoices(voices);
    if (!selectedVoiceRef.current) {
      const defaultVoice = voices.find((v) => v.default) || voices[0];
      setSelectedVoiceState(defaultVoice);
      selectedVoiceRef.current = defaultVoice;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => cleanup();
  }, []);

  const setSelectedVoice = (voice: SpeechSynthesisVoice | null) => {
    setSelectedVoiceState(voice);
    selectedVoiceRef.current = voice;
    if (isPlaying && synthRef.current) {
      synthRef.current.cancel();
      if (isMobileDevice()) {
        speakMobileChunk(currentIndexRef.current);
      } else {
        executeLaptopPlay();
      }
    }
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (synthRef.current) synthRef.current.cancel();
  };

  const getCalculatedRate = (targetWpm: number): number => {
    if (targetWpm <= 150) return 0.8;
    if (targetWpm <= 300) return 1.5;
    if (targetWpm <= 450) return 3.2;
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
    utterance.rate = getCalculatedRate(wpmRef.current);
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }

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
    utterance.rate = getCalculatedRate(wpmRef.current);
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }
    synthRef.current.speak(utterance);
  };

  const pause = () => {
    cleanup();
    setIsPlaying(false);
  };

  const rewind = (useTTS: boolean = true) => {
    const wordStep = Math.max(15, Math.round((wpmRef.current / 60) * 4));
    const newIndex = Math.max(0, currentIndexRef.current - wordStep);
    
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    syncNavigationSeek(newIndex, useTTS);
  };

  const fastForward = (useTTS: boolean = true) => {
    const wordStep = Math.max(15, Math.round((wpmRef.current / 60) * 4));
    const maxIndex = wordsRef.current.length - 1;
    const newIndex = Math.min(maxIndex, currentIndexRef.current + wordStep);
    
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    syncNavigationSeek(newIndex, useTTS);
  };

  const seekToPercent = (percent: number, useTTS: boolean = true) => {
    if (wordsRef.current.length === 0) return;
    const targetIdx = Math.max(0, Math.min(wordsRef.current.length - 1, Math.round((percent / 100) * wordsRef.current.length)));
    
    currentIndexRef.current = targetIdx;
    setCurrentIndex(targetIdx);
    syncNavigationSeek(targetIdx, useTTS);
  };

  const syncNavigationSeek = (targetIndex: number, useTTS: boolean) => {
    if (isPlaying) {
      cleanup();
      if (!useTTS) return;
      
      if (isMobileDevice()) {
        const msPerWord = (60 / wpmRef.current) * 1000;
        timerRef.current = setInterval(runMobileTimerTick, msPerWord);
        speakMobileChunk(targetIndex);
      } else {
        executeLaptopPlay();
      }
    }
  };

  const fetchChapterStream = async (bookName: string, chapterIdx: number) => {
    setIsProcessing(true);
    setWords([]);
    setCurrentIndex(0);
    cleanup();
    setIsPlaying(false);

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/library/stream-chapter?book=${encodeURIComponent(bookName)}&chapter_index=${chapterIdx}`
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
    availableVoices,
    selectedVoice,
    setSelectedVoice,
    fetchChapterStream,
    play,
    pause,
    rewind,
    fastForward,
    seekToPercent,
    setCurrentIndex,
    setIsPlaying,
    onChapterFinishedRef
  };
}