# Starship catch reel

A 58-second, 1080×1920, 30 fps explainer reel on SpaceX catching a Starship upper stage (Ship 42)
returning from orbit for the first time, on November 14, 2026. Built with Remotion, with an AI voiceover,
word-highlighted captions and a synthesized soundtrack.

**Deliverable:** [`out/starship-catch-reel.mp4`](out/starship-catch-reel.mp4)

> Unofficial explainer, not affiliated with SpaceX or NASA. All graphics are original drawings.

## Facts used and sources

| Claim in the reel | Source |
|---|---|
| Launched Fri Nov 13 from Starbase, Texas; ship caught by the tower arms Sat Nov 14, about 22 hours later | AP |
| Rocket is 407 ft (124 m) tall | AP |
| 14 orbits; 26 Starlink satellites deployed | AP, Aerospace Global News |
| Three engines slowed the ship before the arms closed | Aerospace Global News |
| Booster lost over the Gulf of Mexico; no double catch | AP |
| Ship 42 has not been reflown; no reflight date announced | Aerospace Global News |
| "It was almost magic." — NASA Administrator Jared Isaacman, on X | AP |

- AP: https://abcnews.com/Technology/wireStory/spacexs-starship-returns-orbit-captured-launch-pad-arms-138148467
- Aerospace Global News: https://aerospaceglobalnews.com/news/spacex-catches-starship-upper-stage-first-time-flight-15/

The Statue of Liberty comparison uses its 305 ft ground-to-torch height.

## How it's built

```
make_voice.py    Kokoro TTS, one clip per sentence -> build/vo.wav + src/timing.json (word timings)
make_audio.py    music bed + SFX synthesized with numpy, ducked under the voice -> public/audio.wav
src/Reel.tsx     nine scenes and the captions, all cued from src/timing.json
```

Word timings are exact at sentence boundaries and estimated by word length inside a sentence.

### Rebuild

```bash
npm i
pip install kokoro-onnx soundfile numpy      # plus the Kokoro v1.0 model files in ~/.cache/kokoro
python3 make_voice.py && python3 make_audio.py
npx remotion render StarshipReel out/starship-catch-reel.mp4 --codec=h264 --crf=18
```

Remotion is free for individuals and companies of up to 3 people; larger companies need a company license.
