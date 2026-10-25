# 🧵 Pop-ups: Anime Desktop Pet & Audio Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Linux](https://img.shields.io/badge/Platform-Linux%20GNOME%20X11-FCC624?logo=linux&logoColor=black)](https://www.ubuntu.com/)

An interactive, transparent desktop companion application designed for Linux (GNOME / X11). The companion hangs from the top edge of your desktop screen by a thread, reacts to mouse touches, swings with realistic damped pendulum physics, plays beat-reactive music, and allows you to seamlessly switch characters or upload custom audio.

Features **native click-through pass-through** (using X11 shape masking) so you can work and use other applications normally while your companion hangs on your desktop.

---

## 📸 Companions & Artwork

| **Gojo Satoru** (*Jujutsu Kaisen*) | **Reze & Denji** (*Chainsaw Man*) |
|:---:|:---:|
| <img src="public/gojo_satoru_512.png" width="260" alt="Gojo Satoru Desktop Pet" /> | <img src="public/reze_denji_512.png" width="260" alt="Reze and Denji Desktop Pet" /> |
| *Domain Expansion, Six Eyes & Limitless* | *Hanging by Crimson Thread & "In the pool" OST* |

Original generated reference artwork is preserved in [`art/`](./art/):
- [`art/gojo_satoru_original.jpg`](./art/gojo_satoru_original.jpg)
- [`art/reze_denji_original.jpg`](./art/reze_denji_original.jpg)

---

## ✨ Core Features

### 1. 🧵 Damped Pendulum Physics
- **Harmonic Oscillation**: Implements continuous damped harmonic physics:
  $$\frac{d^2\theta}{dt^2} = -\frac{g}{L} \sin(\theta) - c \frac{d\theta}{dt}$$
- **Interactive Drag & Fling**: Pull your companion sideways and release to watch natural momentum and settling swings.
- **Top Anchor Relocation**: Drag the top anchor pin anywhere across the screen edge to position your pet wherever you want.
- **Shake Detection**: Vigorously shaking your pet activates a dizzy expression with spinning stars.

### 2. 🪟 Native Desktop Pass-Through Overlay (`desktop_overlay.py`)
- **100% True Transparency**: Built with Python 3, PyGObject (`GTK 3.0`), and WebKit2GTK.
- **Dynamic Input Shape Masking**: Uses Cairo region masking (`input_shape_combine_region`) so clicks outside the pet pass straight through to whatever application or window is underneath.
- **Automatic Modal Interactivity**: Opening Settings or Studio dynamically expands the interactive region so all sliders, buttons, and file dialogs receive input without restriction.

### 3. ⚙️ Double-Tap Settings Popup
- **Instant Double-Click / Double-Tap**: Fast software double-tap detection on the pet opens the settings menu immediately.
- **Full Customization**:
  - Independent toggles for Character visibility and Music playback.
  - Companion Size slider (75% to 165%).
  - Hanging thread length slider (100px to 350px).
  - Volume slider and screen position slider.
  - Quick Switch row to instantly hop between characters.

### 4. 🎵 Music Player & Persistent Custom Audio
- **Built-in Soundtrack**: Chainsaw Man "in the pool" theme and procedural chillhop synth chords.
- **Custom Audio Importer**: Click **Upload Music** to open a native file dialog and select any local audio file (`.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`).
- **Disk Persistence**: Uploaded songs are saved permanently on disk (`public/custom_track.audio` and `public/custom_track_meta.json`) so your selected song plays continuously across restarts until you choose a new one.

---

## 🚀 Getting Started

### Prerequisites

On Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y python3 python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.1 nodejs npm
```

### Installation

Clone the repository and install dependencies:
```bash
git clone git@github.com:gnshx/pop-ups.git
cd pop-ups
npm install
```

### Running the App

#### Option A: One-Click Desktop Launcher
Run the helper script directly:
```bash
./start_pet.sh
```

#### Option B: Manual Launch
1. Start the Vite development server:
   ```bash
   npm run dev
   ```
2. In a second terminal, launch the desktop overlay:
   ```bash
   python3 desktop_overlay.py http://127.0.0.1:5173
   ```

#### Option C: Browser Preview
Open `http://localhost:5173` in any modern web browser.

---

## ⌨️ Shortcuts & Controls

| Action | Control |
|---|---|
| **Open / Close Settings** | Double-click or double-tap the pet, or press <kbd>S</kbd> |
| **Play / Pause Music** | Click the pet once, or press <kbd>M</kbd> |
| **Close All Menus** | Press <kbd>Esc</kbd> |
| **Move Across Screen** | Click & drag the top pin (🧵) horizontally |
| **Swing Companion** | Click & drag the character body |

---

## 🛠️ Project Structure

```
pop-ups/
├── art/                        # Original generated artwork
│   ├── gojo_satoru_original.jpg
│   └── reze_denji_original.jpg
├── desktop_overlay.py          # Native Linux GTK3/WebKit2 transparent overlay
├── public/                     # Static assets, transparent PNGs, audio
│   ├── gojo_satoru.png
│   ├── gojo_satoru_512.png
│   ├── reze_denji.png
│   ├── reze_denji_512.png
│   ├── in_the_pool.mp3
│   └── custom_track_meta.json
├── src/
│   ├── components/
│   │   ├── PetCanvas.tsx       # HTML5 Canvas physics, character render, hit testing
│   │   ├── CompanionSettingsPopup.tsx # Floating quick-settings panel
│   │   └── CharacterStudio.tsx # In-depth character customization modal
│   ├── services/
│   │   ├── audioEngine.ts      # Web Audio API engine & custom track player
│   │   └── nativeBridge.ts     # IPC bridge between WebKit and GTK Python
│   ├── constants/
│   │   └── presets.ts          # Default character configurations
│   ├── App.tsx                 # Main application state & coordinate tracking
│   └── index.css               # Modern dark-mode GNOME/Vercel design system
├── start_pet.sh                # One-click startup shell script
├── LICENSE                     # MIT License
└── package.json
```

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
