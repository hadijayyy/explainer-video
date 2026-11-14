/* Pizza Hut Indonesia: brand anthem (concept film).
 * One paused GSAP timeline plus deterministic per-frame functions (DYN). Every frame is a
 * pure function of time t, so the renderer can seek to any frame: window.seek(t).
 * Music: 90 BPM, 1 beat = 0.667 s, 1 bar = 2.667 s. Scene cuts land on bar lines.
 */
(async function () {
  const BPM = 90, B = 60 / BPM, BAR = 4 * B;
  const b = (n) => +(n * BAR).toFixed(4);
  const DUR = 79.0;

  /* Numbers shown on screen live here so they are easy to update before the pitch. */
  const FACTS = {
    provinces: 36,          // pizzahut.co.id/csr and the 40th-anniversary release (June 2024)
    cities: 150,            // pizzahut.co.id/csr: "36 Provinsi, 150 Kota / Kabupaten"
    outlets: 570,           // PZZA: 575 outlets at 31 Dec 2025 (annual report), shown as "570+"
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, c = 1) => Math.min(c, Math.max(a, v));
  const lerp = (a, c, k) => a + (c - a) * k;
  const ease = {
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    out: (x) => 1 - Math.pow(1 - x, 3),
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    sine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  };
  const prog = (t, a, c) => clamp((t - a) / (c - a));
  function hash(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function vnoise(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; }

  await Promise.all([
    document.fonts.load('italic 60px "Instrument Serif"'),
    document.fonts.load('60px "Instrument Serif"'),
    ...[300, 400, 500, 600, 700].map((w) => document.fonts.load(`${w} 60px "Oswald"`)),
    document.fonts.load('500 30px "Inter"'),
  ]);
  await document.fonts.ready;

  gsap.defaults({ ease: 'power3.out', duration: 0.8 });
  const tl = gsap.timeline({ paused: true });
  const DYN = [];
  const CUES = [];
  const cue = (t, name, g = 1, p = 1, d = 0) => CUES.push({ t: +t.toFixed(4), name, g, p, d });

  /* ---------------- helpers ---------------- */
  function split(el) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p) => {
      const tokens = p.trim().match(/<em>.*?<\/em>|[^\s<]+/g) || [];
      return tokens.map((w) => {
        if (w.startsWith('<em>')) return w.replace(/<\/?em>/g, '').split(/\s+/).map((x) => `<span class="w"><span class="wi"><em>${x}</em></span></span>`).join(' ');
        return `<span class="w"><span class="wi">${w}</span></span>`;
      }).join(' ');
    }).join('<br>');
    return $$('.wi', el);
  }
  const SPLIT = new Map();
  const words = (sel) => { if (!SPLIT.has(sel)) SPLIT.set(sel, split($(sel))); return SPLIT.get(sel); };
  function rise(sel, t, { stagger = 0.09, dur = 1.3 } = {}) {
    const w = words(sel);
    gsap.set(w, { yPercent: 105, opacity: 0, filter: 'blur(10px)' });
    tl.to(w, { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: dur, ease: 'expo.out', stagger }, t);
  }
  function sink(sel, t, { stagger = 0.03, dur = 0.7 } = {}) {
    tl.to(words(sel), { opacity: 0, filter: 'blur(8px)', yPercent: -20, duration: dur, ease: 'power2.in', stagger }, t);
  }
  function show(sel, tIn, tOut) {
    if (tIn <= 0) gsap.set(sel, { visibility: 'visible' });
    else { gsap.set(sel, { visibility: 'hidden' }); tl.set(sel, { visibility: 'visible' }, tIn); }
    if (tOut != null) tl.set(sel, { visibility: 'hidden' }, tOut);
  }
  /* place a crop (x, y, w in source px) of an image so it fills the 1920x1080 frame */
  function crop(cam, src, sw, sh, x, y, w, extra = '') {
    const k = 1920 / w;
    const img = new Image();
    img.src = src;
    Object.assign(img.style, { width: sw * k + 'px', height: sh * k + 'px', left: -x * k + 'px', top: -y * k + 'px' });
    if (extra) img.style.filter = extra;
    cam.appendChild(img);
    return img;
  }
  function flash(t, peak = 0.85, dur = 0.5) {
    tl.fromTo('#flash', { opacity: peak }, { opacity: 0, duration: dur, ease: 'power2.out', immediateRender: false }, t);
  }

  /* ================= S1 · COLD OPEN (bars 0–3) ================= */
  {
    const KV = '../assets/img/kv_pizza.jpg', SW = 2377, SH = 3484;
    const g = 'brightness(.8) contrast(1.14) saturate(1.06)';
    const a = crop($('#s1a .cam'), KV, SW, SH, 160, 40, 1900, g);
    crop($('#s1b .cam'), KV, SW, SH, 300, 1300, 1700, g);
    crop($('#s1c .cam'), KV, SW, SH, 220, 2280, 1900, g);
    show('#s1', 0, b(3));
    show('#s1a', 0, b(1)); show('#s1b', b(1), b(2)); show('#s1c', b(2), b(3));
    tl.to('#fade', { opacity: 0, duration: 2.2, ease: 'power1.inOut' }, 0.15);
    // rack focus on the first shot
    gsap.set(a, { filter: g + ' blur(18px)' });
    tl.to(a, { filter: g + ' blur(0px)', duration: 2.1, ease: 'power2.inOut' }, 0.35);
    tl.fromTo('#s1a .cam', { scale: 1.22, x: 40 }, { scale: 1.1, x: -20, duration: BAR + 0.1, ease: 'none', immediateRender: false }, 0);
    tl.fromTo('#s1b .cam', { scale: 1.06, y: 20 }, { scale: 1.16, y: -10, duration: BAR, ease: 'none', immediateRender: false }, b(1));
    tl.fromTo('#s1c .cam', { scale: 1.08, x: -30 }, { scale: 1.2, x: 30, duration: BAR, ease: 'none', immediateRender: false }, b(2));
    rise('#s1t1', 0.9); sink('#s1t1', b(1) - 0.55);
    rise('#s1t2', b(1) + 0.35); sink('#s1t2', b(2) - 0.5);
    rise('#s1t3', b(2) + 0.3, { stagger: 0.12, dur: 1.5 });
    tl.to('#s1t3', { opacity: 0, duration: 0.5, ease: 'power2.in' }, b(3) - 0.75);
    tl.to('#fade', { opacity: 1, duration: 0.45, ease: 'power2.in' }, b(3) - 0.5);
    cue(b(1), 'soft_cut', 0.5); cue(b(2), 'soft_cut', 0.5);
    cue(b(2) + 0.3, 'swell', 0.55);
  }

  /* ================= S2 · JAKARTA 1984 (bars 3–7) ================= */
  {
    const T = b(3);
    show('#s2', T, b(7));
    tl.to('#fade', { opacity: 0, duration: 0.35, ease: 'power1.out' }, T);
    cue(T, 'projector', 0.9, 1, b(7) - T - 0.2);
    // 1984 types in
    const num = $('#y84 .num');
    num.innerHTML = '1984'.split('').map((c) => `<span style="display:inline-block">${c}</span>`).join('');
    const digits = $$('span', num);
    gsap.set('#y84 .kick', { opacity: 0, letterSpacing: '1.1em' });
    tl.to('#y84 .kick', { opacity: 1, letterSpacing: '.6em', duration: 1.6, ease: 'expo.out' }, T + 0.25);
    digits.forEach((d, i) => {
      gsap.set(d, { opacity: 0, y: 30, filter: 'blur(12px)' });
      const t = T + 0.55 + i * B * 0.5;
      tl.to(d, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, t);
      cue(t, 'typekey', 0.9, 0.9 + i * 0.04);
    });
    tl.to('#y84', { opacity: 0, scale: 1.08, filter: 'blur(14px)', duration: 0.7, ease: 'power2.in' }, b(4) - 0.6);
    // marquee lights up
    const bulbs = $('#bulbs');
    const W = 1180, H = 400, N_TOP = 30, N_SIDE = 10, list = [];
    for (let i = 0; i <= N_TOP; i++) list.push([(i / N_TOP) * W, 0]);
    for (let i = 1; i <= N_SIDE; i++) list.push([W, (i / N_SIDE) * H]);
    for (let i = N_TOP - 1; i >= 0; i--) list.push([(i / N_TOP) * W, H]);
    for (let i = N_SIDE - 1; i >= 1; i--) list.push([0, (i / N_SIDE) * H]);
    const els = list.map(([x, y]) => { const e = document.createElement('i'); e.className = 'bulb'; e.style.left = x + 'px'; e.style.top = y + 'px'; bulbs.appendChild(e); return e; });
    const M0 = b(4);
    gsap.set('#marquee', { opacity: 0 });
    tl.to('#marquee', { opacity: 1, duration: 0.25, ease: 'none' }, M0);
    gsap.set('.mq-board', { opacity: 0.05 });
    // neon-style flicker on of the board
    [[0.15, 0.6], [0.22, 0.1], [0.3, 0.8], [0.36, 0.3], [0.45, 1]].forEach(([dt, o]) => tl.set('.mq-board', { opacity: o }, M0 + dt));
    cue(M0 + 0.15, 'buzz', 0.7); cue(M0 + 0.3, 'buzz', 0.5);
    cue(M0, 'bulbs_on', 0.9);
    gsap.set('.mq-crown', { opacity: 0.2 });
    tl.to('.mq-crown', { opacity: 1, duration: 0.4, ease: 'none' }, M0 + 0.5);
    gsap.set('.mq-glow', { opacity: 0 });
    tl.to('.mq-glow', { opacity: 1, duration: 1.2, ease: 'power2.out' }, M0 + 0.4);
    tl.fromTo('#s2cam', { scale: 1.0 }, { scale: 1.1, duration: b(7) - M0, ease: 'none', immediateRender: false }, M0);
    DYN.push((t) => {
      if (t < M0 - 0.1 || t > b(7)) return;
      const on = prog(t, M0, M0 + 0.9) * els.length; // sweep on
      const step = Math.floor((t - M0) * 9);
      const surge = t > b(7) - 0.75;
      els.forEach((e, i) => {
        const lit = i < on && (surge || (i + step) % 3 !== 0);
        e.className = lit ? 'bulb on' : 'bulb';
      });
    });
    tl.to('.mq-glow', { opacity: 1.8, scale: 1.3, duration: 0.6, ease: 'power2.in' }, b(7) - 0.75);
    rise('#s2t1', M0 + 0.8); sink('#s2t1', b(5) + 1.6);
    rise('#s2t2', b(6) - 0.3); sink('#s2t2', b(7) - 0.9);
    // old-film flicker + gate weave
    DYN.push((t) => {
      if (t < T || t > b(7)) return;
      const k = Math.floor(t * 24);
      $('#s2 .filmfx').style.background = `rgba(0,0,0,${(0.05 + 0.1 * hash(k)).toFixed(3)})`;
      const cam = $('#s2cam');
      cam.style.translate = `${(vnoise(t * 7) * 2.5).toFixed(2)}px ${(vnoise(t * 5 + 9) * 3).toFixed(2)}px`;
    });
    // burn to white into the time-travel
    tl.to('#flash', { opacity: 1, duration: 0.5, ease: 'power2.in' }, b(7) - 0.5);
    cue(b(7) - 0.9, 'riser', 0.8, 1, 0.9);
  }

  /* ================= S3 · TIME TRAVEL (bars 7–10) ================= */
  {
    const T = b(7), T1 = b(10);
    show('#s3', T, T1);
    tl.to('#flash', { opacity: 0, duration: 0.9, ease: 'power2.out' }, T);
    cue(T, 'impact', 0.9);
    const imgs = ['phr_interior', 'family_dinner', 'junior_class', 'crew_salam', 'party_friends', 'phd_truck', 'topdown_table', 'ristorante_interior',
      'event_group', 'csr_ramadan', 'wedding_stall', 'female_outlet', 'birthday', 'farmers', 'long_pizza', 'junior_apron'];
    const strip = $('#strip');
    const frames = imgs.map((n) => {
      const f = document.createElement('div'); f.className = 'frame';
      const ext = n === 'female_outlet' || n === 'ristorante_interior' ? 'png' : 'jpg';
      f.innerHTML = `<img src="../assets/img/${n}.${ext}">`;
      strip.appendChild(f); return f.firstChild;
    });
    const stripW = imgs.length * 668;
    const odo = $('#odo');
    const cols = [3, 2, 1, 0].map((k) => {
      const c = document.createElement('div'); c.className = 'col';
      const r = document.createElement('div'); r.className = 'reel';
      r.innerHTML = '0123456789'.split('').concat(['0']).map((d) => `<span>${d}</span>`).join('');
      c.appendChild(r); odo.appendChild(c); return { k, r };
    });
    const Y0 = 1984, Y1 = 2026, TA = T + 0.6, TB = b(9) + 0.2;
    DYN.push((t) => {
      if (t < T - 0.01 || t > T1) return;
      const p = prog(t, T, T1);
      strip.style.transform = `translateX(${(-lerp(0, stripW - 1920, ease.sine(p)) ).toFixed(1)}px) rotate(-2deg) scale(1.05)`;
      const yp = ease.io(prog(t, TA, TB));
      const v = lerp(Y0, Y1, yp);
      cols.forEach(({ k, r }) => {
        const pk = Math.pow(10, k);
        let pos = Math.floor(v / pk) % 10;
        if (k === 0) pos += v % 1;
        else { const rem = v % pk; if (rem > pk - 1) pos += rem - (pk - 1); }
        r.style.transform = `translateY(${(-pos * 300).toFixed(1)}px)`;
      });
      const g = 1 - yp;
      const filt = `grayscale(${g.toFixed(3)}) sepia(${(g * 0.6).toFixed(3)}) brightness(${(0.75 + 0.15 * yp).toFixed(3)}) contrast(1.05)`;
      frames.forEach((im) => (im.style.filter = filt));
    });
    for (let y = 0; y < 42; y += 3) cue(TA + (TB - TA) * (0.15 + 0.7 * (y / 42)), 'tick', 0.35, 1 + y * 0.01);
    tl.fromTo('#odo', { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.2, ease: 'expo.out', immediateRender: false }, T + 0.2);
    tl.to('#odo', { scale: 1.06, duration: 0.25, ease: 'power2.out' }, TB);
    tl.to('#odo', { scale: 1, duration: 0.6, ease: 'power2.out' }, TB + 0.25);
    cue(TB, 'impact', 1);
    flash(TB, 0.35, 0.6);
    tl.fromTo('#odokick', { opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.5em', duration: 1.4, ease: 'expo.out', immediateRender: false }, TB + 0.1);
    rise('#s3t1', T + 0.7); sink('#s3t1', b(8) + 1.5);
    rise('#s3t2', b(9) + 0.45); sink('#s3t2', T1 - 0.8);
    tl.to(['#odo', '#odokick', '#strip'], { opacity: 0, duration: 0.5, ease: 'power2.in' }, T1 - 0.55);
    cue(T1 - 0.45, 'whoosh', 0.8);
  }

  /* ================= S4 · MAP (bars 10–14) ================= */
  {
    const T = b(10), T1 = b(14);
    show('#s4', T, T1);
    const M = window.MAP;
    const ctx = $('#mapc').getContext('2d');
    const jkt = M.cities.find((c) => c.n === 'Jakarta');
    const dist = M.dots.map(([x, y]) => Math.hypot(x - jkt.x, y - jkt.y));
    const maxD = Math.max(...dist);
    const A0 = T + 0.1, R0 = T + 1.6, R1 = b(12) - 0.3;
    const r1 = (t) => ease.out(prog(t, A0, A0 + 2.2)) * (maxD + 60);
    const r2 = (t) => ease.io(prog(t, R0, R1)) * (maxD + 80);
    const pins = $('#pins');
    const named = { Sabang: '', Jakarta: 'left', Makassar: '', Merauke: 'left', Medan: '', Jayapura: 'left' };
    const pinEls = M.cities.map((c) => {
      const p = document.createElement('div'); p.className = 'pin' + (named[c.n] === 'left' ? ' left' : '');
      p.style.left = c.x + 'px'; p.style.top = c.y + 'px';
      p.innerHTML = `<div class="ring"></div><div class="core"></div>${c.n in named ? `<div class="lbl">${c.n.toUpperCase()}</div>` : ''}`;
      pins.appendChild(p);
      const d = Math.hypot(c.x - jkt.x, c.y - jkt.y);
      let tt = R0; // time the red wave reaches the city
      for (let k = 0; k <= 200; k++) { const x = lerp(R0, R1, k / 200); if (r2(x) >= d) { tt = x; break; } }
      return { p, c, tt };
    });
    pinEls.forEach(({ p, c, tt }, i) => {
      const core = p.querySelector('.core'), ring = p.querySelector('.ring'), lbl = p.querySelector('.lbl');
      gsap.set(core, { scale: 0 }); gsap.set(ring, { scale: 0.2, opacity: 0 });
      tl.to(core, { scale: 1, duration: 0.5, ease: 'back.out(3)' }, tt);
      tl.fromTo(ring, { scale: 0.2, opacity: 1 }, { scale: 2.6, opacity: 0, duration: 1.4, ease: 'power2.out', immediateRender: false }, tt);
      if (lbl) { gsap.set(lbl, { opacity: 0, x: named[c.n] === 'left' ? 10 : -10 }); tl.to(lbl, { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' }, tt + 0.1); }
      cue(tt, 'ping', lbl ? 0.55 : 0.25, 0.9 + (i % 6) * 0.06);
    });
    DYN.push((t) => {
      if (t < T || t > T1) return;
      ctx.clearRect(0, 0, 1920, 1080);
      const R1v = r1(t), R2v = r2(t);
      // outline glow
      for (let i = 0; i < M.dots.length; i++) {
        const d = dist[i];
        if (d > R1v) continue;
        const [x, y] = M.dots[i];
        const app = clamp((R1v - d) / 140);
        const red = clamp((R2v - d) / 120);
        const tw = 0.85 + 0.15 * Math.sin(t * 3 + i * 1.7);
        if (red > 0) {
          ctx.globalAlpha = 0.18 * red * tw; ctx.fillStyle = '#ff2a45';
          ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill();
        }
        ctx.globalAlpha = app * (0.32 + 0.68 * red) * tw;
        ctx.fillStyle = red > 0.5 ? `rgb(255,${Math.round(lerp(200, 70, red))},${Math.round(lerp(190, 90, red))})` : '#e9dccb';
        ctx.beginPath(); ctx.arc(x, y, 2.5 + red * 0.9, 0, 6.283); ctx.fill();
        // front of the wave
        const fr = 1 - clamp(Math.abs(R2v - d) / 40);
        if (fr > 0 && R2v < maxD + 60) { ctx.globalAlpha = fr * 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    });
    cue(A0, 'swell', 0.5);
    cue(R0, 'pulse_wave', 0.8, 1, R1 - R0);
    rise('#s4h', T + 0.7); sink('#s4h', b(12) - 0.6);
    tl.fromTo('#s4cam', { scale: 1.04, y: 10 }, { scale: 1.0, y: 0, duration: b(12) - T, ease: 'power1.out', immediateRender: false }, T);
    tl.to('#s4cam', { scale: 0.8, y: -150, duration: 1.4, ease: 'power3.inOut' }, b(12) - 0.4);
    $$('#stats .sv').forEach((el, i) => {
      const t0 = b(12) + 0.4 + i * B;
      const to = { 0: FACTS.provinces, 1: FACTS.cities, 2: FACTS.outlets }[i];
      el.dataset.to = to;
      const st = el.parentElement;
      gsap.set(st, { opacity: 0, y: 30 });
      tl.to(st, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, t0);
      DYN.push((t) => {
        const v = Math.round(ease.out(prog(t, t0, t0 + 1.4)) * to);
        el.textContent = v.toLocaleString('id-ID') + (el.dataset.plus && v === to ? '+' : '');
      });
      cue(t0, 'thump', 0.85, 1 - i * 0.06);
    });
    tl.to('#s4cam', { scale: 0.86, duration: T1 - b(13), ease: 'none' }, b(13));
    tl.to(['#s4cam', '#stats'], { opacity: 0, duration: 0.45, ease: 'power2.in' }, T1 - 0.5);
    cue(T1 - 0.4, 'whoosh', 0.9);
  }

  /* ================= S5 · FOOD + FORMATS (bars 14–19) ================= */
  {
    const T = b(14), T1 = b(19);
    show('#s5', T, T1);
    crop($('#s5a .cam'), '../assets/img/texture_redblack.jpg', 2880, 1686, 40, 0, 1400, 'brightness(.38) saturate(.95) blur(1.5px)');
    tl.fromTo('#s5a .cam', { scale: 1.1 }, { scale: 1.0, duration: T1 - T, ease: 'none', immediateRender: false }, T);
    cue(T, 'impact', 0.7);
    flash(T, 0.25, 0.5);
    rise('#s5t1', T + 0.2);
    const cards = $$('#trip .card');
    cards.forEach((c, i) => {
      const t0 = T + 0.35 + i * B;
      gsap.set(c, { opacity: 0, y: 120, rotateZ: (i - 1) * 3, scale: 0.94 });
      tl.to(c, { opacity: 1, y: 0, rotateZ: (i - 1) * 1.2, scale: 1, duration: 1.1, ease: 'expo.out' }, t0);
      tl.fromTo(c.querySelector('img'), { scale: 1.15 }, { scale: 1.02, duration: 4, ease: 'power2.out', immediateRender: false }, t0);
      cue(t0, 'card', 0.7, 0.95 + i * 0.05);
    });
    sink('#s5t1', b(15) + 1.3);
    // cards blow apart -> Melts
    const TM = b(15) + 2 * B; // 41.33
    cards.forEach((c, i) => tl.to(c, { x: (i - 1) * 900, y: -40, rotateZ: (i - 1) * 12, opacity: 0, duration: 0.55, ease: 'power3.in' }, TM - 0.45));
    cue(TM - 0.4, 'whoosh', 0.9);
    crop($('#s5m .cam'), '../assets/img/kv_melts.jpg', 2377, 3484, 20, 1060, 2340, 'brightness(.88) contrast(1.12) saturate(1.05)');
    show('#s5m', TM, b(17));
    const mg = document.createElement('div'); mg.className = 'grade warm'; $('#s5m').appendChild(mg);
    const ms = document.createElement('div'); ms.className = 'grade';
    ms.style.background = 'linear-gradient(20deg, rgba(8,3,2,.88) 0%, rgba(8,3,2,.55) 30%, rgba(8,3,2,0) 58%)';
    $('#s5m').appendChild(ms);
    tl.fromTo('#s5m .cam', { scale: 1.25, x: 120, rotate: -2 }, { scale: 1.08, x: -40, rotate: 0, duration: b(17) - TM, ease: 'power2.out', immediateRender: false }, TM);
    cue(TM, 'hit', 1);
    flash(TM, 0.6, 0.45);
    const ml = $$('#meltslabel > span');
    gsap.set('#meltslabel', { opacity: 0 });
    tl.set('#meltslabel', { opacity: 1 }, TM);
    ml.forEach((s, i) => { gsap.set(s, { opacity: 0, x: -40 }); tl.to(s, { opacity: 1, x: 0, duration: 1, ease: 'expo.out' }, TM + 0.25 + i * 0.18); });
    tl.to('#meltslabel', { opacity: 0, duration: 0.4, ease: 'power2.in' }, b(17) - 0.45);
    // formats
    const TF = b(17);
    tl.set('#s5m', { visibility: 'hidden' }, TF);
    cue(TF, 'impact', 0.7);
    rise('#s5h', TF + 0.2);
    $$('#formats .fmt').forEach((f, i) => {
      const t0 = TF + 0.3 + i * B;
      gsap.set(f, { opacity: 1, clipPath: 'inset(100% 0 0 0)' });
      tl.to(f, { clipPath: 'inset(0% 0 0 0)', duration: 1.0, ease: 'expo.out' }, t0);
      tl.fromTo(f.querySelector('img'), { scale: 1.25, yPercent: 6 }, { scale: 1.04, yPercent: 0, duration: T1 - t0, ease: 'power2.out', immediateRender: false }, t0);
      const ft = f.querySelector('.ft');
      gsap.set(ft, { opacity: 0, y: 30 });
      tl.to(ft, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, t0 + 0.35);
      cue(t0, 'swoosh_up', 0.7, 0.95 + i * 0.06);
    });
    sink('#s5h', T1 - 1.0);
    tl.to('#formats', { opacity: 0, y: -30, duration: 0.6, ease: 'power2.in' }, T1 - 0.7);
    gsap.set('#formats', { opacity: 1 });
  }

  /* ================= S6 · PEOPLE (bars 19–23) ================= */
  {
    const T = b(19), T1 = b(23);
    show('#s6', T, T1);
    cue(T, 'soft_cut', 0.6);
    tl.fromTo('#s6cam', { scale: 1.0 }, { scale: 1.07, duration: T1 - T, ease: 'none', immediateRender: false }, T);
    const prints = $$('#s6 .print');
    const rest = [[-2.2, -30, -10], [1.8, 20, 0], [-1.2, -10, 10], [2.4, 25, -5]];
    prints.forEach((p, i) => {
      const t0 = T + i * BAR + (i === 0 ? 0.2 : 0);
      const [r, x, y] = rest[i];
      gsap.set(p, { opacity: 0, y: 260, x: x * 4, rotate: r * 4, scale: 1.04 });
      tl.to(p, { opacity: 1, duration: 0.25, ease: 'none' }, t0);
      tl.to(p, { y, x, rotate: r, scale: 1, duration: 1.3, ease: 'expo.out' }, t0);
      tl.fromTo(p.querySelector('img'), { scale: 1.12 }, { scale: 1.0, duration: BAR * 1.6, ease: 'power1.out', immediateRender: false }, t0);
      if (i > 0) tl.to(prints[i - 1], { filter: 'brightness(.45) blur(2px)', scale: 0.97, duration: 1, ease: 'power2.out' }, t0);
      cue(t0 + 0.1, 'print', 0.75, 0.95 + i * 0.04);
    });
    rise('#s6t1', T + 0.6, { stagger: 0.06 }); sink('#s6t1', T + BAR - 0.4);
    ['#f2', '#f3', '#f4'].forEach((f, i) => {
      const t0 = T + (i + 1) * BAR + 0.55;
      gsap.set(f, { opacity: 0, x: 60 });
      tl.to(f, { opacity: 1, x: 0, duration: 1, ease: 'expo.out' }, t0);
      tl.to(f, { opacity: 0, x: -20, duration: 0.4, ease: 'power2.in' }, t0 + BAR - 0.95);
      cue(t0, 'tick', 0.5, 1.2);
    });
    tl.to('#s6cam', { scale: 1.35, opacity: 0, duration: 0.55, ease: 'power3.in' }, T1 - 0.55);
    cue(T1 - 0.5, 'whoosh', 0.8);
  }

  /* ================= S7 · TOGETHER -> ROOF (bars 23–26) ================= */
  {
    const T = b(23), T1 = b(26);
    show('#s7', T, T1);
    const pics = ['family_dinner', 'topdown_table', 'party_friends', 'event_group', 'junior_apron', 'long_pizza', 'birthday', 'wedding_stall',
      'csr_kids', 'crew_salam', 'junior_class', 'party_box', 'csr_ramadan', 'farmers', 'phr_interior', 'female_outlet'];
    const COLS = 6, ROWS = 4, TW = 1920 / COLS, TH = 1080 / ROWS;
    const order = [];
    for (let i = 0; i < COLS * ROWS; i++) order.push(i);
    order.sort((x, y) => hash(x * 3.1) - hash(y * 3.1));
    const mk = (parent) => {
      const els = [];
      for (let i = 0; i < COLS * ROWS; i++) {
        const n = pics[(i * 7) % pics.length];
        const d = document.createElement('div'); d.className = 'tile';
        Object.assign(d.style, { left: (i % COLS) * TW + 'px', top: Math.floor(i / COLS) * TH + 'px', width: TW + 1 + 'px', height: TH + 1 + 'px' });
        d.innerHTML = `<img src="../assets/img/${n}.${n === 'female_outlet' ? 'png' : 'jpg'}">`;
        parent.appendChild(d); els.push(d);
      }
      return els;
    };
    const tiles = mk($('#mosaic'));
    const rtiles = mk($('#roofmosaic'));
    rtiles.forEach((d) => (d.style.opacity = 1));
    const step = (BAR * 1.0) / tiles.length;
    order.forEach((idx, k) => {
      const t0 = T + 0.05 + k * step;
      const d = tiles[idx];
      gsap.set(d, { opacity: 0, scale: 1.25 });
      tl.to(d, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' }, t0);
      tl.fromTo(d.querySelector('img'), { filter: 'brightness(2)' }, { filter: 'brightness(.92)', duration: 0.5, ease: 'power2.out', immediateRender: false }, t0);
      if (k % 2 === 0) cue(t0, 'shutter', 0.45, 0.9 + hash(k) * 0.3);
    });
    rise('#s7t1', T + 0.5); sink('#s7t1', b(24) + 1.2);
    // roof mask: geometry of the roof in the final logo (S8)
    // 1) the mosaic is cut into a big roof that holds centre-frame, 2) it turns red and flies into the logo
    const TR0 = b(24) + 0.4, TR1 = b(25) - 0.2, TM0 = b(25) + 1.25, TM1 = T1 - 0.15;
    const HOLD_W = 1560, HOLD_CY = 440;
    show('#roofwrap', TR0, T1);
    tl.set('#mosaic', { visibility: 'hidden' }, TR0);
    DYN.push((t) => {
      if (t < TR0 || t > T1) return;
      const R = window.__ROOF;
      const p1 = ease.io(prog(t, TR0, TR1));
      const p2 = ease.io(prog(t, TM0, TM1));
      const wHold = HOLD_W * lerp(1, 0.94, prog(t, TR1, TM0));
      let w = Math.exp(lerp(Math.log(16000), Math.log(HOLD_W), p1));
      if (t > TR1) w = wHold;
      if (t > TM0) w = Math.exp(lerp(Math.log(HOLD_W * 0.94), Math.log(R.w), p2));
      const cx = lerp(960, R.cx, p2), cy = lerp(lerp(540, HOLD_CY, p1), R.cy, p2);
      const h = w * (R.h / R.w);
      const el = $('#roofwrap');
      el.style.webkitMaskSize = `${w.toFixed(2)}px ${h.toFixed(2)}px`;
      el.style.webkitMaskPosition = `${(cx - w / 2).toFixed(2)}px ${(cy - h / 2).toFixed(2)}px`;
      // shrink the photos with the roof, but never below the size that still covers the mask
      const Xl = Math.max(0, cx - w / 2), Xr = Math.min(1920, cx + w / 2), Yt = Math.max(0, cy - h / 2), Yb = Math.min(1080, cy + h / 2);
      const need = Math.max((cx - Xl) / cx, (Xr - cx) / (1920 - cx), (cy - Yt) / cy, (Yb - cy) / (1080 - cy)) * 1.02;
      const sc = Math.min(1, Math.max(lerp(1, 0.62, p1) * lerp(1, 0.3, p2), need));
      const rm = $('#roofmosaic');
      rm.style.transformOrigin = `${cx.toFixed(1)}px ${cy.toFixed(1)}px`;
      rm.style.transform = `scale(${sc.toFixed(4)})`;
    });
    cue(TR0, 'swell', 0.8);
    rise('#s7t2', TR1 - 0.3, { stagger: 0.12, dur: 1.5 });
    tl.to('#roofred', { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, TM0 - 0.35);
    tl.to('#s7t2', { opacity: 0, duration: 0.5, ease: 'power2.in' }, TM0 + 0.1);
    cue(T1 - 1.6, 'riser', 1, 1, 1.6);
  }

  /* ================= S8 · REVEAL (bar 26 → end) ================= */
  {
    const T = b(26);
    show('#s8', T);
    const svg = document.createElement('div');
    svg.innerHTML = window.LOGO_SVG;
    const s = svg.querySelector('svg');
    s.removeAttribute('class');
    $('#logo').appendChild(s);
    const paths = $$('path', s);
    paths.forEach((p) => p.setAttribute('fill', '#ffffff'));
    const roofPath = paths[11];
    // roof geometry in stage px (the logo box is 460px for a 216 viewBox)
    const bb = roofPath.getBBox();
    const k = 460 / 216, L = 960 - 230, TOP = 150;
    window.__ROOF = { cx: L + (bb.x + bb.width / 2) * k, cy: TOP + (bb.y + bb.height / 2) * k, w: bb.width * k, h: bb.height * k };
    const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${bb.x} ${bb.y} ${bb.width} ${bb.height}" preserveAspectRatio="none"><path d="${roofPath.getAttribute('d')}"/></svg>`;
    const url = `url("data:image/svg+xml;utf8,${encodeURIComponent(maskSvg)}")`;
    $('#roofwrap').style.webkitMaskImage = url;
    $('#roofwrap').style.maskImage = url;
    // roof stays red for the match cut, then turns white as the field goes red
    roofPath.setAttribute('fill', '#C8102E');
    gsap.set('.s8bg', { opacity: 0 });
    tl.to('.s8bg', { opacity: 1, duration: 0.9, ease: 'power2.inOut' }, T + 0.05);
    tl.to(roofPath, { attr: { fill: '#ffffff' }, duration: 0.9, ease: 'power2.inOut' }, T + 0.05);
    cue(T, 'hit', 1.2); cue(T, 'shimmer', 0.7);
    flash(T + 0.05, 0.5, 0.8);
    const letters = paths.filter((_, i) => i !== 11);
    letters.forEach((p, i) => {
      gsap.set(p, { opacity: 0, y: 18, transformOrigin: '50% 50%' });
      tl.to(p, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, T + 0.35 + i * 0.05);
    });
    // letterbox opens
    tl.to('#lbt', { yPercent: -100, duration: 1.6, ease: 'expo.inOut' }, T + 0.1);
    tl.to('#lbb', { yPercent: 100, duration: 1.6, ease: 'expo.inOut' }, T + 0.1);
    tl.fromTo('#logo', { scale: 1.0 }, { scale: 1.035, duration: DUR - T, ease: 'none', immediateRender: false }, T);
    rise('#tag', T + 1.4, { stagger: 0.14, dur: 1.6 });
    gsap.set('#since', { opacity: 0, letterSpacing: '.9em' });
    tl.to('#since', { opacity: 1, letterSpacing: '.5em', duration: 1.8, ease: 'expo.out' }, T + 2.6);
    gsap.set('#url', { opacity: 0, y: 10 });
    tl.to('#url', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' }, T + 3.4);
    cue(T + 2.6, 'chime', 0.45);
    tl.to('#fade', { opacity: 1, duration: 1.4, ease: 'power1.in' }, DUR - 1.5);
  }

  /* ================= global FX: grain, particles, light leak, film scratches ================= */
  {
    const g = $('#grain'), gc = g.getContext('2d');
    const NF = 8, GRAIN = [];
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let f = 0; f < NF; f++) {
      const im = gc.createImageData(960, 540);
      for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (rnd() + rnd() + rnd() - 1.5) * 120; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      GRAIN.push(im);
    }
    let lastG = -1;
    DYN.push((t) => { const k = Math.floor(t * 24) % NF; if (k !== lastG) { gc.putImageData(GRAIN[k], 0, 0); lastG = k; } });

    const fx = $('#fx'), c = fx.getContext('2d');
    const P = Array.from({ length: 140 }, (_, i) => ({ x: hash(i) * 1920, y: hash(i + 99) * 1080, s: 0.4 + hash(i + 7) * 1.6, v: 20 + hash(i + 3) * 70, ph: hash(i + 5) * 6.28, d: hash(i + 11) }));
    DYN.push((t) => {
      c.clearRect(0, 0, 1920, 1080);
      // embers (S1)
      const emb = t < b(3) ? 1 - prog(t, b(3) - 0.6, b(3)) : 0;
      // bokeh sparkles (S8)
      const bok = t > b(26) ? prog(t, b(26), b(26) + 1.5) * (1 - prog(t, DUR - 1.4, DUR)) : 0;
      // dust motes (S6)
      const dust = t > b(19) && t < b(23) ? 0.6 : 0;
      if (emb > 0) {
        for (let i = 0; i < 90; i++) {
          const p = P[i];
          const y = 1180 - ((p.y + t * p.v * 1.6) % 1300);
          const x = p.x + Math.sin(t * 0.9 + p.ph) * 40 + vnoise(t * 0.5 + i) * 30;
          const fl = 0.55 + 0.45 * Math.sin(t * 7 + p.ph * 3);
          const r = p.s * 2.2;
          const gr = c.createRadialGradient(x, y, 0, x, y, r * 4);
          gr.addColorStop(0, `rgba(255,${170 + Math.round(p.d * 60)},90,${(0.85 * fl * emb).toFixed(3)})`);
          gr.addColorStop(1, 'rgba(255,90,20,0)');
          c.fillStyle = gr; c.beginPath(); c.arc(x, y, r * 4, 0, 6.283); c.fill();
        }
      }
      if (dust > 0) {
        for (let i = 0; i < 60; i++) {
          const p = P[i + 40];
          const x = (p.x + t * 12 * (p.d - 0.5)) % 1920, y = (p.y + Math.sin(t * 0.4 + p.ph) * 30 + 1080) % 1080;
          c.fillStyle = `rgba(255,235,210,${(0.18 * dust * (0.5 + 0.5 * Math.sin(t + p.ph))).toFixed(3)})`;
          c.beginPath(); c.arc(x, y, p.s * 1.3, 0, 6.283); c.fill();
        }
      }
      if (bok > 0) {
        for (let i = 0; i < 22; i++) {
          const p = P[i + 90];
          const x = p.x + Math.sin(t * 0.3 + p.ph) * 60, y = 1100 - ((p.y + t * p.v * 0.5) % 1200);
          const r = 6 + p.s * 14;
          const gr = c.createRadialGradient(x, y, 0, x, y, r);
          gr.addColorStop(0, `rgba(255,220,210,${(0.13 * bok).toFixed(3)})`);
          gr.addColorStop(0.7, `rgba(255,200,190,${(0.05 * bok).toFixed(3)})`);
          gr.addColorStop(1, 'rgba(255,200,190,0)');
          c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
        }
      }
      // film scratches + specks (S2)
      if (t >= b(3) && t < b(7)) {
        const k = Math.floor(t * 24);
        for (let j = 0; j < 3; j++) {
          if (hash(k * 3 + j) > 0.55) {
            const x = hash(k * 7 + j) * 1920;
            c.strokeStyle = `rgba(255,240,220,${(0.08 + hash(k + j) * 0.18).toFixed(3)})`;
            c.lineWidth = 1 + hash(k * 5 + j) * 1.5;
            c.beginPath(); c.moveTo(x, 0); c.lineTo(x + vnoise(k + j) * 8, 1080); c.stroke();
          }
        }
        for (let j = 0; j < 6; j++) {
          if (hash(k * 13 + j) > 0.6) {
            c.fillStyle = `rgba(255,240,220,${(0.25 * hash(k * 17 + j)).toFixed(3)})`;
            c.beginPath(); c.arc(hash(k * 19 + j) * 1920, hash(k * 23 + j) * 1080, 1 + hash(k * 29 + j) * 3, 0, 6.283); c.fill();
          }
        }
      }
    });

    // light leaks: warm blooms that drift at key moments
    const leak = $('#leak');
    const LEAKS = [[0.4, 7.6, 0.55], [b(4), b(7), 0.45], [b(14), b(15) + 1, 0.35], [b(15) + 2 * B, b(17), 0.4], [b(23) + 0.5, b(26), 0.3], [b(26), DUR, 0.35]];
    DYN.push((t) => {
      let o = 0;
      for (const [a, z, m] of LEAKS) o = Math.max(o, m * Math.min(prog(t, a, a + 1.2), 1 - prog(t, z - 0.8, z)));
      leak.style.opacity = o.toFixed(3);
      const x = 30 + 40 * vnoise(t * 0.15), y = 30 + 30 * vnoise(t * 0.12 + 5);
      leak.style.background = `radial-gradient(40% 50% at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(255,140,60,.55), rgba(255,80,40,0) 70%), radial-gradient(35% 45% at ${(100 - x).toFixed(1)}% ${(90 - y).toFixed(1)}%, rgba(255,60,70,.35), rgba(255,60,70,0) 70%)`;
    });
  }

  /* ---------------- seek API for the renderer ---------------- */
  await Promise.all($$('img').map((im) => (im.complete && im.naturalWidth ? 0 : new Promise((r) => (im.onload = im.onerror = r)))));
  await Promise.all($$('img').map((im) => im.decode().catch(() => {})));
  window.seek = async (t) => {
    tl.time(t, false);
    for (const f of DYN) f(t);
  };
  window.DURATION = DUR;
  window.CUES = CUES.sort((x, y) => x.t - y.t);
  window.BPM = BPM;
  await window.seek(0);
  window.READY = true;
})();
