# Pizza Hut Indonesia: "Luberkan Kebersamaan" (brand anthem concept)

A 79-second, 1920×1080, 60 fps cinematic company-profile film for **Pizza Hut Indonesia**, written in
Bahasa Indonesia and scored with an original soundtrack. It is built as an agency pitch piece: a brand anthem
that tells the company story (since 1984, the national footprint, the menu and formats, the people) and
lands on the brand's own 40th-anniversary line, *Luberkan Kebersamaan*.

**Deliverable:** [`out/pizzahut-indonesia-anthem.mp4`](out/pizzahut-indonesia-anthem.mp4)

> Unsolicited concept piece, not affiliated with or endorsed by Pizza Hut or PT Sarimelati Kencana Tbk.
> The Pizza Hut name, logo and all photography belong to their owners and were downloaded from pizzahut.co.id.

## The idea

**The red roof.** Pizza Hut's logo is a roof, so the film is about the table under it. It opens on
"Setiap keluarga punya satu meja favorit… Bagi jutaan keluarga Indonesia, meja itu beratap *merah*." Near the
end, a mosaic of real Pizza Hut Indonesia moments (families, crews, farmers, kids' classes, Ramadan
sharing) is cut into the shape of the roof. That roof turns red and flies into place as the roof of the logo.

## Storyboard

Music is 90 BPM (1 bar = 2.667 s). Every scene cut lands on a bar line.

| # | Time | Scene | On screen | Sound |
|---|------|-------|-----------|-------|
| 1 | 0:00–0:08 | **Cold open** | Three macro cheese-pull shots from the Pizza Hut KV with a rack focus and drifting embers. *"Setiap keluarga punya satu meja favorit." / "Bagi jutaan keluarga Indonesia," / "meja itu beratap merah."* | Solo piano, motif, heartbeat sub |
| 2 | 0:08–0:18.7 | **Jakarta, 1984** | Old-film look (sepia, gate weave, scratches). "1984" types in, then a lit cinema marquee for **Djakarta Theater**: *"Restoran Pizza Hut pertama di Indonesia · Sekarang buka"*. *"Semuanya dimulai dari satu restoran, di gedung Djakarta Theater."* | The same piano through an old-record filter with crackle, projector rattle, neon buzz |
| 3 | 0:18.7–0:26.7 | **Time travel** | A film strip of real photos runs past while an odometer rolls **1984 → 2026**. The photos regain colour as the years pass. *"Lebih dari 40 tahun bersama Indonesia"* | 8th-note ostinato, clock ticks, strings enter, impact on 2026 |
| 4 | 0:26.7–0:37.3 | **Sabang–Merauke** | A dot map of Indonesia (2,134 dots) lights up red outward from Jakarta, with pins on 26 cities. *"Dari Sabang sampai Merauke."* Counters: **36 provinsi · 150+ kota & kabupaten · 570+ gerai** | Taiko on 1 & 3, sonar pings per city |
| 5 | 0:37.3–0:50.7 | **Food + formats** | *"Rasa yang tumbuh bersama Indonesia."* Signature Pizza / Pasta & Rice / Appetizers cards, then a full-bleed **Melts** hit, then three formats: **Dine-in** (Restaurant & Ristorante), **Delivery** (PHD & the app), **Party** | Stomp-clap groove |
| 6 | 0:50.7–1:01.3 | **People** | A stack of prints: the crew; farmers (**60%** of paprika & tomatoes from ~100 local farmer groups); the **Female Outlet**, Indonesia's first chain restaurant run 100% by women; Pizza Maker Junior. *"Di balik setiap loyang, ada tangan-tangan yang peduli."* | Breakdown, tender piano melody |
| 7 | 1:01.3–1:09.3 | **Together** | A 24-tile mosaic builds on the 8th notes, gets cut into the roof shape, turns red and flies to the logo. *"Karena momen terbaik / selalu dinikmati bersama."* | Toms, snare roll, strings carry the melody, riser |
| 8 | 1:09.3–1:19 | **Reveal** | The letterbox opens on a red field and the logo assembles. **Luberkan Kebersamaan.** / SEJAK 1984 · UNTUK INDONESIA / pizzahut.co.id | The hit: brass, choir, cymbal, shimmer; plagal G/D → D ending |

## Facts used (check these before the meeting)

All numbers live in one place, `FACTS` at the top of [`src/main.js`](src/main.js), so they are quick to update.

| Claim | Source |
|---|---|
| First restaurant in 1984 at Djakarta Theater, Jakarta | Pizza Hut Indonesia 40th-anniversary release (PR Newswire, 4 Jun 2024) |
| 36 provinces, 150 cities/regencies | pizzahut.co.id/csr |
| 570+ outlets | PZZA reported 575 outlets at 31 Dec 2025 (Bisnis.com, from the annual report). The CSR page still says "more than 600" (older figure). |
| ~100 farmer groups supply 60% of paprika & tomatoes | pizzahut.co.id/csr |
| Female Outlet at Ristorante Gatot Subroto, the first chain restaurant in Indonesia run 100% by women | pizzahut.co.id/csr |
| Dine-in / PHD / Ristorante / Party (birthdays, weddings, food truck), Pizza Maker Junior | pizzahut.co.id/brand-story, /party-by-pizza-hut |
| *Luberkan Kebersamaan* | the #LuberkanKebersamaan 40th-anniversary campaign (2024) |

"Jutaan keluarga" and "jutaan cerita" are narrative lines, not measured figures.

## How it's built

```
src/index.html        8 scenes (DOM + CSS, 1920×1080 stage, 2.39:1 letterbox until the reveal)
src/styles.css        type (Instrument Serif italic, Oswald, Inter), grade, marquee, map, prints, mosaic
src/main.js           one paused GSAP timeline + deterministic per-frame functions (grain, embers,
                      film scratches, odometer, map wave, roof mask); exports the SFX cue list
src/map.js            Indonesia dot grid + city pins, generated by tools/build_map.js
src/logo.js           the official logo SVG (from pizzahut.co.id), inlined
tools/build_map.js    Natural Earth (world-atlas 50m) → dot grid in stage pixels
render/render.js      Playwright renderer: seeks the timeline frame by frame, pipes PNGs into ffmpeg
audio/make_audio.py   the score + SFX, synthesized with numpy/scipy (no samples)
render/mux.sh         final H.264/AAC encode, loudness-normalized to -14 LUFS
assets/               photos, logo and fonts (fonts from @fontsource, OFL)
```

Each frame is a pure function of time (`window.seek(t)`), so rendering is deterministic and runs in parallel,
one bar per segment.

### Rebuild

```bash
cd pizzahut-film
npm install                                   # gsap, fonts, world-atlas, topojson-client
node tools/build_map.js                       # optional: regenerate src/map.js
node render/render.js --sheet 1               # optional: contact sheets in build/preview
node render/render.js --fps 60 --workers 4    # video -> build/video.mp4, cues -> build/cues.json
python3 audio/make_audio.py                   # score -> build/audio.wav (numpy + scipy)
bash render/mux.sh                            # final -> out/pizzahut-indonesia-anthem.mp4
```

Needs Node 18+, Playwright with Chromium, ffmpeg, Python 3 with numpy and scipy, and the Inter font installed.
