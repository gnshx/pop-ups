import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PetCanvas } from './components/PetCanvas';
import { CompanionSettingsPopup } from './components/CompanionSettingsPopup';
import { CharacterStudio } from './components/CharacterStudio';
import { MusicPlayerDock } from './components/MusicPlayerDock';
import { DesktopEnvironment } from './components/DesktopEnvironment';
import { DEFAULT_CHARACTERS } from './constants/presets';
import type { CharacterConfig, ExpressionType } from './types/pet';
import { audioEngine } from './services/audioEngine';
import { nativeBridge, type HitboxRect } from './services/nativeBridge';

export const App: React.FC = () => {
  // Load Character from localStorage or default to Gojo Satoru
  const [character, setCharacter] = useState<CharacterConfig>(() => {
    try {
      const saved = localStorage.getItem('threadpet_character');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.name) return parsed;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CHARACTERS[1]; // Gojo Satoru
  });

  // Thread Anchor Position X across screen (default ~72% of screen width, like in user screenshot)
  const [anchorX, setAnchorX] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('threadpet_anchor_x');
      if (saved) return parseFloat(saved);
    } catch {
      // Fallback
    }
    return Math.round(window.innerWidth * 0.72);
  });

  // App Toggles
  const [petEnabled, setPetEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(false);
  const [hangingEnabled] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.7);

  // Settings Popup on Double-Tap
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({
    x: Math.round(typeof window !== 'undefined' ? window.innerWidth * 0.72 : 960),
    y: 180,
  });

  // Ref to track last time settings were opened (prevent double-fire)
  const lastSettingsOpenRef = useRef<number>(0);

  // Full Studio & Music Dock Modals
  const [isStudioOpen, setIsStudioOpen] = useState<boolean>(false);
  const [isMusicDockOpen, setIsMusicDockOpen] = useState<boolean>(false);

  // Track Info
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>(
    audioEngine.getCurrentTrack().title
  );

  // Sync track title on mount if custom audio is restored from storage
  useEffect(() => {
    audioEngine.restorePersistentAudio().then((title) => {
      if (title) {
        setCurrentTrackTitle(title);
      }
    });
  }, []);

  // Unlock audio on initial interaction
  useEffect(() => {
    const handleGesture = () => {
      audioEngine.resumeContext();
    };
    window.addEventListener('pointerdown', handleGesture, { once: true });
    window.addEventListener('keydown', handleGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Dynamic Hitboxes for Native Desktop Click Pass-through
  // When a popup is open → full-screen so ALL buttons work
  // When only pet shown → narrow pet-area only (clicks pass through everywhere else)
  useEffect(() => {
    const anyModalOpen = isPopupOpen || isStudioOpen || isMusicDockOpen;

    let hitboxes: HitboxRect[];

    if (anyModalOpen) {
      // Full-screen interactive so every button/slider in the popup works
      hitboxes = [{ x: 0, y: 0, width: 10000, height: 10000 }];
    } else if (petEnabled) {
      // Generous pet + thread zone
      const scale = character.scale || 1.0;
      const threadLen = character.threadLength || 130;
      hitboxes = [{
        x: Math.max(0, Math.round(anchorX - 250 * scale)),
        y: 0,
        width: Math.round(500 * scale),
        height: Math.round(Math.max(500, threadLen + 340 * scale)),
      }];
    } else {
      // Hidden pet — small top pin area only
      hitboxes = [{
        x: Math.max(0, Math.round(anchorX - 70)),
        y: 0,
        width: 140,
        height: 48,
      }];
    }

    nativeBridge.updateHitboxes(hitboxes, anyModalOpen);
  }, [petEnabled, anchorX, character.threadLength, character.scale, isPopupOpen, isStudioOpen, isMusicDockOpen]);

  // Save anchor position
  const handleAnchorXChange = useCallback((newX: number) => {
    setAnchorX(newX);
    try {
      localStorage.setItem('threadpet_anchor_x', newX.toString());
    } catch {
      // Ignore
    }
  }, []);

  // Save character changes
  useEffect(() => {
    try {
      localStorage.setItem('threadpet_character', JSON.stringify(character));
    } catch {
      // Ignore
    }
  }, [character]);

  // Audio volume sync
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    audioEngine.setVolume(newVol);
  };

  // Toggle Music Independent of Character
  const handleToggleMusic = () => {
    const isPlaying = audioEngine.toggleMusic();
    setMusicEnabled(isPlaying);
    setCurrentTrackTitle(audioEngine.getCurrentTrack().title);
  };

  // Toggle Pet Visibility Independent of Music
  const handleTogglePet = () => {
    const next = !petEnabled;
    setPetEnabled(next);
    audioEngine.playChime(next ? 'wake' : 'sleep');
  };

  // Click on Pet -> Play/Pause music & cute reaction
  const handlePetClick = () => {
    if (!musicEnabled) {
      handleToggleMusic();
    } else {
      audioEngine.playChime('giggle');
    }
  };

  // Double Click / Double Tap on Pet -> Opens Settings Popup!
  const handlePetDoubleClick = (x: number, y: number) => {
    const now = performance.now();
    if (now - lastSettingsOpenRef.current < 250) return;
    lastSettingsOpenRef.current = now;
    audioEngine.resumeContext();
    setPopupPos({ x, y });
    setIsPopupOpen((prev) => !prev);
  };

  // Handle expression change callback
  const handleExpressionChange = (expr: ExpressionType) => {
    setCharacter((prev) => ({ ...prev, currentExpression: expr }));
  };

  // Global keyboard shortcut 's' to toggle settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' || e.key === 'S') {
        if (!isStudioOpen) {
          setIsPopupOpen((prev) => !prev);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMusic();
      } else if (e.key === 'Escape') {
        setIsPopupOpen(false);
        setIsStudioOpen(false);
        setIsMusicDockOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudioOpen, handleToggleMusic]);

  return (
    <main
      className="threadpet-app-root"
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      {/* 1. Pure Transparent Desktop Layer (No visible background/window box) */}
      <DesktopEnvironment
        isSimulated={false}
        wallpaperIndex={0}
      />

      {/* 2. Physics & Anime Pet Canvas (Hanging Thread + Reze & Denji) */}
      <PetCanvas
        character={character}
        petEnabled={petEnabled}
        musicEnabled={musicEnabled}
        hangingEnabled={hangingEnabled}
        anchorX={anchorX}
        isPopupOpen={isPopupOpen}
        onAnchorXChange={handleAnchorXChange}
        onPetClick={handlePetClick}
        onPetDoubleClick={handlePetDoubleClick}
        onExpressionChange={handleExpressionChange}
      />

      {/* When pet is hidden - show small pill at top to reopen */}
      {!petEnabled && (
        <button
          id="hidden-pet-pin-btn"
          className="hidden-pet-pin-btn"
          style={{
            position: 'fixed',
            left: Math.max(20, Math.round(anchorX - 45)),
            top: 6,
            zIndex: 300,
          }}
          onClick={(e) => {
            e.stopPropagation();
            const now = performance.now();
            if (now - lastSettingsOpenRef.current < 300) return;
            lastSettingsOpenRef.current = now;
            setIsPopupOpen(true);
            audioEngine.resumeContext();
            audioEngine.playChime('wake');
          }}
          title="Click to Open Settings / Show Reze & Denji"
        >
          🧵 Settings
        </button>
      )}

      {/* 3. Double-Tap Floating Settings Popup (Only shown on double-tap or clicking gear) */}
      <CompanionSettingsPopup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        position={{ x: anchorX, y: popupPos.y }}
        petEnabled={petEnabled}
        onTogglePet={handleTogglePet}
        musicEnabled={musicEnabled}
        onToggleMusic={handleToggleMusic}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        character={character}
        onUpdateCharacter={setCharacter}
        onSelectCharacter={setCharacter}
        anchorX={anchorX}
        onAnchorXChange={handleAnchorXChange}
        onOpenFullStudio={() => setIsStudioOpen(true)}
        currentTrackTitle={currentTrackTitle}
        onTrackTitleChange={setCurrentTrackTitle}
      />

      {/* 4. AI Character Studio Modal (Optional full creator) */}
      <CharacterStudio
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
        currentCharacter={character}
        onUpdateCharacter={setCharacter}
        onSelectPreset={setCharacter}
      />

      {/* 5. Music Player Floating Dock */}
      <MusicPlayerDock
        isOpen={isMusicDockOpen}
        onClose={() => setIsMusicDockOpen(false)}
        musicEnabled={musicEnabled}
        onToggleMusic={handleToggleMusic}
        volume={volume}
        onVolumeChange={handleVolumeChange}
      />
    </main>
  );
};

export default App;
