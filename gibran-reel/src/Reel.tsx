import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const BG = "#0B1220";
const INK = "#F5EFE3";
const RED = "#E63946";
const GOLD = "#F4B942";
const MUTE = "#8FA0BF";
const FONT = "Inter, 'Inter Display', sans-serif";

// Safe zone: 250px top, 350px bottom, 80px sides
const Safe: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{ padding: "250px 80px 350px 80px", fontFamily: FONT, color: INK }}
  >
    {children}
  </AbsoluteFill>
);

const usePop = (delay: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};

const Pop: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const p = usePop(delay);
  return (
    <div
      style={{
        opacity: interpolate(p, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Scene wrapper: fade in/out
const Scene: React.FC<{
  from: number;
  duration: number;
  children: React.ReactNode;
}> = ({ from, duration, children }) => (
  <Sequence from={from} durationInFrames={duration} layout="none">
    <SceneInner duration={duration}>{children}</SceneInner>
  </Sequence>
);
const SceneInner: React.FC<{ duration: number; children: React.ReactNode }> = ({
  duration,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 6, duration - 8, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

const Tag: React.FC<{ children: React.ReactNode; color?: string }> = ({
  children,
  color = RED,
}) => (
  <div
    style={{
      display: "inline-block",
      alignSelf: "flex-start",
      padding: "12px 26px",
      borderRadius: 999,
      background: color,
      color: color === GOLD ? BG : "#fff",
      fontWeight: 800,
      fontSize: 38,
      letterSpacing: 2,
    }}
  >
    {children}
  </div>
);

const Headline: React.FC<{ words: string[]; hi?: number[]; size?: number; delay?: number }> = ({
  words,
  hi = [],
  size = 120,
  delay = 0,
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: `0 ${size * 0.22}px`,
      fontSize: size,
      lineHeight: 1.02,
      fontWeight: 900,
      letterSpacing: -3,
    }}
  >
    {words.map((w, i) => (
      <Pop key={i} delay={delay + i * 3} style={{ color: hi.includes(i) ? GOLD : INK }}>
        {w}
      </Pop>
    ))}
  </div>
);

const Body: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <Pop delay={delay} style={{ fontSize: 52, lineHeight: 1.3, color: "#D6DCE8", fontWeight: 500 }}>
    {children}
  </Pop>
);

// Top progress stepper for the 3 gates
const Stepper: React.FC<{ active: number }> = ({ active }) => {
  const labels = ["DPR", "MK", "MPR"];
  return (
    <div style={{ display: "flex", gap: 16, marginBottom: 56 }}>
      {labels.map((l, i) => {
        const on = i + 1 === active;
        const done = i + 1 < active;
        return (
          <div
            key={l}
            style={{
              flex: 1,
              padding: "18px 0",
              textAlign: "center",
              borderRadius: 20,
              fontSize: 42,
              fontWeight: 800,
              background: on ? RED : done ? "#1E2B45" : "transparent",
              border: `3px solid ${on ? RED : "#2B3A5C"}`,
              color: on ? "#fff" : done ? GOLD : MUTE,
            }}
          >
            {done ? "✓ " : ""}
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Stat: React.FC<{ big: string; small: string; delay: number }> = ({ big, small, delay }) => (
  <Pop
    delay={delay}
    style={{
      flex: 1,
      background: "#141F36",
      border: "3px solid #2B3A5C",
      borderRadius: 28,
      padding: "34px 30px",
    }}
  >
    <div style={{ fontSize: 110, fontWeight: 900, color: GOLD, letterSpacing: -3, lineHeight: 1 }}>
      {big}
    </div>
    <div style={{ fontSize: 40, color: "#D6DCE8", marginTop: 14, lineHeight: 1.25, fontWeight: 600 }}>
      {small}
    </div>
  </Pop>
);

const Source: React.FC<{ children: string }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      bottom: 380,
      fontSize: 30,
      color: MUTE,
      fontWeight: 500,
    }}
  >
    {children}
  </div>
);

// ---------- Scenes ----------
const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 6) * 0.03;
  return (
    <Safe>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", gap: 44 }}>
        <Pop><Tag>EXPLAINER</Tag></Pop>
        <Headline words={["Kalau", "Gibran", "dimakzulkan,", "apa", "yang", "terjadi?"]} hi={[1, 2]} size={132} delay={6} />
        <Pop delay={34} style={{ fontSize: 50, color: MUTE, fontWeight: 600, transform: `scale(${pulse})`, transformOrigin: "left" }}>
          Jawabannya ada di 3 pintu konstitusi ↓
        </Pop>
      </div>
    </Safe>
  );
};

const Context: React.FC = () => (
  <Safe>
    <div style={{ display: "flex", flexDirection: "column", gap: 40, height: "100%", justifyContent: "center" }}>
      <Pop><Tag color={GOLD}>LATAR</Tag></Pop>
      <Headline words={["Wacananya", "sudah", "bergulir", "sejak", "2025"]} hi={[4]} size={108} delay={4} />
      <Body delay={24}>
        Forum Purnawirawan TNI mengirim surat ke DPR dan MPR yang meminta Gibran dimakzulkan.
      </Body>
      <Pop
        delay={50}
        style={{
          background: "#141F36",
          borderLeft: `10px solid ${RED}`,
          borderRadius: 16,
          padding: "30px 34px",
          fontSize: 44,
          lineHeight: 1.3,
          fontWeight: 700,
        }}
      >
        Status: sebatas usulan. Belum ada proses resmi di DPR yang kami temukan.
      </Pop>
    </div>
  </Safe>
);

const GateDPR: React.FC = () => (
  <Safe>
    <Stepper active={1} />
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      <Pop><div style={{ fontSize: 40, color: RED, fontWeight: 800, letterSpacing: 4 }}>PINTU 1</div></Pop>
      <Headline words={["DPR", "harus", "setuju", "dulu"]} hi={[0]} size={124} delay={4} />
      <Body delay={22}>Usul pemakzulan dimulai dari DPR. Syarat suara paling berat:</Body>
      <div style={{ display: "flex", gap: 24 }}>
        <Stat big="⅔" small="anggota DPR harus hadir" delay={36} />
        <Stat big="⅔" small="dari yang hadir harus setuju" delay={44} />
      </div>
      <Body delay={56}>Dari 580 kursi, minimal ±387 anggota harus hadir di sidang.</Body>
    </div>
    <Source>Sumber: UUD 1945 Pasal 7B ayat (3)</Source>
  </Safe>
);

const GateMK: React.FC = () => (
  <Safe>
    <Stepper active={2} />
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      <Pop><div style={{ fontSize: 40, color: RED, fontWeight: 800, letterSpacing: 4 }}>PINTU 2</div></Pop>
      <Headline words={["MK", "menguji", "alasan", "hukumnya"]} hi={[0]} size={118} delay={4} />
      <Body delay={22}>Pemakzulan tidak bisa karena beda politik. Harus ada pelanggaran, misalnya:</Body>
      {["Pengkhianatan terhadap negara", "Korupsi atau penyuapan", "Perbuatan tercela", "Tak lagi memenuhi syarat"].map(
        (t, i) => (
          <Pop key={t} delay={34 + i * 7} style={{ fontSize: 48, fontWeight: 700, display: "flex", gap: 20 }}>
            <span style={{ color: GOLD }}>●</span>
            {t}
          </Pop>
        )
      )}
      <Pop delay={70} style={{ fontSize: 44, color: MUTE, fontWeight: 600 }}>
        MK punya waktu maksimal 90 hari untuk memutus.
      </Pop>
    </div>
    <Source>Sumber: UUD 1945 Pasal 7A dan 7B ayat (4)</Source>
  </Safe>
);

const GateMPR: React.FC = () => (
  <Safe>
    <Stepper active={3} />
    <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
      <Pop><div style={{ fontSize: 40, color: RED, fontWeight: 800, letterSpacing: 4 }}>PINTU 3</div></Pop>
      <Headline words={["MPR", "ketok", "palu", "terakhir"]} hi={[0]} size={124} delay={4} />
      <Body delay={22}>Kalau MK menyatakan terbukti, MPR menggelar sidang paripurna:</Body>
      <div style={{ display: "flex", gap: 24 }}>
        <Stat big="¾" small="anggota MPR harus hadir" delay={36} />
        <Stat big="⅔" small="dari yang hadir harus setuju" delay={44} />
      </div>
      <Body delay={58}>Sebelum voting, Wapres boleh membela diri di sidang.</Body>
    </div>
    <Source>Sumber: UUD 1945 Pasal 7B ayat (6) dan (7)</Source>
  </Safe>
);

const Aftermath: React.FC = () => (
  <Safe>
    <div style={{ display: "flex", flexDirection: "column", gap: 38, height: "100%", justifyContent: "center" }}>
      <Pop><Tag>KALAU LOLOS</Tag></Pop>
      <Headline words={["Kursi", "Wapres", "kosong"]} hi={[2]} size={124} delay={4} />
      <Body delay={22}>Prabowo tetap Presiden. Yang berubah hanya posisi Wakil Presiden.</Body>
      {[
        ["1", "Presiden mengusulkan 2 calon Wapres"],
        ["2", "MPR memilih salah satunya"],
        ["3", "Batas waktu: 60 hari"],
      ].map(([n, t], i) => (
        <Pop
          key={n}
          delay={40 + i * 10}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            background: "#141F36",
            borderRadius: 24,
            padding: "26px 32px",
            fontSize: 46,
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 999,
              background: GOLD,
              color: BG,
              fontSize: 46,
              fontWeight: 900,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {n}
          </div>
          {t}
        </Pop>
      ))}
    </div>
    <Source>Sumber: UUD 1945 Pasal 8 ayat (2)</Source>
  </Safe>
);

const Reality: React.FC = () => (
  <Safe>
    <div style={{ display: "flex", flexDirection: "column", gap: 40, height: "100%", justifyContent: "center" }}>
      <Pop><Tag color={GOLD}>REALITANYA</Tag></Pop>
      <Headline words={["Jalurnya", "ada,", "tapi", "terjal"]} hi={[3]} size={124} delay={4} />
      <Body delay={24}>
        Tiga pintu, dua kali suara ⅔, dan satu putusan hukum. Tanpa dukungan lintas fraksi besar, prosesnya berhenti di DPR.
      </Body>
      <Pop delay={52} style={{ fontSize: 46, color: MUTE, fontWeight: 600, lineHeight: 1.3 }}>
        Ini penjelasan prosedur, bukan dukungan atau penolakan terhadap siapa pun.
      </Pop>
    </div>
  </Safe>
);

const Outro: React.FC = () => (
  <Safe>
    <div style={{ display: "flex", flexDirection: "column", gap: 40, height: "100%", justifyContent: "center" }}>
      <Headline words={["DPR", "→", "MK", "→", "MPR"]} hi={[0, 2, 4]} size={140} delay={2} />
      <Body delay={22}>Itu urutan resminya. Simpan reel ini biar nggak salah paham saat isu ini naik lagi.</Body>
      <Pop delay={40}><Tag>FOLLOW UNTUK PENJELASAN BERIKUTNYA</Tag></Pop>
    </div>
  </Safe>
);

// ---------- Root ----------
const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${30 + Math.sin(frame / 90) * 15}% ${20 + Math.cos(frame / 110) * 8}%, rgba(230,57,70,0.22), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(800px 800px at 85% 85%, rgba(244,185,66,0.10), transparent 60%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 80, right: 80, top: 190, height: 8, background: "#1E2B45", borderRadius: 4 }}>
      <div style={{ width: `${(frame / durationInFrames) * 100}%`, height: "100%", background: RED, borderRadius: 4 }} />
    </div>
  );
};

export const Reel: React.FC = () => (
  <AbsoluteFill>
    <Backdrop />
    <ProgressBar />
    <Scene from={0} duration={120}><Hook /></Scene>
    <Scene from={120} duration={180}><Context /></Scene>
    <Scene from={300} duration={180}><GateDPR /></Scene>
    <Scene from={480} duration={150}><GateMK /></Scene>
    <Scene from={630} duration={180}><GateMPR /></Scene>
    <Scene from={810} duration={180}><Aftermath /></Scene>
    <Scene from={990} duration={150}><Reality /></Scene>
    <Scene from={1140} duration={150}><Outro /></Scene>
    <Audio src={staticFile("audio.wav")} />
  </AbsoluteFill>
);
