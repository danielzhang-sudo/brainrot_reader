"use client";

import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import { useSpeechPlayer } from "@/hooks/useSpeechPlayer";

interface ChapterItem {
  index: number;
  id: string;
  title: string;
}

export default function LibraryReaderPage() {
  const player = useSpeechPlayer();
  const { words, currentIndex, isPlaying, isProcessing, wpm, setWpm, selectedBook, currentChapterIdx } = player;

  // Frontend UI Workspace Controllers
  const [useAnchor, setUseAnchor] = useState<boolean>(true);
  const [useTTS, setUseTTS] = useState<boolean>(true);
  const [showLibrary, setShowLibrary] = useState<boolean>(false);
  
  const [booksList, setBooksList] = useState<string[]>([]);
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>([]);

  const visualTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref wrappers for pure visual loops
  const localRefState = useRef({ currentIndex, words, isPlaying, useTTS, wpm });
  useEffect(() => {
    localRefState.current = { currentIndex, words, isPlaying, useTTS, wpm };
  }, [currentIndex, words, isPlaying, useTTS, wpm]);

  // Handle Fetch Operations
  const refreshLibraryList = async () => {
    try {
      const res = await fetch("http://localhost:8090/api/v1/library/books");
      const data = await res.json();
      setBooksList(data.books || []);
    } catch (e) { console.error("Error accessing server book index:", e); }
  };

  const loadBookMetadata = async (bookName: string) => {
    try {
      const res = await fetch(`http://localhost:8090/api/v1/library/chapters?book=${encodeURIComponent(bookName)}`);
      const data = await res.json();
      setChaptersList(data.chapters || []);
      player.setTotalChaptersCount(data.chapters?.length || 0);
      
      // Auto pre-load initial chapter
      if (data.chapters && data.chapters.length > 0) {
        await player.fetchChapterStream(bookName, 0);
      }
    } catch (e) { console.error("Error formatting chapter details:", e); }
  };

  const handleLibraryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
      await fetch("http://localhost:8090/api/v1/library/upload", { method: "POST", body: formData });
      await refreshLibraryList();
    } catch (err) { console.error("Upload interface failure:", err); }
  };

  // AUTOMATED NEXT-CHAPTER NAVIGATION ROUTER
  const loadNextSequentialChapter = async () => {
    if (!selectedBook) return;
    const nextIdx = currentChapterIdx + 1;
    if (nextIdx < chaptersList.length) {
      await player.fetchChapterStream(selectedBook, nextIdx);
      // Continuous Auto Play across chapter gaps
      setTimeout(() => player.play(useTTS), 400);
    } else {
      alert("End of book structure reached!");
    }
  };

  const loadPreviousSequentialChapter = async () => {
    if (!selectedBook) return;
    const prevIdx = currentChapterIdx - 1;
    if (prevIdx >= 0) {
      await player.fetchChapterStream(selectedBook, prevIdx);
    }
  };

  // Assign hook triggers
  useEffect(() => {
    player.onChapterFinishedRef.current = loadNextSequentialChapter;
    refreshLibraryList();
  }, [selectedBook, currentChapterIdx, chaptersList, useTTS]);

  // Pure Visual Execution Engine Hook
  useEffect(() => {
    if (visualTimerRef.current) clearInterval(visualTimerRef.current);
    if (isPlaying && !useTTS) {
      const startTimer = () => {
        const msPerWord = (60 / localRefState.current.wpm) * 1000;
        visualTimerRef.current = setInterval(() => {
          const { currentIndex: sIdx, words: sWords } = localRefState.current;
          const nextIndex = sIdx + 1;
          if (nextIndex >= sWords.length) {
            clearInterval(visualTimerRef.current!);
            loadNextSequentialChapter();
          } else {
            player.setCurrentIndex(nextIndex);
          }
        }, msPerWord);
      };
      startTimer();
    }
    return () => { if (visualTimerRef.current) clearInterval(visualTimerRef.current); };
  }, [isPlaying, useTTS]);

  const togglePlaybackState = () => {
    if (isPlaying) {
      if (visualTimerRef.current) clearInterval(visualTimerRef.current);
      player.pause();
    } else {
      player.play(useTTS);
    }
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

    return (
      <div className="flex w-full text-5xl font-black drop-shadow-md select-none" style={{ fontFamily: "Courier New, monospace", textRendering: "geometricPrecision" }}>
        <div className="w-[45%] text-right text-white/80 pr-[1px] whitespace-pre">{left}</div>
        <div className="w-[10%] text-center text-red-500">{middle}</div>
        <div className="w-[45%] text-left text-white/80 pl-[1px] whitespace-pre">{right}</div>
      </div>
    );
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden flex flex-col justify-between bg-black text-white">
      
      {/* BACKGROUND SCENIC CANVAS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-tr from-purple-900/40 via-transparent to-black" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <header className="relative z-10 w-full px-6 pt-6 flex items-center justify-between border-b border-white/5 pb-4 bg-black/40 backdrop-blur-md">
        <button onClick={() => setShowLibrary(true)} className="bg-white/10 px-4 py-2 text-xs font-bold rounded-full border border-white/10 hover:bg-white/20 transition">
          📚 Library
        </button>
        <div className="text-center max-w-[50%] truncate">
          <p className="text-xs font-black tracking-tight uppercase truncate text-purple-400">{selectedBook || "No Book Active"}</p>
          {chaptersList.length > 0 && (
            <p className="text-[10px] font-mono text-white/40 truncate">Ch. {currentChapterIdx + 1} of {chaptersList.length}</p>
          )}
        </div>
        <label className="bg-purple-600 px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-purple-500 transition">
          Upload
          <input type="file" accept=".epub" onChange={handleLibraryUpload} className="hidden" />
        </label>
      </header>

      {/* MAIN TEXT OVERLAY VIEWPORT */}
      <section className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4">
        {words.length > 0 ? (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {useAnchor && <div className="w-8 border-t border-white/20 h-1 mb-4" />}
            <div className="w-full h-16 flex justify-center items-center">
              {useAnchor ? renderWordWithAnchor(words[currentIndex]) : (
                <span className="text-5xl font-black tracking-tight">{words[currentIndex]}</span>
              )}
            </div>
            {useAnchor && <div className="w-8 border-t border-white/20 h-1 mt-4" />}
            <p className="text-[10px] font-mono text-white/30 mt-6 tracking-widest uppercase">{currentIndex + 1} / {words.length} WORDS</p>
          </div>
        ) : (
          <p className="text-sm text-white/40 max-w-xs text-center font-medium bg-white/5 p-6 rounded-xl border border-white/5">
            {isProcessing ? "Assembling text streams..." : "Open the library menu panel to designate active reading targets."}
          </p>
        )}
      </section>

      {/* FOOTER CORE INTERFACE CONTROL MECHANICS */}
      <footer className="relative z-10 w-full px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-4">
        
        {/* CHAPTER DIRECTIONAL NAV BOARD */}
        <div className="flex items-center justify-between bg-white/5 p-1 rounded-xl border border-white/5">
          <button onClick={loadPreviousSequentialChapter} disabled={!selectedBook || currentChapterIdx === 0} className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20">
            ⏮ Prev Chapter
          </button>
          <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">Chapter Routing</span>
          <button onClick={loadNextSequentialChapter} disabled={!selectedBook || currentChapterIdx >= chaptersList.length - 1} className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20">
            Next Chapter ⏭
          </button>
        </div>

        {/* TOGGLE MATRIX SLIDERS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-xs font-bold text-white/80">ORP Anchor</span>
            <button onClick={() => setUseAnchor(!useAnchor)} className={`w-8 h-4 rounded-full p-0.5 transition ${useAnchor ? "bg-purple-500 flex justify-end" : "bg-white/10 flex justify-start"}`}>
              <div className="bg-white w-3 h-3 rounded-full" />
            </button>
          </div>
          <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-xs font-bold text-white/80">TTS Voice</span>
            <button onClick={() => { player.pause(); setUseTTS(!useTTS); }} className={`w-8 h-4 rounded-full p-0.5 transition ${useTTS ? "bg-purple-500 flex justify-end" : "bg-white/10 flex justify-start"}`}>
              <div className="bg-white w-3 h-3 rounded-full" />
            </button>
          </div>
        </div>

        {/* SPEED RANGE SELECTOR */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center text-[10px] font-bold text-white/40 tracking-wider uppercase font-mono">
            <span>VELOCITY RATE</span>
            <span className="text-purple-400 font-black">{wpm} WPM</span>
          </div>
          <input type="range" min="100" max="600" step="25" value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full accent-purple-500 bg-white/10 h-1 rounded-md appearance-none" />
        </div>

        {/* MASTER INTERACTION ACTIVATOR */}
        <div className="w-full flex justify-center pt-2">
          <button onClick={togglePlaybackState} disabled={words.length === 0} className={`w-16 h-16 rounded-full font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-20 ${isPlaying ? "bg-white text-black" : "bg-gradient-to-tr from-purple-600 to-pink-500 text-white"}`}>
            {isPlaying ? "⏸" : "▶"}
          </button>
        </div>
      </footer>

      {/* FLYOUT OVERLAY COMPONENT: EBOOK STORAGE MANAGEMENT LIBRARY */}
      {showLibrary && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h2 className="text-lg font-black tracking-tight text-purple-400 uppercase">Epub Storage Vault</h2>
            <button onClick={() => setShowLibrary(false)} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">
              ✕ Close
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
            {/* LEFT COMPONENT COLUMN: BOOKS DIRECTORIES LIST */}
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 border-r border-white/5">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">Select Book</span>
              {booksList.length === 0 ? <p className="text-xs text-white/30 italic">No books in archive.</p> : 
                booksList.map((book) => (
                  <button key={book} onClick={() => loadBookMetadata(book)} className={`text-left text-xs p-3 rounded-lg border font-medium truncate transition ${selectedBook === book ? "bg-purple-600/20 border-purple-500 text-white" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"}`}>
                    📖 {book}
                  </button>
              ))}
            </div>

            {/* RIGHT COMPONENT COLUMN: CHAPTER INDEX TRACKING MATRIX */}
            <div className="flex flex-col gap-2 overflow-y-auto pl-2">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">Select Chapter</span>
              {chaptersList.length === 0 ? <p className="text-xs text-white/30 italic">Select a book to view chapters.</p> : 
                chaptersList.map((ch) => (
                  <button key={ch.id} onClick={async () => { await player.fetchChapterStream(selectedBook!, ch.index); setShowLibrary(false); }} className={`text-left text-xs p-3 rounded-lg border font-mono truncate transition ${currentChapterIdx === ch.index ? "bg-purple-600/20 border-purple-500 text-white" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"}`}>
                    {(ch.index + 1).toString().padStart(2, '0')}. {ch.title}
                  </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}