import numpy as np
import wave
import struct
import subprocess
import os

sample_rate = 44100
bpm = 64
beat_sec = 60.0 / bpm
bar_sec = beat_sec * 4

# 8 bars total (approx 30 seconds)
total_bars = 8
total_sec = total_bars * bar_sec
total_samples = int(sample_rate * total_sec)

left = np.zeros(total_samples, dtype=np.float32)
right = np.zeros(total_samples, dtype=np.float32)

def midi_to_freq(midi):
    return 440.0 * (2.0 ** ((midi - 69) / 12.0))

def add_piano_note(start_time, midi, duration=3.0, velocity=0.8, pan=0.5):
    f0 = midi_to_freq(midi)
    start_sample = int(start_time * sample_rate)
    num_samples = int(duration * sample_rate)
    
    if start_sample >= total_samples:
        return
    
    actual_samples = min(num_samples, total_samples - start_sample)
    t = np.linspace(0, actual_samples / sample_rate, actual_samples, endpoint=False)
    
    # Realistic acoustic piano modeling:
    # Multiple harmonics with progressive high-frequency decay
    harmonics = [
        (1.0, 1.0, 2.8),      # Fundamental (f0)
        (2.002, 0.65, 3.8),   # 2nd harmonic (with slight inharmonicity)
        (3.006, 0.45, 5.2),   # 3rd harmonic
        (4.012, 0.28, 6.8),   # 4th harmonic
        (5.020, 0.15, 8.5),   # 5th harmonic
        (6.030, 0.08, 11.0),  # 6th harmonic
    ]
    
    tone = np.zeros(actual_samples, dtype=np.float32)
    for h_mult, h_amp, h_decay in harmonics:
        freq = f0 * h_mult
        if freq > 16000:
            continue
        # Hammer attack: quick rise then exponential fall
        decay_rate = h_decay * (1.0 + f0 / 800.0)
        envelope = np.minimum(t * 120.0, 1.0) * np.exp(-decay_rate * t)
        phase = np.sin(2 * np.pi * freq * t)
        tone += (h_amp * envelope * phase).astype(np.float32)
    
    # Soft felt hammer knock (very short low-frequency thump)
    knock = np.sin(2 * np.pi * 80.0 * t) * np.exp(-45.0 * t) * 0.15
    tone += knock.astype(np.float32)
    
    note_audio = tone * velocity * 0.22
    
    # Panning
    l_gain = np.cos(pan * np.pi / 2.0)
    r_gain = np.sin(pan * np.pi / 2.0)
    
    left[start_sample:start_sample + actual_samples] += note_audio * l_gain
    right[start_sample:start_sample + actual_samples] += note_audio * r_gain

# --- Composition: "in the pool" (Kensuke Ushio - Chainsaw Man) ---
# Bar 0: Fmaj7 (F - C - A - E)
# Bar 1: Dm9 (D - A - F - C - E)
# Bar 2: Bbmaj7 (Bb - F - D - A)
# Bar 3: Cadd9 (C - G - E - D)
# Bar 4-7: Second progression with emotive high melody

chords_prog = [
    # Bar 0: Fmaj7
    {"bass": [41, 53], "chord": [57, 60, 64], "arp": [(0.0, 65), (1.0, 69), (2.0, 72), (3.0, 76)]},
    # Bar 1: Dm9
    {"bass": [38, 50], "chord": [53, 57, 60], "arp": [(0.0, 65), (1.0, 64), (2.0, 60), (3.0, 57)]},
    # Bar 2: Bbmaj7
    {"bass": [46, 58], "chord": [62, 65, 69], "arp": [(0.0, 74), (1.0, 72), (2.0, 69), (3.0, 65)]},
    # Bar 3: Cadd9
    {"bass": [36, 48], "chord": [55, 60, 62], "arp": [(0.0, 67), (1.5, 69), (2.5, 72), (3.25, 74)]},
    
    # Bar 4: Fmaj7 (higher octave emotion)
    {"bass": [41, 53], "chord": [60, 64, 69], "arp": [(0.0, 77), (1.0, 76), (2.0, 72), (3.0, 69)]},
    # Bar 5: Dm9 (floating)
    {"bass": [38, 50], "chord": [57, 60, 64], "arp": [(0.0, 76), (1.0, 74), (2.0, 72), (3.0, 65)]},
    # Bar 6: Bbmaj7 (tender)
    {"bass": [46, 58], "chord": [62, 65, 69], "arp": [(0.0, 74), (1.0, 72), (2.0, 69), (3.0, 62)]},
    # Bar 7: Cadd9 -> F resolution
    {"bass": [36, 48], "chord": [55, 60, 64], "arp": [(0.0, 67), (1.5, 65), (2.5, 64), (3.0, 65)]},
]

for bar_idx, bar in enumerate(chords_prog):
    t_bar = bar_idx * bar_sec
    # Bass notes
    for b_note in bar["bass"]:
        add_piano_note(t_bar, b_note, duration=bar_sec * 0.95, velocity=0.55, pan=0.35)
    # Mid chord notes
    for idx, c_note in enumerate(bar["chord"]):
        st = t_bar + 0.04 * (idx + 1)
        add_piano_note(st, c_note, duration=bar_sec * 0.9, velocity=0.45, pan=0.45 + idx * 0.05)
    # High melody notes (arpeggiated theme)
    for offset_beat, m_note in bar["arp"]:
        m_time = t_bar + offset_beat * beat_sec
        add_piano_note(m_time, m_note, duration=3.2, velocity=0.75, pan=0.55)

# --- Atmospheric Pool / Night Ambience Layer ---
np.random.seed(42)
t_full = np.linspace(0, total_sec, total_samples, endpoint=False)

# Soft filtered water movement (gentle sinusoidal waves on filtered noise)
water_noise = np.random.normal(0, 0.015, total_samples).astype(np.float32)
water_swell = 0.5 + 0.5 * np.sin(2 * np.pi * 0.18 * t_full)
water_sound = water_noise * water_swell * 0.18

left += water_sound
right += water_sound * 0.9

# Simple Schroeder-style Reverb for deep night school swimming pool acoustics
def apply_reverb(signal, delay_ms=45, decay=0.35):
    d_samples = int(sample_rate * (delay_ms / 1000.0))
    out = signal.copy()
    for i in range(d_samples, len(signal)):
        out[i] += out[i - d_samples] * decay
    return out

left = apply_reverb(left, delay_ms=58, decay=0.32)
right = apply_reverb(right, delay_ms=73, decay=0.32)

# Normalize audio to prevent clipping (-1dB headroom)
max_amp = max(np.max(np.abs(left)), np.max(np.abs(right)))
if max_amp > 0:
    left = (left / max_amp) * 0.88
    right = (right / max_amp) * 0.88

# Fade in and Fade out for seamless loop
fade_len = int(sample_rate * 0.8)
fade_in = np.linspace(0, 1, fade_len)
fade_out = np.linspace(1, 0, fade_len)
left[:fade_len] *= fade_in
right[:fade_len] *= fade_in
left[-fade_len:] *= fade_out
right[-fade_len:] *= fade_out

# Write WAV
wav_path = "public/in_the_pool.wav"
mp3_path = "public/in_the_pool.mp3"

left_i16 = (left * 32767).astype(np.int16)
right_i16 = (right * 32767).astype(np.int16)
stereo_i16 = np.empty((left_i16.size + right_i16.size,), dtype=np.int16)
stereo_i16[0::2] = left_i16
stereo_i16[1::2] = right_i16

with wave.open(wav_path, 'wb') as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(sample_rate)
    wf.writeframes(stereo_i16.tobytes())

print(f"Generated {wav_path} successfully ({total_sec:.1f}s)")

# Convert to MP3
cmd = ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-b:a", "192k", mp3_path]
subprocess.run(cmd, check=True)
print(f"Converted to {mp3_path} successfully!")
