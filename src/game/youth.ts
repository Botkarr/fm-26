import { TEAMS, getTeam, type Player } from "./data";
import type { PlayerProfile } from "./players/attributes";
import { generatePlayer, makeRng } from "./players/generate";
import { computeRating, computeValue } from "./players/attributes";

/* ============================================================
 * Akadémia / Ifi modul
 *  - Saját klub U19 kerete a save-be perziszálódik (PlayerProfile[])
 *  - Fordulónként attribútum-fejlődés (PA-szerű implicit cap)
 *  - Felhúzás U19 → felnőtt és vissza
 * ============================================================ */

export type YouthState = {
  /** A saját klub U19 kerete (full FM profil). */
  squad: PlayerProfile[];
  /** Játékosonként hány fejlesztési kör futott (analitikához). */
  ticks: number;
};

export type Pos = PlayerProfile["pos"];

const POSITIONS: Pos[] = ["GK", "GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW", "FW", "FW"];

/** Új akadémia init új career-hez. */
export function createYouth(userTeamId: string): YouthState {
  const seed = userTeamId.split("").reduce((a, c) => a + c.charCodeAt(0) * 17, 0);
  const r = makeRng(seed);
  const squad: PlayerProfile[] = POSITIONS.map((pos, i) => {
    const ca = 50 + Math.floor(r() * 50); // 50..100
    const age = 15 + Math.floor(r() * 5); // 15..19
    return generatePlayer(seed + i * 71, { pos, ca, age, hungarian: r() < 0.92 });
  });
  return { squad, ticks: 0 };
}

/* ===================== FEJLŐDÉS ===================== */

/** Egy attribútum delta a korhoz és potenciálhoz mérten. */
function attrDelta(current: number, age: number, r: () => number): number {
  // Növekedési görbe: legmeredekebb 16-19 közt, lassul 23 fölött, csökken 30 fölött
  const ageFactor =
    age < 17 ? 0.9 :
    age < 20 ? 1.0 :
    age < 24 ? 0.55 :
    age < 28 ? 0.20 :
    age < 31 ? 0.05 : -0.05;
  // Plafon-effekt: minél magasabb az érték, annál nehezebb tovább nőni
  const ceilingPenalty = current >= 18 ? 0.2 : current >= 15 ? 0.5 : 1.0;
  // Eseti delta esélye/iránya
  const roll = r();
  if (roll < 0.05) return -1; // ritka visszaesés
  if (roll < 0.65) return 0;  // legtöbbször nem változik
  // Pozitív delta esélye ageFactor szerint
  if (r() < ageFactor * ceilingPenalty) return 1;
  return 0;
}

/** Fordulónként hívjuk: minden ifi attribútumai apránként fejlődnek/csökkennek. */
export function tickYouthDevelopment(youth: YouthState, seed: number): YouthState {
  const r = makeRng(seed * 991 + 17);
  const squad = youth.squad.map((p, idx) => {
    const attrs = { ...p.attrs };
    // 3-5 véletlen attribútum mozdul fordulónként
    const keys = Object.keys(attrs) as (keyof typeof attrs)[];
    const moves = 3 + Math.floor(r() * 3);
    for (let i = 0; i < moves; i++) {
      const k = keys[Math.floor(r() * keys.length)];
      const v = attrs[k];
      if (typeof v !== "number") continue;
      const d = attrDelta(v, p.age, r);
      const nv = Math.max(1, Math.min(20, v + d));
      attrs[k] = nv;
    }
    const rating = computeRating(attrs, p.pos);
    const value = computeValue(rating, p.age);
    void idx;
    return { ...p, attrs, rating, value };
  });
  return { squad, ticks: youth.ticks + 1 };
}

/** Felnőtt csapat fejlődése: kicsi és ritkább, csak 17-25 évesekre érdemi. */
export function tickSeniorDevelopment(userTeamId: string, seed: number): { changes: { name: string; from: number; to: number }[] } {
  const team = TEAMS.find((t) => t.id === userTeamId);
  const changes: { name: string; from: number; to: number }[] = [];
  if (!team) return { changes };
  const r = makeRng(seed * 311 + 7);
  for (const p of team.squad) {
    if (!p.profile) continue;
    if (p.age >= 28) continue;
    if (r() > 0.18) continue; // ~18% esély/forduló mozgásra
    const attrs = { ...p.profile.attrs };
    const keys = Object.keys(attrs) as (keyof typeof attrs)[];
    const k = keys[Math.floor(r() * keys.length)];
    const v = attrs[k];
    if (typeof v !== "number") continue;
    const d = attrDelta(v, p.age, r);
    if (d === 0) continue;
    attrs[k] = Math.max(1, Math.min(20, v + d));
    const newRating = computeRating(attrs, p.profile.pos);
    if (newRating === p.rating) {
      p.profile = { ...p.profile, attrs };
      continue;
    }
    const from = p.rating;
    p.profile = { ...p.profile, attrs, rating: newRating, value: computeValue(newRating, p.age) };
    p.rating = newRating;
    changes.push({ name: p.name, from, to: newRating });
  }
  return { changes };
}

/* ===================== FELHÚZÁS / VISSZAKÜLDÉS ===================== */

/** Profilból "lite" Player rekord (engine-kompat). */
function toLitePlayer(p: PlayerProfile): Player {
  return { name: p.name, pos: p.pos, rating: p.rating, age: p.age, profile: p };
}

/** U19 → felnőtt. Mutálja a TEAMS-t. */
export function promoteYouth(youth: YouthState, userTeamId: string, name: string): YouthState | null {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  if (team.squad.length >= 26) return null;
  const idx = youth.squad.findIndex((p) => p.name === name);
  if (idx < 0) return null;
  if (team.squad.some((p) => p.name === name)) return null;
  const p = youth.squad[idx];
  team.squad.push(toLitePlayer(p));
  const squad = [...youth.squad.slice(0, idx), ...youth.squad.slice(idx + 1)];
  return { ...youth, squad };
}

/** Felnőtt → U19 (csak 21 alattiak küldhetők vissza). */
export function demoteToYouth(youth: YouthState, userTeamId: string, name: string): YouthState | null {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  if (team.squad.length <= 14) return null;
  const idx = team.squad.findIndex((p) => p.name === name);
  if (idx < 0) return null;
  const p = team.squad[idx];
  if (p.age > 20) return null;
  if (!p.profile) return null;
  team.squad.splice(idx, 1);
  return { ...youth, squad: [...youth.squad, p.profile] };
}
