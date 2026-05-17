# Brainrot Reader — Standalone Offline PWA

This directory contains a **100% serverless, offline-capable version** of the Brainrot Reader, specifically optimized for Android and iOS mobile devices. 

It replicates all major features of the full Next.js/Docker stack (ePUB ZIP parsing, chapter word streaming, RSVP RSVP Speed Reading, Text-to-Speech synchronization, and background music player) but runs **entirely inside the user's browser sandbox**. It requires **zero external servers, zero python containers, and zero terminal setups** after the first visit!

---

## 📱 Key Features

- **Material 3 Design Layout**: Built strictly around Google's official Material 3 layout specs (pill navigation segments, rounded sheets, medium M3 cards, floating FAB controls).
- **Material You Dynamic Colors**: Features an on-device HSL theme generator. Tap the settings gear to pick a "Seed color" (Basil Green, Terracotta, Google Blue, Raspberry, Ocean, Lavender) and watch the entire layout dynamically recalculate its CSS variables to match!
- **OLED Black Support & Settings**: A dedicated toggle to instantly switch between the standard M3 Dark theme and pure OLED Deep Black (`#000000`), reducing battery usage on modern AMOLED mobile screens.
- **Random Color Shift Per Chapter**: Engage settings to automatically shuffle the layout's dynamic HSL seed color on every chapter transition, keeping visual aesthetics fresh and engaging!
- **Immersive Focus Mode**: Tap the top bar expand button or double-tap the RSVP box directly to hide the top/bottom bars, maximizing speed reading container size for deep focus.
- **Precise ORP Anchor System**: Redesigned RSVP word renderer that mathematically anchors the Optimal Recognition Point (ORP) character at exactly 40% using a 38%/4%/58% grid, keeping the character absolutely stationary under the crosshairs.
- **Word Progress Trackers**: Displays active word indexes (e.g., `Word 42 of 1500`) and reactive timeline percentages.
- **Seek-10 Playback Deck**: Skip exactly 10 words forward or backward using custom clockwise/counter-clockwise arrow icons.
- **Reader Selector Dropdowns**: Instantly choose books and chapters directly within the Reader screen without leaving the tab.
- **Infinite Offline Database (IndexedDB)**: Utilizes the browser's transactional IndexedDB database instead of a capped 5MB localStorage. You can save **hundreds of megabytes** of ePub books and ambient MP3 tracks directly into your secure phone storage.
- **Client-Side ePUB Parsing**: Uses `JSZip` inside browser memory to unzip books and uses `DOMParser` to strip scripts/styles and tokenize text into words.
- **Offline TTS Ticker Ticks**: Utilizes the mobile browser's native `SpeechSynthesisUtterance` synced word-by-word with the visual RSVP displays. Works in Airplane Mode!
- **Ambient Music Player**: Upload local MP3 audio tracks directly from your phone to cache inside secure storage and loop play them in the background as you speed-read.

---

## 📂 Project Architecture

```
android/
├── index.html        # Main SPA interface (Material 3 UI + Dynamic HSL Picker)
├── app.js            # PWA Engine (IndexedDB manager, ePUB zipper, RSVP Ticker, Audio API)
├── sw.js             # Stale-While-Revalidate service worker (full offline caching)
├── manifest.json     # PWA Installer configurations
└── icons/            # App launcher icons
    ├── icon-192x192.png
    └── icon-512x512.png
```

---

## ⚡ How to Run and Install on Your Phone

Because the app is **100% client-side with zero backend server dependencies**, you can run and install it completely on your phone using any of the following methods. Once installed via PWA caching, the app runs entirely locally and offline!

### Method A: Host Globally for Free (Simplest & Best)
This is the recommended method. You publish the static files once to a free static host. Once you open the link and tap "Install," the Service Worker downloads everything to your phone's memory. **You can then turn off the internet/Wi-Fi completely, and the app will work forever!**

1. **Host it on Vercel** (Takes 30 seconds):
   - Push this repository to your GitHub account.
   - Go to [Vercel](https://vercel.com/) and import the repository.
   - In the build settings, set the **Root Directory** to `android`.
   - Click **Deploy**. Vercel will give you a free HTTPS link (e.g., `https://brainrot-reader.vercel.app`).
2. **Host on GitHub Pages**:
   - Enable GitHub Pages in your repository settings and point it to the `/android` folder.
3. **Install it**:
   - Open your unique HTTPS link in Chrome on your Android phone.
   - Tap Chrome's menu (⋮) and select **"Add to Home Screen"** or **"Install App"**.
   - **Offline mode verified**: Put your phone in **Airplane Mode**, close all apps, and click the new **Brainrot** icon on your home launcher. It opens and works instantly!

---

### Method B: Run a Simple Local Server (Home Wi-Fi)
If you do not want to upload your files to the cloud, you can run a temporary server on your computer to install it on your phone:

1. **Start the server on your computer**:
   - Navigate to the standalone directory:
     ```bash
     cd android
     ```
   - Launch a zero-config static server using Python:
     ```bash
     python -m http.server 8000
     ```
2. **Get your computer's local IP address**:
   - On Linux/macOS, run `hostname -I` or `ifconfig`.
   - On Windows, run `ipconfig` in Command Prompt.
   - Find your local IPv4 address (e.g., `192.168.1.50`).
3. **Install on your Android Phone**:
   - Ensure your phone is connected to the **same Wi-Fi network** as your computer.
   - Open Chrome on your phone and navigate to `http://192.168.1.50:8000`.
   - Tap Chrome's menu (⋮) and select **"Add to Home Screen"**.
   - Once added, the PWA has cached all files locally. You can now shut down the Python server on your computer—the phone app is fully self-sufficient and works offline!

---

### Method C: 100% On-Device Android Server (Zero Computers Needed)
If you want to run a local host directly on your phone with no external computer or internet involved, you can run a local static host right inside Android:

#### Option 1: Using a Free Android Web Server App
1. Connect your Android phone to your computer via USB (or send the `android/` directory to your phone via cloud drive/email).
2. Copy the entire `/android` folder onto your phone's internal storage (e.g., in `Documents/` or `Downloads/`).
3. Open the Google Play Store and download a free web server app, such as **"Web Server for Android"** or **"Simple HTTP Server"**.
4. Open the app, set the server's **Document Root** to the `/android` folder you copied, and start the server.
5. It will give you a local address (usually `http://localhost:8080` or `http://127.0.0.1:8080`).
6. Open Chrome on your phone, go to that address, tap Chrome's menu (⋮), and select **"Add to Home Screen"** to install your permanent offline reader!

#### Option 2: Using Termux (Advanced Android Terminal)
1. Install **Termux** (free terminal emulator for Android from F-Droid or GitHub).
2. Copy the `/android` directory to your phone storage.
3. Open Termux and set up storage access:
   ```bash
   termux-setup-storage
   ```
4. Install Python inside Termux:
   ```bash
   pkg update && pkg install python
   ```
5. Navigate to the copied folder:
   ```bash
   cd ~/storage/shared/Download/android
   ```
6. Start the server:
   ```bash
   python -m http.server 8000
   ```
7. Open Chrome on your phone, go to `http://localhost:8000`, and tap **"Add to Home Screen"**!

---

## 💡 PWA Lifecycle & Battery FAQ

### 1. Does Python have to be running all the time?
**Absolutely NOT!**
Once you open the app's link on your phone (either hosted online or served from your laptop over local Wi-Fi) and click **"Add to Home Screen"** / **"Install App"**, the Service Worker (`sw.js`) automatically intercepts and saves every single asset (HTML, CSS, JS, manifest, fonts) directly into your phone's browser cache. 

Once installed, **you can shut down Python completely!** Turn off your laptop, go offline, or put your phone in Airplane Mode. The app will work forever without needing any active server.

### 2. Is there any way to stop the server when the app is closed and start it when opened?
**You don't need to—because there is NO server running on your phone!**
Unlike traditional full-stack apps that require a backend database and web server to be constantly active in the background, a PWA operates on a **100% serverless static-asset model**:
- **Zero background processes**: When the app is closed, it consumes **exactly 0% battery and 0% CPU**, as there are no background services or server daemons running.
- **Instant native startup**: When you tap the homescreen icon, the phone's browser engine wakes up, loads the cached static files locally from storage (takes milliseconds), and runs it inside a secure sandbox.
- **Offline database**: All books, settings, and progress details are read and written using the browser's native **IndexedDB**, which acts as a built-in offline database without needing a database server (like PostgreSQL or MySQL).

This means you get all the benefits of a native app (homescreen icon, offline capabilities, zero latency) with **none of the battery drain, background syncs, or setup overhead of running a local server**!

