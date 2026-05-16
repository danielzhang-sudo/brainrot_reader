import React, { RefObject } from "react";

interface FooterControlsProps {
  selectedBook: string | null;
  currentChapterIdx: number;
  chaptersCount: number;
  loadPreviousSequentialChapter: () => void;
  loadNextSequentialChapter: () => void;
  useAnchor: boolean;
  setUseAnchor: (use: boolean) => void;
  useTTS: boolean;
  setUseTTS: (use: boolean) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  setSelectedVoice: (voice: SpeechSynthesisVoice | null) => void;
  wpm: number;
  setWpm: (wpm: number) => void;
  currentPercentage: number;
  progressBarRef: RefObject<HTMLDivElement | null>;
  handleProgressBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleProgressBarMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  setShowTooltip: (show: boolean) => void;
  togglePlaybackState: () => void;
  isPlaying: boolean;
  wordsLength: number;
  currentIndex: number;
  rewind: () => void;
  fastForward: () => void;
}

export default function FooterControls({
  selectedBook,
  currentChapterIdx,
  chaptersCount,
  loadPreviousSequentialChapter,
  loadNextSequentialChapter,
  useAnchor,
  setUseAnchor,
  useTTS,
  setUseTTS,
  availableVoices,
  selectedVoice,
  setSelectedVoice,
  wpm,
  setWpm,
  currentPercentage,
  progressBarRef,
  handleProgressBarClick,
  handleProgressBarMouseMove,
  setShowTooltip,
  togglePlaybackState,
  isPlaying,
  wordsLength,
  currentIndex,
  rewind,
  fastForward,
}: FooterControlsProps) {
  return (
    <footer className="relative z-10 w-full px-6 pb-8 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col gap-4">
      {/* CHAPTER NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white/5 p-1 rounded-xl border border-white/5">
        <button
          onClick={loadPreviousSequentialChapter}
          disabled={!selectedBook || currentChapterIdx === 0}
          className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20"
        >
          &lt; Chapter
        </button>
        <span className="text-[10px] font-mono tracking-widest text-purple-400 uppercase font-bold">
          Chapters
        </span>
        <button
          onClick={loadNextSequentialChapter}
          disabled={!selectedBook || currentChapterIdx >= chaptersCount - 1}
          className="px-4 py-2 text-xs font-bold text-white/60 disabled:opacity-20"
        >
          Chapter &gt;
        </button>
      </div>

      {/* TOGGLE MATRIX DECK */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
          <span className="text-xs font-bold text-white/80">ORP Anchor</span>
          <button
            onClick={() => setUseAnchor(!useAnchor)}
            className={`w-8 h-4 rounded-full p-0.5 transition ${
              useAnchor ? "bg-purple-500 flex justify-end" : "bg-white/10 flex justify-start"
            }`}
          >
            <div className="bg-white w-3 h-3 rounded-full" />
          </button>
        </div>
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
          <span className="text-xs font-bold text-white/80">TTS Voice</span>
          <button
            onClick={() => setUseTTS(!useTTS)}
            className={`w-8 h-4 rounded-full p-0.5 transition ${
              useTTS ? "bg-purple-500 flex justify-end" : "bg-white/10 flex justify-start"
            }`}
          >
            <div className="bg-white w-3 h-3 rounded-full" />
          </button>
        </div>
      </div>

      {/* VOICE SELECTOR */}
      {useTTS && availableVoices.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          <div className="flex justify-between items-center text-[10px] font-bold text-white/40 tracking-wider uppercase font-mono">
            <span>TTS Voice</span>
            <span className="text-purple-400 font-black truncate max-w-[60%] text-right">
              {selectedVoice?.name || "Default"}
            </span>
          </div>
          <select
            value={selectedVoice?.voiceURI || ""}
            onChange={(e) => {
              const voice =
                availableVoices.find((v) => v.voiceURI === e.target.value) ||
                null;
              setSelectedVoice(voice);
            }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-purple-500 appearance-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 12px center",
            }}
          >
            {availableVoices.map((voice) => (
              <option
                key={voice.voiceURI}
                value={voice.voiceURI}
                className="bg-black text-white"
              >
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
        <input
          type="range"
          min="100"
          max="600"
          step="25"
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          className="w-full accent-purple-500 bg-white/10 h-1 rounded-md appearance-none"
        />
      </div>

      {/* DYNAMIC COMBINED TIMELINE & CONTROL UNIT BLOCK */}
      <div className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
        {/* TIMELINE PROGRESS ELEMENT */}
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
            onClick={rewind}
            disabled={wordsLength === 0 || currentIndex === 0}
            className="w-12 h-12 rounded-full font-mono text-xs font-black bg-white/10 text-white/70 border border-white/5 flex items-center justify-center transition active:scale-90 disabled:opacity-10 disabled:pointer-events-none hover:bg-white/20"
            title="Rewind 4 seconds"
          >
            -4s
          </button>

          {/* MAIN TOGGLE */}
          <button
            onClick={togglePlaybackState}
            disabled={wordsLength === 0}
            className={`w-16 h-16 rounded-full font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-20 shadow-md ${
              isPlaying
                ? "bg-white text-black"
                : "bg-gradient-to-tr from-purple-600 to-pink-500 text-white"
            }`}
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          {/* FAST-FORWARD */}
          <button
            onClick={fastForward}
            disabled={wordsLength === 0 || currentIndex >= wordsLength - 1}
            className="w-12 h-12 rounded-full font-mono text-xs font-black bg-white/10 text-white/70 border border-white/5 flex items-center justify-center transition active:scale-90 disabled:opacity-10 disabled:pointer-events-none hover:bg-white/20"
            title="Fast forward 4 seconds"
          >
            +4s
          </button>
        </div>
      </div>
    </footer>
  );
}
