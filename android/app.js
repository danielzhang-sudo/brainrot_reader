// Standalone Serverless PWA Engine for Brainrot Reader
// Manages: IndexedDB, JSZip parsing, RSVP Timing, SpeechSynthesis TTS, and Ambient Audio

class BrainrotEngine {
  constructor() {
    this.db = null;
    this.books = [];
    this.tracks = [];
    
    // Reader states
    this.selectedBook = null;
    this.chapters = [];
    this.currentChapterIdx = 0;
    this.words = [];
    this.currentIndex = 0;
    this.isPlaying = false;
    this.wpm = 250;
    this.useTTS = true;
    
    // Audio / music states
    this.audioElement = new Audio();
    this.audioElement.loop = true;
    this.currentTrackId = null;
    this.musicVolume = 0.5;
    
    // Web Audio API for normalization
    this.audioContext = null;
    this.audioSource = null;
    this.compressor = null;
    this.gainNode = null;

    // Speech / TTS states
    this.synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    this.availableVoices = [];
    this.selectedVoice = null;
    
    // Timers & refs
    this.tickerTimer = null;
    
    // ORP (Optimal Recognition Point) calculation
    this.orpPercentage = 0.35; 
  }

  async init() {
    await this.initDatabase();
    this.loadVoices();
    if (this.synth) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }
  }

  // ==========================================
  // INDEXEDDB DATABASE MANAGER
  // ==========================================
  initDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("BrainrotStandaloneDB", 2);
      
      request.onerror = (e) => {
        console.error("IndexedDB open error:", e);
        reject(e);
      };
      
      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("books")) {
          db.createObjectStore("books", { keyPath: "name" });
        }
        if (!db.objectStoreNames.contains("tracks")) {
          db.createObjectStore("tracks", { keyPath: "id" });
        }
      };
    });
  }

  // Books CRUD
  saveBook(name, blob) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["books"], "readwrite");
      const store = transaction.objectStore("books");
      const record = { name, file: blob, addedAt: Date.now() };
      const request = store.put(record);
      
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e);
    });
  }

  getBooksList() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["books"], "readonly");
      const store = transaction.objectStore("books");
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e);
    });
  }

  bookExists(name) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["books"], "readonly");
      const store = transaction.objectStore("books");
      const request = store.get(name);
      
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = (e) => reject(e);
    });
  }

  deleteBook(name) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["books"], "readwrite");
      const store = transaction.objectStore("books");
      const request = store.delete(name);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }

  getBookBlob(name) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["books"], "readonly");
      const store = transaction.objectStore("books");
      const request = store.get(name);
      
      request.onsuccess = () => resolve(request.result ? request.result.file : null);
      request.onerror = (e) => reject(e);
    });
  }

  // Music Tracks CRUD
  saveTrack(id, title, blob) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tracks"], "readwrite");
      const store = transaction.objectStore("tracks");
      const record = { id, title, file: blob, addedAt: Date.now() };
      const request = store.put(record);
      
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e);
    });
  }

  getTracksList() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tracks"], "readonly");
      const store = transaction.objectStore("tracks");
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e);
    });
  }

  deleteTrack(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tracks"], "readwrite");
      const store = transaction.objectStore("tracks");
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e);
    });
  }

  getTrackBlob(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["tracks"], "readonly");
      const store = transaction.objectStore("tracks");
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result ? request.result.file : null);
      request.onerror = (e) => reject(e);
    });
  }

  // ==========================================
  // CLIENT-SIDE EPUB PARSER (JSZip + DOMParser)
  // ==========================================
  async extractEpubChapters(bookName) {
    const blob = await this.getBookBlob(bookName);
    if (!blob) throw new Error("ePub not found in DB.");
    
    // Load JSZip dynamically if it is not already loaded
    if (typeof JSZip === "undefined") {
      throw new Error("JSZip is not loaded yet.");
    }
    
    const zip = await JSZip.loadAsync(blob);
    const files = Object.keys(zip.files);
    
    // Filter specifically for structured text documents
    const textFiles = files
      .filter(f => f.toLowerCase().endsWith(".xhtml") || f.toLowerCase().endsWith(".html") || f.toLowerCase().endsWith(".htm") || f.toLowerCase().endsWith(".xml"))
      .filter(f => !f.toLowerCase().includes("toc") && !f.toLowerCase().includes("nav"))
      .sort((a, b) => a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'}));
      
    if (textFiles.length === 0) {
      throw new Error("No structured HTML/XHTML chapters found inside ePub container.");
    }
    
    this.selectedBook = bookName;
    this.chapters = textFiles.map((filepath, index) => {
      return {
        index,
        id: filepath,
        title: filepath.split("/").pop()
          .replace(".xhtml", "")
          .replace(".html", "")
          .replace("_", " ")
      };
    });
    
    return this.chapters;
  }

  async loadChapterWords(bookName, chapterIndex) {
    this.cleanupTicker();
    
    const blob = await this.getBookBlob(bookName);
    if (!blob) {
      this.words = [];
      this.currentChapterIdx = chapterIndex;
      this.currentIndex = 0;
      this.isPlaying = false;
      throw new Error("Book no longer available in storage.");
    }
    const zip = await JSZip.loadAsync(blob);
    const filepath = this.chapters[chapterIndex].id;
    
    const file = zip.file(filepath);
    const rawHtml = await file.async("text");
    
    // Client-side DOM parsing (replaces BeautifulSoup)
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");
    
    // Remove unwanted visual scripts & styling blocks
    const unwanted = doc.querySelectorAll("script, style, head");
    unwanted.forEach(el => el.remove());
    
    const text = doc.body ? doc.body.textContent : doc.documentElement.textContent;
    
    // Clean and tokenise text into raw words array
    this.words = text.split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
      
    this.currentChapterIdx = chapterIndex;
    this.currentIndex = 0;
    this.isPlaying = false;
    
    return this.words;
  }

  // ==========================================
  // RSVP TIMING & SPEECH SYNTHESIS ENGINE
  // ==========================================
  isMobileDevice() {
    return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  }

  loadVoices() {
    if (!this.synth) return [];
    this.availableVoices = this.synth.getVoices();
    
    if (this.availableVoices.length > 0) {
      const savedVoiceName = localStorage.getItem("brainrot_selected_voice");
      if (savedVoiceName) {
        const matched = this.availableVoices.find(v => v.name === savedVoiceName);
        if (matched) {
          this.selectedVoice = matched;
          return this.availableVoices;
        }
      }
      
      if (!this.selectedVoice) {
        this.selectedVoice = this.availableVoices.find(v => v.default) || this.availableVoices[0];
      }
    }
    return this.availableVoices;
  }

  getCalculatedRate(wpm) {
    if (wpm <= 150) return 0.8;
    if (wpm <= 300) return 1.5;
    if (wpm <= 450) return 3.2;
    return 5.0 + ((wpm - 450) / 40);
  }

  cleanupTicker() {
    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }

  play() {
    if (this.words.length === 0) return;
    this.cleanupTicker();
    this.isPlaying = true;

    if (!this.useTTS) {
      // Clean silent visual RSVP tick
      const msPerWord = (60 / this.wpm) * 1000;
      this.tickerTimer = setInterval(() => this.runVisualTimerTick(), msPerWord);
    } else {
      // Reset watchdog trigger state
      this.boundaryFired = false;
      
      // Start playback via Laptop engine (onboundary) first
      this.executeLaptopPlay();

      // Launch a watchdog check to detect if onboundary fires
      this.watchdogTimer = setTimeout(() => {
        if (!this.boundaryFired && this.isPlaying) {
          console.warn("TTS onboundary event did not fire. Falling back to Mobile Timer Sync.");
          
          // boundary didn't fire! Stop Laptop play and switch to Mobile visual timer fallback
          if (this.synth) this.synth.cancel();
          if (this.tickerTimer) {
            clearInterval(this.tickerTimer);
            this.tickerTimer = null;
          }

          const msPerWord = (60 / this.wpm) * 1000;
          this.tickerTimer = setInterval(() => this.runMobileTimerTick(), msPerWord);
          this.speakMobileChunk(this.currentIndex);
        }
      }, 600);
    }
  }

  pause() {
    this.cleanupTicker();
    this.isPlaying = false;
  }

  runVisualTimerTick() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.words.length) {
      this.handleChapterFinished();
    } else {
      this.currentIndex = nextIndex;
      this.triggerUIUpdate();
    }
  }

  runMobileTimerTick() {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.words.length) {
      this.handleChapterFinished();
    } else {
      this.currentIndex = nextIndex;
      this.triggerUIUpdate();
    }
  }

  speakMobileChunk(startIndex) {
    if (!this.synth) return;
    this.synth.cancel();
    
    // Instead of cutting to a tiny 15-word chunk, speak the remaining text in one single, smooth stream!
    // This completely eliminates skipping, word repetitions, and high-frequency cancels on Samsung and mobile engines.
    const remainingText = this.words.slice(startIndex).join(" ");
    if (!remainingText.trim()) return;
    
    const utterance = new SpeechSynthesisUtterance(remainingText);
    utterance.rate = this.getCalculatedRate(this.wpm);
    if (this.selectedVoice && this.synth) {
      const freshVoices = this.synth.getVoices();
      const matchingVoice = freshVoices.find(v => v.name === this.selectedVoice.name);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }
    this.synth.speak(utterance);
  }

  executeLaptopPlay() {
    if (!this.synth) return;
    const remainingText = this.words.slice(this.currentIndex).join(" ");
    if (!remainingText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(remainingText);
    utterance.rate = this.getCalculatedRate(this.wpm);
    if (this.selectedVoice && this.synth) {
      const freshVoices = this.synth.getVoices();
      const matchingVoice = freshVoices.find(v => v.name === this.selectedVoice.name);
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
    }

    let baseIndex = this.currentIndex;
    let lastWordCharPos = -1;
    let wordsCounted = 0;

    utterance.onboundary = (event) => {
      this.boundaryFired = true;
      if (event.name === "word" && event.charIndex !== lastWordCharPos) {
        const visualIndex = baseIndex + wordsCounted;
        if (visualIndex < this.words.length) {
          this.currentIndex = visualIndex;
          this.triggerUIUpdate();
          wordsCounted++;
        }
        lastWordCharPos = event.charIndex;
      }
    };

    utterance.onend = () => {
      if (this.synth && !this.synth.speaking && this.isPlaying) {
        this.handleChapterFinished();
      }
    };

    this.synth.speak(utterance);
  }

  handleChapterFinished() {
    this.pause();
    if (this.onChapterFinished) {
      this.onChapterFinished();
    }
  }

  rewind() {
    this.seekToIndex(Math.max(0, this.currentIndex - 10));
  }

  fastForward() {
    this.seekToIndex(Math.min(this.words.length - 1, this.currentIndex + 10));
  }

  seekToPercent(percent) {
    if (this.words.length === 0) return;
    const targetIdx = Math.max(0, Math.min(this.words.length - 1, Math.round((percent / 100) * this.words.length)));
    this.seekToIndex(targetIdx);
  }

  seekToIndex(targetIndex) {
    this.currentIndex = targetIndex;
    this.triggerUIUpdate();
    if (this.isPlaying) {
      this.play();
    }
  }

  setWpm(newWpm) {
    this.wpm = newWpm;
    if (this.isPlaying) {
      this.play(); // Re-trigger timer with updated rates
    }
  }

  // ==========================================
  // OFFLINE MP3 AUDIO PLAYER
  // ==========================================
  async playOfflineTrack(trackId) {
    const blob = await this.getTrackBlob(trackId);
    if (!blob) return;

    // Clean active audio context source URL
    if (this.audioElement.src) {
      URL.revokeObjectURL(this.audioElement.src);
    }

    const objectUrl = URL.createObjectURL(blob);
    this.audioElement.src = objectUrl;
    this.currentTrackId = trackId;
    
    // Initialize Web Audio API chain for volume normalization
    if (!this.audioContext) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.gainNode = this.audioContext.createGain();
        
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        this.audioSource.connect(this.compressor);
        this.compressor.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        
        this.gainNode.gain.value = this.musicVolume;
      } catch (err) {
        console.warn("Web Audio API unavailable, falling back to standard volume:", err);
        this.audioElement.volume = this.musicVolume;
      }
    } else {
      if (this.gainNode) {
        this.gainNode.gain.value = this.musicVolume;
      } else {
        this.audioElement.volume = this.musicVolume;
      }
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    try {
      await this.audioElement.play();
    } catch (err) {
      console.warn("Autoplay block. Interactive play is required:", err);
    }
  }

  pauseOfflineTrack() {
    this.audioElement.pause();
  }

  resumeOfflineTrack() {
    if (this.currentTrackId) {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audioElement.play();
    }
  }

  setMusicVolume(volume) {
    this.musicVolume = volume;
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    } else {
      this.audioElement.volume = volume;
    }
  }

  // ==========================================
  // ORP (Optimal Recognition Point) WORD RENDERER
  // ==========================================
  splitWordForOrp(word) {
    if (!word) return { prefix: "", char: "", suffix: "" };
    
    let orpIndex = 0;
    const len = word.length;
    
    if (len <= 1) {
      orpIndex = 0;
    } else if (len <= 5) {
      orpIndex = 1;
    } else if (len <= 9) {
      orpIndex = 2;
    } else if (len <= 13) {
      orpIndex = 3;
    } else {
      orpIndex = 4;
    }

    return {
      prefix: word.substring(0, orpIndex),
      char: word.charAt(orpIndex),
      suffix: word.substring(orpIndex + 1)
    };
  }

  // UI communication bridge
  triggerUIUpdate() {
    if (this.onUIUpdate) {
      this.onUIUpdate();
    }
  }
}

// Global engine instanced context
const engine = new BrainrotEngine();
