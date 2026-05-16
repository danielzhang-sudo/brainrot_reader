import React from "react";

interface MusicTrack {
  id: string;
  title: string;
  source: "upload" | "youtube";
}

interface MusicOverlayProps {
  setShowMusic: (show: boolean) => void;
  currentTrack: MusicTrack | null;
  toggleMusic: () => void;
  musicIsPlaying: boolean;
  isLooping: boolean;
  setIsLooping: (loop: boolean) => void;
  volume: number;
  setVolume: (vol: number) => void;
  uploadTrack: (file: File) => void;
  addYoutubeTrack: (url: string) => void;
  musicIsLoading: boolean;
  tracks: MusicTrack[];
  loadTrack: (id: string) => void;
  deleteTrack: (id: string) => void;
}

export default function MusicOverlay({
  setShowMusic,
  currentTrack,
  toggleMusic,
  musicIsPlaying,
  isLooping,
  setIsLooping,
  volume,
  setVolume,
  uploadTrack,
  addYoutubeTrack,
  musicIsLoading,
  tracks,
  loadTrack,
  deleteTrack,
}: MusicOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <h2 className="text-lg font-black tracking-tight text-purple-400 uppercase">
          Music Library
        </h2>
        <button
          onClick={() => setShowMusic(false)}
          className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-hidden flex-1">
        {/* NOW PLAYING */}
        <div className="flex flex-col gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">
              Now Playing
            </span>
            <span className="text-xs font-medium text-white/80 truncate max-w-[60%]">
              {currentTrack?.title || "No track selected"}
            </span>
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
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                isLooping
                  ? "bg-purple-600/30 border-purple-500 text-purple-300"
                  : "bg-white/5 border-white/10 text-white/40"
              }`}
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
            <span className="text-xs font-bold text-white/80 mb-1">
              Upload MP3
            </span>
            <span className="text-[10px] text-white/40">Click to browse</span>
            <input
              type="file"
              accept=".mp3"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) uploadTrack(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <div className="flex flex-col gap-2 bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-xs font-bold text-white/80">YouTube URL</span>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.target as HTMLFormElement).elements.namedItem(
                  "yturl"
                ) as HTMLInputElement;
                if (input.value) {
                  addYoutubeTrack(input.value);
                  input.value = "";
                }
              }}
              className="flex gap-2"
            >
              <input
                name="yturl"
                type="url"
                placeholder="paste link..."
                className="flex-1 bg-black border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white/80 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={musicIsLoading}
                className="bg-purple-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-purple-500 transition disabled:opacity-40"
              >
                {musicIsLoading ? "..." : "Add"}
              </button>
            </form>
          </div>
        </div>

        {/* TRACK LIST */}
        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold">
            Tracks ({tracks.length})
          </span>
          {tracks.length === 0 ? (
            <p className="text-xs text-white/30 italic">
              No tracks yet. Upload an MP3 or paste a YouTube link.
            </p>
          ) : (
            tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/5"
              >
                <button
                  onClick={() => {
                    loadTrack(track.id);
                    if (!musicIsPlaying) toggleMusic();
                  }}
                  className="flex-1 text-left text-xs font-medium truncate text-white/80 hover:text-white transition"
                >
                  {track.source === "youtube" ? "▶ " : "🎵 "}
                  {track.title}
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
  );
}
