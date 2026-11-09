#!/usr/bin/env node
/* Frame-accurate renderer.
 *   node render/render.js                       full render -> build/video.mp4 (+ build/cues.json)
 *   node render/render.js --preview 1.2,4.5     PNG stills -> build/preview/
 *   node render/render.js --cues                only export build/cues.json (for the audio script)
 *   node render/render.js --sheet 0.5           contact sheet of stills every 0.5s -> build/preview/sheet_*.png
 * Options: --fps 60  --workers 4
 * Each worker renders contiguous segments with its own Chromium page and pipes PNG frames into ffmpeg.
 */
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const FPS = +opt('fps', 60);
const WORKERS = +opt('workers', 4);
const SEG_SECONDS = 1.875; // one music bar per segment

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('[page error]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto('file://' + path.join(ROOT, 'src/index.html'));
  await page.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
  return page;
}

async function shot(page, t) {
  await page.evaluate((tt) => window.seek(tt), t);
  return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

function ffmpegSeg(out) {
  return spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-g', String(FPS),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
}

(async () => {
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'] });
  fs.mkdirSync(BUILD, { recursive: true });

  if (args.includes('--preview') || args.includes('--sheet')) {
    const dir = path.join(BUILD, 'preview');
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser);
    const dur = await page.evaluate(() => window.DURATION);
    let times;
    if (args.includes('--preview')) times = opt('preview', '0').split(',').map(Number);
    else { const step = +opt('sheet', 0.5); times = []; for (let t = 0; t < dur; t += step) times.push(+t.toFixed(3)); }
    const files = [];
    for (const t of times) {
      const f = path.join(dir, `t_${t.toFixed(3).padStart(7, '0')}.png`);
      fs.writeFileSync(f, await shot(page, t));
      files.push(f);
    }
    if (args.includes('--sheet')) {
      // 4x4 contact sheets at 480x270 per cell
      for (let i = 0; i < files.length; i += 16) {
        const chunk = files.slice(i, i + 16);
        const inputs = chunk.flatMap((f) => ['-i', f]);
        const n = chunk.length;
        const filt = chunk.map((_, k) => `[${k}]scale=480:270,drawtext=text='${times[i + k].toFixed(2)}':x=8:y=8:fontsize=22:fontcolor=red[v${k}]`).join(';') +
          ';' + chunk.map((_, k) => `[v${k}]`).join('') + `xstack=inputs=${n}:layout=` +
          chunk.map((_, k) => `${(k % 4) * 480}_${Math.floor(k / 4) * 270}`).join('|') + ':fill=gray';
        execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', n > 1 ? filt : '[0]scale=480:270', path.join(dir, `sheet_${String(i / 16).padStart(2, '0')}.png`)]);
      }
    }
    console.log(`wrote ${files.length} stills to ${dir}`);
    await browser.close();
    return;
  }

  // ---------- full render ----------
  const probe = await openPage(browser);
  const { dur, cues, bpm } = await probe.evaluate(() => ({ dur: window.DURATION, cues: window.CUES, bpm: window.BPM }));
  await probe.close();
  fs.writeFileSync(path.join(BUILD, 'cues.json'), JSON.stringify({ duration: dur, bpm, fps: FPS, cues }, null, 1));
  if (args.includes('--cues')) { console.log(`wrote build/cues.json (${cues.length} cues)`); await browser.close(); return; }
  const total = Math.round(dur * FPS);
  const segFrames = Math.round(SEG_SECONDS * FPS);
  const segs = [];
  for (let s = 0; s * segFrames < total; s++) segs.push({ i: s, a: s * segFrames, b: Math.min(total, (s + 1) * segFrames) });
  const segDir = path.join(BUILD, 'segments');
  fs.mkdirSync(segDir, { recursive: true });
  const only = process.env.FORCE ? process.env.FORCE.split(',').map(Number) : null;
  const todo = segs.filter((s) => (only ? only.includes(s.i) : !fs.existsSync(path.join(segDir, `s${String(s.i).padStart(3, '0')}.mp4`))));
  console.log(`${total} frames @ ${FPS}fps, ${segs.length} segments, ${todo.length} to render, ${WORKERS} workers`);
  const t0 = Date.now();
  let done = 0;
  const queue = [...todo];
  await Promise.all(Array.from({ length: WORKERS }, async () => {
    const page = await openPage(browser);
    while (queue.length) {
      const s = queue.shift();
      const out = path.join(segDir, `s${String(s.i).padStart(3, '0')}.mp4`);
      const part = out.replace('.mp4', '.part.mp4');
      const ff = ffmpegSeg(part);
      const exited = new Promise((r) => ff.on('close', r));
      for (let f = s.a; f < s.b; f++) {
        const buf = await shot(page, f / FPS);
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      const code = await exited;
      if (code !== 0) throw new Error(`ffmpeg failed on segment ${s.i}`);
      fs.renameSync(part, out);
      done++;
      process.stdout.write(`  segment ${s.i} done (${done}/${todo.length}, ${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
    }
    await page.close();
  }));
  await browser.close();

  const list = segs.map((s) => `file '${path.join(segDir, `s${String(s.i).padStart(3, '0')}.mp4`)}'`).join('\n');
  fs.writeFileSync(path.join(BUILD, 'segments.txt'), list);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(BUILD, 'segments.txt'), '-c', 'copy', path.join(BUILD, 'video.mp4')]);
  console.log(`video -> build/video.mp4 in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch((e) => { console.error(e); process.exit(1); });
