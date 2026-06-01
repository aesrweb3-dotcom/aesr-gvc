"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── BRAND ────────────────────────────────────────────────────────────────────
const GOLD = "#FFE048";
const TIER_COLOR: Record<string, string> = {
  Common:    "#7ab4e0",
  Rare:      "#c084fc",
  Legendary: "#FFE048",
};
const TIER_GLOW: Record<string, string> = {
  Common:    "rgba(122,180,224,0.65)",
  Rare:      "rgba(192,132,252,0.7)",
  Legendary: "rgba(255,224,72,0.85)",
};
const TIER_BG: Record<string, string> = {
  Common:    "linear-gradient(160deg,#0b1422 0%,#0f1e35 60%,#0b1422 100%)",
  Rare:      "linear-gradient(160deg,#120a24 0%,#1e0f3a 60%,#120a24 100%)",
  Legendary: "linear-gradient(160deg,#1c1400 0%,#2e2200 60%,#1c1400 100%)",
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_BADGES = [
  "astro_balls","zoom_in_vibe_out","showtime","flow_state",
  "vibestr_bronze_tier","checkmate","vibefoot_fan_club","suited_up",
  "astro_bean","gud_meat","hoodie_up_society","twenty_badges",
  "yin_n_yang","vibestr_pink_tier","party_in_the_back",
  "unfathomable_vibes","gradient_hatrick","one_of_one",
  "fifty_badges","cosmic_guardian","super_rare","pothead",
  "elite_rainbow_ranger","anchorman","rainbow_visor",
];
const ARCHETYPES = [
  "The Cosmic Drifter","The Neon Prophet","The Vibe Architect",
  "The Golden Wanderer","The Drift King","The Frequency Holder",
  "The Stellar Nomad","The Radiant Sage","The Vibe Curator",
  "The Etheric Rebel","The Sound Alchemist","The Neon Mystic",
  "The Light Chaser","The Groove Oracle","The Vibe Sovereign",
  "The Chromatic Shaman","The Signal Rider","The Vibe Phantom",
  "The Astral Cowboy","The Frequency Mage",
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

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Phase =
  | "IDLE" | "ACTIVE" | "VENDING"
  | "DRAWER" | "PACK_HAND" | "CARD_REVEALED";
type Tier = "Common" | "Rare" | "Legendary";
interface CardData {
  rarity: number; drip: number; energy: number; aura: number;
  tier: Tier; rank: number; archetype: string; quote: string; badges: string[];
}

// ─── SEEDED RNG ───────────────────────────────────────────────────────────────
function seededRNG(seed: number) {
  let s = ((seed * 1664525) + 1013904223) >>> 0;
  return () => { s = ((s * 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
}
function generateCardData(id: number): CardData {
  const rng    = seededRNG(id);
  const rarity = 29 + Math.floor(rng() * 71);
  const drip   = 19 + Math.floor(rng() * 81);
  const energy = 24 + Math.floor(rng() * 76);
  const aura   = 14 + Math.floor(rng() * 86);
  const avg    = (rarity + drip + energy + aura) / 4;
  const tier: Tier = avg >= 75 ? "Legendary" : avg >= 55 ? "Rare" : "Common";
  const rank   = 1 + Math.floor(seededRNG(id + 77)() * 6969);
  const archetype = ARCHETYPES[Math.floor(seededRNG(id + 13)() * ARCHETYPES.length)];
  const quote  = QUOTES[Math.floor(seededRNG(id + 31)() * QUOTES.length)];
  const shuffled = [...ALL_BADGES].sort(() => seededRNG(id + 99)() - 0.5);
  const count  = tier === "Legendary" ? 4 : tier === "Rare" ? 3 : 2;
  return { rarity, drip, energy, aura, tier, rank, archetype, quote, badges: shuffled.slice(0, count) };
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function getAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  if (!w.__ac) { try { w.__ac = new (window.AudioContext || (w as any).webkitAudioContext)(); } catch { return null; } }
  if (w.__ac.state === "suspended") w.__ac.resume().catch(() => {});
  return w.__ac as AudioContext;
}
function sfxCoin() {
  const ctx = getAudio(); if (!ctx) return; const t = ctx.currentTime;
  [880,1320].forEach((f,i) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
    o.frequency.value=f;o.type="sine"; g.gain.setValueAtTime(0,t+i*0.07);g.gain.linearRampToValueAtTime(0.22,t+i*0.07+0.01);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.07+0.2);
    o.start(t+i*0.07);o.stop(t+i*0.07+0.22); });
}
function sfxKey() {
  const ctx = getAudio(); if (!ctx) return; const t = ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
  o.frequency.value=600+Math.random()*200;o.type="square"; g.gain.setValueAtTime(0.07,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.055);
  o.start(t);o.stop(t+0.06);
}
function sfxVend() {
  const ctx = getAudio(); if (!ctx) return; const t = ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
  o.type="sawtooth"; o.frequency.setValueAtTime(100,t);o.frequency.linearRampToValueAtTime(30,t+0.55);
  g.gain.setValueAtTime(0.16,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.6);
  o.start(t);o.stop(t+0.65);
}
function sfxTear() {
  const ctx = getAudio(); if (!ctx) return; const t = ctx.currentTime;
  const buf=ctx.createBuffer(1,ctx.sampleRate*0.28,ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  f.type="bandpass";f.frequency.value=3200;f.Q.value=0.7;
  s.buffer=buf;s.connect(f);f.connect(g);g.connect(ctx.destination);
  g.gain.setValueAtTime(0.32,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.28);
  s.start(t);
}
function sfxReveal() {
  const ctx = getAudio(); if (!ctx) return; const t = ctx.currentTime;
  [523,659,784,1047].forEach((f,i) => { const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
    o.type="sine";o.frequency.value=f; g.gain.setValueAtTime(0,t+i*0.09);g.gain.linearRampToValueAtTime(0.18,t+i*0.09+0.02);g.gain.exponentialRampToValueAtTime(0.001,t+i*0.09+0.32);
    o.start(t+i*0.09);o.stop(t+i*0.09+0.38); });
}

// ─── GLOBAL CSS ───────────────────────────────────────────────────────────────
const STYLES = `
@keyframes ledScroll{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes coinIdle{0%,100%{transform:rotate(0deg) scale(1)}20%{transform:rotate(9deg) scale(1.05)}40%{transform:rotate(-7deg) scale(0.97)}60%{transform:rotate(4deg) scale(1.02)}80%{transform:rotate(-2deg) scale(0.99)}}
@keyframes packFloat{0%,100%{transform:translateY(0px) rotate(-1.5deg)}50%{transform:translateY(-9px) rotate(1.5deg)}}
@keyframes holoShift{0%{background-position:0% 0%;opacity:.18}33%{background-position:100% 0%;opacity:.3}66%{background-position:100% 100%;opacity:.22}100%{background-position:0% 0%;opacity:.18}}
@keyframes packShine{0%{left:-60%;opacity:0}15%{opacity:.65}85%{opacity:.55}100%{left:120%;opacity:0}}
@keyframes drawerGlow{0%,100%{box-shadow:inset 0 0 16px rgba(46,255,46,.1),0 0 12px rgba(46,255,46,.15)}50%{box-shadow:inset 0 0 28px rgba(46,255,46,.22),0 0 26px rgba(46,255,46,.35)}}
@keyframes machinePulse{0%,100%{box-shadow:0 0 28px rgba(255,224,72,.1),0 0 80px rgba(255,224,72,.04)}50%{box-shadow:0 0 45px rgba(255,224,72,.22),0 0 100px rgba(255,224,72,.08)}}
@keyframes borderSpin{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
.coin-idle{animation:coinIdle 2.8s ease-in-out infinite}
.pack-float{animation:packFloat 3.5s ease-in-out infinite}
.holo{animation:holoShift 4.5s ease-in-out infinite;background-size:300% 300%}
.machine-on{animation:machinePulse 3s ease-in-out infinite}
.drawer-ready{animation:drawerGlow 1.4s ease-in-out infinite}
`;

// ─── LED STRIP ────────────────────────────────────────────────────────────────
function LEDStrip({ active }: { active: boolean }) {
  return (
    <div style={{
      height: 5,
      background: active
        ? "linear-gradient(90deg,#ff0080,#ff6600,#ffe100,#00ff94,#00bfff,#bf00ff,#ff0080,#ff6600,#ffe100)"
        : "rgba(255,224,72,0.12)",
      backgroundSize: active ? "200% 100%" : "100%",
      animation: active ? "ledScroll 2s linear infinite" : "none",
      transition: "background 0.6s",
    }}/>
  );
}

// ─── DISPLAY PANEL ────────────────────────────────────────────────────────────
function DisplayPanel({ msg, active }: { msg: string; active: boolean }) {
  return (
    <div style={{
      background: active ? "#001a00" : "#030803",
      border: `1px solid ${active ? "rgba(46,255,46,0.55)" : "rgba(46,255,46,0.14)"}`,
      borderRadius: 6, padding: "5px 10px",
      fontFamily: "'Courier New',monospace", fontSize: 11,
      color: active ? "#2EFF2E" : "rgba(46,255,46,0.28)",
      letterSpacing: "0.12em", textTransform: "uppercase",
      textShadow: active ? "0 0 10px rgba(46,255,46,0.9)" : "none",
      boxShadow: active ? "inset 0 0 14px rgba(46,255,46,0.1)" : "none",
      transition: "all 0.4s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    }}>{msg}</div>
  );
}

// ─── DRAGGABLE COIN ───────────────────────────────────────────────────────────
function DraggableCoin({ onInsert, slotRef }: {
  onInsert: () => void;
  slotRef: React.RefObject<HTMLDivElement>;
}) {
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ px: 0, py: 0, dx: 0, dy: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const onPD = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    start.current = { px: e.clientX, py: e.clientY, dx, dy };
  };
  const onPM = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDx(start.current.dx + e.clientX - start.current.px);
    setDy(start.current.dy + e.clientY - start.current.py);
  };
  const onPU = () => {
    setDragging(false);
    const wrap = wrapRef.current;
    const slot = slotRef.current;
    if (wrap && slot) {
      const wR = wrap.getBoundingClientRect();
      const sR = slot.getBoundingClientRect();
      const dist = Math.hypot(
        (wR.left + wR.width / 2) - (sR.left + sR.width / 2),
        (wR.top  + wR.height / 2) - (sR.top  + sR.height / 2)
      );
      if (dist < 62) { onInsert(); return; }
    }
    setDx(0); setDy(0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Instruction */}
      <div style={{
        fontFamily: "var(--font-mundial)", fontSize: 9, color: "rgba(255,224,72,0.5)",
        letterSpacing: "0.1em", textTransform: "uppercase", textAlign: "center",
        whiteSpace: "nowrap",
      }}>
        DRAG TO SLOT →
      </div>

      {/* Positioning wrapper */}
      <div ref={wrapRef}
        style={{
          transform: `translate(${dx}px,${dy}px)`,
          transition: dragging ? "none" : "transform 0.45s cubic-bezier(0.34,1.56,0.64,1)",
          position: "relative", zIndex: 30,
        }}
      >
        {/* Visual coin (wobble separately) */}
        <div
          onPointerDown={onPD}
          onPointerMove={onPM}
          onPointerUp={onPU}
          onPointerCancel={onPU}
          className={dragging ? "" : "coin-idle"}
          style={{
            width: 70, height: 70, borderRadius: "50%",
            background: "conic-gradient(from 0deg,#7a5c0a,#FFE048,#FFD700,#FFA500,#FFD700,#FFE048,#9a7210,#FFE048,#7a5c0a)",
            boxShadow: "0 0 22px rgba(255,224,72,0.7),0 0 44px rgba(255,224,72,0.25),inset 0 3px 8px rgba(255,255,255,0.35),inset 0 -3px 8px rgba(0,0,0,0.4)",
            border: "3px solid rgba(255,224,72,0.9)",
            cursor: dragging ? "grabbing" : "grab",
            touchAction: "none", userSelect: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shaka.png" alt="coin" style={{ width: 38, height: 38, pointerEvents: "none", filter: "drop-shadow(0 0 6px rgba(0,0,0,0.6))" }}/>
        </div>
      </div>
    </div>
  );
}

// ─── GLOSSY PACK ─────────────────────────────────────────────────────────────
function GlossyPack({ tier, w = 140, floating = false }: { tier: Tier; w?: number; floating?: boolean }) {
  const h = w * 1.48;
  const tc = TIER_COLOR[tier];
  const tg = TIER_GLOW[tier];

  return (
    <div
      className={floating ? "pack-float" : ""}
      style={{
        width: w, height: h, borderRadius: 12, position: "relative", overflow: "hidden", flexShrink: 0,
        background: TIER_BG[tier],
        border: `1.5px solid ${tc}bb`,
        boxShadow: `0 0 30px ${tg},0 10px 50px rgba(0,0,0,0.8),inset 0 1px 0 rgba(255,255,255,0.14)`,
      }}
    >
      {/* Holographic foil */}
      <div className="holo" style={{
        position: "absolute", inset: 0, zIndex: 4, borderRadius: 12,
        background: "linear-gradient(135deg,rgba(255,0,128,0.28) 0%,rgba(255,140,0,0.18) 18%,rgba(255,225,0,0.24) 36%,rgba(0,255,148,0.18) 54%,rgba(0,191,255,0.24) 72%,rgba(191,0,255,0.18) 90%,rgba(255,0,128,0.28) 100%)",
        mixBlendMode: "color-dodge", pointerEvents: "none",
      }}/>

      {/* Gloss */}
      <div style={{
        position: "absolute", top: 0, left: "12%", width: "55%", height: "100%",
        background: "linear-gradient(108deg,transparent 38%,rgba(255,255,255,0.09) 50%,transparent 62%)",
        zIndex: 5, pointerEvents: "none",
      }}/>

      {/* Shine sweep */}
      <div style={{
        position: "absolute", top: 0, width: "28%", height: "100%",
        background: "linear-gradient(108deg,transparent,rgba(255,255,255,0.13),transparent)",
        animation: "packShine 3.5s ease-in-out infinite",
        zIndex: 6, pointerEvents: "none",
      }}/>

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 3,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "space-between", padding: `${h * 0.055}px ${w * 0.09}px`,
      }}>
        {/* Top ribbon */}
        <div style={{
          alignSelf: "stretch", textAlign: "center",
          borderBottom: `1px solid ${tc}44`, paddingBottom: h * 0.02,
          fontFamily: "'Courier New',monospace", fontSize: w * 0.07,
          color: tc, letterSpacing: "0.15em", textTransform: "uppercase",
          textShadow: `0 0 12px ${tg}`,
        }}>
          {tier === "Legendary" ? "✦ LEGENDARY ✦" : tier === "Rare" ? "◆ RARE ◆" : "STANDARD"}
        </div>

        {/* Shaka + brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: h * 0.025 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shaka.png" alt="" style={{
            width: w * 0.46, height: w * 0.46,
            filter: `drop-shadow(0 0 ${w * 0.07}px ${tg})`,
          }}/>
          <div style={{
            fontFamily: "var(--font-brice)", fontSize: w * 0.13, fontWeight: 900, lineHeight: 1.05,
            color: tc, textTransform: "uppercase", letterSpacing: "0.09em",
            textShadow: `0 0 18px ${tg}`, textAlign: "center",
          }}>
            GOOD<br/>VIBES<br/>CLUB
          </div>
        </div>

        {/* Bottom */}
        <div style={{
          alignSelf: "stretch", textAlign: "center",
          borderTop: `1px solid ${tc}33`, paddingTop: h * 0.02,
          fontFamily: "'Courier New',monospace", fontSize: w * 0.065,
          color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em",
        }}>
          COLLECTOR · S1
        </div>
      </div>

      {/* Perforation / tear line at 22% from top */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: "22%", height: 2, zIndex: 7, pointerEvents: "none",
        background: `repeating-linear-gradient(90deg,${tc}70 0,${tc}70 5px,transparent 5px,transparent 10px)`,
        boxShadow: `0 0 5px ${tg}`,
      }}/>
      {/* Notch */}
      <div style={{
        position: "absolute", left: -1, top: "calc(22% - 5px)",
        width: 9, height: 12, zIndex: 8, background: "#050505",
        clipPath: "polygon(0 50%,100% 0,100% 100%)",
      }}/>
    </div>
  );
}

// ─── PACK TEAR SEQUENCE ───────────────────────────────────────────────────────
function PackTearSequence({ tier, onComplete }: { tier: Tier; onComplete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const [live,  setLive]  = useState(false);
  const [done,  setDone]  = useState(false);
  const startX = useRef(0);
  const THRESHOLD = 190;
  const progress  = Math.min(dragX / THRESHOLD, 1);

  const W = typeof window !== "undefined" ? Math.min(240, window.innerWidth * 0.68) : 220;
  const H = W * 1.48;
  const TEAR_Y = H * 0.22;
  const tc = TIER_COLOR[tier];
  const tg = TIER_GLOW[tier];

  const onPD = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setLive(true);
    startX.current = e.clientX - dragX;
  };
  const onPM = (e: React.PointerEvent) => {
    if (!live) return;
    setDragX(Math.max(0, Math.min(e.clientX - startX.current, THRESHOLD + 50)));
  };
  const onPU = () => {
    setLive(false);
    if (progress > 0.62) {
      setDragX(THRESHOLD);
      setDone(true);
      sfxTear();
      setTimeout(onComplete, 650);
    } else {
      setDragX(0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      <motion.p
        animate={{ opacity: [0.5,1,0.5] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{
          fontFamily: "var(--font-brice)", fontSize: 13, margin: 0,
          color: "rgba(255,255,255,0.45)", letterSpacing: "0.18em", textTransform: "uppercase",
          opacity: done ? 0 : 1, transition: "opacity 0.3s",
        }}
      >
        ← DRAG TO TEAR OPEN →
      </motion.p>

      {/* Pack container */}
      <div
        onPointerDown={onPD}
        onPointerMove={onPM}
        onPointerUp={onPU}
        onPointerCancel={onPU}
        style={{ position: "relative", width: W, height: H, cursor: "ew-resize", touchAction: "none", userSelect: "none" }}
      >
        {/* BODY (bottom stays) */}
        <div style={{
          position: "absolute", top: TEAR_Y, left: 0, right: 0, bottom: 0,
          borderRadius: "0 0 12px 12px",
          background: TIER_BG[tier],
          border: `1.5px solid ${tc}aa`, borderTop: "none",
          overflow: "hidden",
        }}>
          {/* Light burst from tear */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 80,
            background: `radial-gradient(ellipse at 50% 0%,${tc} 0%,transparent 70%)`,
            opacity: progress * 0.85,
          }}/>
          {/* Body content */}
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" style={{ width: W * 0.38, height: W * 0.38, opacity: 0.55, filter: `drop-shadow(0 0 10px ${tg})` }}/>
            <div style={{ fontFamily: "var(--font-brice)", fontSize: W * 0.1, fontWeight: 900, color: tc, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", lineHeight: 1.15, textShadow: `0 0 16px ${tg}` }}>
              GOOD<br/>VIBES<br/>CLUB
            </div>
          </div>
          {/* Holo */}
          <div className="holo" style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg,rgba(255,0,128,0.2),rgba(0,255,148,0.14),rgba(0,191,255,0.2),rgba(191,0,255,0.14))",
            mixBlendMode: "color-dodge", pointerEvents: "none",
          }}/>
        </div>

        {/* TOP FLAP (peels off) */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: TEAR_Y,
          borderRadius: "12px 12px 0 0",
          background: tier === "Legendary"
            ? "linear-gradient(160deg,#3a2c00,#1c1400)"
            : tier === "Rare"
            ? "linear-gradient(160deg,#2d1550,#120a24)"
            : "linear-gradient(160deg,#1a2e50,#0b1422)",
          border: `1.5px solid ${tc}cc`, borderBottom: "none",
          overflow: "hidden",
          transform: `translateX(${progress * 300}px) rotate(${progress * 26}deg)`,
          transformOrigin: "left center",
          opacity: 1 - progress * 0.8,
          transition: live ? "none" : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s",
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Courier New',monospace", fontSize: W * 0.08,
            color: tc, letterSpacing: "0.14em",
            textShadow: `0 0 10px ${tg}`,
          }}>
            {tier === "Legendary" ? "✦ TEAR ✦" : "← TEAR →"}
          </div>
          <div className="holo" style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(135deg,rgba(255,0,128,0.3),rgba(0,255,148,0.2),rgba(0,191,255,0.3))",
            mixBlendMode: "color-dodge", pointerEvents: "none",
          }}/>
        </div>

        {/* Progress bar */}
        {!done && (
          <div style={{ position: "absolute", bottom: -16, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <div style={{
              height: "100%", width: `${progress * 100}%`,
              background: `linear-gradient(90deg,${tc},${tg})`,
              borderRadius: 2, boxShadow: `0 0 8px ${tg}`,
              transition: live ? "none" : "width 0.3s",
            }}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KEYPAD ────────────────────────────────────────────────────────────────────
function Keypad({ value, onChange, onVend, canVend }: {
  value: string; onChange: (v: string) => void; onVend: () => void; canVend: boolean;
}) {
  const keys = ["1","2","3","4","5","6","7","8","9","CLR","0","RND"];
  const press = (k: string) => {
    sfxKey();
    if (k === "CLR") { onChange(""); return; }
    if (k === "RND") { onChange(String(Math.floor(Math.random() * 6969))); return; }
    if (value.length >= 4) return;
    onChange(value + k);
  };
  return (
    <div style={{ padding: "10px 10px 8px", display: "flex", flexDirection: "column", gap: 6 }}>
      {/* LCD display */}
      <div style={{
        background: "#001500", border: "1px solid rgba(46,255,46,0.45)",
        borderRadius: 6, padding: "6px 12px",
        fontFamily: "'Courier New',monospace", fontSize: 17, fontWeight: "bold",
        color: "#2EFF2E", letterSpacing: "0.22em", textAlign: "center",
        textShadow: "0 0 12px rgba(46,255,46,0.9)",
        boxShadow: "inset 0 0 14px rgba(46,255,46,0.1)",
        minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {value ? `# ${value.padStart(4,"0")}` : "_ _ _ _"}
      </div>

      {/* Keys */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
        {keys.map(k => {
          const isSpec = k === "CLR" || k === "RND";
          const kColor = k === "CLR" ? "rgba(255,70,70,0.75)" : k === "RND" ? GOLD : "rgba(255,255,255,0.72)";
          return (
            <motion.button key={k}
              onClick={() => press(k)}
              whileTap={{ scale: 0.86, y: 1 }}
              style={{
                height: 33, borderRadius: 5, cursor: "pointer",
                background: k === "CLR" ? "rgba(255,50,50,0.1)" : k === "RND" ? "rgba(255,224,72,0.1)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${k === "CLR" ? "rgba(255,70,70,0.3)" : k === "RND" ? "rgba(255,224,72,0.32)" : "rgba(255,255,255,0.1)"}`,
                color: kColor, fontFamily: isSpec ? "var(--font-mundial)" : "'Courier New',monospace",
                fontSize: isSpec ? 9 : 15, letterSpacing: isSpec ? "0.04em" : "0.08em",
                boxShadow: "0 2px 0 rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >{k}</motion.button>
          );
        })}
      </div>

      {/* VEND button */}
      <motion.button
        onClick={onVend}
        disabled={!canVend}
        animate={canVend ? { boxShadow: ["0 0 10px rgba(255,224,72,0.28)","0 0 26px rgba(255,224,72,0.68)","0 0 10px rgba(255,224,72,0.28)"] } : {}}
        transition={{ boxShadow: { duration: 1.5, repeat: Infinity } }}
        whileTap={canVend ? { scale: 0.95 } : {}}
        style={{
          height: 42, borderRadius: 8, marginTop: 2, cursor: canVend ? "pointer" : "default",
          background: canVend ? "linear-gradient(135deg,#FFE048,#FFD700,#FFAA00)" : "rgba(255,224,72,0.06)",
          border: `1.5px solid ${canVend ? "rgba(255,224,72,0.85)" : "rgba(255,224,72,0.18)"}`,
          color: canVend ? "#050505" : "rgba(255,224,72,0.28)",
          fontFamily: "var(--font-brice)", fontSize: 15, fontWeight: 900,
          letterSpacing: "0.12em", textTransform: "uppercase",
          transition: "background 0.3s,color 0.3s,border-color 0.3s",
          boxShadow: canVend ? "0 4px 0 rgba(160,120,0,0.5),inset 0 1px 0 rgba(255,255,255,0.28)" : "none",
        }}
      >
        🎰 VEND
      </motion.button>
    </div>
  );
}

// ─── TIER BURST ───────────────────────────────────────────────────────────────
function TierBurst({ tier }: { tier: Tier }) {
  const c = TIER_COLOR[tier];
  return (
    <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:60,overflow:"hidden" }}>
      {Array.from({ length: 32 }, (_,i) => {
        const a = (i / 32) * 360;
        const d = 160 + Math.random() * 240;
        return (
          <motion.div key={i}
            initial={{ x:"50vw",y:"50vh",scale:0,opacity:1 }}
            animate={{ x:`calc(50vw + ${Math.cos(a*Math.PI/180)*d}px)`,y:`calc(50vh + ${Math.sin(a*Math.PI/180)*d}px)`,scale:[0,1.5,0.7],opacity:[1,1,0] }}
            transition={{ duration:1.2,ease:"easeOut",delay:i*0.011 }}
            style={{ position:"absolute",width:7,height:7,borderRadius:"50%",background:c,boxShadow:`0 0 12px ${c},0 0 24px ${c}` }}
          />
        );
      })}
    </div>
  );
}

// ─── VIBE CARD ────────────────────────────────────────────────────────────────
function VibeCard3D({ tokenId, cardData }: { tokenId: number; cardData: CardData }) {
  const [flipped, setFlipped] = useState(false);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isTouchRef = useRef(false);

  useEffect(() => {
    isTouchRef.current = window.matchMedia("(hover: none)").matches;
  }, []);

  const W = typeof window !== "undefined" ? Math.min(300, window.innerWidth * 0.82) : 290;
  const H = W * 1.42;
  const tc = TIER_COLOR[cardData.tier];
  const tg = TIER_GLOW[cardData.tier];

  const onMove = (e: React.MouseEvent) => {
    if (isTouchRef.current || flipped) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setTx(((e.clientY - r.top - r.height/2) / (r.height/2)) * -11);
    setTy(((e.clientX - r.left - r.width/2) / (r.width/2)) * 11);
  };
  const onLeave = () => { setTx(0); setTy(0); };

  const statRow = (label: string, val: number, color: string) => (
    <div key={label} style={{ flex:1, display:"flex", flexDirection:"column", gap:2 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
        <span style={{ fontFamily:"var(--font-mundial)", fontSize:W*0.026, color:"rgba(255,255,255,0.34)", letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</span>
        <span style={{ fontFamily:"var(--font-brice)", fontSize:W*0.055, fontWeight:900, color, textShadow: val>=80?`0 0 10px ${color}`:"none" }}>{val}</span>
      </div>
      <div style={{ height:3, background:"rgba(255,255,255,0.07)", borderRadius:2, overflow:"hidden" }}>
        <motion.div
          initial={{ width:0 }}
          animate={{ width:`${val}%` }}
          transition={{ duration:1.3, ease:"easeOut", delay:0.45 }}
          style={{ height:"100%", borderRadius:2, background:`linear-gradient(90deg,${color}80,${color})`, boxShadow:val>=80?`0 0 6px ${color}`:"none" }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ perspective:1200 }}>
      <motion.div ref={ref}
        onClick={() => setFlipped(f => !f)}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        animate={{ rotateY:flipped?180:ty, rotateX:flipped?0:tx }}
        transition={{ type:"spring", stiffness:190, damping:24 }}
        className="card-rotator"
        style={{ width:W, height:H, position:"relative", cursor:"pointer" }}
      >
        {/* ── FRONT ── */}
        <div className="card-face" style={{
          position:"absolute", inset:0, borderRadius:18,
          background:"linear-gradient(160deg,#080810 0%,#0c0c1c 55%,#060610 100%)",
          border:`2px solid ${tc}`,
          boxShadow:`0 0 0 1px ${tc}22,0 0 50px ${tg},0 28px 70px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.1)`,
          overflow:"hidden",
        }}>
          {/* Holographic foil */}
          <div className="holo" style={{
            position:"absolute", inset:0, zIndex:10,
            background:"linear-gradient(135deg,rgba(255,0,128,0.14) 0%,rgba(255,140,0,0.1) 18%,rgba(255,225,0,0.14) 36%,rgba(0,255,148,0.1) 54%,rgba(0,191,255,0.14) 72%,rgba(191,0,255,0.1) 90%,rgba(255,0,128,0.14) 100%)",
            mixBlendMode:"color-dodge", pointerEvents:"none",
          }}/>

          {/* Portrait */}
          <div style={{ position:"absolute", top:0, left:0, right:0, height:"60%", overflow:"hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/portrait/${tokenId}`} alt={`GVC #${tokenId}`}
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}
            />
            {/* Vignette */}
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(0,0,0,0.08) 0%,transparent 35%,rgba(6,6,16,0.97) 100%)" }}/>
            {/* Top HUD */}
            <div style={{
              position:"absolute", top:0, left:0, right:0,
              display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:`${W*0.04}px ${W*0.05}px`,
              background:"linear-gradient(to bottom,rgba(0,0,0,0.65),transparent)",
            }}>
              <span style={{ fontFamily:"var(--font-mundial)", fontSize:W*0.034, color:"rgba(255,255,255,0.68)" }}>GVC #{tokenId}</span>
              <div style={{
                padding:`${W*0.014}px ${W*0.04}px`, borderRadius:5,
                background:`${tc}22`, border:`1px solid ${tc}99`,
                fontFamily:"var(--font-brice)", fontSize:W*0.034, fontWeight:900,
                color:tc, textTransform:"uppercase", letterSpacing:"0.07em",
                textShadow:`0 0 10px ${tg}`,
              }}>{cardData.tier}</div>
            </div>
          </div>

          {/* Bottom panel */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0,
            padding:`${H*0.022}px ${W*0.055}px ${H*0.028}px`,
            display:"flex", flexDirection:"column", gap:H*0.014,
          }}>
            {/* Badges */}
            {cardData.badges.length > 0 && (
              <div style={{ display:"flex", gap:5, marginBottom:2 }}>
                {cardData.badges.map(b => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={b} src={`https://goodvibesclub.ai/badges/${b}.webp`} alt={b}
                    style={{ width:W*0.1, height:W*0.1, borderRadius:6, border:`1px solid rgba(255,224,72,0.28)` }}
                    onError={e => { (e.target as HTMLImageElement).style.display="none"; }}
                  />
                ))}
              </div>
            )}
            {/* Archetype */}
            <div style={{
              fontFamily:"var(--font-brice)", fontSize:W*0.068, fontWeight:900,
              color:tc, textTransform:"uppercase", letterSpacing:"0.04em",
              textShadow:`0 0 22px ${tg}`, lineHeight:1.1,
            }}>{cardData.archetype}</div>
            {/* Quote */}
            <div style={{
              fontFamily:"var(--font-mundial)", fontSize:W*0.034,
              color:"rgba(255,255,255,0.36)", fontStyle:"italic", lineHeight:1.4,
            }}>"{cardData.quote}"</div>
            {/* Stats */}
            <div style={{ display:"flex", gap:W*0.022, marginTop:3 }}>
              {statRow("RARITY", cardData.rarity, tc)}
              {statRow("DRIP",   cardData.drip,   "#FF6B9D")}
              {statRow("ENERGY", cardData.energy, "#00bfff")}
              {statRow("AURA",   cardData.aura,   "#00ff94")}
            </div>
            {/* Rank */}
            <div style={{
              textAlign:"center", fontFamily:"var(--font-mundial)", fontSize:W*0.028,
              color:"rgba(255,255,255,0.2)", letterSpacing:"0.1em",
            }}>
              RANK #{cardData.rank.toLocaleString()} OF 6,969
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        <div className="card-face" style={{
          position:"absolute", inset:0, borderRadius:18,
          transform:"rotateY(180deg)",
          background:"linear-gradient(160deg,#06000e 0%,#0e0018 55%,#04000a 100%)",
          border:"2px solid rgba(255,224,72,0.4)",
          boxShadow:"0 0 50px rgba(255,224,72,0.18),0 28px 70px rgba(0,0,0,0.85)",
          overflow:"hidden",
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14,
        }}>
          {/* Diagonal pattern */}
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,0.025) 0,rgba(255,224,72,0.025) 1px,transparent 0,transparent 50%)",
            backgroundSize:"14px 14px",
          }}/>
          <div className="holo" style={{
            position:"absolute", inset:0,
            background:"linear-gradient(135deg,rgba(255,0,128,0.1),rgba(0,255,148,0.08),rgba(0,191,255,0.1),rgba(191,0,255,0.08))",
            mixBlendMode:"color-dodge", pointerEvents:"none",
          }}/>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shaka.png" alt="" style={{ width:W*0.42, height:W*0.42, filter:"drop-shadow(0 0 22px rgba(255,224,72,0.7))", position:"relative", zIndex:1 }}/>
          <div style={{ fontFamily:"var(--font-brice)", fontSize:W*0.1, fontWeight:900, color:GOLD, textTransform:"uppercase", letterSpacing:"0.08em", textShadow:"0 0 32px rgba(255,224,72,0.85)", position:"relative", zIndex:1, textAlign:"center", lineHeight:1.1 }}>
            GOOD<br/>VIBES<br/>CLUB
          </div>
          <div style={{ fontFamily:"var(--font-mundial)", fontSize:W*0.035, color:"rgba(255,255,255,0.22)", letterSpacing:"0.14em", position:"relative", zIndex:1 }}>
            TAP TO FLIP
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── DOWNLOAD CARD ────────────────────────────────────────────────────────────
async function downloadCard(tokenId: number, cardData: CardData) {
  try {
    const W=400, H=W*1.42;
    const cv=document.createElement("canvas"); cv.width=W; cv.height=H;
    const ctx=cv.getContext("2d")!;
    const tc=TIER_COLOR[cardData.tier];

    const rr=(x:number,y:number,w:number,h:number,r:number)=>{
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
      ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
      ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
      ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
      ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    };

    rr(0,0,W,H,18); const grad=ctx.createLinearGradient(0,0,W,H);
    grad.addColorStop(0,"#080810"); grad.addColorStop(0.55,"#0c0c1c"); grad.addColorStop(1,"#060610");
    ctx.fillStyle=grad; ctx.fill();

    const imgRes=await fetch(`/api/portrait/${tokenId}`);
    const imgBlob=await imgRes.blob();
    const imgUrl=URL.createObjectURL(imgBlob);
    await new Promise<void>(res=>{
      const i=new Image(); i.onload=()=>{
        ctx.save(); rr(0,0,W,H*0.62,18); ctx.clip();
        ctx.drawImage(i,0,0,W,H*0.62);
        const vg=ctx.createLinearGradient(0,H*0.38,0,H*0.62);
        vg.addColorStop(0,"rgba(6,6,16,0)"); vg.addColorStop(1,"rgba(6,6,16,0.97)");
        ctx.fillStyle=vg; ctx.fillRect(0,H*0.38,W,H*0.24);
        ctx.restore(); URL.revokeObjectURL(imgUrl); res();
      }; i.src=imgUrl;
    });

    ctx.save(); rr(1,1,W-2,H-2,17); ctx.strokeStyle=tc; ctx.lineWidth=2; ctx.stroke(); ctx.restore();

    const brice="900 italic 14px sans-serif";
    const mundial="12px sans-serif";

    ctx.font=`11px ${mundial}`; ctx.fillStyle="rgba(255,255,255,0.65)";
    ctx.textAlign="left"; ctx.textBaseline="middle"; ctx.fillText(`GVC #${tokenId}`,14,22);

    const tierW=ctx.measureText(cardData.tier.toUpperCase()).width+18;
    ctx.save(); rr(W-tierW-12,10,tierW,20,4);
    ctx.fillStyle=tc+"22"; ctx.fill(); ctx.strokeStyle=tc; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
    ctx.font=`900 11px sans-serif`; ctx.fillStyle=tc; ctx.textAlign="right";
    ctx.fillText(cardData.tier.toUpperCase(),W-14,21);

    const BAS=H*0.63; const PAD=16;
    ctx.font=`900 20px sans-serif`; ctx.fillStyle=tc;
    ctx.shadowColor=tc; ctx.shadowBlur=20;
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    ctx.fillText(cardData.archetype.toUpperCase(),PAD,BAS+18); ctx.shadowBlur=0;

    ctx.font=`italic 11px sans-serif`; ctx.fillStyle="rgba(255,255,255,0.38)";
    ctx.fillText(`"${cardData.quote}"`,PAD,BAS+36);

    const statCols=4,gap=6,sW=(W-PAD*2-gap*(statCols-1))/statCols;
    const SY=BAS+46,SH=38;
    const statColors=[tc,"#FF6B9D","#00bfff","#00ff94"];
    (["RARITY","DRIP","ENERGY","AURA"] as const).forEach((lbl,i)=>{
      const val=[cardData.rarity,cardData.drip,cardData.energy,cardData.aura][i];
      const sx=PAD+i*(sW+gap);
      ctx.save(); rr(sx,SY,sW,SH,7); ctx.fillStyle="rgba(5,5,5,0.75)"; ctx.fill();
      ctx.strokeStyle="rgba(255,224,72,0.14)"; ctx.lineWidth=1; ctx.stroke(); ctx.restore();
      ctx.font=`8px sans-serif`; ctx.fillStyle="rgba(255,255,255,0.35)";
      ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(lbl,sx+sW/2,SY+10);
      ctx.font=`900 20px sans-serif`; ctx.fillStyle=statColors[i];
      if(val>=80){ctx.shadowColor=statColors[i];ctx.shadowBlur=12;}
      ctx.fillText(String(val),sx+sW/2,SY+27); ctx.shadowBlur=0;
    });

    ctx.font=`9px sans-serif`; ctx.fillStyle="rgba(255,255,255,0.2)";
    ctx.textAlign="center"; ctx.textBaseline="alphabetic";
    ctx.fillText(`RANK #${cardData.rank.toLocaleString()} OF 6,969`,W/2,H-10);

    const a=document.createElement("a"); a.download=`vibe-card-${tokenId}.png`;
    a.href=cv.toDataURL("image/png"); a.click();
  } catch(e) { console.error("Download failed",e); }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function Page() {
  const [phase,    setPhase]    = useState<Phase>("IDLE");
  const [input,    setInput]    = useState("");
  const [tokenId,  setTokenId]  = useState<number|null>(null);
  const [cardData, setCardData] = useState<CardData|null>(null);
  const [burst,    setBurst]    = useState(false);

  const slotRef = useRef<HTMLDivElement>(null);
  const machineOn = phase !== "IDLE";
  const machineVisible = ["IDLE","ACTIVE","VENDING","DRAWER"].includes(phase);

  const msgMap: Record<Phase,string> = {
    IDLE:         "INSERT COIN TO BEGIN",
    ACTIVE:       input ? `TOKEN # ${input.padStart(4,"0")}` : "ENTER TOKEN ID",
    VENDING:      "DISPENSING...",
    DRAWER:       "COLLECT YOUR PACK ▼",
    PACK_HAND:    "TEAR OPEN YOUR PACK!",
    CARD_REVEALED:`GVC #${tokenId} REVEALED!`,
  };

  const onCoin = useCallback(() => {
    sfxCoin();
    setPhase("ACTIVE");
  }, []);

  const onVend = useCallback(() => {
    const id = parseInt(input, 10);
    if (isNaN(id) || id < 0 || id > 6968) return;
    setTokenId(id);
    setCardData(generateCardData(id));
    setPhase("VENDING");
    sfxVend();
    setTimeout(() => setPhase("DRAWER"), 1300);
  }, [input]);

  const onCollect = useCallback(() => setPhase("PACK_HAND"), []);

  const onTearDone = useCallback(() => {
    setPhase("CARD_REVEALED");
    sfxReveal();
    setBurst(true);
    setTimeout(() => setBurst(false), 1600);
  }, []);

  const onReset = useCallback(() => {
    setPhase("IDLE");
    setInput("");
    setTokenId(null);
    setCardData(null);
    setBurst(false);
  }, []);

  const canVend = phase === "ACTIVE" && input.length > 0 && !isNaN(parseInt(input));
  const tier: Tier = (cardData?.tier ?? "Common") as Tier;

  return (
    <>
      <style>{STYLES}</style>
      <style>{`.card-rotator{-webkit-transform-style:preserve-3d;transform-style:preserve-3d}.card-face{-webkit-backface-visibility:hidden;backface-visibility:hidden}`}</style>

      {burst && cardData && <TierBurst tier={cardData.tier}/>}

      <main style={{
        minHeight:"100vh", display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-start",
        padding:"16px 12px 80px", overflowX:"hidden", width:"100%", boxSizing:"border-box",
      }}>

        {/* ── HEADER ── */}
        <motion.div initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} style={{ textAlign:"center", marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:24,height:24 }}/>
            <h1 className="text-shimmer" style={{ fontFamily:"var(--font-brice)",fontSize:"clamp(18px,5vw,34px)",fontWeight:900,margin:0,textTransform:"uppercase",letterSpacing:"0.06em" }}>
              THE VIBE MACHINE
            </h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:24,height:24 }}/>
          </div>
          <p style={{ color:"rgba(255,255,255,0.22)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",margin:0 }}>
            GVC Collectible Card Vending Machine
          </p>
        </motion.div>

        {/* ── VENDING MACHINE ── */}
        <AnimatePresence>
          {machineVisible && (
            <motion.div key="machine"
              initial={{ opacity:0,y:18 }}
              animate={{ opacity:1,y:0 }}
              exit={{ opacity:0,x:-140,scale:0.85, transition:{ duration:0.5,ease:"easeIn" } }}
              style={{ display:"flex",alignItems:"flex-start",gap:10,width:"100%",maxWidth:430,justifyContent:"center" }}
            >
              {/* Coin tray */}
              <div style={{ paddingTop:56,flexShrink:0 }}>
                <AnimatePresence>
                  {phase === "IDLE" && (
                    <motion.div initial={{ opacity:0,x:-14 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,scale:0.5 }}>
                      <DraggableCoin onInsert={onCoin} slotRef={slotRef}/>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* MACHINE BODY */}
              <div
                className={machineOn ? "machine-on" : ""}
                style={{
                  flex:1,
                  background:"linear-gradient(180deg,#0d0d18 0%,#0a0a12 55%,#07070e 100%)",
                  border:`2px solid ${machineOn ? "rgba(255,224,72,0.52)" : "rgba(255,224,72,0.18)"}`,
                  borderRadius:18, overflow:"hidden",
                  transition:"border-color 0.5s",
                }}
              >
                <LEDStrip active={machineOn}/>

                {/* Brand row */}
                <div style={{ padding:"10px 12px 8px", borderBottom:"1px solid rgba(255,224,72,0.07)", background:"linear-gradient(180deg,rgba(255,224,72,0.025) 0%,transparent 100%)" }}>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8 }}>
                    {/* Logo */}
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/gvc-logotype.svg" alt="GVC" style={{ height:14,opacity:0.58 }}/>
                      <span style={{ fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,color:GOLD,letterSpacing:"0.1em",textTransform:"uppercase",textShadow:"0 0 14px rgba(255,224,72,0.5)" }}>
                        VIBE MACHINE
                      </span>
                    </div>
                    {/* Coin slot */}
                    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                      <motion.div ref={slotRef}
                        animate={{ boxShadow: phase==="IDLE"
                          ? ["0 0 6px rgba(255,224,72,0.45)","0 0 14px rgba(255,224,72,0.75)","0 0 6px rgba(255,224,72,0.45)"]
                          : "0 0 8px rgba(46,255,46,0.55)" }}
                        transition={{ boxShadow:{ duration:1.1,repeat:phase==="IDLE"?Infinity:0 } }}
                        style={{
                          width:44,height:10,borderRadius:5,
                          background: phase!=="IDLE" ? "rgba(46,255,46,0.14)" : "#020802",
                          border:`2px solid ${phase!=="IDLE" ? "rgba(46,255,46,0.6)" : "rgba(255,224,72,0.55)"}`,
                          transition:"all 0.4s",
                        }}
                      />
                      <span style={{ fontFamily:"var(--font-mundial)",fontSize:6,color:"rgba(255,224,72,0.32)",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>COIN SLOT</span>
                    </div>
                  </div>
                  <DisplayPanel msg={msgMap[phase]} active={machineOn}/>
                </div>

                {/* Glass window — pack display */}
                <div style={{
                  position:"relative",margin:"8px 10px",
                  background:"linear-gradient(145deg,rgba(14,14,24,0.97),rgba(8,8,14,0.99))",
                  border:"1px solid rgba(255,224,72,0.1)",borderRadius:10,overflow:"hidden",
                  minHeight:170,display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                  {/* Glass top reflection */}
                  <div style={{ position:"absolute",inset:0,zIndex:10,pointerEvents:"none",background:"linear-gradient(135deg,rgba(255,255,255,0.048) 0%,transparent 50%,rgba(255,255,255,0.018) 100%)" }}/>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"rgba(255,255,255,0.07)",zIndex:11 }}/>

                  <div style={{ padding:16,display:"flex",alignItems:"center",justifyContent:"center",zIndex:1 }}>
                    {phase === "IDLE" ? (
                      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:26,opacity:0.18 }}>🎰</span>
                        <span style={{ fontFamily:"var(--font-mundial)",fontSize:10,color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em",textTransform:"uppercase" }}>DRAG COIN TO SLOT</span>
                      </div>
                    ) : phase === "VENDING" ? (
                      <motion.div initial={{ y:0 }} animate={{ y:140,rotate:6 }} transition={{ duration:0.85,ease:[0.4,0,1,1] }}>
                        <GlossyPack tier={tier} w={110}/>
                      </motion.div>
                    ) : (
                      <GlossyPack tier={tier} w={110} floating/>
                    )}
                  </div>

                  {/* Drawer strip */}
                  <AnimatePresence>
                    {phase === "DRAWER" && (
                      <motion.div initial={{ y:28,opacity:0 }} animate={{ y:0,opacity:1 }}
                        className="drawer-ready"
                        style={{
                          position:"absolute",bottom:0,left:0,right:0,height:42,
                          background:"rgba(0,18,0,0.9)",borderTop:"1px solid rgba(46,255,46,0.35)",
                          display:"flex",alignItems:"center",justifyContent:"center",zIndex:12,
                        }}>
                        <motion.span animate={{ opacity:[0.6,1,0.6] }} transition={{ duration:0.9,repeat:Infinity }}
                          style={{ fontFamily:"var(--font-mundial)",fontSize:10,color:"rgba(46,255,46,0.85)",letterSpacing:"0.14em",textTransform:"uppercase" }}>
                          ▼ PACK DISPENSED — COLLECT ▼
                        </motion.span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Locked overlay */}
                  {phase === "IDLE" && <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.48)",zIndex:9 }}/>}
                </div>

                {/* Keypad */}
                <div style={{ opacity:machineOn?1:0.28, transition:"opacity 0.4s", pointerEvents:machineOn?"auto":"none" }}>
                  <Keypad value={input} onChange={v => { setInput(v); if(v&&phase==="ACTIVE") setPhase("ACTIVE"); }} onVend={onVend} canVend={canVend}/>
                </div>

                {/* Collect button */}
                <AnimatePresence>
                  {phase === "DRAWER" && (
                    <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }} style={{ padding:"0 10px 10px" }}>
                      <motion.button onClick={onCollect}
                        animate={{ boxShadow:["0 0 14px rgba(46,255,46,0.3)","0 0 30px rgba(46,255,46,0.7)","0 0 14px rgba(46,255,46,0.3)"] }}
                        transition={{ boxShadow:{ duration:1.1,repeat:Infinity } }}
                        whileTap={{ scale:0.96 }}
                        style={{
                          width:"100%",height:42,borderRadius:8,cursor:"pointer",
                          background:"linear-gradient(135deg,rgba(46,255,46,0.16),rgba(46,255,46,0.08))",
                          border:"1.5px solid rgba(46,255,46,0.62)",
                          color:"#2EFF2E",fontFamily:"var(--font-brice)",fontSize:14,fontWeight:900,
                          letterSpacing:"0.12em",textTransform:"uppercase",
                          textShadow:"0 0 12px rgba(46,255,46,0.85)",
                        }}>
                        ↑ COLLECT YOUR PACK ↑
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <LEDStrip active={machineOn}/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── PACK IN HAND (tear) ── */}
        <AnimatePresence>
          {phase === "PACK_HAND" && cardData && (
            <motion.div key="tear"
              initial={{ opacity:0,scale:0.72,y:36 }}
              animate={{ opacity:1,scale:1,y:0 }}
              exit={{ opacity:0,scale:0.85 }}
              transition={{ type:"spring",stiffness:200,damping:22 }}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:20,marginTop:10 }}
            >
              <PackTearSequence tier={tier} onComplete={onTearDone}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CARD REVEALED ── */}
        <AnimatePresence>
          {phase === "CARD_REVEALED" && tokenId !== null && cardData && (
            <motion.div key="card"
              initial={{ opacity:0,scale:0.45,y:55 }}
              animate={{ opacity:1,scale:1,y:0 }}
              transition={{ type:"spring",stiffness:155,damping:18,delay:0.08 }}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:18,marginTop:6 }}
            >
              <VibeCard3D tokenId={tokenId} cardData={cardData}/>

              <div style={{ display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center" }}>
                <motion.button whileTap={{ scale:0.95 }}
                  onClick={() => {
                    const t=`Just pulled GVC #${tokenId} — ${cardData.tier} tier · ${cardData.archetype} 🤙 #GoodVibesClub #GVC`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`,"_blank");
                  }}
                  style={{
                    padding:"10px 22px",borderRadius:10,cursor:"pointer",border:"none",
                    background:"linear-gradient(135deg,#FFE048,#FFD700,#FFAA00)",
                    color:"#050505",fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,
                    letterSpacing:"0.08em",boxShadow:"0 4px 20px rgba(255,224,72,0.45)",
                  }}>𝕏 SHARE ON X</motion.button>

                <motion.button whileTap={{ scale:0.95 }}
                  onClick={() => downloadCard(tokenId, cardData)}
                  style={{
                    padding:"10px 22px",borderRadius:10,cursor:"pointer",
                    background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.18)",
                    color:"rgba(255,255,255,0.7)",fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em",
                  }}>↓ DOWNLOAD</motion.button>

                <motion.button whileTap={{ scale:0.95 }}
                  onClick={onReset}
                  style={{
                    padding:"10px 22px",borderRadius:10,cursor:"pointer",
                    background:"rgba(255,224,72,0.07)",border:"1.5px solid rgba(255,224,72,0.32)",
                    color:GOLD,fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em",
                  }}>🎰 VEND ANOTHER</motion.button>
              </div>

              <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.16)",margin:0,letterSpacing:"0.08em" }}>
                Tap card to flip
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div style={{ marginTop:38,textAlign:"center" }}>
          <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.14)",letterSpacing:"0.1em",margin:0 }}>
            Built by <span style={{ color:"rgba(255,224,72,0.32)" }}>@imaesr</span> for the GVC Vibeathon
          </p>
        </div>
      </main>
    </>
  );
}
