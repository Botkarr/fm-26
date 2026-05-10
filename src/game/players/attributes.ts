/* ============================================================
 * FM-szerű attribútum rendszer
 * 35 attribútum: 14 technikai + 14 mentális + 7 fizikai
 * Skála 1-20 (FM standard).
 * ============================================================ */

export type Pos = "GK" | "DF" | "MF" | "FW";
export type Foot = "left" | "right" | "both";

export type PersonalityTrait =
  | "professional"      // Profi
  | "ambitious"         // Becsvágyó
  | "leader"            // Vezéregyéniség
  | "team_player"       // Csapatjátékos
  | "model_citizen"     // Példakép
  | "fairly_loyal"      // Hűséges
  | "temperamental"     // Lobbanékony
  | "casual"            // Lazább
  | "low_self_esteem"   // Önbizalomhiányos
  | "perfectionist"     // Perfekcionista
  | "balanced";         // Kiegyensúlyozott

export const PERSONALITY_LABEL: Record<PersonalityTrait, string> = {
  professional: "Profi",
  ambitious: "Becsvágyó",
  leader: "Vezéregyéniség",
  team_player: "Csapatjátékos",
  model_citizen: "Példakép",
  fairly_loyal: "Hűséges",
  temperamental: "Lobbanékony",
  casual: "Lazább",
  low_self_esteem: "Önbizalomhiányos",
  perfectionist: "Perfekcionista",
  balanced: "Kiegyensúlyozott",
};

/** 14 technikai attribútum (FM klasszikus). */
export type TechnicalAttrs = {
  corners: number;
  crossing: number;
  dribbling: number;
  finishing: number;
  firstTouch: number;
  freeKicks: number;
  heading: number;
  longShots: number;
  longThrows: number;
  marking: number;
  passing: number;
  penaltyTaking: number;
  tackling: number;
  technique: number;
};

/** 14 mentális attribútum. */
export type MentalAttrs = {
  aggression: number;
  anticipation: number;
  bravery: number;
  composure: number;
  concentration: number;
  decisions: number;
  determination: number;
  flair: number;
  leadership: number;
  offTheBall: number;
  positioning: number;
  teamwork: number;
  vision: number;
  workRate: number;
};

/** 7 fizikai attribútum. */
export type PhysicalAttrs = {
  acceleration: number;
  agility: number;
  balance: number;
  jumping: number;
  naturalFitness: number;
  pace: number;
  stamina: number;
  strength: number;
};

/** Kapus-specifikus attribútumok (külön szettben FM-mintára). */
export type GoalkeeperAttrs = {
  aerialReach: number;
  commandOfArea: number;
  communication: number;
  eccentricity: number;
  handling: number;
  kicking: number;
  oneOnOnes: number;
  reflexes: number;
  rushingOut: number;
  throwing: number;
};

export type Attributes = TechnicalAttrs & MentalAttrs & PhysicalAttrs & Partial<GoalkeeperAttrs>;

/** Pozíció-alkalmasság 1-20 skálán minden szerepre. */
export type PositionAptitude = {
  GK: number;
  DC: number;  // belső védő
  DL: number;  // bal hátvéd
  DR: number;  // jobb hátvéd
  DM: number;  // védekező közép
  MC: number;  // belső közép
  ML: number;  // bal szélső közép
  MR: number;  // jobb szélső közép
  AMC: number; // támadó közép
  AML: number; // bal szélső támadó
  AMR: number; // jobb szélső támadó
  ST: number;  // csatár
};

/** A részletes játékos-rekord (FM-szerű). */
export type PlayerProfile = {
  /** A kompozit rating (50-92), amit a régi engine használ. Származtatott. */
  rating: number;
  name: string;
  pos: Pos;
  age: number;
  /** Születési ország ISO-2 kód. */
  nationality: string;
  height: number; // cm
  weight: number; // kg
  foot: Foot;
  personality: PersonalityTrait;
  /** Mez-szám (opcionális). */
  number?: number;
  /** Piaci érték millió Ft-ban (származtatott). */
  value: number;
  attrs: Attributes;
  aptitude: PositionAptitude;
};

/* ===================== KOMPOZIT RATING SZÁMÍTÁS ===================== */

/** Pozíciónkénti súlyozás: melyik attribútum mennyit számít. */
const WEIGHTS: Record<Pos, Partial<Record<keyof Attributes, number>>> = {
  GK: {
    reflexes: 3, handling: 3, oneOnOnes: 2.5, aerialReach: 2, commandOfArea: 2,
    positioning: 2, anticipation: 2, concentration: 2, agility: 2, jumping: 1.5,
    kicking: 1.5, communication: 1.5,
  },
  DF: {
    tackling: 3, marking: 3, heading: 2.5, positioning: 2.5, strength: 2,
    jumping: 2, anticipation: 2, bravery: 2, concentration: 2, pace: 1.5,
    composure: 1.5, decisions: 1.5, passing: 1, workRate: 1,
  },
  MF: {
    passing: 3, vision: 2.5, technique: 2.5, decisions: 2.5, workRate: 2,
    stamina: 2, firstTouch: 2, dribbling: 1.5, longShots: 1.5, anticipation: 1.5,
    teamwork: 1.5, composure: 1.2, tackling: 1, offTheBall: 1.2,
  },
  FW: {
    finishing: 3.5, dribbling: 2.5, pace: 2.5, acceleration: 2.2, technique: 2,
    firstTouch: 2, composure: 2, offTheBall: 2, anticipation: 1.8, heading: 1.5,
    longShots: 1.5, flair: 1.2, agility: 1.2, balance: 1,
  },
};

/**
 * Kompozit rating számítás 50..92 skálára.
 * A pozícióhoz tartozó súlyozott átlagból + személyiség/leadership bónusz.
 */
export function computeRating(attrs: Attributes, pos: Pos): number {
  const weights = WEIGHTS[pos];
  let sum = 0;
  let totalW = 0;
  for (const [k, w] of Object.entries(weights) as [keyof Attributes, number][]) {
    const v = attrs[k];
    if (typeof v !== "number") continue;
    sum += v * w;
    totalW += w;
  }
  const avg = totalW > 0 ? sum / totalW : 10; // 1..20
  // Térkép 1..20 → 50..92
  const rating = 50 + ((avg - 1) / 19) * 42;
  return Math.max(50, Math.min(92, Math.round(rating)));
}

/** Piaci érték millió Ft-ban — rating + kor függvénye. */
export function computeValue(rating: number, age: number): number {
  const ageFactor = age < 21 ? 1.8 : age < 25 ? 1.4 : age < 29 ? 1.0 : age < 32 ? 0.65 : 0.35;
  const base = Math.max(2, Math.round(((rating - 55) ** 1.55) * ageFactor));
  return base;
}

/** Pozíció-alkalmasság automatikus számítása az attribútumokból. */
export function deriveAptitude(attrs: Attributes, primary: Pos): PositionAptitude {
  // Természetes (15-20), megfelelő (12-14), nem ideális (5-10) skála.
  const apt: PositionAptitude = {
    GK: 1, DC: 1, DL: 1, DR: 1, DM: 1, MC: 1, ML: 1, MR: 1, AMC: 1, AML: 1, AMR: 1, ST: 1,
  };
  if (primary === "GK") {
    apt.GK = 20;
    return apt;
  }
  if (primary === "DF") {
    apt.DC = 18;
    apt.DL = Math.min(18, 8 + Math.round(attrs.pace / 3));
    apt.DR = Math.min(18, 8 + Math.round(attrs.pace / 3));
    apt.DM = Math.min(15, 6 + Math.round(attrs.passing / 4));
  }
  if (primary === "MF") {
    apt.MC = 18;
    apt.DM = Math.min(17, 10 + Math.round(attrs.tackling / 4));
    apt.AMC = Math.min(17, 8 + Math.round(attrs.vision / 4));
    apt.ML = Math.min(15, 6 + Math.round(attrs.crossing / 4));
    apt.MR = Math.min(15, 6 + Math.round(attrs.crossing / 4));
  }
  if (primary === "FW") {
    apt.ST = 19;
    apt.AMC = Math.min(15, 8 + Math.round(attrs.passing / 4));
    apt.AML = Math.min(17, 8 + Math.round(attrs.dribbling / 4));
    apt.AMR = Math.min(17, 8 + Math.round(attrs.dribbling / 4));
  }
  return apt;
}

/* ===================== UI SEGÉDEK ===================== */

/** Attribútum szín FM-stílusban (1-20 → színkód). */
export function attrColor(v: number): string {
  if (v >= 16) return "text-green-400";
  if (v >= 13) return "text-yellow-400";
  if (v >= 10) return "text-orange-400";
  if (v >= 7) return "text-red-400";
  return "text-red-600";
}

export const TECHNICAL_LABELS: Record<keyof TechnicalAttrs, string> = {
  corners: "Szöglet",
  crossing: "Beadás",
  dribbling: "Csel",
  finishing: "Befejezés",
  firstTouch: "Első érintés",
  freeKicks: "Szabadrúgás",
  heading: "Fejjáték",
  longShots: "Lövés (táv)",
  longThrows: "Bedobás",
  marking: "Fogás",
  passing: "Passz",
  penaltyTaking: "11-es",
  tackling: "Szerelés",
  technique: "Technika",
};

export const MENTAL_LABELS: Record<keyof MentalAttrs, string> = {
  aggression: "Agresszivitás",
  anticipation: "Előrelátás",
  bravery: "Bátorság",
  composure: "Higgadtság",
  concentration: "Koncentráció",
  decisions: "Döntéshozatal",
  determination: "Eltökéltség",
  flair: "Kreativitás",
  leadership: "Vezetés",
  offTheBall: "Labda nélkül",
  positioning: "Helyezkedés",
  teamwork: "Csapatmunka",
  vision: "Játékszem",
  workRate: "Munkabírás",
};

export const PHYSICAL_LABELS: Record<keyof PhysicalAttrs, string> = {
  acceleration: "Gyorsulás",
  agility: "Mozgékonyság",
  balance: "Egyensúly",
  jumping: "Fejelő-erő",
  naturalFitness: "Erőnlét",
  pace: "Sebesség",
  stamina: "Állóképesség",
  strength: "Erő",
};

export const GK_LABELS: Record<keyof GoalkeeperAttrs, string> = {
  aerialReach: "Magas labda",
  commandOfArea: "16-os ura",
  communication: "Kommunikáció",
  eccentricity: "Extravagancia",
  handling: "Labdafogás",
  kicking: "Kirúgás",
  oneOnOnes: "1v1",
  reflexes: "Reflex",
  rushingOut: "Kifutás",
  throwing: "Kidobás",
};
