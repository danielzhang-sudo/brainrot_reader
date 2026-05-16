"use client";

import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import { useSpeechPlayer } from "@/hooks/useSpeechPlayer";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8090`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090");

interface ChapterItem {
  index: number;
  id: string;
  title: string;
}

export default function LibraryReaderPage() {
  const player = useSpeechPlayer();
  const { words, currentIndex, isPlaying, isProcessing, wpm, setWpm, selectedBook, currentChapterIdx, availableVoices, selectedVoice, setSelectedVoice } = player;

  const music = useMusicPlayer();
  const { tracks, currentTrack, isPlaying: musicIsPlaying, volume, isLooping, isLoading: musicIsLoading, setIsLooping, setVolume, loadTrack, togglePlay: toggleMusic, refreshTracks, uploadTrack, addYoutubeTrack, deleteTrack } = music;

  // Frontend Configuration Controllers
  const [useAnchor, setUseAnchor] = useState<boolean>(true);
  const [useTTS, setUseTTS] = useState<boolean>(true);
  const [showLibrary, setShowLibrary] = useState<boolean>(false);
  const [showMusic, setShowMusic] = useState<boolean>(false);

  const [booksList, setBooksList] = useState<string[]>([]);
  const [chaptersList, setChaptersList] = useState<ChapterItem[]>([]);

  // Hover Tooltip States
  const [hoverText, setHoverText] = useState<string>("");
  const [hoverX, setHoverX] = useState<number>(0);
  const [hoverY, setHoverY] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const visualTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const localRefState = useRef({ currentIndex, words, isPlaying, useTTS, wpm });
  useEffect(() => {
    localRefState.current = { currentIndex, words, isPlaying, useTTS, wpm };
  }, [currentIndex, words, isPlaying, useTTS, wpm]);

  const refreshLibraryList = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/library/books`);
      const data = await res.json();
      setBooksList(data.books || []);
    } catch (e) { console.error("Error accessing server book index:", e); }
  };

  const loadBookMetadata = async (bookName: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/library/chapters?book=${encodeURIComponent(bookName)}`);
      const data = await res.json();
      setChaptersList(data.chapters || []);
      player.setTotalChaptersCount(data.chapters?.length || 0);

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
      await fetch(`${API_BASE}/api/v1/library/upload`, { method: "POST", body: formData });
      await refreshLibraryList();
    } catch (err) { console.error("Upload interface failure:", err); }
  };

  const loadNextSequentialChapter = async () => {
    if (!selectedBook) return;
    const nextIdx = currentChapterIdx + 1;
    if (nextIdx < chaptersList.length) {
      await player.fetchChapterStream(selectedBook, nextIdx);
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

  useEffect(() => {
    player.onChapterFinishedRef.current = loadNextSequentialChapter;
    refreshLibraryList();
    refreshTracks();
  }, [selectedBook, currentChapterIdx, chaptersList, useTTS]);

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

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || words.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    
    const targetWordIdx = Math.round((percentage / 100) * (words.length - 1));
    const previewSnippet = words.slice(Math.max(0, targetWordIdx - 3), Math.min(words.length, targetWordIdx + 4)).join(" ");
    
    setHoverText(`"${previewSnippet}..."`);
    setHoverX(e.clientX);
    // Align dynamically to the absolute top of the tracked element box boundaries
    setHoverY(rect.top - window.scrollY);
    setShowTooltip(true);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || words.length === 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    player.seekToPercent(percentage, useTTS);
  };

  const currentPercentage = words.length > 0 ? (currentIndex / (words.length - 1)) * 100 : 0;

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
      <div className="flex w-full text-3xl sm:text-4xl md:text-5xl font-black drop-shadow-md select-none" style={{ fontFamily: "Courier New, monospace", textRendering: "geometricPrecision" }}>
        <div className="w-[45%] text-right text-white/80 pr-[1px] whitespace-pre">{left}</div>
        <div className="w-[10%] text-center text-red-500">{middle}</div>
        <div className="w-[45%] text-left text-white/80 pl-[1px] whitespace-pre">{right}</div>
      </div>
    );
  };

  return (
    <main className="relative w-full h-dvh overflow-hidden flex flex-col justify-between bg-black text-white">
      
      {/* SCENIC BACKGROUND CANVAS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-tr from-purple-900/40 via-transparent to-black" />
      </div>

      {/* TOP HEADER CONTROLS */}
      <header className="relative z-10 w-full px-6 pt-6 flex items-center justify-between border-b border-white/5 pb-4 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button onClick={() => { setShowMusic(false); setShowLibrary(true); }} className="bg-white/10 px-4 py-2 text-xs font-bold rounded-full border border-white/10 hover:bg-white/20 transition">
            📚 Library
          </button>
          <button onClick={() => { setShowLibrary(false); setShowMusic(true); }} className="bg-white/10 px-3 py-2 text-xs font-bold rounded-full border border-white/10 hover:bg-white/20 transition">
            🎵
          </button>
        </div>
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
            <div className="w-full h-12 sm:h-14 md:h-16 flex justify-center items-center">
              {useAnchor ? renderWordWithAnchor(words[currentIndex]) : (
                <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">{words[currentIndex]}</span>
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

      {/* FLOATING HOVER PREVIEW TEXT TOOLTIP */}
      {showTooltip && words.length > 0 && (
        <div 
          className="fixed z-50 bg-purple-950/95 text-white border border-purple-500/50 text-xs px-3 py-2 rounded-xl pointer-events-none max-w-xs shadow-xl backdrop-blur-md -translate-x-1/2 -translate-y-[115%]"
          style={{ left: `${hoverX}px`, top: `${hoverY}px` }}
        >
          <p className="font-sans leading-relaxed text-center text-purple-200">{hoverText}</p>
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-purple-950 border-r border-b border-purple-500/50 rotate-45" />
        </div>
      )}

      {/* CORE INTERFACE CONTROL MECHANICS */}
      <footer className="relative z-10 w-full px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-4">
        
        {/* CHAPTER NAVIGATION BAR */}
        <div className="flex items-center justify-between bg-white/5 p-1 rounded-xl border border-white/5">
          <button onClick={loadPreviousSequentialChapter} disabled={!selectedBook || currentChapterIdx === 0} className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20">
            &lt; Chapter
          </button>
          <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">Chapters</span>
          <button onClick={loadNextSequentialChapter} disabled={!selectedBook || currentChapterIdx >= chaptersList.length - 1} className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20">
            Chapter &gt;
          </button>
        </div>

        {/* TOGGLE MATRIX DECK */}
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

        {/* VOICE SELECTOR */}
        {useTTS && availableVoices.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between items-center text-[10px] font-bold text-white/40 tracking-wider uppercase font-mono">
              <span>TTS Voice</span>
              <span className="text-purple-400 font-black truncate max-w-[60%] text-right">{selectedVoice?.name || "Default"}</span>
            </div>
            <select
              value={selectedVoice?.voiceURI || ""}
              onChange={(e) => {
                const voice = availableVoices.find((v) => v.voiceURI === e.target.value) || null;
                setSelectedVoice(voice);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-purple-500 appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              {availableVoices.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI} className="bg-black text-white">
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* SPEED SELECTOR SLIDER */}
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center text-[10px] font-bold text-white/40 tracking-wider uppercase font-mono">
            <span>VELOCITY SPEED</span>
            <span className="text-purple-400 font-black">{wpm} WPM</span>
          </div>
          <input type="range" min="100" max="600" step="25" value={wpm} onChange={(e) => setWpm(Number(e.target.value))} className="w-full accent-purple-500 bg-white/10 h-1 rounded-md appearance-none" />
        </div>

        {/* DYNAMIC COMBINED TIMELINE & CONTROL UNIT BLOCK */}
        <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
          
          {/* TIMELINE PROGRESS ELEMENT (Now inside layout directly above tracking deck buttons) */}
          <div className="w-full flex flex-col gap-1">
            <div 
              ref={progressBarRef}
              onClick={handleProgressBarClick}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={() => setShowTooltip(false)}
              className="w-full h-2.5 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group border border-white/5 transition hover:h-3"
            >
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-100 ease-out"
                style={{ width: `${currentPercentage}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[8px] text-white/30 tracking-wider">
              <span>TRACKING TIMELINE</span>
              <span>{Math.round(currentPercentage)}% DONE</span>
            </div>
          </div>

          {/* PLAY/PAUSE, REWIND, FAST-FORWARD DECK BUTTONS */}
          <div className="w-full flex justify-center items-center gap-6">
            
            {/* REWIND */}
            <button
              onClick={() => player.rewind(useTTS)}
              disabled={words.length === 0 || currentIndex === 0}
              className="w-12 h-12 rounded-full font-mono text-xs font-black bg-white/10 text-white/70 border border-white/5 flex items-center justify-center transition active:scale-90 disabled:opacity-10 disabled:pointer-events-none hover:bg-white/20"
              title="Rewind 4 seconds"
            >
              -4s
            </button>

            {/* MAIN TOGGLE */}
            <button 
              onClick={togglePlaybackState} 
              disabled={words.length === 0} 
              className={`w-16 h-16 rounded-full font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-20 shadow-md ${
                isPlaying ? "bg-white text-black" : "bg-gradient-to-tr from-purple-600 to-pink-500 text-white"
              }`}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            {/* FAST-FORWARD */}
            <button
              onClick={() => player.fastForward(useTTS)}
              disabled={words.length === 0 || currentIndex >= words.length - 1}
              className="w-12 h-12 rounded-full font-mono text-xs font-black bg-white/10 text-white/70 border border-white/5 flex items-center justify-center transition active:scale-90 disabled:opacity-10 disabled:pointer-events-none hover:bg-white/20"
              title="Fast forward 4 seconds"
            >
              +4s
            </button>

          </div>
        </div>

      </footer>

      {/* FLYOUT OVERLAY COMPONENT: LIBRARY DIALOG CONTAINER */}
      {showLibrary && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h2 className="text-lg font-black tracking-tight text-purple-400 uppercase">Epub Vault Shelf</h2>
            <button onClick={() => setShowLibrary(false)} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">
              ✕ Close
            </button>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 border-r border-white/5">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">Select Book</span>
              {booksList.length === 0 ? <p className="text-xs text-white/30 italic">No books stored.</p> :
                booksList.map((book) => (
                  <button key={book} onClick={() => loadBookMetadata(book)} className={`text-left text-xs p-3 rounded-lg border font-medium truncate transition ${selectedBook === book ? "bg-purple-600/20 border-purple-500 text-white" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"}`}>
                    📖 {book}
                  </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pl-2">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">Select Chapter</span>
              {chaptersList.length === 0 ? <p className="text-xs text-white/30 italic">Pick a book.</p> :
                chaptersList.map((ch) => (
                  <button key={ch.id} onClick={async () => { await player.fetchChapterStream(selectedBook!, ch.index); setShowLibrary(false); }} className={`text-left text-xs p-3 rounded-lg border font-mono truncate transition ${currentChapterIdx === ch.index ? "bg-purple-600/20 border-purple-500 text-white" : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"}`}>
                    {(ch.index + 1).toString().padStart(2, '0')}. {ch.title}
                  </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MUSIC PANEL OVERLAY */}
      {showMusic && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h2 className="text-lg font-black tracking-tight text-purple-400 uppercase">Music Library</h2>
            <button onClick={() => setShowMusic(false)} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20">
              ✕ Close
            </button>
          </div>

          <div className="flex flex-col gap-4 overflow-hidden flex-1">
            {/* NOW PLAYING */}
            <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">Now Playing</span>
                <span className="text-xs font-medium text-white/80 truncate max-w-[60%]">{currentTrack?.title || "No track selected"}</span>
              </div>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={toggleMusic}
                  disabled={!currentTrack}
                  className="w-12 h-12 rounded-full font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-20 bg-gradient-to-tr from-pink-600 to-purple-500 text-white shadow-md"
                >
                  {musicIsPlaying ? "⏸" : "▶"}
                </button>
                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${isLooping ? "bg-purple-600/30 border-purple-500 text-purple-300" : "bg-white/5 border-white/10 text-white/40"}`}
                >
                  {isLooping ? "🔁 Loop On" : "Loop Off"}
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] font-mono text-white/40">
                  <span>Music Volume</span>
                  <span>{Math.round(volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full accent-pink-500 bg-white/10 h-1 rounded-md appearance-none"
                />
              </div>
            </div>

            {/* UPLOAD & YOUTUBE */}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center bg-white/5 rounded-xl p-3 border border-white/5 cursor-pointer hover:bg-white/10 transition">
                <span className="text-xs font-bold text-white/80 mb-1">Upload MP3</span>
                <span className="text-[10px] text-white/40">Click to browse</span>
                <input type="file" accept=".mp3" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadTrack(e.target.files[0]); e.target.value = ""; }} />
              </label>
              <div className="flex flex-col gap-2 bg-white/5 rounded-xl p-3 border border-white/5">
                <span className="text-xs font-bold text-white/80">YouTube URL</span>
                <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).elements.namedItem("yturl") as HTMLInputElement; if (input.value) { addYoutubeTrack(input.value); input.value = ""; } }} className="flex gap-2">
                  <input name="yturl" type="url" placeholder="paste link..." className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/80 focus:outline-none focus:border-purple-500" />
                  <button type="submit" disabled={musicIsLoading} className="bg-purple-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-purple-500 transition disabled:opacity-40">
                    {musicIsLoading ? "..." : "Add"}
                  </button>
                </form>
              </div>
            </div>

            {/* TRACK LIST */}
            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">Tracks ({tracks.length})</span>
              {tracks.length === 0 ? (
                <p className="text-xs text-white/30 italic">No tracks yet. Upload an MP3 or paste a YouTube link.</p>
              ) : (
                tracks.map((track) => (
                  <div key={track.id} className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5">
                    <button
                      onClick={() => { loadTrack(track.id); toggleMusic(); }}
                      className="flex-1 text-left text-xs font-medium truncate text-white/80 hover:text-white transition"
                    >
                      {track.source === "youtube" ? "▶ " : "🎵 "}{track.title}
                    </button>
                    <button
                      onClick={() => deleteTrack(track.id)}
                      className="text-[10px] font-bold text-red-400/70 hover:text-red-400 px-2 py-1 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}