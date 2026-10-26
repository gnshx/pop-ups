export type ExpressionType = 'idle' | 'happy' | 'sleepy' | 'surprised' | 'dancing' | 'dizzy';

export type PerformanceProfile = 'high' | 'low';

export type HairStyle = 'twintails' | 'bob' | 'flowing' | 'short' | 'curly';
export type EyeStyle = 'anime_round' | 'cat_slit' | 'sparkle' | 'droopy';
export type AccessoryType = 'cat_ears' | 'bunny_ears' | 'halo' | 'headset' | 'ribbon' | 'glasses' | 'none';
export type ThreadType = 'crimson_silk' | 'golden_wire' | 'neon_cyan' | 'twilight_purple' | 'invisible';

export interface CharacterConfig {
  id: string;
  name: string;
  personality: string;
  hairStyle: HairStyle;
  hairColor: string;
  hairHighlight: string;
  eyeStyle: EyeStyle;
  eyeColor: string;
  skinTone: string;
  hoodieColor: string;
  hoodieAccent: string;
  hoodiePocket: boolean;
  accessories: AccessoryType[];
  accessoryColor: string;
  threadType: ThreadType;
  threadColor: string;
  threadLength: number; // in pixels (100 - 350)
  scale: number; // 0.6 - 1.4
  currentExpression: ExpressionType;
  imageUrl?: string;
}

export interface PhysicsState {
  angle: number; // theta in radians
  angularVelocity: number; // omega in rad/s
  angularAcceleration: number; // alpha in rad/s^2
  anchorX: number;
  anchorY: number;
  bobX: number;
  bobY: number;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  dragVelocityX: number;
  dragVelocityY: number;
  tension: number;
  dampening: number;
  gravity: number;
  lastShakeTime: number;
  shakeCount: number;
}

export interface LofiTrack {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  chords: string[];
  key: string;
  mode: 'chill' | 'rain' | 'dream' | 'night';
}

export interface AudioState {
  musicEnabled: boolean;
  soundFxEnabled: boolean;
  isPlaying: boolean;
  currentTrackId: string;
  volume: number;
  isCustomAudio: boolean;
  customTrackName?: string;
  beatIntensity: number; // 0 - 1
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'note' | 'heart' | 'zzz' | 'sparkle';
  color: string;
  alpha: number;
  scale: number;
  rotation: number;
  life: number;
  maxLife: number;
}
