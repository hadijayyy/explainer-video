/* Notion launch film timeline.
 * One paused GSAP timeline plus a list of deterministic "dyn" functions (typing,
 * counters, footage frames, floats, motion blur). Everything is a pure function
 * of time t, so any frame can be rendered independently: window.seek(t).
 * Music runs at 128 BPM: one beat = 0.46875 s, one bar = 1.875 s. Scene cuts land on bars.
 */
(async function () {
  const BPM = 128, B = 60 / BPM, BAR = 4 * B;
  const DUR = 46.5;
  const SEQ_FPS = 30;

  const $ = (s) => document.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const E = {
    out3: (t) => 1 - Math.pow(1 - t, 3),
    expoOut: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  };

  await Promise.all([
    document.fonts.load('700 100px "Inter Display"'),
    document.fonts.load('500 30px "Inter"'),
    document.fonts.load('600 30px "Inter"'),
    document.fonts.load('700 30px "Inter"'),
    document.fonts.load('30px "Noto Color Emoji"', '🚀📄'),
  ]);
  await document.fonts.ready;
  await Promise.all($$('img').map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r)))));

  gsap.defaults({ ease: 'power3.out', duration: 0.6 });
  const tl = gsap.timeline({ paused: true });
  const DYN = [];
  const SEQS = [];
  const CUES = [];
  const cue = (t, name, g = 1, p = 1) => CUES.push({ t: +t.toFixed(4), name, g, p });

  /* ---------------- helpers ---------------- */
  function split(el) {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts
      .map((p) => p.trim().split(/\s+/).map((w) => `<span class="w"><span class="wi">${w}</span></span>`).join(' '))
      .join('<br>');
    return $$('.wi', el);
  }
  function rise(words, t, { stagger = 0.05, dur = 0.8 } = {}) {
    gsap.set(words, { yPercent: 115 });
    tl.to(words, { yPercent: 0, duration: dur, ease: 'expo.out', stagger }, t);
  }
  function sink(words, t, { stagger = 0.015, dur = 0.32 } = {}) {
    tl.to(words, { yPercent: -115, duration: dur, ease: 'power2.in', stagger }, t);
  }
  function show(sel, tIn, tOut) {
    if (tIn <= 0) gsap.set(sel, { visibility: 'visible' });
    else tl.set(sel, { visibility: 'visible' }, tIn);
    if (tOut != null) tl.set(sel, { visibility: 'hidden' }, tOut);
  }
  function fadeUp(el, t, { y = 24, dur = 0.7 } = {}) {
    gsap.set(el, { opacity: 0, y });
    tl.to(el, { opacity: 1, y: 0, duration: dur, ease: 'expo.out' }, t);
  }
  function popIn(el, t, { from = 0, ease = 'back.out(2)', dur = 0.55, sfx = 'pop', g = 0.8, p = 1 } = {}) {
    gsap.set(el, { scale: from, opacity: 0 });
    tl.to(el, { scale: 1, duration: dur, ease }, t);
    tl.to(el, { opacity: 1, duration: 0.12, ease: 'none' }, t);
    if (sfx) cue(t, sfx, g, p);
  }
  function typer(el, str, t0, t1, { caretFrom = t0 - 0.25, caretTo = t1 + 0.6, tick = 0.45 } = {}) {
    const txt = el.querySelector('.txt'), car = el.querySelector('.caret'), ph = el.querySelector('.ph');
    DYN.push((t) => {
      const n = Math.round(clamp((t - t0) / (t1 - t0)) * str.length);
      txt.textContent = str.slice(0, n);
      if (ph) ph.style.display = n > 0 ? 'none' : '';
      if (car) {
        const on = t >= caretFrom && t <= caretTo;
        const typing = t >= t0 && t <= t1 + 0.12;
        car.style.opacity = on ? (typing ? 1 : Math.floor((t - caretFrom) * 2.4) % 2 ? 0 : 1) : 0;
      }
    });
    if (tick) for (let i = 0; i < str.length; i += 2) if (str[i] !== ' ') cue(t0 + (t1 - t0) * (i / str.length), 'tick', tick, 0.9 + ((i * 7) % 5) * 0.05);
  }
  function counter(el, t0, t1, to, fmt) {
    DYN.push((t) => (el.textContent = fmt(Math.round(to * E.expoOut(clamp((t - t0) / (t1 - t0)))))));
  }
  function seq(img, name, count, t0, clipStart, rate) {
    SEQS.push({ img, name, count, t0, clipStart, rate });
  }
  function float(el, amp, period, phase) {
    DYN.push((t) => (el.style.translate = `0 ${(amp * Math.sin((t / period) * 2 * Math.PI + phase)).toFixed(2)}px`));
  }
  function mblur(sceneSel, filterId) {
    const p = { b: 0 };
    const el = $(sceneSel), fe = $(`#${filterId} feGaussianBlur`);
    DYN.push(() => {
      if (p.b > 0.4) { fe.setAttribute('stdDeviation', `${p.b.toFixed(1)} 0`); el.style.filter = `url(#${filterId})`; }
      else el.style.filter = 'none';
    });
    return p;
  }
  // position of el's top-left inside ancestor (layout space, ignores transforms)
  function localPos(el, anc) {
    let x = 0, y = 0, n = el;
    while (n && n !== anc) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }
  // cursor glide with a slight arc, then press
  function glide(cur, pts, t0, dur, { ease = 'power3.inOut' } = {}) {
    gsap.set(cur, { x: pts[0][0], y: pts[0][1] });
    tl.to(cur, { x: pts[1][0], duration: dur, ease }, t0);
    tl.to(cur, { y: pts[1][1], duration: dur, ease: 'power2.inOut' }, t0);
  }
  function press(el, t, { s = 0.86, sfx = 'click', g = 0.9 } = {}) {
    tl.to(el, { scale: s, duration: 0.07, ease: 'power2.out' }, t);
    tl.to(el, { scale: 1, duration: 0.35, ease: 'back.out(3)' }, t + 0.07);
    if (sfx) cue(t, sfx, g);
  }

  /* ======================= S1 · HOOK (0 → 3.75) ======================= */
  {
    const cg = $('#calgrid');
    for (let i = 1; i <= 28; i++) {
      const d = document.createElement('div');
      d.textContent = i;
      d.style.cssText = `font-size:15px;height:26px;display:grid;place-items:center;border-radius:50%;color:#787774;font-weight:500;${i === 17 ? 'background:#eb5757;color:#fff;font-weight:700' : ''}`;
      cg.appendChild(d);
    }
    show('#s1', 0, 3.8);
    const lines = $$('.hk').map(split);
    sink(lines[0], 0.74); // line 1 is already on screen at frame 0
    rise(lines[1], 0.94, { dur: 0.55 });
    sink(lines[1], 1.68);
    rise(lines[2], 1.875, { dur: 0.55 });

    const cards = [
      ['#c1', 0.04, -7], ['#c9', 0.22, 5],
      ['#c6', 0.94, 4], ['#c2', 1.1, 6],
      ['#c4', 1.875, -5], ['#c3', 1.98, 8], ['#c5', 2.1, -3], ['#c7', 2.2, 4], ['#c8', 2.3, -4],
    ];
    cards.forEach(([sel, t, r], i) => {
      const el = $(sel);
      if (t < 0.3) gsap.set(el, { rotation: r }); // first cards already on screen at frame 0
      else {
        gsap.set(el, { scale: 0.5, opacity: 0, rotation: r - 14 });
        tl.to(el, { scale: 1, rotation: r, duration: 0.6, ease: 'back.out(1.8)' }, t);
        tl.to(el, { opacity: 1, duration: 0.1, ease: 'none' }, t);
        cue(t, 'thud', 0.75, 0.9 + (i % 3) * 0.08);
      }
      float(el, 5, 2.4 + (i % 3) * 0.3, i * 1.3);
      // implode toward centre
      const cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
      tl.to(el, { x: 960 - cx, y: 540 - cy, scale: 0, rotation: r + 50, duration: 0.6, ease: 'power3.in' }, 2.98 + i * 0.022);
    });
    tl.to('#s1cam', { scale: 1.05, duration: 2.95, ease: 'none' }, 0);
    tl.to('#hook', { scale: 0.2, opacity: 0, duration: 0.5, ease: 'power3.in' }, 3.12);
    cue(2.92, 'suck', 1);
  }

  /* ======================= S2 · BRAND (3.75 → 7.5) ======================= */
  {
    show('#s2', 3.7, 7.75);
    const T0 = 3.75;
    gsap.set('#mark', { scale: 0, rotation: -25 });
    tl.to('#mark', { scale: 1.6, rotation: 0, duration: 0.75, ease: 'back.out(2.4)' }, T0);
    gsap.set('#ring2', { scale: 0.3, opacity: 0 });
    tl.to('#ring2', { opacity: 1, duration: 0.04, ease: 'none' }, T0);
    tl.to('#ring2', { scale: 2.9, duration: 1.0, ease: 'expo.out' }, T0);
    tl.to('#ring2', { opacity: 0, duration: 0.7, ease: 'power1.out' }, T0 + 0.15);
    cue(T0, 'impact', 1);
    cue(T0, 'chime', 0.55);

    tl.to('#letWrap', { width: 317, duration: 0.72, ease: 'expo.inOut' }, 4.22);
    tl.to('#mark', { scale: 1, duration: 0.72, ease: 'expo.inOut' }, 4.22);
    cue(4.22, 'swish', 0.6);

    tl.to('#lockup', { y: -250, scale: 0.58, duration: 0.7, ease: 'expo.inOut' }, 5.0);
    cue(5.0, 'swish', 0.45);
    rise(split($('#s2l1')), 5.45);
    rise($$('#s2l2 .wi'), 5.58, { stagger: 0.07 });

    // pill word cycle: Write → Plan → Build → Think
    const pws = $$('.pw');
    const fs = 104, em = (v) => v * fs;
    const widths = pws.map((p) => { p.style.width = 'max-content'; return p.offsetWidth; });
    const pill = $('#pill');
    gsap.set(pill, { width: em(0.78) + widths[0] + em(0.42) });
    [6.09, 6.56, 7.03].forEach((t, k) => {
      tl.to('#pillWords', { y: -em(1.2) * (k + 1), duration: 0.42, ease: 'expo.inOut' }, t);
      tl.to(pill, { width: em(0.78) + widths[k + 1] + em(0.42), duration: 0.42, ease: 'expo.inOut' }, t);
      cue(t, 'tick', 0.7, 1.25);
    });

    // avatars: 7 clipped copies of the real strip, popping left → right
    const wrap = $('#avWrap');
    const k = 0.6, cxs = [115, 282, 447, 615, 802, 958, 1122];
    cxs.forEach((cx, i) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;inset:0;background:url(../assets/img/avatars_strip.png) 0 0/741px 143px no-repeat;` +
        `clip-path:circle(${(i < 6 ? 72 : 67)}px at ${cx * k + 3}px ${115 * k + 3}px);transform-origin:${cx * k}px ${115 * k}px;z-index:${i}`;
      wrap.appendChild(d);
      popIn(d, 6.3 + i * 0.07, { ease: 'back.out(2.6)', dur: 0.5, g: 0.55, p: 0.9 + i * 0.06 });
    });

    tl.to('#s2cam', { scale: 1.35, opacity: 0, filter: 'blur(18px)', duration: 0.38, ease: 'power2.in' }, 7.26);
    cue(7.12, 'whoosh', 0.9);
  }

  /* ======================= S3 · WORKSPACE (7.5 → 13.125) ======================= */
  const p3 = mblur('#s3', 'mb3');
  {
    show('#s3', 7.38, 13.2);
    gsap.set('#s3win', { y: 520, rotationX: 34, scale: 0.86, opacity: 0 });
    tl.to('#s3win', { y: 0, rotationX: 0, scale: 1, duration: 1.15, ease: 'expo.out' }, 7.4);
    tl.to('#s3win', { opacity: 1, duration: 0.25, ease: 'none' }, 7.4);
    rise(split($('#s3head')), 7.55);
    tl.to('#g3', { opacity: 0.5, duration: 1.4, ease: 'power1.out' }, 7.7);
    seq($('#seqBoard'), 'agents_board', 329, 7.5, 0.6, 1.0);
    tl.to('#s3push', { scale: 1.075, y: -30, duration: 5.0, ease: 'power1.inOut' }, 8.0);
    ['#ch1', '#ch2', '#ch3', '#ch4'].forEach((s, i) => {
      popIn(s, 7.5 + BAR + i * B, { g: 0.75, p: 1 + i * 0.07 });
      float($(s), 7, 2.6, i * 1.7);
    });
    // whip out to the left
    tl.to('#s3cam', { x: -1150, duration: 0.33, ease: 'power3.in' }, 12.8);
    tl.to(p3, { b: 70, duration: 0.33, ease: 'power3.in' }, 12.8);
    cue(12.8, 'whoosh', 1);
  }

  /* ======================= S4 · DOCS (13.125 → 18.75) ======================= */
  const p4 = mblur('#s4', 'mb4');
  {
    show('#s4', 13.1, 18.9);
    gsap.set('#s4cam', { x: 1150 });
    p4.b = 0;
    tl.set(p4, { b: 70 }, 13.125);
    tl.to('#s4cam', { x: 0, duration: 0.6, ease: 'expo.out' }, 13.125);
    tl.to(p4, { b: 0, duration: 0.42, ease: 'expo.out' }, 13.125);
    tl.to('#g4', { opacity: 0.45, duration: 1.2 }, 13.3);

    popIn('#s4eb', 13.3, { from: 0.7, sfx: null });
    rise(split($('#s4h')), 13.36);
    fadeUp('#s4s', 13.65);

    const win = $('#s4win');
    typer($('#d_title'), 'Product launch plan', 13.75, 14.45, { caretFrom: 13.55, caretTo: 14.6 });
    fadeUp('#d_p', 14.45, { y: 10, dur: 0.5 });
    fadeUp('#d_h2', 14.55, { y: 10, dur: 0.5 });

    // slash command
    const sl = $('#d_slash');
    const slTxt = sl.querySelector('.txt'), slCar = sl.querySelector('.caret'), slPh = sl.querySelector('.ph');
    DYN.push((t) => {
      const on = t >= 14.7 && t < 15.45;
      slTxt.textContent = t >= 14.78 && on ? '/' : '';
      slPh.style.display = t >= 14.78 && on ? '' : 'none';
      slCar.style.opacity = on ? (t < 14.78 || Math.floor((t - 14.7) * 2.4) % 2 === 0 ? 1 : 0) : 0;
    });
    cue(14.78, 'tick', 0.7);
    const slp = localPos(sl, win);
    const menu = $('#slash');
    menu.style.top = slp.y + 54 + 'px';
    gsap.set(menu, { opacity: 0, scale: 0.92, y: -8, transformOrigin: '0% 0%' });
    tl.to(menu, { opacity: 1, scale: 1, y: 0, duration: 0.32, ease: 'expo.out' }, 14.82);
    cue(14.82, 'pop', 0.6, 1.2);
    tl.to('#slhl', { y: 56, duration: 0.16, ease: 'power2.out' }, 15.02);
    tl.to('#slhl', { y: 112, duration: 0.16, ease: 'power2.out' }, 15.2);
    cue(15.02, 'tick', 0.5, 1.1); cue(15.2, 'tick', 0.5, 1.15);
    const cur = $('#d_cur');
    const todoItem = $$('#slash .it')[2];
    const tp = localPos(todoItem, win);
    glide(cur, [[760, 860], [tp.x + 210, tp.y + 26]], 14.8, 0.5);
    press(cur, 15.38);
    tl.to(menu, { opacity: 0, scale: 0.97, duration: 0.14, ease: 'power2.in' }, 15.44);
    tl.to(cur, { x: '+=160', y: '+=120', opacity: 0, duration: 0.5, ease: 'power2.in' }, 15.7);

    const rows = $$('#todos .todo');
    rows.forEach((r, i) => {
      gsap.set(r, { opacity: 0, x: -14 });
      tl.to(r, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }, 15.5 + i * 0.12);
      cue(15.5 + i * 0.12, 'pop', 0.4, 1.3 + i * 0.08);
    });

    // multiplayer: Faye checks the first to-do
    const faye = $('#faye');
    const box = rows[0].querySelector('.box');
    const bp = localPos(box, win);
    glide(faye, [[1000, 920], [bp.x + 10, bp.y + 12]], 15.85, 0.65);
    tl.to(faye, { scale: 0.85, duration: 0.07 }, 16.55);
    tl.to(faye, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 16.62);
    const fill = box.querySelector('.fill'), chk = box.querySelector('svg');
    gsap.set(chk, { opacity: 0, scale: 0.4 });
    tl.to(fill, { scale: 1, duration: 0.35, ease: 'back.out(2.5)' }, 16.57);
    tl.to(chk, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(2.5)' }, 16.62);
    tl.to(rows[0].querySelector('.strike'), { scaleX: 1, duration: 0.35, ease: 'power2.out' }, 16.66);
    tl.to(rows[0].querySelector('.txt'), { color: '#9b9a97', duration: 0.3 }, 16.66);
    cue(16.57, 'click', 0.8); cue(16.6, 'pop', 0.7, 1.35);
    tl.to(faye, { x: '+=330', y: '+=150', duration: 0.9, ease: 'power3.inOut' }, 16.85);
    tl.to(faye, { x: '+=30', y: '+=14', duration: 1.4, ease: 'sine.inOut' }, 17.75);

    popIn('#cmt', 17.05, { from: 0.85, ease: 'back.out(1.8)', g: 0.7, p: 1.1 });
    gsap.set('#cmt', { y: 30 });
    tl.to('#cmt', { y: 0, duration: 0.6, ease: 'expo.out' }, 17.05);
    popIn('#cmt .react', 17.6, { from: 0.4, g: 0.5, p: 1.4 });
    float($('#cmt'), 5, 2.8, 0.5);

    tl.to('#s4win', { scale: 1.025, duration: 4.5, ease: 'none' }, 13.8);
    // push up and out
    tl.to('#s4cam', { y: -700, duration: 0.42, ease: 'power3.in' }, 18.4);
    tl.to('#s4cam', { opacity: 0, filter: 'blur(14px)', duration: 0.36, ease: 'power2.in' }, 18.46);
    cue(18.38, 'whoosh', 0.9);
  }

  /* ======================= S5 · FIND (18.75 → 24.375) ======================= */
  {
    show('#s5', 18.62, 24.5);
    gsap.set('#s5cam', { y: 620, filter: 'blur(14px)' });
    tl.to('#s5cam', { y: 0, filter: 'blur(0px)', duration: 0.75, ease: 'expo.out' }, 18.72);
    tl.to('#g5', { opacity: 0.45, duration: 1.4 }, 18.9);
    rise(split($('#s5h')), 18.82);
    fadeUp('#s5s', 19.1);
    fadeUp('#ask', 18.95, { y: 40, dur: 0.8 });
    typer($('#ask .q'), 'What are our biggest opportunities in H2?', 19.45, 20.5, { caretFrom: 19.15, caretTo: 20.75 });
    press('#send', 20.66, { s: 0.82 });

    gsap.set('#ans', { opacity: 0, y: 40, scale: 0.98 });
    tl.to('#ans', { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' }, 20.8);
    cue(20.8, 'swish', 0.45);
    const th = $('#thinking');
    DYN.push((t) => {
      if (t < 21.65) { th.textContent = 'Searching 3 sources…'; th.className = 'shimmer'; th.style.backgroundPosition = `${(100 - ((t * 120) % 200)).toFixed(1)}% 0`; }
      else { th.textContent = 'Searched 3 sources'; th.className = ''; th.style.color = '#a5a29a'; }
    });
    $$('#srcs .src').forEach((s, i) => popIn(s, 21.0 + i * 0.13, { from: 0.6, g: 0.5, p: 1.2 + i * 0.1 }));

    // stream the answer word by word
    const ans = $('#answer');
    const toks = [];
    $$('.row', ans).forEach((row) => {
      [...row.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((w) => {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
            else { const s = document.createElement('span'); s.textContent = w; frag.appendChild(s); toks.push(s); }
          });
          row.replaceChild(frag, n);
        } else toks.push(n);
      });
    });
    const s0 = 21.7, s1 = 23.05;
    DYN.push((t) => toks.forEach((s, i) => {
      const ti = s0 + (i / toks.length) * (s1 - s0);
      const k = clamp((t - ti) / 0.14);
      s.style.opacity = k.toFixed(3);
    }));

    // hover a citation
    const cur = $('#a_cur'), c1 = $('#cite1'), ansEl = $('#ans');
    const r1 = c1.getBoundingClientRect(), ra = ansEl.getBoundingClientRect();
    const cx = r1.left - ra.left, cy = r1.top - ra.top;
    glide(cur, [[1180, 470], [cx + 14, cy + 16]], 23.1, 0.5);
    DYN.push((t) => c1.classList.toggle('on', t >= 23.62));
    const pop = $('#citepop');
    pop.style.left = 400 + cx + 64 + 'px';
    pop.style.top = 500 + cy + 36 + 'px';
    popIn(pop, 23.66, { from: 0.9, ease: 'expo.out', dur: 0.4, g: 0.5, p: 1.3 });

    tl.to('#s5cam', { scale: 1.3, opacity: 0, filter: 'blur(16px)', duration: 0.4, ease: 'power2.in' }, 24.0);
    cue(23.95, 'whoosh', 0.9);
  }

  /* ======================= S6 · PROJECTS (24.375 → 30.0) ======================= */
  const p6 = mblur('#s6', 'mb6');
  {
    show('#s6', 24.25, 30.1);
    gsap.set('#s6cam', { scale: 0.86, opacity: 0, filter: 'blur(16px)' });
    tl.to('#s6cam', { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' }, 24.3);
    tl.to('#g6', { opacity: 0.4, duration: 1.4 }, 24.5);
    popIn('#s6eb', 24.5, { from: 0.7, sfx: null });
    rise(split($('#s6h')), 24.55);
    fadeUp('#s6s', 24.85);

    const DATA = [
      { n: 'Multi-account login', e: '🔐', st: 'blue', sl: 'In progress', who: ['AL', '#d9730d'], due: 'Jun 12', r: [3, 12] },
      { n: 'Onboarding flow', e: '👋', st: 'green', sl: 'Done', who: ['FR', '#9065b0'], due: 'Jun 9', r: [1, 9] },
      { n: 'iOS app', e: '📱', st: 'blue', sl: 'In progress', who: ['MR', '#2383e2'], due: 'Jun 22', r: [9, 22] },
      { n: 'CSV import', e: '📥', st: 'gray', sl: 'Not started', who: ['JK', '#e07a5f'], due: 'Jun 28', r: [18, 28] },
      { n: 'Google login', e: '🔑', st: 'green', sl: 'Done', who: ['SP', '#0f7b6c'], due: 'Jun 14', r: [6, 14] },
    ];
    const TINT = { blue: '#d6e7f5', green: '#dbeddb', gray: '#ebeae7' };
    const box = $('#items');
    const els = DATA.map((d) => {
      const it = document.createElement('div');
      it.className = 'item';
      it.innerHTML = `<div class="bg"></div><div class="bar2" style="background:${TINT[d.st]}"></div><div class="rl"></div>
        <div class="tt"><span class="emoji">${d.e}</span>${d.n}</div>
        <div class="tg"><span class="tag ${d.st}">${d.sl}</span></div>
        <div class="av"><div class="ini" style="background:${d.who[1]}">${d.who[0]}</div></div>
        <div class="dt">${d.due}</div>`;
      box.appendChild(it);
      return it;
    });
    const W = 932, DW = W / 30;
    const BOARD = { gray: [0], blue: [316], green: [632] };
    const colIdx = { gray: 0, blue: 0, green: 0 };
    const L = {
      table: (d, i) => ({ x: 0, y: 50 + i * 62, w: W, h: 62, tt: [14, 18], tg: [400, 15, 1], av: [620, 14], dt: [780, 19, 1], bg: 0, bar: 0, rl: 1 }),
      board: (d, i) => {
        const x = BOARD[d.st][0], k = colIdx[d.st]++;
        return { x, y: 56 + k * 142, w: 300, h: 128, tt: [18, 20], tg: [18, 74, 1], av: [248, 76], dt: [180, 80, 0], bg: 1, bar: 0, rl: 0 };
      },
      time: (d, i) => {
        const w = (d.r[1] - d.r[0] + 1) * DW;
        return { x: (d.r[0] - 1) * DW, y: 62 + i * 72, w, h: 52, tt: [14, 13], tg: [w - 150, 10, 0], av: [w - 44, 9], dt: [w + 12, 15, 0], bg: 0, bar: 1, rl: 0 };
      },
    };
    const layouts = { table: DATA.map(L.table), board: DATA.map(L.board), time: DATA.map(L.time) };
    function apply(name, t, dur) {
      els.forEach((el, i) => {
        const s = layouts[name][i];
        const q = (sel) => el.querySelector(sel);
        const props = [
          [el, { x: s.x, y: s.y, width: s.w, height: s.h }],
          [q('.tt'), { x: s.tt[0], y: s.tt[1] }],
          [q('.tg'), { x: s.tg[0], y: s.tg[1], opacity: s.tg[2] }],
          [q('.av'), { x: s.av[0], y: s.av[1] }],
          [q('.dt'), { x: s.dt[0], y: s.dt[1], opacity: s.dt[2] }],
          [q('.bg'), { opacity: s.bg }],
          [q('.bar2'), { opacity: s.bar }],
          [q('.rl'), { opacity: s.rl }],
        ];
        props.forEach(([e, v]) => (t == null ? gsap.set(e, v) : tl.to(e, { ...v, duration: dur, ease: 'expo.inOut' }, t + i * 0.035)));
      });
    }
    apply('table');
    els.forEach((el, i) => {
      gsap.set(el, { opacity: 0 });
      tl.to(el, { opacity: 1, duration: 0.4, ease: 'none' }, 24.75 + i * 0.07);
    });
    fadeUp('#hdrTable', 24.65, { y: 0, dur: 0.4 });
    gsap.set(['#hdrBoard', '#hdrTime', '#today'], { opacity: 0 });

    // timeline grid
    const g = $('#hdrTime');
    for (let d = 1; d <= 30; d++) {
      const x = (d - 1) * DW;
      if ((d - 1) % 3 === 0) { const lab = document.createElement('div'); lab.className = 'd'; lab.style.left = x - 4 + 'px'; lab.textContent = d === 1 ? 'Jun 1' : d; if (d === 1) lab.style.width = '60px'; g.appendChild(lab); }
      const v = document.createElement('div'); v.className = 'v'; v.style.left = x + 'px'; g.appendChild(v);
    }
    $('#today').style.left = 13 * DW + DW / 2 + 'px';

    // tabs
    const win = $('#s6win');
    const tabs = [0, 1, 2].map((i) => $('#tab' + i));
    const tpos = tabs.map((t) => localPos(t, $('#s6win').children[1]));
    const tline = $('#tabline');
    const setTab = (i, t) => {
      const v = { x: tpos[i].x, width: tpos[i].w };
      if (t == null) gsap.set(tline, { left: 0, ...v });
      else tl.to(tline, { ...v, duration: 0.45, ease: 'expo.inOut' }, t);
      tabs.forEach((tb, k) => (t == null ? gsap.set(tb, { color: k === i ? '#191919' : '#787774' }) : tl.to(tb, { color: k === i ? '#191919' : '#787774', duration: 0.2 }, t)));
    };
    setTab(0);

    const cur = $('#p_cur');
    const tw = (i) => { const p = localPos(tabs[i], win); return [p.x + p.w / 2, p.y + p.h / 2 + 4]; };
    glide(cur, [[900, 900], tw(1)], 25.45, 0.55);
    press(cur, 26.0);
    setTab(1, 26.02);
    apply('board', 26.05, 0.8);
    tl.to('#hdrTable', { opacity: 0, duration: 0.25 }, 26.05);
    tl.to('#hdrBoard', { opacity: 1, duration: 0.4 }, 26.5);
    cue(26.05, 'swish', 0.7);

    const tw2 = tw(2);
    tl.to(cur, { x: tw2[0], y: tw2[1], duration: 0.5, ease: 'power3.inOut' }, 27.3);
    press(cur, 27.85);
    setTab(2, 27.87);
    apply('time', 27.9, 0.8);
    tl.to('#hdrBoard', { opacity: 0, duration: 0.25 }, 27.9);
    tl.to('#hdrTime', { opacity: 1, duration: 0.5 }, 28.35);
    cue(27.9, 'swish', 0.7);
    gsap.set('#today', { scaleY: 0 });
    tl.to('#today', { opacity: 1, duration: 0.1 }, 28.6);
    tl.to('#today', { scaleY: 1, duration: 0.6, ease: 'expo.out' }, 28.6);
    cue(28.6, 'pop', 0.5, 1.4);
    tl.to(cur, { x: '+=120', y: '+=260', opacity: 0, duration: 0.6, ease: 'power2.in' }, 28.5);

    // whip out
    tl.to('#s6cam', { x: -1150, duration: 0.33, ease: 'power3.in' }, 29.675);
    tl.to(p6, { b: 70, duration: 0.33, ease: 'power3.in' }, 29.675);
    cue(29.66, 'whoosh', 1);
  }

  /* ======================= S7 · AGENTS (30 → 35.625) ======================= */
  const p7 = mblur('#s7', 'mb7');
  {
    show('#s7', 29.98, 35.8);
    gsap.set('#s7cam', { x: 1150 });
    tl.set(p7, { b: 70 }, 30.0);
    tl.to('#s7cam', { x: 0, duration: 0.6, ease: 'expo.out' }, 30.0);
    tl.to(p7, { b: 0, duration: 0.42, ease: 'expo.out' }, 30.0);
    rise(split($('#s7h')), 30.12);
    seq($('#seqAgent'), 'ai_bugtracker', 320, 30.1, 0.0, 1.9);
    // virtual camera inside the real clip: prompt -> dashboard -> finished tracker
    const img = $('#seqAgent'), CW = 1270, CH = 794, K = CW / 1440;
    const focus = (fx, fy, sc) => {
      const x = Math.min(0, Math.max(CW - CW * sc, CW / 2 - fx * K * sc));
      const y = Math.min(0, Math.max(CH - CH * sc, CH / 2 - fy * K * sc));
      return { x, y, scale: sc };
    };
    gsap.set(img, { transformOrigin: '0 0', ...focus(720, 560, 1.55) });
    tl.to(img, { ...focus(600, 400, 1.32), duration: 0.9, ease: 'power3.inOut' }, 31.55);
    tl.to(img, { ...focus(760, 520, 1.12), duration: 1.0, ease: 'power3.inOut' }, 33.35);
    tl.to('#s7win', { scale: 1.03, duration: 5.2, ease: 'none' }, 30.3);
    popIn('#s7chip', 30.95, { g: 0.7 });
    float($('#s7chip'), 6, 2.5, 0);
    popIn('#s7chip2', 34.2, { g: 0.7, p: 1.2 });
    float($('#s7chip2'), 6, 2.5, 1.5);
    tl.to('#s7cam', { scale: 0.82, opacity: 0, filter: 'blur(12px)', duration: 0.36, ease: 'power2.in' }, 35.32);
    cue(35.3, 'whoosh', 0.85);
  }

  /* ======================= S8 · MONTAGE (35.625 → 39.375) ======================= */
  {
    show('#s8', 35.55, 39.5);
    const hw = split($('#s8h'));
    rise(hw, 35.62);
    ['#m1', '#m2', '#m3'].forEach((s, i) => {
      const t = 35.72 + i * B;
      gsap.set(s, { rotationY: -75, x: -140, opacity: 0, transformOrigin: '0% 50%' });
      tl.to(s, { rotationY: 0, x: 0, duration: 0.85, ease: 'expo.out' }, t);
      tl.to(s, { opacity: 1, duration: 0.15, ease: 'none' }, t);
      cue(t, 'thud', 0.8, 1 + i * 0.08);
      cue(t, 'swish', 0.35);
      float($(s), 6, 2.6, i * 1.2);
      tl.to(s, { y: -900, rotation: (i - 1) * 6, duration: 0.45, ease: 'power3.in' }, 38.98 + i * 0.05);
    });
    sink(hw, 38.98);
    tl.to('#s8cam', { scale: 1.03, duration: 3.2, ease: 'none' }, 35.7);
    cue(38.95, 'whoosh', 0.85);
  }

  /* ======================= S9 · PROOF (39.375 → 43.125) ======================= */
  {
    show('#s9', 39.3, 43.25);
    rise(split($('#s9h')), 39.38);
    fadeUp('#st1', 39.5, { y: 40 });
    fadeUp('#st2', 39.62, { y: 40 });
    gsap.set('#stdiv', { scaleY: 0 });
    tl.to('#stdiv', { scaleY: 1, duration: 0.7, ease: 'expo.out' }, 39.6);
    counter($('#n1'), 39.55, 40.95, 100, (v) => v + 'M');
    counter($('#n2'), 39.7, 41.05, 62, (v) => v + '%');
    cue(40.95, 'popHi', 0.6, 1.0);
    cue(41.05, 'popHi', 0.5, 1.2);
    const row1 = ['openai', 'figma', 'ramp', 'vercel', 'cursor', 'nvidia', 'toyota', 'volvo'];
    const row2 = ['discord', '1password', 'a24', 'patreon', 'substack', 'dolby', 'clay', 'fedex'];
    const H = { openai: 74, volvo: 26, a24: 52, figma: 50, toyota: 38, patreon: 34, substack: 44, nvidia: 44, clay: 50, fedex: 46, dolby: 46 };
    const fill = (tr, list) => [...list, ...list].forEach((n) => {
      const im = document.createElement('img');
      im.src = `../assets/logos/c_${n}.svg`;
      im.style.height = (H[n] || 42) + 'px';
      tr.appendChild(im);
    });
    fill($('#tr1'), row1);
    fill($('#tr2'), row2);
    gsap.set('#tr1', { x: -40 });
    gsap.set('#tr2', { x: -900 });
    tl.to('#tr1', { x: -620, duration: 4.0, ease: 'none' }, 39.3);
    tl.to('#tr2', { x: -320, duration: 4.0, ease: 'none' }, 39.3);
    fadeUp('#mq1', 39.85, { y: 30 });
    fadeUp('#mq2', 39.98, { y: 30 });
    tl.to('#s9cam', { scale: 0.92, opacity: 0, filter: 'blur(10px)', duration: 0.32, ease: 'power2.in' }, 42.82);
    cue(42.33, 'suck', 0.7);
  }

  /* ======================= S10 · CTA (43.125 → 46.5) ======================= */
  {
    show('#s10', 43.05);
    const T0 = 43.125;
    gsap.set('#mark10', { scale: 0, rotation: -25 });
    tl.to('#mark10', { scale: 1.35, rotation: 0, duration: 0.75, ease: 'back.out(2.4)' }, T0);
    gsap.set('#ring10', { scale: 0.3, opacity: 0 });
    tl.to('#ring10', { opacity: 1, duration: 0.04, ease: 'none' }, T0);
    tl.to('#ring10', { scale: 2.9, duration: 1.0, ease: 'expo.out' }, T0);
    tl.to('#ring10', { opacity: 0, duration: 0.7, ease: 'power1.out' }, T0 + 0.15);
    cue(T0, 'impact', 1);
    cue(T0, 'chime', 0.7);
    tl.to('#let10', { width: 292, duration: 0.8, ease: 'expo.inOut' }, 43.55);
    tl.to('#mark10', { scale: 1, duration: 0.8, ease: 'expo.inOut' }, 43.55);
    cue(43.55, 'swish', 0.5);
    rise(split($('#s10h')), 43.85, { stagger: 0.045 });
    gsap.set('#cta', { xPercent: -50 });
    popIn('#cta', 44.3, { from: 0.6, ease: 'back.out(2)', g: 0.7 });
    fadeUp('#url', 44.5, { y: 14 });
    const cta = $('#cta');
    const cur = $('#c_cur');
    const bx = 960 + 70, by = 640 + cta.offsetHeight / 2 + 6;
    gsap.set(cur, { opacity: 0 });
    tl.to(cur, { opacity: 1, duration: 0.2 }, 44.55);
    glide(cur, [[1500, 1010], [bx, by]], 44.55, 0.6);
    press('#cta', 45.25, { s: 0.94 });
    tl.to(cur, { scale: 0.85, duration: 0.07 }, 45.25);
    tl.to(cur, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, 45.32);
    const rip = document.createElement('div');
    rip.className = 'ripple';
    cta.appendChild(rip);
    gsap.set(rip, { left: 220, top: cta.offsetHeight / 2 - 20, scale: 0, opacity: 0.9 });
    tl.to(rip, { scale: 14, opacity: 0, duration: 0.7, ease: 'expo.out' }, 45.25);
    tl.to('#s10cam', { scale: 1.02, duration: 3.3, ease: 'none' }, 43.2);
  }

  /* ---------------- seek API for the renderer ---------------- */
  const imgCache = {};
  window.seek = async (t) => {
    tl.time(t, false);
    for (const f of DYN) f(t);
    const ps = [];
    for (const s of SEQS) {
      const ct = s.clipStart + Math.max(0, t - s.t0) * s.rate;
      const idx = Math.min(s.count, Math.max(1, Math.floor(ct * SEQ_FPS) + 1));
      const src = `../build/frames/${s.name}/${String(idx).padStart(4, '0')}.jpg`;
      if (s.img.dataset.src !== src) {
        s.img.dataset.src = src;
        s.img.src = src;
        ps.push(s.img.decode().catch(() => {}));
      }
    }
    await Promise.all(ps);
  };
  window.DURATION = DUR;
  window.CUES = CUES.sort((a, b) => a.t - b.t);
  window.BPM = BPM;
  await window.seek(0);
  window.READY = true;
})();
