import React, { useRef, useEffect } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Sliders,
  Sparkles,
  Music,
  MoveHorizontal,
  RotateCcw,
  Upload,
  Wand2,
  Check,
} from 'lucide-react';
import type { CharacterConfig } from '../types/pet';
import { DEFAULT_CHARACTERS } from '../constants/presets';
import { audioEngine } from '../services/audioEngine';
import { calculatePopupPosition } from '../utils/popupPosition';

interface CompanionSettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  petEnabled: boolean;
  onTogglePet: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  character: CharacterConfig;
  onUpdateCharacter: (char: CharacterConfig) => void;
  onSelectCharacter: (char: CharacterConfig) => void;
  anchorX: number;
  onAnchorXChange: (newX: number) => void;
  onOpenFullStudio: () => void;
  currentTrackTitle: string;
  onTrackTitleChange?: (title: string) => void;
}

export const CompanionSettingsPopup: React.FC<CompanionSettingsPopupProps> = ({
  isOpen,
  onClose,
  position,
  petEnabled,
  onTogglePet,
  musicEnabled,
  onToggleMusic,
  volume,
  onVolumeChange,
  character,
  onUpdateCharacter,
  onSelectCharacter,
  anchorX,
  onAnchorXChange,
  onOpenFullStudio,
  currentTrackTitle,
  onTrackTitleChange,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // 300ms grace period so the opening click doesn't trigger instant-close
    // Using 'click' (not 'mousedown') so canvas mousedown events don't close us
    const timer = window.setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }, 300);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const { posX, posY } = calculatePopupPosition(position.x, position.y, screenW, screenH);

  // Handle custom audio upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const title = await audioEngine.loadCustomAudioFile(file);
        onTrackTitleChange?.(title);
        if (!musicEnabled) {
          onToggleMusic();
        }
        audioEngine.playChime('touch');
      } catch (err) {
        console.error('Audio upload error:', err);
      }
    }
  };

  // Reset to Chainsaw Man "in the pool"
  const handleResetToInThePool = () => {
    const title = audioEngine.playInThePool();
    onTrackTitleChange?.(title);
    if (!musicEnabled) {
      onToggleMusic();
    }
    audioEngine.playChime('touch');
  };

  return (
    <div
      ref={cardRef}
      className="companion-popup-card"
      style={{
        position: 'fixed',
        left: posX,
        top: posY,
        zIndex: 250,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="popup-header">
        <div className="popup-title-group">
          <Sparkles className="icon-xs text-primary" />
          <span className="popup-title">Companion Settings</span>
        </div>
        <button
          className="popup-btn-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close Settings"
          title="Close Settings (Esc)"
        >
          <X className="icon-sm" />
        </button>
      </div>

      {/* 1. Quick ON/OFF Switches */}
      <div className="popup-toggle-grid">
        {/* Pet Switch */}
        <button
          className={`popup-toggle-btn ${petEnabled ? 'btn-active' : ''}`}
          onClick={onTogglePet}
        >
          {petEnabled ? <Eye className="icon-sm" /> : <EyeOff className="icon-sm" />}
          <div className="toggle-text-block">
            <span className="toggle-title">Reze & Denji</span>
            <span className="toggle-sub">{petEnabled ? 'Displaying' : 'Hidden'}</span>
          </div>
        </button>

        {/* Music Switch */}
        <button
          className={`popup-toggle-btn ${musicEnabled ? 'btn-active' : ''}`}
          onClick={onToggleMusic}
        >
          {musicEnabled ? <Volume2 className="icon-sm text-cyan-animated" /> : <VolumeX className="icon-sm" />}
          <div className="toggle-text-block">
            <span className="toggle-title">Music Player</span>
            <span className="toggle-sub">{musicEnabled ? 'Playing' : 'Muted'}</span>
          </div>
        </button>
      </div>

      {/* Music Track Badge */}
      <div className="popup-music-pill">
        <Music className={`icon-xs ${musicEnabled ? 'text-cyan-animated' : 'text-muted'}`} />
        <span className="popup-track-name">{currentTrackTitle}</span>
      </div>

      {/* Upload Music & Reset Bar */}
      <div className="popup-music-actions-row">
        <button
          className="popup-btn-upload-music"
          onClick={() => fileInputRef.current?.click()}
          title="Upload custom MP3/audio from your computer"
        >
          <Upload className="icon-xs" />
          <span>Upload Music</span>
        </button>

        {audioEngine.getCurrentTrack().isCustom ? (
          <button
            className="popup-btn-reset-music"
            onClick={handleResetToInThePool}
            title="Reset to 'in the pool' Chainsaw Man theme"
          >
            <RotateCcw className="icon-xs" />
            <span>in the pool</span>
          </button>
        ) : (
          <span className="popup-music-hint">MP3, WAV, OGG supported</span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={handleAudioUpload}
        />
      </div>

      {/* 2. Volume Slider */}
      <div className="popup-slider-row">
        <div className="slider-label-row">
          <span className="slider-title">
            <Volume2 className="icon-xs" /> Volume
          </span>
          <span className="slider-value">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="gnome-range-input"
        />
      </div>

      {/* 3. Thread Position Across Desktop */}
      <div className="popup-slider-row">
        <div className="slider-label-row">
          <span className="slider-title">
            <MoveHorizontal className="icon-xs" /> Move Across Screen
          </span>
          <span className="slider-value">{Math.round((anchorX / screenW) * 100)}%</span>
        </div>
        <input
          type="range"
          min="40"
          max={screenW - 40}
          step="5"
          value={anchorX}
          onChange={(e) => onAnchorXChange(parseInt(e.target.value))}
          className="gnome-range-input"
        />
      </div>

      {/* 4. Thread Length Slider */}
      <div className="popup-slider-row">
        <div className="slider-label-row">
          <span className="slider-title">
            <Sliders className="icon-xs" /> Thread Hanging Length
          </span>
          <span className="slider-value">{character.threadLength}px</span>
        </div>
        <input
          type="range"
          min="100"
          max="350"
          value={character.threadLength}
          onChange={(e) => onUpdateCharacter({ ...character, threadLength: parseInt(e.target.value) })}
          className="gnome-range-input"
        />
      </div>

      {/* 5. Character Size Scale Slider */}
      <div className="popup-slider-row">
        <div className="slider-label-row">
          <span className="slider-title">
            <Sparkles className="icon-xs" /> Companion Size
          </span>
          <span className="slider-value">{Math.round((character.scale || 1.0) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.75"
          max="1.65"
          step="0.05"
          value={character.scale || 1.0}
          onChange={(e) => onUpdateCharacter({ ...character, scale: parseFloat(e.target.value) })}
          className="gnome-range-input"
        />
      </div>

      {/* 6. Switch Character Quick Bar */}
      <div className="popup-characters-section">
        <span className="section-label">Quick Switch:</span>
        <div className="character-pills-row">
          {DEFAULT_CHARACTERS.map((char) => (
            <button
              key={char.id}
              className={`char-quick-pill ${character.id === char.id ? 'pill-active' : ''}`}
              onClick={() => onSelectCharacter(char)}
            >
              {char.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="popup-footer-row">
        <button
          className="popup-btn-secondary"
          onClick={() => onAnchorXChange(screenW / 2)}
          title="Center on screen"
        >
          <RotateCcw className="icon-xs" />
          <span>Center</span>
        </button>

        <button
          className="popup-btn-studio"
          onClick={() => {
            onClose();
            onOpenFullStudio();
          }}
          title="Create or customize characters with AI"
        >
          <Wand2 className="icon-xs" />
          <span>AI Studio (Create)</span>
        </button>

        <button
          className="popup-btn-done"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Done & Close Settings"
        >
          <Check className="icon-xs" />
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};

export default CompanionSettingsPopup;
