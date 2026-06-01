"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

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
  | "IDLE"
  | "COIN_INSERTED"
  | "PACK_SELECTED"
  | "VENDING"
  | "FLAP_READY"
  | "FLAP_OPEN"
  | "CARD_REVEALED";

type Tier = "Common" | "Rare" | "Legendary";

interface CardData {
  rarity: number; drip: number; energy: number; aura: number;
  tier: Tier; rank: number; archetype: string; quote: string; badges: string[];
}

// ─── SEEDED RNG ───────────────────────────────────────────────────────────────

function seededRNG(seed: number) {
  let s = ((seed * 1664525) + 1013904223) >>> 0;
  return () => {
    s = ((s * 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
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
  Common:    "0 0 22px rgba(255,224,72,0.35),0 0 44px rgba(255,224,72,0.12)",
  Rare:      "0 0 22px rgba(168,85,247,0.50),0 0 44px rgba(168,85,247,0.18)",
  Legendary: "0 0 32px rgba(255,224,72,0.70),0 0 64px rgba(255,95,31,0.35),0 0 100px rgba(255,224,72,0.12)",
};

// ─── WEB AUDIO SOUNDS ─────────────────────────────────────────────────────────

let _ctx: AudioContext | null = null;
function getCtx() {
  if (!_ctx) _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === "suspended") _ctx.resume();
  return _ctx;
}

function sfxCoin() {
  try {
    const c = getCtx();
    const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine"; o.frequency.setValueAtTime(1400, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(900, c.currentTime + 0.1);
    g.gain.setValueAtTime(0.35, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
    o.start(); o.stop(c.currentTime + 0.22);
    // second ping
    const o2 = c.createOscillator(); const g2 = c.createGain();
    o2.connect(g2); g2.connect(c.destination);
    o2.type = "sine"; o2.frequency.value = 1800;
    g2.gain.setValueAtTime(0, c.currentTime + 0.05);
    g2.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o2.start(c.currentTime + 0.05); o2.stop(c.currentTime + 0.3);
  } catch {}
}

function sfxActivate() {
  try {
    const c = getCtx();
    const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sine"; o.frequency.setValueAtTime(220, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(660, c.currentTime + 0.25);
    g.gain.setValueAtTime(0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);
    o.start(); o.stop(c.currentTime + 0.35);
  } catch {}
}

function sfxVend() {
  try {
    const c = getCtx();
    // whirr
    const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = "sawtooth"; o.frequency.setValueAtTime(90, c.currentTime);
    o.frequency.linearRampToValueAtTime(55, c.currentTime + 0.5);
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.55);
    o.start(); o.stop(c.currentTime + 0.55);
    // thunk
    const o2 = c.createOscillator(); const g2 = c.createGain();
    o2.connect(g2); g2.connect(c.destination);
    o2.type = "sine"; o2.frequency.setValueAtTime(110, c.currentTime + 0.5);
    o2.frequency.exponentialRampToValueAtTime(28, c.currentTime + 0.7);
    g2.gain.setValueAtTime(0, c.currentTime); g2.gain.setValueAtTime(0.5, c.currentTime + 0.5);
    g2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.72);
    o2.start(); o2.stop(c.currentTime + 0.72);
  } catch {}
}

function sfxTear() {
  try {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * 0.28, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2800; f.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = 0.7;
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(); src.stop(c.currentTime + 0.28);
  } catch {}
}

function sfxReveal() {
  try {
    const c = getCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = "sine"; o.frequency.value = freq;
      const t = c.currentTime + i * 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.start(t); o.stop(t + 0.4);
    });
  } catch {}
}

// ─── CARD SIZE ────────────────────────────────────────────────────────────────

const DESIGN_W = 400;
const DESIGN_H = 560;

function useCardSize() {
  const [cardW, setCardW] = useState(() =>
    typeof window === "undefined" ? DESIGN_W : Math.min(DESIGN_W, window.innerWidth - 48)
  );
  useEffect(() => {
    const update = () => setCardW(Math.min(DESIGN_W, window.innerWidth - 48));
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return { cardW, cardH: Math.round(cardW * DESIGN_H / DESIGN_W), scale: cardW / DESIGN_W };
}

// ─── FALLBACK ART ─────────────────────────────────────────────────────────────

const PALETTES = [
  ["#C084FC","#6366F1","#FFE048"],["#A855F7","#EC4899","#FF5F1F"],
  ["#3B82F6","#6366F1","#C084FC"],["#FF5F1F","#FFE048","#C084FC"],
  ["#06B6D4","#3B82F6","#A855F7"],["#FFE048","#FF7A00","#A855F7"],
];

function FallbackArt({ id }: { id: number }) {
  const rng = seededRNG(id * 3571 + 13);
  const palette = PALETTES[Math.floor(rng() * PALETTES.length)];
  const blobs = Array.from({ length: 9 }, () => ({
    cx: Math.floor(rng() * 110) - 5, cy: Math.floor(rng() * 150) - 5,
    rx: 18 + Math.floor(rng() * 38), ry: 14 + Math.floor(rng() * 32),
    color: palette[Math.floor(rng() * palette.length)], op: 0.22 + rng() * 0.48,
  }));
  const uid = `fa-${id}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" style={{ position:"absolute",inset:0,width:"100%",height:"100%" }}
      preserveAspectRatio="xMidYMid slice" viewBox="0 0 100 140">
      <defs>
        {blobs.map((b,i) => (
          <radialGradient key={i} id={`${uid}-g${i}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={b.color} stopOpacity={b.op}/>
            <stop offset="100%" stopColor={b.color} stopOpacity="0"/>
          </radialGradient>
        ))}
        <filter id={`${uid}-blur`}><feGaussianBlur stdDeviation="3"/></filter>
      </defs>
      <rect width="100" height="140" fill="#05040f"/>
      {blobs.map((b,i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry}
          fill={`url(#${uid}-g${i})`} filter={`url(#${uid}-blur)`}/>
      ))}
      <text x="50" y="70" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(255,255,255,0.04)" fontSize="18" fontFamily="serif" fontWeight="900" letterSpacing="4">#{id}</text>
    </svg>
  );
}

// ─── TIER BURST ───────────────────────────────────────────────────────────────

function TierBurst({ tier, id }: { tier: Tier; id: number }) {
  const rng = seededRNG(id * 4321 + 99);
  const colorMap = {
    Common:    ["#FFE048","#FFF3A0","#FFD700"],
    Rare:      ["#A855F7","#C084FC","#7C3AED"],
    Legendary: ["#FF7A00","#FFE048","#FF5F1F"],
  };
  const colors = colorMap[tier];
  const count = { Common: 22, Rare: 30, Legendary: 40 }[tier];
  const particles = Array.from({ length: count }, (_,i) => {
    const angle = (i / count) * 360 + rng() * 22;
    const dist  = 90 + rng() * 180;
    const rad   = angle * Math.PI / 180;
    return { tx: Math.cos(rad)*dist, ty: Math.sin(rad)*dist, size: 4+Math.floor(rng()*9), color: colors[Math.floor(rng()*colors.length)], delay: rng()*0.28, dur: 0.9+rng()*0.7 };
  });
  return (
    <div style={{ position:"absolute",inset:0,pointerEvents:"none",overflow:"visible",zIndex:20 }}>
      {particles.map((p,i) => (
        <motion.div key={i} style={{ position:"absolute",left:"50%",top:"40%",width:p.size,height:p.size,marginLeft:-p.size/2,marginTop:-p.size/2,borderRadius:"50%",background:p.color,boxShadow:`0 0 ${p.size*2}px ${p.color}90` }}
          initial={{ x:0,y:0,opacity:1,scale:1 }}
          animate={{ x:p.tx,y:p.ty,opacity:0,scale:0 }}
          transition={{ duration:p.dur,delay:p.delay,ease:[0.23,1,0.32,1] }}
        />
      ))}
    </div>
  );
}

// ─── VIBE CARD (3D flippable) ─────────────────────────────────────────────────

function VibeCard({ id, data }: { id: number; data: CardData }) {
  const { cardW, cardH, scale } = useCardSize();
  const [flipped,  setFlipped]  = useState(false);
  const [tilt,     setTilt]     = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const [holo,     setHolo]     = useState({ x:50, y:50 });
  const [imgState, setImgState] = useState<"loading"|"loaded"|"error">("loading");
  const drag = useRef({ sx:0,sy:0,tx:0,ty:0,moved:false,down:false });

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx:e.clientX,sy:e.clientY,tx:tilt.x,ty:tilt.y,moved:false,down:true };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.down) return;
    const dx = e.clientX - drag.current.sx; const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx)>4||Math.abs(dy)>4) drag.current.moved = true;
    const r = e.currentTarget.getBoundingClientRect();
    setHolo({ x:((e.clientX-r.left)/r.width)*100, y:((e.clientY-r.top)/r.height)*100 });
    setTilt({ x:Math.max(-20,Math.min(20,drag.current.tx-dy*0.2)), y:Math.max(-30,Math.min(30,drag.current.ty+dx*0.35)) });
  };
  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false; setDragging(false);
    if (!drag.current.moved) setFlipped(f=>!f);
    setTilt({ x:0,y:0 });
  };

  const { rarity,drip,energy,aura,tier,rank,archetype,quote,badges } = data;
  const isLegendary = tier==="Legendary";
  const totalRotY = (flipped?180:0)+tilt.y;

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center" }}>
      <div className="perspective-wrap" style={{ width:cardW,height:cardH,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div className="card-rotator" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          style={{ width:DESIGN_W,height:DESIGN_H,position:"relative",transformOrigin:"center center",
            transform:`scale(${scale}) rotateX(${tilt.x}deg) rotateY(${totalRotY}deg)`,
            transition:dragging?"none":"transform 0.6s cubic-bezier(0.175,0.885,0.32,1.275)",
            cursor:dragging?"grabbing":"grab",userSelect:"none",touchAction:"none",willChange:"transform" }}
        >
          {/* ── FRONT ── */}
          <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:16,overflow:"hidden",
            background:"#050505",border:`2px solid ${TIER_BORDER[tier]}`,boxShadow:TIER_GLOW[tier],
            animation:isLegendary?"legendary-glow 2.4s ease-in-out infinite":undefined,transform:"translateZ(0.01px)" }}>
            <div style={{ position:"absolute",inset:0 }}>
              {imgState==="loading"&&<div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#151510 0%,#0d0d16 100%)",display:"flex",alignItems:"center",justifyContent:"center" }}><div className="gvc-spinner"/></div>}
              {imgState==="error"&&<FallbackArt id={id}/>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/portrait/${id}`} alt={`GVC #${id}`}
                style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top",display:imgState==="loaded"?"block":"none" }}
                onLoad={()=>setImgState("loaded")} onError={()=>setImgState("error")}/>
            </div>
            <div style={{ position:"absolute",top:0,left:0,right:0,zIndex:5,padding:"10px 12px",background:"linear-gradient(to bottom,rgba(5,5,5,0.92) 0%,transparent 100%)",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.6)",letterSpacing:"0.1em",textTransform:"uppercase" }}>GVC #{id}</span>
              <span style={{ fontFamily:"var(--font-brice)",fontSize:10,fontWeight:900,color:TIER_LABEL_COLOR[tier],letterSpacing:"0.15em",textTransform:"uppercase",padding:"2px 8px",borderRadius:4,border:`1px solid ${TIER_LABEL_COLOR[tier]}`,background:`${TIER_LABEL_COLOR[tier]}18` }}>{tier}</span>
            </div>
            <div style={{ position:"absolute",inset:0,zIndex:6,pointerEvents:"none",
              background:[`linear-gradient(${125+tilt.y*2.5+tilt.x*1.2}deg,`,`hsla(${(holo.x*3.6+0)%360},100%,65%,0) 0%,`,`hsla(${(holo.x*3.6+40)%360},100%,65%,0.18) 20%,`,`hsla(${(holo.x*3.6+80)%360},100%,65%,0.22) 40%,`,`hsla(${(holo.x*3.6+120)%360},100%,65%,0.18) 60%,`,`hsla(${(holo.x*3.6+200)%360},100%,65%,0.12) 80%,`,`hsla(${(holo.x*3.6+280)%360},100%,65%,0) 100%)`].join(""),
              mixBlendMode:"color-dodge" as React.CSSProperties["mixBlendMode"],
              opacity:Math.min(1,0.1+Math.sqrt(tilt.x**2+tilt.y**2)/36) }}/>
            {isLegendary&&<div className="card-shimmer" style={{ position:"absolute",inset:0,zIndex:7,pointerEvents:"none" }}/>}
            <div style={{ position:"absolute",bottom:0,left:0,right:0,height:"60%",zIndex:8,background:"linear-gradient(to top,rgba(5,5,5,0.98) 0%,rgba(5,5,5,0.86) 36%,rgba(5,5,5,0.34) 66%,transparent 100%)" }}/>
            <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"16px 16px 18px",zIndex:9 }}>
              <div style={{ display:"flex",gap:6,marginBottom:11,flexWrap:"wrap" }}>
                {badges.map(b=>(
                  <div key={b} style={{ width:36,height:36,borderRadius:8,overflow:"hidden",flexShrink:0,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,224,72,0.2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`https://goodvibesclub.ai/badges/${b}.webp`} alt={b} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily:"var(--font-brice)",fontSize:21,fontWeight:900,color:"#FFE048",margin:0,textTransform:"uppercase",letterSpacing:"0.03em",lineHeight:1.1,textShadow:"0 0 26px rgba(255,224,72,0.65)" }}>{archetype}</p>
              <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,fontStyle:"italic",color:"rgba(255,255,255,0.48)",margin:"4px 0 12px",lineHeight:1.4 }}>&ldquo;{quote}&rdquo;</p>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
                {([["RARITY",rarity],["DRIP",drip],["ENERGY",energy],["AURA",aura]] as [string,number][]).map(([lbl,val])=>(
                  <div key={lbl} style={{ background:"rgba(5,5,5,0.75)",borderRadius:8,padding:"5px 4px",textAlign:"center",border:"1px solid rgba(255,224,72,0.16)" }}>
                    <p style={{ fontFamily:"var(--font-mundial)",fontSize:8.5,color:"rgba(255,255,255,0.38)",margin:0,letterSpacing:"0.08em" }}>{lbl}</p>
                    <p style={{ fontFamily:"var(--font-brice)",fontSize:24,fontWeight:900,color:"#FFE048",margin:0,lineHeight:1,textShadow:val>=80?"0 0 16px rgba(255,224,72,0.9)":"none" }}>{val}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,255,255,0.28)",margin:"6px 0 0",textAlign:"center",letterSpacing:"0.07em" }}>RANK #{rank.toLocaleString()} OF 6,969</p>
            </div>
          </div>

          {/* ── BACK ── */}
          <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:16,overflow:"hidden",background:"#0a0a0a",
            border:`2px solid ${TIER_BORDER[tier]}`,boxShadow:TIER_GLOW[tier],transform:"rotateY(180deg) translateZ(0.01px)",
            animation:isLegendary?"legendary-glow 2.4s ease-in-out infinite":undefined }}>
            <div style={{ position:"absolute",inset:0,backgroundImage:["repeating-linear-gradient(45deg,rgba(255,224,72,0.022) 0px,rgba(255,224,72,0.022) 1px,transparent 1px,transparent 32px)","repeating-linear-gradient(-45deg,rgba(255,224,72,0.022) 0px,rgba(255,224,72,0.022) 1px,transparent 1px,transparent 32px)"].join(",") }}/>
            <div style={{ position:"absolute",inset:7,borderRadius:10,border:"1px solid rgba(255,224,72,0.22)",pointerEvents:"none" }}/>
            <div style={{ position:"absolute",inset:12,borderRadius:6,border:"1px solid rgba(255,224,72,0.10)",pointerEvents:"none" }}/>
            <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18 }}>
              <div style={{ width:96,height:96,filter:"drop-shadow(0 0 28px rgba(255,224,72,0.6))" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shaka.png" alt="Shaka" className="shaka-idle" style={{ width:"100%",height:"100%",objectFit:"contain" }}/>
              </div>
              <div style={{ textAlign:"center" }}>
                <p style={{ fontFamily:"var(--font-brice)",fontSize:32,fontWeight:900,color:"#FFE048",margin:0,textTransform:"uppercase",letterSpacing:"0.06em",textShadow:"0 0 34px rgba(255,224,72,0.65)" }}>THE VIBE CARD</p>
                <p style={{ fontFamily:"var(--font-mundial)",fontSize:12,color:"rgba(255,255,255,0.34)",margin:"5px 0 0",letterSpacing:"0.16em",textTransform:"uppercase" }}>Good Vibes Club</p>
              </div>
              <div style={{ padding:"5px 16px",borderRadius:20,border:`1px solid ${TIER_BORDER[tier]}`,background:`${TIER_BORDER[tier]}14` }}>
                <p style={{ fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,color:TIER_BORDER[tier],margin:0,letterSpacing:"0.1em" }}>GVC #{id} · {tier}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <motion.div
        animate={{ boxShadow:["0 0 8px rgba(255,224,72,0.25)","0 0 20px rgba(255,224,72,0.65)","0 0 8px rgba(255,224,72,0.25)"] }}
        transition={{ duration:2.2,repeat:Infinity,ease:"easeInOut" }}
        style={{ marginTop:14,display:"inline-flex",alignItems:"center",gap:8,padding:"7px 18px",borderRadius:20,background:"rgba(255,224,72,0.1)",border:"1px solid rgba(255,224,72,0.45)",color:"#FFE048",fontFamily:"var(--font-mundial)",fontSize:12,letterSpacing:"0.08em" }}>
        <span style={{ fontSize:10 }}>✦</span>
        {flipped?"Tap to flip back":"Drag to tilt · Tap to flip"}
        <span style={{ fontSize:10 }}>✦</span>
      </motion.div>
    </div>
  );
}

// ─── SHAKA COIN ───────────────────────────────────────────────────────────────

function ShakaCoin({ onInsert }: { onInsert: () => void }) {
  const [inserting, setInserting] = useState(false);
  const handle = () => {
    if (inserting) return;
    setInserting(true);
    sfxCoin();
    setTimeout(onInsert, 650);
  };
  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
      <motion.div onClick={handle}
        animate={inserting
          ? { scale:0,x:80,y:-50,rotate:720,opacity:0 }
          : { rotate:[0,8,-8,4,-4,0],scale:[1,1.05,0.97,1.02,0.99,1] }}
        transition={inserting
          ? { duration:0.55,ease:"easeIn" }
          : { duration:4,repeat:Infinity,ease:"easeInOut" }}
        style={{ width:70,height:70,borderRadius:"50%",
          background:"conic-gradient(from 0deg,#8B6914,#FFE048,#FFD700,#FFA500,#FFD700,#FFE048,#B8860B,#FFE048,#8B6914)",
          boxShadow:"0 0 24px rgba(255,224,72,0.7),0 0 48px rgba(255,224,72,0.3),inset 0 3px 6px rgba(255,255,255,0.35),inset 0 -3px 6px rgba(0,0,0,0.4)",
          display:"flex",alignItems:"center",justifyContent:"center",
          cursor:"pointer",userSelect:"none",
          border:"3px solid rgba(255,224,72,0.9)",flexShrink:0 }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/shaka.png" alt="coin" style={{ width:40,height:40,objectFit:"contain",filter:"drop-shadow(0 0 4px rgba(0,0,0,0.6))" }}/>
      </motion.div>
      {!inserting&&<p style={{ fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,224,72,0.5)",letterSpacing:"0.1em",textTransform:"uppercase",margin:0,textAlign:"center" }}>Tap to insert</p>}
    </div>
  );
}

// ─── MYSTERY PACK CELL ────────────────────────────────────────────────────────

function PackCell({ tier,selected,locked }: { tier:Tier;selected:boolean;locked:boolean }) {
  const bc = { Common:"#FFE048",Rare:"#A855F7",Legendary:"#FF7A00" }[tier];
  const gc = { Common:"rgba(255,224,72,0.6)",Rare:"rgba(168,85,247,0.6)",Legendary:"rgba(255,122,0,0.7)" }[tier];
  return (
    <div style={{ aspectRatio:"2/3",borderRadius:6,position:"relative",overflow:"hidden",
      background:selected?"linear-gradient(155deg,#1e1800,#2a2000)":"linear-gradient(155deg,#111,#181818)",
      border:selected?`2px solid ${bc}`:"1px solid rgba(255,224,72,0.12)",
      boxShadow:selected?`0 0 14px ${gc},0 0 28px ${gc}`:"none",
      opacity:locked?0.35:1,transition:"all 0.3s ease",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3 }}>
      <div style={{ position:"absolute",inset:0,opacity:0.05,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px)" }}/>
      <span style={{ fontFamily:"var(--font-brice)",fontSize:18,fontWeight:900,color:selected?bc:"rgba(255,224,72,0.35)",textShadow:selected?`0 0 14px ${gc}`:"none",zIndex:1 }}>?</span>
      <div style={{ width:5,height:5,borderRadius:"50%",background:bc,boxShadow:`0 0 5px ${bc}`,zIndex:1,opacity:selected?1:0.5 }}/>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${bc}50,transparent)` }}/>
      <div style={{ position:"absolute",bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${bc}50,transparent)` }}/>
    </div>
  );
}

// ─── PACK GRID ────────────────────────────────────────────────────────────────

function PackGrid({ selectedSlot,locked,tokenId }: { selectedSlot:number;locked:boolean;tokenId:number|null }) {
  const slotTiers = useMemo(():Tier[] => {
    if (tokenId===null) return Array(9).fill("Common" as Tier);
    const rng = seededRNG(tokenId*7+42);
    return Array.from({length:9},()=>{ const r=rng(); return r>0.87?"Legendary":r>0.66?"Rare":"Common"; });
  },[tokenId]);

  return (
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,padding:"10px" }}>
      {Array.from({length:9},(_,i)=>(
        <PackCell key={i} tier={slotTiers[i]} selected={selectedSlot===i} locked={locked}/>
      ))}
    </div>
  );
}

// ─── DISPLAY PANEL ────────────────────────────────────────────────────────────

function DisplayPanel({ message,active }: { message:string;active:boolean }) {
  return (
    <div style={{ flex:1,background:active?"rgba(2,20,2,0.95)":"rgba(5,5,5,0.95)",
      border:`1px solid ${active?"rgba(46,255,46,0.28)":"rgba(255,224,72,0.18)"}`,
      borderRadius:6,padding:"8px 12px",
      fontFamily:"'Courier New',monospace",fontSize:12,
      color:active?"#2EFF2E":"rgba(255,224,72,0.55)",
      letterSpacing:"0.1em",textTransform:"uppercase",
      textShadow:active?"0 0 8px rgba(46,255,46,0.7)":"none",
      display:"flex",alignItems:"center",justifyContent:"center",
      boxShadow:active?"inset 0 0 16px rgba(46,255,46,0.04)":"none",
      minHeight:34 }}>
      <motion.span key={message} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.25 }}>
        {message}
      </motion.span>
    </div>
  );
}

// ─── FALLING PACK ─────────────────────────────────────────────────────────────

function FallingPack({ tier,onLanded }: { tier:Tier;onLanded:()=>void }) {
  const bc = { Common:"#FFE048",Rare:"#A855F7",Legendary:"#FF7A00" }[tier];
  useEffect(() => { const t=setTimeout(onLanded,950); return ()=>clearTimeout(t); },[onLanded]);
  return (
    <motion.div
      initial={{ y:-140,rotate:-10,opacity:0,scale:0.7 }}
      animate={{ y:[null,0,-18,4,0],rotate:[null,5,-3,1,0],opacity:1,scale:[null,1,1.04,0.98,1] }}
      transition={{ duration:0.9,ease:[0.4,0,0.2,1],times:[0,0.6,0.76,0.88,1] }}
      style={{ width:72,height:108,background:"linear-gradient(155deg,#171717,#252525,#161616)",
        border:`2px solid ${bc}`,borderRadius:8,boxShadow:`0 0 18px ${bc}40,0 8px 24px rgba(0,0,0,0.6)`,
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,
        position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",inset:0,opacity:0.06,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 9px),repeating-linear-gradient(-45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 9px)" }}/>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/shaka.png" alt="" style={{ width:32,height:32,objectFit:"contain",filter:`drop-shadow(0 0 8px ${bc})` }}/>
      <span style={{ fontFamily:"var(--font-mundial)",fontSize:7,color:"rgba(255,224,72,0.5)",letterSpacing:"0.12em" }}>GVC</span>
    </motion.div>
  );
}

// ─── PACK RIP ─────────────────────────────────────────────────────────────────

function PackRip({ tier,onComplete }: { tier:Tier;onComplete:()=>void }) {
  const [ripped,setRipped] = useState(false);
  const bc = { Common:"#FFE048",Rare:"#A855F7",Legendary:"#FF7A00" }[tier];
  const gc = { Common:"rgba(255,224,72,0.5)",Rare:"rgba(168,85,247,0.5)",Legendary:"rgba(255,122,0,0.6)" }[tier];

  const doRip = () => {
    if (ripped) return;
    setRipped(true);
    sfxTear();
    setTimeout(onComplete, 850);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}>
      <p style={{ fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,color:"rgba(255,224,72,0.6)",letterSpacing:"0.14em",textTransform:"uppercase",margin:0 }}>
        {ripped?"Opening…":"Tap to rip open"}
      </p>
      <div style={{ position:"relative",width:130,height:195 }}>
        <AnimatePresence>
          {!ripped&&(
            <motion.div key="pack" onClick={doRip}
              whileHover={{ scale:1.06,y:-4 }} whileTap={{ scale:0.94 }}
              style={{ position:"absolute",inset:0,
                background:"linear-gradient(155deg,#171717,#2a2a2a,#161616)",
                border:`2px solid ${bc}`,borderRadius:12,
                boxShadow:`0 0 28px ${gc},0 0 56px ${gc}`,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,
                cursor:"pointer",userSelect:"none",overflow:"hidden" }}>
              <div style={{ position:"absolute",inset:0,opacity:0.06,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px),repeating-linear-gradient(-45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px)" }}/>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shaka.png" alt="" style={{ width:56,height:56,objectFit:"contain",filter:`drop-shadow(0 0 16px ${bc})`,zIndex:1 }}/>
              <p style={{ fontFamily:"var(--font-brice)",fontWeight:900,fontSize:11,color:bc,margin:0,textTransform:"uppercase",letterSpacing:"0.12em",textShadow:`0 0 12px ${gc}`,zIndex:1 }}>RIP OPEN</p>
              {/* Tear line */}
              <div style={{ position:"absolute",top:44,left:0,right:0,height:1,background:`repeating-linear-gradient(90deg,${bc}60 0,${bc}60 5px,transparent 5px,transparent 10px)` }}/>
              {/* Shine overlay */}
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,0.06) 0%,transparent 40%)",pointerEvents:"none" }}/>
            </motion.div>
          )}
          {ripped&&(
            <motion.div key="ripped" style={{ position:"absolute",inset:0 }}>
              {/* Top half flies up-left */}
              <motion.div initial={{ x:0,y:0,rotate:0,opacity:1 }}
                animate={{ x:-70,y:-60,rotate:-28,opacity:0 }}
                transition={{ duration:0.65,ease:[0.4,0,1,1] }}
                style={{ position:"absolute",top:0,left:0,right:0,height:"44px",
                  background:`linear-gradient(155deg,#171717,#2a2a2a)`,border:`2px solid ${bc}`,
                  borderBottom:"none",borderRadius:"12px 12px 0 0",overflow:"hidden" }}>
                <div style={{ position:"absolute",inset:0,opacity:0.06,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px)" }}/>
              </motion.div>
              {/* Bottom half flies right */}
              <motion.div initial={{ x:0,y:0,rotate:0,opacity:1 }}
                animate={{ x:70,y:40,rotate:22,opacity:0 }}
                transition={{ duration:0.65,ease:[0.4,0,1,1] }}
                style={{ position:"absolute",top:"44px",left:0,right:0,bottom:0,
                  background:`linear-gradient(155deg,#202020,#161616)`,border:`2px solid ${bc}`,
                  borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden",
                  display:"flex",alignItems:"center",justifyContent:"center" }}>
                <div style={{ position:"absolute",inset:0,opacity:0.06,backgroundImage:"repeating-linear-gradient(-45deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 10px)" }}/>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/shaka.png" alt="" style={{ width:44,height:44,objectFit:"contain",opacity:0.6 }}/>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── COLLECTION FLAP ─────────────────────────────────────────────────────────

function CollectionFlap({ phase,onOpen }: { phase:Phase;onOpen:()=>void }) {
  const isReady = phase==="FLAP_READY";
  const isOpen  = ["FLAP_OPEN","CARD_REVEALED"].includes(phase);

  return (
    <div onClick={isReady?onOpen:undefined}
      style={{ position:"relative",height:52,width:"100%",cursor:isReady?"pointer":"default",overflow:"hidden" }}>
      <motion.div
        animate={isOpen?{ rotateX:75,opacity:0.4,y:10 }:{}}
        style={{ position:"absolute",inset:0,background:"linear-gradient(180deg,#1c1c1c,#111)",
          borderRadius:"0 0 12px 12px",
          border:`1px solid ${isReady?"rgba(255,224,72,0.45)":"rgba(255,255,255,0.08)"}`,
          boxShadow:isReady?"0 0 18px rgba(255,224,72,0.25)":"none",
          transformOrigin:"bottom center",transformStyle:"preserve-3d",transition:"border-color 0.3s,box-shadow 0.3s",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,overflow:"hidden" }}>
        <div style={{ position:"absolute",inset:0,opacity:0.03,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,224,72,1) 0,rgba(255,224,72,1) 1px,transparent 1px,transparent 14px)" }}/>
        {/* hinges */}
        <div style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",width:7,height:13,borderRadius:3,background:"#2a2a2a",border:"1px solid rgba(255,224,72,0.18)" }}/>
        <div style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",width:7,height:13,borderRadius:3,background:"#2a2a2a",border:"1px solid rgba(255,224,72,0.18)" }}/>
        {/* handle */}
        <div style={{ width:36,height:3,borderRadius:2,background:isReady?"rgba(255,224,72,0.55)":"rgba(255,255,255,0.08)",boxShadow:isReady?"0 0 8px rgba(255,224,72,0.4)":"none",transition:"all 0.3s" }}/>
      </motion.div>

      <AnimatePresence>
        {isReady&&(
          <motion.p initial={{ opacity:0 }}
            animate={{ opacity:[0.55,1,0.55] }}
            exit={{ opacity:0 }}
            transition={{ opacity:{ duration:1.1,repeat:Infinity },default:{ duration:0.3 } }}
            style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",margin:0,
              fontFamily:"var(--font-brice)",fontSize:10,fontWeight:900,color:"#FFE048",
              letterSpacing:"0.18em",textTransform:"uppercase",
              textShadow:"0 0 10px rgba(255,224,72,0.8)",pointerEvents:"none",zIndex:2 }}>
            ▼ YOUR PACK IS READY — OPEN FLAP ▼
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [phase,        setPhase]        = useState<Phase>("IDLE");
  const [input,        setInput]        = useState("");
  const [tokenId,      setTokenId]      = useState<number|null>(null);
  const [cardData,     setCardData]     = useState<CardData|null>(null);
  const [selectedSlot, setSelectedSlot] = useState(4);
  const [showBurst,    setShowBurst]    = useState(false);

  const coinInserted = phase!=="IDLE";

  const displayMessage: Record<Phase,string> = {
    IDLE:          "INSERT COIN TO BEGIN",
    COIN_INSERTED: "SELECT YOUR PACK",
    PACK_SELECTED: `TOKEN ID: ${tokenId??"???"}`,
    VENDING:       "DISPENSING...",
    FLAP_READY:    "OPEN COLLECTION FLAP",
    FLAP_OPEN:     "RIP OPEN YOUR PACK!",
    CARD_REVEALED: `GVC #${tokenId} REVEALED!`,
  };

  const onCoinInsert = useCallback(() => {
    sfxActivate();
    setPhase("COIN_INSERTED");
  }, []);

  const onSelect = useCallback((id: number) => {
    setTokenId(id);
    setCardData(generateCardData(id));
    setSelectedSlot(id % 9);
    setPhase("PACK_SELECTED");
  }, []);

  const onManualSelect = useCallback(() => {
    const v = input.trim();
    if (v==="") return;
    const id = parseInt(v, 10);
    if (isNaN(id)||id<0||id>6968) return;
    onSelect(id);
  }, [input, onSelect]);

  const onRandom = useCallback(() => {
    onSelect(Math.floor(Math.random() * 6969));
  }, [onSelect]);

  const onVend = useCallback(() => {
    if (phase!=="PACK_SELECTED") return;
    sfxVend();
    setPhase("VENDING");
  }, [phase]);

  const onPackLanded = useCallback(() => {
    setPhase("FLAP_READY");
  }, []);

  const onFlapOpen = useCallback(() => {
    setPhase("FLAP_OPEN");
  }, []);

  const onPackRipped = useCallback(() => {
    sfxReveal();
    setPhase("CARD_REVEALED");
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 2200);
  }, []);

  const onReset = useCallback(() => {
    setPhase("IDLE");
    setInput(""); setTokenId(null); setCardData(null);
    setShowBurst(false); setSelectedSlot(4);
  }, []);

  const shareToX = useCallback(() => {
    if (!cardData||tokenId===null) return;
    const text = [
      `Just pulled GVC #${tokenId} — ${cardData.archetype} from The Vibe Machine 🎰`,
      "",
      `${cardData.tier} tier · Rarity ${cardData.rarity} · Drip ${cardData.drip} · Energy ${cardData.energy} · Aura ${cardData.aura}`,
      "",
      `Get yours → aesr-gvc.vercel.app`,
      `@goodvibesclub #GoodVibesClub #VibeCard`,
    ].join("\n");
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,"_blank");
  }, [cardData, tokenId]);

  const downloadCard = useCallback(async () => {
    if (tokenId===null||!cardData) return;
    try {
      await document.fonts.ready;
      const S=2, W=DESIGN_W, H=DESIGN_H;
      const cv=document.createElement("canvas"); cv.width=W*S; cv.height=H*S;
      const ctx=cv.getContext("2d")!; ctx.scale(S,S);
      const cs=getComputedStyle(document.documentElement);
      const brice=cs.getPropertyValue("--font-brice").trim()||"serif";
      const mundial=cs.getPropertyValue("--font-mundial").trim()||"sans-serif";
      const loadImg=(src:string)=>new Promise<HTMLImageElement>(res=>{ const img=new Image(); img.crossOrigin="anonymous"; img.onload=()=>res(img); img.onerror=()=>res(img); img.src=src; });
      const rr=(x:number,y:number,w:number,h:number,r:number)=>{ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); };
      ctx.save(); rr(0,0,W,H,16); ctx.clip();
      ctx.fillStyle="#050505"; ctx.fillRect(0,0,W,H);
      const portrait=await loadImg(`/api/portrait/${tokenId}`);
      if(portrait.naturalWidth>0){ const iw=portrait.naturalWidth,ih=portrait.naturalHeight,sc=Math.max(W/iw,H/ih); ctx.drawImage(portrait,(W-iw*sc)/2,0,iw*sc,ih*sc); }
      const fade=ctx.createLinearGradient(0,H*0.4,0,H); fade.addColorStop(0,"rgba(5,5,5,0)"); fade.addColorStop(0.34,"rgba(5,5,5,0.34)"); fade.addColorStop(0.66,"rgba(5,5,5,0.86)"); fade.addColorStop(1,"rgba(5,5,5,0.98)");
      ctx.fillStyle=fade; ctx.fillRect(0,H*0.4,W,H*0.6);
      const topFade=ctx.createLinearGradient(0,0,0,50); topFade.addColorStop(0,"rgba(5,5,5,0.92)"); topFade.addColorStop(1,"rgba(5,5,5,0)");
      ctx.fillStyle=topFade; ctx.fillRect(0,0,W,50);
      ctx.font=`11px ${mundial}`; ctx.fillStyle="rgba(255,255,255,0.6)"; ctx.textBaseline="middle"; ctx.textAlign="left"; ctx.fillText(`GVC #${tokenId}`,12,21);
      const tc=TIER_LABEL_COLOR[cardData.tier]; const tt=cardData.tier.toUpperCase();
      ctx.font=`900 10px ${brice}`; const tw=ctx.measureText(tt).width;
      const bpx=W-tw-28,bpy=10,bpw=tw+16,bph=18;
      rr(bpx,bpy,bpw,bph,4); ctx.fillStyle=tc+"28"; ctx.fill(); ctx.strokeStyle=tc; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle=tc; ctx.textBaseline="middle"; ctx.fillText(tt,bpx+8,bpy+9);
      const PAD=16,BADGE_SZ=36,BADGE_TOP=H-180,ARCH_Y=BADGE_TOP+BADGE_SZ+11+20,QUOTE_Y=ARCH_Y+20,STATS_Y=QUOTE_Y+18,STAT_H=40,RANK_Y=H-20;
      await Promise.allSettled(cardData.badges.map(async(b,i)=>{ const bx=PAD+i*(BADGE_SZ+6),by=BADGE_TOP; const bimg=await loadImg(`https://goodvibesclub.ai/badges/${b}.webp`); if(bimg.naturalWidth>0){ ctx.save(); rr(bx,by,BADGE_SZ,BADGE_SZ,8); ctx.clip(); ctx.drawImage(bimg,bx,by,BADGE_SZ,BADGE_SZ); ctx.restore(); } }));
      ctx.font=`900 21px ${brice}`; ctx.fillStyle="#FFE048"; ctx.textAlign="left"; ctx.textBaseline="alphabetic"; ctx.shadowColor="rgba(255,224,72,0.65)"; ctx.shadowBlur=26; ctx.fillText(cardData.archetype.toUpperCase(),PAD,ARCH_Y); ctx.shadowBlur=0;
      ctx.font=`italic 11px ${mundial}`; ctx.fillStyle="rgba(255,255,255,0.48)"; ctx.fillText(`"${cardData.quote}"`,PAD,QUOTE_Y);
      const statCols=4,gap=6,statW=(W-PAD*2-gap*(statCols-1))/statCols;
      ([["RARITY",cardData.rarity],["DRIP",cardData.drip],["ENERGY",cardData.energy],["AURA",cardData.aura]] as [string,number][]).forEach(([lbl,val],i)=>{ const sx=PAD+i*(statW+gap); rr(sx,STATS_Y,statW,STAT_H,8); ctx.fillStyle="rgba(5,5,5,0.75)"; ctx.fill(); ctx.strokeStyle="rgba(255,224,72,0.16)"; ctx.lineWidth=1; ctx.stroke(); ctx.font=`8.5px ${mundial}`; ctx.fillStyle="rgba(255,255,255,0.38)"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(lbl,sx+statW/2,STATS_Y+11); ctx.font=`900 22px ${brice}`; ctx.fillStyle="#FFE048"; if(val>=80){ ctx.shadowColor="rgba(255,224,72,0.9)"; ctx.shadowBlur=14; } ctx.fillText(String(val),sx+statW/2,STATS_Y+28); ctx.shadowBlur=0; });
      ctx.font=`9px ${mundial}`; ctx.fillStyle="rgba(255,255,255,0.28)"; ctx.textAlign="center"; ctx.textBaseline="alphabetic"; ctx.fillText(`RANK #${cardData.rank.toLocaleString()} OF 6,969`,W/2,RANK_Y);
      ctx.restore(); rr(1,1,W-2,H-2,16); ctx.strokeStyle=TIER_BORDER[cardData.tier]; ctx.lineWidth=2; ctx.stroke();
      const a=document.createElement("a"); a.download=`vibe-card-${tokenId}.png`; a.href=cv.toDataURL("image/png"); a.click();
    } catch(err){ console.error("Download failed:",err); }
  }, [tokenId, cardData]);

  const tier = (cardData?.tier ?? "Common") as Tier;

  return (
    <>
      {/* Watermark */}
      <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:0,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden" }}>
        <p style={{ fontFamily:"var(--font-brice)",fontSize:"clamp(36px,10vw,110px)",fontWeight:900,color:"rgba(255,224,72,0.016)",textTransform:"uppercase",letterSpacing:"0.14em",whiteSpace:"nowrap",transform:"rotate(-14deg)",userSelect:"none",margin:0 }}>GOOD VIBES CLUB</p>
      </div>

      <main style={{ minHeight:"100vh",position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"20px 14px 80px",overflowX:"hidden",width:"100%",boxSizing:"border-box" }}>

        {/* ── HEADER ── */}
        <motion.div initial={{ opacity:0,y:-14 }} animate={{ opacity:1,y:0 }} style={{ textAlign:"center",marginBottom:18 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:26,height:26 }}/>
            <h1 className="text-shimmer" style={{ fontFamily:"var(--font-brice)",fontSize:"clamp(20px,5vw,36px)",fontWeight:900,margin:0,textTransform:"uppercase",letterSpacing:"0.06em" }}>THE VIBE MACHINE</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:26,height:26 }}/>
          </div>
          <p style={{ color:"rgba(255,255,255,0.3)",fontSize:10,letterSpacing:"0.12em",textTransform:"uppercase",margin:0 }}>GVC Collectible Card Vending Machine</p>
        </motion.div>

        {/* ── MACHINE + COIN ROW ── */}
        <div style={{ display:"flex",alignItems:"flex-start",gap:12,width:"100%",maxWidth:480,justifyContent:"center" }}>

          {/* Coin — left of machine */}
          <div style={{ paddingTop:72,flexShrink:0 }}>
            <AnimatePresence>
              {phase==="IDLE"&&(
                <motion.div initial={{ opacity:0,x:-16 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,scale:0,x:-20 }}>
                  <ShakaCoin onInsert={onCoinInsert}/>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── VENDING MACHINE BODY ── */}
          <motion.div initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.08 }}
            style={{ flex:1,background:"linear-gradient(180deg,#141414 0%,#111 60%,#0d0d0d 100%)",
              border:`2px solid ${coinInserted?"rgba(255,224,72,0.4)":"rgba(255,224,72,0.18)"}`,
              borderRadius:16,
              boxShadow:coinInserted
                ?"0 0 0 1px rgba(255,224,72,0.1),0 0 40px rgba(255,224,72,0.12),0 0 80px rgba(255,224,72,0.05),inset 0 0 60px rgba(0,0,0,0.5)"
                :"0 0 20px rgba(0,0,0,0.5),inset 0 0 40px rgba(0,0,0,0.4)",
              overflow:"hidden",transition:"border-color 0.5s,box-shadow 0.5s" }}>

            {/* LED top strip */}
            <motion.div animate={{ opacity:coinInserted?1:0.3 }} style={{ height:3,background:"linear-gradient(90deg,transparent,#FFE048,#FFD700,#FFE048,transparent)",transition:"opacity 0.5s" }}/>

            {/* Top section: brand + display + coin slot */}
            <div style={{ padding:"12px 12px 10px",borderBottom:"1px solid rgba(255,224,72,0.08)" }}>
              {/* Brand row */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gvc-logotype.svg" alt="GVC" style={{ height:16,opacity:0.65 }}/>
                <span style={{ fontFamily:"var(--font-brice)",fontSize:14,fontWeight:900,color:"#FFE048",letterSpacing:"0.1em",textTransform:"uppercase",textShadow:"0 0 14px rgba(255,224,72,0.45)" }}>VIBE MACHINE</span>
              </div>
              {/* Display + coin slot */}
              <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                <DisplayPanel message={displayMessage[phase]} active={coinInserted}/>
                {/* Coin slot */}
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,flexShrink:0 }}>
                  <motion.div animate={{ boxShadow:coinInserted?"0 0 10px rgba(46,255,46,0.5)":"0 0 8px rgba(255,224,72,0.4),inset 0 0 5px rgba(255,224,72,0.1)" }}
                    transition={{ duration:0.4 }}
                    style={{ width:42,height:11,borderRadius:5,background:coinInserted?"rgba(46,255,46,0.12)":"#030303",border:`2px solid ${coinInserted?"rgba(46,255,46,0.55)":"rgba(255,224,72,0.45)"}`,transition:"background 0.4s,border-color 0.4s" }}/>
                  <span style={{ fontFamily:"var(--font-mundial)",fontSize:6.5,color:"rgba(255,224,72,0.32)",letterSpacing:"0.08em",whiteSpace:"nowrap" }}>COIN SLOT</span>
                </div>
              </div>
            </div>

            {/* Glass panel — pack grid */}
            <div style={{ position:"relative",margin:"8px 10px",background:"linear-gradient(145deg,rgba(18,18,18,0.95),rgba(8,8,10,0.98))",border:"1px solid rgba(255,224,72,0.1)",borderRadius:8,overflow:"hidden" }}>
              {/* Glass sheen */}
              <div style={{ position:"absolute",inset:0,zIndex:10,pointerEvents:"none",background:"linear-gradient(135deg,rgba(255,255,255,0.045) 0%,transparent 45%,rgba(255,255,255,0.015) 70%,transparent 100%)" }}/>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"rgba(255,255,255,0.07)",zIndex:11 }}/>

              <PackGrid selectedSlot={selectedSlot} locked={!coinInserted} tokenId={tokenId}/>

              {/* Locked overlay */}
              <AnimatePresence>
                {!coinInserted&&(
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    style={{ position:"absolute",inset:0,zIndex:12,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(1.5px)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <div style={{ textAlign:"center" }}>
                      <div style={{ fontSize:26,marginBottom:6 }}>🔒</div>
                      <p style={{ fontFamily:"var(--font-brice)",fontSize:10,color:"rgba(255,224,72,0.45)",margin:0,letterSpacing:"0.1em",textTransform:"uppercase" }}>Insert Coin First</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Vending animation */}
              <AnimatePresence>
                {phase==="VENDING"&&cardData&&(
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
                    style={{ position:"absolute",inset:0,zIndex:13,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <FallingPack tier={tier} onLanded={onPackLanded}/>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input + token select */}
            <AnimatePresence>
              {(phase==="COIN_INSERTED"||phase==="PACK_SELECTED")&&(
                <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }} style={{ overflow:"hidden" }}>
                  <div style={{ padding:"10px 12px 6px",display:"flex",gap:7 }}>
                    <input type="number" min="0" max="6968" value={input}
                      onChange={e=>setInput(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&onManualSelect()}
                      placeholder="Token ID (0–6968)"
                      style={{ flex:1,padding:"9px 11px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,224,72,0.2)",borderRadius:8,color:"#fff",fontFamily:"var(--font-mundial)",fontSize:13,outline:"none" }}/>
                    <button onClick={onManualSelect} style={{ padding:"9px 12px",background:"rgba(255,224,72,0.12)",border:"1px solid rgba(255,224,72,0.3)",borderRadius:8,color:"#FFE048",fontFamily:"var(--font-mundial)",fontSize:12,cursor:"pointer",whiteSpace:"nowrap" }}>Select</button>
                    <button onClick={onRandom} style={{ padding:"9px 11px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:"rgba(255,255,255,0.55)",fontFamily:"var(--font-mundial)",fontSize:12,cursor:"pointer",whiteSpace:"nowrap" }}>Random</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* VEND button */}
            <AnimatePresence>
              {phase==="PACK_SELECTED"&&(
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-4 }} style={{ padding:"8px 12px 10px" }}>
                  <motion.button onClick={onVend} whileHover={{ scale:1.02 }} whileTap={{ scale:0.96 }}
                    animate={{ boxShadow:["0 0 14px rgba(255,224,72,0.35)","0 0 28px rgba(255,224,72,0.7)","0 0 14px rgba(255,224,72,0.35)"] }}
                    transition={{ boxShadow:{ duration:1.6,repeat:Infinity } }}
                    style={{ width:"100%",padding:"14px",background:"linear-gradient(135deg,#FFE048,#FFD700,#FFAA00)",border:"none",borderRadius:10,fontFamily:"var(--font-brice)",fontSize:19,fontWeight:900,color:"#080808",textTransform:"uppercase",letterSpacing:"0.1em",cursor:"pointer" }}>
                    🎰 VEND
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Divider */}
            <div style={{ height:1,background:"rgba(255,224,72,0.08)",margin:"0 12px" }}/>

            {/* Collection flap */}
            <CollectionFlap phase={phase} onOpen={onFlapOpen}/>

            {/* LED bottom strip */}
            <motion.div animate={{ opacity:coinInserted?1:0.25 }} style={{ height:3,background:"linear-gradient(90deg,transparent,#FFE048,#FFD700,#FFE048,transparent)",transition:"opacity 0.5s" }}/>
          </motion.div>
        </div>

        {/* ── PACK RIP (below machine after flap opens) ── */}
        <AnimatePresence>
          {phase==="FLAP_OPEN"&&cardData&&(
            <motion.div initial={{ opacity:0,y:24,scale:0.9 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0 }}
              transition={{ type:"spring",stiffness:260,damping:24 }}
              style={{ marginTop:28 }}>
              <PackRip tier={tier} onComplete={onPackRipped}/>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── CARD REVEAL ── */}
        <AnimatePresence>
          {phase==="CARD_REVEALED"&&cardData&&tokenId!==null&&(
            <motion.div key={`card-${tokenId}`}
              initial={{ opacity:0,y:70,scale:0.82 }}
              animate={{ opacity:1,y:0,scale:1 }}
              transition={{ type:"spring",stiffness:210,damping:22,delay:0.15 }}
              style={{ marginTop:28,display:"flex",flexDirection:"column",alignItems:"center",position:"relative" }}>
              {showBurst&&<TierBurst tier={cardData.tier} id={tokenId}/>}
              <VibeCard id={tokenId} data={cardData}/>

              {/* Actions */}
              <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.45 }}
                style={{ display:"flex",gap:8,marginTop:16,width:"100%",maxWidth:400,flexWrap:"wrap" }}>
                <button onClick={shareToX}
                  style={{ flex:1,minWidth:110,padding:"12px 14px",background:"#000",color:"#fff",border:"1px solid rgba(255,255,255,0.18)",borderRadius:10,fontFamily:"var(--font-mundial)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  Share to X
                </button>
                <button onClick={downloadCard}
                  style={{ flex:1,minWidth:110,padding:"12px 14px",background:"rgba(255,224,72,0.08)",color:"#FFE048",border:"1px solid rgba(255,224,72,0.28)",borderRadius:10,fontFamily:"var(--font-mundial)",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFE048" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download
                </button>
                <button onClick={onReset}
                  style={{ flex:1,minWidth:110,padding:"12px 14px",background:"linear-gradient(135deg,#FFE048,#FFD700)",color:"#080808",border:"none",borderRadius:10,fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.06em" }}>
                  🎰 Vend Another
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <p style={{ position:"fixed",bottom:10,left:0,right:0,textAlign:"center",fontFamily:"var(--font-mundial)",fontSize:10,color:"rgba(255,255,255,0.16)",letterSpacing:"0.08em",zIndex:1,pointerEvents:"none",margin:0 }}>
          Built by @imaesr for the GVC Vibeathon
        </p>

        {/* ── SCOPED CSS ── */}
        <style>{`
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
            width: 32px; height: 32px; border-radius: 50%;
            border: 2px solid #FFE048; border-top-color: transparent;
            animation: gvc-spin 0.8s linear infinite;
          }
          .card-shimmer {
            background: linear-gradient(108deg, transparent 38%, rgba(255,224,72,0.07) 50%, transparent 62%);
            animation: card-shimmer 3.5s ease-in-out infinite;
          }
          @keyframes gvc-spin { to { transform: rotate(360deg); } }
          @keyframes card-shimmer {
            0%   { transform: translateX(-220%) skewX(-14deg); opacity: 0; }
            20%  { opacity: 1; } 80% { opacity: 1; }
            100% { transform: translateX(440%) skewX(-14deg); opacity: 0; }
          }
          @keyframes legendary-glow {
            0%,100% { box-shadow: 0 0 32px rgba(255,224,72,0.70),0 0 64px rgba(255,95,31,0.35),0 0 100px rgba(255,224,72,0.12); }
            50% { box-shadow: 0 0 44px rgba(255,224,72,0.90),0 0 88px rgba(255,95,31,0.55),0 0 130px rgba(255,224,72,0.20); }
          }
          input[type=number]::-webkit-inner-spin-button,
          input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
          input[type=number] { -moz-appearance: textfield; }
          @media (max-width: 400px) {
            .action-btns { flex-direction: column !important; }
          }
        `}</style>
      </main>
    </>
  );
}
