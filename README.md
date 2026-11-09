# Notion launch film (unofficial concept)

A 46-second, 1920×1080, 60 fps product launch video for **Notion**, in the motion-graphics style of
SaaS launch videos on X/Twitter: kinetic type, a real product UI, snappy transitions, and a 128 BPM track with synced SFX.

**Deliverable:** [`out/notion-launch.mp4`](out/notion-launch.mp4)

> This is a fan-made concept piece and is not affiliated with or endorsed by Notion Labs, Inc.
> The Notion name, logo, illustrations, screenshots and product footage belong to Notion Labs, Inc.
> Customer logos belong to their respective owners. All of them were downloaded from notion.com.

## Storyboard

Music runs at 128 BPM (1 bar = 1.875 s). Every scene cut lands on a bar line.

| # | Time | Beat | On screen | Assets | Transition out |
|---|------|------|-----------|--------|----------------|
| 1 | 0.00–3.75 | **Hook** | "Docs in one app." → "Tasks in another." → "Notes… everywhere." while generic doc, sheet, sticky note and chat cards pile up | rebuilt UI cards | all cards get sucked into the centre |
| 2 | 3.75–7.5 | **Brand** | Notion mark slams in with a ring burst, wordmark wipes out, then "Where teams and agents ● Write/Plan/Build/Think together." plus the avatar row | real logo SVG, real avatar strip | zoom-through blur |
| 3 | 7.5–13.1 | **Workspace** | "One workspace. Every team." Real Notion footage of agents moving cards on a board, with the window tilting up from 3D; Docs, Wikis, Projects and Agents chips pop in on the beat | **real product video** | whip-pan with directional motion blur |
| 4 | 13.1–18.75 | **Docs** | "Write it down. Together." A page title types, a `/` command menu opens and picks To-do list, a collaborator's cursor ("Faye") checks a box, a comment pops | rebuilt Notion page UI, real avatar | push up |
| 5 | 18.75–24.4 | **Find** | "Find answers. Instantly." The question "What are our biggest opportunities in H2?" types into Notion AI, sources (Notion, Slack, Drive) appear, the answer streams in, a citation is hovered | rebuilt AI UI, real icons | zoom-through |
| 6 | 24.4–30.0 | **Projects** | "Track every project." A roadmap database morphs from Table → Board → Timeline, with each row flying to its new spot | rebuilt database UI | whip-pan |
| 7 | 30.0–35.6 | **Agents** | "Agents that do the busywork." Real Notion footage of an agent building a bug tracker from one prompt, with a virtual camera zooming prompt → dashboard → result | **real product video** | scale-out |
| 8 | 35.6–39.4 | **Montage** | "Plus everything in between." Notion Calendar, Notion Mail and AI Meeting Notes cards flip in on the beat | real screenshots + rebuilt inbox | cards fly out |
| 9 | 39.4–43.1 | **Proof** | "Trusted by teams that ship." Counters run to **100M** users in over 50 countries and **62%** of the Fortune 100; customer logo marquees | real stats and logos from notion.com | suck into the CTA hit |
| 10 | 43.1–46.5 | **CTA** | Logo hit, "The AI workspace that works for you.", a cursor clicks **Get Notion free**, notion.com | real logo | end card |

All headlines and stats come from notion.com (homepage hero, "Trusted by teams that ship.",
"100M users in over 50 countries", "62% of Fortune 100 use Notion"). Every feature shown is a real
Notion feature. The workspace content inside the rebuilt UI (task names, the H2 answer, people's names) is demo data.

## How it's built

```
src/index.html     scene markup (DOM + CSS, 1920×1080 stage)
src/styles.css     Notion-style UI kit: windows, tags, slash menu, chips, cursors…
src/main.js        one paused GSAP timeline + deterministic per-frame functions
render/render.js   Playwright renderer: seeks the timeline frame by frame and pipes PNGs to ffmpeg
render/extract_frames.sh   turns the real Notion clips into seekable JPEG sequences
audio/make_audio.py        synthesizes the original music + SFX (numpy/scipy) from the page's cue list
render/mux.sh      final H.264/AAC encode, loudness-normalized to -15 LUFS
assets/            logos, screenshots, illustrations and clips downloaded from notion.com
```

Every frame is a pure function of time (`window.seek(t)`), so rendering is deterministic and runs in
parallel bar-sized segments. The page also exports every SFX cue it schedules (pops, clicks, typing ticks,
whooshes, impacts), and the audio script places those sounds sample-accurately over the music.

### Rebuild

```bash
npm install                                   # gsap
bash render/extract_frames.sh                 # real clips -> build/frames
node render/render.js --sheet 0.5             # optional: contact sheets in build/preview
node render/render.js --fps 60 --workers 4    # video -> build/video.mp4, cues -> build/cues.json
python3 audio/make_audio.py                   # soundtrack -> build/audio.wav (needs numpy + scipy)
bash render/mux.sh                            # final -> out/notion-launch.mp4
```

Requires Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy and scipy, and the Inter /
Inter Display and Noto Color Emoji fonts installed on the system.
