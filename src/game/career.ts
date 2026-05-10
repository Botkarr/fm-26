import { TEAMS, getTeam, type Player } from "./data";
import { createYouth, type YouthState } from "./youth";
import { createWinter, type WinterWindowState } from "./winter";

/* ============================================================
 * Career — átigazolás, sajtó, öltöző, edzésfókusz, szerződések
 * Közepes mélység: 1 lépéses döntések, érthető hatások.
 * ============================================================ */

export type TrainingFocus = "none" | "attack" | "defense" | "fitness" | "technique";
export const TRAINING_FOCUS_LABEL: Record<TrainingFocus, string> = {
  none: "Nincs egyéni",
  attack: "Támadás",
  defense: "Védekezés",
  fitness: "Erőnlét",
  technique: "Technika",
};

/** Játékos szezon közbeni karrier-állapota. */
export type CareerPlayer = {
  /** Egyedi azonosító (csapatId + index). */
  id: string;
  contractYears: number;       // hány szezonja van még
  trainingFocus: TrainingFocus;
  /** Egyéni edzés súlya 0..1 (mennyit tolt rajta a felhasználó szezononként). */
  developed: number;
};

export type PressTone = "motivational" | "neutral" | "provocative";
export const PRESS_LABEL: Record<PressTone, string> = {
  motivational: "Motiváló",
  neutral: "Semleges",
  provocative: "Provokatív",
};

export type DressingRoomTone = "encourage" | "calm" | "angry";
export const DR_LABEL: Record<DressingRoomTone, string> = {
  encourage: "Bátorítás",
  calm: "Higgadt elemzés",
  angry: "Kemény szavak",
};

/** A user csapatának karrierállapota. */
export type CareerState = {
  /** Pénzügyi keret (millió Ft). */
  budget: number;
  /** Egyéni j. fókuszok / szerződéshosszok a USER csapatban — kulcs a játékos név. */
  players: Record<string, CareerPlayer>;
  /** Aktuális szezon szabad piacán elérhető játékosok. */
  market: MarketPlayer[];
  /** Utolsó sajtónyilatkozat (melyik fordulóra). */
  lastPress?: { round: number; tone: PressTone };
  /** Utolsó öltöző-beszéd (melyik fordulóra). */
  lastDressing?: { round: number; tone: DressingRoomTone };
  /** Beérkező átigazolási ajánlatok a user játékosaira. */
  offers: TransferOffer[];
  /** Saját klub akadémiája (U19 keret + fejlődés). */
  youth: YouthState;
  /** Téli átigazolási ablak állapota. */
  winter: WinterWindowState;
};

/** Beérkező ajánlat egy user játékosra egy AI klubtól. */
export type TransferOffer = {
  id: string;
  /** A megcélzott user játékos neve. */
  playerName: string;
  /** Ajánlattevő csapat ID-je. */
  fromTeamId: string;
  /** Ajánlott összeg millió Ft-ban. */
  amount: number;
  /** Hányadik fordulóban érkezett. */
  round: number;
  /** Lejár ennyi forduló után (round + expiresIn-ig elfogadható). */
  expiresIn: number;
};

export type MarketPlayer = {
  id: string;
  name: string;
  pos: Player["pos"];
  rating: number;
  age: number;
  /** Kért átigazolási díj millió Ft. */
  price: number;
};

const FIRST_NAMES = [
  "Kristóf", "Botond", "Olivér", "Zalán", "Hunor", "Áron", "Csaba",
  "Benedek", "Gellért", "Vince", "Kornél", "Bence", "Marcell",
];
const LAST_NAMES = [
  "Kerekes", "Szücs", "Pintér", "Borbély", "Bíró", "Halász",
  "Bognár", "Veres", "Antal", "Gulyás", "Madár", "Sipos",
];

let mpIdCounter = 1;
function makeMarketPlayer(seed: number, baseRating: number): MarketPlayer {
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  const r2 = ((seed * 13 + 7) % 100) / 100;
  const positions: Player["pos"][] = ["GK", "DF", "DF", "MF", "MF", "MF", "FW", "FW"];
  const pos = positions[Math.floor(r * positions.length)];
  const rating = Math.max(50, Math.min(88, Math.round(baseRating + (r2 - 0.5) * 12)));
  const age = Math.round(17 + r * 16);
  const fn = FIRST_NAMES[Math.floor(r2 * FIRST_NAMES.length)];
  const ln = LAST_NAMES[Math.floor(r * LAST_NAMES.length)];
  // Ár: rating-érzékeny, fiatalok prémium
  const ageFactor = age < 23 ? 1.4 : age > 30 ? 0.7 : 1.0;
  const price = Math.max(5, Math.round(((rating - 55) ** 1.6) * ageFactor));
  return { id: `mp-${mpIdCounter++}`, name: `${ln} ${fn}`, pos, rating, age, price };
}

/** Generál ~12 piaci játékost; baseRating a user csapat átlaga. */
export function generateMarket(baseRating: number, seed: number): MarketPlayer[] {
  const out: MarketPlayer[] = [];
  for (let i = 0; i < 12; i++) {
    out.push(makeMarketPlayer(seed + i * 17, baseRating));
  }
  return out.sort((a, b) => b.rating - a.rating);
}

/** Egy csapat átlagos rating-je. */
export function teamAvg(teamId: string): number {
  const t = getTeam(teamId);
  if (!t) return 65;
  return t.squad.reduce((s, p) => s + p.rating, 0) / t.squad.length;
}

/** Új career init új szezon kezdéskor. */
export function createCareer(userTeamId: string): CareerState {
  const team = getTeam(userTeamId)!;
  const players: Record<string, CareerPlayer> = {};
  team.squad.forEach((p, i) => {
    players[p.name] = {
      id: `${userTeamId}-${i}`,
      contractYears: 1 + Math.floor(((i * 7) % 4)),
      trainingFocus: "none",
      developed: 0,
    };
  });
  // Kezdő költségvetés: NB I 250M, NB II 80M
  const budget = team.defaultDivision === "NB1" ? 250 : 80;
  return {
    budget,
    players,
    market: generateMarket(teamAvg(userTeamId), userTeamId.charCodeAt(0) * 31 + 1),
    offers: [],
    youth: createYouth(userTeamId),
    winter: createWinter(),
  };
}

/** Új szezonra: leveszi a contractYears-t, frissíti a piacot, elveszi a fizetéseket. */
export function rolloverCareer(prev: CareerState, userTeamId: string): {
  career: CareerState;
  expired: string[]; // távozott játékosok nevei
} {
  const team = getTeam(userTeamId)!;
  const expired: string[] = [];
  const players: Record<string, CareerPlayer> = {};
  for (const p of team.squad) {
    const cp = prev.players[p.name];
    if (!cp) continue;
    const left = cp.contractYears - 1;
    if (left <= 0) {
      expired.push(p.name);
    } else {
      players[p.name] = { ...cp, contractYears: left, trainingFocus: "none", developed: 0 };
    }
  }
  // Fizetések: keret-méret * 5M Ft / szezon
  const wages = team.squad.length * 5;
  // Bevétel: NB I helyezéstől függő — itt egyszerűen +120M / szezon NB I, +50M NB II
  const income = team.defaultDivision === "NB1" ? 120 : 50;
  const budget = Math.max(0, prev.budget + income - wages);
  return {
    career: {
      ...prev,
      budget,
      players,
      market: generateMarket(teamAvg(userTeamId), Date.now() % 100000),
      offers: [],
      youth: prev.youth ?? createYouth(userTeamId),
      winter: createWinter(),
    },
    expired,
  };
}

/* ===================== BEÉRKEZŐ AJÁNLATOK ===================== */

let offerIdCounter = 1;

function offerPriceFor(p: Player): number {
  const ageFactor = p.age < 23 ? 1.6 : p.age > 30 ? 0.55 : 1.0;
  const base = Math.max(4, Math.round(((p.rating - 54) ** 1.55) * ageFactor));
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.max(3, Math.round(base * jitter));
}

/** Forduló után esetlegesen generál 0-2 új ajánlatot a user játékosaira. */
export function maybeGenerateOffers(
  career: CareerState,
  userTeamId: string,
  round: number,
): TransferOffer[] {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return [];
  const otherTeams = TEAMS.filter((t) => t.id !== userTeamId);
  const newOffers: TransferOffer[] = [];

  for (let i = 0; i < 2; i++) {
    if (Math.random() > 0.28) continue;
    const eligible = team.squad.filter(
      (p) => !career.offers.some((o) => o.playerName === p.name) &&
             !newOffers.some((o) => o.playerName === p.name),
    );
    if (eligible.length === 0) break;
    if (team.squad.length <= 14) break;
    const weights = eligible.map((p) => Math.max(1, (p.rating - 60) ** 1.4));
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let pick = eligible[0];
    for (let j = 0; j < eligible.length; j++) {
      r -= weights[j];
      if (r <= 0) { pick = eligible[j]; break; }
    }
    const buyer = otherTeams[Math.floor(Math.random() * otherTeams.length)];
    const amount = offerPriceFor(pick);
    newOffers.push({
      id: `offer-${offerIdCounter++}-${round}`,
      playerName: pick.name,
      fromTeamId: buyer.id,
      amount,
      round,
      expiresIn: 3,
    });
  }
  return newOffers;
}

/** Lejárt ajánlatok kiszűrése. */
export function expireOffers(career: CareerState, round: number): CareerState {
  const offers = (career.offers ?? []).filter((o) => round - o.round < o.expiresIn);
  if (offers.length === (career.offers?.length ?? 0)) return career;
  return { ...career, offers };
}

/** Ajánlat elfogadása. */
export function acceptOffer(career: CareerState, userTeamId: string, offerId: string): { career: CareerState; amount: number; playerName: string } | null {
  const offer = career.offers.find((o) => o.id === offerId);
  if (!offer) return null;
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  const idx = team.squad.findIndex((p) => p.name === offer.playerName);
  if (idx < 0) return null;
  if (team.squad.length <= 14) return null;
  team.squad.splice(idx, 1);
  const players = { ...career.players };
  delete players[offer.playerName];
  const offers = career.offers.filter((o) => o.playerName !== offer.playerName);
  return {
    career: { ...career, budget: career.budget + offer.amount, players, offers },
    amount: offer.amount,
    playerName: offer.playerName,
  };
}

/** Ajánlat elutasítása. */
export function rejectOffer(career: CareerState, offerId: string): CareerState {
  const offers = career.offers.filter((o) => o.id !== offerId);
  return { ...career, offers };
}

/* ===================== SAJTÓ ===================== */

export type PressEffect = { moraleDelta: number; attackBonus: number };

export function pressEffect(tone: PressTone): PressEffect {
  switch (tone) {
    case "motivational": return { moraleDelta: +4, attackBonus: 0.05 };
    case "neutral":      return { moraleDelta: +1, attackBonus: 0.0 };
    case "provocative":  return { moraleDelta: -2, attackBonus: 0.12 };
  }
}

export const PRESS_QUESTIONS = [
  "Hogyan készültek a következő mérkőzésre?",
  "Esélyesek vagytok? Vagy az ellenfél?",
  "Mit gondol a játékosaitól ezen a héten?",
];

export function pressOption(question: string, tone: PressTone): string {
  const map: Record<PressTone, string[]> = {
    motivational: [
      "A srácok keményen készültek, hiszek bennük.",
      "Mi vagyunk az esélyesek — bárkit meg tudunk verni.",
      "Maximális elkötelezettséget láttam, büszke vagyok rájuk.",
    ],
    neutral: [
      "Felkészültünk, meglátjuk mit hoz a mérkőzés.",
      "Nehéz meccs lesz mindkét oldalnak.",
      "A szokásos rutin szerint dolgoztunk.",
    ],
    provocative: [
      "Megmutatjuk nekik, hol a helyük a tabellán.",
      "Legyenek óvatosak — szétkapjuk őket.",
      "Csalódást kell okozniuk, hogy ne nyerjünk.",
    ],
  };
  void question;
  return map[tone][Math.floor(Math.random() * 3)];
}

/* ===================== ÖLTÖZŐ ===================== */

export function dressingRoomEffect(tone: DressingRoomTone, halfScoreDiff: number): { moraleDelta: number; secondHalfBonus: number } {
  // halfScoreDiff: pozitív = vezetünk, negatív = vesztésre állunk
  if (tone === "encourage") {
    return { moraleDelta: +3, secondHalfBonus: halfScoreDiff < 0 ? 0.18 : 0.06 };
  }
  if (tone === "calm") {
    return { moraleDelta: +1, secondHalfBonus: 0.08 };
  }
  // angry
  return { moraleDelta: halfScoreDiff < 0 ? +2 : -3, secondHalfBonus: halfScoreDiff < 0 ? 0.22 : -0.05 };
}

/* ===================== EDZÉSFÓKUSZ / FEJLŐDÉS ===================== */

/**
 * Szezon végén alkalmazandó: minden user játékosra a fókusz alapján rating módosítás.
 * Hatás kicsi (+1..+3 / szezon), kor- és életkorfüggő.
 * Mutálja a TEAMS.squad-ot — friss kezdés esetén OK, mentésben elhasznált.
 */
export function applyTrainingDevelopment(career: CareerState, userTeamId: string): { changes: { name: string; from: number; to: number }[] } {
  const team = TEAMS.find((t) => t.id === userTeamId);
  const changes: { name: string; from: number; to: number }[] = [];
  if (!team) return { changes };
  for (const p of team.squad) {
    const cp = career.players[p.name];
    if (!cp || cp.trainingFocus === "none") continue;
    // fiatal +2..+3, érett +1..+2, idős 0..+1
    const youthBonus = p.age < 23 ? 1.5 : p.age > 30 ? -0.5 : 0;
    const base = 1 + Math.random() * 1.2 + youthBonus;
    const delta = Math.max(0, Math.round(base));
    if (delta === 0) continue;
    const from = p.rating;
    const to = Math.min(92, p.rating + delta);
    p.rating = to;
    changes.push({ name: p.name, from, to });
  }
  return { changes };
}

/* ===================== ÁTIGAZOLÁS ===================== */

/** Eladás: játékos eltűnik a TEAMS-ből, pénz hozzáadódik. */
export function sellPlayer(career: CareerState, userTeamId: string, playerName: string): { career: CareerState; price: number } | null {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  const idx = team.squad.findIndex((p) => p.name === playerName);
  if (idx < 0) return null;
  if (team.squad.length <= 14) return null; // ne maradj 14 alatt
  const p = team.squad[idx];
  const ageFactor = p.age < 23 ? 1.4 : p.age > 30 ? 0.6 : 1.0;
  const price = Math.max(3, Math.round(((p.rating - 55) ** 1.5) * ageFactor * 0.8));
  team.squad.splice(idx, 1);
  const players = { ...career.players };
  delete players[playerName];
  return { career: { ...career, budget: career.budget + price, players }, price };
}

/** Vétel: marketből vesz; pénz levonódik, játékos beépül. */
export function buyPlayer(career: CareerState, userTeamId: string, marketId: string): { career: CareerState; player: Player } | null {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  const mp = career.market.find((m) => m.id === marketId);
  if (!mp) return null;
  if (career.budget < mp.price) return null;
  if (team.squad.length >= 24) return null;
  const newPlayer: Player = { name: mp.name, pos: mp.pos, rating: mp.rating, age: mp.age };
  team.squad.push(newPlayer);
  const players = { ...career.players, [mp.name]: {
    id: `${userTeamId}-${team.squad.length - 1}`,
    contractYears: 3,
    trainingFocus: "none" as const,
    developed: 0,
  }};
  const market = career.market.filter((m) => m.id !== marketId);
  return {
    career: { ...career, budget: career.budget - mp.price, players, market },
    player: newPlayer,
  };
}

/** Egyéni edzésfókusz beállítása. */
export function setTrainingFocus(career: CareerState, playerName: string, focus: TrainingFocus): CareerState {
  const cp = career.players[playerName];
  if (!cp) return career;
  return {
    ...career,
    players: { ...career.players, [playerName]: { ...cp, trainingFocus: focus } },
  };
}

/** Szerződés-hosszabbítás: pénzbe kerül (rating × 2). */
export function extendContract(career: CareerState, userTeamId: string, playerName: string, years: number): { career: CareerState; cost: number } | null {
  const team = TEAMS.find((t) => t.id === userTeamId);
  if (!team) return null;
  const p = team.squad.find((pl) => pl.name === playerName);
  if (!p) return null;
  const cp = career.players[playerName];
  if (!cp) return null;
  const cost = Math.round(p.rating * 2 * years * 0.6);
  if (career.budget < cost) return null;
  return {
    career: {
      ...career,
      budget: career.budget - cost,
      players: { ...career.players, [playerName]: { ...cp, contractYears: cp.contractYears + years } },
    },
    cost,
  };
}
