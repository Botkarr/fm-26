import { TEAMS } from "./data";

/* ============================================================
 * Téli átigazolási ablak — AI ↔ AI cserék.
 *  - 11. forduló UTÁN nyílik 3 fordulóra (11, 12, 13)
 *  - User csapata KIMARAD ezekből a cserékből (saját ajánlataid külön rendszerben)
 *  - Minden ablakos fordulóban 2-4 csere; reális, közeli rating-ű klubok közt
 * ============================================================ */

export type WinterWindowState = {
  /** Igaz, ha jelenleg nyitva van. */
  open: boolean;
  /** Hány fordulón át nyitva (round számláló). */
  roundsRemaining: number;
};

export const WINTER_OPEN_ROUND = 11;
export const WINTER_DURATION = 3;

export function createWinter(): WinterWindowState {
  return { open: false, roundsRemaining: 0 };
}

/** Adott fordulónál kell-e nyitni / zárni? */
export function updateWinterWindow(prev: WinterWindowState, justPlayedRound: number): WinterWindowState {
  if (justPlayedRound === WINTER_OPEN_ROUND) {
    return { open: true, roundsRemaining: WINTER_DURATION };
  }
  if (prev.open) {
    const r = prev.roundsRemaining - 1;
    return r <= 0 ? { open: false, roundsRemaining: 0 } : { open: true, roundsRemaining: r };
  }
  return prev;
}

export type WinterTransfer = {
  playerName: string;
  fromTeamId: string;
  toTeamId: string;
  amount: number;
};

/** Egy fordulónyi AI↔AI csere a téli ablakban. User csapata érintetlen. */
export function simulateAITransfers(userTeamId: string, seed: number): WinterTransfer[] {
  const eligibleTeams = TEAMS.filter((t) => t.id !== userTeamId);
  const out: WinterTransfer[] = [];
  // Determinisztikus RNG az adott fordulóhoz
  let s = seed >>> 0 || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  const swaps = 2 + Math.floor(rand() * 3); // 2..4
  for (let i = 0; i < swaps; i++) {
    const seller = eligibleTeams[Math.floor(rand() * eligibleTeams.length)];
    if (!seller || seller.squad.length <= 16) continue;
    // Eladandó: rating szerint súlyozva (jobbak ritkábban)
    const weights = seller.squad.map((p) => Math.max(1, 80 - p.rating + 5));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    let pickIdx = 0;
    for (let j = 0; j < seller.squad.length; j++) {
      r -= weights[j];
      if (r <= 0) { pickIdx = j; break; }
    }
    const player = seller.squad[pickIdx];
    // Vásárló: másik csapat, közeli erejű (±15 rating)
    const buyerCandidates = eligibleTeams.filter(
      (t) => t.id !== seller.id && t.squad.length < 26,
    );
    if (buyerCandidates.length === 0) continue;
    const buyer = buyerCandidates[Math.floor(rand() * buyerCandidates.length)];
    if (!buyer) continue;
    // Ár: rating + kor függvénye
    const ageFactor = player.age < 23 ? 1.5 : player.age > 30 ? 0.55 : 1.0;
    const amount = Math.max(3, Math.round(((player.rating - 54) ** 1.5) * ageFactor * 0.85));

    // Mutáció: játékos átkerül
    seller.squad.splice(pickIdx, 1);
    buyer.squad.push(player);
    out.push({
      playerName: player.name,
      fromTeamId: seller.id,
      toTeamId: buyer.id,
      amount,
    });
  }
  return out;
}
