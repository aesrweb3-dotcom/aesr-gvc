"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateBattleCard, compareCards, generateCpuDeck, randomCard,
  ROUND_STATS, STAT_LABELS,
} from "@/lib/battle";
import type {
  BattleCard, BattleTier, RoundStat, RoundResult,
  BattleMode, Screen, ArenaPhase, BattleResult,
} from "@/lib/battle";
import { WalletConnect } from "@/components/WalletConnect";

// ─── COLOR CONSTANTS ─────────────────────────────────────────────────────────

const C = {
  mint:      "#98f5c4",
  coral:     "#ff6b8a",
  sky:       "#74d7f7",
  lavender:  "#c084fc",
  sunshine:  "#FFE048",
  peach:     "#ffb347",
  white:     "#ffffff",
  dark:      "#0f0f1e",
};

const TIER_COLORS: Record<BattleTier, { border: string; glow: string; label: string }> = {
  Common:    { border: C.sky,      glow: "rgba(116,215,247,0.6)",  label: "#74d7f7" },
  Rare:      { border: C.lavender, glow: "rgba(192,132,252,0.7)",  label: "#c084fc" },
  Legendary: { border: C.sunshine, glow: "rgba(255,224,72,0.85)",  label: "#FFE048" },
};

const STAT_COLORS: Record<RoundStat, string> = {
  RARITY: C.coral,
  DRIP:   C.sky,
  ENERGY: C.mint,
  AURA:   C.lavender,
  TOTAL:  C.sunshine,
};

// ─── STATS (localStorage) ────────────────────────────────────────────────────

interface VibStats { wins:number; losses:number; draws:number; packs:number; streak:number; }
const DEFAULT_STATS: VibStats = { wins:0, losses:0, draws:0, packs:0, streak:0 };

function loadStats(): VibStats {
  if (typeof window === "undefined") return DEFAULT_STATS;
  try { return { ...DEFAULT_STATS, ...JSON.parse(localStorage.getItem("vb-stats") || "{}") }; }
  catch { return DEFAULT_STATS; }
}
function saveStats(s: VibStats) {
  try { localStorage.setItem("vb-stats", JSON.stringify(s)); } catch {}
}
function recordBattleResult(winner: "P1"|"P2"|"DRAW") {
  const s = loadStats();
  if (winner === "P1")   saveStats({...s, wins:   s.wins+1,   streak: s.streak+1});
  else if (winner==="P2") saveStats({...s, losses: s.losses+1, streak: 0});
  else                    saveStats({...s, draws:  s.draws+1});
}
function recordPack() {
  const s = loadStats(); saveStats({...s, packs: s.packs+1});
}

// ─── CSS ANIMATIONS ───────────────────────────────────────────────────────────

const GAME_CSS = `
@keyframes bgPulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes floatCard { 0%,100%{transform:translateY(0px) rotate(var(--r))} 50%{transform:translateY(-16px) rotate(calc(var(--r) + 4deg))} }
@keyframes popIn { 0%{transform:scale(0);opacity:0} 80%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
@keyframes confettiFall { 0%{transform:translateY(-20px) rotate(0deg);opacity:1} 100%{transform:translateY(110vh) rotate(720deg);opacity:0} }
@keyframes shimmerText { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes screenShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
@keyframes pulseGlow { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes cardEntrance { 0%{transform:translateY(-60px) scale(.7);opacity:0} 100%{transform:translateY(0) scale(1);opacity:1} }
@keyframes gvc-spin { to { transform: rotate(360deg); } }
@keyframes card-shimmer {
  0%   { transform: translateX(-220%) skewX(-14deg); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(440%) skewX(-14deg); opacity: 0; }
}
@keyframes legendary-glow {
  0%,100% { box-shadow: 0 0 32px rgba(255,224,72,0.70), 0 0 64px rgba(255,95,31,0.35), 0 0 100px rgba(255,224,72,0.12); }
  50%      { box-shadow: 0 0 44px rgba(255,224,72,0.90), 0 0 88px rgba(255,95,31,0.55), 0 0 130px rgba(255,224,72,0.20); }
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
.vb-bg { background:linear-gradient(-45deg,#1a0340,#0a1a40,#0d2030,#1a0240,#0a0a30); background-size:400% 400%; animation:bgPulse 14s ease infinite; }
.shimmer-title { background:linear-gradient(110deg,#FFE048,#98f5c4,#74d7f7,#c084fc,#ff6b8a,#FFE048); background-size:200% 100%; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:shimmerText 3s linear infinite; }
.card-rotator { -webkit-transform-style:preserve-3d; transform-style:preserve-3d; }
.perspective-wrap { -webkit-perspective:1200px; perspective:1200px; }
.card-face { -webkit-backface-visibility:hidden; backface-visibility:hidden; }
.arena-shake { animation:screenShake .35s ease-out; }
.gvc-spinner {
  width: 34px; height: 34px; border-radius: 50%;
  border: 2px solid #FFE048; border-top-color: transparent;
  animation: gvc-spin 0.8s linear infinite;
}
.card-shimmer {
  background: linear-gradient(108deg, transparent 32%, rgba(180,180,255,0.14) 44%, rgba(255,180,200,0.10) 50%, rgba(180,255,200,0.14) 56%, transparent 68%);
  animation: card-shimmer 3.8s ease-in-out infinite;
}
@keyframes rainbowLed { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
.rainbow-led { background:linear-gradient(90deg,#ff6b8a,#ffb347,#FFE048,#98f5c4,#74d7f7,#c084fc,#ff6b8a); background-size:200% 100%; animation:rainbowLed 3s linear infinite; }
@keyframes barBounce { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.05)} }
input[type=range] { -webkit-appearance:none; appearance:none; outline:none; cursor:pointer; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#c084fc; border:2px solid #050505; box-shadow:0 0 8px rgba(192,132,252,0.6); }
.lgd-ember {
  width: 5px; height: 5px; border-radius: 50%;
  background: #FF7A00;
  box-shadow: 0 0 8px #FF7A00, 0 0 16px rgba(255,122,0,0.5);
  animation: lgd-rise 3s ease-out infinite;
}
.rare-spark {
  width: 6px; height: 6px;
  background: #c084fc;
  box-shadow: 0 0 8px #c084fc, 0 0 14px rgba(192,132,252,0.5);
  animation: rare-sparkle 2.4s ease-in-out infinite;
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance:none; }
input[type=number] { -moz-appearance:textfield; }
`;

// ─── SEEDED RNG ───────────────────────────────────────────────────────────────

function seededRNG(seed: number) {
  let s = ((seed * 1664525) + 1013904223) >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ─── BADGES ──────────────────────────────────────────────────────────────────

const ALL_BADGES = [
  "astro_balls","zoom_in_vibe_out","showtime","flow_state",
  "vibestr_bronze_tier","checkmate","vibefoot_fan_club","suited_up",
  "astro_bean","gud_meat","hoodie_up_society","twenty_badges",
  "yin_n_yang","vibestr_pink_tier","party_in_the_back",
  "unfathomable_vibes","gradient_hatrick","one_of_one",
  "fifty_badges","cosmic_guardian","super_rare","pothead",
  "elite_rainbow_ranger","anchorman","rainbow_visor",
];

function getBadges(tokenId: number): string[] {
  const rng = seededRNG(tokenId * 31 + 7);
  const count = 2 + Math.floor(rng() * 3); // 2–4 badges
  const pool = [...ALL_BADGES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ─── WEB AUDIO SOUNDS ────────────────────────────────────────────────────────

function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (!w.__ac) {
    try { w.__ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { return null; }
  }
  return w.__ac as AudioContext;
}

function sfxClick() {
  const ac = getAudio(); if (!ac) return;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.frequency.value = 880; o.type = "sine";
  g.gain.setValueAtTime(0.18, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
  o.start(ac.currentTime); o.stop(ac.currentTime + 0.08);
}

function sfxCardPlay() {
  const ac = getAudio(); if (!ac) return;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(200, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(1000, ac.currentTime + 0.2);
  g.gain.setValueAtTime(0.22, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
  o.start(ac.currentTime); o.stop(ac.currentTime + 0.22);
}

function sfxClash() {
  const ac = getAudio(); if (!ac) return;
  // low thud
  const o = ac.createOscillator(); const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(100, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.4);
  g.gain.setValueAtTime(0.3, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  o.start(ac.currentTime); o.stop(ac.currentTime + 0.4);
  // noise burst
  const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
  const src = ac.createBufferSource(); const ng = ac.createGain();
  src.buffer = buf; src.connect(ng); ng.connect(ac.destination);
  ng.gain.setValueAtTime(0.3, ac.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  src.start(ac.currentTime);
}

function sfxRoundWin() {
  const ac = getAudio(); if (!ac) return;
  const notes = [261.63, 329.63, 392]; // C-E-G
  notes.forEach((freq, i) => {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = "triangle"; o.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.start(t); o.stop(t + 0.2);
  });
}

function sfxRoundLose() {
  const ac = getAudio(); if (!ac) return;
  const o = ac.createOscillator(); const g = ac.createGain();
  o.connect(g); g.connect(ac.destination);
  o.type = "sine";
  o.frequency.setValueAtTime(350, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.4);
  g.gain.setValueAtTime(0.2, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
  o.start(ac.currentTime); o.stop(ac.currentTime + 0.42);
}

function sfxVictory() {
  const ac = getAudio(); if (!ac) return;
  const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99]; // C-E-G-C'-E'-G'
  notes.forEach((freq, i) => {
    const o = ac.createOscillator(); const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type = "triangle"; o.frequency.value = freq;
    const t = ac.currentTime + i * 0.1;
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.start(t); o.stop(t + 0.28);
  });
}

// ─── PALETTES (for FallbackArt) ───────────────────────────────────────────────

const PALETTES = [
  ["#C084FC", "#6366F1", "#FFE048"],
  ["#A855F7", "#EC4899", "#FF5F1F"],
  ["#3B82F6", "#6366F1", "#C084FC"],
  ["#FF5F1F", "#FFE048", "#C084FC"],
  ["#06B6D4", "#3B82F6", "#A855F7"],
  ["#FFE048", "#FF7A00", "#A855F7"],
];

// ─── FALLBACK ART ─────────────────────────────────────────────────────────────

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
      <rect width="100" height="140" fill="#05040f" />
      {blobs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry}
          fill={`url(#${uid}-g${i})`} filter={`url(#${uid}-blur)`} />
      ))}
      <text x="50" y="70" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.04)" fontSize="18" fontFamily="serif" fontWeight="900" letterSpacing="4">
        #{id}
      </text>
    </svg>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [C.mint, C.coral, C.sky, C.lavender, C.sunshine, C.peach];

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    x: Math.random() * 100,
    delay: Math.random() * 2,
    dur: 2.5 + Math.random() * 2,
    size: 6 + Math.random() * 6,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100, overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: -20,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: 2,
          }}
          animate={{ y: "110vh", rotate: 720, opacity: [1, 1, 0] }}
          transition={{ duration: p.dur, delay: p.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

// ─── FLOATING CARDS (background) ─────────────────────────────────────────────

function FloatingCards() {
  const cards = [
    { left: "5%",  top: "15%", r: "-8deg"  },
    { left: "85%", top: "10%", r: "12deg"  },
    { left: "2%",  top: "60%", r: "5deg"   },
    { left: "88%", top: "55%", r: "-15deg" },
    { left: "45%", top: "5%",  r: "3deg"   },
    { left: "50%", top: "80%", r: "-6deg"  },
  ];
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.left,
            top: c.top,
            width: 70,
            height: 100,
            borderRadius: 12,
            border: "2px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            animation: `floatCard ${7 + i}s ease-in-out infinite`,
            ["--r" as any]: c.r,
            transform: `rotate(${c.r})`,
          }}
        />
      ))}
    </div>
  );
}

// ─── BATTLE CARD MINI ─────────────────────────────────────────────────────────

interface BattleCardMiniProps {
  card: BattleCard;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
}

function BattleCardMini({ card, selected, onSelect, disabled, faceDown }: BattleCardMiniProps) {
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const tc = TIER_COLORS[card.tier];
  return (
    <motion.div
      onClick={() => { if (!disabled && onSelect) { sfxClick(); onSelect(); } }}
      whileTap={!disabled ? { scale: 0.93 } : {}}
      style={{
        width: 64, height: 88, borderRadius: 10, overflow: "hidden",
        border: selected ? `2px solid ${C.sunshine}` : `2px solid ${tc.border}`,
        boxShadow: selected
          ? `0 0 16px ${C.sunshine}, 0 0 32px rgba(255,224,72,0.4)`
          : `0 0 10px ${tc.glow}`,
        cursor: disabled ? "default" : "pointer",
        position: "relative",
        transform: selected ? "scale(1.08)" : undefined,
        transition: "transform 0.15s, box-shadow 0.15s",
        flexShrink: 0,
        background: "#0f0f1e",
      }}
    >
      {faceDown ? (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #1a0340, #0a1a40)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shaka.png" alt="" style={{ width: 28, height: 28, opacity: 0.5 }} />
        </div>
      ) : (
        <>
          {imgState !== "loaded" && (
            <div style={{ position: "absolute", inset: 0 }}>
              {imgState === "error" ? <FallbackArt id={card.tokenId} /> : (
                <div style={{ position: "absolute", inset: 0, background: "#0f0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="gvc-spinner" style={{ width: 18, height: 18, border: "2px solid #FFE048", borderTopColor: "transparent" }} />
                </div>
              )}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/portrait/${card.tokenId}`}
            alt={`GVC #${card.tokenId}`}
            style={{
              position: "absolute", inset: 0,
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              display: imgState === "loaded" ? "block" : "none",
            }}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
          />
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
            padding: "10px 3px 3px",
            fontSize: 8, color: "rgba(255,255,255,0.7)",
            textAlign: "center", fontFamily: "var(--font-mundial)",
          }}>
            #{card.tokenId}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── BATTLE CARD FULL ─────────────────────────────────────────────────────────

interface BattleCardFullProps {
  card: BattleCard;
  highlightStat?: RoundStat;
  winner?: boolean;
  loser?: boolean;
  faceDown?: boolean;
  cardWidth?: number;
}

function BattleCardFull({ card, highlightStat, winner, loser, faceDown, cardWidth = 155 }: BattleCardFullProps) {
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const tc = TIER_COLORS[card.tier];
  const CW = cardWidth;
  const CH = Math.round(CW * (210/155));

  if (faceDown) {
    return (
      <div style={{
        width: CW, height: CH, borderRadius: 14,
        background: "linear-gradient(135deg,#1a0340,#0a1a40,#0d1a2e)",
        border: `2px solid rgba(255,255,255,0.12)`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shaka.png" alt="" className="shaka-idle" style={{ width: CW*0.27, height: CW*0.27, opacity: 0.6 }} />
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)", letterSpacing: "0.1em" }}>???</span>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    width: CW, height: CH, borderRadius: 14, overflow: "hidden",
    border: `2px solid ${winner ? C.mint : loser ? "rgba(255,255,255,0.15)" : tc.border}`,
    boxShadow: winner
      ? `0 0 24px rgba(152,245,196,0.7), 0 0 48px rgba(152,245,196,0.3)`
      : loser
      ? "none"
      : `0 0 14px ${tc.glow}`,
    position: "relative",
    background: "#0a0a16",
    transform: winner ? "scale(1.06)" : loser ? "scale(0.92)" : "scale(1)",
    filter: loser ? "grayscale(0.6) brightness(0.75)" : undefined,
    transition: "transform 0.3s, filter 0.3s",
    flexShrink: 0,
  };

  const stats: [RoundStat, number][] = [
    ["RARITY", card.rarity],
    ["DRIP",   card.drip],
    ["ENERGY", card.energy],
    ["AURA",   card.aura],
  ];

  return (
    <div style={{ position: "relative" }}>
      <div style={cardStyle}>
        {/* Portrait area (top 55%) */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%" }}>
          {imgState !== "loaded" && (
            <div style={{ position: "absolute", inset: 0 }}>
              {imgState === "error" ? <FallbackArt id={card.tokenId} /> : (
                <div style={{ position: "absolute", inset: 0, background: "#0f0f1e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="gvc-spinner" style={{ width: 20, height: 20, border: "2px solid #FFE048", borderTopColor: "transparent" }} />
                </div>
              )}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/portrait/${card.tokenId}`}
            alt={`GVC #${card.tokenId}`}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center top",
              display: imgState === "loaded" ? "block" : "none",
            }}
            onLoad={() => setImgState("loaded")}
            onError={() => setImgState("error")}
          />
          {/* gradient fade */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 30,
            background: "linear-gradient(to top, #0a0a16, transparent)" }} />
          {/* token id top */}
          <div style={{ position: "absolute", top: 4, left: 6, fontSize: 8,
            color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mundial)" }}>
            #{card.tokenId}
          </div>
        </div>

        {/* Bottom panel */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0,
          height: "47%", padding: "4px 7px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{
            fontFamily: "var(--font-brice)", fontSize: 8, fontWeight: 900,
            color: tc.label, margin: "0 0 3px", textTransform: "uppercase",
            letterSpacing: "0.04em", lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden",
          }}>
            {card.archetype.replace("The ", "")}
          </p>
          {stats.map(([stat, val]) => {
            const isHL = highlightStat === stat;
            return (
              <div key={stat} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: isHL ? "1px 4px" : "1px 2px",
                borderRadius: 4,
                background: isHL ? `${STAT_COLORS[stat]}22` : "transparent",
                border: isHL ? `1px solid ${STAT_COLORS[stat]}55` : "1px solid transparent",
              }}>
                <span style={{
                  fontSize: 8, fontFamily: "var(--font-mundial)",
                  color: isHL ? STAT_COLORS[stat] : "rgba(255,255,255,0.45)",
                  letterSpacing: "0.06em",
                }}>{STAT_LABELS[stat]}</span>
                <span style={{
                  fontSize: isHL ? 11 : 9, fontFamily: "var(--font-brice)",
                  fontWeight: 900,
                  color: isHL ? STAT_COLORS[stat] : "rgba(255,255,255,0.75)",
                  textShadow: isHL ? `0 0 8px ${STAT_COLORS[stat]}` : undefined,
                }}>{val}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* WIN / LOSE badge */}
      {winner && (
        <motion.div
          initial={{ scale: 0, y: -10 }}
          animate={{ scale: 1, y: 0 }}
          style={{
            position: "absolute", top: -10, right: -10, zIndex: 10,
            background: C.mint, color: "#0f0f1e",
            fontFamily: "var(--font-brice)", fontSize: 10, fontWeight: 900,
            padding: "3px 8px", borderRadius: 8, letterSpacing: "0.05em",
          }}
        >WIN</motion.div>
      )}
      {loser && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            position: "absolute", top: -10, right: -10, zIndex: 10,
            background: C.coral, color: "#0f0f1e",
            fontFamily: "var(--font-brice)", fontSize: 10, fontWeight: 900,
            padding: "3px 8px", borderRadius: 8, letterSpacing: "0.05em",
          }}
        >LOSE</motion.div>
      )}
    </div>
  );
}

// ─── SHOWCASE CARD ────────────────────────────────────────────────────────────
// Large, flippable, holographic card for the pack-rip reveal screen

async function downloadShowcaseCard(card: BattleCard, badges: string[]) {
  try {
    // Canvas is 2× the on-screen card for retina quality
    // On-screen card uses W up to 300px; we render at 420px (same 1.42 ratio)
    const W = 420, H = Math.round(W * 1.42); // 596
    const S = 2;
    const cv = document.createElement("canvas"); cv.width = W*S; cv.height = H*S;
    const ctx = cv.getContext("2d")!; ctx.scale(S, S);
    const tc = TIER_COLORS[card.tier];
    const STAT_COLS = ["#ff6b8a","#74d7f7","#98f5c4","#c084fc"] as const;
    const PAD = Math.round(W * 0.048); // matches on-screen W*0.05

    // ── helpers ──
    const rr = (x:number,y:number,w:number,h:number,r:number) => {
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h);
      ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
    };
    const load = (src:string) => new Promise<HTMLImageElement>(res => {
      const img = new Image(); img.crossOrigin="anonymous";
      img.onload=()=>res(img); img.onerror=()=>res(img); img.src=src;
    });
    const cs = getComputedStyle(document.documentElement);
    // CSS variable returns Next.js-hashed font family name; fall back gracefully
    const B = cs.getPropertyValue("--font-brice").trim()   || "Impact";
    const M = cs.getPropertyValue("--font-mundial").trim() || "Arial";

    // ── Clip to rounded card ──
    ctx.save(); rr(0,0,W,H,18); ctx.clip();

    // ── Solid dark background ──
    ctx.fillStyle = "#080810"; ctx.fillRect(0,0,W,H);

    // ── Portrait — full bleed, top-aligned (matches objectFit:cover objectPosition:center top) ──
    const portrait = await load(`/api/portrait/${card.tokenId}`);
    if (portrait.naturalWidth > 0) {
      const sc = Math.max(W/portrait.naturalWidth, H/portrait.naturalHeight);
      const pw = portrait.naturalWidth  * sc;
      const ph = portrait.naturalHeight * sc;
      ctx.drawImage(portrait, (W-pw)/2, 0, pw, ph); // horizontally centred, top-aligned
    }

    // ── Top dark gradient (HUD legibility) — matches CSS gradient on top HUD ──
    const topG = ctx.createLinearGradient(0,0,0,H*0.17);
    topG.addColorStop(0,"rgba(0,0,0,0.72)"); topG.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=topG; ctx.fillRect(0,0,W,H*0.17);

    // ── Bottom glass overlay — exactly matches on-screen CSS:
    //    linear-gradient(to top, rgba(5,5,10,0.98) 0%, 0.92 42%, 0.55 70%, transparent 100%)
    //    overlay height = padTop(H*0.14) + content + padBottom(H*0.025)
    //    = 83 + ~129 + 15 = 227px  → panel starts at H-227 = 369
    const PANEL_H = Math.round(H * 0.38); // 226px
    const PANEL_Y = H - PANEL_H;          // 370
    const botG = ctx.createLinearGradient(0, H, 0, PANEL_Y); // bottom → panel top
    botG.addColorStop(0,    "rgba(5,5,10,0.98)");
    botG.addColorStop(0.42, "rgba(5,5,10,0.92)");
    botG.addColorStop(0.70, "rgba(5,5,10,0.55)");
    botG.addColorStop(1,    "rgba(5,5,10,0)");
    ctx.fillStyle=botG; ctx.fillRect(0, PANEL_Y, W, PANEL_H);

    // ── TOP HUD (token ID left, tier badge right) ──
    // Mirrors: padding W*0.038 top, W*0.048 sides
    const HUD_Y  = Math.round(W * 0.038); // ~16
    const HUD_MID = HUD_Y + Math.round(W * 0.032); // vertical mid ~29

    ctx.font=`${Math.round(W*0.034)}px "${M}","Arial"`; ctx.fillStyle="rgba(255,255,255,0.82)";
    ctx.textAlign="left"; ctx.textBaseline="middle";
    ctx.fillText(`GVC #${card.tokenId}`, PAD, HUD_MID);

    const tierTxt = card.tier.toUpperCase();
    ctx.font=`900 ${Math.round(W*0.032)}px "${B}","Impact"`;
    const tierTW = ctx.measureText(tierTxt).width;
    const BADGE_W = tierTW + 18, BADGE_H = Math.round(W*0.068);
    const BADGE_X = W - BADGE_W - PAD, BADGE_Y_TOP = HUD_Y - 2;
    rr(BADGE_X, BADGE_Y_TOP, BADGE_W, BADGE_H, 5);
    ctx.fillStyle=tc.border+"28"; ctx.fill();
    ctx.strokeStyle=tc.border; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle=tc.border; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(tierTxt, BADGE_X + BADGE_W/2, BADGE_Y_TOP + BADGE_H/2);

    // ── BOTTOM CONTENT — work from bottom upward, matching flex-column layout ──
    // Sizes proportional to W=420 (same as on-screen proportions)
    const GAP        = Math.round(H * 0.011); // 6–7px flex gap
    const PAD_BOT    = Math.round(H * 0.025); // 15px bottom padding
    const TOTAL_H    = Math.round(W * 0.026); // ~11px (font size for total text)
    const STAT_NUM_H = Math.round(W * 0.055); // ~23px  stat number font
    const STAT_LBL_H = Math.round(W * 0.022); // ~9px   stat label font
    const STAT_ROW_H = STAT_LBL_H + STAT_NUM_H + 2; // ~34px
    const BADGE_SZ   = Math.round(W * 0.095); // ~40px
    const ARCH_H     = Math.round(W * 0.065); // ~27px (shaka + text row height)
    const ARCH_FONT  = Math.round(W * 0.058); // ~24px

    // Baselines/tops from bottom
    const totalBaseline  = H - PAD_BOT;
    const statsNumBase   = totalBaseline  - GAP - STAT_NUM_H;
    const statsLblMid    = statsNumBase   - STAT_NUM_H - GAP - STAT_LBL_H / 2;
    const badgeTop       = statsLblMid    - STAT_LBL_H/2 - GAP - BADGE_SZ;
    const archTop        = badgeTop       - GAP - ARCH_H;
    const archBaseline   = archTop + Math.round(ARCH_H * 0.82); // text baseline within row

    // Total
    ctx.font=`${TOTAL_H}px "${M}","Arial"`; ctx.fillStyle="rgba(255,255,255,0.22)";
    ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.fillText(`TOTAL ${card.total}`, W/2, totalBaseline);

    // Stats — 4 equal columns, centred
    const COL_GAP = Math.round(W * 0.014);
    const COL_W   = (W - PAD*2 - COL_GAP*3) / 4;
    const colCX   = (i: number) => PAD + i*(COL_W + COL_GAP) + COL_W/2;

    const statLabels = ["RARITY","DRIP","ENERGY","AURA"] as const;
    const statVals   = [card.rarity, card.drip, card.energy, card.aura];
    statLabels.forEach((lbl, i) => {
      const cx = colCX(i);
      ctx.font=`${STAT_LBL_H}px "${M}","Arial"`; ctx.fillStyle="rgba(255,255,255,0.38)";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(lbl, cx, statsLblMid);
      ctx.font=`900 ${STAT_NUM_H}px "${B}","Impact"`; ctx.fillStyle=STAT_COLS[i];
      if(statVals[i]>=80){ ctx.shadowColor=STAT_COLS[i]; ctx.shadowBlur=10; }
      ctx.textBaseline="alphabetic"; ctx.fillText(String(statVals[i]), cx, statsNumBase);
      ctx.shadowBlur=0;
    });

    // Badges — clean circles, no border
    await Promise.allSettled(badges.slice(0,5).map(async(b,i)=>{
      const bi = await load(`https://goodvibesclub.ai/badges/${b}.webp`);
      if (bi.naturalWidth>0){
        ctx.save(); rr(PAD+i*(BADGE_SZ+4), badgeTop, BADGE_SZ, BADGE_SZ, 6); ctx.clip();
        ctx.drawImage(bi, PAD+i*(BADGE_SZ+4), badgeTop, BADGE_SZ, BADGE_SZ);
        ctx.restore();
      }
    }));

    // Shaka + archetype
    const shaka = await load("/shaka.png");
    const SK = Math.round(ARCH_H * 0.9);
    if (shaka.naturalWidth>0) ctx.drawImage(shaka, PAD, archTop + (ARCH_H-SK)/2, SK, SK);
    ctx.font=`900 ${ARCH_FONT}px "${B}","Impact"`; ctx.fillStyle=tc.border;
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    ctx.shadowColor=tc.border; ctx.shadowBlur=14;
    ctx.fillText(card.archetype.toUpperCase(), PAD + SK + 6, archBaseline);
    ctx.shadowBlur=0;

    ctx.restore(); // pop clip

    // ── Tier border (drawn outside clip) ──
    rr(1,1,W-2,H-2,17); ctx.strokeStyle=tc.border; ctx.lineWidth=2.5; ctx.stroke();

    const a = document.createElement("a"); a.download=`vibe-card-${card.tokenId}.png`; a.href=cv.toDataURL("image/png"); a.click();
  } catch(e){ console.error("Download failed",e); }
}

function ShowcaseCard({ card }: { card: BattleCard }) {
  const [flipped,   setFlipped]   = useState(false);
  const [tilt,      setTilt]      = useState({ x:0, y:0 });
  const [holo,      setHolo]      = useState({ x:50, y:50 });
  const [dragging,  setDragging]  = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError,  setImgError]  = useState(false);
  const drag = useRef({ sx:0, sy:0, tx:0, ty:0, moved:false, down:false });
  const badges = useMemo(() => getBadges(card.tokenId), [card.tokenId]);
  const tc = TIER_COLORS[card.tier];
  const W = typeof window !== "undefined" ? Math.min(300, window.innerWidth - 28) : 290;
  const H = Math.round(W * 1.42);

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx:e.clientX, sy:e.clientY, tx:tilt.x, ty:tilt.y, moved:false, down:true };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.sx, dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true;
    const r = e.currentTarget.getBoundingClientRect();
    setHolo({ x:((e.clientX-r.left)/r.width)*100, y:((e.clientY-r.top)/r.height)*100 });
    setTilt({ x:Math.max(-20,Math.min(20,drag.current.tx-dy*0.2)), y:Math.max(-28,Math.min(28,drag.current.ty+dx*0.35)) });
  };
  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false; setDragging(false);
    if (!drag.current.moved) { sfxClick(); setFlipped(f=>!f); }
    setTilt({ x:0, y:0 });
  };

  const totalRotY = (flipped ? 180 : 0) + tilt.y;
  const holoGrad = [
    `linear-gradient(${125+tilt.y*2.5+tilt.x*1.2}deg,`,
    `hsla(${(holo.x*3.6)%360},100%,65%,0) 0%,`,
    `hsla(${(holo.x*3.6+60)%360},100%,65%,0.26) 25%,`,
    `hsla(${(holo.x*3.6+120)%360},100%,65%,0.30) 50%,`,
    `hsla(${(holo.x*3.6+200)%360},100%,65%,0.22) 75%,`,
    `hsla(${(holo.x*3.6+280)%360},100%,65%,0) 100%)`,
  ].join("");
  const holoOp = Math.min(1, 0.12 + Math.sqrt(tilt.x**2+tilt.y**2)/26);

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}>
      <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.38)",margin:0,letterSpacing:"0.08em" }}>
        Drag to tilt · Tap to flip · ✨ holographic
      </p>
      <div style={{ perspective:1200 }}>
        <div
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          className="card-rotator"
          style={{ width:W, height:H, position:"relative",
            transform:`rotateX(${tilt.x}deg) rotateY(${totalRotY}deg)`,
            transition:dragging?"none":"transform 0.6s cubic-bezier(0.175,0.885,0.32,1.275)",
            cursor:dragging?"grabbing":"grab", userSelect:"none", touchAction:"none" }}
        >
          {/* ── FRONT ── */}
          <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:18,overflow:"hidden",
            background:"#080810", border:`2.5px solid ${tc.border}`,
            boxShadow:`0 0 0 1px ${tc.border}22, 0 0 50px ${tc.glow}, 0 28px 70px rgba(0,0,0,0.9)`,
            transform:"translateZ(0.01px)" }}>
            {/* Portrait — FULL BLEED fills entire card */}
            <div style={{ position:"absolute",inset:0 }}>
              {!imgLoaded&&!imgError&&(
                <div style={{ position:"absolute",inset:0,background:"#0d0d1e",display:"flex",alignItems:"center",justifyContent:"center" }}>
                  <div className="gvc-spinner" style={{ width:24,height:24,border:`2px solid ${tc.border}`,borderTopColor:"transparent" }}/>
                </div>
              )}
              {imgError&&<FallbackArt id={card.tokenId}/>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/portrait/${card.tokenId}`} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",display:imgLoaded?"block":"none" }}
                onLoad={()=>setImgLoaded(true)} onError={()=>setImgError(true)}/>
            </div>
            {/* Top HUD — floats over portrait */}
            <div style={{ position:"absolute",top:0,left:0,right:0,zIndex:6,
              background:"linear-gradient(to bottom,rgba(0,0,0,0.72) 0%,transparent 100%)",
              padding:`${W*0.038}px ${W*0.048}px`,
              display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontFamily:"var(--font-mundial)",fontSize:W*0.034,color:"rgba(255,255,255,0.8)",letterSpacing:"0.06em" }}>GVC #{card.tokenId}</span>
              <div style={{ padding:`${W*0.013}px ${W*0.038}px`,borderRadius:5,background:`${tc.border}28`,border:`1px solid ${tc.border}`,fontFamily:"var(--font-brice)",fontSize:W*0.032,fontWeight:900,color:tc.border,textTransform:"uppercase",letterSpacing:"0.07em",textShadow:`0 0 10px ${tc.glow}` }}>
                {card.tier}
              </div>
            </div>
            {/* Bottom glass overlay — floats over portrait */}
            <div style={{ position:"absolute",bottom:0,left:0,right:0,zIndex:6,
              background:"linear-gradient(to top,rgba(5,5,10,0.98) 0%,rgba(5,5,10,0.92) 42%,rgba(5,5,10,0.55) 70%,transparent 100%)",
              padding:`${H*0.14}px ${W*0.05}px ${H*0.025}px`,
              display:"flex",flexDirection:"column",gap:H*0.011 }}>
              {/* Archetype + shaka */}
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shaka.png" alt="" style={{ width:W*0.065,height:W*0.065,filter:`drop-shadow(0 0 5px ${tc.glow})`,flexShrink:0 }}/>
                <p style={{ fontFamily:"var(--font-brice)",fontSize:W*0.058,fontWeight:900,color:tc.border,textTransform:"uppercase",letterSpacing:"0.02em",textShadow:`0 0 20px ${tc.glow}`,lineHeight:1.0,margin:0 }}>{card.archetype}</p>
              </div>
              {/* Badges — NO border, no box, just images */}
              <div style={{ display:"flex",gap:4 }}>
                {badges.map(b=>(
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={b} src={`https://goodvibesclub.ai/badges/${b}.webp`} alt={b} style={{ width:W*0.095,height:W*0.095,borderRadius:5 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                ))}
              </div>
              {/* Stats — clean, no box borders */}
              <div style={{ display:"flex",gap:W*0.014 }}>
                {(["RARITY","DRIP","ENERGY","AURA"] as RoundStat[]).map((stat,i)=>{
                  const val=[card.rarity,card.drip,card.energy,card.aura][i];
                  const col=STAT_COLORS[stat];
                  return (
                    <div key={stat} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0 }}>
                      <span style={{ fontFamily:"var(--font-mundial)",fontSize:W*0.022,color:"rgba(255,255,255,0.38)",letterSpacing:"0.07em",textTransform:"uppercase" }}>{STAT_LABELS[stat]}</span>
                      <span style={{ fontFamily:"var(--font-brice)",fontSize:W*0.055,fontWeight:900,color:col,textShadow:val>=80?`0 0 12px ${col}`:"none",lineHeight:1.1 }}>{val}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontFamily:"var(--font-mundial)",fontSize:W*0.024,color:"rgba(255,255,255,0.2)",letterSpacing:"0.06em",textAlign:"center",margin:0 }}>
                TOTAL {card.total}
              </p>
            </div>
            {/* Holographic overlay */}
            <div style={{ position:"absolute",inset:0,zIndex:10,pointerEvents:"none",background:holoGrad,mixBlendMode:"color-dodge" as React.CSSProperties["mixBlendMode"],opacity:holoOp }}/>
            <div className="card-shimmer" style={{ position:"absolute",inset:0,zIndex:11,pointerEvents:"none" }}/>
          </div>
          {/* ── BACK ── */}
          <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:18,overflow:"hidden",
            background:"linear-gradient(160deg,#08001a,#14002e,#060012)",
            border:`2.5px solid ${tc.border}`,boxShadow:`0 0 40px ${tc.glow},0 24px 60px rgba(0,0,0,0.85)`,
            transform:"rotateY(180deg) translateZ(0.01px)",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14 }}>
            <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,0.022) 0,rgba(255,224,72,0.022) 1px,transparent 0,transparent 50%)",backgroundSize:"14px 14px" }}/>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:W*0.42,height:W*0.42,filter:"drop-shadow(0 0 22px rgba(255,224,72,0.75))",position:"relative",zIndex:1 }}/>
            <p style={{ fontFamily:"var(--font-brice)",fontSize:W*0.1,fontWeight:900,color:"#FFE048",textTransform:"uppercase",letterSpacing:"0.08em",textShadow:"0 0 30px rgba(255,224,72,0.85)",position:"relative",zIndex:1,textAlign:"center",lineHeight:1.1,margin:0 }}>GVC<br/>VIBE<br/>CARD</p>
            <div style={{ padding:`${W*0.015}px ${W*0.042}px`,borderRadius:20,border:`1px solid ${tc.border}`,background:`${tc.border}14`,position:"relative",zIndex:1 }}>
              <p style={{ fontFamily:"var(--font-brice)",fontSize:W*0.034,fontWeight:900,color:tc.border,margin:0,letterSpacing:"0.1em" }}>#{card.tokenId} · {card.tier}</p>
            </div>
            <p style={{ fontFamily:"var(--font-mundial)",fontSize:W*0.03,color:"rgba(255,255,255,0.22)",letterSpacing:"0.14em",position:"relative",zIndex:1,margin:0 }}>TAP TO FLIP</p>
          </div>
        </div>
      </div>
      {/* Download */}
      <motion.button onClick={()=>downloadShowcaseCard(card,badges)} whileTap={{ scale:0.93 }}
        style={{ padding:"9px 22px",background:"rgba(255,255,255,0.07)",border:"1.5px solid rgba(255,255,255,0.2)",borderRadius:10,color:"rgba(255,255,255,0.75)",fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em",cursor:"pointer" }}>
        ↓ DOWNLOAD CARD
      </motion.button>
    </div>
  );
}

// ─── PACK REVEAL ──────────────────────────────────────────────────────────────

const PACK_W = 270;
const PACK_H = 380;
const TAB_H  = 70;

function PacketReveal({ onOpened }: { onOpened: () => void }) {
  const [phase,   setPhase]   = useState<"idle"|"tearing"|"exploding">("idle");
  const [cutPct,  setCutPct]  = useState(0);
  const [shake,   setShake]   = useState(0);
  const live     = useRef({ cutPct: 0, phase: "idle" as "idle"|"tearing"|"exploding", down: false, startX: 0, startPct: 0 });
  const lastSnip = useRef(0);
  const called   = useRef(false);

  live.current.cutPct = cutPct;
  live.current.phase  = phase;

  const cutX = cutPct * PACK_W;

  useEffect(() => {
    if (cutPct >= 1 && phase === "tearing") {
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

  const tabFace = (
    <>
      <div style={{ position:"absolute",inset:0, background:"linear-gradient(135deg,#2d0b5e 0%,#1e0840 35%,#3d1a00 70%,#4a2200 100%)" }} />
      <div style={{
        position:"absolute", inset:0,
        backgroundImage:"url('/shaka.png')",
        backgroundSize:"22px 22px",
        backgroundRepeat:"repeat",
        opacity:0.18,
        filter:"sepia(1) saturate(4) hue-rotate(3deg) brightness(1.4)",
      }} />
      <div style={{
        position:"absolute",inset:0,
        background:"radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255,224,72,0.12) 0%, rgba(0,0,0,0.35) 100%)",
        pointerEvents:"none",
      }} />
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:goldH }} />
      <div style={{ position:"absolute",top:0,bottom:0,left:0,width:2,background:goldV }} />
      <div style={{ position:"absolute",top:0,bottom:0,right:0,width:2,background:goldV }} />
    </>
  );

  return (
    <>
      <motion.div
        key={shake}
        animate={tearing ? { x: [0, -2, 3, -2, 1, 0] } : {}}
        transition={{ duration: 0.16, ease: "easeOut" }}
        style={{ position:"relative", width:PACK_W, height:PACK_H, userSelect:"none", touchAction:"none" }}
      >
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

        {!exploding && <div style={{
          position:"absolute", top: TAB_H - 1, left:0, right:0, height:12,
          zIndex:5, pointerEvents:"none",
        }}>
          <div style={{
            position:"absolute", top:5, left:0, right:0, height:1,
            background:"repeating-linear-gradient(90deg,rgba(255,224,72,0.5) 0,rgba(255,224,72,0.5) 5px,transparent 5px,transparent 10px)",
          }} />
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

        <motion.div
          animate={exploding ? { y: 320, opacity: 0, scale: 0.55 } : {}}
          transition={exploding ? { duration: 0.55, ease:[0.4,0,1,1], delay: 0.05 } : {}}
          style={{
            position:"absolute", top: TAB_H, left:0,
            width:PACK_W, height: PACK_H - TAB_H,
            borderRadius:"0 0 12px 12px", overflow:"hidden",
            background:"linear-gradient(155deg,#2d0b5e 0%,#1e0840 35%,#3d1a00 70%,#4a2200 100%)",
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

// ─── SCREEN 1: HOME ───────────────────────────────────────────────────────────

function HomeScreen({ onPackRip, onBattle }: { onPackRip: () => void; onBattle: () => void }) {
  const [floorEth, setFloorEth] = useState<number | null>(null);

  useEffect(() => {
    fetch("https://api-hazel-pi-72.vercel.app/api/stats")
      .then(r => r.json())
      .then(d => { if (typeof d.floorPrice === "number") setFloorEth(d.floorPrice); })
      .catch(() => {});
  }, []);

  return (
    <div className="vb-bg" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <FloatingCards />
      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px 90px",
        textAlign: "center",
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/shaka.png"
            alt="Shaka"
            width={80}
            height={80}
            className="shaka-idle"
            style={{ filter: "drop-shadow(0 0 20px rgba(255,224,72,0.8))" }}
          />
        </motion.div>

        <motion.h1
          className="shimmer-title"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          style={{
            fontFamily: "var(--font-brice)",
            fontSize: "clamp(52px, 12vw, 96px)",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            margin: "12px 0 6px",
          }}
        >
          VIBE BATTLE
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          style={{
            color: "rgba(255,255,255,0.6)",
            fontSize: 16,
            fontFamily: "var(--font-mundial)",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          Your GVC. Your Stats. Your Glory.
        </motion.p>

        {/* Floor price pill */}
        <AnimatePresence>
          {floorEth !== null && (
            <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.18 }}
              style={{ marginTop:14 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(116,215,247,0.12)",border:"1px solid rgba(116,215,247,0.3)",borderRadius:20,padding:"5px 14px",fontFamily:"var(--font-mundial)",fontSize:13,color:C.sky,letterSpacing:"0.04em" }}>
                {/* Ethereum diamond */}
                <svg width="10" height="16" viewBox="0 0 10 16" fill={C.sky}><polygon points="5,0 10,8 5,16 0,8"/><polygon points="5,0 10,8 5,10 0,8" opacity="0.6"/></svg>
                {floorEth.toFixed(3)} ETH Floor
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main buttons */}
        <motion.div initial={{ opacity:0,y:24 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.5,delay:0.22 }}
          style={{ marginTop:36,display:"flex",gap:14,flexWrap:"wrap",justifyContent:"center" }}>
          <motion.button onClick={() => { sfxClick(); onPackRip(); }} whileTap={{ scale:0.95 }} whileHover={{ scale:1.04 }}
            style={{ background:"linear-gradient(135deg,#ff6b8a,#ffb347)",color:"#0f0f1e",fontFamily:"var(--font-brice)",fontSize:20,fontWeight:900,padding:"16px 32px",borderRadius:16,border:"none",letterSpacing:"0.04em",boxShadow:"0 8px 32px rgba(255,107,138,0.45)",cursor:"pointer" }}>
            🎴 RIP A PACK
          </motion.button>
          <motion.button onClick={() => { sfxClick(); onBattle(); }} whileTap={{ scale:0.95 }} whileHover={{ scale:1.04 }}
            style={{ background:"linear-gradient(135deg,#c084fc,#74d7f7)",color:"#0f0f1e",fontFamily:"var(--font-brice)",fontSize:20,fontWeight:900,padding:"16px 32px",borderRadius:16,border:"none",letterSpacing:"0.04em",boxShadow:"0 8px 32px rgba(192,132,252,0.45)",cursor:"pointer" }}>
            ⚔️ BATTLE
          </motion.button>
        </motion.div>

        <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
          style={{ marginTop:48,fontSize:12,color:"rgba(255,255,255,0.25)",fontFamily:"var(--font-mundial)" }}>
          Built by @imaesr for the GVC Vibeathon 🤙
        </motion.p>
      </div>
    </div>
  );
}

// ─── SCREEN 2: PACK RIP ───────────────────────────────────────────────────────

function PackRipScreen({
  onBattle,
  onRipAgain,
  onHome,
}: {
  onBattle: (card: BattleCard) => void;
  onRipAgain: () => void;
  onHome: () => void;
}) {
  const [tokenInput,   setTokenInput]   = useState("");
  const [previewCard,  setPreviewCard]  = useState<BattleCard | null>(null);
  const [packRevealed, setPackRevealed] = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);

  const generateCard = useCallback((id: number) => {
    setPreviewCard(generateBattleCard(id));
    setPackRevealed(false);
    setShowBurst(false);
  }, []);

  const onGenerate = () => {
    const id = parseInt(tokenInput.trim(), 10);
    if (isNaN(id) || id < 0 || id > 6968) return;
    sfxClick();
    generateCard(id);
  };

  const onRandom = () => {
    sfxClick();
    const card = randomCard();
    setTokenInput(String(card.tokenId));
    setPreviewCard(card);
    setPackRevealed(false);
    setShowBurst(false);
  };

  const onPackOpened = useCallback(() => {
    setPackRevealed(true);
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 2000);
    recordPack(); // track packs ripped
  }, []);

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: "rgba(10,8,20,0.97)",
    }}>
      {/* Pack rip background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/GVC Pack Rip.png" alt="" aria-hidden style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        opacity: 0.18, pointerEvents: "none", zIndex: 0,
      }}/>
      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px 90px", maxWidth: 520, margin: "0 auto" }}>
        {/* Back */}
        <motion.button
          onClick={() => { sfxClick(); onHome(); }}
          whileTap={{ scale: 0.93 }}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.5)", padding: "8px 16px", borderRadius: 10,
            fontFamily: "var(--font-mundial)", fontSize: 13, cursor: "pointer",
            marginBottom: 24,
          }}
        >
          ← HOME
        </motion.button>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "var(--font-brice)", fontSize: 36, fontWeight: 900,
            background: "linear-gradient(135deg, #ff6b8a, #ffb347)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 24px", textTransform: "uppercase", letterSpacing: "0.04em",
          }}
        >
          RIP A PACK 🎴
        </motion.h2>

        {/* Wallet connect */}
        <div style={{ marginBottom: 20 }}>
          <WalletConnect onSelectToken={id => { sfxClick(); setTokenInput(String(id)); generateCard(id); }} />
        </div>

        {/* Input row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 32, flexWrap: "wrap" }}>
          <input
            type="number" min="0" max="6968"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") onGenerate(); }}
            placeholder="Token ID (0–6968)"
            style={{
              flex: 1, minWidth: 120,
              padding: "12px 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10, color: "#fff",
              fontFamily: "var(--font-mundial)", fontSize: 14,
              outline: "none",
            }}
          />
          <motion.button
            onClick={onGenerate}
            whileTap={{ scale: 0.93 }}
            style={{
              padding: "12px 20px", background: C.lavender, color: "#0f0f1e",
              border: "none", borderRadius: 10,
              fontFamily: "var(--font-brice)", fontSize: 14, fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Generate
          </motion.button>
          <motion.button
            onClick={onRandom}
            whileTap={{ scale: 0.93 }}
            style={{
              padding: "12px 16px", background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff", borderRadius: 10,
              fontFamily: "var(--font-mundial)", fontSize: 14, cursor: "pointer",
            }}
          >
            🎲 Random
          </motion.button>
        </div>

        {/* Pack / Card area */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <AnimatePresence mode="wait">
            {previewCard && !packRevealed && (
              <motion.div
                key={`pack-${previewCard.tokenId}`}
                initial={{ opacity: 0, scale: 0.88, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -30 }}
                transition={{ type: "spring", stiffness: 240, damping: 24 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
              >
                <PacketReveal onOpened={onPackOpened} />
              </motion.div>
            )}

            {previewCard && packRevealed && (
              <motion.div
                key={`card-${previewCard.tokenId}`}
                initial={{ opacity: 0, scale: 0.82, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.82, y: -20 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}
              >
                <div style={{ position: "relative" }}>
                  {showBurst && (
                    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible", zIndex: 20 }}>
                      {Array.from({ length: 20 }, (_, i) => {
                        const angle = (i / 20) * 360;
                        const dist = 120 + Math.random() * 80;
                        const rad = angle * Math.PI / 180;
                        return (
                          <motion.div
                            key={i}
                            style={{
                              position: "absolute", left: "50%", top: "50%",
                              width: 6, height: 6, borderRadius: "50%", marginLeft: -3, marginTop: -3,
                              background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                            }}
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, opacity: 0, scale: 0 }}
                            transition={{ duration: 1 + Math.random() * 0.5, ease: [0.23, 1, 0.32, 1] }}
                          />
                        );
                      })}
                    </div>
                  )}
                  <ShowcaseCard card={previewCard} />
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                  <motion.button
                    onClick={() => { sfxClick(); onBattle(previewCard); }}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      padding: "14px 28px", background: "linear-gradient(135deg, #c084fc, #74d7f7)",
                      color: "#0f0f1e", border: "none", borderRadius: 14,
                      fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
                      cursor: "pointer", letterSpacing: "0.04em",
                    }}
                  >
                    ⚔️ Battle with this card
                  </motion.button>
                  <motion.button
                    onClick={() => { sfxClick(); onRipAgain(); setPreviewCard(null); setTokenInput(""); setPackRevealed(false); }}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      padding: "14px 28px",
                      background: "transparent",
                      border: `2px solid ${C.coral}`,
                      color: C.coral, borderRadius: 14,
                      fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
                      cursor: "pointer", letterSpacing: "0.04em",
                    }}
                  >
                    🎴 Rip another
                  </motion.button>
                </div>
              </motion.div>
            )}

            {!previewCard && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)", textAlign: "center" }}
              >
                Enter a token ID or click Random to rip a pack
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 3: BATTLE SETUP ───────────────────────────────────────────────────

function BattleSetupScreen({
  initialCard,
  onStart,
  onHome,
}: {
  initialCard?: BattleCard;
  onStart: (p1: BattleCard[], p2: BattleCard[], mode: BattleMode) => void;
  onHome: () => void;
}) {
  const [p1Slots, setP1Slots] = useState<(BattleCard | null)[]>(() => {
    const arr: (BattleCard | null)[] = Array(5).fill(null);
    if (initialCard) arr[0] = initialCard;
    return arr;
  });
  const [p2Slots, setP2Slots] = useState<(BattleCard | null)[]>(Array(5).fill(null));
  const [mode, setMode] = useState<BattleMode>("VS_CPU");
  const [activeSlot, setActiveSlot] = useState<{ player: 1 | 2; idx: number } | null>(null);
  const [slotInput, setSlotInput] = useState("");

  const p1Complete = p1Slots.every(c => c !== null);
  const p2Complete = p2Slots.every(c => c !== null);
  const canStart = p1Complete && (mode === "VS_CPU" || p2Complete);

  const fillSlot = (player: 1 | 2, idx: number, card: BattleCard) => {
    if (player === 1) {
      setP1Slots(prev => { const n = [...prev]; n[idx] = card; return n; });
    } else {
      setP2Slots(prev => { const n = [...prev]; n[idx] = card; return n; });
    }
    setActiveSlot(null);
    setSlotInput("");
  };

  const removeSlot = (player: 1 | 2, idx: number) => {
    if (player === 1) setP1Slots(prev => { const n = [...prev]; n[idx] = null; return n; });
    else setP2Slots(prev => { const n = [...prev]; n[idx] = null; return n; });
    setActiveSlot(null);
  };

  const handleAddCard = () => {
    if (!activeSlot) return;
    const id = parseInt(slotInput.trim(), 10);
    if (isNaN(id) || id < 0 || id > 6968) return;
    sfxCardPlay();
    fillSlot(activeSlot.player, activeSlot.idx, generateBattleCard(id));
  };

  const handleRandom = () => {
    if (!activeSlot) return;
    sfxCardPlay();
    fillSlot(activeSlot.player, activeSlot.idx, randomCard());
  };

  // WalletConnect onSelectToken fills next empty P1 slot
  const onSelectToken = useCallback((id: number) => {
    setP1Slots(prev => {
      const n = [...prev];
      const emptyIdx = n.findIndex(c => c === null);
      if (emptyIdx !== -1) { n[emptyIdx] = generateBattleCard(id); sfxCardPlay(); }
      return n;
    });
  }, []);

  const handleStart = () => {
    if (!canStart) return;
    sfxClick();
    const p1 = p1Slots.filter(Boolean) as BattleCard[];
    const p2 = mode === "VS_CPU" ? generateCpuDeck() : (p2Slots.filter(Boolean) as BattleCard[]);
    onStart(p1, p2, mode);
  };

  const renderSlots = (player: 1 | 2, slots: (BattleCard | null)[]) => (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
      {slots.map((card, idx) => {
        const isActive = activeSlot?.player === player && activeSlot?.idx === idx;
        if (card) {
          return (
            <div key={idx} style={{ position: "relative" }}>
              <BattleCardMini
                card={card}
                selected={isActive}
                onSelect={() => { sfxClick(); setActiveSlot({ player, idx }); setSlotInput(""); }}
              />
            </div>
          );
        }
        return (
          <motion.div
            key={idx}
            onClick={() => { sfxClick(); setActiveSlot({ player, idx }); setSlotInput(""); }}
            whileTap={{ scale: 0.93 }}
            style={{
              width: 64, height: 88, borderRadius: 10, flexShrink: 0,
              border: isActive
                ? `2px solid ${C.sunshine}`
                : "2px dashed rgba(255,255,255,0.2)",
              background: isActive ? "rgba(255,224,72,0.06)" : "rgba(255,255,255,0.03)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.3)", fontSize: 22,
            }}
          >
            +
          </motion.div>
        );
      })}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: "rgba(10,8,22,0.97)" }}>
      {/* Pre-battle background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/GVC PreBattle.png" alt="" aria-hidden style={{ position:"fixed",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center",opacity:0.18,pointerEvents:"none",zIndex:0 }}/>
      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px 90px", maxWidth: 600, margin: "0 auto" }}>
        {/* Back */}
        <motion.button
          onClick={() => { sfxClick(); onHome(); }}
          whileTap={{ scale: 0.93 }}
          style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.5)", padding: "8px 16px", borderRadius: 10,
            fontFamily: "var(--font-mundial)", fontSize: 13, cursor: "pointer", marginBottom: 24,
          }}
        >
          ← HOME
        </motion.button>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            fontFamily: "var(--font-brice)", fontSize: 30, fontWeight: 900,
            color: C.sunshine, margin: "0 0 24px",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}
        >
          BUILD YOUR DECK ⚔️
        </motion.h2>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {([
            { m: "VS_CPU"        as BattleMode, label: "VS CPU 🤖",      grad: "linear-gradient(135deg,#c084fc,#74d7f7)" },
            { m: "PASS_AND_PLAY" as BattleMode, label: "PASS & PLAY 👥", grad: "linear-gradient(135deg,#ff6b8a,#ffb347)" },
          ]).map(({ m, label, grad }) => (
            <motion.button key={m} onClick={() => { sfxClick(); setMode(m); }} whileTap={{ scale:0.93 }}
              style={{ padding:"10px 20px",borderRadius:20,border:mode===m?"none":"1px solid rgba(255,255,255,0.2)",
                background:mode===m?grad:"transparent",color:mode===m?"#0f0f1e":"rgba(255,255,255,0.5)",
                fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,cursor:"pointer",letterSpacing:"0.04em" }}>
              {label}
            </motion.button>
          ))}
        </div>

        {/* P1 Deck */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8 }}>
            <p style={{ fontFamily:"var(--font-brice)",fontSize:14,fontWeight:900,color:C.sky,margin:0,textTransform:"uppercase",letterSpacing:"0.08em" }}>
              YOUR DECK ({p1Slots.filter(Boolean).length}/5)
            </p>
            <div style={{ display:"flex",gap:8 }}>
              <motion.button
                onClick={() => {
                  sfxClick();
                  const ids = new Set<number>();
                  while(ids.size < 5) ids.add(Math.floor(Math.random()*6969));
                  setP1Slots([...ids].map(id => generateBattleCard(id)));
                  setActiveSlot(null);
                }}
                whileTap={{ scale:0.93 }}
                style={{ padding:"6px 14px",background:"linear-gradient(135deg,#FFE048,#ff9b6b)",color:"#0f0f1e",border:"none",borderRadius:10,fontFamily:"var(--font-brice)",fontSize:12,fontWeight:900,cursor:"pointer",letterSpacing:"0.04em" }}>
                ⚡ Fill 5 Random
              </motion.button>
              {p1Slots.some(Boolean) && (
                <motion.button
                  onClick={() => { sfxClick(); setP1Slots(Array(5).fill(null)); setActiveSlot(null); }}
                  whileTap={{ scale:0.93 }}
                  style={{ padding:"6px 12px",background:"rgba(255,107,138,0.1)",border:"1px solid rgba(255,107,138,0.3)",borderRadius:10,fontFamily:"var(--font-mundial)",fontSize:11,color:C.coral,cursor:"pointer" }}>
                  Clear
                </motion.button>
              )}
            </div>
          </div>
          {renderSlots(1, p1Slots)}
        </div>

        {/* Active slot input */}
        <AnimatePresence>
          {activeSlot && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                overflow: "hidden", marginBottom: 16,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12, padding: "14px",
              }}
            >
              <p style={{ fontFamily: "var(--font-mundial)", fontSize: 12,
                color: "rgba(255,255,255,0.5)", margin: "0 0 10px" }}>
                {activeSlot.player === 1 ? "Player 1" : "Player 2"} — Slot {activeSlot.idx + 1}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mundial)", fontSize: 14 }}>#</span>
                  <input
                    type="number" min="0" max="6968"
                    value={slotInput}
                    onChange={e => setSlotInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAddCard(); }}
                    placeholder="0–6968"
                    style={{
                      flex: 1, padding: "9px 12px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 8, color: "#fff",
                      fontFamily: "var(--font-mundial)", fontSize: 14, outline: "none",
                    }}
                  />
                </div>
                <motion.button
                  onClick={handleAddCard}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    padding: "9px 16px", background: C.mint, color: "#0f0f1e",
                    border: "none", borderRadius: 8,
                    fontFamily: "var(--font-brice)", fontSize: 13, fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Add Card
                </motion.button>
                <motion.button
                  onClick={handleRandom}
                  whileTap={{ scale: 0.93 }}
                  style={{
                    padding: "9px 14px", background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    color: "#fff", borderRadius: 8,
                    fontFamily: "var(--font-mundial)", fontSize: 13, cursor: "pointer",
                  }}
                >
                  🎲 Random
                </motion.button>
                {activeSlot && (activeSlot.player === 1 ? p1Slots : p2Slots)[activeSlot.idx] !== null && (
                  <motion.button
                    onClick={() => { sfxClick(); removeSlot(activeSlot.player, activeSlot.idx); }}
                    whileTap={{ scale: 0.93 }}
                    style={{
                      padding: "9px 14px", background: "rgba(255,60,60,0.12)",
                      border: "1px solid rgba(255,100,100,0.3)",
                      color: C.coral, borderRadius: 8,
                      fontFamily: "var(--font-mundial)", fontSize: 13, cursor: "pointer",
                    }}
                  >
                    Remove
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wallet connect */}
        <div style={{ marginBottom: 24 }}>
          <WalletConnect onSelectToken={onSelectToken} />
        </div>

        {/* P2 Deck (Pass & Play) */}
        <AnimatePresence>
          {mode === "PASS_AND_PLAY" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 24 }}
            >
              <p style={{ fontFamily: "var(--font-brice)", fontSize: 14, fontWeight: 900,
                color: C.coral, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                PLAYER 2 DECK ({p2Slots.filter(Boolean).length}/5)
              </p>
              {renderSlots(2, p2Slots)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start button */}
        <motion.button
          onClick={handleStart}
          whileTap={canStart ? { scale: 0.95 } : {}}
          disabled={!canStart}
          style={{
            width: "100%", padding: "18px",
            background: canStart
              ? "linear-gradient(135deg, #ff6b8a, #ffb347)"
              : "rgba(255,255,255,0.08)",
            color: canStart ? "#0f0f1e" : "rgba(255,255,255,0.25)",
            border: "none", borderRadius: 16,
            fontFamily: "var(--font-brice)", fontSize: 20, fontWeight: 900,
            cursor: canStart ? "pointer" : "default",
            letterSpacing: "0.04em",
            boxShadow: canStart ? "0 8px 32px rgba(255,107,138,0.4)" : "none",
            transition: "all 0.2s",
          }}
        >
          {canStart ? "LET'S BATTLE ⚔️" : `Fill all ${mode === "VS_CPU" ? "5" : "10"} slots to start`}
        </motion.button>

        {!p1Complete && (
          <p style={{ textAlign: "center", marginTop: 10, fontSize: 12,
            color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)" }}>
            Quick fill: click a slot, hit 🎲 Random five times
          </p>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 4: BATTLE ARENA ───────────────────────────────────────────────────

function BattleArenaScreen({
  p1Deck,
  p2Deck,
  mode,
  onEnd,
  onHome,
}: {
  p1Deck: BattleCard[];
  p2Deck: BattleCard[];
  mode: BattleMode;
  onEnd: (result: BattleResult) => void;
  onHome: () => void;
}) {
  const [phase, setPhase]               = useState<ArenaPhase>("CHOOSE");
  const [p1Hand, setP1Hand]             = useState<BattleCard[]>([...p1Deck]);
  const [p2Hand, setP2Hand]             = useState<BattleCard[]>([...p2Deck]);
  const [p1Played, setP1Played]         = useState<BattleCard | null>(null);
  const [p2Played, setP2Played]         = useState<BattleCard | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [roundWinner, setRoundWinner]   = useState<RoundResult | null>(null);
  const [shaking, setShaking]           = useState(false);
  const [cpuDots, setCpuDots]           = useState(0);

  const currentStat = ROUND_STATS[currentRound];
  const p1Score = roundResults.filter(r => r === "P1").length;
  const p2Score = roundResults.filter(r => r === "P2").length;

  // CPU thinking dots
  useEffect(() => {
    if (phase !== "CPU_THINKING") return;
    const iv = setInterval(() => setCpuDots(d => (d + 1) % 4), 350);
    return () => clearInterval(iv);
  }, [phase]);

  const resolveRound = useCallback((p1Card: BattleCard, p2Card: BattleCard) => {
    const result = compareCards(p1Card, p2Card, currentStat);
    setShaking(true);
    setTimeout(() => setShaking(false), 380);
    sfxClash();
    // Haptic feedback on supported devices
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([80,30,80]);
    if (result === "P1") sfxRoundWin();
    else if (result === "P2") sfxRoundLose();
    setRoundWinner(result);
    setRoundResults(prev => {
      const next = [...prev, result];
      setPhase("RESULT");
      const nextRound = currentRound + 1;
      setTimeout(() => {
        if (nextRound >= 5) {
          const p1Final = next.filter(r => r === "P1").length;
          const p2Final = next.filter(r => r === "P2").length;
          const winner: "P1" | "P2" | "DRAW" =
            p1Final > p2Final ? "P1" : p2Final > p1Final ? "P2" : "DRAW";
          if (winner === "P1") sfxVictory();
          const bestCard = [...p1Deck].sort((a, b) => b.total - a.total)[0];
          onEnd({ winner, p1Score: p1Final, p2Score: p2Final, roundResults: next, p1BestCard: bestCard });
        } else {
          setCurrentRound(nextRound);
          setP1Played(null);
          setP2Played(null);
          setRoundWinner(null);
          setPhase("CHOOSE");
        }
      }, 2200);
      return next;
    });
  }, [currentStat, currentRound, p1Deck, onEnd]);

  const playCard = useCallback((card: BattleCard) => {
    sfxCardPlay();
    setP1Hand(prev => prev.filter(c => c.tokenId !== card.tokenId));
    setP1Played(card);

    if (mode === "VS_CPU") {
      setPhase("CPU_THINKING");
      setTimeout(() => {
        setP2Hand(prev => {
          if (prev.length === 0) return prev;
          const cpuCard = prev[Math.floor(Math.random() * prev.length)];
          const nextHand = prev.filter(c => c.tokenId !== cpuCard.tokenId);
          setP2Played(cpuCard);
          setPhase("REVEAL");
          setTimeout(() => resolveRound(card, cpuCard), 800);
          return nextHand;
        });
      }, 1500);
    } else {
      setPhase("PASS_TO_P2");
    }
  }, [mode, resolveRound]);

  const playCardP2 = useCallback((card: BattleCard) => {
    sfxCardPlay();
    setP2Hand(prev => prev.filter(c => c.tokenId !== card.tokenId));
    setP2Played(card);
    setPhase("REVEAL");
    setTimeout(() => resolveRound(p1Played!, card), 800);
  }, [p1Played, resolveRound]);

  // BG color based on score
  const bgColor = p1Score > p2Score
    ? "linear-gradient(180deg, #0a1540, #0f0f2e)"
    : p2Score > p1Score
    ? "linear-gradient(180deg, #2a0a20, #1a0a18)"
    : "linear-gradient(180deg, #1a0340, #0f0f1e)";

  const roundResultIcon = (r: RoundResult) =>
    r === "P1" ? { bg: C.mint, label: "W" }
    : r === "P2" ? { bg: C.coral, label: "L" }
    : { bg: "rgba(255,255,255,0.3)", label: "D" };

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: bgColor, transition: "background 0.6s",
    }}>
      {/* Battle background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/GVC Card Battle.png" alt="" aria-hidden style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", objectPosition: "center",
        opacity: 0.2, pointerEvents: "none", zIndex: 0,
      }}/>
      {/* PASS TO P2 overlay */}
      <AnimatePresence>
        {phase === "PASS_TO_P2" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.92)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 24,
            }}
          >
            <div style={{ fontSize: 48 }}>🙈</div>
            <h3 style={{
              fontFamily: "var(--font-brice)", fontSize: 28, fontWeight: 900,
              color: C.sunshine, margin: 0, textAlign: "center",
            }}>
              PASS TO PLAYER 2
            </h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-mundial)", textAlign: "center", margin: 0 }}>
              Don&apos;t let them see Player 1&apos;s choice!
            </p>
            <motion.button
              onClick={() => { sfxClick(); setPhase("CHOOSE_P2"); }}
              whileTap={{ scale: 0.93 }}
              style={{
                padding: "16px 36px",
                background: "linear-gradient(135deg, #c084fc, #74d7f7)",
                color: "#0f0f1e", border: "none", borderRadius: 16,
                fontFamily: "var(--font-brice)", fontSize: 18, fontWeight: 900,
                cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              PLAYER 2 READY 🤙
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: "16px 16px 90px", maxWidth: 600, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <motion.button
            onClick={() => { sfxClick(); onHome(); }}
            whileTap={{ scale: 0.93 }}
            style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.4)", padding: "7px 12px", borderRadius: 8,
              fontFamily: "var(--font-mundial)", fontSize: 12, cursor: "pointer",
            }}
          >
            ✕
          </motion.button>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              fontFamily: "var(--font-brice)", fontSize: 22, fontWeight: 900, color: C.sky,
            }}>
              {p1Score}
            </span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)" }}>—</span>
            <span style={{
              fontFamily: "var(--font-brice)", fontSize: 22, fontWeight: 900, color: C.coral,
            }}>
              {p2Score}
            </span>
          </div>

          <div style={{
            fontFamily: "var(--font-mundial)", fontSize: 12,
            color: "rgba(255,255,255,0.4)",
          }}>
            Round {Math.min(currentRound + 1, 5)}/5
          </div>
        </div>

        {/* Round result indicators */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const r = roundResults[i];
            const style = r ? roundResultIcon(r) : { bg: "rgba(255,255,255,0.08)", label: "·" };
            return (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: style.bg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontFamily: "var(--font-brice)", fontWeight: 900,
                color: r ? "#0f0f1e" : "rgba(255,255,255,0.25)",
              }}>
                {style.label}
              </div>
            );
          })}
        </div>

        {/* P2 hand / CPU area */}
        <div style={{ marginBottom: 12 }}>
          {mode === "VS_CPU" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.35)",
                fontFamily: "var(--font-mundial)", letterSpacing: "0.08em", marginBottom: 8,
              }}>
                {phase === "CPU_THINKING"
                  ? `CPU IS THINKING${".".repeat(cpuDots)}`
                  : "CPU"}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {p2Hand.map(card => (
                  <BattleCardMini key={card.tokenId} card={card} faceDown disabled />
                ))}
                {p2Hand.length === 0 && p2Deck.length > 0 && (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mundial)" }}>
                    All cards played
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)", letterSpacing: "0.08em", marginBottom: 8 }}>
                PLAYER 2
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                {p2Hand.map(card => (
                  <BattleCardMini
                    key={card.tokenId}
                    card={card}
                    faceDown={phase !== "CHOOSE_P2"}
                    disabled={phase !== "CHOOSE_P2"}
                    onSelect={() => playCardP2(card)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Round stat badge */}
        <motion.div
          key={currentRound}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ textAlign: "center", marginBottom: 12 }}
        >
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 20px", borderRadius: 24,
            background: `${STAT_COLORS[currentStat]}22`,
            border: `2px solid ${STAT_COLORS[currentStat]}`,
            boxShadow: `0 0 20px ${STAT_COLORS[currentStat]}44`,
          }}>
            <span style={{
              fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
              color: STAT_COLORS[currentStat], letterSpacing: "0.08em",
            }}>
              {currentStat === "ENERGY" ? "⚡" : currentStat === "RARITY" ? "💎" : currentStat === "DRIP" ? "💧" : currentStat === "AURA" ? "✨" : "⭐"}{" "}
              {STAT_LABELS[currentStat].toUpperCase()} — ROUND {currentRound + 1}
            </span>
          </div>
        </motion.div>

        {/* Arena center — responsive card width so it never overflows on mobile */}
        {(() => {
          const vw = typeof window !== "undefined" ? window.innerWidth : 600;
          const available = Math.min(568, vw - 32); // container width minus padding
          // two cards + gap(12) + VS(32) must fit
          const arenaCard = Math.min(155, Math.floor((available - 12 - 32) / 2));
          const arenaH    = Math.round(arenaCard * (210/155));
          return (
            <div className={shaking ? "arena-shake" : ""} style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 12, marginBottom: 12, minHeight: arenaH + 30,
            }}>
              {/* P2 card */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)", letterSpacing: "0.06em" }}>
                  {mode === "VS_CPU" ? "CPU" : "P2"}
                </div>
                {p2Played ? (
                  <BattleCardFull
                    card={p2Played} cardWidth={arenaCard}
                    highlightStat={phase === "RESULT" || phase === "REVEAL" ? currentStat : undefined}
                    winner={roundWinner === "P2"}
                    loser={roundWinner === "P1"}
                  />
                ) : (
                  <div style={{ width:arenaCard,height:arenaH,borderRadius:14,border:"2px dashed rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ color:"rgba(255,255,255,0.15)",fontSize:28 }}>?</span>
                  </div>
                )}
              </div>
              {/* VS */}
              <div style={{ fontFamily:"var(--font-brice)",fontSize:20,fontWeight:900,color:"rgba(255,255,255,0.25)",flexShrink:0 }}>VS</div>
              {/* P1 card */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)", letterSpacing: "0.06em" }}>YOU</div>
                {p1Played ? (
                  <BattleCardFull
                    card={p1Played} cardWidth={arenaCard}
                    highlightStat={phase === "RESULT" || phase === "REVEAL" ? currentStat : undefined}
                    winner={roundWinner === "P1"}
                    loser={roundWinner === "P2"}
                  />
                ) : (
                  <div style={{ width:arenaCard,height:arenaH,borderRadius:14,border:"2px dashed rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.02)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ color:"rgba(255,255,255,0.15)",fontSize:28 }}>?</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Round result message */}
        <AnimatePresence>
          {phase === "RESULT" && roundWinner && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: "center", marginBottom: 12 }}
            >
              <div style={{
                display: "inline-block",
                fontFamily: "var(--font-brice)", fontSize: 22, fontWeight: 900,
                color: roundWinner === "P1" ? C.mint : roundWinner === "P2" ? C.coral : C.sunshine,
                letterSpacing: "0.04em",
              }}>
                {roundWinner === "P1"
                  ? "YOU WIN THIS ROUND! 🎉"
                  : roundWinner === "P2"
                  ? (mode === "VS_CPU" ? "CPU WINS THIS ROUND 😤" : "PLAYER 2 WINS! 🔥")
                  : "TIE! 🤝"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* P1 hand */}
        <div style={{ marginTop: 8 }}>
          <div style={{
            fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)",
            letterSpacing: "0.08em", marginBottom: 8, textAlign: "center",
          }}>
            {phase === "CHOOSE"
              ? "CHOOSE A CARD TO PLAY"
              : phase === "CHOOSE_P2"
              ? "PLAYER 1 — WAITING"
              : phase === "CPU_THINKING"
              ? "WAITING FOR CPU..."
              : "YOUR HAND"}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {p1Hand.map(card => (
              <BattleCardMini
                key={card.tokenId}
                card={card}
                faceDown={phase === "CHOOSE_P2"}
                disabled={phase !== "CHOOSE"}
                onSelect={() => playCard(card)}
              />
            ))}
            {p1Hand.length === 0 && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "var(--font-mundial)" }}>
                All cards played
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCREEN 5: VICTORY ────────────────────────────────────────────────────────

function VictoryScreen({
  result,
  p1Deck,
  onBattle,
  onPackRip,
  onHome,
}: {
  result: BattleResult;
  p1Deck: BattleCard[];
  onBattle: () => void;
  onPackRip: () => void;
  onHome: () => void;
}) {
  const [shared, setShared] = useState(false);
  const won  = result.winner === "P1";
  const drew = result.winner === "DRAW";
  const bestCard = result.p1BestCard ?? (p1Deck.length > 0 ? [...p1Deck].sort((a, b) => b.total - a.total)[0] : null);

  // Record win/loss/draw once on mount
  useEffect(() => { recordBattleResult(result.winner); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shareToX = () => {
    const tokenId = bestCard?.tokenId ?? 0;
    const score = `${result.p1Score}–${result.p2Score}`;
    const text = won
      ? `I just won a VIBE BATTLE ${score}! My GVC #${tokenId} vs CPU 🏆 Challenge me → aesr-gvc.vercel.app @goodvibesclub #VibeBattle #GoodVibesClub`
      : `I battled hard in VIBE BATTLE ${score} with GVC #${tokenId}! Next time I'll win 💜 aesr-gvc.vercel.app @goodvibesclub #VibeBattle #GoodVibesClub`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    setShared(true);
  };

  const roundResultIcon = (r: RoundResult) =>
    r === "P1" ? C.mint : r === "P2" ? C.coral : "rgba(255,255,255,0.3)";

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: won
        ? "linear-gradient(160deg, #1a0a40, #0a1540, #040c20)"
        : "linear-gradient(160deg, #1a0240, #0f0f1e)",
    }}>
      {won && <Confetti />}

      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px 90px",
        textAlign: "center",
      }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          style={{ fontSize: 72, marginBottom: 8 }}
        >
          {won ? "🏆" : drew ? "🤝" : "💜"}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={won ? "shimmer-title" : undefined}
          style={{
            fontFamily: "var(--font-brice)",
            fontSize: "clamp(40px, 10vw, 72px)",
            fontWeight: 900,
            margin: "0 0 8px",
            ...(won ? {} : {
              color: drew ? C.sunshine : C.lavender,
            }),
          }}
        >
          {won ? "YOU WIN!" : drew ? "IT'S A DRAW! 🤝" : "SO CLOSE..."}
        </motion.h1>

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}
        >
          <span style={{
            fontFamily: "var(--font-brice)", fontSize: 48, fontWeight: 900,
            color: C.sky,
          }}>
            {result.p1Score}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)", fontSize: 24 }}>—</span>
          <span style={{
            fontFamily: "var(--font-brice)", fontSize: 48, fontWeight: 900,
            color: C.coral,
          }}>
            {result.p2Score}
          </span>
        </motion.div>

        {/* Round breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{ display: "flex", gap: 8, marginBottom: 28 }}
        >
          {result.roundResults.map((r, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: "50%",
              background: roundResultIcon(r),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontFamily: "var(--font-brice)", fontWeight: 900,
              color: r !== "DRAW" ? "#0f0f1e" : "rgba(255,255,255,0.5)",
            }}>
              {r === "P1" ? "W" : r === "P2" ? "L" : "D"}
            </div>
          ))}
        </motion.div>

        {/* Best card */}
        {bestCard && won && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            style={{ marginBottom: 28 }}
          >
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-mundial)",
              letterSpacing: "0.08em", marginBottom: 10 }}>
              YOUR MVP CARD
            </p>
            <BattleCardFull card={bestCard} />
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}
        >
          <motion.button
            onClick={() => { sfxClick(); onBattle(); }}
            whileTap={{ scale: 0.93 }}
            style={{
              padding: "14px 28px",
              background: "linear-gradient(135deg, #c084fc, #74d7f7)",
              color: "#0f0f1e", border: "none", borderRadius: 14,
              fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
              cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            BATTLE AGAIN ⚔️
          </motion.button>

          <motion.button
            onClick={() => { sfxClick(); onPackRip(); }}
            whileTap={{ scale: 0.93 }}
            style={{
              padding: "14px 28px",
              background: "linear-gradient(135deg, #ff6b8a, #ffb347)",
              color: "#0f0f1e", border: "none", borderRadius: 14,
              fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
              cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            RIP A NEW PACK 🎴
          </motion.button>

          {won && (
            <motion.button
              onClick={() => { sfxClick(); shareToX(); }}
              whileTap={{ scale: 0.93 }}
              style={{
                padding: "14px 28px",
                background: shared ? "rgba(255,255,255,0.08)" : "#000",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 14,
                fontFamily: "var(--font-brice)", fontSize: 16, fontWeight: 900,
                cursor: "pointer", letterSpacing: "0.04em",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {shared ? "Shared! 🤙" : "SHARE WIN 🐦"}
            </motion.button>
          )}

          <motion.button
            onClick={() => { sfxClick(); onHome(); }}
            whileTap={{ scale: 0.93 }}
            style={{
              padding: "14px 28px",
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.5)",
              borderRadius: 14,
              fontFamily: "var(--font-mundial)", fontSize: 14,
              cursor: "pointer",
            }}
          >
            Home
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── MUSIC PLAYER ────────────────────────────────────────────────────────────

// ─── MUSIC PLAYER ─────────────────────────────────────────────────────────────

const TRACKS = [
  { name: "GVC Dance",   path: "/sounds/GVC Dance.mp3"   },
  { name: "GVC Country", path: "/sounds/GVC Country.mp3" },
];

const BAR_COLS = ["#ff6b8a","#ff8c6b","#ffb347","#FFE048","#c8f560","#98f5c4","#6bffea","#74d7f7","#6baeff","#8a6bff","#c084fc","#e06bff","#ff6be0","#ff6bb5","#ff6b8a","#ff9b6b","#ffd06b","#98f5a4","#6bd7ff","#9a6bff"];

const IcoPlay  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 20,12 5,21"/></svg>;
const IcoPause = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18"/><rect x="14" y="3" width="5" height="18"/></svg>;
const IcoPrev  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="19,4 9,12 19,20"/><rect x="5" y="4" width="3" height="16"/></svg>;
const IcoNext  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,4 15,12 5,20"/><rect x="16" y="4" width="3" height="16"/></svg>;
const IcoClose = () => <svg width="11" height="11" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoVol   = ({ v }: { v: number }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
    {v > 0 && <path d="M15.5,8.5a5,5,0,0,1,0,7" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>}
    {v > 0.5 && <path d="M19,5a10,10,0,0,1,0,14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>}
    {v === 0 && <><line x1="22" y1="9" x2="16" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="9" x2="22" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>}
  </svg>
);

function MusicPlayer() {
  const [playing,  setPlaying]  = useState(false);
  const [volume,   setVolume]   = useState(0.7);
  const [bars,     setBars]     = useState<number[]>(Array(20).fill(0));
  const [mini,     setMini]     = useState(false);
  const [trackIdx, setTrackIdx] = useState(0);
  const [ready,    setReady]    = useState(false);

  const ctxRef      = useRef<AudioContext | null>(null);
  const srcRef      = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef     = useRef<GainNode | null>(null);
  const bufsRef     = useRef<(AudioBuffer|null)[]>([null, null]);
  const startRef    = useRef(0);
  const offRef      = useRef(0);
  const rafRef      = useRef(0);

  const initCtx = useCallback(() => {
    if (ctxRef.current) return ctxRef.current;
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = ctx.createAnalyser(); analyser.fftSize = 64;
    const gain = ctx.createGain(); gain.gain.value = 0.7;
    analyser.connect(gain); gain.connect(ctx.destination);
    ctxRef.current = ctx; analyserRef.current = analyser; gainRef.current = gain;
    return ctx;
  }, []); // stable — volume is controlled via gainRef directly, no need to recreate

  const tick = useCallback(() => {
    if (!analyserRef.current) return;
    const d = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(d);
    const n = 20, b = Math.floor(d.length / n);
    setBars(Array.from({ length: n }, (_, i) => {
      const sl = Array.from(d.slice(i*b,(i+1)*b));
      return (sl.reduce((a,x)=>a+x,0)/sl.length)/255;
    }));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const playBuf = useCallback((buf: AudioBuffer, off = 0) => {
    const ctx = initCtx();
    try { srcRef.current?.stop(); } catch {}
    const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
    s.connect(analyserRef.current!); s.start(0, off % buf.duration);
    srcRef.current = s; startRef.current = ctx.currentTime - (off % buf.duration);
    setPlaying(true); cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(tick);
  }, [initCtx, tick]);

  const pause = useCallback(() => {
    const buf = bufsRef.current[trackIdx];
    if (ctxRef.current && buf) offRef.current = (ctxRef.current.currentTime - startRef.current) % buf.duration;
    try { srcRef.current?.stop(); } catch {}
    cancelAnimationFrame(rafRef.current); setPlaying(false); setBars(Array(20).fill(0));
  }, [trackIdx]);

  const toggle = useCallback(() => {
    const buf = bufsRef.current[trackIdx];
    if (!buf) return;
    playing ? pause() : playBuf(buf, offRef.current);
  }, [playing, pause, playBuf, trackIdx]);

  const switchTo = useCallback((idx: number) => {
    const wasPlaying = playing;
    try { srcRef.current?.stop(); } catch {}
    cancelAnimationFrame(rafRef.current); setPlaying(false); setBars(Array(20).fill(0)); offRef.current = 0;
    setTrackIdx(idx);
    const buf = bufsRef.current[idx];
    if (buf && wasPlaying) setTimeout(() => playBuf(buf, 0), 50);
  }, [playing, playBuf]);

  const onVol = (v: number) => { setVolume(v); if (gainRef.current) gainRef.current.gain.value = v; };

  // Load all tracks on mount, no autoplay
  useEffect(() => {
    let dead = false;
    const load = async () => {
      const ctx = initCtx();
      await Promise.allSettled(TRACKS.map(async (t, i) => {
        try {
          const ab = await fetch(t.path).then(r => r.arrayBuffer());
          await new Promise<void>(res => ctx.decodeAudioData(ab, buf => {
            if (!dead) bufsRef.current[i] = buf; res();
          }, () => res()));
        } catch {}
      }));
      if (!dead) setReady(true);
    };
    load();
    return () => { dead = true; };
  }, [initCtx]);

  useEffect(() => () => { cancelAnimationFrame(rafRef.current); try { srcRef.current?.stop(); } catch {} }, []);

  if (mini) {
    return (
      <motion.div onClick={() => setMini(false)}
        style={{ position:"fixed",bottom:10,right:10,zIndex:999,background:"rgba(10,8,20,0.93)",backdropFilter:"blur(14px)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,padding:"6px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:8 }}>
        <div style={{ width:7,height:7,borderRadius:"50%",background:playing?"#98f5c4":"rgba(255,255,255,0.2)",boxShadow:playing?"0 0 8px #98f5c4":"none",flexShrink:0 }}/>
        <span style={{ fontFamily:"var(--font-mundial)",fontSize:10,color:"rgba(255,255,255,0.6)",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{TRACKS[trackIdx].name}</span>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y:100 }} animate={{ y:0 }} transition={{ delay:0.6 }}
      style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:999 }}>
      <div className="rainbow-led" style={{ height:2 }}/>
      <div style={{ background:"rgba(7,5,16,0.97)",backdropFilter:"blur(20px)",paddingBottom:"env(safe-area-inset-bottom,0px)" }}>
        {/* Visualiser bars — compact */}
        <div style={{ display:"flex",alignItems:"flex-end",gap:1.5,height:24,padding:"2px 10px 0",overflow:"hidden" }}>
          {bars.map((h,i) => (
            <div key={i} style={{ flex:1,minWidth:0,height:Math.max(2,h*20)+"px",background:BAR_COLS[i%BAR_COLS.length],borderRadius:"1px 1px 0 0",transition:"height 0.05s ease-out",opacity:playing?1:0.3 }}/>
          ))}
        </div>
        {/* Controls — single tight row */}
        <div style={{ display:"flex",alignItems:"center",gap:6,padding:"5px 10px 7px" }}>
          {/* Prev */}
          <motion.button onClick={()=>switchTo((trackIdx-1+TRACKS.length)%TRACKS.length)} whileTap={{ scale:0.85 }}
            style={{ background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",padding:4,display:"flex",flexShrink:0 }}>
            <IcoPrev/>
          </motion.button>
          {/* Play/Pause */}
          <motion.button onClick={toggle} disabled={!ready} whileTap={{ scale:0.88 }}
            style={{ width:28,height:28,borderRadius:"50%",background:playing?"linear-gradient(135deg,#ff6b8a,#c084fc)":"linear-gradient(135deg,#98f5c4,#74d7f7)",border:"none",cursor:ready?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",color:"#0f0f1e",opacity:ready?1:0.3,flexShrink:0 }}>
            {playing?<IcoPause/>:<IcoPlay/>}
          </motion.button>
          {/* Next */}
          <motion.button onClick={()=>switchTo((trackIdx+1)%TRACKS.length)} whileTap={{ scale:0.85 }}
            style={{ background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",padding:4,display:"flex",flexShrink:0 }}>
            <IcoNext/>
          </motion.button>
          {/* Track name */}
          <div style={{ flex:1,minWidth:0,overflow:"hidden" }}>
            <p style={{ fontFamily:"var(--font-mundial)",fontSize:10,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:ready?(playing?"rgba(255,255,255,0.75)":"rgba(255,255,255,0.4)"):"rgba(255,255,255,0.2)" }}>
              {ready ? TRACKS[trackIdx].name : "Loading…"}
            </p>
          </div>
          {/* Volume */}
          <div style={{ display:"flex",alignItems:"center",gap:4,flexShrink:0,color:"rgba(255,255,255,0.45)" }}>
            <IcoVol v={volume}/>
            <input type="range" min="0" max="1" step="0.02" value={volume} onChange={e=>onVol(parseFloat(e.target.value))}
              style={{ width:52,height:3,borderRadius:2,outline:"none",cursor:"pointer",WebkitAppearance:"none",appearance:"none",
                background:`linear-gradient(to right,#c084fc ${volume*100}%,rgba(255,255,255,0.14) ${volume*100}%)` }}/>
          </div>
          {/* Minimise */}
          <motion.button onClick={()=>setMini(true)} whileTap={{ scale:0.85 }}
            style={{ background:"none",border:"none",color:"rgba(255,255,255,0.28)",cursor:"pointer",padding:4,display:"flex",flexShrink:0 }}>
            <IcoClose/>
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Page() {
  const [screen,       setScreen]       = useState<Screen>("HOME");
  const [packCard,     setPackCard]     = useState<BattleCard | null>(null);
  const [p1Deck,       setP1Deck]       = useState<BattleCard[]>([]);
  const [p2Deck,       setP2Deck]       = useState<BattleCard[]>([]);
  const [battleMode,   setBattleMode]   = useState<BattleMode>("VS_CPU");
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  return (
    <>
      <style>{GAME_CSS}</style>
      <AnimatePresence mode="wait">
        {screen === "HOME" && (
          <motion.div key="home"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <HomeScreen
              onPackRip={() => setScreen("PACK_RIP")}
              onBattle={() => setScreen("BATTLE_SETUP")}
            />
          </motion.div>
        )}
        {screen === "PACK_RIP" && (
          <motion.div key="pack"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <PackRipScreen
              onBattle={card => { setPackCard(card); setScreen("BATTLE_SETUP"); }}
              onRipAgain={() => setPackCard(null)}
              onHome={() => setScreen("HOME")}
            />
          </motion.div>
        )}
        {screen === "BATTLE_SETUP" && (
          <motion.div key="setup"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <BattleSetupScreen
              initialCard={packCard ?? undefined}
              onStart={(p1, p2, mode) => {
                setP1Deck(p1); setP2Deck(p2); setBattleMode(mode);
                setScreen("BATTLE_ARENA");
              }}
              onHome={() => setScreen("HOME")}
            />
          </motion.div>
        )}
        {screen === "BATTLE_ARENA" && (
          <motion.div key="arena"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BattleArenaScreen
              p1Deck={p1Deck} p2Deck={p2Deck} mode={battleMode}
              onEnd={result => { setBattleResult(result); setScreen("VICTORY"); }}
              onHome={() => setScreen("HOME")}
            />
          </motion.div>
        )}
        {screen === "VICTORY" && battleResult && (
          <motion.div key="victory"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <VictoryScreen
              result={battleResult} p1Deck={p1Deck}
              onBattle={() => { setBattleResult(null); setScreen("BATTLE_SETUP"); }}
              onPackRip={() => { setBattleResult(null); setScreen("PACK_RIP"); }}
              onHome={() => { setBattleResult(null); setScreen("HOME"); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <MusicPlayer />
    </>
  );
}
