"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as sfx from "@/lib/sfx";
import { WalletConnect } from "@/components/WalletConnect";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ALL_BADGES = [
  "astro_balls", "zoom_in_vibe_out", "showtime", "flow_state",
  "vibestr_bronze_tier", "checkmate", "vibefoot_fan_club", "suited_up",
  "astro_bean", "gud_meat", "hoodie_up_society", "twenty_badges",
  "yin_n_yang", "vibestr_pink_tier", "party_in_the_back",
  "unfathomable_vibes", "gradient_hatrick", "one_of_one",
  "fifty_badges", "cosmic_guardian", "super_rare", "pothead",
  "elite_rainbow_ranger", "anchorman", "rainbow_visor",
];

const ARCHETYPES = [
  "The Cosmic Drifter", "The Neon Prophet", "The Vibe Architect",
  "The Golden Wanderer", "The Drift King", "The Frequency Holder",
  "The Stellar Nomad", "The Radiant Sage", "The Vibe Curator",
  "The Etheric Rebel", "The Sound Alchemist", "The Neon Mystic",
  "The Light Chaser", "The Groove Oracle", "The Vibe Sovereign",
  "The Chromatic Shaman", "The Signal Rider", "The Vibe Phantom",
  "The Astral Cowboy", "The Frequency Mage",
];

const QUOTES = [
  "Tuned to frequencies others can't hear.",
  "The vibe doesn't lie.",
  "Every pixel carries a story.",
  "Born in the blockchain, raised by the beat.",
  "Rare by nature. Legendary by choice.",
  "The universe assigned this energy.",
  "Vibes travel at the speed of light.",
  "Not all treasure is silver and gold.",
  "The chain knows what the eye can't see.",
  "Frequency: locked. Vibe: immaculate.",
  "Some are minted, some are chosen.",
  "The future belongs to the curious.",
  "Running on pure good energy since genesis.",
  "Calibrated for maximum vibe output.",
  "The shaka is eternal.",
];

// ─── SEEDED RNG ───────────────────────────────────────────────────────────────

function seededRNG(seed: number) {
  let s = ((seed * 1664525) + 1013904223) >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tier = "Common" | "Rare" | "Legendary";

interface CardData {
  rarity: number; drip: number; energy: number; aura: number;
  tier: Tier; rank: number; archetype: string; quote: string; badges: string[];
}

// ─── CARD DATA ────────────────────────────────────────────────────────────────

function generateCardData(id: number): CardData {
  const rng    = seededRNG(id);
  const rarity = 29 + Math.floor(rng() * 71);
  const drip   = 19 + Math.floor(rng() * 81);
  const energy = 19 + Math.floor(rng() * 81);
  const aura   = 19 + Math.floor(rng() * 81);
  const tier: Tier = rarity >= 90 ? "Legendary" : rarity >= 70 ? "Rare" : "Common";
  const total  = rarity + drip + energy + aura;
  const rank   = Math.max(1, Math.round(((396 - total) / (396 - 86)) * 6967) + 1);
  const archetype = ARCHETYPES[Math.floor(rng() * ARCHETYPES.length)];
  const quote     = QUOTES[Math.floor(rng() * QUOTES.length)];
  const badgeCount = tier === "Legendary" ? 5 : tier === "Rare" ? 4 : 3;
  const pool = [...ALL_BADGES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { rarity, drip, energy, aura, tier, rank, archetype, quote, badges: pool.slice(0, badgeCount) };
}

// ─── TIER THEME ───────────────────────────────────────────────────────────────

const TIER_BORDER: Record<Tier, string> = {
  Common: "#FFE048", Rare: "#A855F7", Legendary: "#FFE048",
};
const TIER_LABEL_COLOR: Record<Tier, string> = {
  Common: "#FFE048", Rare: "#A855F7", Legendary: "#FF5F1F",
};
const TIER_GLOW: Record<Tier, string> = {
  Common:    "0 0 22px rgba(255,224,72,0.35), 0 0 44px rgba(255,224,72,0.12)",
  Rare:      "0 0 22px rgba(168,85,247,0.50), 0 0 44px rgba(168,85,247,0.18)",
  Legendary: "0 0 32px rgba(255,224,72,0.70), 0 0 64px rgba(255,95,31,0.35), 0 0 100px rgba(255,224,72,0.12)",
};

// ─── RESPONSIVE CARD SIZE ─────────────────────────────────────────────────────

const DESIGN_W = 400;
const DESIGN_H = 560;

function useCardSize() {
  const [cardW, setCardW] = useState(() =>
    typeof window === "undefined" ? DESIGN_W : Math.min(DESIGN_W, window.innerWidth - 40)
  );
  useEffect(() => {
    const update = () => setCardW(Math.min(DESIGN_W, window.innerWidth - 40));
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return { cardW, cardH: Math.round(cardW * DESIGN_H / DESIGN_W), scale: cardW / DESIGN_W };
}

// ─── FALLBACK ART ─────────────────────────────────────────────────────────────

const PALETTES = [
  ["#C084FC", "#6366F1", "#FFE048"],   // purple/indigo/gold
  ["#A855F7", "#EC4899", "#FF5F1F"],   // purple/pink/orange
  ["#3B82F6", "#6366F1", "#C084FC"],   // blue/indigo/purple
  ["#FF5F1F", "#FFE048", "#C084FC"],   // orange/gold/purple
  ["#06B6D4", "#3B82F6", "#A855F7"],   // cyan/blue/purple
  ["#FFE048", "#FF7A00", "#A855F7"],   // gold/amber/purple
];

function FallbackArt({ id }: { id: number }) {
  const rng     = seededRNG(id * 3571 + 13);
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
  const blobs = Array.from({ length: 9 }, () => ({
    cx: Math.floor(rng() * 110) - 5,
    cy: Math.floor(rng() * 150) - 5,
    rx: 18 + Math.floor(rng() * 38),
    ry: 14 + Math.floor(rng() * 32),
    color: palette[Math.floor(rng() * palette.length)],
    op: 0.22 + rng() * 0.48,
  }));
  const uid = `fa-${id}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 100 140"
    >
      <defs>
        {blobs.map((b, i) => (
          <radialGradient key={i} id={`${uid}-g${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={b.color} stopOpacity={b.op} />
            <stop offset="100%" stopColor={b.color} stopOpacity="0" />
          </radialGradient>
        ))}
        <filter id={`${uid}-blur`}><feGaussianBlur stdDeviation="3" /></filter>
      </defs>
      {/* Rich deep base */}
      <rect width="100" height="140" fill="#05040f" />
      {/* Saturated colour blobs — no grid, pure abstract art */}
      {blobs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry}
          fill={`url(#${uid}-g${i})`} filter={`url(#${uid}-blur)`} />
      ))}
      {/* Ghost token number — purely decorative, very faint */}
      <text x="50" y="70" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.04)" fontSize="18" fontFamily="serif" fontWeight="900" letterSpacing="4">
        #{id}
      </text>
    </svg>
  );
}

// ─── TIER BURST (one-shot particles on card reveal) ───────────────────────────

function TierBurst({ tier, id }: { tier: Tier; id: number }) {
  const rng = seededRNG(id * 4321 + 99);
  const colorMap = {
    Common:    ["#FFE048", "#FFF3A0", "#FFD700"],
    Rare:      ["#A855F7", "#C084FC", "#7C3AED"],
    Legendary: ["#FF7A00", "#FFE048", "#FF5F1F"],
  };
  const colors = colorMap[tier];
  const count = { Common: 16, Rare: 22, Legendary: 28 }[tier];

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + rng() * 22;
    const dist  = 80 + rng() * 130;
    const rad   = angle * Math.PI / 180;
    return {
      tx:    Math.cos(rad) * dist,
      ty:    Math.sin(rad) * dist,
      size:  3 + Math.floor(rng() * 7),
      color: colors[Math.floor(rng() * colors.length)],
      delay: rng() * 0.25,
      dur:   0.8 + rng() * 0.7,
    };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 20 }}>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", left: "50%", top: "45%",
            width: p.size, height: p.size,
            marginLeft: -p.size / 2, marginTop: -p.size / 2,
            borderRadius: "50%", background: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}90`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0 }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.23, 1, 0.32, 1] }}
        />
      ))}
    </div>
  );
}

// ─── TIER AURA (ongoing effects) ──────────────────────────────────────────────

const AURA_LEFT = ["8%","20%","35%","50%","65%","80%","92%","14%","58%","78%"];
const AURA_DELAY = ["0s","1.1s","2.2s","0.5s","1.7s","2.9s","0.8s","2.0s","1.4s","0.2s"];

function TierAura({ tier }: { tier: Tier }) {
  if (tier === "Common") return null;
  const cls = tier === "Legendary" ? "lgd-ember" : "rare-spark";
  const count = tier === "Legendary" ? 10 : 7;
  return (
    <div style={{ position: "absolute", inset: -30, pointerEvents: "none", overflow: "visible", zIndex: 2 }}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cls}
          style={{
            position: "absolute",
            left: AURA_LEFT[i % AURA_LEFT.length],
            bottom: `${(i * 13) % 40}%`,
            animationDelay: AURA_DELAY[i % AURA_DELAY.length],
          }}
        />
      ))}
    </div>
  );
}

// ─── BACKGROUND ORBS ─────────────────────────────────────────────────────────

const ORB_DEFS = [
  { x: "12%", y: "20%", size: 420, color: "rgba(255,224,72,0.05)",  delay: 0,  dur: 24 },
  { x: "82%", y: "55%", size: 480, color: "rgba(255,95,31,0.04)",   delay: 8,  dur: 30 },
  { x: "46%", y: "85%", size: 560, color: "rgba(255,224,72,0.038)", delay: 3,  dur: 36 },
  { x: "90%", y: "8%",  size: 300, color: "rgba(168,85,247,0.03)",  delay: 15, dur: 20 },
  { x: "5%",  y: "68%", size: 380, color: "rgba(255,224,72,0.032)", delay: 6,  dur: 27 },
];

function BackgroundOrbs() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {ORB_DEFS.map((orb, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute", left: orb.x, top: orb.y,
            width: orb.size, height: orb.size, borderRadius: "50%",
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: "blur(55px)", x: "-50%", y: "-50%",
          }}
          animate={{ x: ["−50%", "-50%"], translateX: [0, 28, -18, 12, 0], translateY: [0, -22, 16, -9, 0] }}
          transition={{ duration: orb.dur, delay: orb.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── WATERMARK ────────────────────────────────────────────────────────────────

function Watermark() {
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
    }}>
      <p style={{
        fontFamily: "var(--font-brice)",
        fontSize: "clamp(52px, 16vw, 150px)",
        fontWeight: 900, color: "rgba(255,224,72,0.022)",
        textTransform: "uppercase", letterSpacing: "0.14em",
        whiteSpace: "nowrap", transform: "rotate(-14deg)",
        userSelect: "none", margin: 0,
      }}>
        GOOD VIBES CLUB
      </p>
    </div>
  );
}

// ─── VIBE CARD ────────────────────────────────────────────────────────────────

interface VibeCardProps {
  id: number;
  data: CardData;
  frontRef: React.RefObject<HTMLDivElement>;
  onFirstReveal?: () => void;
}

function VibeCard({ id, data, frontRef, onFirstReveal }: VibeCardProps) {
  const { cardW, cardH, scale } = useCardSize();
  const [flipped,  setFlipped]  = useState(false);
  const [tilt,     setTilt]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [holo,     setHolo]     = useState({ x: 50, y: 50 });
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const drag = useRef({ sx: 0, sy: 0, tx: 0, ty: 0, moved: false, down: false });

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, tx: tilt.x, ty: tilt.y, moved: false, down: true };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    const r = e.currentTarget.getBoundingClientRect();
    setHolo({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    setTilt({
      x: Math.max(-20, Math.min(20, drag.current.tx - dy * 0.2)),
      y: Math.max(-30, Math.min(30, drag.current.ty + dx * 0.35)),
    });
  };
  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    setDragging(false);
    if (!drag.current.moved) { sfx.flip(); setFlipped(f => !f); }
    setTilt({ x: 0, y: 0 });
  };

  const { rarity, drip, energy, aura, tier, rank, archetype, quote, badges } = data;
  const isLegendary = tier === "Legendary";
  const totalRotY   = (flipped ? 180 : 0) + tilt.y;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Card + aura wrapper */}
      <div style={{ position: "relative" }}>
        <TierAura tier={tier} />

        {/* Perspective container — matches scaled card dimensions */}
        <div className="perspective-wrap" style={{ width: cardW, height: cardH, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          {/* 3-D rotator at full design size, scaled to fit */}
          <div
            className="card-rotator"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            style={{
              width: DESIGN_W, height: DESIGN_H,
              position: "relative",
              transformOrigin: "center center",
              transform: `scale(${scale}) rotateX(${tilt.x}deg) rotateY(${totalRotY}deg)`,
              transition: dragging ? "none" : "transform 0.6s cubic-bezier(0.175,0.885,0.32,1.275)",
              cursor: dragging ? "grabbing" : "grab",
              userSelect: "none",
              touchAction: "none",
              willChange: "transform",
            }}
          >
            {/* ── FRONT ── */}
            <div
              ref={frontRef}
              className="card-face"
              style={{
                position: "absolute", inset: 0, borderRadius: 16,
                overflow: "hidden", background: "#050505",
                border: `2px solid ${TIER_BORDER[tier]}`,
                boxShadow: TIER_GLOW[tier],
                animation: isLegendary ? "legendary-glow 2.4s ease-in-out infinite" : undefined,
                transform: "translateZ(0.01px)",
              }}
            >
              {/* Portrait / fallback */}
              <div style={{ position: "absolute", inset: 0 }}>
                {imgState === "loading" && (
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(135deg,#151510 0%,#0d0d16 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div className="gvc-spinner" />
                  </div>
                )}
                {imgState === "error" && <FallbackArt id={id} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/portrait/${id}`}
                  alt={`GVC #${id}`}
                  style={{
                    position: "absolute", inset: 0,
                    width: "100%", height: "100%",
                    objectFit: "cover", objectPosition: "center top",
                    display: imgState === "loaded" ? "block" : "none",
                  }}
                  onLoad={() => setImgState("loaded")}
                  onError={() => setImgState("error")}
                />
              </div>

              {/* Top strip */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, zIndex: 5,
                padding: "10px 12px",
                background: "linear-gradient(to bottom, rgba(5,5,5,0.92) 0%, transparent 100%)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontFamily: "var(--font-mundial)", fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  GVC #{id}
                </span>
                <span style={{
                  fontFamily: "var(--font-brice)", fontSize: 10, fontWeight: 900,
                  color: TIER_LABEL_COLOR[tier], letterSpacing: "0.15em", textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 4,
                  border: `1px solid ${TIER_LABEL_COLOR[tier]}`,
                  background: `${TIER_LABEL_COLOR[tier]}18`,
                }}>
                  {tier}
                </span>
              </div>

              {/* Rainbow holographic foil — shifts with tilt angle */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none",
                background: [
                  `linear-gradient(${125 + tilt.y * 2.5 + tilt.x * 1.2}deg,`,
                  `  hsla(${(holo.x * 3.6 + 0)  % 360}, 100%, 65%, 0) 0%,`,
                  `  hsla(${(holo.x * 3.6 + 40) % 360}, 100%, 65%, 0.18) 20%,`,
                  `  hsla(${(holo.x * 3.6 + 80) % 360}, 100%, 65%, 0.22) 40%,`,
                  `  hsla(${(holo.x * 3.6 + 120)% 360}, 100%, 65%, 0.18) 60%,`,
                  `  hsla(${(holo.x * 3.6 + 200)% 360}, 100%, 65%, 0.12) 80%,`,
                  `  hsla(${(holo.x * 3.6 + 280)% 360}, 100%, 65%, 0) 100%)`,
                ].join(""),
                mixBlendMode: "color-dodge" as React.CSSProperties["mixBlendMode"],
                opacity: Math.min(1, 0.1 + Math.sqrt(tilt.x ** 2 + tilt.y ** 2) / 36),
              }} />

              {/* Legendary foil sweep */}
              {isLegendary && (
                <div className="card-shimmer" style={{ position: "absolute", inset: 0, zIndex: 7, pointerEvents: "none" }} />
              )}

              {/* Bottom fade */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0, height: "60%", zIndex: 8,
                background: "linear-gradient(to top, rgba(5,5,5,0.98) 0%, rgba(5,5,5,0.86) 36%, rgba(5,5,5,0.34) 66%, transparent 100%)",
              }} />

              {/* Bottom content */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 16px 18px", zIndex: 9 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 11, flexWrap: "wrap" }}>
                  {badges.map(b => (
                    <div key={b} style={{
                      width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0,
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,224,72,0.2)",
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`https://goodvibesclub.ai/badges/${b}.webp`} alt={b}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  ))}
                </div>

                <p style={{
                  fontFamily: "var(--font-brice)", fontSize: 21, fontWeight: 900,
                  color: "#FFE048", margin: 0, textTransform: "uppercase",
                  letterSpacing: "0.03em", lineHeight: 1.1,
                  textShadow: "0 0 26px rgba(255,224,72,0.65)",
                }}>
                  {archetype}
                </p>
                <p style={{
                  fontFamily: "var(--font-mundial)", fontSize: 11, fontStyle: "italic",
                  color: "rgba(255,255,255,0.48)", margin: "4px 0 12px", lineHeight: 1.4,
                }}>
                  &ldquo;{quote}&rdquo;
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                  {([["RARITY",rarity],["DRIP",drip],["ENERGY",energy],["AURA",aura]] as [string,number][]).map(([lbl,val]) => (
                    <div key={lbl} style={{
                      background: "rgba(5,5,5,0.75)", borderRadius: 8, padding: "5px 4px",
                      textAlign: "center", border: "1px solid rgba(255,224,72,0.16)",
                    }}>
                      <p style={{ fontFamily: "var(--font-mundial)", fontSize: 8.5, color: "rgba(255,255,255,0.38)", margin: 0, letterSpacing: "0.08em" }}>{lbl}</p>
                      <p style={{
                        fontFamily: "var(--font-brice)", fontSize: 24, fontWeight: 900,
                        color: "#FFE048", margin: 0, lineHeight: 1,
                        textShadow: val >= 80 ? "0 0 16px rgba(255,224,72,0.9)" : "none",
                      }}>{val}</p>
                    </div>
                  ))}
                </div>

                <p style={{
                  fontFamily: "var(--font-mundial)", fontSize: 9, color: "rgba(255,255,255,0.28)",
                  margin: "6px 0 0", textAlign: "center", letterSpacing: "0.07em",
                }}>
                  RANK #{rank.toLocaleString()} OF 6,969
                </p>
              </div>
            </div>

            {/* ── BACK ── */}
            <div
              className="card-face"
              style={{
                position: "absolute", inset: 0, borderRadius: 16,
                overflow: "hidden", background: "#0a0a0a",
                border: `2px solid ${TIER_BORDER[tier]}`,
                boxShadow: TIER_GLOW[tier],
                transform: "rotateY(180deg) translateZ(0.01px)",
                animation: isLegendary ? "legendary-glow 2.4s ease-in-out infinite" : undefined,
              }}
            >
              {/* Barely-there diamond texture — luxury dark */}
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: [
                  "repeating-linear-gradient( 45deg, rgba(255,224,72,0.022) 0px, rgba(255,224,72,0.022) 1px, transparent 1px, transparent 32px)",
                  "repeating-linear-gradient(-45deg, rgba(255,224,72,0.022) 0px, rgba(255,224,72,0.022) 1px, transparent 1px, transparent 32px)",
                ].join(","),
              }} />
              <div style={{ position: "absolute", inset: 7,  borderRadius: 10, border: "1px solid rgba(255,224,72,0.22)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", inset: 12, borderRadius:  6, border: "1px solid rgba(255,224,72,0.10)", pointerEvents: "none" }} />

              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18 }}>
                <div style={{ width: 96, height: 96, filter: "drop-shadow(0 0 28px rgba(255,224,72,0.6))" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/shaka.png" alt="Shaka" className="shaka-idle" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{
                    fontFamily: "var(--font-brice)", fontSize: 32, fontWeight: 900,
                    color: "#FFE048", margin: 0, textTransform: "uppercase",
                    letterSpacing: "0.06em", textShadow: "0 0 34px rgba(255,224,72,0.65)",
                  }}>THE VIBE CARD</p>
                  <p style={{ fontFamily: "var(--font-mundial)", fontSize: 12, color: "rgba(255,255,255,0.34)", margin: "5px 0 0", letterSpacing: "0.16em", textTransform: "uppercase" }}>
                    Good Vibes Club
                  </p>
                </div>
                <div style={{
                  padding: "5px 16px", borderRadius: 20,
                  border: `1px solid ${TIER_BORDER[tier]}`,
                  background: `${TIER_BORDER[tier]}14`,
                }}>
                  <p style={{ fontFamily: "var(--font-brice)", fontSize: 13, fontWeight: 900, color: TIER_BORDER[tier], margin: 0, letterSpacing: "0.1em" }}>
                    GVC #{id} · {tier}
                  </p>
                </div>
              </div>

              {/* Corner marks */}
              {[{top:15,left:15},{top:15,right:15},{bottom:15,left:15},{bottom:15,right:15}].map((pos,i) => {
                const isTop = "top" in pos, isLeft = "left" in pos;
                return (
                  <div key={i} style={{
                    position:"absolute", width:18, height:18, ...(pos as React.CSSProperties),
                    borderTop:    isTop  ? "1.5px solid rgba(255,224,72,0.38)" : undefined,
                    borderBottom: !isTop ? "1.5px solid rgba(255,224,72,0.38)" : undefined,
                    borderLeft:   isLeft  ? "1.5px solid rgba(255,224,72,0.38)" : undefined,
                    borderRight:  !isLeft ? "1.5px solid rgba(255,224,72,0.38)" : undefined,
                  }} />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Gold pill interaction hint */}
      <motion.div
        animate={{
          boxShadow: [
            "0 0 8px rgba(255,224,72,0.25), inset 0 0 8px rgba(255,224,72,0.05)",
            "0 0 20px rgba(255,224,72,0.65), inset 0 0 12px rgba(255,224,72,0.12)",
            "0 0 8px rgba(255,224,72,0.25), inset 0 0 8px rgba(255,224,72,0.05)",
          ],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          marginTop: 14,
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "7px 18px", borderRadius: 20,
          background: "rgba(255,224,72,0.1)",
          border: "1px solid rgba(255,224,72,0.45)",
          color: "#FFE048",
          fontFamily: "var(--font-mundial)", fontSize: 12, letterSpacing: "0.08em",
        }}
      >
        <span style={{ fontSize: 10 }}>✦</span>
        {flipped ? "Tap or drag to flip back" : "Drag to tilt · Tap to flip"}
        <span style={{ fontSize: 10 }}>✦</span>
      </motion.div>
    </div>
  );
}

// ─── PACKET REVEAL ────────────────────────────────────────────────────────────

const PACK_W = 270;
const PACK_H = 380;
const TAB_H  = 70;

function PacketReveal({ onOpened }: { onOpened: () => void }) {
  const [phase,   setPhase]   = useState<"idle"|"tearing"|"exploding">("idle");
  const [cutPct,  setCutPct]  = useState(0);
  const [shake,   setShake]   = useState(0); // increments to trigger shake key
  const live     = useRef({ cutPct: 0, phase: "idle" as "idle"|"tearing"|"exploding", down: false, startX: 0, startPct: 0 });
  const lastSnip = useRef(0);
  const called   = useRef(false);

  live.current.cutPct = cutPct;
  live.current.phase  = phase;

  const cutX = cutPct * PACK_W;

  useEffect(() => {
    if (cutPct >= 1 && phase === "tearing") {
      sfx.tear();
      setPhase("exploding");
      if (!called.current) { called.current = true; setTimeout(onOpened, 800); }
    }
  }, [cutPct, phase, onOpened]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      live.current.down     = true;
      live.current.startX   = e.clientX;
      live.current.startPct = live.current.cutPct;
    };
    const onMove = (e: PointerEvent) => {
      const l = live.current;
      if (!l.down || l.phase === "exploding") return;
      const dx = e.clientX - l.startX;
      if (dx < 2) return;
      const p = Math.max(0, Math.min(1, l.startPct + dx / (PACK_W * 0.82)));
      if (p > 0) { setPhase("tearing"); setCutPct(p); }
      const now = Date.now();
      if (now - lastSnip.current > 75 && p > 0.01 && p < 0.98) {
        sfx.snip();
        setShake(s => s + 1);
        lastSnip.current = now;
      }
    };
    const onUp = () => {
      const l = live.current;
      if (!l.down) return;
      l.down = false;
      if (l.cutPct >= 0.45) setCutPct(1);
      else { setCutPct(0); setPhase("idle"); }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [onOpened]);

  const exploding = phase === "exploding";
  const tearing   = phase === "tearing";

  const goldV = "linear-gradient(180deg,#C8960A,#FFE048 40%,#FFD700 60%,#B8860B)";
  const goldH = "linear-gradient(90deg,transparent,#FFE048 20%,#FFD700 50%,#FFE048 80%,transparent)";

  // Shared tab face — repeating shaka tile pattern
  const tabFace = (
    <>
      {/* Dark base */}
      <div style={{ position:"absolute",inset:0, background:"#111" }} />
      {/* Repeating shaka grid */}
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:"url('/shaka.png')",
        backgroundSize:"22px 22px",
        backgroundRepeat:"repeat",
        opacity:0.18,
        filter:"sepia(1) saturate(4) hue-rotate(3deg) brightness(1.4)",
      }} />
      {/* Centre-to-edge gold fade so edges are brighter */}
      <div style={{
        position:"absolute",inset:0,
        background:"radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,224,72,0.12) 0%, rgba(0,0,0,0.35) 100%)",
        pointerEvents:"none",
      }} />
      {/* Gold borders */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:goldH }} />
      <div style={{ position:"absolute",top:0,bottom:0,left:0,width:2,background:goldV }} />
      <div style={{ position:"absolute",top:0,bottom:0,right:0,width:2,background:goldV }} />
    </>
  );

  return (
    <>
      {/* Pack shake wrapper */}
      <motion.div
        key={shake}
        animate={tearing ? { x: [0, -2, 3, -2, 1, 0] } : {}}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{ position:"relative", width:PACK_W, height:PACK_H, userSelect:"none", touchAction:"none" }}
      >

        {/* ── TAB: right (uncut) portion — static ── */}
        {!exploding && (
          <div style={{
            position:"absolute", top:0, left:0, width:PACK_W, height:TAB_H,
            zIndex:4, borderRadius:"12px 12px 0 0", overflow:"hidden",
            clipPath: cutX > 0
              ? `polygon(${cutX}px 0,${PACK_W}px 0,${PACK_W}px ${TAB_H}px,${cutX}px ${TAB_H}px)`
              : undefined,
          }}>
            {tabFace}
          </div>
        )}

        {/* ── TAB: left (peeling) portion ── */}
        {cutX > 0 && (
          <motion.div
            animate={exploding
              ? { y: -280, x: -50, rotate: -22, opacity: 0, scale: 0.5 }
              : { y: -cutPct * 30, rotate: cutPct * 5 }}
            transition={exploding ? { duration: 0.45, ease:[0.4,0,1,1] } : { duration: 0 }}
            style={{
              position:"absolute", top:0, left:0, width:PACK_W, height:TAB_H,
              zIndex:6, borderRadius:"12px 12px 0 0", overflow:"hidden",
              clipPath:`polygon(0 0,${cutX}px 0,${cutX}px ${TAB_H}px,0 ${TAB_H}px)`,
              filter: cutPct > 0.08 ? `drop-shadow(0 ${cutPct*12}px ${cutPct*16}px rgba(0,0,0,0.75))` : undefined,
            }}
          >
            {tabFace}
          </motion.div>
        )}

        {/* ── Rip particles at tear front ── */}
        {tearing && cutX > 4 && cutX < PACK_W - 4 && Array.from({length:5}, (_,i) => (
          <motion.div key={i} style={{
            position:"absolute", left: cutX, top: TAB_H - 6 + (i%3)*4,
            width:2+(i%2), height:2+(i%2), borderRadius:"50%", zIndex:8, pointerEvents:"none",
            background: i%2 ? "#FFE048" : "#fff5a0",
            boxShadow:`0 0 5px ${i%2 ? "#FFE048" : "#FFD700"}`,
          }}
            animate={{ x:[0,(i%2?-10:10)+(i*2)], y:[0,-14-(i*2)], opacity:[1,0], scale:[1,0] }}
            transition={{ duration:0.3, ease:"easeOut" }}
          />
        ))}

        {/* ── Dotted tear line — overlaid at the seam, hidden once exploding ── */}
        {!exploding && <div style={{
          position:"absolute", top: TAB_H - 1, left:0, right:0, height:12,
          zIndex:5, pointerEvents:"none",
        }}>
          {/* Dotted line */}
          <div style={{
            position:"absolute", top:5, left:0, right:0, height:1,
            background:"repeating-linear-gradient(90deg,rgba(255,224,72,0.5) 0,rgba(255,224,72,0.5) 5px,transparent 5px,transparent 10px)",
          }} />
          {/* Label centred on the line */}
          <div style={{
            position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)",
            background:"linear-gradient(90deg,#1e1e1e,#282828,#1e1e1e)", padding:"1px 8px", borderRadius:2,
          }}>
            <span style={{ fontFamily:"var(--font-mundial)", fontSize:7.5, color:"rgba(255,224,72,0.45)",
              letterSpacing:"0.2em", textTransform:"uppercase", whiteSpace:"nowrap" }}>
              TEAR TO OPEN
            </span>
          </div>
        </div>}

        {/* ── Pack body — full height, tab overlaps top ── */}
        <motion.div
          animate={exploding ? { y: 320, opacity: 0, scale: 0.55 } : {}}
          transition={exploding ? { duration: 0.55, ease:[0.4,0,1,1], delay: 0.05 } : {}}
          style={{
            position:"absolute", top: TAB_H, left:0,
            width:PACK_W, height: PACK_H - TAB_H,
            borderRadius:"0 0 12px 12px", overflow:"hidden",
            background:"linear-gradient(155deg,#171717 0%,#282828 28%,#161616 52%,#222 78%,#131313 100%)",
          }}
        >
          <div style={{ position:"absolute",top:0,bottom:0,left:0,width:3,background:goldV,zIndex:3 }} />
          <div style={{ position:"absolute",top:0,bottom:0,right:0,width:3,background:goldV,zIndex:3 }} />
          <div style={{ position:"absolute",bottom:0,left:0,right:0,height:3,background:goldH,zIndex:3 }} />
          <div style={{ position:"absolute",inset:0,zIndex:1,opacity:0.055,
            backgroundImage:[
              "repeating-linear-gradient( 45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 22px)",
              "repeating-linear-gradient(-45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 22px)",
            ].join(","),
          }} />
          <div style={{ position:"absolute",top:"11%",left:"50%",transform:"translateX(-50%)",width:108,height:108,zIndex:5,
            filter:"drop-shadow(0 0 30px rgba(255,224,72,0.85))" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:"100%",height:"100%",objectFit:"contain" }} />
          </div>
          <div style={{ position:"absolute",top:"50%",left:0,right:0,textAlign:"center",zIndex:5 }}>
            <p style={{ fontFamily:"var(--font-brice)",fontWeight:900,fontSize:26,color:"#FFE048",margin:0,
              textTransform:"uppercase",letterSpacing:"0.08em",lineHeight:1.18,
              textShadow:"0 0 28px rgba(255,224,72,0.65),0 0 56px rgba(255,224,72,0.22)" }}>
              GOOD VIBES<br/>CLUB
            </p>
          </div>
          <div style={{ position:"absolute",bottom:20,left:0,right:0,textAlign:"center",zIndex:5 }}>
            <div style={{ width:54,height:1,background:"rgba(255,224,72,0.26)",margin:"0 auto 8px" }} />
            <p style={{ fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,224,72,0.36)",margin:0,
              letterSpacing:"0.22em",textTransform:"uppercase" }}>1 COLLECTIBLE CARD</p>
          </div>
        </motion.div>
      </motion.div>

      {/* Hint */}
      {phase === "idle" && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: 0.8 }}
          style={{ marginTop:14, fontFamily:"var(--font-mundial)", fontSize:12,
            color:"rgba(255,224,72,0.6)", letterSpacing:"0.1em", textTransform:"uppercase", textAlign:"center" }}
        >
          → Drag to tear open
        </motion.p>
      )}
    </>
  );
}

// ─── SMALL AMBIENT EMBERS ─────────────────────────────────────────────────────

const EMBER_DEFS = [
  { left:"5%",  delay:"0s",   dur:"8s",  size:3, cls:"ember"           },
  { left:"14%", delay:"1.4s", dur:"10s", size:4, cls:"ember ember-lg"  },
  { left:"24%", delay:"0.6s", dur:"7s",  size:3, cls:"ember"           },
  { left:"36%", delay:"2.1s", dur:"9s",  size:3, cls:"ember"           },
  { left:"50%", delay:"0.3s", dur:"6s",  size:5, cls:"ember ember-orb" },
  { left:"62%", delay:"1.7s", dur:"11s", size:3, cls:"ember"           },
  { left:"72%", delay:"0.9s", dur:"8s",  size:4, cls:"ember ember-lg"  },
  { left:"82%", delay:"2.5s", dur:"7s",  size:3, cls:"ember"           },
  { left:"91%", delay:"0.1s", dur:"9s",  size:3, cls:"ember"           },
  { left:"30%", delay:"3.0s", dur:"8s",  size:3, cls:"ember ember-twinkle" },
  { left:"68%", delay:"2.8s", dur:"7s",  size:3, cls:"ember ember-twinkle" },
];

function AmbientEmbers() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {EMBER_DEFS.map((p, i) => (
        <div
          key={i}
          className={p.cls}
          style={{
            position:"absolute", left:p.left,
            bottom:`${(i % 5) * 7}%`,
            animationDelay:p.delay, animationDuration:p.dur,
            width:p.size, height:p.size,
          }}
        />
      ))}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [input,        setInput]        = useState("");
  const [tokenId,      setTokenId]      = useState<number | null>(null);
  const [cardData,     setCardData]     = useState<CardData | null>(null);
  const [generating,   setGenerating]   = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);
  const [packRevealed, setPackRevealed] = useState(false);
  const frontRef = useRef<HTMLDivElement>(null!);

  const generateById = useCallback((id: number) => {
    sfx.generate();
    setGenerating(true);
    setShowBurst(false);
    setPackRevealed(false);
    setTimeout(() => {
      setTokenId(id);
      setCardData(generateCardData(id));
      setGenerating(false);
    }, 320);
  }, []);

  const generate = useCallback(() => {
    const id = parseInt(input.trim(), 10);
    if (isNaN(id) || id < 0 || id > 6968) return;
    generateById(id);
  }, [input, generateById]);

  const onSelectToken = useCallback((id: number) => {
    setInput(String(id));
    generateById(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [generateById]);

  const onPacketOpened = useCallback(() => {
    sfx.reveal();
    setPackRevealed(true);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 2000);
  }, []);

  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") generate(); };

  const shareToX = useCallback(() => {
    if (!cardData || tokenId === null) return;
    const text = [
      `GVC #${tokenId} — ${cardData.archetype}`,
      "",
      `${cardData.tier} tier · Rank #${cardData.rank}`,
      `Rarity ${cardData.rarity} · Drip ${cardData.drip} · Energy ${cardData.energy} · Aura ${cardData.aura}`,
      "",
      `Generate yours → The Vibe Card by @imaesr`,
      `goodvibesclub.ai`,
      "",
      `#GoodVibesClub #GVC #VibeCard`,
    ].join("\n");
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }, [cardData, tokenId]);

  const downloadCard = useCallback(async () => {
    if (tokenId === null || !cardData) return;
    try {
      await document.fonts.ready;

      const S = 2;
      const W = DESIGN_W, H = DESIGN_H;
      const cv = document.createElement("canvas");
      cv.width = W * S; cv.height = H * S;
      const ctx = cv.getContext("2d")!;
      ctx.scale(S, S);

      // Resolve CSS-variable font names (Next.js hashes them)
      const cs = getComputedStyle(document.documentElement);
      const brice   = cs.getPropertyValue("--font-brice").trim()   || "serif";
      const mundial = cs.getPropertyValue("--font-mundial").trim() || "sans-serif";

      const loadImg = (src: string) => new Promise<HTMLImageElement>(resolve => {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => resolve(img); img.onerror = () => resolve(img);
        img.src = src;
      });

      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
        ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
        ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
        ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      };

      // ── Clip to card shape ─────────────────────────────────────────
      ctx.save(); rr(0,0,W,H,16); ctx.clip();

      // Background
      ctx.fillStyle = "#050505"; ctx.fillRect(0,0,W,H);

      // Portrait
      const portrait = await loadImg(`/api/portrait/${tokenId}`);
      if (portrait.naturalWidth > 0) {
        const iw = portrait.naturalWidth, ih = portrait.naturalHeight;
        const sc = Math.max(W/iw, H/ih);
        ctx.drawImage(portrait, (W - iw*sc)/2, 0, iw*sc, ih*sc);
      }

      // Bottom fade
      const fade = ctx.createLinearGradient(0, H*0.4, 0, H);
      fade.addColorStop(0, "rgba(5,5,5,0)");
      fade.addColorStop(0.34, "rgba(5,5,5,0.34)");
      fade.addColorStop(0.66, "rgba(5,5,5,0.86)");
      fade.addColorStop(1,   "rgba(5,5,5,0.98)");
      ctx.fillStyle = fade; ctx.fillRect(0, H*0.4, W, H*0.6);

      // Top fade
      const topFade = ctx.createLinearGradient(0,0,0,50);
      topFade.addColorStop(0, "rgba(5,5,5,0.92)");
      topFade.addColorStop(1, "rgba(5,5,5,0)");
      ctx.fillStyle = topFade; ctx.fillRect(0,0,W,50);

      // GVC #id label
      ctx.font = `11px ${mundial}`; ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillText(`GVC #${tokenId}`, 12, 21);

      // Tier badge pill
      const tc = TIER_LABEL_COLOR[cardData.tier];
      const tt = cardData.tier.toUpperCase();
      ctx.font = `900 10px ${brice}`;
      const tw = ctx.measureText(tt).width;
      const bpx = W - tw - 28, bpy = 10, bpw = tw + 16, bph = 18;
      rr(bpx,bpy,bpw,bph,4);
      ctx.fillStyle = tc + "28"; ctx.fill();
      ctx.strokeStyle = tc; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = tc; ctx.textBaseline = "middle";
      ctx.fillText(tt, bpx+8, bpy+9);

      // ── Bottom content positions (match live card layout) ─────────────
      const PAD       = 16;
      const BADGE_SZ  = 36;
      const BADGE_TOP = H - 180;           // matches card's bottom padding + content stack
      const ARCH_Y    = BADGE_TOP + BADGE_SZ + 11 + 20;  // badge + gap + font ascent
      const QUOTE_Y   = ARCH_Y + 20;
      const STATS_Y   = QUOTE_Y + 18;
      const STAT_H    = 40;
      const RANK_Y    = H - 20;

      // Badges — no border; draw image clipped to rounded rect
      await Promise.allSettled(cardData.badges.map(async (b, i) => {
        const bx = PAD + i * (BADGE_SZ + 6), by = BADGE_TOP;
        const bimg = await loadImg(`https://goodvibesclub.ai/badges/${b}.webp`);
        if (bimg.naturalWidth > 0) {
          ctx.save(); rr(bx,by,BADGE_SZ,BADGE_SZ,8); ctx.clip();
          ctx.drawImage(bimg,bx,by,BADGE_SZ,BADGE_SZ); ctx.restore();
        } else {
          // Subtle fallback placeholder — no visible border
          rr(bx,by,BADGE_SZ,BADGE_SZ,8);
          ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill();
        }
      }));

      // Archetype
      ctx.font = `900 21px ${brice}`; ctx.fillStyle = "#FFE048";
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.shadowColor = "rgba(255,224,72,0.65)"; ctx.shadowBlur = 26;
      ctx.fillText(cardData.archetype.toUpperCase(), PAD, ARCH_Y);
      ctx.shadowBlur = 0;

      // Quote
      ctx.font = `italic 11px ${mundial}`;
      ctx.fillStyle = "rgba(255,255,255,0.48)";
      ctx.fillText(`"${cardData.quote}"`, PAD, QUOTE_Y);

      // Stats grid
      const statCols = 4;
      const gap = 6;
      const statW = (W - PAD*2 - gap*(statCols-1)) / statCols;
      const stats: [string, number][] = [
        ["RARITY", cardData.rarity], ["DRIP", cardData.drip],
        ["ENERGY", cardData.energy], ["AURA", cardData.aura],
      ];
      stats.forEach(([lbl, val], i) => {
        const sx = PAD + i*(statW+gap);
        rr(sx,STATS_Y,statW,STAT_H,8);
        ctx.fillStyle = "rgba(5,5,5,0.75)"; ctx.fill();
        ctx.strokeStyle = "rgba(255,224,72,0.16)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.font = `8.5px ${mundial}`; ctx.fillStyle = "rgba(255,255,255,0.38)";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(lbl, sx+statW/2, STATS_Y+11);
        ctx.font = `900 22px ${brice}`; ctx.fillStyle = "#FFE048";
        if (val >= 80) { ctx.shadowColor = "rgba(255,224,72,0.9)"; ctx.shadowBlur = 14; }
        ctx.fillText(String(val), sx+statW/2, STATS_Y+28);
        ctx.shadowBlur = 0;
      });

      // Rank
      ctx.font = `9px ${mundial}`; ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(`RANK #${cardData.rank.toLocaleString()} OF 6,969`, W/2, RANK_Y);

      ctx.restore(); // pop card clip

      // Border
      rr(1,1,W-2,H-2,16);
      ctx.strokeStyle = TIER_BORDER[cardData.tier]; ctx.lineWidth = 2; ctx.stroke();

      const a = document.createElement("a");
      a.download = `vibe-card-${tokenId}.png`;
      a.href = cv.toDataURL("image/png");
      a.click();
    } catch (err) { console.error("Download failed:", err); }
  }, [tokenId, cardData]);

  return (
    <>
      <Watermark />
      <BackgroundOrbs />
      <AmbientEmbers />

      <main style={{
        minHeight: "100vh", position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "24px 20px 64px",
        overflowX: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}>
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: "center", marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width: 32, height: 32 }} />
            <h1 className="text-shimmer" style={{
              fontFamily: "var(--font-brice)",
              fontSize: "clamp(28px, 6.5vw, 46px)",
              fontWeight: 900, margin: 0,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              THE VIBE CARD
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width: 32, height: 32 }} />
          </div>
          <p style={{ color: "rgba(255,255,255,0.36)", fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
            GVC Collectible Card Generator
          </p>
        </motion.div>

        {/* ── Input ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: "flex", gap: 8, marginBottom: 12, width: "100%", maxWidth: 400 }}
        >
          <input
            type="number" min="0" max="6968"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Token ID  (0 – 6968)"
            style={{
              flex: 1, padding: "13px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,224,72,0.22)",
              borderRadius: 10, color: "#fff",
              fontFamily: "var(--font-mundial)", fontSize: 15,
              outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
            }}
            onFocus={e => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,224,72,0.6)";
              (e.currentTarget as HTMLInputElement).style.boxShadow   = "0 0 0 2px rgba(255,224,72,0.1)";
            }}
            onBlur={e => {
              (e.currentTarget as HTMLInputElement).style.borderColor = "rgba(255,224,72,0.22)";
              (e.currentTarget as HTMLInputElement).style.boxShadow   = "none";
            }}
          />
          <button
            onClick={generate}
            disabled={generating}
            style={{
              padding: "13px 20px", background: "#FFE048", color: "#080808",
              border: "none", borderRadius: 10,
              fontFamily: "var(--font-brice)", fontSize: 14, fontWeight: 900,
              textTransform: "uppercase", letterSpacing: "0.05em",
              cursor: generating ? "default" : "pointer",
              opacity: generating ? 0.7 : 1, whiteSpace: "nowrap",
              transition: "opacity 0.2s, transform 0.12s",
            }}
            onMouseDown={e => { if (!generating) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.96)"; }}
            onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            {generating ? "…" : "Generate"}
          </button>
        </motion.div>

        {/* ── Wallet (inline, below input) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{ marginBottom: 24, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          <WalletConnect onSelectToken={onSelectToken} />
        </motion.div>

        {/* ── Card area ── */}
        <div style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center" }}>
          {/* Focused glow behind card — no filter:blur to avoid dark compositing halo */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 1000, height: 1000, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,224,72,0.10) 0%, rgba(255,95,31,0.04) 28%, rgba(255,224,72,0.02) 48%, transparent 65%)",
            pointerEvents: "none", zIndex: 0,
          }} />

          <AnimatePresence mode="wait">

            {/* ── Packet (shown before card is revealed) ── */}
            {cardData && tokenId !== null && !packRevealed && (
              <motion.div
                key={`pack-${tokenId}`}
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -30 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <PacketReveal onOpened={onPacketOpened} />
              </motion.div>
            )}

            {/* ── Card (shown after packet torn open) ── */}
            {cardData && tokenId !== null && packRevealed && (
              <motion.div
                key={`card-${tokenId}`}
                initial={{ opacity: 0, scale: 0.82, y: 32 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={  { opacity: 0, scale: 0.82,  y: -20 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                {/* Burst particles */}
                {showBurst && <TierBurst key={`burst-${tokenId}`} tier={cardData.tier} id={tokenId} />}

                <VibeCard id={tokenId} data={cardData} frontRef={frontRef} />

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28 }}
                  style={{
                    display: "flex", gap: 8, marginTop: 16,
                    width: "100%", maxWidth: 400,
                  }}
                >
                  <button
                    onClick={shareToX}
                    style={{
                      flex: 1, padding: "12px 14px", background: "#000", color: "#fff",
                      border: "1px solid rgba(255,255,255,0.18)", borderRadius: 10,
                      fontFamily: "var(--font-mundial)", fontSize: 14,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "border-color 0.18s",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.4)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share to X
                  </button>
                  <button
                    onClick={downloadCard}
                    style={{
                      flex: 1, padding: "12px 14px", background: "rgba(255,224,72,0.08)", color: "#FFE048",
                      border: "1px solid rgba(255,224,72,0.28)", borderRadius: 10,
                      fontFamily: "var(--font-mundial)", fontSize: 14,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "background 0.18s, border-color 0.18s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background  = "rgba(255,224,72,0.14)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.5)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background  = "rgba(255,224,72,0.08)";
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.28)";
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFE048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PNG
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Empty state ── */}
        {!cardData && !generating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.3 } }}
            style={{ textAlign: "center", marginTop: 8 }}
          >
            <p style={{ color: "rgba(255,255,255,0.24)", fontSize: 13, margin: 0 }}>
              Enter a GVC token ID to generate your Vibe Card
            </p>
            <p style={{ color: "rgba(255,255,255,0.13)", fontSize: 12, marginTop: 5 }}>
              Try #142, #420, #1337, or any ID from 0–6968
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 22, flexWrap: "wrap" }}>
              {[142, 420, 1337, 6968].map(preview => (
                <button
                  key={preview}
                  onClick={() => setInput(String(preview))}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(255,224,72,0.05)",
                    border: "1px solid rgba(255,224,72,0.18)", borderRadius: 8,
                    color: "rgba(255,224,72,0.65)", fontFamily: "var(--font-brice)",
                    fontSize: 13, fontWeight: 900, cursor: "pointer",
                    transition: "background 0.16s, border-color 0.16s",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background  = "rgba(255,224,72,0.1)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.4)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background  = "rgba(255,224,72,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,224,72,0.18)";
                  }}
                >
                  #{preview}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Scoped CSS ── */}
        <style>{`
          /* ── iOS 3D fix: webkit-prefixed versions are required on Safari/Chrome iOS ── */
          .card-rotator {
            -webkit-transform-style: preserve-3d;
            transform-style: preserve-3d;
          }
          .perspective-wrap {
            -webkit-perspective: 1200px;
            perspective: 1200px;
          }
          .card-face {
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          .gvc-spinner {
            width: 34px; height: 34px; border-radius: 50%;
            border: 2px solid #FFE048; border-top-color: transparent;
            animation: gvc-spin 0.8s linear infinite;
          }
          .card-shimmer {
            background: linear-gradient(108deg, transparent 38%, rgba(255,224,72,0.07) 50%, transparent 62%);
            animation: card-shimmer 3.5s ease-in-out infinite;
          }

          /* Legendary ongoing embers around card */
          .lgd-ember {
            width: 5px; height: 5px; border-radius: 50%;
            background: #FF7A00;
            box-shadow: 0 0 8px #FF7A00, 0 0 16px rgba(255,122,0,0.5);
            animation: lgd-rise 3s ease-out infinite;
          }

          /* Rare ongoing sparkles around card */
          .rare-spark {
            width: 6px; height: 6px;
            background: #A855F7;
            box-shadow: 0 0 8px #A855F7, 0 0 14px rgba(168,85,247,0.5);
            animation: rare-sparkle 2.4s ease-in-out infinite;
            clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          }

          @keyframes lgd-rise {
            0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
            80%  { opacity: 0.6; }
            100% { transform: translate(calc((var(--drift, 0) - 0.5) * 40px), -120px) scale(0.2); opacity: 0; }
          }
          @keyframes rare-sparkle {
            0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
            30%      { opacity: 1; transform: scale(1.4) rotate(120deg); }
            60%      { opacity: 0.8; transform: scale(1) rotate(240deg); }
          }

          @keyframes gvc-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes card-shimmer {
            0%   { transform: translateX(-220%) skewX(-14deg); opacity: 0; }
            20%  { opacity: 1; }
            80%  { opacity: 1; }
            100% { transform: translateX(440%) skewX(-14deg); opacity: 0; }
          }
          @keyframes legendary-glow {
            0%,100% {
              box-shadow: 0 0 32px rgba(255,224,72,0.70),
                          0 0 64px rgba(255,95,31,0.35),
                          0 0 100px rgba(255,224,72,0.12);
            }
            50% {
              box-shadow: 0 0 44px rgba(255,224,72,0.90),
                          0 0 88px rgba(255,95,31,0.55),
                          0 0 130px rgba(255,224,72,0.20);
            }
          }

          input[type=number]::-webkit-inner-spin-button,
          input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
          input[type=number] { -moz-appearance: textfield; }

          /* Mobile layout */
          @media (max-width: 440px) {
            .action-btns { flex-direction: column !important; }
          }
        `}</style>
      </main>

    </>
  );
}
