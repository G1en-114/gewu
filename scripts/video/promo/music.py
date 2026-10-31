"""Original score for the 99-second promo, synthesised from scratch.

D major, 72 bpm. A soft pad holds the chords, a felt-piano arpeggio moves in
eighths, a bass note marks each bar, and a small bell rings at each chapter
cut. Everything goes through a gentle hall reverb. Usage: python music.py <out.wav>
"""
import sys
import wave

import numpy as np

SR = 44100
DUR = 99.0
BPM = 72
BEAT = 60 / BPM
BAR = 4 * BEAT
N = int(SR * DUR)
rng = np.random.default_rng(7)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# Chords as MIDI notes (bass, then the voicing). I – vi – IV – V, then I – iii – IV – V.
D, Bm, G, A, Fsm, Em = [50, 62, 66, 69], [47, 62, 66, 71], [43, 62, 67, 71], [45, 61, 64, 69], [42, 61, 66, 69], [40, 62, 67, 71]
PROGRESSION = [D, Bm, G, A, D, Fsm, G, A, Em, G, D, A]
# Chapter cuts in the video, where a bell rings; and where the music thins (title) and resolves (end).
CUTS = [5.0, 18.0, 31.0, 49.0, 61.0, 72.0, 83.0, 92.0]

t_all = np.arange(N) / SR
mix = np.zeros(N)


def add(signal, start):
    i = int(start * SR)
    if i >= N:
        return
    j = min(N, i + len(signal))
    mix[i:j] += signal[: j - i]


def pad(freqs, length, amp):
    t = np.arange(int(length * SR)) / SR
    env = np.minimum(1, t / 1.6) * np.minimum(1, (length - t) / 1.8).clip(0)
    s = np.zeros_like(t)
    for f in freqs:
        for detune in (-0.12, 0.12):
            ff = f * 2 ** (detune / 12)
            s += np.sin(2 * np.pi * ff * t) + 0.25 * np.sin(4 * np.pi * ff * t)
    return amp * env * s / (len(freqs) * 2)


def piano(f, amp, length=2.8):
    t = np.arange(int(length * SR)) / SR
    s = np.zeros_like(t)
    for k, (h, d) in enumerate([(1, 1.0), (2, 0.42), (3, 0.18), (4, 0.09), (5, 0.04)]):
        s += d * np.sin(2 * np.pi * f * h * t * (1 + 0.0004 * k)) * np.exp(-t * (1.6 + 0.9 * k))
    attack = np.minimum(1, t / 0.006)
    # Felt: a soft low-passed thump at the start.
    thump = rng.standard_normal(len(t)) * np.exp(-t * 60) * 0.03
    return amp * attack * (s + thump)


def bell(f, amp):
    t = np.arange(int(4.5 * SR)) / SR
    s = sum(d * np.sin(2 * np.pi * f * r * t) * np.exp(-t * k) for r, d, k in [(1, 1, 0.9), (2.76, 0.35, 1.8), (5.4, 0.15, 3.0), (8.93, 0.06, 4.5)])
    return amp * np.minimum(1, t / 0.003) * s


# Arrangement: intro (title) pad only, then everything, resolving on D at 92 s.
bars = int(np.ceil(92.0 / BAR))
for b in range(bars):
    start = b * BAR
    chord = PROGRESSION[b % len(PROGRESSION)]
    bass, voicing = chord[0], chord[1:]
    add(pad([hz(m) for m in voicing], BAR + 1.2, 0.16), start)
    if start < 4.5:
        continue
    add(piano(hz(bass), 0.32, 3.6), start)
    # Arpeggio in eighths: up through the voicing and an octave above, then back.
    pattern = voicing + [voicing[0] + 12, voicing[1] + 12, voicing[2] + 12, voicing[1] + 12, voicing[0] + 12]
    density = 1.0 if start > 18 else 0.6
    for k, m in enumerate(pattern[:8]):
        if density < 1 and k % 2:
            continue
        accent = 1.0 if k % 4 == 0 else 0.72
        add(piano(hz(m), 0.13 * accent), start + k * BEAT / 2 + rng.uniform(0, 0.008))

for c in CUTS:
    add(bell(hz(86), 0.05), c - 0.05)

# Final chord: D major spread wide, letting ring to the end.
for k, m in enumerate([38, 50, 57, 62, 66, 69, 74, 78]):
    add(piano(hz(m), 0.16 if m > 60 else 0.24, 7.5), 92.0 + k * 0.06)
add(pad([hz(m) for m in [62, 66, 69, 74]], 7.0, 0.2), 92.0)

# Hall reverb: convolve with decaying stereo noise.
ir_len = int(2.6 * SR)
ir_t = np.arange(ir_len) / SR
left, right = [], []
for ch in range(2):
    ir = rng.standard_normal(ir_len) * np.exp(-ir_t * 2.4)
    ir[: int(0.02 * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2))
    wet = np.fft.irfft(np.fft.rfft(mix, N + ir_len) * np.fft.rfft(ir, N + ir_len))[:N]
    (left if ch == 0 else right).append(0.78 * mix + 0.32 * wet)
out = np.stack([left[0], right[0]], axis=1)

# Gentle master: fade in, fade out, soft limit, normalise to -1 dBFS.
fade = np.ones(N)
fade[: int(1.5 * SR)] = np.linspace(0, 1, int(1.5 * SR))
fade[-int(4 * SR):] = np.linspace(1, 0, int(4 * SR)) ** 1.5
out *= fade[:, None]
out = np.tanh(out * 1.2)
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print('ok', DUR, 's')
