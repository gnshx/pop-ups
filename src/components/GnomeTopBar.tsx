import React, { useState } from 'react';
import {
  Sparkles,
  Music,
  Volume2,
  VolumeX,
  Settings,
  Layers,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  ChevronDown,
  Palette,
  Anchor,
} from 'lucide-react';
import type { CharacterConfig } from '../types/pet';

interface GnomeTopBarProps {
  character: CharacterConfig;
  petEnabled: boolean;
  onTogglePet: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  hangingEnabled: boolean;
  onToggleHanging: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onOpenStudio: () => void;
  onOpenMusicDock: () => void;
  isSimulatedDesktop: boolean;
  onToggleSimulatedDesktop: () => void;
  wallpaperIndex: number;
  onNextWallpaper: () => void;
  currentTrackTitle: string;
}

export const GnomeTopBar: React.FC<GnomeTopBarProps> = ({
  character,
  petEnabled,
  onTogglePet,
  musicEnabled,
  onToggleMusic,
  hangingEnabled,
  onToggleHanging,
  volume,
  onVolumeChange,
  onOpenStudio,
  onOpenMusicDock,
  isSimulatedDesktop,
  onToggleSimulatedDesktop,
  wallpaperIndex,
  onNextWallpaper,
  currentTrackTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="gnome-topbar-container" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
      {/* GNOME Top Panel Bar */}
      <div className="gnome-panel">
        {/* Left: App Logo & Current Mode */}
        <div className="gnome-panel-left">
          <div className="gnome-brand-pill">
            <Sparkles className="icon-xs text-primary" />
            <span className="gnome-brand-text">ThreadPet AI</span>
            <span className="gnome-badge-status">
              <span className={`status-indicator-dot ${petEnabled ? 'dot-active' : 'dot-inactive'}`} />
              {character.name.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Center: Music Quick Status & Direct Play/Pause */}
        <div className="gnome-panel-center">
          <button
            className={`gnome-quick-toggle-btn ${petEnabled ? 'toggle-active' : ''}`}
            onClick={onTogglePet}
            title={petEnabled ? 'Hide Reze & Denji' : 'Show Reze & Denji on Screen'}
          >
            {petEnabled ? <Eye className="icon-xs" /> : <EyeOff className="icon-xs text-muted" />}
            <span>Pet: {petEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            className={`gnome-quick-toggle-btn ${musicEnabled ? 'toggle-active' : ''}`}
            onClick={onToggleMusic}
            title={musicEnabled ? 'Mute Music' : 'Play "in the pool" Chainsaw Man OST'}
          >
            {musicEnabled ? <Volume2 className="icon-xs text-cyan-animated" /> : <VolumeX className="icon-xs text-muted" />}
            <span>Music: {musicEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <div className="gnome-music-marquee" onClick={onOpenMusicDock} role="button" tabIndex={0}>
            <Music className={`icon-xs ${musicEnabled ? 'text-cyan-animated' : 'text-muted'}`} />
            <span className="gnome-track-text">{musicEnabled ? currentTrackTitle : 'in the pool (Paused)'}</span>
          </div>
        </div>

        {/* Right: GNOME Quick Settings Button */}
        <div className="gnome-panel-right">
          <button
            className={`gnome-pill-button ${isOpen ? 'gnome-pill-active' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Open ThreadPet Quick Controls"
          >
            <span className="gnome-icon-group">
              <Settings className="icon-xs" />
              <span>Settings</span>
            </span>
            <ChevronDown className={`icon-xs icon-chevron ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* GNOME Quick Settings Popover Modal */}
      {isOpen && (
        <div className="gnome-dropdown-menu">
          <div className="gnome-dropdown-header">
            <div className="gnome-dropdown-title">
              <Settings className="icon-sm" />
              <span>Desktop Companion Controls</span>
            </div>
            <button className="icon-action-btn" onClick={toggleFullscreen} title="Toggle Fullscreen Window">
              {isFullscreen ? <Minimize2 className="icon-xs" /> : <Maximize2 className="icon-xs" />}
            </button>
          </div>

          {/* Quick Toggle Matrix */}
          <div className="gnome-toggle-grid">
            {/* 1. Pet Toggle */}
            <button
              className={`gnome-toggle-tile ${petEnabled ? 'tile-active' : ''}`}
              onClick={onTogglePet}
            >
              <div className="tile-icon-box">
                {petEnabled ? <Eye className="icon-md" /> : <EyeOff className="icon-md" />}
              </div>
              <div className="tile-meta">
                <span className="tile-title">Pet Companion</span>
                <span className="tile-subtitle">{petEnabled ? 'Active on Screen' : 'Hidden'}</span>
              </div>
            </button>

            {/* 2. Music Toggle */}
            <button
              className={`gnome-toggle-tile ${musicEnabled ? 'tile-active' : ''}`}
              onClick={onToggleMusic}
            >
              <div className="tile-icon-box">
                {musicEnabled ? <Volume2 className="icon-md" /> : <VolumeX className="icon-md" />}
              </div>
              <div className="tile-meta">
                <span className="tile-title">Lofi Beats</span>
                <span className="tile-subtitle">{musicEnabled ? 'Playing' : 'Muted'}</span>
              </div>
            </button>

            {/* 3. Hanging Mode Toggle */}
            <button
              className={`gnome-toggle-tile ${hangingEnabled ? 'tile-active' : ''}`}
              onClick={onToggleHanging}
            >
              <div className="tile-icon-box">
                <Anchor className="icon-md" />
              </div>
              <div className="tile-meta">
                <span className="tile-title">Thread Physics</span>
                <span className="tile-subtitle">{hangingEnabled ? 'Hanging' : 'Free Floating'}</span>
              </div>
            </button>

            {/* 4. Desktop Simulation Mode */}
            <button
              className={`gnome-toggle-tile ${isSimulatedDesktop ? 'tile-active' : ''}`}
              onClick={onToggleSimulatedDesktop}
            >
              <div className="tile-icon-box">
                <Layers className="icon-md" />
              </div>
              <div className="tile-meta">
                <span className="tile-title">Desktop Sim</span>
                <span className="tile-subtitle">{isSimulatedDesktop ? 'Simulated' : 'Pure Transparent'}</span>
              </div>
            </button>
          </div>

          {/* Volume Slider Section */}
          <div className="gnome-slider-card">
            <div className="slider-label-row">
              <span className="slider-title">
                <Volume2 className="icon-xs" /> Music Volume
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

          {/* Action Buttons */}
          <div className="gnome-actions-row">
            <button
              className="btn-gnome-secondary"
              onClick={() => {
                onOpenStudio();
                setIsOpen(false);
              }}
            >
              <Palette className="icon-xs" />
              <span>Character Studio</span>
            </button>

            <button
              className="btn-gnome-secondary"
              onClick={() => {
                onOpenMusicDock();
                setIsOpen(false);
              }}
            >
              <Music className="icon-xs" />
              <span>Music Player</span>
            </button>
          </div>

          {isSimulatedDesktop && (
            <div className="gnome-wallpaper-row">
              <span className="text-muted-xs">Simulated Wallpaper: #{wallpaperIndex + 1}</span>
              <button className="btn-wallpaper-switch" onClick={onNextWallpaper}>
                Switch Wallpaper
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
