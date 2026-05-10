import { Player, Team, getTeam } from "./data";

export type Pos = "GK" | "DF" | "MF" | "FW";
export type FormationId = "4-3-3" | "4-4-2" | "3-5-2";
export type Mentality = "attacking" | "balanced" | "defensive";

export type FormationShape = { GK: number; DF: number; MF: number; FW: number };

export const FORMATIONS: Record<FormationId, FormationShape> = {
  "4-3-3": { GK: 1, DF: 4, MF: 3, FW: 3 },
  "4-4-2": { GK: 1, DF: 4, MF: 4, FW: 2 },
  "3-5-2": { GK: 1, DF: 3, MF: 5, FW: 2 },
};

export const FORMATION_LIST: FormationId[] = ["4-3-3", "4-4-2", "3-5-2"];
export const MENTALITY_LIST: Mentality[] = ["attacking", "balanced", "defensive"];

export const MENTALITY_LABEL: Record<Mentality, string> = {
  attacking: "Támadó",
  balanced: "Kiegyensúlyozott",
  defensive: "Védekező",
};

export const FORMATION_LABEL: Record<FormationId, string> = {
  "4-3-3": "4-3-3 · támadó szárnyakkal",
  "4-4-2": "4-4-2 · klasszikus kettős csatár",
  "3-5-2": "3-5-2 · uralt középpálya",
};

export type Tactics = {
  formation: FormationId;
  mentality: Mentality;
  /** 11 player names from user team's squad. */
  lineup: string[];
};

export const DEFAULT_TACTICS: Tactics = {
  formation: "4-3-3",
  mentality: "balanced",
  lineup: [],
};

/** Pick the highest-rated XI matching the formation shape. */
export function autoLineup(team: Team, formation: FormationId): string[] {
  const shape = FORMATIONS[formation];
  const byPos: Record<Pos, Player[]> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of team.squad) byPos[p.pos].push(p);
  const out: string[] = [];
  (Object.keys(shape) as Pos[]).forEach((pos) => {
    const need = shape[pos];
    const sorted = [...byPos[pos]].sort((a, b) => b.rating - a.rating).slice(0, need);
    for (const p of sorted) out.push(p.name);
  });
  return out;
}

/** Ensure tactics are valid for the team; auto-fix lineup if needed. */
export function normalizeTactics(t: Tactics | undefined, teamId: string): Tactics {
  const team = getTeam(teamId);
  if (!team) return { ...DEFAULT_TACTICS };
  const formation = (t?.formation && FORMATIONS[t.formation]) ? t.formation : "4-3-3";
  const mentality: Mentality = MENTALITY_LIST.includes(t?.mentality as Mentality)
    ? (t!.mentality as Mentality)
    : "balanced";
  const shape = FORMATIONS[formation];
  const names = new Set(team.squad.map((p) => p.name));
  const seen = new Set<string>();
  const filtered = (t?.lineup ?? []).filter((n) => names.has(n) && !seen.has(n) && (seen.add(n), true));
  // If lineup doesn't match shape, regenerate
  const counts: Record<Pos, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const n of filtered) {
    const p = team.squad.find((q) => q.name === n);
    if (p) counts[p.pos]++;
  }
  const matches = (Object.keys(shape) as Pos[]).every((pos) => counts[pos] === shape[pos]);
  const lineup = matches && filtered.length === 11 ? filtered : autoLineup(team, formation);
  return { formation, mentality, lineup };
}

/**
 * Tactical modifiers applied to the user team's offensive/defensive output.
 * - mentality: attacking → +att, -def; defensive → -att, +def
 * - formation: 4-3-3 slight att+, 3-5-2 mid+, 4-4-2 balanced
 * - lineupQuality: ratio of chosen XI avg vs best XI avg (0.85..1.0 typical)
 */
export function tacticalModifiers(
  tactics: Tactics,
  team: Team,
): { attack: number; defense: number; lineupRating: number } {
  let attack = 0;
  let defense = 0;

  // Mentality
  if (tactics.mentality === "attacking") { attack += 0.18; defense -= 0.12; }
  else if (tactics.mentality === "defensive") { attack -= 0.15; defense += 0.18; }

  // Formation flavour
  if (tactics.formation === "4-3-3") attack += 0.08;
  else if (tactics.formation === "3-5-2") { attack += 0.04; defense -= 0.03; }
  // 4-4-2 neutral

  // Lineup quality vs best possible XI
  const lineupPlayers = tactics.lineup
    .map((n) => team.squad.find((p) => p.name === n))
    .filter((p): p is Player => !!p);
  const lineupAvg = lineupPlayers.length
    ? lineupPlayers.reduce((s, p) => s + p.rating, 0) / lineupPlayers.length
    : 0;
  const bestAvg = [...team.squad].sort((a, b) => b.rating - a.rating).slice(0, 11)
    .reduce((s, p) => s + p.rating, 0) / 11;
  const ratio = bestAvg > 0 ? lineupAvg / bestAvg : 1;
  // ratio typically 0.85..1.0 → modifier ~ -0.15..+0.0 on attack & defense
  const qualityDelta = (ratio - 1) * 1.0; // -0.15 .. 0
  attack += qualityDelta;
  defense += qualityDelta;

  return { attack, defense, lineupRating: lineupAvg };
}

/** Subset of squad chosen as starting XI (used for goal/event picking). */
export function lineupPlayers(tactics: Tactics, team: Team): Player[] {
  return tactics.lineup
    .map((n) => team.squad.find((p) => p.name === n))
    .filter((p): p is Player => !!p);
}
