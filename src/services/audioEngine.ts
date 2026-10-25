import { LOFI_TRACKS } from '../constants/presets';
import {
  savePersistentAudio,
  loadPersistentAudio,
  clearPersistentAudio,
} from './audioStorage';
import { nativeBridge } from './nativeBridge';

type SoundFxType = 'touch' | 'purr' | 'whoosh' | 'giggle' | 'sleep' | 'wake';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Lofi Synth State
  private isPlayingLofi = false;
  private currentTrackIndex = 0;
  private stepTimer: number | null = null;
  private currentChordIndex = 0;
  private vinylNode: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;

  // Audio Elements & State
  private poolAudioElement: HTMLAudioElement | null = null;
  private poolSourceNode: MediaElementAudioSourceNode | null = null;
  private customAudioElement: HTMLAudioElement | null = null;
  private customSourceNode: MediaElementAudioSourceNode | null = null;
  private isCustomPlaying = false;

  // Volume & Settings
  private musicVolume = 0.6;
  private sfxVolume = 0.8;
  private isMusicMuted = false;
  private isSfxMuted = false;

  // Frequency Data for Visualizer & Beat Reaction
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private beatIntensity = 0;

  constructor() {
    this.restorePersistentAudio().catch(() => {});
  }

  public resumeContext() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.analyser);
      this.analyser.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // --- Procedural Lofi Chillhop Synth & Chainsaw Man OST ---

  public startLofiTrack(trackId?: string) {
    this.resumeContext();

    if (this.isCustomPlaying && this.customAudioElement) {
      this.customAudioElement.pause();
      this.isCustomPlaying = false;
    }

    if (trackId) {
      const idx = LOFI_TRACKS.findIndex((t) => t.id === trackId);
      if (idx !== -1) this.currentTrackIndex = idx;
    }

    this.stopLofiTrack();
    this.currentChordIndex = 0;

    const currentTrack = LOFI_TRACKS[this.currentTrackIndex];

    // Priority 1: High quality "in the pool" Chainsaw Man OST recording
    if (currentTrack.id === 'in-the-pool') {
      this.isPlayingLofi = true;
      if (!this.poolAudioElement) {
        this.poolAudioElement = new Audio('/in_the_pool.mp3');
        this.poolAudioElement.loop = true;
        this.poolAudioElement.preload = 'auto';

        try {
          if (this.ctx && this.musicGain && !this.poolSourceNode) {
            this.poolSourceNode = this.ctx.createMediaElementSource(this.poolAudioElement);
            this.poolSourceNode.connect(this.musicGain);
          }
        } catch {
          // Fallback to direct output
        }
      }

      this.poolAudioElement.volume = this.isMusicMuted ? 0 : this.musicVolume;
      const playPromise = this.poolAudioElement.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Fallback to procedural synth if file blocked
          this.startVinylAmbience();
          this.scheduleNextBar();
        });
      }
      return;
    }

    // Other tracks use procedural chillhop synth
    this.isPlayingLofi = true;
    this.startVinylAmbience();
    this.scheduleNextBar();
  }

  public stopLofiTrack() {
    this.isPlayingLofi = false;
    if (this.poolAudioElement) {
      this.poolAudioElement.pause();
    }
    if (this.stepTimer) {
      window.clearTimeout(this.stepTimer);
      this.stepTimer = null;
    }
    this.stopVinylAmbience();
    this.beatIntensity = 0;
  }

  public toggleMusic(enable?: boolean): boolean {
    this.resumeContext();
    const shouldPlay = enable !== undefined ? enable : !this.isPlaying();

    if (shouldPlay) {
      this.isMusicMuted = false;
      const hasCustom = this.isCustomPlaying || localStorage.getItem('threadpet_has_custom_audio') === 'true';
      if (hasCustom) {
        // STRICT USER RULE: Only play uploaded custom track! Never switch to 'in the pool'!
        this.playCustomTrack();
      } else {
        this.startLofiTrack(LOFI_TRACKS[this.currentTrackIndex].id);
      }
    } else {
      this.isMusicMuted = true;
      if (this.poolAudioElement) {
        this.poolAudioElement.pause();
      }
      if (this.isCustomPlaying && this.customAudioElement) {
        this.customAudioElement.pause();
      }
      this.stopLofiTrack();
    }
    return shouldPlay;
  }

  public isPlaying(): boolean {
    const isPoolPlaying = !!this.poolAudioElement && !this.poolAudioElement.paused;
    const isCustomActive = this.isCustomPlaying && !!this.customAudioElement && !this.customAudioElement.paused;
    return (this.isPlayingLofi && (isPoolPlaying || this.stepTimer !== null)) || isCustomActive;
  }

  public playCustomTrack() {
    this.resumeContext();
    this.stopLofiTrack();

    const customTitle = localStorage.getItem('threadpet_custom_track_name') || 'Uploaded Track';
    if (!this.customAudioElement || !this.customAudioElement.src) {
      this.setupCustomAudioElement('/custom_track.audio?t=' + Date.now(), customTitle);
    }

    this.isCustomPlaying = true;
    this.isMusicMuted = false;
    if (this.customAudioElement) {
      this.customAudioElement.volume = this.musicVolume;
      const playPromise = this.customAudioElement.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn('Network audio load error, trying IndexedDB fallback:', err);
          loadPersistentAudio().then((saved) => {
            if (saved?.blob && this.customAudioElement) {
              this.customAudioElement.src = URL.createObjectURL(saved.blob);
              this.customAudioElement.play().catch(() => {});
            }
          });
        });
      }
    }
  }

  public nextTrack() {
    const hasCustom = this.isCustomPlaying || localStorage.getItem('threadpet_has_custom_audio') === 'true';
    if (hasCustom) {
      if (this.customAudioElement) {
        this.customAudioElement.currentTime = 0;
        this.customAudioElement.play().catch(() => {});
      }
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex + 1) % LOFI_TRACKS.length;
    if (this.isPlaying()) {
      this.startLofiTrack(LOFI_TRACKS[this.currentTrackIndex].id);
    }
  }

  public prevTrack() {
    const hasCustom = this.isCustomPlaying || localStorage.getItem('threadpet_has_custom_audio') === 'true';
    if (hasCustom) {
      if (this.customAudioElement) {
        this.customAudioElement.currentTime = 0;
        this.customAudioElement.play().catch(() => {});
      }
      return;
    }
    this.currentTrackIndex = (this.currentTrackIndex - 1 + LOFI_TRACKS.length) % LOFI_TRACKS.length;
    if (this.isPlaying()) {
      this.startLofiTrack(LOFI_TRACKS[this.currentTrackIndex].id);
    }
  }

  public playInThePool() {
    this.resumeContext();
    clearPersistentAudio().catch(() => {});
    nativeBridge.clearAudioFromNative();
    if (this.customAudioElement) {
      this.customAudioElement.pause();
      this.customAudioElement.src = '';
    }
    this.isCustomPlaying = false;
    this.isMusicMuted = false;
    this.currentTrackIndex = 0;
    this.startLofiTrack(LOFI_TRACKS[0].id);
    return this.getCurrentTrack().title;
  }

  public getCurrentTrack(): { id: string; title: string; artist: string; isCustom: boolean } {
    const customTitle = localStorage.getItem('threadpet_custom_track_name');
    const hasCustom = this.isCustomPlaying || localStorage.getItem('threadpet_has_custom_audio') === 'true';

    if (hasCustom && (this.customAudioElement?.title || customTitle)) {
      return {
        id: 'custom',
        title: this.customAudioElement?.title || customTitle || 'Uploaded Track',
        artist: 'My Desktop Audio',
        isCustom: true,
      };
    }
    const track = LOFI_TRACKS[this.currentTrackIndex];
    return {
      id: track.id,
      title: track.title,
      artist: track.artist,
      isCustom: false,
    };
  }

  public setVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.isMusicMuted ? 0 : this.musicVolume, this.ctx.currentTime);
    }
    if (this.poolAudioElement) {
      this.poolAudioElement.volume = this.isMusicMuted ? 0 : this.musicVolume;
    }
    if (this.customAudioElement) {
      this.customAudioElement.volume = this.isMusicMuted ? 0 : this.musicVolume;
    }
  }

  public getVolume(): number {
    return this.musicVolume;
  }

  public setSoundFxMuted(muted: boolean) {
    this.isSfxMuted = muted;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(muted ? 0 : this.sfxVolume, this.ctx.currentTime);
    }
  }

  public isSoundFxMuted(): boolean {
    return this.isSfxMuted;
  }

  // --- Real-time Beat / Amplitude Analysis ---

  public getBeatIntensity(): number {
    if (!this.analyser || !this.dataArray || !this.isPlaying()) {
      return 0;
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    // Focus on sub-bass and mid frequencies (bins 1-12)
    let sum = 0;
    const bins = Math.min(12, this.dataArray.length);
    for (let i = 1; i <= bins; i++) {
      sum += this.dataArray[i];
    }
    const avg = sum / (bins * 255);
    // Smooth peak
    this.beatIntensity = this.beatIntensity * 0.7 + avg * 0.3;
    return this.beatIntensity;
  }

  public getWaveformData(): number[] {
    if (!this.analyser || !this.dataArray || !this.isPlaying()) {
      return [0.1, 0.15, 0.1, 0.2, 0.12, 0.18, 0.1];
    }
    this.analyser.getByteFrequencyData(this.dataArray);
    const bars: number[] = [];
    const step = Math.floor(this.dataArray.length / 8);
    for (let i = 0; i < 8; i++) {
      const val = this.dataArray[i * step] / 255;
      bars.push(Math.max(0.1, Math.min(1, val)));
    }
    return bars;
  }

  // --- Lofi Music Synthesis Internal Mechanics ---

  private scheduleNextBar() {
    if (!this.isPlayingLofi || !this.ctx || !this.musicGain) return;

    const track = LOFI_TRACKS[this.currentTrackIndex];
    const bpm = track.bpm;
    const barDuration = (60 / bpm) * 4; // 4 beats per bar
    const beatDuration = 60 / bpm;

    // Chord frequency mapping (Hz) for mellow electric piano chords
    const chordFrequencies: Record<string, number[]> = {
      // Dm9: D3, F3, A3, C4, E4
      Dm9: [146.83, 174.61, 220.0, 261.63, 329.63],
      // G13: G2, F3, B3, E4
      G13: [98.0, 174.61, 246.94, 329.63],
      // Cmaj9: C3, E3, G3, B3, D4
      Cmaj9: [130.81, 164.81, 196.0, 246.94, 293.66],
      // Am7: A2, G3, C4, E4
      Am7: [110.0, 196.0, 261.63, 329.63],
      // Fmaj7: F2, A3, C4, E4
      Fmaj7: [87.31, 220.0, 261.63, 329.63],
      // Em7: E2, G3, B3, D4
      Em7: [82.41, 196.0, 246.94, 293.66],
      // Abmaj7: Ab2, C3, Eb3, G3
      Abmaj7: [103.83, 130.81, 155.56, 196.0],
      // Bb: Bb2, D3, F3, Bb3
      Bb: [116.54, 146.83, 174.61, 233.08],
      // Cm7: C3, Eb3, G3, Bb3
      Cm7: [130.81, 155.56, 196.0, 233.08],
      // Eb: Eb3, G3, Bb3, Eb4
      Eb: [155.56, 196.0, 233.08, 311.13],
      // Bbm7: Bb2, Db3, F3, Ab3
      Bbm7: [116.54, 138.59, 174.61, 207.65],
      // Eb7: Eb2, G3, Bb3, Db4
      Eb7: [77.78, 196.0, 233.08, 277.18],
      // Bbmaj7: Bb2, F3, Bb3, D4, F4
      Bbmaj7: [116.54, 174.61, 233.08, 293.66, 349.23],
      // Cadd9: C3, G3, C4, D4, E4
      Cadd9: [130.81, 196.0, 261.63, 293.66, 329.63],
      // Dbmaj7: Db3, F3, Ab3, C4
      Dbmaj7: [138.59, 174.61, 207.65, 261.63],
    };

    const currentChordName = track.chords[this.currentChordIndex];
    const freqs = chordFrequencies[currentChordName] || [130.81, 164.81, 196.0, 261.63];

    const now = this.ctx.currentTime;

    // Play Warm Polyphonic Rhodes Chord
    this.playMellowChord(freqs, now, barDuration * 0.95);

    // Schedule Lofi Percussion (Kick on 1 & 3, Soft Rim/Snare on 2 & 4, subtle hi-hats)
    this.playLofiDrums(now, beatDuration);

    // Advance chord
    this.currentChordIndex = (this.currentChordIndex + 1) % track.chords.length;

    // Schedule next bar
    this.stepTimer = window.setTimeout(() => {
      this.scheduleNextBar();
    }, barDuration * 1000);
  }

  private playMellowChord(freqs: number[], startTime: number, duration: number) {
    if (!this.ctx || !this.musicGain) return;

    // Filter to warm up the sound (Lofi low-pass filter around 850Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, startTime);
    filter.Q.setValueAtTime(1.2, startTime);
    filter.connect(this.musicGain);

    // Subtle pitch drift LFO (tape flutter/warble effect)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.35, startTime); // 0.35 Hz gentle drift
    lfoGain.gain.setValueAtTime(2.5, startTime);
    lfo.connect(lfoGain);
    lfo.start(startTime);
    lfo.stop(startTime + duration);

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      // Mixture of sine and soft triangle for vintage electric piano timbre
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      // Connect tape flutter LFO to detune
      lfoGain.connect(osc.detune);

      // Velvet velocity envelope
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(0.12 / freqs.length, startTime + 0.08); // gentle attack
      noteGain.gain.exponentialRampToValueAtTime(0.06 / freqs.length, startTime + 0.4); // soft decay
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // release

      osc.connect(noteGain);
      noteGain.connect(filter);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  }

  private playLofiDrums(startTime: number, beatSec: number) {
    if (!this.ctx || !this.musicGain) return;

    // Beat 1: Kick
    this.triggerLofiKick(startTime);
    // Beat 2: Soft Snare/Rim
    this.triggerLofiRim(startTime + beatSec);
    // Beat 3: Kick
    this.triggerLofiKick(startTime + beatSec * 2);
    // Beat 4: Soft Snare/Rim
    this.triggerLofiRim(startTime + beatSec * 3);

    // Hi-hats on 8th notes
    for (let i = 0; i < 8; i++) {
      this.triggerLofiHiHat(startTime + (i * beatSec) / 2);
    }
  }

  private triggerLofiKick(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.19);
  }

  private triggerLofiRim(time: number) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.08);

    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  private triggerLofiHiHat(time: number) {
    if (!this.ctx || !this.musicGain) return;
    // Tiny noise burst for warm shaker/hihat
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.03;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.03, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    noise.start(time);
    noise.stop(time + 0.04);
  }

  private startVinylAmbience() {
    if (!this.ctx || !this.musicGain || this.vinylNode) return;

    // Generate 4-second looping vinyl noise buffer
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Pinkish noise background
      const white = Math.random() * 2 - 1;
      let crackle = 0;
      if (Math.random() < 0.0008) {
        // Occasional vinyl dust pop
        crackle = (Math.random() * 2 - 1) * 0.6;
      }
      data[i] = white * 0.015 + crackle;
    }

    this.vinylNode = this.ctx.createBufferSource();
    this.vinylNode.buffer = buffer;
    this.vinylNode.loop = true;

    this.vinylGain = this.ctx.createGain();
    this.vinylGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    this.vinylNode.connect(filter);
    filter.connect(this.vinylGain);
    this.vinylGain.connect(this.musicGain);

    this.vinylNode.start();
  }

  private stopVinylAmbience() {
    if (this.vinylNode) {
      try {
        this.vinylNode.stop();
        this.vinylNode.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.vinylNode = null;
    }
  }

  // --- Custom Audio File Player & Persistence ---

  private setupCustomAudioElement(src: string, title: string) {
    if (!this.customAudioElement) {
      this.customAudioElement = new Audio();
      try {
        if (this.ctx && this.musicGain && !this.customSourceNode) {
          this.customSourceNode = this.ctx.createMediaElementSource(this.customAudioElement);
          this.customSourceNode.connect(this.musicGain);
        }
      } catch {
        // Fallback to direct HTML5 audio output if AudioContext routing is restricted
      }
    }
    this.customAudioElement.src = src;
    this.customAudioElement.title = title;
    this.customAudioElement.loop = true;
    this.customAudioElement.volume = this.isMusicMuted ? 0 : this.musicVolume;
  }

  public async restorePersistentAudio(): Promise<string | null> {
    try {
      // 1. First priority: Check native Python disk persistence in public/ directory
      try {
        const res = await fetch('/custom_track_meta.json?t=' + Date.now());
        if (res.ok) {
          const meta = await res.json();
          if (meta && meta.hasCustom) {
            this.initContext();
            const trackTitle = meta.title || 'Uploaded Track';
            this.setupCustomAudioElement('/custom_track.audio?t=' + (meta.timestamp || Date.now()), trackTitle);
            this.isCustomPlaying = true;
            localStorage.setItem('threadpet_has_custom_audio', 'true');
            localStorage.setItem('threadpet_custom_track_name', trackTitle);
            return trackTitle;
          }
        }
      } catch {
        // Continue to IndexedDB fallback
      }

      // 2. Second priority: Check IndexedDB
      const saved = await loadPersistentAudio();
      if (saved && saved.blob) {
        this.initContext();
        const objectUrl = URL.createObjectURL(saved.blob);
        this.setupCustomAudioElement(objectUrl, saved.title);
        this.isCustomPlaying = true;
        localStorage.setItem('threadpet_has_custom_audio', 'true');
        localStorage.setItem('threadpet_custom_track_name', saved.title);
        return saved.title;
      }
    } catch (e) {
      console.warn('Could not restore persistent audio:', e);
    }
    return null;
  }

  public async loadCustomAudioFile(file: File): Promise<string> {
    this.initContext();
    this.stopLofiTrack();

    // 1. Save permanently to native disk via Python bridge
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result as string;
        nativeBridge.saveAudioToNative(file.name, base64Data);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.warn('Could not send audio to native Python:', e);
    }

    // 2. Save to IndexedDB as ArrayBuffer
    const title = await savePersistentAudio(file, file.name);
    const objectUrl = URL.createObjectURL(file);

    this.setupCustomAudioElement(objectUrl, title);
    this.isCustomPlaying = true;
    this.isMusicMuted = false;
    localStorage.setItem('threadpet_has_custom_audio', 'true');
    localStorage.setItem('threadpet_custom_track_name', title);

    await this.customAudioElement?.play().catch(() => {});
    return title;
  }

  // --- Adorable Procedural Sound Effects ---

  public playChime(type: SoundFxType) {
    if (this.isSfxMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    switch (type) {
      case 'touch': {
        // Cute marimba arpeggio (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          gain.gain.setValueAtTime(0.12, now + idx * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.18);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.2);
        });
        break;
      }

      case 'purr': {
        // Warm low harmonic vibration
        const osc = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);

        mod.type = 'sine';
        mod.frequency.setValueAtTime(24, now); // 24Hz purr rattle
        modGain.gain.setValueAtTime(35, now);

        mod.connect(modGain);
        modGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        mod.start(now);
        osc.start(now);
        mod.stop(now + 0.65);
        osc.stop(now + 0.65);
        break;
      }

      case 'whoosh': {
        // Air whoosh on quick swing
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.18);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }

      case 'giggle': {
        // High double squeak
        const chirps = [880, 1174.66];
        chirps.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + idx * 0.08 + 0.06);

          gain.gain.setValueAtTime(0.1, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.07);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.08);
        });
        break;
      }

      case 'sleep': {
        // Descending warm sigh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392, now);
        osc.frequency.exponentialRampToValueAtTime(261.63, now + 0.4);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.46);
        break;
      }

      case 'wake': {
        // Bright ascending sparkle
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          gain.gain.setValueAtTime(0.08, now + idx * 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);

          osc.connect(gain);
          gain.connect(this.sfxGain);

          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.13);
        });
        break;
      }
    }
  }
}

export const audioEngine = new AudioEngine();
