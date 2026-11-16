"""Voiceover: one Kokoro TTS clip per script line -> build/vo.wav + src/timing.json"""
import json, os, re, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    ("hook",    "SpaceX just caught a spaceship. Falling from orbit. With a pair of giant metal arms."),
    ("launch",  "On Friday, Starship launched from Texas. It's the biggest rocket ever built, four hundred and seven feet tall."),
    ("orbit",   "The upper stage, Ship 42, circled Earth fourteen times, and dropped off twenty-six Starlink satellites."),
    ("reentry", "Then, after about twenty-two hours in space, it came home. Belly first, through the atmosphere."),
    ("catch",   "Seconds from the ground, it flipped upright, fired three engines, and settled into the tower's arms."),
    ("first",   "No landing legs. No ocean splashdown. A first in history."),
    ("caveat",  "It wasn't perfect. The booster was lost over the Gulf, so the double catch is still to come. And this ship hasn't flown twice yet."),
    ("why",     "But here's why it matters. A rocket you can catch is a rocket you can refuel, and fly again. That's the plan for the Moon, and Mars."),
    ("quote",   "NASA's chief called it almost magic. Follow for more."),
]
VOICE, SPEED, GAP, LEAD, SENT_GAP = "am_michael", 1.08, 0.36, 0.35, 0.2
home = os.path.expanduser("~/.cache/kokoro")
k = Kokoro(f"{home}/kokoro.onnx", f"{home}/voices.bin")
sr = 24000
sil = lambda d: np.zeros(int(d * sr), dtype=np.float32)
out = [sil(LEAD)]
t = LEAD
timing = []
for sid, text in LINES:
    start, words = t, []
    sents = re.findall(r"[^.]+\.", text)
    for i, sent in enumerate(sents):
        # each sentence is its own clip, so sentence boundaries are exact
        a, sr = k.create(sent.strip(), voice=VOICE, speed=SPEED, lang="en-us")
        idx = np.where(np.abs(a) > 0.01)[0]
        a = a[max(idx[0] - 400, 0): idx[-1] + 800]
        d = len(a) / sr
        ws = sent.split()
        # inside a sentence, spread words by length, with a pause after commas
        wt = [len(re.sub(r"\W", "", w)) + 1.2 + (2.5 if w.endswith(",") else 0) for w in ws]
        acc = 0.0
        for w, x in zip(ws, wt):
            words.append({"w": w, "s": round(t + d * acc / sum(wt), 3), "e": round(t + d * (acc + x) / sum(wt), 3)})
            acc += x
        out.append(a); t += d
        if i < len(sents) - 1:
            out.append(sil(SENT_GAP)); t += SENT_GAP
    timing.append({"id": sid, "start": round(start, 3), "end": round(t, 3), "words": words})
    out.append(sil(GAP)); t += GAP
vo = np.concatenate(out)
vo = vo / np.max(np.abs(vo)) * 0.95
sf.write("build/vo.wav", vo, sr)
json.dump({"lines": timing, "total": round(t + 1.8, 2)}, open("src/timing.json", "w"), indent=1)
for l in timing: print(l["id"], l["start"], l["end"])
print("total", round(t + 1.8, 2))
