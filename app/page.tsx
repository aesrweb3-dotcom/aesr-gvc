"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
  background: linear-gradient(108deg, transparent 38%, rgba(255,224,72,0.07) 50%, transparent 62%);
  animation: card-shimmer 3.5s ease-in-out infinite;
}
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
}

function BattleCardFull({ card, highlightStat, winner, loser, faceDown }: BattleCardFullProps) {
  const [imgState, setImgState] = useState<"loading" | "loaded" | "error">("loading");
  const tc = TIER_COLORS[card.tier];

  if (faceDown) {
    return (
      <div style={{
        width: 155, height: 210, borderRadius: 14,
        background: "linear-gradient(135deg,#1a0340,#0a1a40,#0d1a2e)",
        border: `2px solid rgba(255,255,255,0.12)`,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shaka.png" alt="" className="shaka-idle" style={{ width: 40, height: 40, opacity: 0.6 }} />
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-mundial)", letterSpacing: "0.1em" }}>???</span>
      </div>
    );
  }

  const cardStyle: React.CSSProperties = {
    width: 155, height: 210, borderRadius: 14, overflow: "hidden",
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
  return (
    <div className="vb-bg" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <FloatingCards />
      <div style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          style={{ marginTop: 40, display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}
        >
          <motion.button
            onClick={() => { sfxClick(); onPackRip(); }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.04 }}
            style={{
              background: "linear-gradient(135deg, #ff6b8a, #ffb347)",
              color: "#0f0f1e",
              fontFamily: "var(--font-brice)",
              fontSize: 20, fontWeight: 900,
              padding: "16px 32px", borderRadius: 16,
              border: "none", letterSpacing: "0.04em",
              boxShadow: "0 8px 32px rgba(255,107,138,0.45)",
              cursor: "pointer",
            }}
          >
            🎴 RIP A PACK
          </motion.button>

          <motion.button
            onClick={() => { sfxClick(); onBattle(); }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.04 }}
            style={{
              background: "linear-gradient(135deg, #c084fc, #74d7f7)",
              color: "#0f0f1e",
              fontFamily: "var(--font-brice)",
              fontSize: 20, fontWeight: 900,
              padding: "16px 32px", borderRadius: 16,
              border: "none", letterSpacing: "0.04em",
              boxShadow: "0 8px 32px rgba(192,132,252,0.45)",
              cursor: "pointer",
            }}
          >
            ⚔️ BATTLE
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 48, fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mundial)" }}
        >
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
  }, []);

  return (
    <div style={{
      minHeight: "100vh", position: "relative", overflow: "hidden",
      background: "rgba(15,15,30,0.97)",
    }}>
      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px 64px", maxWidth: 520, margin: "0 auto" }}>
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
                  <BattleCardFull card={previewCard} />
                </div>

                <div style={{
                  padding: "16px", borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  textAlign: "center",
                }}>
                  <p style={{
                    fontFamily: "var(--font-brice)", fontSize: 14, fontWeight: 900,
                    color: TIER_COLORS[previewCard.tier].label, margin: "0 0 4px",
                    textTransform: "uppercase",
                  }}>
                    {previewCard.tier} — {previewCard.archetype}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, fontFamily: "var(--font-mundial)" }}>
                    RARITY {previewCard.rarity} · DRIP {previewCard.drip} · ENERGY {previewCard.energy} · AURA {previewCard.aura} · TOTAL {previewCard.total}
                  </p>
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
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
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
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", background: "rgba(15,15,30,0.98)" }}>
      <div style={{ position: "relative", zIndex: 1, padding: "24px 20px 80px", maxWidth: 600, margin: "0 auto" }}>
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
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          {(["VS_CPU", "PASS_AND_PLAY"] as BattleMode[]).map(m => (
            <motion.button
              key={m}
              onClick={() => { sfxClick(); setMode(m); }}
              whileTap={{ scale: 0.93 }}
              style={{
                padding: "10px 20px", borderRadius: 20,
                border: mode === m ? "none" : `1px solid rgba(255,255,255,0.2)`,
                background: mode === m
                  ? "linear-gradient(135deg, #c084fc, #74d7f7)"
                  : "transparent",
                color: mode === m ? "#0f0f1e" : "rgba(255,255,255,0.5)",
                fontFamily: "var(--font-brice)", fontSize: 13, fontWeight: 900,
                cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              {m === "VS_CPU" ? "VS CPU 🤖" : "PASS & PLAY 👥"}
            </motion.button>
          ))}
        </div>

        {/* P1 Deck */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "var(--font-brice)", fontSize: 14, fontWeight: 900,
            color: C.sky, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            YOUR DECK ({p1Slots.filter(Boolean).length}/5)
          </p>
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

      <div style={{ padding: "16px 16px 24px", maxWidth: 600, margin: "0 auto" }}>
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

        {/* Arena center */}
        <div className={shaking ? "arena-shake" : ""} style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 16, marginBottom: 12, minHeight: 240,
        }}>
          {/* P2 card */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)", letterSpacing: "0.06em" }}>
              {mode === "VS_CPU" ? "CPU" : "P2"}
            </div>
            {p2Played ? (
              <BattleCardFull
                card={p2Played}
                highlightStat={phase === "RESULT" || phase === "REVEAL" ? currentStat : undefined}
                winner={roundWinner === "P2"}
                loser={roundWinner === "P1"}
              />
            ) : (
              <div style={{
                width: 155, height: 210, borderRadius: 14,
                border: "2px dashed rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.02)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 28 }}>?</span>
              </div>
            )}
          </div>

          {/* VS */}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "var(--font-brice)", fontSize: 24, fontWeight: 900,
              color: "rgba(255,255,255,0.25)", lineHeight: 1,
            }}>VS</div>
          </div>

          {/* P1 card */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mundial)", letterSpacing: "0.06em" }}>YOU</div>
            {p1Played ? (
              <BattleCardFull
                card={p1Played}
                highlightStat={phase === "RESULT" || phase === "REVEAL" ? currentStat : undefined}
                winner={roundWinner === "P1"}
                loser={roundWinner === "P2"}
              />
            ) : (
              <div style={{
                width: 155, height: 210, borderRadius: 14,
                border: "2px dashed rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.02)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 28 }}>?</span>
              </div>
            )}
          </div>
        </div>

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
        padding: "40px 20px",
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
    </>
  );
}
