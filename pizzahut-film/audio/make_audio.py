#!/usr/bin/env python3
"""Original cinematic anthem score + SFX for the Pizza Hut Indonesia concept film.
Pure numpy/scipy synthesis, no samples. The SFX are placed on the cue list the page exports
(build/cues.json, written by `node render/render.js --cues`).

  python3 audio/make_audio.py   -> build/audio.wav (48 kHz stereo, 24-bit float mix → 16-bit)

Key of D major, 90 BPM, one chord per bar. Sections follow the film:
  bars 0-3   S1 cold open      solo piano + melody, warm pad
  bars 3-7   S2 Jakarta 1984   same piano through an "old record" filter, projector rattle
  bars 7-10  S3 time travel    8th-note ostinato + clock ticks, strings enter
  bars 10-14 S4 map            taiko on 1 & 3, full strings, bass
  bars 14-19 S5 food/formats   stomp-clap groove
  bars 19-23 S6 people         breakdown, tender piano melody
  bars 23-26 S7 together       build: toms, snare roll, riser, strings carry the melody
  bar  26-   S8 reveal         the hit: brass, choir, cymbal; plagal G/D → D ending
"""
import json, os
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
meta = json.load(open(os.path.join(ROOT, 'build', 'cues.json')))
DUR = meta['duration']
BPM = meta['bpm']
B = 60.0 / BPM
BAR = 4 * B
N = int((DUR + 4) * SR)
rng = np.random.default_rng(1984)

def buf(): return np.zeros((N, 2))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n) / SR
def noise(n): return rng.standard_normal(n)
def bt(bar, beat=0.0): return bar * BAR + beat * B

def place(bus, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or len(sig) == 0: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.4142, sig * r * 1.4142], 1)
    if i < 0: sig, i = sig[-i:], 0
    j = min(N, i + len(sig))
    bus[i:j] += sig[: j - i] * gain

def sos(kind, f, order=2):
    if isinstance(f, (list, tuple)): f = [min(x, SR / 2 * 0.95) for x in f]
    else: f = min(f, SR / 2 * 0.95)
    return butter(order, f, btype=kind, fs=SR, output='sos')

def polyblep_saw(freq, n, phase0=0.0, fm=None):
    dt = (freq if fm is None else freq * fm) / SR
    if np.isscalar(dt): dt = np.full(n, dt)
    ph = (phase0 + np.cumsum(dt)) % 1.0
    s = 2 * ph - 1
    m1 = ph < dt; x = ph[m1] / dt[m1]; s[m1] -= x + x - x * x - 1
    m2 = ph > 1 - dt; x = (ph[m2] - 1) / dt[m2]; s[m2] -= x * x + x + x + 1
    return s

def block_filter(x, cut_fn, kind='band', width=1.2, block=256):
    y = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        c = cut_fn(s / SR)
        so = sos('bandpass', [c / width, c * width]) if kind == 'band' else sos(kind, c)
        if zi is None: zi = np.zeros((so.shape[0], 2))
        y[s:s + block], zi = sosfilt(so, x[s:s + block], zi=zi)
    return y

def reverb_ir(sec=3.2, decay=1.6, bright=5200, pre=0.02):
    n = int(sec * SR); t = tt(n)
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-t * decay)[:, None]
    ir = sosfilt(sos('lowpass', bright), ir, axis=0)
    # darker tail
    tail = sosfilt(sos('lowpass', 1800), ir, axis=0)
    mixk = np.clip(t / sec * 1.6, 0, 1)[:, None]
    ir = ir * (1 - mixk) + tail * mixk
    ir[: int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))[:, None]
    ir = np.concatenate([np.zeros((int(pre * SR), 2)), ir])
    return ir / np.sqrt((ir ** 2).sum(0))

def reverb(x, ir):
    out = np.zeros_like(x)
    for c in range(2): out[:, c] = fftconvolve(x[:, c], ir[:, c])[: len(x)]
    return out

# ------------------------------------------------------------------ instruments
def piano(m, dur, vel=0.7):
    """additive piano: inharmonic partials, per-partial decay, two slightly detuned strings, hammer thump"""
    n = int((dur + 1.6) * SR); t = tt(n); f = mtof(m)
    Bi = 0.00035 * (1 + (m - 60) / 40)
    out = np.zeros(n)
    bright = 0.55 + 0.6 * vel
    for h in range(1, 16):
        fh = f * h * np.sqrt(1 + Bi * h * h)
        if fh > SR / 2.3: break
        amp = (1 / h ** (1.35 - 0.35 * bright)) * (1 if h < 3 else 0.8)
        dec = (0.55 + 0.012 * (m - 40)) * (1 + 0.35 * h)
        det = 1 + 0.0007 * (1 if h % 2 else -1)
        ph = rng.random() * 6.283
        out += amp * (np.sin(2 * np.pi * fh * t + ph) + 0.6 * np.sin(2 * np.pi * fh * det * t + ph * 1.3)) * \
            (0.65 * np.exp(-t * dec) + 0.35 * np.exp(-t * dec * 0.18))
    out *= np.minimum(1, t / 0.003)
    # release: damper after dur
    rel = np.ones(n); k = int(dur * SR)
    if k < n: rel[k:] = np.exp(-(t[k:] - dur) * 9)
    out *= rel
    thump = sosfilt(sos('lowpass', 900), noise(n)) * np.exp(-t * 60) * 0.25
    return (out * 0.16 + thump * 0.05) * vel

def strings(notes, dur, att=0.6, rel=0.9, cut=2600, vib=0.0035):
    n = int((dur + rel) * SR); t = tt(n)
    s = np.zeros(n)
    for m in notes:
        f = mtof(m)
        for v in range(5):
            d = (v - 2) * 0.07
            fm = 2 ** (d / 12) * (1 + vib * np.sin(2 * np.pi * (4.8 + v * 0.31) * t + v))
            s += polyblep_saw(f, n, rng.random(), fm)
    s /= np.sqrt(len(notes) * 5)
    s = sosfilt(sos('lowpass', cut), s)
    s = sosfilt(sos('highpass', 90), s)
    env = np.minimum(1, t / att) ** 1.5
    k = int(dur * SR); env[k:] *= np.exp(-(t[k:] - dur) / (rel / 3))
    return s * env * 0.22

def brass(notes, dur, open_t=0.5):
    n = int((dur + 1.0) * SR); t = tt(n)
    s = np.zeros(n)
    for m in notes:
        for v in range(3):
            s += polyblep_saw(mtof(m) * 2 ** ((v - 1) * 0.05 / 12), n, rng.random())
    s /= np.sqrt(len(notes) * 3)
    s = block_filter(s, lambda x: 350 * 2 ** (3.2 * min(1, x / open_t)) * (1 - 0.35 * min(1, max(0, x - open_t) / 2.5)), 'lowpass')
    env = np.minimum(1, t / 0.06); k = int(dur * SR); env[k:] *= np.exp(-(t[k:] - dur) * 3)
    return np.tanh(1.5 * s) * env * 0.22

def choir(notes, dur, att=0.8):
    n = int((dur + 1.2) * SR); t = tt(n)
    src = np.zeros(n)
    for m in notes:
        for v in range(4):
            src += polyblep_saw(mtof(m) * 2 ** ((v - 1.5) * 0.08 / 12), n, rng.random(), 1 + 0.004 * np.sin(2 * np.pi * 5.2 * t + v))
    src /= np.sqrt(len(notes) * 4)
    out = np.zeros(n)
    for fc, bw, g in ((700, 1.25, 1.0), (1150, 1.2, 0.6), (2600, 1.15, 0.25)):  # "aah"
        out += sosfilt(sos('bandpass', [fc / bw, fc * bw]), src) * g
    env = np.minimum(1, t / att) ** 1.4; k = int(dur * SR); env[k:] *= np.exp(-(t[k:] - dur) * 2.2)
    return out * env * 0.5

def sub_bass(m, dur):
    n = int((dur + 0.4) * SR); t = tt(n); f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    env = np.minimum(1, t / 0.04); k = int(dur * SR); env[k:] *= np.exp(-(t[k:] - dur) * 10)
    return np.tanh(1.2 * s) * env * 0.5

def taiko(p=1.0):
    n = int(1.4 * SR); t = tt(n)
    f = (62 + 70 * np.exp(-t * 22)) * p
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.2)
    skin = sosfilt(sos('bandpass', [120, 900]), noise(n)) * np.exp(-t * 28) * 0.6
    return np.tanh(1.8 * (body + skin)) * 0.8

def tom(p=1.0):
    n = int(0.6 * SR); t = tt(n)
    f = (110 + 90 * np.exp(-t * 30)) * p
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + sosfilt(sos('bandpass', [200, 2000]), noise(n)) * np.exp(-t * 40) * 0.4) * 0.6

def kick():
    n = int(0.5 * SR); t = tt(n)
    f = 44 + 90 * np.exp(-t * 28)
    return np.tanh(1.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)) * 0.9

def stomp():
    n = int(0.35 * SR); t = tt(n)
    f = 70 + 60 * np.exp(-t * 40)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    wood = sosfilt(sos('bandpass', [150, 1200]), noise(n)) * np.exp(-t * 35) * 0.7
    return (body + wood) * 0.7

def clap():
    n = int(0.45 * SR); t = tt(n); e = np.zeros(n)
    for k, off in enumerate([0, 0.009, 0.019, 0.031]):
        i = int(off * SR); e[i:] += np.exp(-(t[: n - i]) * (210 if k < 3 else 18))
    return sosfilt(sos('bandpass', [800, 5000]), noise(n)) * e * 0.55

def snare(v=1.0):
    n = int(0.25 * SR); t = tt(n)
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4
    wires = sosfilt(sos('bandpass', [1500, 8000]), noise(n)) * np.exp(-t * 22)
    return (body + wires) * 0.4 * v

def cymbal(sec=3.0):
    n = int(sec * SR); t = tt(n)
    return sosfilt(sos('highpass', 3500), noise(n)) * np.exp(-t * 1.3) * 0.28

def rev_cymbal(sec=2.0):
    return cymbal(sec)[::-1] * np.linspace(0.2, 1, int(sec * SR)) ** 2

def tickwood(p=1.0):
    n = int(0.06 * SR); t = tt(n)
    return (np.sin(2 * np.pi * 1900 * p * t) * np.exp(-t * 120) + sosfilt(sos('bandpass', [2500, 6000]), noise(n)) * np.exp(-t * 300) * 0.3) * 0.35

def bell(m, dur=3.0):
    n = int(dur * SR); t = tt(n); f = mtof(m); out = np.zeros(n)
    for r, a, d in [(1, 1, 1.3), (2.0, .45, 2.2), (3.01, .3, 3.2), (4.17, .2, 4.4), (5.43, .12, 6)]:
        out += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    return out * np.minimum(1, t / 0.002) * 0.12

# ------------------------------------------------------------------ SFX
def sfx(name, p=1.0, d=0.0):
    if name == 'soft_cut':
        n = int(0.6 * SR); t = tt(n)
        body = np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-t * 20)) / SR) * np.exp(-t * 7)
        air = sosfilt(sos('bandpass', [400, 3000]), noise(n)) * np.exp(-t * 12) * 0.2
        return (body * 0.6 + air) * 0.7
    if name == 'swell':  # soft reverse-air swell that blooms after the cue
        n = int(2.2 * SR); u = tt(n) / 2.2
        y = block_filter(noise(n), lambda s: 300 * 2 ** (3 * (s / 2.2)), 'band', 1.8)
        tone = sum(np.sin(2 * np.pi * mtof(m) * tt(n)) for m in (74, 78, 81)) * 0.08
        return (y * 0.5 + tone) * np.sin(np.pi * u) ** 2 * 0.8
    if name == 'projector':
        n = int(d * SR); t = tt(n)
        clicks = np.zeros(n)
        per = int(SR / 24)
        for i in range(0, n, per):
            k = min(n, i + int(0.012 * SR))
            clicks[i:k] += np.exp(-tt(k - i) * 400) * (0.7 + 0.3 * rng.random())
        clatter = sosfilt(sos('bandpass', [1200, 5000]), noise(n)) * clicks
        motor = (np.sin(2 * np.pi * 96 * t) * 0.3 + sosfilt(sos('lowpass', 300), noise(n)) * 0.6) * 0.25
        env = np.minimum(1, t / 0.4) * np.minimum(1, (d - t) / 0.6).clip(0, 1)
        return (clatter * 0.5 + motor) * env * 0.6
    if name == 'typekey':
        n = int(0.25 * SR); t = tt(n)
        c = sosfilt(sos('bandpass', [900 * p, 4000 * p]), noise(n)) * np.exp(-t * 90)
        body = np.sin(2 * np.pi * 140 * p * t) * np.exp(-t * 35) * 0.5
        return (c + body) * 0.6
    if name == 'buzz':
        n = int(0.3 * SR); t = tt(n)
        s = sum(np.sign(np.sin(2 * np.pi * 120 * k * t)) / k for k in (1, 2, 3))
        return sosfilt(sos('bandpass', [200, 3000]), s) * np.exp(-t * 8) * 0.12
    if name == 'bulbs_on':
        n = int(2.5 * SR); t = tt(n)
        clunk = sosfilt(sos('lowpass', 1200), noise(n)) * np.exp(-t * 40) * 0.6
        hum = (np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120 * t)) * np.minimum(1, t / 0.4) * np.exp(-t * 0.8) * 0.08
        return clunk + hum
    if name == 'riser':
        n = int(max(d, 0.4) * SR); u = tt(n) / max(d, 0.4)
        y = block_filter(noise(n), lambda s: 250 * 2 ** (5 * (s / max(d, 0.4)) ** 1.6), 'band', 1.5)
        tone = np.sin(2 * np.pi * np.cumsum(150 + 900 * u ** 2) / SR) * 0.1
        return (y * 0.8 + tone) * u ** 2.2
    if name in ('impact', 'hit'):
        big = name == 'hit'
        n = int((3.5 if big else 2.2) * SR); t = tt(n)
        f = 32 + 70 * np.exp(-t * 10)
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * (1.4 if big else 2.2))
        hitn = sosfilt(sos('lowpass', 3000), noise(n)) * np.exp(-t * 16) * 0.7
        out = np.tanh(1.4 * (sub + hitn)) * 0.9
        if big: out = out + cymbal(3.5)[:n] * 1.2
        return out
    if name == 'whoosh':
        n = int(0.7 * SR); u = tt(n) / 0.7
        y = block_filter(noise(n), lambda s: 400 * 2 ** (3.2 * np.sin(np.pi * min(1, s / 0.7) * 0.9)), 'band', 1.5)
        return y * np.sin(np.pi * u) ** 1.6 * 0.8
    if name == 'swoosh_up':
        n = int(0.45 * SR); u = tt(n) / 0.45
        y = block_filter(noise(n), lambda s: 700 * 2 ** (2.5 * (s / 0.45)), 'band', 1.4)
        return y * np.sin(np.pi * u) ** 2 * 0.55
    if name == 'tick':
        n = int(0.03 * SR); t = tt(n)
        return sosfilt(sos('bandpass', [2500 * p, 6500 * p]), noise(n)) * np.exp(-t * 520) * 0.45
    if name == 'ping':
        n = int(1.8 * SR); t = tt(n); f = 1320 * p
        return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 4)) * np.exp(-t * 3.2) * np.minimum(1, t / 0.002) * 0.22
    if name == 'pulse_wave':
        n = int((d + 1.0) * SR); t = tt(n); u = np.clip(t / d, 0, 1)
        y = block_filter(noise(n), lambda s: 180 * 2 ** (2.5 * min(1, s / d)), 'band', 2.0)
        env = np.sin(np.pi * u) ** 1.2 * np.exp(-np.maximum(0, t - d) * 4)
        return y * env * 0.4
    if name == 'thump':
        n = int(0.6 * SR); t = tt(n)
        f = (58 + 70 * np.exp(-t * 35)) * p
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
        click = sosfilt(sos('bandpass', [2000, 6000]), noise(n)) * np.exp(-t * 300) * 0.3
        return np.tanh(1.4 * (body + click)) * 0.7
    if name == 'card':
        n = int(0.4 * SR); t = tt(n)
        swish = sosfilt(sos('bandpass', [800, 5000]), noise(n)) * np.sin(np.pi * np.clip(t / 0.25, 0, 1)) ** 2 * 0.4
        thud = np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-t * 40)) / SR) * np.exp(-t * 20) * 0.5
        return swish + thud
    if name == 'print':
        n = int(0.35 * SR); t = tt(n)
        slap = sosfilt(sos('bandpass', [500, 4500]), noise(n)) * np.exp(-t * 45) * 0.6
        body = np.sin(2 * np.pi * 120 * t) * np.exp(-t * 30) * 0.3
        return slap + body
    if name == 'shutter':
        n = int(0.12 * SR); t = tt(n); out = np.zeros(n)
        for off in (0, 0.045):
            i = int(off * SR)
            out[i:] += sosfilt(sos('bandpass', [1800 * p, 7000]), noise(n - i)) * np.exp(-tt(n - i) * 260)
        return out * 0.5
    if name == 'chime':
        n = int(3.0 * SR); out = np.zeros(n)
        for k, m in enumerate((86, 90, 93)):
            place_mono = bell(m, 3.0 - k * 0.08)
            i = int(k * 0.08 * SR); out[i:i + len(place_mono)] += place_mono[: n - i]
        return out
    if name == 'shimmer':
        n = int(3.5 * SR); out = np.zeros(n)
        for k, m in enumerate((86, 88, 90, 93, 95, 98, 100, 102)):
            s = bell(m, 3.0); i = int(k * 0.06 * SR); j = min(n, i + len(s)); out[i:j] += s[: j - i] * (1 - k * 0.07)
        return out * 0.8
    raise ValueError(name)

# ------------------------------------------------------------------ harmony
CH = {
    'D':  dict(root=38, v=[50, 57, 62, 66, 69], s=[62, 66, 69, 74]),
    'Bm': dict(root=35, v=[47, 54, 59, 62, 66], s=[59, 62, 66, 71]),
    'G':  dict(root=31, v=[43, 50, 55, 59, 62], s=[59, 62, 67, 71]),
    'A':  dict(root=33, v=[45, 52, 57, 61, 64], s=[61, 64, 69, 73]),
    'GD': dict(root=38, v=[50, 55, 59, 62, 67], s=[59, 62, 67, 71]),  # G/D for the plagal ending
}
PROG = ['D', 'Bm', 'G', 'A',  'D', 'Bm', 'G',  'A', 'Bm', 'G',  'D', 'A', 'Bm', 'G',
        'D', 'A', 'Bm', 'G', 'A',  'G', 'D', 'A', 'Bm',  'G', 'D', 'A',  'D', 'GD', 'D', 'D']
MEL = {  # (beat, midi, beats)
    'D':  [(0, 78, 1.5), (1.5, 76, 0.5), (2, 74, 2)],
    'Bm': [(0, 74, 1), (1, 78, 1), (2, 81, 2)],
    'G':  [(0, 83, 1.5), (1.5, 81, 0.5), (2, 79, 2)],
    'A':  [(0, 76, 1), (1, 78, 1), (2, 76, 1), (3, 73, 1)],
    'GD': [(0, 79, 2), (2, 78, 2)],
}
NB = len(PROG)

pno, mel, strg, low, drm, tick, big, fx = (buf() for _ in range(8))

def section(b):
    if b < 3: return 'S1'
    if b < 7: return 'S2'
    if b < 10: return 'S3'
    if b < 14: return 'S4'
    if b < 19: return 'S5'
    if b < 23: return 'S6'
    if b < 26: return 'S7'
    return 'S8'

for b in range(NB):
    t0 = bt(b); c = PROG[b]; ch = CH[c]; sec = section(b); v = ch['v']
    # ---------------- piano
    if sec in ('S1', 'S2', 'S6'):
        pat = [(0, 0, 0.55), (0.5, 2, 0.35), (1.0, 3, 0.35), (1.5, 4, 0.3), (2.5, 3, 0.3), (3.0, 2, 0.28)]
        for beat, idx, vel in pat:
            place(pno, piano(v[idx], B * 2, vel), t0 + beat * B, 1, pan=-0.3 + idx * 0.15)
        place(pno, piano(ch['root'] + 12, BAR, 0.5), t0, 1, pan=-0.4)
    elif sec == 'S8':
        if b == 26:
            for idx in range(5): place(pno, piano(v[idx], BAR * 1.5, 0.85), t0 + idx * 0.012, 1, pan=-0.3 + idx * 0.15)
            place(pno, piano(ch['root'], BAR * 1.5, 0.9), t0, 1)
        else:
            for k, (beat, idx) in enumerate([(0, 4), (0.5, 3), (1, 2), (1.5, 1), (2, 2), (3, 3)]):
                place(pno, piano(v[idx] + 12, B * 2, 0.32 - k * 0.02), t0 + beat * B, 1, pan=0.4 - idx * 0.15)
            place(pno, piano(ch['root'] + 12, BAR * 1.2, 0.5), t0, 1)
    else:  # driving 8th ostinato
        order = [0, 2, 4, 2, 3, 2, 4, 2]
        if sec == 'S7' and b == 25: order = order * 2
        step = 0.5 if len(order) == 8 else 0.25
        cres = {'S3': 0.3 + 0.05 * (b - 7), 'S4': 0.42, 'S5': 0.45, 'S7': 0.38 + 0.08 * (b - 23)}[sec]
        for k, idx in enumerate(order):
            acc = 1.25 if k % 4 == 0 else 1.0
            place(pno, piano(v[idx] + 12, B * 0.9, cres * acc), t0 + k * step * B, 1, pan=-0.35 + idx * 0.17)
        place(pno, piano(ch['root'] + 12, BAR, 0.6), t0, 1)
        place(pno, piano(ch['root'] + 24, BAR, 0.45), t0, 1)
    # ---------------- melody
    if sec in ('S1', 'S6') or (sec == 'S8' and b >= 27):
        if not (sec == 'S1' and b == 0):
            for beat, m, dur in MEL[c]:
                place(mel, piano(m, dur * B, 0.5 if sec != 'S8' else 0.42), t0 + beat * B, 1, pan=0.1)
    if sec == 'S7':
        for beat, m, dur in MEL[c]:
            place(mel, strings([m, m - 12], dur * B + 0.15, att=0.12, rel=0.6, cut=3800), t0 + beat * B, 0.9, pan=0.05)
    # ---------------- strings / pads
    if sec == 'S1':
        place(strg, strings(v[1:4], BAR + 0.2, att=1.2, cut=1200), t0, 0.35)
    elif sec == 'S2':
        place(strg, strings(v[1:4], BAR + 0.2, att=1.0, cut=1400), t0, 0.35)
    elif sec == 'S3':
        place(strg, strings(v[:4], BAR + 0.2, att=0.9, cut=2000), t0, 0.5 + 0.15 * (b - 7))
    elif sec in ('S4', 'S5'):
        place(strg, strings(v, BAR + 0.15, att=0.35, cut=3000), t0, 0.75)
        place(strg, strings(ch['s'], BAR + 0.15, att=0.35, cut=4200), t0, 0.35 if sec == 'S4' else 0.5)
    elif sec == 'S6':
        place(strg, strings(v[1:], BAR + 0.2, att=1.0, cut=1800), t0, 0.5)
    elif sec == 'S7':
        place(strg, strings(v, BAR + 0.1, att=0.6, cut=2600 + 900 * (b - 23)), t0, 0.7 + 0.2 * (b - 23))
    elif sec == 'S8':
        if b == 26:
            place(strg, strings(v + ch['s'], BAR * 2.2, att=0.08, rel=2.5, cut=4200), t0, 1.1)
            place(big, brass([50, 57, 62, 66], BAR * 1.6, 0.4), t0, 1.0)
            place(big, choir([62, 66, 69, 74], BAR * 3, att=0.6), t0, 0.9)
        elif b == 27:
            place(strg, strings(v, BAR + 0.3, att=0.8, rel=2, cut=2400), t0, 0.7)
            place(big, choir([62, 67, 71, 74], BAR + 0.2, att=0.9), t0, 0.6)
        elif b == 28:
            place(strg, strings(v, BAR * 2, att=0.8, rel=3, cut=2000), t0, 0.7)
            place(big, choir([62, 66, 69, 74], BAR * 1.8, att=0.9), t0, 0.55)
    # ---------------- low end
    if sec in ('S3',) and b >= 8: place(low, sub_bass(ch['root'], BAR * 0.95), t0, 0.6)
    if sec in ('S4', 'S5', 'S7'):
        place(low, sub_bass(ch['root'], BAR * 0.95), t0, 0.9)
    if sec == 'S6': place(low, sub_bass(ch['root'], BAR * 0.95), t0, 0.45)
    if sec == 'S8' and b <= 28: place(low, sub_bass(ch['root'], BAR * (2 if b == 28 else 1)), t0, 0.9)
    # ---------------- drums
    if sec == 'S1':
        place(drm, sosfilt(sos('lowpass', 160), kick()), t0, 0.55)  # heartbeat
        place(drm, sosfilt(sos('lowpass', 160), kick()), t0 + 0.35, 0.3)
    if sec == 'S3':
        for k in range(8): place(tick, tickwood(1.0 if k % 2 == 0 else 0.84), t0 + k * B / 2, 0.55 if k % 2 == 0 else 0.35, pan=0.3 if k % 2 else -0.3)
        if b == 9:
            for s in range(8): place(drm, tom(0.9 + s * 0.04), t0 + 2 * B + s * B / 4, 0.25 + s * 0.08)
    if sec == 'S4':
        place(drm, taiko(), t0, 1.0); place(drm, taiko(0.92), t0 + 2 * B, 0.8)
        place(drm, tom(1.1), t0 + 3.5 * B, 0.4)
    if sec == 'S5':
        for q in range(4):
            place(drm, kick(), t0 + q * B, 0.85 if q % 2 == 0 else 0.5)
            if q % 2 == 1:
                place(drm, stomp(), t0 + q * B, 0.7)
                place(drm, clap(), t0 + q * B + 0.004, 0.75, pan=0.1)
            place(tick, tickwood(1.6), t0 + q * B + B / 2, 0.18, pan=0.35)
        if b == 18:
            for s in range(8): place(drm, snare(0.3 + s * 0.09), t0 + 2 * B + s * B / 4, 1, pan=-0.1)
    if sec == 'S6':
        place(drm, sosfilt(sos('lowpass', 200), kick()), t0, 0.45)
    if sec == 'S7':
        place(drm, taiko(), t0, 1.0)
        if b == 23:
            place(drm, taiko(0.92), t0 + 2 * B, 0.7)
        if b == 24:
            for k in range(8): place(drm, tom(0.85 + 0.03 * k), t0 + k * B / 2, 0.35 + 0.04 * k)
        if b == 25:
            for k in range(16): place(drm, snare(0.25 + 0.05 * k), t0 + k * B / 4, 1, pan=-0.05)
            for k in range(8): place(drm, tom(0.9 + 0.04 * k), t0 + k * B / 2, 0.5 + 0.05 * k)
            place(drm, rev_cymbal(BAR), t0, 0.9)
    if sec == 'S8' and b == 26:
        place(drm, taiko(0.85), t0, 1.3); place(drm, kick(), t0, 1.0); place(drm, cymbal(4.0), t0, 1.0)

# cymbal swells on section changes
for sb in (7, 10, 14):
    place(drm, rev_cymbal(1.4), bt(sb) - 1.4, 0.5)
    place(drm, cymbal(2.5), bt(sb), 0.35)

# ------------------------------------------------------------------ SFX from the cue list
LVL = {'soft_cut': .5, 'swell': .45, 'projector': .5, 'typekey': .55, 'buzz': .6, 'bulbs_on': .7, 'riser': .5,
       'impact': .85, 'hit': .8, 'whoosh': .45, 'swoosh_up': .4, 'tick': .25, 'ping': .55, 'pulse_wave': .45,
       'thump': .7, 'card': .5, 'print': .55, 'shutter': .45, 'chime': .7, 'shimmer': .6}
PAN = {'whoosh': -0.1, 'swoosh_up': 0.15, 'tick': 0.2, 'shutter': 0.0}
for c in meta['cues']:
    nm, g, p, d = c['name'], c.get('g', 1), c.get('p', 1), c.get('d', 0)
    s = sfx(nm, p, d)
    t = c['t'] - (0.15 if nm == 'whoosh' else 0)
    pan = PAN.get(nm, 0)
    if nm in ('ping', 'shutter'): pan = float(rng.uniform(-0.5, 0.5))
    place(fx, s, t, g * LVL[nm], pan)

# ------------------------------------------------------------------ mix
hall = reverb_ir(3.4, 1.4, 5000, 0.025)
room = reverb_ir(1.2, 4.0, 7000, 0.01)

music_dry = pno * 0.9 + mel * 0.85 + strg * 0.9 + big * 0.9
music = music_dry + reverb(pno * 0.35 + mel * 0.45 + strg * 0.5 + big * 0.5, hall) * 0.55
rhythm = drm * 0.8 + tick * 0.7 + reverb(drm * 0.3 + tick * 0.2, room) * 0.35
lowbus = sosfilt(sos("lowpass", 220), low, axis=0) * 0.6
mix_music = music + rhythm + lowbus

# S2: the score plays through an old record — band-limited, a little saturated, with crackle
t = tt(N)
a0, a1 = bt(3), bt(7)
w = np.clip((t - a0) / 0.35, 0, 1) * np.clip((a1 - t) / 0.5, 0, 1)
old = sosfilt(sos('bandpass', [280, 3200], 2), mix_music, axis=0)
old = np.tanh(old * 1.8) / 1.8
crackle = np.zeros(N)
idx = rng.choice(np.arange(int(a0 * SR), int(a1 * SR)), size=int((a1 - a0) * 70), replace=False)
crackle[idx] = rng.standard_normal(len(idx)) * 0.5
crackle = sosfilt(sos('highpass', 1500), crackle) + sosfilt(sos('bandpass', [800, 4000]), noise(N)) * 0.006
old += crackle[:, None]
mix_music = mix_music * (1 - w[:, None] * 0.85) + old * w[:, None] * 1.1

fxmix = fx + reverb(fx, room) * 0.18
mix = mix_music * 0.78 + fxmix * 0.8
mix = sosfilt(sos("highpass", 38, 3), mix, axis=0)

# master: gentle glue compression (RMS follower) + soft clip
env = np.sqrt(sosfilt(sos('lowpass', 6), np.mean(mix ** 2, 1)) .clip(1e-9))
thr = np.percentile(env, 92)
gain = np.where(env > thr, (thr / env) ** 0.35, 1.0)
mix *= gain[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.15) / np.tanh(1.15)
mix = mix[: int(DUR * SR)]
fi, fo = int(0.003 * SR), int(1.4 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= (np.linspace(1, 0, fo) ** 1.6)[:, None]
out = os.path.join(ROOT, 'build', 'audio.wav')
wavfile.write(out, SR, (mix * 0.9 * 32767).astype(np.int16))
print(f'audio -> {out}  ({DUR:.2f}s, {len(meta["cues"])} cues, {NB} bars @ {BPM} BPM)')
