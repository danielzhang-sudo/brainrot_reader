import React from "react";

interface ReaderDisplayProps {
  words: string[];
  currentIndex: number;
  useAnchor: boolean;
  isProcessing: boolean;
  showTooltip: boolean;
  hoverX: number;
  hoverY: number;
  hoverText: string;
}

export default function ReaderDisplay({
  words,
  currentIndex,
  useAnchor,
  isProcessing,
  showTooltip,
  hoverX,
  hoverY,
  hoverText,
}: ReaderDisplayProps) {
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
      <div
        className="flex w-full text-3xl sm:text-4xl md:text-5xl font-black drop-shadow-md select-none"
        style={{
          fontFamily: "Courier New, monospace",
          textRendering: "geometricPrecision",
        }}
      >
        <div className="w-[45%] text-right text-white/80 pr-[1px] whitespace-pre">
          {left}
        </div>
        <div className="w-[10%] text-center text-red-500">{middle}</div>
        <div className="w-[45%] text-left text-white/80 pl-[1px] whitespace-pre">
          {right}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* MAIN TEXT OVERLAY VIEWPORT */}
      <section className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-4">
        {words.length > 0 ? (
          <div className="w-full max-w-sm flex flex-col items-center text-center">
            {useAnchor && (
              <div className="w-8 border-t border-white/20 h-1 mb-4" />
            )}
            <div className="w-full h-12 sm:h-14 md:h-16 flex justify-center items-center">
              {useAnchor ? (
                renderWordWithAnchor(words[currentIndex])
              ) : (
                <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
                  {words[currentIndex]}
                </span>
              )}
            </div>
            {useAnchor && (
              <div className="w-8 border-t border-white/20 h-1 mt-4" />
            )}
            <p className="text-[10px] font-mono text-white/30 mt-6 tracking-widest uppercase">
              {currentIndex + 1} / {words.length} WORDS
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/40 max-w-xs text-center font-medium bg-white/5 p-6 rounded-xl border border-white/5">
            {isProcessing
              ? "Assembling text streams..."
              : "Open the library menu panel to designate active reading targets."}
          </p>
        )}
      </section>

      {/* FLOATING HOVER PREVIEW TEXT TOOLTIP */}
      {showTooltip && words.length > 0 && (
        <div
          className="fixed z-50 bg-purple-950/95 text-white border border-purple-500/50 text-xs px-3 py-2 rounded-xl pointer-events-none max-w-xs shadow-xl backdrop-blur-md -translate-x-1/2 -translate-y-[115%]"
          style={{ left: `${hoverX}px`, top: `${hoverY}px` }}
        >
          <p className="font-sans leading-relaxed text-center text-purple-200">
            {hoverText}
          </p>
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-purple-950 border-r border-b border-purple-500/50 rotate-45" />
        </div>
      )}
    </>
  );
}
