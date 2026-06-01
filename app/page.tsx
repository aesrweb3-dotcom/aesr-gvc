"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── COLORS ───────────────────────────────────────────────────────────────────
const TIER_COLOR  = { Common:"#5eead4", Rare:"#c084fc", Legendary:"#FFE048" } as const;
const TIER_GLOW   = { Common:"rgba(94,234,212,0.75)", Rare:"rgba(192,132,252,0.75)", Legendary:"rgba(255,224,72,0.85)" } as const;
const TIER_BG     = {
  Common:    "linear-gradient(160deg,#071a1a 0%,#0d2e30 55%,#041212 100%)",
  Rare:      "linear-gradient(160deg,#0e0520 0%,#1c0a38 55%,#080318 100%)",
  Legendary: "linear-gradient(160deg,#1a0e00 0%,#2c1c00 55%,#120a00 100%)",
} as const;
const STAT_COLORS = ["#FF6B9D","#00BFFF","#00FF94","#FF9500"] as const;
const GOLD = "#FFE048";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ALL_BADGES = [
  "astro_balls","zoom_in_vibe_out","showtime","flow_state","vibestr_bronze_tier",
  "checkmate","vibefoot_fan_club","suited_up","astro_bean","gud_meat",
  "hoodie_up_society","twenty_badges","yin_n_yang","vibestr_pink_tier",
  "party_in_the_back","unfathomable_vibes","gradient_hatrick","one_of_one",
  "fifty_badges","cosmic_guardian","super_rare","pothead","elite_rainbow_ranger",
  "anchorman","rainbow_visor",
];
const ARCHETYPES = [
  "The Cosmic Drifter","The Neon Prophet","The Vibe Architect","The Golden Wanderer",
  "The Drift King","The Frequency Holder","The Stellar Nomad","The Radiant Sage",
  "The Vibe Curator","The Etheric Rebel","The Sound Alchemist","The Neon Mystic",
  "The Light Chaser","The Groove Oracle","The Vibe Sovereign","The Chromatic Shaman",
  "The Signal Rider","The Vibe Phantom","The Astral Cowboy","The Frequency Mage",
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
  "Running on pure good energy since genesis.",
  "Calibrated for maximum vibe output.",
  "The shaka is eternal.",
];

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Phase = "PIN" | "READY" | "DROPPING" | "GRABBING" | "LIFTING" | "CHUTE" | "TEARING" | "CARD";
type Tier  = "Common" | "Rare" | "Legendary";
interface CardData {
  rarity:number; drip:number; energy:number; aura:number;
  tier:Tier; rank:number; archetype:string; quote:string; badges:string[];
}

// ─── RNG ──────────────────────────────────────────────────────────────────────
function rng(seed:number){
  let s=((seed*1664525)+1013904223)>>>0;
  return ()=>{ s=((s*1664525)+1013904223)>>>0; return s/0x100000000; };
}
function generateCard(id:number):CardData{
  const r=rng(id), r2=rng(id+77), r3=rng(id+13), r4=rng(id+31), r5=rng(id+99);
  const rarity=29+Math.floor(r()*71), drip=19+Math.floor(r()*81);
  const energy=24+Math.floor(r()*76), aura=14+Math.floor(r()*86);
  const avg=(rarity+drip+energy+aura)/4;
  const tier:Tier = avg>=75?"Legendary":avg>=55?"Rare":"Common";
  const rank=1+Math.floor(r2()*6969);
  const archetype=ARCHETYPES[Math.floor(r3()*ARCHETYPES.length)];
  const quote=QUOTES[Math.floor(r4()*QUOTES.length)];
  const shuffled=[...ALL_BADGES].sort(()=>r5()-0.5);
  const count=tier==="Legendary"?4:tier==="Rare"?3:2;
  return { rarity,drip,energy,aura,tier,rank,archetype,quote,badges:shuffled.slice(0,count) };
}

// ─── AUDIO ────────────────────────────────────────────────────────────────────
function ac(){
  if(typeof window==="undefined") return null;
  const w=window as any;
  if(!w.__ac){ try{ w.__ac=new(window.AudioContext||(w as any).webkitAudioContext)(); }catch{ return null; } }
  if(w.__ac.state==="suspended") w.__ac.resume().catch(()=>{});
  return w.__ac as AudioContext;
}
function sfxCoin(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  [880,1320].forEach((f,i)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
    o.frequency.value=f;o.type="sine";g.gain.setValueAtTime(0,t+i*.07);g.gain.linearRampToValueAtTime(.22,t+i*.07+.01);g.gain.exponentialRampToValueAtTime(.001,t+i*.07+.2);o.start(t+i*.07);o.stop(t+i*.07+.22); }); }
function sfxKey(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
  o.frequency.value=600+Math.random()*200;o.type="square";g.gain.setValueAtTime(.07,t);g.gain.exponentialRampToValueAtTime(.001,t+.06);o.start(t);o.stop(t+.07); }
function sfxDrop(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
  o.type="sawtooth";o.frequency.setValueAtTime(180,t);o.frequency.linearRampToValueAtTime(40,t+.7);
  g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.75);o.start(t);o.stop(t+.8); }
function sfxGrab(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  [440,554,660].forEach((f,i)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
    o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.04);g.gain.linearRampToValueAtTime(.15,t+i*.04+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.04+.18);o.start(t+i*.04);o.stop(t+i*.04+.2); }); }
function sfxReveal(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  [523,659,784,1047].forEach((f,i)=>{ const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g);g.connect(ctx.destination);
    o.type="sine";o.frequency.value=f;g.gain.setValueAtTime(0,t+i*.09);g.gain.linearRampToValueAtTime(.18,t+i*.09+.02);g.gain.exponentialRampToValueAtTime(.001,t+i*.09+.32);o.start(t+i*.09);o.stop(t+i*.09+.38); }); }
function sfxTear(){ const ctx=ac(); if(!ctx)return; const t=ctx.currentTime;
  const buf=ctx.createBuffer(1,ctx.sampleRate*.25,ctx.sampleRate);
  const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
  const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
  f.type="bandpass";f.frequency.value=3000;f.Q.value=.8;s.buffer=buf;s.connect(f);f.connect(g);g.connect(ctx.destination);
  g.gain.setValueAtTime(.3,t);g.gain.exponentialRampToValueAtTime(.001,t+.25);s.start(t); }

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@keyframes ledRoll{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes packSwing{0%,100%{transform:rotate(-2deg) translateY(0)}50%{transform:rotate(2deg) translateY(-6px)}}
@keyframes holoMove{0%{background-position:0% 0%;opacity:.2}33%{background-position:100% 0%;opacity:.35}66%{background-position:100% 100%;opacity:.22}100%{background-position:0% 0%;opacity:.2}}
@keyframes shine{0%{left:-70%;opacity:0}20%{opacity:.7}80%{opacity:.6}100%{left:130%;opacity:0}}
@keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
@keyframes borderSpin{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}
@keyframes chuteBounce{0%{transform:translateY(-60px);opacity:0}60%{transform:translateY(8px)}80%{transform:translateY(-4px)}100%{transform:translateY(0);opacity:1}}
.led-strip{background:linear-gradient(90deg,#ff0080,#ff6600,#ffe100,#00ff94,#00bfff,#bf00ff,#ff0080,#ff6600,#ffe100);background-size:200% 100%;animation:ledRoll 1.8s linear infinite}
.pack-swing{animation:packSwing 3s ease-in-out infinite}
.holo{animation:holoMove 4s ease-in-out infinite;background-size:300% 300%}
.border-spin{animation:borderSpin 5s linear infinite}
.chute-drop{animation:chuteBounce .6s ease-out forwards}
`;

// ─── LED ──────────────────────────────────────────────────────────────────────
function LED({ on }: { on:boolean }) {
  return <div className={on?"led-strip":""} style={{ height:5, background:on?"":"rgba(255,255,255,0.06)", transition:"background .5s" }}/>;
}

// ─── MINI PACK (inside machine) ───────────────────────────────────────────────
function MiniPack({ tier, grabbed }: { tier:Tier; grabbed:boolean }) {
  const tc = TIER_COLOR[tier], tg = TIER_GLOW[tier];
  return (
    <div style={{
      width:44, height:62, borderRadius:7, position:"relative", overflow:"hidden",
      background:TIER_BG[tier],
      border:`1.5px solid ${tc}${grabbed?"00":"99"}`,
      boxShadow:`0 0 14px ${tg}, 0 4px 14px rgba(0,0,0,0.7)`,
      opacity: grabbed ? 0 : 1,
      transition:"opacity 0.2s, border-color 0.2s",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/shaka.png" alt="" style={{ width:20,height:20,filter:`drop-shadow(0 0 4px ${tg})` }}/>
      <div style={{ fontFamily:"var(--font-brice)",fontSize:7,fontWeight:900,color:tc,textTransform:"uppercase",letterSpacing:"0.1em",lineHeight:1,textAlign:"center" }}>GVC</div>
      <div className="holo" style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,0,128,0.25),rgba(0,255,148,0.18),rgba(0,191,255,0.25))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>
      {/* Shine */}
      <div style={{ position:"absolute",top:0,width:"30%",height:"100%",background:"linear-gradient(108deg,transparent,rgba(255,255,255,0.15),transparent)",animation:"shine 3s ease-in-out infinite",pointerEvents:"none" }}/>
    </div>
  );
}

// ─── CLAW ARM ─────────────────────────────────────────────────────────────────
function ClawArm({ x, armPx, closed, hasPack, packTier }: { x:number; armPx:number; closed:boolean; hasPack:boolean; packTier:Tier }) {
  return (
    <div style={{ position:"absolute", left:`${x}%`, top:0, transform:"translateX(-50%)", zIndex:12, display:"flex", flexDirection:"column", alignItems:"center", pointerEvents:"none" }}>
      {/* Trolley block */}
      <div style={{ width:28,height:13,borderRadius:"5px 5px 0 0",background:"linear-gradient(180deg,#e8e8e8,#a0a0a0)",boxShadow:"0 2px 8px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.6)" }}/>
      {/* Cable */}
      <motion.div animate={{ height: armPx }} transition={{ duration:0.7, ease:"easeInOut" }}
        style={{ width:3, background:"linear-gradient(180deg,#bbb,#666)", boxShadow:"1px 0 3px rgba(0,0,0,0.4)", minHeight:0 }}/>
      {/* Claw housing */}
      <div style={{ width:26,height:12,background:"linear-gradient(180deg,#d4d4d4,#8a8a8a)",borderRadius:"3px 3px 0 0",boxShadow:"0 2px 6px rgba(0,0,0,0.5)" }}/>
      {/* Three prongs */}
      <div style={{ display:"flex", gap:2, alignItems:"flex-start" }}>
        <div style={{ width:6,height:20,background:"linear-gradient(180deg,#c8c8c8,#686868)",borderRadius:"0 0 4px 4px",transform:`rotate(${closed?-10:-42}deg)`,transformOrigin:"top center",transition:"transform 0.28s ease",boxShadow:"2px 2px 4px rgba(0,0,0,0.4)" }}/>
        <div style={{ width:6,height:26,background:"linear-gradient(180deg,#c8c8c8,#686868)",borderRadius:"0 0 4px 4px",boxShadow:"0 2px 4px rgba(0,0,0,0.35)" }}/>
        <div style={{ width:6,height:20,background:"linear-gradient(180deg,#c8c8c8,#686868)",borderRadius:"0 0 4px 4px",transform:`rotate(${closed?10:42}deg)`,transformOrigin:"top center",transition:"transform 0.28s ease",boxShadow:"-2px 2px 4px rgba(0,0,0,0.4)" }}/>
      </div>
      {/* Pack when grabbed */}
      {hasPack && closed && <div style={{ marginTop:3 }}><MiniPack tier={packTier} grabbed={false}/></div>}
    </div>
  );
}

// ─── FULL SIZE GLOSSY PACK ────────────────────────────────────────────────────
function GlossyPack({ tier, w=200 }: { tier:Tier; w?:number }) {
  const h=w*1.5, tc=TIER_COLOR[tier], tg=TIER_GLOW[tier];
  return (
    <div style={{ width:w,height:h,borderRadius:14,position:"relative",overflow:"hidden",flexShrink:0,
      background:TIER_BG[tier],
      border:`2px solid ${tc}cc`,
      boxShadow:`0 0 40px ${tg},0 12px 50px rgba(0,0,0,0.85),inset 0 1px 0 rgba(255,255,255,0.15)` }}>
      <div className="holo" style={{ position:"absolute",inset:0,zIndex:4,background:"linear-gradient(135deg,rgba(255,0,128,0.3),rgba(255,140,0,0.2),rgba(255,225,0,0.28),rgba(0,255,148,0.2),rgba(0,191,255,0.28),rgba(191,0,255,0.2),rgba(255,0,128,0.3))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:0,left:"10%",width:"55%",height:"100%",background:"linear-gradient(108deg,transparent 40%,rgba(255,255,255,0.09) 50%,transparent 60%)",zIndex:5,pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:0,width:"28%",height:"100%",background:"linear-gradient(108deg,transparent,rgba(255,255,255,0.14),transparent)",animation:"shine 4s ease-in-out infinite",zIndex:6,pointerEvents:"none" }}/>
      <div style={{ position:"absolute",inset:0,zIndex:3,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",padding:`${h*.055}px ${w*.1}px` }}>
        <div style={{ alignSelf:"stretch",textAlign:"center",borderBottom:`1px solid ${tc}44`,paddingBottom:h*.022,fontFamily:"'Courier New',monospace",fontSize:w*.075,color:tc,letterSpacing:"0.14em",textTransform:"uppercase",textShadow:`0 0 14px ${tg}` }}>
          {tier==="Legendary"?"✦ LEGENDARY ✦":tier==="Rare"?"◆ RARE ◆":"STANDARD"}
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:h*.025 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/shaka.png" alt="" style={{ width:w*.48,height:w*.48,filter:`drop-shadow(0 0 ${w*.07}px ${tg})` }}/>
          <div style={{ fontFamily:"var(--font-brice)",fontSize:w*.13,fontWeight:900,lineHeight:1.05,color:tc,textTransform:"uppercase",letterSpacing:"0.09em",textShadow:`0 0 20px ${tg}`,textAlign:"center" }}>
            GOOD<br/>VIBES<br/>CLUB
          </div>
        </div>
        <div style={{ alignSelf:"stretch",textAlign:"center",borderTop:`1px solid ${tc}33`,paddingTop:h*.022,fontFamily:"'Courier New',monospace",fontSize:w*.065,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em" }}>
          COLLECTOR · S1
        </div>
      </div>
      {/* Tear line */}
      <div style={{ position:"absolute",left:0,right:0,top:"20%",height:2,zIndex:7,pointerEvents:"none",background:`repeating-linear-gradient(90deg,${tc}70 0,${tc}70 5px,transparent 5px,transparent 10px)`,boxShadow:`0 0 5px ${tg}` }}/>
      <div style={{ position:"absolute",left:-1,top:"calc(20% - 5px)",width:9,height:12,zIndex:8,background:"#050505",clipPath:"polygon(0 50%,100% 0,100% 100%)" }}/>
    </div>
  );
}

// ─── PACK TEAR ────────────────────────────────────────────────────────────────
function PackTear({ tier, onComplete }: { tier:Tier; onComplete:()=>void }) {
  const [dx,setDx]=useState(0), [live,setLive]=useState(false), [done,setDone]=useState(false);
  const sx=useRef(0), THRESH=180;
  const prog=Math.min(dx/THRESH,1);
  const W=typeof window!=="undefined"?Math.min(230,window.innerWidth*.65):210;
  const H=W*1.5, TEAR=H*.2;
  const tc=TIER_COLOR[tier], tg=TIER_GLOW[tier];

  const pd=(e:React.PointerEvent)=>{ e.preventDefault();(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);setLive(true);sx.current=e.clientX-dx; };
  const pm=(e:React.PointerEvent)=>{ if(!live)return; setDx(Math.max(0,Math.min(e.clientX-sx.current,THRESH+40))); };
  const pu=()=>{ setLive(false); if(prog>.62){ setDx(THRESH);setDone(true);sfxTear();setTimeout(onComplete,600); } else setDx(0); };

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:16 }}>
      <motion.p animate={{ opacity:[.45,1,.45] }} transition={{ duration:1.3,repeat:Infinity }}
        style={{ fontFamily:"var(--font-brice)",fontSize:13,margin:0,color:"rgba(255,255,255,0.45)",letterSpacing:"0.18em",textTransform:"uppercase",opacity:done?0:1,transition:"opacity .3s" }}>
        ← DRAG TO TEAR →
      </motion.p>
      <div onPointerDown={pd} onPointerMove={pm} onPointerUp={pu} onPointerCancel={pu}
        style={{ position:"relative",width:W,height:H,cursor:"ew-resize",touchAction:"none",userSelect:"none" }}>
        {/* body */}
        <div style={{ position:"absolute",top:TEAR,left:0,right:0,bottom:0,borderRadius:"0 0 14px 14px",background:TIER_BG[tier],border:`2px solid ${tc}aa`,borderTop:"none",overflow:"hidden" }}>
          <div style={{ position:"absolute",top:0,left:0,right:0,height:70,background:`radial-gradient(ellipse at 50% 0%,${tc} 0%,transparent 72%)`,opacity:prog*.9 }}/>
          <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" style={{ width:W*.38,height:W*.38,opacity:.55,filter:`drop-shadow(0 0 10px ${tg})` }}/>
            <div style={{ fontFamily:"var(--font-brice)",fontSize:W*.1,fontWeight:900,color:tc,textTransform:"uppercase",textAlign:"center",lineHeight:1.15,textShadow:`0 0 16px ${tg}` }}>GOOD<br/>VIBES<br/>CLUB</div>
          </div>
          <div className="holo" style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,0,128,0.2),rgba(0,255,148,0.14),rgba(0,191,255,0.2))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>
        </div>
        {/* flap */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:TEAR,borderRadius:"14px 14px 0 0",background:tier==="Legendary"?"linear-gradient(160deg,#3a2c00,#1c1400)":tier==="Rare"?"linear-gradient(160deg,#2d1250,#120a24)":"linear-gradient(160deg,#1a3050,#0b1a22)",border:`2px solid ${tc}bb`,borderBottom:"none",overflow:"hidden",transform:`translateX(${prog*300}px) rotate(${prog*26}deg)`,transformOrigin:"left center",opacity:1-prog*.8,transition:live?"none":"transform .35s cubic-bezier(.34,1.56,.64,1),opacity .35s",pointerEvents:"none" }}>
          <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Courier New',monospace",fontSize:W*.08,color:tc,letterSpacing:"0.14em",textShadow:`0 0 10px ${tg}` }}>{tier==="Legendary"?"✦ TEAR ✦":"← TEAR →"}</div>
          <div className="holo" style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,0,128,0.3),rgba(0,255,148,0.2),rgba(0,191,255,0.3))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>
        </div>
        {!done&&<div style={{ position:"absolute",bottom:-14,left:0,right:0,height:3,background:"rgba(255,255,255,0.06)",borderRadius:2 }}><div style={{ height:"100%",width:`${prog*100}%`,background:`linear-gradient(90deg,${tc},${tg})`,borderRadius:2,boxShadow:`0 0 8px ${tg}`,transition:live?"none":"width .3s" }}/></div>}
      </div>
    </div>
  );
}

// ─── VIBE CARD ────────────────────────────────────────────────────────────────
function VibeCard({ tokenId, card, onShare, onDownload, onReset }: { tokenId:number; card:CardData; onShare:()=>void; onDownload:()=>void; onReset:()=>void }) {
  const [flipped,setFlipped]=useState(false);
  const [tx,setTx]=useState(0), [ty,setTy]=useState(0);
  const ref=useRef<HTMLDivElement>(null);
  const isTouch=useRef(false);
  useEffect(()=>{ isTouch.current=window.matchMedia("(hover:none)").matches; },[]);

  const W=typeof window!=="undefined"?Math.min(300,window.innerWidth*.82):290;
  const H=W*1.42;
  const tc=TIER_COLOR[card.tier], tg=TIER_GLOW[card.tier];

  const onMove=(e:React.MouseEvent)=>{
    if(isTouch.current||flipped)return;
    const r=ref.current?.getBoundingClientRect(); if(!r)return;
    setTx(((e.clientY-r.top-r.height/2)/(r.height/2))*-10);
    setTy(((e.clientX-r.left-r.width/2)/(r.width/2))*10);
  };

  return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:18 }}>
      {/* ── GRADIENT BORDER WRAPPER ── */}
      <div className="border-spin" style={{ padding:2,borderRadius:20,background:"linear-gradient(45deg,#ff0080,#ff6600,#ffe100,#00ff94,#00bfff,#bf00ff,#ff0080)",backgroundSize:"300% 300%" }}>
        <div style={{ perspective:1100 }}>
          <motion.div ref={ref}
            onClick={()=>setFlipped(f=>!f)}
            onMouseMove={onMove}
            onMouseLeave={()=>{ setTx(0);setTy(0); }}
            animate={{ rotateY:flipped?180:ty, rotateX:flipped?0:tx }}
            transition={{ type:"spring",stiffness:180,damping:22 }}
            className="card-rotator"
            style={{ width:W,height:H,position:"relative",cursor:"pointer" }}
          >
            {/* FRONT */}
            <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:18,overflow:"hidden",background:TIER_BG[card.tier] }}>
              {/* Holo foil */}
              <div className="holo" style={{ position:"absolute",inset:0,zIndex:10,background:"linear-gradient(135deg,rgba(255,0,128,0.18),rgba(255,140,0,0.12),rgba(255,225,0,0.18),rgba(0,255,148,0.12),rgba(0,191,255,0.18),rgba(191,0,255,0.12),rgba(255,0,128,0.18))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>

              {/* Portrait */}
              <div style={{ position:"absolute",top:0,left:0,right:0,height:"58%",overflow:"hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/portrait/${tokenId}`} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",objectPosition:"center top" }}/>
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,transparent 30%,rgba(0,0,0,0.92) 100%)" }}/>
                {/* Token badge */}
                <div style={{ position:"absolute",top:10,left:10,right:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div style={{ background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",borderRadius:6,padding:"3px 8px",fontFamily:"var(--font-mundial)",fontSize:W*.032,color:"rgba(255,255,255,0.75)" }}>GVC #{tokenId}</div>
                  <div style={{ background:`${tc}22`,border:`1.5px solid ${tc}`,borderRadius:6,padding:"3px 10px",fontFamily:"var(--font-brice)",fontSize:W*.034,fontWeight:900,color:tc,textTransform:"uppercase",letterSpacing:"0.07em",textShadow:`0 0 10px ${tg}` }}>{card.tier}</div>
                </div>
              </div>

              {/* Bottom info panel */}
              <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:`${H*.024}px ${W*.055}px ${H*.028}px`,display:"flex",flexDirection:"column",gap:H*.016 }}>
                {/* Shaka + archetype */}
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/shaka.png" alt="" style={{ width:W*.072,height:W*.072,filter:`drop-shadow(0 0 6px ${tg})` }}/>
                  <div style={{ fontFamily:"var(--font-brice)",fontSize:W*.065,fontWeight:900,color:tc,textTransform:"uppercase",letterSpacing:"0.03em",textShadow:`0 0 20px ${tg}`,lineHeight:1.05,flex:1 }}>{card.archetype}</div>
                </div>
                {/* Quote */}
                <div style={{ fontFamily:"var(--font-mundial)",fontSize:W*.032,color:"rgba(255,255,255,0.42)",fontStyle:"italic",lineHeight:1.4 }}>"{card.quote}"</div>
                {/* Stats row — colored chips */}
                <div style={{ display:"flex",gap:W*.016 }}>
                  {(["RARITY","DRIP","ENERGY","AURA"] as const).map((label,i)=>{
                    const val=[card.rarity,card.drip,card.energy,card.aura][i];
                    const col=STAT_COLORS[i];
                    return (
                      <div key={label} style={{ flex:1,background:`${col}18`,border:`1px solid ${col}55`,borderRadius:7,padding:`${H*.01}px 0`,display:"flex",flexDirection:"column",alignItems:"center",gap:1 }}>
                        <span style={{ fontFamily:"var(--font-mundial)",fontSize:W*.024,color:`${col}aa`,letterSpacing:"0.08em",textTransform:"uppercase" }}>{label}</span>
                        <span style={{ fontFamily:"var(--font-brice)",fontSize:W*.06,fontWeight:900,color:col,textShadow:val>=80?`0 0 10px ${col}`:"none" }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Badges + rank */}
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ display:"flex",gap:4 }}>
                    {card.badges.map(b=>(
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={b} src={`https://goodvibesclub.ai/badges/${b}.webp`} alt={b} style={{ width:W*.1,height:W*.1,borderRadius:6,border:`1px solid rgba(255,255,255,0.15)` }} onError={e=>{ (e.target as HTMLImageElement).style.display="none"; }}/>
                    ))}
                  </div>
                  <span style={{ fontFamily:"var(--font-mundial)",fontSize:W*.026,color:"rgba(255,255,255,0.22)",letterSpacing:"0.08em" }}>#{card.rank.toLocaleString()} of 6,969</span>
                </div>
              </div>
            </div>

            {/* BACK */}
            <div className="card-face" style={{ position:"absolute",inset:0,borderRadius:18,transform:"rotateY(180deg)",background:"linear-gradient(160deg,#08001a,#140030,#060012)",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14 }}>
              <div style={{ position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(45deg,rgba(255,224,72,0.025) 0,rgba(255,224,72,0.025) 1px,transparent 0,transparent 50%)",backgroundSize:"14px 14px" }}/>
              <div className="holo" style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,0,128,0.12),rgba(0,255,148,0.1),rgba(0,191,255,0.12),rgba(191,0,255,0.1))",mixBlendMode:"color-dodge",pointerEvents:"none" }}/>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shaka.png" alt="" style={{ width:W*.42,height:W*.42,filter:"drop-shadow(0 0 24px rgba(255,224,72,0.75))",position:"relative",zIndex:1 }}/>
              <div style={{ fontFamily:"var(--font-brice)",fontSize:W*.1,fontWeight:900,color:"#FFE048",textTransform:"uppercase",letterSpacing:"0.08em",textShadow:"0 0 32px rgba(255,224,72,0.85)",position:"relative",zIndex:1,textAlign:"center",lineHeight:1.1 }}>GOOD<br/>VIBES<br/>CLUB</div>
              <div style={{ fontFamily:"var(--font-mundial)",fontSize:W*.034,color:"rgba(255,255,255,0.2)",letterSpacing:"0.14em",position:"relative",zIndex:1 }}>TAP TO FLIP</div>
            </div>
          </motion.div>
        </div>
      </div>

      <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.2)",margin:0,letterSpacing:"0.08em" }}>Tap card to flip</p>

      {/* Actions */}
      <div style={{ display:"flex",flexWrap:"wrap",gap:10,justifyContent:"center" }}>
        <motion.button whileTap={{ scale:.95 }} onClick={onShare}
          style={{ padding:"10px 22px",borderRadius:10,cursor:"pointer",border:"none",background:"linear-gradient(135deg,#FFE048,#FFD700,#FFAA00)",color:"#050505",fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em",boxShadow:"0 4px 22px rgba(255,224,72,0.45)" }}>
          𝕏 SHARE ON X
        </motion.button>
        <motion.button whileTap={{ scale:.95 }} onClick={onDownload}
          style={{ padding:"10px 22px",borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.05)",border:"1.5px solid rgba(255,255,255,0.18)",color:"rgba(255,255,255,0.7)",fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em" }}>
          ↓ DOWNLOAD
        </motion.button>
        <motion.button whileTap={{ scale:.95 }} onClick={onReset}
          style={{ padding:"10px 22px",borderRadius:10,cursor:"pointer",background:"rgba(255,224,72,0.07)",border:"1.5px solid rgba(255,224,72,0.32)",color:GOLD,fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,letterSpacing:"0.08em" }}>
          🕹 PLAY AGAIN
        </motion.button>
      </div>
    </div>
  );
}

// ─── TIER BURST ───────────────────────────────────────────────────────────────
function TierBurst({ tier }:{ tier:Tier }) {
  const c=TIER_COLOR[tier];
  return (
    <div style={{ position:"fixed",inset:0,pointerEvents:"none",zIndex:60,overflow:"hidden" }}>
      {Array.from({length:30},(_,i)=>{
        const a=(i/30)*360,d=150+Math.random()*250;
        return <motion.div key={i} initial={{ x:"50vw",y:"50vh",scale:0,opacity:1 }} animate={{ x:`calc(50vw + ${Math.cos(a*Math.PI/180)*d}px)`,y:`calc(50vh + ${Math.sin(a*Math.PI/180)*d}px)`,scale:[0,1.6,.6],opacity:[1,1,0] }} transition={{ duration:1.2,ease:"easeOut",delay:i*.01 }} style={{ position:"absolute",width:7,height:7,borderRadius:"50%",background:c,boxShadow:`0 0 12px ${c},0 0 24px ${c}` }}/>;
      })}
    </div>
  );
}

// ─── CANVAS DOWNLOAD ──────────────────────────────────────────────────────────
async function downloadCard(tokenId:number,card:CardData){
  try {
    const W=420,H=W*1.42;
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const ctx=cv.getContext("2d")!;
    const tc=TIER_COLOR[card.tier];

    const rr=(x:number,y:number,w:number,h:number,r:number)=>{
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
    };

    // Gradient border
    const borderGrad=ctx.createLinearGradient(0,0,W,H);
    [["#ff0080","#ff6600","#ffe100","#00ff94","#00bfff","#bf00ff","#ff0080"]].flat().forEach((c,i,a)=>borderGrad.addColorStop(i/(a.length-1),c));
    rr(0,0,W,H,20);ctx.fillStyle=borderGrad;ctx.fill();

    // Card bg
    const bgGrad=ctx.createLinearGradient(0,0,W,H);
    if(card.tier==="Legendary"){ bgGrad.addColorStop(0,"#1a0e00");bgGrad.addColorStop(.55,"#2c1c00");bgGrad.addColorStop(1,"#120a00"); }
    else if(card.tier==="Rare"){ bgGrad.addColorStop(0,"#0e0520");bgGrad.addColorStop(.55,"#1c0a38");bgGrad.addColorStop(1,"#080318"); }
    else{ bgGrad.addColorStop(0,"#071a1a");bgGrad.addColorStop(.55,"#0d2e30");bgGrad.addColorStop(1,"#041212"); }
    rr(3,3,W-6,H-6,18);ctx.fillStyle=bgGrad;ctx.fill();

    // Portrait
    const res=await fetch(`/api/portrait/${tokenId}`);
    const blob=await res.blob();
    const url=URL.createObjectURL(blob);
    await new Promise<void>(resolve=>{
      const img=new Image();img.onload=()=>{
        ctx.save();rr(3,3,W-6,H*.6,18);ctx.clip();
        ctx.drawImage(img,3,3,W-6,H*.6-3);
        const vg=ctx.createLinearGradient(0,H*.35,0,H*.63);
        vg.addColorStop(0,"rgba(0,0,0,0)");vg.addColorStop(1,"rgba(0,0,0,.95)");
        ctx.fillStyle=vg;ctx.fillRect(3,H*.35,W-6,H*.3);
        ctx.restore();URL.revokeObjectURL(url);resolve();
      };img.src=url;
    });

    const brice="'Arial',sans-serif",mundial="'Arial',sans-serif";

    // Token badge
    ctx.save();rr(12,12,80,22,5);ctx.fillStyle="rgba(0,0,0,.55)";ctx.fill();ctx.restore();
    ctx.font=`12px ${mundial}`;ctx.fillStyle="rgba(255,255,255,.75)";ctx.textAlign="left";ctx.textBaseline="middle";ctx.fillText(`GVC #${tokenId}`,20,23);

    // Tier badge
    const tw=ctx.measureText(card.tier.toUpperCase()).width+18;
    ctx.save();rr(W-tw-12,12,tw,22,5);ctx.fillStyle=tc+"22";ctx.fill();ctx.strokeStyle=tc;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    ctx.font=`bold 12px ${brice}`;ctx.fillStyle=tc;ctx.textAlign="right";ctx.textBaseline="middle";ctx.fillText(card.tier.toUpperCase(),W-14,23);

    // Shaka icon
    const shakaImg=await new Promise<HTMLImageElement>(resolve=>{
      const s=new Image();s.onload=()=>resolve(s);s.onerror=()=>resolve(s);s.src="/shaka.png";
    });
    if(shakaImg.naturalWidth>0) ctx.drawImage(shakaImg,14,H*.6+6,26,26);

    // Archetype
    ctx.font=`bold 22px ${brice}`;ctx.fillStyle=tc;ctx.textAlign="left";ctx.textBaseline="alphabetic";
    ctx.shadowColor=tc;ctx.shadowBlur=18;
    ctx.fillText(card.archetype.toUpperCase(),46,H*.6+26);ctx.shadowBlur=0;

    // Quote
    ctx.font=`italic 11px ${mundial}`;ctx.fillStyle="rgba(255,255,255,.4)";
    ctx.fillText(`"${card.quote}"`,14,H*.6+44);

    // Stat chips
    const scols=4,sg=5,sw=(W-28-sg*(scols-1))/scols;
    const SY=H*.6+54,SH=42;
    const labels=["RARITY","DRIP","ENERGY","AURA"];
    const vals=[card.rarity,card.drip,card.energy,card.aura];
    STAT_COLORS.forEach((col,i)=>{
      const sx=14+i*(sw+sg);
      ctx.save();rr(sx,SY,sw,SH,7);ctx.fillStyle=col+"22";ctx.fill();ctx.strokeStyle=col+"66";ctx.lineWidth=1;ctx.stroke();ctx.restore();
      ctx.font=`9px ${mundial}`;ctx.fillStyle=col+"99";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(labels[i],sx+sw/2,SY+11);
      ctx.font=`bold 22px ${brice}`;ctx.fillStyle=col;
      if(vals[i]>=80){ctx.shadowColor=col;ctx.shadowBlur=10;}
      ctx.fillText(String(vals[i]),sx+sw/2,SY+30);ctx.shadowBlur=0;
    });

    // Rank
    ctx.font=`10px ${mundial}`;ctx.fillStyle="rgba(255,255,255,.22)";ctx.textAlign="center";ctx.textBaseline="alphabetic";
    ctx.fillText(`RANK #${card.rank.toLocaleString()} OF 6,969`,W/2,H-10);

    const a=document.createElement("a");a.download=`vibe-card-${tokenId}.png`;a.href=cv.toDataURL("image/png");a.click();
  } catch(e){ console.error("download failed",e); }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
const PACK_POSITIONS=[22,50,78]; // x% of glass width for the 3 packs
const PACK_TIERS:Tier[]=["Common","Rare","Legendary"];

export default function Page(){
  const [phase,setPhase]=useState<Phase>("PIN");
  const [pin,setPin]=useState("");
  const [tokenId,setTokenId]=useState<number|null>(null);
  const [card,setCard]=useState<CardData|null>(null);
  const [clawX,setClawX]=useState(50);      // 0-100
  const [armPx,setArmPx]=useState(0);       // claw arm extension in px
  const [clawClosed,setClawClosed]=useState(false);
  const [clawHasPack,setClawHasPack]=useState(false);
  const [grabbedIdx,setGrabbedIdx]=useState(-1);
  const [burst,setBurst]=useState(false);
  const moveRef=useRef<ReturnType<typeof setInterval>|null>(null);

  const stopMove=useCallback(()=>{
    if(moveRef.current){ clearInterval(moveRef.current);moveRef.current=null; }
  },[]);

  const startMove=useCallback((dir:"left"|"right")=>{
    stopMove();
    if(phase!=="READY") return;
    moveRef.current=setInterval(()=>{
      setClawX(x=>dir==="left"?Math.max(8,x-2.5):Math.min(92,x+2.5));
    },30);
  },[phase,stopMove]);

  useEffect(()=>()=>stopMove(),[stopMove]);

  // Keyboard controls
  useEffect(()=>{
    if(phase!=="READY") return;
    const kd=(e:KeyboardEvent)=>{
      if(e.key==="ArrowLeft") startMove("left");
      if(e.key==="ArrowRight") startMove("right");
      if(e.key===" "||e.key==="ArrowDown") handleDrop();
    };
    const ku=(e:KeyboardEvent)=>{ if(e.key==="ArrowLeft"||e.key==="ArrowRight") stopMove(); };
    window.addEventListener("keydown",kd);window.addEventListener("keyup",ku);
    return()=>{ window.removeEventListener("keydown",kd);window.removeEventListener("keyup",ku); };
  },[phase,startMove,stopMove]); // handleDrop added below

  const handleDrop=useCallback(()=>{
    if(phase!=="READY") return;
    stopMove();
    // Find nearest pack
    const nearest=PACK_POSITIONS.reduce((best,pos,i)=>Math.abs(pos-clawX)<Math.abs(PACK_POSITIONS[best]-clawX)?i:best,0);
    sfxDrop();
    setPhase("DROPPING");
    setArmPx(190);
    setTimeout(()=>{
      setClawClosed(true);
      setGrabbedIdx(nearest);
      sfxGrab();
      setTimeout(()=>{
        setClawHasPack(true);
        setArmPx(0);
        setPhase("LIFTING");
        setTimeout(()=>{
          setClawX(92);
          setTimeout(()=>{
            setPhase("CHUTE");
          },700);
        },800);
      },500);
    },900);
  },[phase,clawX,stopMove]);

  const handlePlay=useCallback(()=>{
    const id=parseInt(pin,10);
    if(isNaN(id)||id<0||id>6968) return;
    setTokenId(id);
    setCard(generateCard(id));
    sfxCoin();
    setPhase("READY");
  },[pin]);

  const handleCollect=useCallback(()=>setPhase("TEARING"),[]);

  const handleTearDone=useCallback(()=>{
    setPhase("CARD");
    sfxReveal();
    setBurst(true);
    setTimeout(()=>setBurst(false),1500);
  },[]);

  const handleReset=useCallback(()=>{
    setPhase("PIN");setPin("");setTokenId(null);setCard(null);
    setClawX(50);setArmPx(0);setClawClosed(false);setClawHasPack(false);setGrabbedIdx(-1);setBurst(false);
  },[]);

  const pressPin=(k:string)=>{
    sfxKey();
    if(k==="CLR"){setPin("");return;}
    if(k==="RND"){setPin(String(Math.floor(Math.random()*6969)));return;}
    if(pin.length>=4) return;
    setPin(pin+k);
  };

  const canPlay=pin.length>0&&!isNaN(parseInt(pin))&&parseInt(pin)>=0&&parseInt(pin)<=6968;
  const tier:Tier=(card?.tier??"Common") as Tier;
  const machineVisible=phase!=="TEARING"&&phase!=="CARD";
  const GLASS_H=220;

  return (
    <>
      <style>{CSS}</style>
      <style>{`.card-rotator{-webkit-transform-style:preserve-3d;transform-style:preserve-3d}.card-face{-webkit-backface-visibility:hidden;backface-visibility:hidden}`}</style>

      {burst&&card&&<TierBurst tier={card.tier}/>}

      <main style={{ minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"14px 12px 80px",overflowX:"hidden",width:"100%",boxSizing:"border-box" }}>

        {/* HEADER */}
        <motion.div initial={{ opacity:0,y:-12 }} animate={{ opacity:1,y:0 }} style={{ textAlign:"center",marginBottom:14 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:3 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:24,height:24 }}/>
            <h1 className="text-shimmer" style={{ fontFamily:"var(--font-brice)",fontSize:"clamp(18px,5vw,32px)",fontWeight:900,margin:0,textTransform:"uppercase",letterSpacing:"0.06em" }}>GVC CLAW MACHINE</h1>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shaka.png" alt="" className="shaka-idle" style={{ width:24,height:24 }}/>
          </div>
          <p style={{ color:"rgba(255,255,255,0.22)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",margin:0 }}>Enter your GVC token PIN · grab your pack · reveal your card</p>
        </motion.div>

        {/* CLAW MACHINE */}
        <AnimatePresence>
          {machineVisible && (
            <motion.div key="machine"
              initial={{ opacity:0,y:18 }}
              animate={{ opacity:1,y:0 }}
              exit={{ opacity:0,x:-160,scale:.85,transition:{ duration:.5,ease:"easeIn" } }}
              style={{ width:"100%",maxWidth:400 }}
            >
              {/* Machine cabinet */}
              <div style={{
                background:"linear-gradient(180deg,#0c0822 0%,#0a0620 55%,#070418 100%)",
                border:"2px solid rgba(120,80,255,0.45)",borderRadius:18,overflow:"hidden",
                boxShadow:"0 0 50px rgba(120,80,255,0.15),0 0 100px rgba(120,80,255,0.05),inset 0 0 80px rgba(0,0,0,0.5)",
              }}>

                {/* LED TOP */}
                <div className="led-strip" style={{ height:5 }}/>

                {/* Cabinet top label */}
                <div style={{ padding:"8px 14px 6px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(180deg,rgba(120,80,255,0.06) 0%,transparent 100%)" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/gvc-logotype.svg" alt="GVC" style={{ height:14,opacity:.6 }}/>
                    <span style={{ fontFamily:"var(--font-brice)",fontSize:13,fontWeight:900,color:"#c084fc",letterSpacing:"0.1em",textTransform:"uppercase",textShadow:"0 0 14px rgba(192,132,252,0.6)" }}>CLAW MACHINE</span>
                  </div>
                  {/* Credit display */}
                  <div style={{ background:"#001500",border:"1px solid rgba(46,255,46,0.4)",borderRadius:5,padding:"3px 10px",fontFamily:"'Courier New',monospace",fontSize:10,color:"#2EFF2E",letterSpacing:"0.12em",textShadow:"0 0 8px rgba(46,255,46,0.8)" }}>
                    {phase==="PIN"?"READY":phase==="READY"?"PLAY!":phase==="CHUTE"?"COLLECT!":"••••"}
                  </div>
                </div>

                {/* GLASS VIEWING AREA */}
                <div style={{ margin:"0 10px",position:"relative",height:GLASS_H,background:"linear-gradient(180deg,rgba(10,8,30,0.95) 0%,rgba(8,6,24,0.98) 100%)",border:"1.5px solid rgba(120,80,255,0.25)",borderRadius:10,overflow:"hidden" }}>
                  {/* Glass reflection overlay */}
                  <div style={{ position:"absolute",inset:0,zIndex:20,pointerEvents:"none",background:"linear-gradient(135deg,rgba(255,255,255,0.04) 0%,transparent 45%,rgba(255,255,255,0.015) 100%)" }}/>
                  <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"rgba(255,255,255,0.07)",zIndex:21 }}/>

                  {/* Star field background */}
                  <div style={{ position:"absolute",inset:0,zIndex:0,opacity:.4,backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.8) 1px,transparent 1px)",backgroundSize:"30px 30px" }}/>

                  {/* Claw rail track */}
                  <div style={{ position:"absolute",top:10,left:"5%",right:"5%",height:6,background:"linear-gradient(180deg,#303040,#202030)",borderRadius:3,zIndex:5,boxShadow:"0 2px 6px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.1)" }}/>
                  {/* Rail end caps */}
                  <div style={{ position:"absolute",top:7,left:"4%",width:10,height:12,background:"linear-gradient(180deg,#505060,#303040)",borderRadius:3,zIndex:5 }}/>
                  <div style={{ position:"absolute",top:7,right:"4%",width:10,height:12,background:"linear-gradient(180deg,#505060,#303040)",borderRadius:3,zIndex:5 }}/>

                  {/* CLAW */}
                  {phase!=="PIN"&&(
                    <ClawArm
                      x={clawX}
                      armPx={armPx}
                      closed={clawClosed}
                      hasPack={clawHasPack}
                      packTier={tier}
                    />
                  )}

                  {/* Packs on the bottom shelf */}
                  <div style={{ position:"absolute",bottom:18,left:0,right:0,display:"flex",justifyContent:"space-around",paddingLeft:"8%",paddingRight:"8%",zIndex:3 }}>
                    {PACK_TIERS.map((t,i)=>(
                      <div key={i} className={phase==="READY"||phase==="PIN"?"pack-swing":""} style={{ animationDelay:`${i*.4}s` }}>
                        <MiniPack tier={t} grabbed={grabbedIdx===i&&(phase==="GRABBING"||phase==="LIFTING"||phase==="CHUTE")}/>
                      </div>
                    ))}
                  </div>

                  {/* Chute opening (bottom right) */}
                  <div style={{ position:"absolute",bottom:0,right:0,width:58,height:22,background:"linear-gradient(180deg,rgba(0,20,0,0.9),rgba(0,10,0,0.95))",border:"1px solid rgba(46,255,46,0.35)",borderRadius:"6px 6px 0 0",display:"flex",alignItems:"center",justifyContent:"center",zIndex:6 }}>
                    <span style={{ fontFamily:"var(--font-mundial)",fontSize:8,color:"rgba(46,255,46,0.6)",letterSpacing:"0.1em" }}>CHUTE</span>
                  </div>

                  {/* Idle overlay */}
                  {phase==="PIN"&&(
                    <div style={{ position:"absolute",inset:0,zIndex:15,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)" }}>
                      <div style={{ textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
                        <div style={{ fontSize:28,opacity:.35 }}>🎰</div>
                        <p style={{ fontFamily:"var(--font-mundial)",fontSize:10,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em",textTransform:"uppercase",margin:0 }}>ENTER PIN TO PLAY</p>
                      </div>
                    </div>
                  )}

                  {/* CHUTE pack collected */}
                  <AnimatePresence>
                    {phase==="CHUTE"&&(
                      <motion.div initial={{ y:-50,opacity:0 }} animate={{ y:0,opacity:1 }} transition={{ type:"spring",stiffness:250,damping:20 }}
                        style={{ position:"absolute",bottom:24,right:8,zIndex:14 }}>
                        <div style={{ animation:"chuteBounce .6s ease-out forwards" }}>
                          <MiniPack tier={tier} grabbed={false}/>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Decorative side bolts */}
                <div style={{ padding:"6px 10px 0",display:"flex",justifyContent:"space-between" }}>
                  {[0,1,2,3].map(i=>(
                    <div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"linear-gradient(135deg,#404050,#202028)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.1),0 1px 3px rgba(0,0,0,0.4)" }}/>
                  ))}
                </div>

                {/* CONTROL PANEL */}
                <div style={{ padding:"10px 12px 14px",borderTop:"1px solid rgba(120,80,255,0.14)",marginTop:4 }}>

                  {/* PIN ENTRY */}
                  {phase==="PIN"&&(
                    <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                      <div style={{ fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"0.15em",textTransform:"uppercase",textAlign:"center" }}>ENTER YOUR GVC TOKEN PIN</div>
                      {/* LCD */}
                      <div style={{ background:"#001500",border:"1px solid rgba(46,255,46,0.45)",borderRadius:6,padding:"6px 12px",fontFamily:"'Courier New',monospace",fontSize:17,fontWeight:"bold",color:"#2EFF2E",letterSpacing:"0.22em",textAlign:"center",textShadow:"0 0 12px rgba(46,255,46,0.9)",boxShadow:"inset 0 0 14px rgba(46,255,46,0.1)",minHeight:36,display:"flex",alignItems:"center",justifyContent:"center" }}>
                        {pin?`# ${pin.padStart(4,"0")}`:"_ _ _ _"}
                      </div>
                      {/* Keypad */}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4 }}>
                        {["1","2","3","4","5","6","7","8","9","CLR","0","RND"].map(k=>(
                          <motion.button key={k} onClick={()=>pressPin(k)} whileTap={{ scale:.88,y:1 }}
                            style={{ height:32,borderRadius:5,cursor:"pointer",background:k==="CLR"?"rgba(255,50,50,0.1)":k==="RND"?"rgba(255,224,72,0.1)":"rgba(255,255,255,0.05)",border:`1px solid ${k==="CLR"?"rgba(255,70,70,0.3)":k==="RND"?"rgba(255,224,72,0.3)":"rgba(255,255,255,0.1)"}`,color:k==="CLR"?"rgba(255,100,100,0.8)":k==="RND"?GOLD:"rgba(255,255,255,0.7)",fontFamily:k==="CLR"||k==="RND"?"var(--font-mundial)":"'Courier New',monospace",fontSize:k==="CLR"||k==="RND"?9:15,boxShadow:"0 2px 0 rgba(0,0,0,0.45)" }}>
                            {k}
                          </motion.button>
                        ))}
                      </div>
                      {/* PLAY button */}
                      <motion.button onClick={handlePlay} disabled={!canPlay} whileTap={canPlay?{ scale:.96 }:{}}
                        animate={canPlay?{ boxShadow:["0 0 12px rgba(192,132,252,0.3)","0 0 28px rgba(192,132,252,0.7)","0 0 12px rgba(192,132,252,0.3)"] }:{}}
                        transition={{ boxShadow:{ duration:1.3,repeat:Infinity } }}
                        style={{ height:44,borderRadius:8,cursor:canPlay?"pointer":"default",background:canPlay?"linear-gradient(135deg,#7c3aed,#a855f7,#c084fc)":"rgba(120,80,255,0.06)",border:`1.5px solid ${canPlay?"rgba(192,132,252,0.8)":"rgba(120,80,255,0.2)"}`,color:canPlay?"white":"rgba(192,132,252,0.28)",fontFamily:"var(--font-brice)",fontSize:15,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",boxShadow:canPlay?"0 4px 0 rgba(80,30,160,0.5)":"none",transition:"background .3s,color .3s" }}>
                        🕹 PLAY
                      </motion.button>
                    </div>
                  )}

                  {/* CLAW CONTROLS */}
                  {(phase==="READY"||phase==="DROPPING"||phase==="GRABBING"||phase==="LIFTING")&&(
                    <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                      <div style={{ textAlign:"center",fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"0.15em",textTransform:"uppercase" }}>
                        {phase==="READY"?"POSITION CLAW · PRESS DROP":"CLAW IN MOTION..."}
                      </div>
                      {/* Move buttons + drop */}
                      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                        {/* Left */}
                        <motion.button
                          onPointerDown={()=>startMove("left")}
                          onPointerUp={stopMove}
                          onPointerLeave={stopMove}
                          whileTap={{ scale:.9 }}
                          disabled={phase!=="READY"}
                          style={{ flex:1,height:52,borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.06)",border:"1.5px solid rgba(255,255,255,0.18)",color:"white",fontSize:22,boxShadow:"0 3px 0 rgba(0,0,0,0.4)",touchAction:"none",opacity:phase==="READY"?1:.4 }}>
                          ◀
                        </motion.button>
                        {/* Drop */}
                        <motion.button onClick={handleDrop} disabled={phase!=="READY"} whileTap={phase==="READY"?{ scale:.92 }:{}}
                          animate={phase==="READY"?{ boxShadow:["0 4px 0 rgba(180,0,0,0.5),0 0 14px rgba(255,60,60,0.3)","0 4px 0 rgba(180,0,0,0.5),0 0 28px rgba(255,60,60,0.6)","0 4px 0 rgba(180,0,0,0.5),0 0 14px rgba(255,60,60,0.3)"] }:{}}
                          transition={{ boxShadow:{ duration:1.2,repeat:Infinity } }}
                          style={{ flex:2,height:52,borderRadius:10,cursor:phase==="READY"?"pointer":"default",background:phase==="READY"?"linear-gradient(180deg,#ef4444,#b91c1c)":"rgba(100,0,0,0.2)",border:`1.5px solid ${phase==="READY"?"rgba(255,100,100,0.7)":"rgba(100,0,0,0.3)"}`,color:"white",fontFamily:"var(--font-brice)",fontSize:16,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",boxShadow:phase==="READY"?"0 4px 0 rgba(130,0,0,0.5)":"none",transition:"background .3s",opacity:phase==="READY"?1:.5 }}>
                          DROP!
                        </motion.button>
                        {/* Right */}
                        <motion.button
                          onPointerDown={()=>startMove("right")}
                          onPointerUp={stopMove}
                          onPointerLeave={stopMove}
                          whileTap={{ scale:.9 }}
                          disabled={phase!=="READY"}
                          style={{ flex:1,height:52,borderRadius:10,cursor:"pointer",background:"rgba(255,255,255,0.06)",border:"1.5px solid rgba(255,255,255,0.18)",color:"white",fontSize:22,boxShadow:"0 3px 0 rgba(0,0,0,0.4)",touchAction:"none",opacity:phase==="READY"?1:.4 }}>
                          ▶
                        </motion.button>
                      </div>
                      <div style={{ textAlign:"center",fontFamily:"var(--font-mundial)",fontSize:9,color:"rgba(255,255,255,0.2)",letterSpacing:"0.1em" }}>
                        HOLD ◀ ▶ TO MOVE · KEYBOARD ARROWS WORK TOO
                      </div>
                    </div>
                  )}

                  {/* COLLECT */}
                  {phase==="CHUTE"&&(
                    <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}>
                      <motion.button onClick={handleCollect} whileTap={{ scale:.96 }}
                        animate={{ boxShadow:["0 0 16px rgba(46,255,46,0.3)","0 0 34px rgba(46,255,46,0.75)","0 0 16px rgba(46,255,46,0.3)"] }}
                        transition={{ boxShadow:{ duration:1.1,repeat:Infinity } }}
                        style={{ width:"100%",height:46,borderRadius:8,cursor:"pointer",background:"linear-gradient(135deg,rgba(46,255,46,0.16),rgba(46,255,46,0.08))",border:"1.5px solid rgba(46,255,46,0.6)",color:"#2EFF2E",fontFamily:"var(--font-brice)",fontSize:15,fontWeight:900,letterSpacing:"0.12em",textTransform:"uppercase",textShadow:"0 0 12px rgba(46,255,46,0.85)" }}>
                        🎉 COLLECT YOUR PACK!
                      </motion.button>
                    </motion.div>
                  )}
                </div>

                <div className="led-strip" style={{ height:5 }}/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PACK TEAR */}
        <AnimatePresence>
          {phase==="TEARING"&&card&&(
            <motion.div key="tear" initial={{ opacity:0,scale:.7,y:36 }} animate={{ opacity:1,scale:1,y:0 }} exit={{ opacity:0 }} transition={{ type:"spring",stiffness:200,damping:22 }}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:20,marginTop:10 }}>
              <GlossyPack tier={tier} w={Math.min(200,typeof window!=="undefined"?window.innerWidth*.55:190)}/>
              <div style={{ marginTop:-10 }}>
                <PackTear tier={tier} onComplete={handleTearDone}/>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CARD REVEAL */}
        <AnimatePresence>
          {phase==="CARD"&&tokenId!==null&&card&&(
            <motion.div key="card" initial={{ opacity:0,scale:.45,y:55 }} animate={{ opacity:1,scale:1,y:0 }} transition={{ type:"spring",stiffness:150,damping:18,delay:.08 }}
              style={{ marginTop:8 }}>
              <VibeCard
                tokenId={tokenId}
                card={card}
                onShare={()=>{ const t=`Just pulled GVC #${tokenId} — ${card.tier} · ${card.archetype} 🤙 #GoodVibesClub #GVC`;window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`,"_blank"); }}
                onDownload={()=>downloadCard(tokenId,card)}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div style={{ marginTop:36,textAlign:"center" }}>
          <p style={{ fontFamily:"var(--font-mundial)",fontSize:11,color:"rgba(255,255,255,0.13)",letterSpacing:"0.1em",margin:0 }}>
            Built by <span style={{ color:"rgba(255,224,72,0.3)" }}>@imaesr</span> for the GVC Vibeathon
          </p>
        </div>
      </main>
    </>
  );
}
