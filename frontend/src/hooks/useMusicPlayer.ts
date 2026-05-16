import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = typeof window !== "undefined"
  ? (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8090`)
  : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090");

export interface MusicTrack {
  id: string;
  title: string;
  source: "upload" | "youtube";
}

export function useMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.25);
  const [isLooping, setIsLooping] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Ensure audio element exists
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // Update volume when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Update loop when state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  // Handle track ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      if (!isLooping) {
        setIsPlaying(false);
      }
    };
    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [isLooping]);

  const refreshTracks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/music/list`);
      const data = await res.json();
      setTracks(data.tracks || []);
    } catch (e) {
      console.error("Failed to fetch music tracks:", e);
    }
  }, []);

  const loadTrack = useCallback((trackId: string) => {
    if (!audioRef.current) return;
    const wasPlaying = !audioRef.current.paused;
    audioRef.current.pause();
    audioRef.current.src = `${API_BASE}/api/v1/music/stream/${trackId}`;
    setCurrentTrackId(trackId);
    if (wasPlaying) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch((err) => console.error("Audio play error:", err));
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const uploadTrack = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".mp3")) {
      alert("Only MP3 files are supported.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/api/v1/music/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      await refreshTracks();
      // Auto-select newly uploaded track
      if (data.track?.id) {
        loadTrack(data.track.id);
        togglePlay();
      }
    } catch (e) {
      console.error("Music upload failed:", e);
      alert("Failed to upload track.");
    } finally {
      setIsLoading(false);
    }
  }, [refreshTracks, loadTrack, togglePlay]);

  const addYoutubeTrack = useCallback(async (url: string) => {
    if (!url.trim()) return;
    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 130_000);
      const res = await fetch(`${API_BASE}/api/v1/music/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
      }
      const data = await res.json();
      await refreshTracks();
      if (data.track?.id) {
        loadTrack(data.track.id);
        togglePlay();
      }
    } catch (e: any) {
      console.error("YouTube download failed:", e);
      const msg = e.name === "AbortError" ? "Request timed out." : e.message || "Failed to download YouTube audio.";
      alert(msg);
    } finally {
      setIsLoading(false);
    }
  }, [refreshTracks, loadTrack, togglePlay]);

  const deleteTrack = useCallback(async (trackId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/music/${trackId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      if (currentTrackId === trackId && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        setCurrentTrackId(null);
        setIsPlaying(false);
      }
      await refreshTracks();
    } catch (e) {
      console.error("Failed to delete track:", e);
      alert("Failed to delete track.");
    }
  }, [refreshTracks, currentTrackId]);

  const currentTrack = tracks.find((t) => t.id === currentTrackId) || null;

  return {
    tracks,
    currentTrack,
    currentTrackId,
    isPlaying,
    volume,
    isLooping,
    isLoading,
    setIsLooping,
    setVolume,
    loadTrack,
    togglePlay,
    refreshTracks,
    uploadTrack,
    addYoutubeTrack,
    deleteTrack,
  };
}
