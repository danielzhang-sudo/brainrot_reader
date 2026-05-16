"use client";

import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import { useSpeechPlayer } from "@/hooks/useSpeechPlayer";

export default function MobileReaderPage() {
  const {
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
  } = useSpeechPlayer();

  // Configuration States
  const [useAnchor, setUseAnchor] = useState<boolean>(true);
  const [useTTS, setUseTTS] = useState<boolean>(true);

  // Pure Visual Mode Frame Timer Ref
  const visualTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef<number>(0);
  const wpmRef = useRef<number>(250);

  wordsRef.current = words;
  currentIndexRef.current = currentIndex;
  wpmRef.current = wpm;

  // Clear visual timers if the hook triggers a change or on component unmount
  useEffect(() => {
    return () => {
      if (visualTimerRef.current) clearInterval(visualTimerRef.current);
    };
  }, []);

  // Monitor playback state to run visual-only intervals when TTS is disabled
  useEffect(() => {
    if (visualTimerRef.current) clearInterval(visualTimerRef.current);

    if (isPlaying && !useTTS) {
      const msPerWord = (60 / wpmRef.current) * 1000;
      visualTimerRef.current = setInterval(() => {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= wordsRef.current.length) {
          handlePause();
          setCurrentIndex(wordsRef.current.length - 1);
        } else {
          setCurrentIndex(nextIndex);
        }
      }, msPerWord);
    }
  }, [isPlaying, useTTS]);

  // Adjust live visual loops instantly if speed slider moves during non-TTS reading
  useEffect(() => {
    if (isPlaying && !useTTS && visualTimerRef.current) {
      clearInterval(visualTimerRef.current);
      const msPerWord = (60 / wpm) * 1000;
      visualTimerRef.current = setInterval(() => {
        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= wordsRef.current.length) {
          handlePause();
          setCurrentIndex(wordsRef.current.length - 1);
        } else {
          setCurrentIndex(nextIndex);
        }
      }, msPerWord);
    }
  }, [wpm]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePause();
      await streamEpub(e.target.files[0]);
    }
  };

  const handlePlay = () => {
    if (words.length === 0) return;
    if (useTTS) {
      play(); // Hand over control execution to the hybrid audio sync engine
    } else {
      // Manual state override toggle to kick off pure visual reader loop
      // The local useEffect handles the tracking clock execution automatically
      const mockPlayEvent = document.createEvent("Event");
      mockPlayEvent.initEvent("play", true, true);
      // Directly adjust speech engine states safely
      play(); 
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  };

  const handlePause = () => {
    if (visualTimerRef.current) clearInterval(visualTimerRef.current);
    pause();
  };

  const renderWordWithAnchor = (word: string) => {
    if (!word) return null;
    
    let anchorIdx = 1;
    if (word.length <= 1) anchorIdx = 0;
    else if (word.length >= 6 && word.length <= 9) anchorIdx = 2;
    else if (word.length >= 10 && word.length <= 13) anchorIdx = 3;
    else if (word.length > 13) anchorIdx = 4;

    const left = word.substring(0, anchorIdx);
    const middle = word.charAt(anchorIdx);
    const right = word.substring(anchorIdx + 1);

    const rigidMonoStyle: React.CSSProperties = {
      fontFamily: "Courier New, Courier, monospace",
      fontVariantNumeric: "tabular-nums",
      textRendering: "geometricPrecision",
      letterSpacing: "0px",
    };

    return (
      <div 
        className="flex w-full text-5xl md:text-6xl font-black drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] select-none"
        style={rigidMonoStyle}
      >
        <div className="w-[45%] text-right text-white/80 pr-[1px] whitespace-pre">
          {left}
        </div>
        <div className="w-[10%] text-center text-red-500">
          {middle}
        </div>
        <div className="w-[45%] text-left text-white/80 pl-[1px] whitespace-pre">
          {right}
        </div>
      </div>
    );
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden flex flex-col justify-between p-safe-top p-safe-bottom bg-black">
      
      {/* 1. BACKGROUND BACKGROUND VIDEO LAYER */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30 scale-105 will-change-transform"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-41857-large.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-70" />
      </div>

      {/* 2. TOP PANEL HEADER */}
      <header className="relative z-10 w-full px-6 pt-8 flex items-center justify-between">
        <h1 className="text-xl font-black tracking-tighter uppercase bg-clip-text text-gradient bg-gradient-to-r from-purple-400 to-pink-500">
          Brainrot RSVP
        </h1>
        
        <label className="bg-white/10 hover:bg-white/20 active:scale-95 transition backdrop-blur-md text-xs font-bold px-4 py-2 rounded-full border border-white/20 cursor-pointer">
          {isProcessing ? "Parsing Chunks..." : "Upload ePub"}
          <input
            type="file"
            accept=".epub"
            onChange={handleFileUpload}
            disabled={isProcessing}
            className="hidden"
          />
        </label>
      </header>

      {/* 3. CENTER OVERLAY SCREEN PORT */}
      <section className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4">
        {words.length > 0 ? (
          <div className="w-full max-w-md flex flex-col items-center">
            
            {useAnchor && (
              <div className="w-[10%] border-t border-b border-white/20 h-2 mb-4 animate-pulse" />
            )}

            <div className="w-full flex justify-center items-center h-20">
              {useAnchor ? (
                renderWordWithAnchor(words[currentIndex])
              ) : (
                <span className="text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  {words[currentIndex]}
                </span>
              )}
            </div>

            {useAnchor && (
              <div className="w-[10%] border-t border-b border-white/20 h-2 mt-4 animate-pulse" />
            )}

            <div className="text-xs text-white/40 mt-8 tracking-widest font-mono uppercase">
              {currentIndex + 1} / {words.length} words
            </div>
          </div>
        ) : (
          <div className="text-center max-w-xs px-6 py-8 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-xl">
            <p className="text-sm text-white/60 leading-relaxed font-medium">
              Feed an ePub book into the parsing engine above to initiate background streaming.
            </p>
          </div>
        )}
      </section>

      {/* 4. BASE CONTROL CONTROLS DECK */}
      <footer className="relative z-10 w-full px-6 pb-12 pt-6 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-4">
        
        {/* Toggle Options Row Configuration Matrix */}
        <div className="grid grid-cols-2 gap-3 w-full">
          
          {/* Toggle Block A: Anchor Focus Point */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">ORP Anchor</span>
              <span className="text-[9px] text-white/40 font-mono">Lock focus</span>
            </div>
            <button
              onClick={() => setUseAnchor(!useAnchor)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 duration-300 cursor-pointer ${
                useAnchor ? "bg-purple-500 justify-end" : "bg-white/10 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
            </button>
          </div>

          {/* Toggle Block B: Audio Engine Switch (TTS Activation Control) */}
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Voice Audio</span>
              <span className="text-[9px] text-white/40 font-mono">TTS Voice</span>
            </div>
            <button
              onClick={() => {
                handlePause();
                setUseTTS(!useTTS);
              }}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 duration-300 cursor-pointer ${
                useTTS ? "bg-purple-500 justify-end" : "bg-white/10 justify-start"
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-sm" />
            </button>
          </div>

        </div>

        {/* Speed Slider Component */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <div className="flex justify-between items-center text-xs font-bold text-white/70 tracking-wide uppercase font-mono px-1">
            <span>Playback Speed</span>
            <span className="text-purple-400 text-sm font-black">{wpm} WPM</span>
          </div>
          <input
            type="range"
            min="100"
            max="600"
            step="25"
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="w-full h-2 rounded-lg bg-white/10 appearance-none cursor-pointer accent-purple-500 outline-none transition"
          />
        </div>

        {/* Action Trigger Deck */}
        <div className="w-full flex justify-center mt-2">
          {isPlaying ? (
            <button
              onClick={handlePause}
              className="w-20 h-20 rounded-full bg-white text-black font-black text-xl flex items-center justify-center active:scale-90 shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-150"
            >
              ⏸
            </button>
          ) : (
            <button
              onClick={handlePlay}
              disabled={words.length === 0}
              className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 text-white font-black text-xl flex items-center justify-center active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-150"
            >
              ▶
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}