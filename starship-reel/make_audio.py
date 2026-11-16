"""Soundtrack: synth bed + SFX, ducked under the voiceover -> public/audio.wav"""
import json, numpy as np, soundfile as sf

T = json.load(open("src/timing.json"))
L = {l["id"]: l for l in T["lines"]}
word = lambda sid, w: next(x["s"] for x in L[sid]["words"] if x["w"].lower().startswith(w))
sr, dur = 48000, T["total"]
n = int(sr * dur)
t = np.arange(n) / sr
rng = np.random.default_rng(7)
mus, sfx = np.zeros(n), np.zeros(n)

def add(buf, at, sig):
    s = int(at * sr)
    if s < 0: sig, s = sig[-s:], 0
    e = min(n, s + len(sig)); buf[s:e] += sig[: e - s]

def lp(x, a):  # one-pole lowpass
    y = np.empty_like(x); acc = 0.0
    for i, v in enumerate(x): acc += a * (v - acc); y[i] = acc
    return y

# pad: Dm - Bb - F - C, 90 BPM, two bars per chord
beat = 60 / 90; bar = beat * 4
chords = [[146.83, 174.61, 220.0], [116.54, 146.83, 174.61], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0]]
for i in range(int(dur / (2 * bar)) + 1):
    x = np.arange(int(2 * bar * sr)) / sr
    g = np.minimum(x / 0.6, 1) * np.minimum((2 * bar - x) / 0.6, 1)
    sig = sum(0.05 * np.sin(2 * np.pi * f * x) + 0.025 * np.sin(2 * np.pi * 2 * f * x + 0.3) + 0.012 * np.sin(2 * np.pi * 3 * f * x) for f in chords[i % 4])
    sig += 0.09 * np.sin(2 * np.pi * chords[i % 4][0] / 2 * x)
    add(mus, i * 2 * bar, sig * g)
# pulse: kick on beats, soft hat on off-beats, arpeggio on eighths
for b in range(int(dur / beat)):
    ts = b * beat
    x = np.arange(int(0.3 * sr)) / sr
    add(mus, ts, 0.3 * np.sin(2 * np.pi * (45 + 80 * np.exp(-x * 30)) * x) * np.exp(-x * 11))
    x = np.arange(int(0.04 * sr)) / sr
    add(mus, ts + beat / 2, 0.035 * rng.standard_normal(len(x)) * np.exp(-x * 90))
    ch = chords[int(ts / (2 * bar)) % 4]
    for j in range(2):
        f = ch[(b * 2 + j) % 3] * 2
        x = np.arange(int(0.22 * sr)) / sr
        add(mus, ts + j * beat / 2, 0.035 * np.sin(2 * np.pi * f * x) * np.exp(-x * 14))

def whoosh(at, d=0.5, g=0.16):
    x = np.linspace(0, 1, int(d * sr))
    add(sfx, at - d, lp(rng.standard_normal(len(x)), 0.25) * x ** 2.5 * g * 4)
def impact(at, g=0.5):
    x = np.arange(int(0.9 * sr)) / sr
    add(sfx, at, g * np.sin(2 * np.pi * (48 + 70 * np.exp(-x * 18)) * x) * np.exp(-x * 5))
def clang(at, g=0.14):
    x = np.arange(int(1.2 * sr)) / sr
    add(sfx, at, g * sum(np.sin(2 * np.pi * f * x) * np.exp(-x * d) for f, d in [(311, 4), (523, 6), (797, 8), (1244, 11)]))
def rumble(at, d, g=0.22):
    x = np.arange(int(d * sr)) / sr
    env = np.minimum(x / 0.3, 1) * np.minimum((d - x) / 0.8, 1)
    add(sfx, at, lp(rng.standard_normal(len(x)), 0.02) * env * g * 6)
def tick(at, g=0.1):
    x = np.arange(int(0.05 * sr)) / sr
    add(sfx, at, g * np.sin(2 * np.pi * 1400 * x) * np.exp(-x * 70))

starts = [max(l["start"] - 0.25, 0) for l in T["lines"]]
for s in starts[1:]: whoosh(s); impact(s, 0.28)
rumble(0, 1.3, 0.18); impact(1.25, 0.6); clang(1.25)                   # hook catch
rumble(L["launch"]["start"], 3.2)                                       # liftoff
for w in ["fourteen", "twenty-six"]: tick(word("orbit", w))
rumble(L["reentry"]["start"] + 2.2, 3.4, 0.12)                          # re-entry roar
rumble(word("catch", "fired"), 2.2, 0.16)
c = word("catch", "settled") + 0.3; impact(c, 0.6); clang(c)           # the catch
for w in ["landing", "ocean"]: tick(word("first", w))
impact(word("first", "first"), 0.5)
for w in ["booster", "double", "ship"]: tick(word("caveat", w))
for w in ["catch", "refuel,", "fly"]: tick(word("why", w))

# duck the music whenever the voice is speaking
duck = np.ones(n)
for l in T["lines"]:
    duck[int((l["start"] - 0.1) * sr): int((l["end"] + 0.1) * sr)] = 0.42
k = np.hanning(int(0.3 * sr)); duck = np.convolve(duck, k / k.sum(), "same")
vo, vsr = sf.read("build/vo.wav")
vo = np.interp(t, np.arange(len(vo)) / vsr, vo, right=0)
mix = vo * 0.9 + mus * duck * 0.85 + sfx * 0.8
mix *= np.minimum(t / 0.15, 1) * np.minimum((dur - t) / 1.5, 1)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix = mix / np.max(np.abs(mix)) * 0.94
sf.write("public/audio.wav", np.stack([mix, mix], 1), sr, subtype="PCM_16")
print("audio", dur)
