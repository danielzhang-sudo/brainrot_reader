import React, { ChangeEvent } from "react";

interface HeaderProps {
  setShowMusic: (show: boolean) => void;
  setShowLibrary: (show: boolean) => void;
  selectedBook: string | null;
  chaptersCount: number;
  currentChapterIdx: number;
  handleLibraryUpload: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function Header({
  setShowMusic,
  setShowLibrary,
  selectedBook,
  chaptersCount,
  currentChapterIdx,
  handleLibraryUpload,
}: HeaderProps) {
  return (
    <header className="relative z-10 w-full px-6 pt-6 flex items-center justify-between border-b border-white/5 pb-4 bg-black/40 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setShowMusic(false);
            setShowLibrary(true);
          }}
          className="bg-white/10 px-4 py-2 text-xs font-bold rounded-full border border-white/10 hover:bg-white/20 transition"
        >
          📚 Library
        </button>
        <button
          onClick={() => {
            setShowLibrary(false);
            setShowMusic(true);
          }}
          className="bg-white/10 px-3 py-2 text-xs font-bold rounded-full border border-white/10 hover:bg-white/20 transition"
        >
          🎵
        </button>
      </div>
      <div className="text-center max-w-[50%] truncate">
        <p className="text-xs font-black tracking-tight uppercase truncate text-purple-400">
          {selectedBook || "No Book Active"}
        </p>
        {chaptersCount > 0 && (
          <p className="text-[10px] font-mono text-white/40 truncate">
            Ch. {currentChapterIdx + 1} of {chaptersCount}
          </p>
        )}
      </div>
      <label className="bg-purple-600 px-4 py-2 text-xs font-bold rounded-full cursor-pointer hover:bg-purple-500 transition">
        Upload
        <input
          type="file"
          accept=".epub"
          onChange={handleLibraryUpload}
          className="hidden"
        />
      </label>
    </header>
  );
}
