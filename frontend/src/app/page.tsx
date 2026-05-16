"use client";

import React, { ChangeEvent, useState, useEffect, useRef } from "react";
import { useSpeechPlayer } from "@/hooks/useSpeechPlayer";
import { useMusicPlayer } from "@/hooks/useMusicPlayer";

import Header from "../components/Header";
import ReaderDisplay from "../components/ReaderDisplay";
import FooterControls from "../components/FooterControls";
import LibraryOverlay from "../components/LibraryOverlay";
import MusicOverlay from "../components/MusicOverlay";

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
  const {
    words,
    currentIndex,
    isPlaying,
    isProcessing,
    wpm,
    setWpm,
    selectedBook,
    currentChapterIdx,
    availableVoices,
    selectedVoice,
    setSelectedVoice,
  } = player;

  const music = useMusicPlayer();
  const {
    tracks,
    currentTrack,
    isPlaying: musicIsPlaying,
    volume,
    isLooping,
    isLoading: musicIsLoading,
    setIsLooping,
    setVolume,
    loadTrack,
    togglePlay: toggleMusic,
    refreshTracks,
    uploadTrack,
    addYoutubeTrack,
    deleteTrack,
  } = music;

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
    } catch (e) {
      console.error("Error accessing server book index:", e);
    }
  };

  const loadBookMetadata = async (bookName: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/library/chapters?book=${encodeURIComponent(bookName)}`
      );
      const data = await res.json();
      setChaptersList(data.chapters || []);
      player.setTotalChaptersCount(data.chapters?.length || 0);

      if (data.chapters && data.chapters.length > 0) {
        await player.fetchChapterStream(bookName, 0);
      }
    } catch (e) {
      console.error("Error formatting chapter details:", e);
    }
  };

  const handleLibraryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);

    try {
      await fetch(`${API_BASE}/api/v1/library/upload`, {
        method: "POST",
        body: formData,
      });
      await refreshLibraryList();
    } catch (err) {
      console.error("Upload interface failure:", err);
    }
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
    return () => {
      if (visualTimerRef.current) clearInterval(visualTimerRef.current);
    };
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
    const previewSnippet = words
      .slice(Math.max(0, targetWordIdx - 3), Math.min(words.length, targetWordIdx + 4))
      .join(" ");

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

  const currentPercentage =
    words.length > 0 ? (currentIndex / (words.length - 1)) * 100 : 0;

  return (
    <main className="relative w-full h-dvh overflow-hidden flex flex-col justify-between bg-black text-white">
      {/* SCENIC BACKGROUND CANVAS */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-tr from-purple-900/40 via-transparent to-black" />
      </div>

      <Header
        setShowMusic={setShowMusic}
        setShowLibrary={setShowLibrary}
        selectedBook={selectedBook}
        chaptersCount={chaptersList.length}
        currentChapterIdx={currentChapterIdx}
        handleLibraryUpload={handleLibraryUpload}
      />

      <ReaderDisplay
        words={words}
        currentIndex={currentIndex}
        useAnchor={useAnchor}
        isProcessing={isProcessing}
        showTooltip={showTooltip}
        hoverX={hoverX}
        hoverY={hoverY}
        hoverText={hoverText}
      />

      <FooterControls
        selectedBook={selectedBook}
        currentChapterIdx={currentChapterIdx}
        chaptersCount={chaptersList.length}
        loadPreviousSequentialChapter={loadPreviousSequentialChapter}
        loadNextSequentialChapter={loadNextSequentialChapter}
        useAnchor={useAnchor}
        setUseAnchor={setUseAnchor}
        useTTS={useTTS}
        setUseTTS={(useVal) => {
          player.pause();
          setUseTTS(useVal);
        }}
        availableVoices={availableVoices}
        selectedVoice={selectedVoice}
        setSelectedVoice={setSelectedVoice}
        wpm={wpm}
        setWpm={setWpm}
        currentPercentage={currentPercentage}
        progressBarRef={progressBarRef}
        handleProgressBarClick={handleProgressBarClick}
        handleProgressBarMouseMove={handleProgressBarMouseMove}
        setShowTooltip={setShowTooltip}
        togglePlaybackState={togglePlaybackState}
        isPlaying={isPlaying}
        wordsLength={words.length}
        currentIndex={currentIndex}
        rewind={() => player.rewind(useTTS)}
        fastForward={() => player.fastForward(useTTS)}
      />

      {/* FLYOUT OVERLAY COMPONENT: LIBRARY DIALOG CONTAINER */}
      {showLibrary && (
        <LibraryOverlay
          setShowLibrary={setShowLibrary}
          booksList={booksList}
          selectedBook={selectedBook}
          loadBookMetadata={loadBookMetadata}
          chaptersList={chaptersList}
          currentChapterIdx={currentChapterIdx}
          onChapterSelect={async (chapterIdx) => {
            await player.fetchChapterStream(selectedBook!, chapterIdx);
            setShowLibrary(false);
          }}
        />
      )}

      {/* MUSIC PANEL OVERLAY */}
      {showMusic && (
        <MusicOverlay
          setShowMusic={setShowMusic}
          currentTrack={currentTrack}
          toggleMusic={toggleMusic}
          musicIsPlaying={musicIsPlaying}
          isLooping={isLooping}
          setIsLooping={setIsLooping}
          volume={volume}
          setVolume={setVolume}
          uploadTrack={uploadTrack}
          addYoutubeTrack={addYoutubeTrack}
          musicIsLoading={musicIsLoading}
          tracks={tracks}
          loadTrack={loadTrack}
          deleteTrack={deleteTrack}
        />
      )}
    </main>
  );
}