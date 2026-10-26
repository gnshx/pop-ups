import type { CharacterConfig, LofiTrack } from '../types/pet';

export const DEFAULT_CHARACTERS: CharacterConfig[] = [
  {
    id: 'reze_denji',
    name: 'Reze & Denji (Chainsaw Man)',
    personality: 'Denji and Reze hanging together by a red thread, listening to "in the pool" and dreaming of swimming together.',
    hairStyle: 'twintails',
    hairColor: '#312e81', // Dark violet-black for Reze, blonde for Denji in image
    hairHighlight: '#818cf8',
    eyeStyle: 'anime_round',
    eyeColor: '#f43f5e',
    skinTone: '#fff1f2',
    hoodieColor: '#1e293b', // Navy hoodie & uniform
    hoodieAccent: '#ef4444', // Crimson ribbon
    hoodiePocket: true,
    accessories: ['ribbon'],
    accessoryColor: '#ef4444',
    threadType: 'crimson_silk',
    threadColor: '#ef4444',
    threadLength: 175,
    scale: 1.05,
    currentExpression: 'happy',
    imageUrl: '/reze_denji.png',
  },
  {
    id: 'gojo_satoru',
    name: 'Gojo Satoru (Jujutsu Kaisen)',
    personality: 'The strongest sorcerer with Six Eyes and Domain Expansion, chilling as your desktop companion.',
    hairStyle: 'short',
    hairColor: '#f8fafc',
    hairHighlight: '#e2e8f0',
    eyeStyle: 'sparkle',
    eyeColor: '#0ea5e9',
    skinTone: '#fff1f2',
    hoodieColor: '#0f172a',
    hoodieAccent: '#38bdf8',
    hoodiePocket: true,
    accessories: ['glasses'],
    accessoryColor: '#0f172a',
    threadType: 'neon_cyan',
    threadColor: '#38bdf8',
    threadLength: 175,
    scale: 1.05,
    currentExpression: 'happy',
    imageUrl: '/gojo_satoru.png',
  },
  {
    id: 'sukuna',
    name: 'Ryomen Sukuna (Jujutsu Kaisen)',
    personality: 'The King of Curses resting atop his throne, adorned in traditional kimono and malevolent black curse markings.',
    hairStyle: 'short',
    hairColor: '#f43f5e', // Spiky light pink hair
    hairHighlight: '#fb7185',
    eyeStyle: 'cat_slit',
    eyeColor: '#dc2626', // Piercing crimson red
    skinTone: '#fff1f2',
    hoodieColor: '#18181b', // White / dark kimono
    hoodieAccent: '#991b1b', // Deep crimson
    hoodiePocket: false,
    accessories: ['none'],
    accessoryColor: '#991b1b',
    threadType: 'crimson_silk',
    threadColor: '#dc2626',
    threadLength: 175,
    scale: 1.05,
    currentExpression: 'happy',
    imageUrl: '/sukuna.png',
  },
  {
    id: 'yuji_itadori',
    name: 'Yuji Itadori (Jujutsu Kaisen)',
    personality: 'The vessel of Sukuna with immense physical power and an indomitable warm heart, ready to protect everyone.',
    hairStyle: 'short',
    hairColor: '#fb7185', // Spiky pink hair with black undercut
    hairHighlight: '#f43f5e',
    eyeStyle: 'anime_round',
    eyeColor: '#9a3412', // Warm hazel / amber brown
    skinTone: '#fff1f2',
    hoodieColor: '#0f172a', // Jujutsu Tech navy uniform
    hoodieAccent: '#ef4444', // Red hooded collar
    hoodiePocket: true,
    accessories: ['none'],
    accessoryColor: '#ef4444',
    threadType: 'golden_wire',
    threadColor: '#f59e0b',
    threadLength: 175,
    scale: 1.05,
    currentExpression: 'happy',
    imageUrl: '/yuji_itadori.png',
  },
  {
    id: 'yuta_okkotsu',
    name: 'Yuta Okkotsu (Jujutsu Kaisen)',
    personality: 'Special Grade Jujutsu Sorcerer bound to Rika, wielding his katana with boundless cursed energy.',
    hairStyle: 'short',
    hairColor: '#1e1b4b', // Dark midnight black
    hairHighlight: '#312e81',
    eyeStyle: 'anime_round',
    eyeColor: '#0284c7', // Dark blue / gray
    skinTone: '#fff1f2',
    hoodieColor: '#f8fafc', // White Jujutsu High jacket
    hoodieAccent: '#3b82f6', // Katana strap accent
    hoodiePocket: true,
    accessories: ['none'],
    accessoryColor: '#3b82f6',
    threadType: 'twilight_purple',
    threadColor: '#a855f7',
    threadLength: 175,
    scale: 1.05,
    currentExpression: 'happy',
    imageUrl: '/yuta_okkotsu.png',
  },
  {
    id: 'luna',
    name: 'Luna (ルナ)',
    personality: 'Sleepy & gentle anime companion who loves lofi beats and napping.',
    hairStyle: 'twintails',
    hairColor: '#e0e7ff', // Silver-lavender
    hairHighlight: '#c7d2fe',
    eyeStyle: 'anime_round',
    eyeColor: '#38bdf8', // Neon Sky Blue
    skinTone: '#fff1f2', // Soft porcelain
    hoodieColor: '#18181b', // Midnight Black Hoodie
    hoodieAccent: '#818cf8', // Indigo accents
    hoodiePocket: true,
    accessories: ['cat_ears', 'ribbon'],
    accessoryColor: '#f43f5e', // Rose red cat ear inner & ribbon
    threadType: 'crimson_silk',
    threadColor: '#f43f5e',
    threadLength: 170,
    scale: 1.0,
    currentExpression: 'idle',
  },
  {
    id: 'sakura',
    name: 'Sakura (サクラ)',
    personality: 'Bubbly, cheerful idol who dances whenever upbeat melody plays.',
    hairStyle: 'flowing',
    hairColor: '#f472b6', // Pastel Pink
    hairHighlight: '#fbcfe8',
    eyeStyle: 'sparkle',
    eyeColor: '#a855f7', // Violet
    skinTone: '#fff1f2',
    hoodieColor: '#fdf2f8', // Pastel Cream Pink
    hoodieAccent: '#ec4899',
    hoodiePocket: true,
    accessories: ['bunny_ears'],
    accessoryColor: '#fb7185',
    threadType: 'golden_wire',
    threadColor: '#fbbf24',
    threadLength: 190,
    scale: 1.05,
    currentExpression: 'happy',
  },
  {
    id: 'kuro',
    name: 'Kuro (クロ)',
    personality: 'Chill gamer hacker who hangs quietly with high-tech glowing headphones.',
    hairStyle: 'short',
    hairColor: '#312e81', // Midnight Indigo
    hairHighlight: '#6366f1',
    eyeStyle: 'cat_slit',
    eyeColor: '#2dd4bf', // Neon Teal
    skinTone: '#f8fafc',
    hoodieColor: '#09090b', // Deep Stealth Black
    hoodieAccent: '#06b6d4', // Cyber Cyan
    hoodiePocket: true,
    accessories: ['headset', 'cat_ears'],
    accessoryColor: '#06b6d4',
    threadType: 'neon_cyan',
    threadColor: '#06b6d4',
    threadLength: 160,
    scale: 0.95,
    currentExpression: 'idle',
  },
  {
    id: 'aoi',
    name: 'Aoi (アオイ)',
    personality: 'Quiet star-gazer who dreams of galaxies and cosmic lullabies.',
    hairStyle: 'bob',
    hairColor: '#0284c7', // Sky Azure
    hairHighlight: '#7dd3fc',
    eyeStyle: 'droopy',
    eyeColor: '#f59e0b', // Golden Amber
    skinTone: '#fff1f2',
    hoodieColor: '#1e1b4b', // Midnight Navy
    hoodieAccent: '#fbbf24', // Star gold
    hoodiePocket: true,
    accessories: ['halo'],
    accessoryColor: '#fde047',
    threadType: 'twilight_purple',
    threadColor: '#c084fc',
    threadLength: 200,
    scale: 1.0,
    currentExpression: 'sleepy',
  },
];

export const LOFI_TRACKS: LofiTrack[] = [
  {
    id: 'in-the-pool',
    title: 'in the pool (Chainsaw Man: Reze Arc)',
    artist: 'Kensuke Ushio (牛尾憲輔)',
    bpm: 66,
    chords: ['Fmaj7', 'Dm9', 'Bbmaj7', 'Cadd9'],
    key: 'F Major / D Minor',
    mode: 'chill',
  },
  {
    id: 'track-1',
    title: 'Midnight Rain & Warm Tea',
    artist: 'ThreadPet Chillhop',
    bpm: 74,
    chords: ['Dm9', 'G13', 'Cmaj9', 'Am7'],
    key: 'C Major / A Minor',
    mode: 'rain',
  },
  {
    id: 'track-2',
    title: 'Sakura Afternoon Reverie',
    artist: 'Lofi Chibi Studio',
    bpm: 80,
    chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7'],
    key: 'F Major',
    mode: 'chill',
  },
  {
    id: 'track-3',
    title: 'Starlight Dream & Floating Cat',
    artist: 'Aetheric Synthetics',
    bpm: 68,
    chords: ['Abmaj7', 'Bb', 'Cm7', 'Eb'],
    key: 'Eb Major',
    mode: 'dream',
  },
  {
    id: 'track-4',
    title: 'Cozy Desktop Pixel Naps',
    artist: 'Coffee & Cat Sanctuary',
    bpm: 72,
    chords: ['Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7'],
    key: 'Db Major',
    mode: 'night',
  },
];
