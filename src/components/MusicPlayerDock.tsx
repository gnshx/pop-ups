import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Upload,
  X,
  Sparkles,
  Disc,
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface MusicPlayerDockProps {
  isOpen: boolean;
  onClose: () => void;
  musicEnabled: boolean;
  onToggleMusic: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

export const MusicPlayerDock: React.FC<MusicPlayerDockProps> = ({
  isOpen,
  onClose,
  musicEnabled,
  onToggleMusic,
  volume,
  onVolumeChange,
}) => {
  const [currentTrack, setCurrentTrack] = useState(audioEngine.getCurrentTrack());
  const [waveformBars, setWaveformBars] = useState<number[]>([0.2, 0.3, 0.1, 0.4, 0.25, 0.5, 0.3, 0.2]);
  const [sfxMuted, setSfxMuted] = useState(audioEngine.isSoundFxMuted());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync real-time waveform bars
  useEffect(() => {
    let animId: number;
    const updateWaveform = () => {
      if (musicEnabled) {
        setWaveformBars(audioEngine.getWaveformData());
      }
      animId = requestAnimationFrame(updateWaveform);
    };
    animId = requestAnimationFrame(updateWaveform);
    return () => cancelAnimationFrame(animId);
  }, [musicEnabled]);

  const handleNextTrack = () => {
    audioEngine.nextTrack();
    setCurrentTrack(audioEngine.getCurrentTrack());
    audioEngine.playChime('touch');
  };

  const handlePrevTrack = () => {
    audioEngine.prevTrack();
    setCurrentTrack(audioEngine.getCurrentTrack());
    audioEngine.playChime('touch');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await audioEngine.loadCustomAudioFile(file);
        setCurrentTrack(audioEngine.getCurrentTrack());
        if (!musicEnabled) {
          onToggleMusic();
        }
      } catch (err) {
        console.error('Audio file upload failed', err);
      }
    }
  };

  const toggleSoundFx = () => {
    const next = !sfxMuted;
    setSfxMuted(next);
    audioEngine.setSoundFxMuted(next);
  };

  if (!isOpen) return null;

  return (
    <aside className="music-dock-card" aria-label="Music Player Dock" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 90 }}>
      <div className="music-dock-header">
        <div className="dock-title-group">
          <Disc className={`icon-xs text-primary ${musicEnabled ? 'spin-slow' : ''}`} />
          <span className="dock-title">Chill Beats & Audio Engine</span>
        </div>
        <button className="icon-btn-ghost" onClick={onClose} aria-label="Close Music Dock">
          <X className="icon-xs" />
        </button>
      </div>

      {/* Track Info & Visualizer */}
      <div className="track-display-box">
        <div className="track-info">
          <span className="track-name">{currentTrack.title}</span>
          <span className="track-artist">{currentTrack.artist}</span>
        </div>

        {/* Real-time Visualizer EQ Bars */}
        <div className="eq-visualizer">
          {waveformBars.map((bar, i) => (
            <div
              key={i}
              className="eq-bar"
              style={{
                height: `${Math.max(12, bar * 100)}%`,
                backgroundColor: musicEnabled ? '#38bdf8' : '#64748b',
              }}
            />
          ))}
        </div>
      </div>

      {/* Transport Controls */}
      <div className="player-controls-row">
        <button className="transport-btn" onClick={handlePrevTrack} title="Previous Track">
          <SkipBack className="icon-xs" />
        </button>

        <button
          className="play-pause-btn"
          onClick={onToggleMusic}
          title={musicEnabled ? 'Pause Music' : 'Play Music'}
        >
          {musicEnabled ? <Pause className="icon-sm" /> : <Play className="icon-sm" />}
        </button>

        <button className="transport-btn" onClick={handleNextTrack} title="Next Track">
          <SkipForward className="icon-xs" />
        </button>
      </div>

      {/* Volume & SFX Row */}
      <div className="volume-slider-box">
        <button
          className="icon-btn-ghost"
          onClick={() => onVolumeChange(volume === 0 ? 0.6 : 0)}
          title="Mute Volume"
        >
          {volume === 0 ? <VolumeX className="icon-xs text-muted" /> : <Volume2 className="icon-xs" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="gnome-range-input"
        />
        <span className="volume-pct">{Math.round(volume * 100)}%</span>
      </div>

      {/* Upload Custom Audio & Sound Effects Toggle */}
      <div className="dock-actions-footer">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mp3,audio/wav,audio/ogg"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <button className="btn-upload-audio" onClick={() => fileInputRef.current?.click()}>
          <Upload className="icon-xs" />
          <span>Upload MP3 / Audio</span>
        </button>

        <button
          className={`btn-sfx-toggle ${!sfxMuted ? 'sfx-active' : ''}`}
          onClick={toggleSoundFx}
          title="Toggle Cute Sound FX (Giggles, Purrs, Whooshes)"
        >
          <Sparkles className="icon-xs" />
          <span>{sfxMuted ? 'SFX Off' : 'SFX On'}</span>
        </button>
      </div>
    </aside>
  );
};
