// Types and game logic for VIBE BATTLE

export type BattleTier = "Common" | "Rare" | "Legendary";
export type RoundStat = "RARITY" | "DRIP" | "ENERGY" | "AURA" | "TOTAL";
export type RoundResult = "P1" | "P2" | "DRAW";
export type BattleMode = "VS_CPU" | "PASS_AND_PLAY";
export type Screen = "HOME" | "PACK_RIP" | "BATTLE_SETUP" | "BATTLE_ARENA" | "VICTORY";
export type ArenaPhase = "CHOOSE" | "CPU_THINKING" | "PASS_TO_P2" | "CHOOSE_P2" | "REVEAL" | "RESULT" | "NEXT_ROUND";

export interface BattleCard {
  tokenId: number;
  rarity: number;
  drip: number;
  energy: number;
  aura: number;
  total: number;
  tier: BattleTier;
  archetype: string;
}

export interface BattleResult {
  winner: "P1" | "P2" | "DRAW";
  p1Score: number;
  p2Score: number;
  roundResults: RoundResult[];
  p1BestCard?: BattleCard;
}

export const ROUND_STATS: RoundStat[] = ["RARITY", "DRIP", "ENERGY", "AURA", "TOTAL"];
export const STAT_LABELS: Record<RoundStat, string> = {
  RARITY: "Rarity", DRIP: "Drip", ENERGY: "Energy", AURA: "Aura", TOTAL: "Total",
};

const ARCHETYPES = [
  "The Cosmic Drifter","The Neon Prophet","The Vibe Architect","The Golden Wanderer",
  "The Drift King","The Frequency Holder","The Stellar Nomad","The Radiant Sage",
  "The Vibe Curator","The Etheric Rebel","The Sound Alchemist","The Neon Mystic",
  "The Light Chaser","The Groove Oracle","The Vibe Sovereign","The Chromatic Shaman",
  "The Signal Rider","The Vibe Phantom","The Astral Cowboy","The Frequency Mage",
];

function seedStat(seed: number, min: number, max: number): number {
  let s = seed >>> 0;
  s = ((s * 1664525) + 1013904223) >>> 0;
  s = ((s * 1664525) + 1013904223) >>> 0;
  return min + (s % (max - min + 1));
}

export function generateBattleCard(tokenId: number): BattleCard {
  const rarity = seedStat(tokenId * 3 + 1, 44, 99);
  const drip   = seedStat(tokenId * 7 + 2, 38, 99);
  const energy = seedStat(tokenId * 11 + 3, 35, 99);
  const aura   = seedStat(tokenId * 5 + 4, 40, 99);
  const total  = rarity + drip + energy + aura;
  const tier: BattleTier = total >= 345 ? "Legendary" : total >= 285 ? "Rare" : "Common";
  const archetype = ARCHETYPES[seedStat(tokenId * 17 + 9, 0, ARCHETYPES.length - 1)];
  return { tokenId, rarity, drip, energy, aura, total, tier, archetype };
}

export function compareCards(p1: BattleCard, p2: BattleCard, stat: RoundStat): RoundResult {
  const v1 = p1[stat.toLowerCase() as keyof BattleCard] as number;
  const v2 = p2[stat.toLowerCase() as keyof BattleCard] as number;
  if (v1 > v2) return "P1";
  if (v2 > v1) return "P2";
  return "DRAW";
}

export function randomCard(): BattleCard {
  return generateBattleCard(Math.floor(Math.random() * 6969));
}

export function generateCpuDeck(): BattleCard[] {
  const ids = new Set<number>();
  while (ids.size < 5) ids.add(Math.floor(Math.random() * 6969));
  return [...ids].map(generateBattleCard);
}
