import React from "react";

interface ChapterItem {
  index: number;
  id: string;
  title: string;
}

interface LibraryOverlayProps {
  setShowLibrary: (show: boolean) => void;
  booksList: string[];
  selectedBook: string | null;
  loadBookMetadata: (book: string) => void;
  chaptersList: ChapterItem[];
  currentChapterIdx: number;
  onChapterSelect: (chapterIdx: number) => void;
}

export default function LibraryOverlay({
  setShowLibrary,
  booksList,
  selectedBook,
  loadBookMetadata,
  chaptersList,
  currentChapterIdx,
  onChapterSelect,
}: LibraryOverlayProps) {
  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
        <h2 className="text-lg font-black tracking-tight text-purple-400 uppercase">
          Epub Vault Shelf
        </h2>
        <button
          onClick={() => setShowLibrary(false)}
          className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20"
        >
          ✕ Close
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
        <div className="flex flex-col gap-2 overflow-y-auto pr-2 border-r border-white/5">
          <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">
            Select Book
          </span>
          {booksList.length === 0 ? (
            <p className="text-xs text-white/30 italic">No books stored.</p>
          ) : (
            booksList.map((book) => (
              <button
                key={book}
                onClick={() => loadBookMetadata(book)}
                className={`text-left text-xs p-3 rounded-lg border font-medium truncate transition ${
                  selectedBook === book
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                📖 {book}
              </button>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pl-2">
          <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase font-bold mb-1">
            Select Chapter
          </span>
          {chaptersList.length === 0 ? (
            <p className="text-xs text-white/30 italic">Pick a book.</p>
          ) : (
            chaptersList.map((ch) => (
              <button
                key={ch.id}
                onClick={() => onChapterSelect(ch.index)}
                className={`text-left text-xs p-3 rounded-lg border font-mono truncate transition ${
                  currentChapterIdx === ch.index
                    ? "bg-purple-600/20 border-purple-500 text-white"
                    : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {(ch.index + 1).toString().padStart(2, "0")}. {ch.title}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
