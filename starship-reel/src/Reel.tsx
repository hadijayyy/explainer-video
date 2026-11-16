import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import timing from "./timing.json";

export const FPS = 30;
export const TOTAL_FRAMES = Math.round(timing.total * FPS);

const INK = "#F4F6FB";
const MUTE = "#8C9BBD";
const HOT = "#FF6A2B";
const GOLD = "#FFC247";
const GOOD = "#3DDC97";
const BAD = "#FF4D5E";
const FONT = "'Inter Display', Inter, sans-serif";

// ---------- timing helpers (all in seconds, driven by the voiceover) ----------
type Line = (typeof timing.lines)[number];
const LINES: Line[] = timing.lines;
const sceneStart = (i: number) => (i === 0 ? 0 : LINES[i].start - 0.25);
const sceneEnd = (i: number) => (i === LINES.length - 1 ? timing.total : sceneStart(i + 1));
const idx = (id: string) => LINES.findIndex((l) => l.id === id);
/** Seconds from the start of a scene to the moment a word is spoken. */
const cue = (id: string, word: string, nth = 0) => {
  const i = idx(id);
  const hits = LINES[i].words.filter((w) => w.w.toLowerCase().startsWith(word));
  return hits[nth].s - sceneStart(i);
};

const useT = () => useCurrentFrame() / useVideoConfig().fps;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ramp = (t: number, a: number, b: number, from = 0, to = 1, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(t, [a, b], [from, to], { ...clamp, easing });
const usePop = (at: number, damping = 13) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at * fps, fps, config: { damping, stiffness: 150 } });
};

// ---------- shared pieces ----------
const Pop: React.FC<{ at?: number; children: React.ReactNode; style?: React.CSSProperties; from?: number }> = ({
  at = 0,
  children,
  style,
  from = 60,
}) => {
  const p = usePop(at);
  return (
    <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * from}px) scale(${0.9 + 0.1 * p})`, ...style }}>
      {children}
    </div>
  );
};

const Tag: React.FC<{ children: React.ReactNode; color?: string; at?: number }> = ({ children, color = HOT, at = 0 }) => (
  <Pop at={at} style={{ alignSelf: "flex-start" }}>
    <div
      style={{
        padding: "12px 26px",
        borderRadius: 999,
        background: color,
        color: "#07090F",
        fontWeight: 800,
        fontSize: 34,
        letterSpacing: 2.5,
      }}
    >
      {children}
    </div>
  </Pop>
);

const Big: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({
  children,
  size = 120,
  color = INK,
  style,
}) => (
  <div style={{ fontSize: size, fontWeight: 900, lineHeight: 0.98, letterSpacing: -size * 0.03, color, ...style }}>{children}</div>
);

const Stars: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 80% at 50% 0%, #14224A 0%, #070B18 55%, #04060D 100%)" }}>
      {Array.from({ length: 90 }).map((_, i) => {
        const s = 1.5 + random(`s${i}`) * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: random(`x${i}`) * 1080,
              top: (random(`y${i}`) * 1920 + t * (4 + s * 3)) % 1920,
              width: s,
              height: s,
              borderRadius: s,
              background: "#fff",
              opacity: 0.25 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)),
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Safe zone: 250 top, 80 sides. The bottom 560 px is left to the captions and platform UI. */
const Safe: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ padding: "250px 80px 560px 80px", fontFamily: FONT, color: INK, display: "flex", flexDirection: "column" }}>
    {children}
  </AbsoluteFill>
);

const Flame: React.FC<{ x: number; len: number; w?: number }> = ({ x, len, w = 16 }) => {
  const f = useCurrentFrame();
  const l = len * (0.85 + 0.3 * random(`fl${f}-${x}`));
  return (
    <g>
      <path d={`M${x - w / 2},0 Q${x},${l * 1.1} ${x},${l} Q${x},${l * 1.1} ${x + w / 2},0 Z`} fill={HOT} opacity={0.9} />
      <path d={`M${x - w / 4},0 Q${x},${l * 0.6} ${x},${l * 0.55} Q${x},${l * 0.6} ${x + w / 4},0 Z`} fill="#FFF3C4" />
    </g>
  );
};

/** Starship upper stage, 100 x 560 units. Dark side = heat shield. */
const Ship: React.FC<{ h: number; flames?: number; flameLen?: number; style?: React.CSSProperties }> = ({
  h,
  flames = 0,
  flameLen = 160,
  style,
}) => (
  <svg viewBox="-30 0 160 560" width={(h * 160) / 560} height={h} style={{ overflow: "visible", ...style }}>
    <defs>
      <linearGradient id="steel" x1="0" x2="1">
        <stop offset="0" stopColor="#8E99AE" />
        <stop offset="0.45" stopColor="#F2F5FA" />
        <stop offset="1" stopColor="#9AA5BA" />
      </linearGradient>
      <clipPath id="hull">
        <path d="M10,560 L10,160 C10,80 34,22 50,0 C66,22 90,80 90,160 L90,560 Z" />
      </clipPath>
    </defs>
    {flames > 0 && (
      <g transform="translate(0,556)">
        {flames >= 3 && <Flame x={30} len={flameLen * 0.9} />}
        <Flame x={50} len={flameLen} />
        {flames >= 3 && <Flame x={70} len={flameLen * 0.9} />}
      </g>
    )}
    <path d="M12,150 L-22,215 L-22,250 L12,240 Z" fill="#161A24" />
    <path d="M88,150 L122,215 L122,250 L88,240 Z" fill="#7C879C" />
    <path d="M12,420 L-26,470 L-26,548 L12,548 Z" fill="#161A24" />
    <path d="M88,420 L126,470 L126,548 L88,548 Z" fill="#7C879C" />
    <g clipPath="url(#hull)">
      <rect x="0" y="0" width="100" height="560" fill="url(#steel)" />
      <rect x="0" y="0" width="46" height="560" fill="#161A24" />
      {[200, 290, 380, 470].map((y) => (
        <rect key={y} x="46" y={y} width="54" height="2" fill="#6F7A90" opacity="0.6" />
      ))}
    </g>
  </svg>
);

/** Super Heavy booster, 100 x 760 units. */
const Booster: React.FC<{ h: number; flameLen?: number }> = ({ h, flameLen = 0 }) => (
  <svg viewBox="-30 0 160 760" width={(h * 160) / 760} height={h} style={{ overflow: "visible", display: "block" }}>
    {flameLen > 0 && (
      <g transform="translate(0,756)">
        {[22, 36, 50, 64, 78].map((x) => (
          <Flame key={x} x={x} len={flameLen * (x === 50 ? 1 : 0.85)} w={18} />
        ))}
      </g>
    )}
    <rect x="10" y="0" width="80" height="760" fill="url(#steel)" />
    <rect x="10" y="0" width="80" height="26" fill="#3A4254" />
    <rect x="-8" y="34" width="18" height="44" fill="#3A4254" />
    <rect x="90" y="34" width="18" height="44" fill="#3A4254" />
    {[190, 380, 570].map((y) => (
      <rect key={y} x="10" y={y} width="80" height="2" fill="#6F7A90" opacity="0.6" />
    ))}
    <path d="M10,640 L2,760 L10,760 Z M90,640 L98,760 L90,760 Z" fill="#7C879C" />
  </svg>
);

/** Launch tower with two catch arms. `grip` 0 = open, 1 = closed around a ship of width `shipW`. */
const Tower: React.FC<{ height: number; armY: number; grip: number; shipW: number }> = ({ height, armY, grip, shipW }) => {
  const gap = interpolate(grip, [0, 1], [shipW / 2 + 150, shipW / 2 - 4]);
  const cells = Math.floor(height / 80);
  return (
    <div style={{ position: "absolute", left: "50%", bottom: 0, width: 0, height }}>
      <svg width={220} height={height} style={{ position: "absolute", left: -110, top: 0, overflow: "visible" }}>
        <rect x="20" y="0" width="180" height={height} fill="#111a33" stroke="#2C3A63" strokeWidth="4" />
        {Array.from({ length: cells }).map((_, i) => (
          <g key={i} stroke="#2C3A63" strokeWidth="4">
            <line x1="20" y1={i * 80} x2="200" y2={(i + 1) * 80} />
            <line x1="200" y1={i * 80} x2="20" y2={(i + 1) * 80} />
            <line x1="20" y1={i * 80} x2="200" y2={i * 80} />
          </g>
        ))}
        <rect x="96" y="-70" width="8" height="70" fill="#2C3A63" />
        <circle cx="100" cy="-74" r="7" fill={BAD} />
      </svg>
      {[-1, 1].map((side) => (
        <div
          key={side}
          style={{
            position: "absolute",
            top: armY,
            left: side === -1 ? -gap - 190 : gap,
            width: 190,
            height: 34,
            background: "linear-gradient(#55648F, #2F3B60)",
            borderRadius: 6,
            boxShadow: "0 6px 0 #1B2442",
          }}
        >
          <div
            style={{
              position: "absolute",
              [side === -1 ? "right" : "left"]: 0,
              top: -10,
              width: 26,
              height: 54,
              background: GOLD,
              borderRadius: 5,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const Ring: React.FC<{ at: number; x: number; y: number; color?: string }> = ({ at, x, y, color = GOLD }) => {
  const t = useT() - at;
  if (t < 0 || t > 0.9) return null;
  const r = 60 + t * 620;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        border: `${10 * (1 - t / 0.9)}px solid ${color}`,
        opacity: 1 - t / 0.9,
      }}
    />
  );
};

const shake = (t: number, at: number, amp = 22) => {
  const d = t - at;
  if (d < 0 || d > 0.5) return "";
  const a = amp * (1 - d / 0.5);
  return `translate(${Math.sin(d * 90) * a}px, ${Math.cos(d * 70) * a}px)`;
};

// ---------- scene 1: hook ----------
const Hook: React.FC = () => {
  const t = useT();
  const CATCH = 1.25;
  const shipH = 430;
  const shipW = (shipH * 100) / 560;
  const y = ramp(t, 0, CATCH, -520, 0, Easing.out(Easing.cubic));
  const grip = ramp(t, CATCH - 0.3, CATCH, 0, 1, Easing.in(Easing.quad));
  return (
    <AbsoluteFill style={{ transform: shake(t, CATCH) }}>
      <Tower height={1150} armY={200} grip={grip} shipW={shipW} />
      <div style={{ position: "absolute", left: 540 - (shipH * 160) / 560 / 2, top: 770 + 200 - shipH * 0.31 + y }}>
        <Ship h={shipH} flames={t < CATCH + 0.25 ? 3 : 0} flameLen={ramp(t, CATCH - 0.2, CATCH + 0.25, 200, 30)} />
      </div>
      <Ring at={CATCH} x={540} y={985} />
      <Safe>
        <Tag>BREAKING · NOV 14, 2026</Tag>
        <div style={{ height: 26 }} />
        <Pop at={0.15}>
          <Big size={112}>SPACEX JUST</Big>
        </Pop>
        <Pop at={0.4}>
          <Big size={112} color={GOLD}>
            CAUGHT A SPACESHIP
          </Big>
        </Pop>
      </Safe>
      <div style={{ position: "absolute", left: 80, top: 735, fontFamily: FONT }}>
        <Pop at={cue("hook", "falling")}>
          <div style={chip}>
            FALLING
            <br />
            FROM ORBIT
          </div>
        </Pop>
      </div>
      <div style={{ position: "absolute", right: 80, top: 1090, fontFamily: FONT }}>
        <Pop at={cue("hook", "giant")}>
          <div style={{ ...chip, background: GOLD, color: "#07090F" }}>
            GIANT
            <br />
            METAL ARMS
          </div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};
const chip: React.CSSProperties = {
  padding: "16px 28px",
  borderRadius: 18,
  background: "rgba(10,14,28,0.92)",
  border: `3px solid ${GOLD}`,
  color: INK,
  fontWeight: 900,
  fontSize: 44,
  letterSpacing: 1,
};

// ---------- scene 2: launch ----------
const Launch: React.FC = () => {
  const t = useT();
  const stackH = 810;
  const rise = ramp(t, 0, 2.6, 900, 0, Easing.out(Easing.cubic));
  const tall = cue("launch", "four");
  const feet = Math.round(ramp(t, tall, tall + 1.1, 0, 407, Easing.out(Easing.cubic)));
  const ruler = ramp(t, tall - 0.3, tall + 0.5);
  const libH = (stackH * 305) / 407;
  return (
    <AbsoluteFill style={{ transform: t < 2.4 ? `translate(${Math.sin(t * 80) * 3}px, 0)` : undefined }}>
      <Safe>
        <Tag>FRI NOV 13 · STARBASE, TEXAS</Tag>
        <div style={{ height: 22 }} />
        <Pop at={0.2}>
          <Big size={92}>THE BIGGEST</Big>
          <Big size={92}>ROCKET EVER BUILT</Big>
        </Pop>
      </Safe>
      {/* stack */}
      <div style={{ position: "absolute", left: 110, top: 570 + rise, width: 190 }}>
        <Ship h={(stackH * 560) / 1320} style={{ display: "block" }} />
        <Booster h={(stackH * 760) / 1320} flameLen={t < 3.4 ? ramp(t, 2.4, 3.4, 260, 0) : 0} />
      </div>
      {/* ruler */}
      <div style={{ position: "absolute", left: 268, top: 570 + stackH * (1 - ruler), width: 6, height: stackH * ruler, background: GOLD }} />
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", left: 250, top: 570 + (i ? stackH - 6 : stackH * (1 - ruler)), width: 42, height: 6, background: GOLD, opacity: ruler }} />
      ))}
      <div style={{ position: "absolute", left: 480, top: 700, fontFamily: FONT, opacity: ruler }}>
        <Big size={190} color={GOLD}>
          {feet}
        </Big>
        <Big size={70}>FEET TALL</Big>
        <div style={{ fontSize: 40, fontWeight: 700, color: MUTE, marginTop: 10 }}>124 meters</div>
      </div>
      {/* comparison */}
      <Pop at={tall + 1.0} style={{ position: "absolute", left: 320, top: 570 + stackH - libH, fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 22, height: libH }}>
          <div style={{ width: 54, height: libH, borderRadius: "27px 27px 0 0", background: "linear-gradient(#5FBFA6,#2E6F63)" }} />
          <div style={{ fontSize: 38, fontWeight: 800, color: "#7FD8C0", lineHeight: 1.15, paddingBottom: 16 }}>
            Statue of
            <br />
            Liberty
            <br />
            <span style={{ color: MUTE }}>305 ft</span>
          </div>
        </div>
      </Pop>
      <div style={{ position: "absolute", left: 80, right: 80, top: 570 + stackH, height: 6, background: "#2C3A63" }} />
    </AbsoluteFill>
  );
};

// ---------- scene 3: orbit ----------
const Stat: React.FC<{ at: number; value: number; label: string; color: string }> = ({ at, value, label, color }) => {
  const t = useT();
  const v = Math.round(ramp(t, at, at + 0.8, 0, value, Easing.out(Easing.cubic)));
  return (
    <Pop at={at} style={{ flex: 1 }}>
      <div style={{ background: "rgba(16,24,48,0.9)", border: `3px solid ${color}`, borderRadius: 28, padding: "22px 28px" }}>
        <Big size={150} color={color}>
          {v}
        </Big>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>{label}</div>
      </div>
    </Pop>
  );
};
const Orbit: React.FC = () => {
  const t = useT();
  const cx = 540;
  const cy = 800;
  const rx = 360;
  const ry = 120;
  const a = t * 3.6;
  const pos = (ang: number) => ({ x: cx + Math.cos(ang) * rx, y: cy + Math.sin(ang) * ry, front: Math.sin(ang) > 0 });
  const ship = pos(a);
  const drop = cue("orbit", "dropped");
  const sats = Array.from({ length: 26 }).map((_, i) => {
    const born = drop + i * 0.045;
    if (t < born) return null;
    const p = pos(a - Math.min((t - born) * 1.2, 0.2 + i * 0.22));
    return { ...p, i };
  });
  const dot = (p: { x: number; y: number }, r: number, c: string, key?: number) => (
    <div key={key} style={{ position: "absolute", left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, borderRadius: r, background: c, boxShadow: `0 0 ${r * 2}px ${c}` }} />
  );
  const layer = (front: boolean) => (
    <>
      {sats.map((s) => (s && s.front === front ? dot(s, 7, "#8FD3FF", s.i) : null))}
      {ship.front === front && dot(ship, 17, GOLD)}
    </>
  );
  return (
    <AbsoluteFill>
      <Safe>
        <Tag>SHIP 42 · IN ORBIT</Tag>
      </Safe>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="#3B4C7E" strokeWidth="4" strokeDasharray="10 14" />
      </svg>
      {layer(false)}
      <div
        style={{
          position: "absolute",
          left: cx - 210,
          top: cy - 210,
          width: 420,
          height: 420,
          borderRadius: 210,
          background: "radial-gradient(circle at 35% 30%, #6FC3FF 0%, #2A6FD6 45%, #0B2A6B 100%)",
          boxShadow: "0 0 90px rgba(80,160,255,0.45)",
          overflow: "hidden",
        }}
      >
        {[
          [60, 110, 150, 90],
          [220, 60, 120, 70],
          [170, 240, 190, 110],
          [30, 290, 90, 60],
        ].map(([x, y, w, h], i) => (
          <div key={i} style={{ position: "absolute", left: ((x + t * 40) % 520) - 100, top: y, width: w, height: h, borderRadius: "50%", background: "#3FAE7A", opacity: 0.85 }} />
        ))}
        <div style={{ position: "absolute", inset: 0, borderRadius: 210, boxShadow: "inset -50px -40px 90px rgba(0,0,20,0.7)" }} />
      </div>
      {layer(true)}
      <div style={{ position: "absolute", left: 80, right: 80, top: 1050, display: "flex", gap: 28, fontFamily: FONT, color: INK }}>
        <Stat at={cue("orbit", "fourteen")} value={14} label="ORBITS OF EARTH" color={GOLD} />
        <Stat at={cue("orbit", "twenty-six")} value={26} label="STARLINK SATELLITES" color="#8FD3FF" />
      </div>
    </AbsoluteFill>
  );
};

// ---------- scene 4: re-entry ----------
const Reentry: React.FC = () => {
  const t = useT();
  const home = cue("reentry", "it");
  const p = ramp(t, home - 0.3, home + 4, 0, 1, Easing.out(Easing.quad));
  const x = 180 + p * 330;
  const y = 700 + p * 330;
  const heat = ramp(t, home, home + 1.2);
  const hrs = Math.round(ramp(t, cue("reentry", "about"), cue("reentry", "about") + 1.0, 0, 22, Easing.out(Easing.cubic)));
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Safe>
        <Tag>SAT NOV 14 · COMING HOME</Tag>
        <div style={{ height: 20 }} />
        <Pop at={0.25}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
            <Big size={210} color={GOLD}>
              ~{hrs}
            </Big>
            <Big size={74}>
              HOURS
              <br />
              IN SPACE
            </Big>
          </div>
        </Pop>
      </Safe>
      {/* atmosphere */}
      <div
        style={{
          position: "absolute",
          left: -400,
          top: 1180,
          width: 1880,
          height: 1880,
          borderRadius: "50%",
          background: "radial-gradient(circle at 50% 0%, #2A6FD6 0%, #0B2A6B 30%, #061535 60%)",
          boxShadow: "0 -30px 120px rgba(90,170,255,0.5)",
        }}
      />
      {/* plasma streaks */}
      {heat > 0 &&
        Array.from({ length: 14 }).map((_, i) => {
          const life = ((f + i * 5) % 22) / 22;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 60 + (random(`px${i}`) - 0.5) * 420 - life * 210,
                top: y + 70 - life * 210 + (random(`py${i}`) - 0.5) * 60,
                width: 150,
                height: 8,
                borderRadius: 8,
                transform: "rotate(45deg)",
                background: `linear-gradient(90deg, transparent, ${i % 2 ? HOT : GOLD})`,
                opacity: heat * (1 - life) * 0.9,
              }}
            />
          );
        })}
      <div style={{ position: "absolute", left: x - 60, top: y - 215, transform: `rotate(-90deg) rotate(${Math.sin(t * 3) * 2}deg)`, filter: `drop-shadow(-${30 * heat}px 0 ${36 * heat}px ${HOT})` }}>
        <Ship h={430} />
      </div>
      <div style={{ position: "absolute", left: x - 250, top: y + 52, width: 500, height: 46 * heat, borderRadius: "0 0 50% 50%", background: `radial-gradient(ellipse at 50% 0%, #FFF3C4, ${HOT} 55%, transparent 75%)`, opacity: 0.95 * heat }} />
      <div style={{ position: "absolute", right: 80, top: 800, fontFamily: FONT }}>
        <Pop at={cue("reentry", "belly")}>
          <div style={chip}>BELLY FIRST ↘</div>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

// ---------- scene 5: the catch ----------
const Step: React.FC<{ n: number; label: string; at: number }> = ({ n, label, at }) => {
  const t = useT();
  const on = t >= at;
  const p = usePop(at);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: on ? 1 : 0.35, transform: `scale(${on ? 0.92 + 0.08 * p : 0.92})`, transformOrigin: "left center" }}>
      <div style={{ width: 62, height: 62, borderRadius: 31, background: on ? GOLD : "#2C3A63", color: "#07090F", fontWeight: 900, fontSize: 38, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {n}
      </div>
      <div style={{ fontSize: 46, fontWeight: 900, color: on ? INK : MUTE }}>{label}</div>
    </div>
  );
};
const Catch: React.FC = () => {
  const t = useT();
  const flip = cue("catch", "flipped");
  const fire = cue("catch", "fired");
  const grab = cue("catch", "settled") + 0.3;
  const shipH = 430;
  const shipW = (shipH * 100) / 560;
  const rot = ramp(t, flip, flip + 0.9, -90, 0, Easing.inOut(Easing.back(1.4)));
  const y = interpolate(t, [0, flip, fire, grab], [-560, -360, -230, 0], { ...clamp, easing: Easing.out(Easing.quad) });
  const grip = ramp(t, grab - 0.5, grab, 0, 1, Easing.in(Easing.quad));
  const burning = t > fire - 0.1 && t < grab + 0.3;
  return (
    <AbsoluteFill style={{ transform: shake(t, grab) }}>
      <Tower height={1150} armY={200} grip={grip} shipW={shipW} />
      <div style={{ position: "absolute", left: 540 - (shipH * 160) / 560 / 2, top: 770 + 200 - shipH * 0.31 + y, transform: `rotate(${rot}deg)`, transformOrigin: "50% 50%" }}>
        <Ship h={shipH} flames={burning ? 3 : 0} flameLen={ramp(t, grab - 0.3, grab + 0.3, 210, 20)} />
      </div>
      <Ring at={grab} x={540} y={985} />
      <Safe>
        <Tag>THE CATCH</Tag>
        <div style={{ height: 26 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Step n={1} label="FLIP UPRIGHT" at={flip} />
          <Step n={2} label="FIRE 3 ENGINES" at={fire} />
          <Step n={3} label="ARMS CLOSE" at={grab - 0.4} />
        </div>
      </Safe>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1238, textAlign: "center", fontFamily: FONT }}>
        <Pop at={grab + 0.05}>
          <Big size={150} color={GOLD} style={{ textShadow: "0 8px 0 #07090F" }}>
            CAUGHT.
          </Big>
        </Pop>
      </div>
    </AbsoluteFill>
  );
};

// ---------- scene 6: first ----------
const Strike: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => {
  const t = useT();
  const s = ramp(t, at + 0.55, at + 0.85);
  return (
    <Pop at={at} style={{ alignSelf: "flex-start", position: "relative" }}>
      <Big size={96} color={s > 0.5 ? MUTE : INK}>
        {children}
      </Big>
      <div style={{ position: "absolute", left: -10, top: "48%", height: 12, width: `calc(${s * 100}% + ${s * 20}px)`, background: BAD, borderRadius: 6 }} />
    </Pop>
  );
};
const First: React.FC = () => {
  const t = useT();
  const at = cue("first", "a");
  const p = usePop(at, 9);
  return (
    <AbsoluteFill style={{ transform: shake(t, at, 16) }}>
      <Safe>
        <div style={{ height: 60 }} />
        <Strike at={cue("first", "no")}>NO LANDING LEGS</Strike>
        <div style={{ height: 44 }} />
        <Strike at={cue("first", "no", 1)}>NO SPLASHDOWN</Strike>
        <div style={{ height: 90 }} />
        <div style={{ opacity: Math.min(1, p * 2), transform: `scale(${interpolate(p, [0, 1], [2.2, 1])})`, transformOrigin: "left center" }}>
          <Big size={210} color={GOLD}>
            A FIRST
          </Big>
          <Big size={130}>IN HISTORY</Big>
        </div>
        <Pop at={at + 0.6}>
          <div style={{ marginTop: 34, fontSize: 42, fontWeight: 700, color: MUTE, lineHeight: 1.25 }}>
            First upper stage ever caught
            <br />
            after returning from orbit
          </div>
        </Pop>
      </Safe>
      <Ring at={at} x={300} y={900} />
    </AbsoluteFill>
  );
};

// ---------- scene 7: caveats ----------
const Row: React.FC<{ at: number; mark: string; color: string; title: string; sub: string }> = ({ at, mark, color, title, sub }) => (
  <Pop at={at}>
    <div style={{ display: "flex", alignItems: "center", gap: 28, background: "rgba(16,24,48,0.9)", borderRadius: 28, padding: "26px 30px", borderLeft: `12px solid ${color}` }}>
      <div style={{ width: 92, height: 92, borderRadius: 46, background: color, color: "#07090F", fontSize: 58, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {mark}
      </div>
      <div>
        <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.05 }}>{title}</div>
        <div style={{ fontSize: 38, fontWeight: 700, color, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  </Pop>
);
const Caveat: React.FC = () => (
  <AbsoluteFill>
    <Safe>
      <Tag color={BAD}>REALITY CHECK</Tag>
      <div style={{ height: 22 }} />
      <Pop at={0.2}>
        <Big size={118}>IT WASN’T</Big>
        <Big size={118} color={BAD}>
          PERFECT
        </Big>
      </Pop>
      <div style={{ height: 40 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Row at={0.9} mark="✓" color={GOOD} title="Ship 42" sub="CAUGHT" />
        <Row at={cue("caveat", "booster")} mark="✕" color={BAD} title="Booster" sub="LOST OVER THE GULF" />
        <Row at={cue("caveat", "double")} mark="…" color={GOLD} title="Double catch" sub="STILL TO COME" />
        <Row at={cue("caveat", "and")} mark="…" color={GOLD} title="Flying a ship twice" sub="NOT YET" />
      </div>
    </Safe>
  </AbsoluteFill>
);

// ---------- scene 8: why it matters ----------
const Why: React.FC = () => {
  const t = useT();
  const cx = 540;
  const cy = 860;
  const R = 250;
  const nodes = [
    { label: "LAUNCH", at: 0.5 },
    { label: "CATCH", at: cue("why", "catch") },
    { label: "REFUEL", at: cue("why", "refuel") },
    { label: "FLY AGAIN", at: cue("why", "fly") },
  ];
  const loopStart = cue("why", "fly");
  const ang = -Math.PI / 2 + ramp(t, 0.5, loopStart, 0, Math.PI * 1.5) + Math.max(0, t - loopStart) * 2.6;
  const drawn = ramp(t, 0.4, loopStart + 0.5);
  const plan = cue("why", "that's");
  return (
    <AbsoluteFill>
      <Safe>
        <Tag>WHY IT MATTERS</Tag>
        <div style={{ height: 20 }} />
        <Pop at={0.2}>
          <Big size={88}>
            CATCH IT. <span style={{ color: GOLD }}>REUSE IT.</span>
          </Big>
        </Pop>
      </Safe>
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2C3A63" strokeWidth="10" />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={GOLD} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${drawn * 2 * Math.PI * R} 9999`} transform={`rotate(-90 ${cx} ${cy})`} />
      </svg>
      {nodes.map((n, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        const on = t >= n.at;
        return (
          <div key={i} style={{ position: "absolute", left: cx + Math.cos(a) * R - 150, top: cy + Math.sin(a) * R - 42, width: 300, display: "flex", justifyContent: "center", fontFamily: FONT }}>
            <Pop at={n.at} from={0}>
              <div style={{ padding: "14px 26px", borderRadius: 999, background: on ? GOLD : "#2C3A63", color: "#07090F", fontWeight: 900, fontSize: 40, whiteSpace: "nowrap" }}>{n.label}</div>
            </Pop>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: cx + Math.cos(ang) * R * 0.62 - 21, top: cy + Math.sin(ang) * R * 0.62 - 75, transform: `rotate(${(ang * 180) / Math.PI + 180}deg)` }}>
        <Ship h={150} flames={1} flameLen={90} />
      </div>
      <div style={{ position: "absolute", left: 80, right: 80, top: 1175, display: "flex", justifyContent: "center", gap: 70, fontFamily: FONT, color: INK }}>
        {[
          { name: "MOON", at: cue("why", "moon"), bg: "radial-gradient(circle at 35% 30%, #F4F6FB, #9AA5BA 70%, #5E6880)" },
          { name: "MARS", at: cue("why", "mars"), bg: "radial-gradient(circle at 35% 30%, #FFB07A, #D2552B 65%, #7C2A14)" },
        ].map((b) => (
          <Pop key={b.name} at={Math.max(plan, b.at)}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ width: 130, height: 130, borderRadius: 65, background: b.bg, boxShadow: "inset -18px -14px 30px rgba(0,0,0,0.45)" }} />
              <Big size={66}>{b.name}</Big>
            </div>
          </Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------- scene 9: quote + CTA ----------
const Quote: React.FC = () => {
  const t = useT();
  const follow = cue("quote", "follow");
  const pulse = 1 + 0.04 * Math.sin(Math.max(0, t - follow) * 7);
  return (
    <AbsoluteFill>
      <Safe>
        <div style={{ height: 40 }} />
        <Pop at={0.1}>
          <div style={{ fontSize: 260, fontWeight: 900, color: GOLD, lineHeight: 0.6, height: 130 }}>“</div>
        </Pop>
        <Pop at={cue("quote", "almost") - 0.3}>
          <Big size={150}>It was</Big>
          <Big size={150} color={GOLD}>
            almost magic.
          </Big>
        </Pop>
        <Pop at={cue("quote", "almost") + 0.5}>
          <div style={{ marginTop: 36, fontSize: 46, fontWeight: 800 }}>Jared Isaacman</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: MUTE }}>NASA Administrator, on X</div>
        </Pop>
        <div style={{ flex: 1 }} />
        <Pop at={follow} style={{ alignSelf: "center" }}>
          <div style={{ transform: `scale(${pulse})`, padding: "26px 60px", borderRadius: 999, background: HOT, color: "#07090F", fontSize: 62, fontWeight: 900 }}>FOLLOW FOR MORE</div>
        </Pop>
        <Pop at={follow + 0.4} style={{ alignSelf: "center" }}>
          <div style={{ marginTop: 26, fontSize: 30, fontWeight: 600, color: MUTE }}>Sources: AP, SpaceX · as of Nov 16, 2026</div>
        </Pop>
      </Safe>
    </AbsoluteFill>
  );
};

// ---------- captions ----------
type Word = Line["words"][number];
const CHUNKS: Word[][] = [];
for (const l of LINES) {
  let cur: Word[] = [];
  for (const w of l.words) {
    cur.push(w);
    const len = cur.map((x) => x.w).join(" ").length;
    if (/[.,]$/.test(w.w) || cur.length >= 4 || len > 20) {
      CHUNKS.push(cur);
      cur = [];
    }
  }
  if (cur.length) CHUNKS.push(cur);
}
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const chunk = CHUNKS.find((c, i) => t >= c[0].s - 0.05 && t < (CHUNKS[i + 1]?.[0].s ?? Infinity) - 0.05 && t < c[c.length - 1].e + 0.5);
  if (!chunk) return null;
  const pop = spring({ frame: frame - (chunk[0].s - 0.05) * FPS, fps: FPS, config: { damping: 14, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1395, height: 170, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <div
        style={{
          transform: `scale(${0.85 + 0.15 * pop})`,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "0 18px",
          padding: "14px 30px",
          borderRadius: 24,
          background: "rgba(4,6,13,0.78)",
          fontSize: 62,
          fontWeight: 900,
          lineHeight: 1.12,
          textTransform: "uppercase",
        }}
      >
        {chunk.map((w, i) => (
          <span key={i} style={{ color: t >= w.s - 0.03 ? (t < w.e ? GOLD : INK) : "rgba(244,246,251,0.45)" }}>
            {w.w}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------- root ----------
const SCENES: Record<string, React.FC> = {
  hook: Hook,
  launch: Launch,
  orbit: Orbit,
  reentry: Reentry,
  catch: Catch,
  first: First,
  caveat: Caveat,
  why: Why,
  quote: Quote,
};
const SceneFade: React.FC<{ dur: number; last: boolean; children: React.ReactNode }> = ({ dur, last, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 5, dur - 5, dur], [0, 1, 1, last ? 1 : 0], clamp);
  const s = interpolate(f, [0, 8], [1.06, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${s})` }}>{children}</AbsoluteFill>;
};

export const Reel: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#04060D" }}>
      <Stars />
      {LINES.map((l, i) => {
        const from = Math.round(sceneStart(i) * FPS);
        const dur = Math.round(sceneEnd(i) * FPS) - from;
        const C = SCENES[l.id];
        return (
          <Sequence key={l.id} from={from} durationInFrames={dur}>
            <SceneFade dur={dur} last={i === LINES.length - 1}>
              <C />
            </SceneFade>
          </Sequence>
        );
      })}
      <Captions />
      {/* progress bar */}
      <div style={{ position: "absolute", left: 0, top: 0, height: 8, width: `${(frame / TOTAL_FRAMES) * 100}%`, background: HOT }} />
      <Audio src={staticFile("audio.wav")} />
    </AbsoluteFill>
  );
};
