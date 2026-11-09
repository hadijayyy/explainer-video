#!/usr/bin/env python3
"""Synthesize the soundtrack: an original 128 BPM track plus SFX placed on the
cue list the page exports (build/cues.json). Pure numpy/scipy, no samples.

  python3 audio/make_audio.py   -> build/audio.wav (48 kHz stereo)
"""
import json, os
import numpy as np
from scipy.signal import butter, lfilter, sosfilt, fftconvolve
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
meta = json.load(open(os.path.join(ROOT, 'build', 'cues.json')))
DUR = meta['duration']
BPM = meta['bpm']
B = 60.0 / BPM
BAR = 4 * B
N = int(DUR * SR) + SR  # 1s tail headroom, trimmed at the end
rng = np.random.default_rng(7)

def buf(): return np.zeros((N, 2))
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def tt(n): return np.arange(n) / SR
def noise(n): return rng.standard_normal(n)

def place(bus, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N: return
    if sig.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        sig = np.stack([sig * l * 1.4142, sig * r * 1.4142], 1)
    j = min(N, i + len(sig))
    if i < 0: sig, i = sig[-i:], 0
    bus[i:j] += sig[: j - i] * gain

def sos(kind, f, order=2):
    if isinstance(f, (list, tuple)): f = [min(x, SR / 2 * 0.95) for x in f]
    else: f = min(f, SR / 2 * 0.95)
    return butter(order, f, btype=kind, fs=SR, output='sos')

def env_ad(n, a, d, curve=1.0):
    t = tt(n); e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4))
    return e ** curve

def polyblep_saw(freq, n, phase0=0.0):
    dt = freq / SR
    ph = (phase0 + np.cumsum(np.full(n, dt))) % 1.0
    s = 2 * ph - 1
    m1 = ph < dt; x = ph[m1] / dt; s[m1] -= x + x - x * x - 1
    m2 = ph > 1 - dt; x = (ph[m2] - 1) / dt; s[m2] -= x * x + x + x + 1
    return s

def supersaw(freqs, n, detune=0.12, voices=3):
    out = np.zeros(n)
    for f in freqs:
        for v in range(voices):
            d = (v - (voices - 1) / 2) * detune
            out += polyblep_saw(f * 2 ** (d / 12), n, rng.random())
    return out / (len(freqs) * voices) ** 0.5

def block_filter(x, cut_fn, kind='band', width=1.2, block=256):
    """time-varying 2nd-order filter, coefficients updated per block (state carried)."""
    y = np.zeros_like(x); zi = None
    for s in range(0, len(x), block):
        c = cut_fn(s / SR)
        if kind == 'band': so = sos('bandpass', [c / width, c * width])
        else: so = sos(kind, c)
        if zi is None: zi = np.zeros((so.shape[0], 2))
        y[s:s + block], zi = sosfilt(so, x[s:s + block], zi=zi)
    return y

def reverb_ir(sec=1.8, decay=2.6, bright=6000):
    n = int(sec * SR); t = tt(n)
    ir = np.stack([noise(n), noise(n)], 1) * np.exp(-t * decay)[:, None]
    ir = sosfilt(sos('lowpass', bright), ir, axis=0)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))[:, None]
    return ir / np.sqrt((ir ** 2).sum(0))

def apply_reverb(x, ir, wet):
    out = np.zeros_like(x)
    for c in range(2): out[:, c] = fftconvolve(x[:, c], ir[:, c])[: len(x)]
    return out * wet

# ------------------------------------------------------------------ instruments
def kick():
    n = int(0.42 * SR); t = tt(n)
    f = 46 + 110 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = sosfilt(sos('highpass', 2500), noise(n)) * np.exp(-t * 300) * 0.35
    return np.tanh(1.6 * (body + click)) * 0.95

def clap():
    n = int(0.3 * SR); t = tt(n); e = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR); e[i:] += np.exp(-(t[: n - i]) * (190 if k < 2 else 26))
    return sosfilt(sos('bandpass', [900, 4200]), noise(n)) * e * 0.8

def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = tt(n)
    return sosfilt(sos('highpass', 7500), noise(n)) * np.exp(-t * (16 if open_ else 95)) * 0.5

def crash():
    n = int(2.2 * SR); t = tt(n)
    return sosfilt(sos('highpass', 4200), noise(n)) * np.exp(-t * 2.0) * 0.32

def bass_note(m, dur):
    n = int(dur * SR); t = tt(n); f = mtof(m)
    s = np.sin(2 * np.pi * f * t) + 0.45 * sosfilt(sos('lowpass', 420), polyblep_saw(f, n))
    e = np.minimum(1, t / 0.006) * np.exp(-t * 5.5)
    return np.tanh(1.4 * s * e) * 0.6

def stab(notes, dur, cut=2600):
    n = int(dur * SR); t = tt(n)
    s = supersaw([mtof(m) for m in notes], n, 0.14, 3)
    s = sosfilt(sos('lowpass', cut), s)
    return s * np.minimum(1, t / 0.004) * np.exp(-t * 7.0) * 0.55

def pluck(m, dur=0.5, bright=1.0):
    n = int(dur * SR); t = tt(n); f = mtof(m); out = np.zeros(n)
    for h in range(1, 18):
        if f * h > SR / 2.2: break
        out += np.sin(2 * np.pi * f * h * t + h) / h ** 1.15 * np.exp(-t * (5 + h * 2.4 / bright))
    return out * np.minimum(1, t / 0.002) * 0.4

def pad(notes, dur, cut=1500):
    n = int(dur * SR); t = tt(n)
    s = sosfilt(sos('lowpass', cut), supersaw([mtof(m) for m in notes], n, 0.2, 3))
    a = np.minimum(1, t / 0.35); r = np.minimum(1, (dur - t) / 0.3)
    return s * a * np.clip(r, 0, 1) * 0.32

# ------------------------------------------------------------------ SFX
def sfx(name, p=1.0):
    if name == 'whoosh':
        n = int(0.55 * SR); u = tt(n) / 0.55
        y = block_filter(noise(n), lambda s: 500 * 2 ** (3.2 * np.sin(np.pi * min(1, s / 0.55) * 0.9)), 'band', 1.5)
        return y * np.sin(np.pi * u) ** 1.6 * 0.9
    if name == 'swish':
        n = int(0.32 * SR); u = tt(n) / 0.32
        y = block_filter(noise(n), lambda s: 1800 * 2 ** (1.6 * (s / 0.32)), 'band', 1.4)
        return y * np.sin(np.pi * u) ** 2 * 0.45
    if name == 'suck':  # reverse swell that peaks right at the end
        n = int(0.8 * SR); u = tt(n) / 0.8
        y = block_filter(noise(n), lambda s: 300 * 2 ** (4.5 * (s / 0.8) ** 1.5), 'band', 1.6)
        tone = np.sin(2 * np.pi * np.cumsum(180 + 700 * u ** 2) / SR) * 0.12
        return (y * 0.9 + tone) * u ** 2.4
    if name == 'impact':
        n = int(2.0 * SR); t = tt(n)
        f = 34 + 60 * np.exp(-t * 9)
        sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
        hit = sosfilt(sos('lowpass', 2200), noise(n)) * np.exp(-t * 14) * 0.6
        return np.tanh(1.3 * (sub + hit)) * 0.9
    if name == 'chime':
        n = int(2.2 * SR); t = tt(n); out = np.zeros(n)
        for base in (mtof(84), mtof(91)):
            for k, (r, a, d) in enumerate([(1, 1, 2.2), (2.76, .5, 4), (5.4, .25, 7), (8.93, .12, 10)]):
                out += a * np.sin(2 * np.pi * base * r * t) * np.exp(-t * d)
        return out * np.minimum(1, t / 0.002) * 0.16
    if name in ('pop', 'popHi'):
        n = int(0.09 * SR); t = tt(n)
        f0 = (1100 if name == 'pop' else 1700) * p
        f = f0 * (0.45 + 0.55 * np.exp(-t * 45))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 48) * 0.5
    if name == 'click':
        n = int(0.05 * SR); t = tt(n)
        c = sosfilt(sos('bandpass', [2000, 7000]), noise(n)) * np.exp(-t * 600) * 0.6
        tone = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180) * 0.25
        return c + tone
    if name == 'tick':
        n = int(0.03 * SR); t = tt(n)
        return sosfilt(sos('bandpass', [2500 * p, 6500 * p]), noise(n)) * np.exp(-t * 520) * 0.45
    if name == 'thud':
        n = int(0.22 * SR); t = tt(n)
        f = (95 + 80 * np.exp(-t * 40)) * p
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)
        paper = sosfilt(sos('bandpass', [600, 3500]), noise(n)) * np.exp(-t * 70) * 0.35
        return (body + paper) * 0.6
    raise ValueError(name)

# ------------------------------------------------------------------ arrangement
CH = [  # Fmaj9 · Am7 · Dm9 · Bbmaj9   (one chord per bar)
    dict(root=41, stab=[57, 60, 64, 67], pad=[53, 57, 60, 64], arp=[65, 69, 72, 76, 79]),
    dict(root=45, stab=[55, 60, 64, 67], pad=[52, 55, 57, 60], arp=[64, 67, 69, 72, 76]),
    dict(root=38, stab=[57, 60, 64, 65], pad=[50, 53, 57, 60], arp=[62, 65, 69, 72, 74]),
    dict(root=46, stab=[57, 58, 62, 65], pad=[50, 53, 57, 58], arp=[62, 65, 69, 70, 74]),
]
NBARS = int(np.ceil(DUR / BAR))
drums, bass, keys, padbus, fx = buf(), buf(), buf(), buf(), buf()
K, C, HC, HO, CR = kick(), clap(), hat(False), hat(True), crash()

DROP = 2            # groove starts at bar 2 (3.75 s, logo hit)
END = 23            # outro from bar 23 (43.125 s, CTA hit)
SCENE_BARS = [2, 4, 7, 10, 13, 16, 19, 21, 23]
kick_times = []

for b in range(NBARS):
    t0 = b * BAR
    ch = CH[b % 4]
    groove = DROP <= b < END
    # pad everywhere (low-passed in the intro)
    place(padbus, pad(ch['pad'], BAR + 0.25, 900 if b < DROP else 1700 if b < END else 1200), t0, 1.0)
    # pluck arpeggio (16ths in the intro and outro, 8ths sprinkled during the groove)
    pattern = [0, 2, 4, 1, 3, 2, 4, 1, 0, 2, 4, 3, 1, 2, 4, 2]
    for s in range(16):
        if groove and s % 2 == 1: continue
        if b >= END + 1 and s > 8: continue
        g = 0.55 if not groove else 0.32
        place(keys, pluck(ch['arp'][pattern[s]], 0.45, 0.8 if b < DROP else 1.2), t0 + s * B / 4, g, pan=0.35 * np.sin(s * 1.3))
    if groove:
        for q in range(4):
            place(drums, K, t0 + q * B, 1.0); kick_times.append(t0 + q * B)
            place(drums, HO, t0 + q * B + B / 2, 0.55, pan=0.2)
            for s in (0, 1, 3):
                place(drums, HC, t0 + q * B + s * B / 4, 0.32 if s else 0.42, pan=-0.25)
            place(bass, bass_note(ch['root'], B / 2 * 0.9), t0 + q * B + B / 2, 1.0)
        for q in (1, 3): place(drums, C, t0 + q * B, 0.85)
        # syncopated chord stabs: 1, 1.75(&a), 2.5, 3.75 in beats
        for bt in (0, 0.75, 1.5, 2.75, 3.5):
            place(keys, stab(ch['stab'], 0.32, 3200 if b >= 19 else 2600), t0 + bt * B, 0.62)
        # drum fill into scene changes
        if b + 1 in SCENE_BARS and b + 1 != END:
            for s in range(4):
                place(drums, C, t0 + 3 * B + s * B / 4, 0.25 + s * 0.12)
    if b in SCENE_BARS: place(drums, CR, t0, 0.8 if b in (DROP, END) else 0.45)

# intro: snare roll build over bar 1 + filtered half-time kick
for s in range(16):
    place(drums, C, BAR + s * B / 4, 0.12 + 0.5 * (s / 15) ** 2)
for q in (0, 2):
    place(drums, sosfilt(sos('lowpass', 300), K), q * B, 0.55)
    place(drums, sosfilt(sos('lowpass', 300), K), BAR + q * B, 0.65)
# build before the CTA: snare roll in bar 22
for s in range(16):
    place(drums, C, 22 * BAR + s * B / 4, 0.1 + 0.4 * (s / 15) ** 2)
# outro: big held chord on the CTA hit and a stab on the button click
place(keys, stab(CH[0]['stab'] + [72], 1.4, 3400), END * BAR, 0.9)
place(drums, K, END * BAR, 1.0)
place(bass, bass_note(41, 1.2), END * BAR, 1.0)

# sidechain ducking from the kick
duck = np.ones(N)
for kt in kick_times:
    i = int(kt * SR); n = int(0.24 * SR); j = min(N, i + n)
    duck[i:j] = np.minimum(duck[i:j], 1 - 0.6 * np.exp(-tt(j - i) * 14) * (1 - tt(j - i) / 0.24))
duck = duck[:, None]

# ------------------------------------------------------------------ SFX from the cue list
for c in meta['cues']:
    g = c.get('g', 1); p = c.get('p', 1)
    s = sfx(c['name'], p)
    t = c['t'] - (0.8 if c['name'] == 'suck' else 0.12 if c['name'] == 'whoosh' else 0)
    pan = {'whoosh': -0.1, 'swish': 0.15, 'pop': 0.1, 'popHi': -0.1, 'tick': 0.2}.get(c['name'], 0)
    lvl = {'whoosh': .55, 'swish': .5, 'suck': .7, 'impact': .95, 'chime': .6, 'pop': .42, 'popHi': .38,
           'click': .55, 'tick': .3, 'thud': .55}[c['name']]
    place(fx, s, t, g * lvl, pan)

# ------------------------------------------------------------------ mix
ir = reverb_ir()
music = drums * 0.62 + bass * 0.55 * duck + keys * 0.42 * duck + padbus * 0.5 * duck
music += apply_reverb(keys * 0.42 + padbus * 0.3, ir, 0.22)
music = sosfilt(sos('highpass', 28), music, axis=0)
fxmix = fx + apply_reverb(fx, reverb_ir(1.2, 4.0, 7000), 0.18)
mix = music * 0.8 + fxmix * 0.75

# master: soft clip, trim to duration, fades
mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(mix * 1.25) / np.tanh(1.25)
mix = mix[: int(DUR * SR)]
fi, fo = int(0.002 * SR), int(0.45 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]
mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
out = os.path.join(ROOT, 'build', 'audio.wav')
wavfile.write(out, SR, (mix * 0.89 * 32767).astype(np.int16))
print(f'audio -> {out}  ({DUR:.2f}s, {len(meta["cues"])} cues, {NBARS} bars @ {BPM} BPM)')
