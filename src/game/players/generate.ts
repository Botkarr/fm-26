import {
  Attributes, PlayerProfile, Pos, Foot, PersonalityTrait,
  computeRating, computeValue, deriveAptitude,
} from "./attributes";

/* ============================================================
 * Játékos generátor — reális FM-szerű profilok.
 * Pozíciónként más-más attribútum-eloszlás.
 * Kor és tehetség (potential ability) befolyásolja az értékeket.
 * ============================================================ */

const FIRST_NAMES_HU = [
  "Bence", "Ádám", "Dániel", "Márk", "Máté", "Levente", "Zsolt", "Gergő",
  "Tamás", "Dávid", "Krisztián", "Roland", "Patrik", "Bálint", "Norbert",
  "Attila", "Péter", "László", "István", "Gábor", "Sándor", "József",
  "Botond", "Hunor", "Áron", "Csaba", "Benedek", "Vince", "Kornél", "Marcell",
  "Olivér", "Zalán", "Kristóf", "Ferenc", "Mihály", "János", "Balázs",
];
const LAST_NAMES_HU = [
  "Nagy", "Kovács", "Tóth", "Szabó", "Horváth", "Varga", "Kiss", "Molnár",
  "Németh", "Farkas", "Balogh", "Papp", "Takács", "Juhász", "Lakatos",
  "Mészáros", "Oláh", "Simon", "Rácz", "Fekete", "Szilágyi", "Török",
  "Fehér", "Szűcs", "Pintér", "Borbély", "Bíró", "Halász", "Bognár", "Veres",
  "Antal", "Gulyás", "Sipos", "Bárány", "Hegedűs", "Bodnár", "Lukács",
];

const FOREIGN_FIRST = ["Marko", "Aleksandar", "Stefan", "Igor", "Pedro", "Carlos", "Kevin", "Adama", "Ibrahim", "Yannick", "Ousmane", "Diego", "Eric"];
const FOREIGN_LAST  = ["Petković", "Marković", "Ivanović", "Silva", "Souza", "Owusu", "Diallo", "Traoré", "Costa", "Ramos", "Eze", "Boateng"];

const NATIONALITIES_PRIMARY = ["HU"];
const NATIONALITIES_FOREIGN = ["RS", "HR", "SK", "RO", "BR", "NG", "GH", "CI", "SN", "ES", "PT", "AR"];

function pick<T>(arr: T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

function clamp(v: number, lo = 1, hi = 20): number {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

/** Determinisztikus PRNG (LCG) seed alapján. */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Egy attribútum értéke pozíció+szerep szerint.
 * @param ca current ability 30..200 (FM standard) — leskálázzuk 1..20-ra
 * @param weight 0..1 — mennyire fontos ez az attribútum a pozícióhoz
 */
function attrValue(ca: number, weight: number, r: () => number): number {
  // ca-ból bázis 1..20: ca/200 * 20 → max 20
  const base = (ca / 200) * 20;
  // weight: fontos attribútumok közelebb a base-hez, lényegtelenek alacsonyabbak
  const target = base * (0.55 + 0.55 * weight);
  // ±2 zaj
  const noise = (r() - 0.5) * 4;
  return clamp(target + noise);
}

/** Pozíció-súlyok minden attribútumra (0..1). */
const ATTR_WEIGHTS: Record<Pos, Partial<Record<keyof Attributes, number>>> = {
  GK: {
    reflexes: 1.0, handling: 1.0, oneOnOnes: 0.95, aerialReach: 0.85, commandOfArea: 0.85,
    communication: 0.75, kicking: 0.75, throwing: 0.7, rushingOut: 0.7,
    positioning: 0.85, anticipation: 0.85, concentration: 0.85, agility: 0.9, jumping: 0.75,
    bravery: 0.7, composure: 0.75, decisions: 0.75,
    // gyenge pontok
    finishing: 0.05, dribbling: 0.05, crossing: 0.05, tackling: 0.1, marking: 0.15,
    pace: 0.4, acceleration: 0.4, stamina: 0.4, strength: 0.6,
  },
  DF: {
    tackling: 1.0, marking: 1.0, heading: 0.9, positioning: 0.9, strength: 0.85,
    jumping: 0.8, anticipation: 0.85, bravery: 0.85, concentration: 0.8, aggression: 0.7,
    composure: 0.7, decisions: 0.75, passing: 0.55, workRate: 0.7, pace: 0.7,
    acceleration: 0.65, stamina: 0.7, agility: 0.6, balance: 0.6,
    firstTouch: 0.5, technique: 0.45, longShots: 0.25, finishing: 0.2, crossing: 0.4,
    dribbling: 0.3, vision: 0.45, leadership: 0.6, teamwork: 0.7,
  },
  MF: {
    passing: 1.0, vision: 0.9, technique: 0.9, decisions: 0.9, workRate: 0.85,
    stamina: 0.85, firstTouch: 0.8, dribbling: 0.7, longShots: 0.7, anticipation: 0.7,
    teamwork: 0.75, composure: 0.7, tackling: 0.55, offTheBall: 0.7, flair: 0.6,
    pace: 0.6, acceleration: 0.6, agility: 0.65, balance: 0.65, strength: 0.55,
    finishing: 0.5, crossing: 0.6, heading: 0.4, marking: 0.4, positioning: 0.6,
    concentration: 0.7, bravery: 0.6, leadership: 0.5,
  },
  FW: {
    finishing: 1.0, dribbling: 0.9, pace: 0.9, acceleration: 0.85, technique: 0.8,
    firstTouch: 0.85, composure: 0.8, offTheBall: 0.85, anticipation: 0.75, heading: 0.65,
    longShots: 0.7, flair: 0.7, agility: 0.7, balance: 0.65, strength: 0.6,
    stamina: 0.6, decisions: 0.7, bravery: 0.65, concentration: 0.6,
    passing: 0.6, vision: 0.55, crossing: 0.5, freeKicks: 0.55, penaltyTaking: 0.7,
    tackling: 0.15, marking: 0.15, positioning: 0.4, workRate: 0.6, teamwork: 0.55,
  },
};

const PERSONALITIES: PersonalityTrait[] = [
  "professional", "ambitious", "leader", "team_player", "model_citizen",
  "fairly_loyal", "temperamental", "casual", "low_self_esteem", "perfectionist", "balanced",
];

export type GenerateOpts = {
  pos: Pos;
  /** Current ability 50..180 — milyen jó MOST. */
  ca?: number;
  age?: number;
  /** Magyar (true) vagy külföldi név (false). */
  hungarian?: boolean;
  name?: string;
  number?: number;
};

/**
 * Generál egy teljes FM-szerű játékos-profilt.
 * A `ca` (current ability) határozza meg az általános erősséget;
 * a `pos` befolyásolja, hogy melyik attribútum erős/gyenge.
 */
export function generatePlayer(seed: number, opts: GenerateOpts): PlayerProfile {
  const r = makeRng(seed);
  const ca = opts.ca ?? 80 + Math.floor(r() * 80);
  const age = opts.age ?? 18 + Math.floor(r() * 18);
  const hungarian = opts.hungarian ?? r() < 0.75;

  const fn = opts.name ? null : pick(hungarian ? FIRST_NAMES_HU : FOREIGN_FIRST, r);
  const ln = opts.name ? null : pick(hungarian ? LAST_NAMES_HU : FOREIGN_LAST, r);
  const name = opts.name ?? `${ln} ${fn}`;
  const nationality = opts.name
    ? "HU"
    : (hungarian ? NATIONALITIES_PRIMARY[0] : pick(NATIONALITIES_FOREIGN, r));

  const weights = ATTR_WEIGHTS[opts.pos];
  const allKeys: (keyof Attributes)[] = [
    "corners","crossing","dribbling","finishing","firstTouch","freeKicks","heading",
    "longShots","longThrows","marking","passing","penaltyTaking","tackling","technique",
    "aggression","anticipation","bravery","composure","concentration","decisions",
    "determination","flair","leadership","offTheBall","positioning","teamwork","vision","workRate",
    "acceleration","agility","balance","jumping","naturalFitness","pace","stamina","strength",
  ];
  const attrs: Attributes = {} as Attributes;
  for (const k of allKeys) {
    const w = weights[k] ?? 0.3;
    attrs[k] = attrValue(ca, w, r);
  }
  // Kapus extra
  if (opts.pos === "GK") {
    const gkKeys: (keyof Attributes)[] = [
      "aerialReach","commandOfArea","communication","eccentricity",
      "handling","kicking","oneOnOnes","reflexes","rushingOut","throwing",
    ];
    for (const k of gkKeys) {
      const w = weights[k] ?? 0.5;
      attrs[k] = attrValue(ca, w, r);
    }
  }

  const rating = computeRating(attrs, opts.pos);
  const value = computeValue(rating, age);
  const aptitude = deriveAptitude(attrs, opts.pos);
  const personality = pick(PERSONALITIES, r);
  const foot: Foot = r() < 0.7 ? "right" : r() < 0.93 ? "left" : "both";
  const height = opts.pos === "GK"
    ? 185 + Math.floor(r() * 12)
    : opts.pos === "DF"
      ? 180 + Math.floor(r() * 12)
      : opts.pos === "MF"
        ? 172 + Math.floor(r() * 14)
        : 175 + Math.floor(r() * 14);
  const weight = Math.round(height * 0.42 + r() * 8);

  return {
    rating, name, pos: opts.pos, age, nationality,
    height, weight, foot, personality, value,
    number: opts.number,
    attrs, aptitude,
  };
}

/** Egy teljes csapatkeret generálása. */
export function generateSquad(seed: number, baseCA: number, opts?: { hungarianRatio?: number }): PlayerProfile[] {
  const r = makeRng(seed);
  const hungarianRatio = opts?.hungarianRatio ?? 0.78;
  const positions: Pos[] = [
    "GK", "GK", "GK",
    "DF", "DF", "DF", "DF", "DF", "DF", "DF",
    "MF", "MF", "MF", "MF", "MF", "MF", "MF", "MF",
    "FW", "FW", "FW", "FW", "FW",
  ];
  let num = 1;
  return positions.map((pos, i) => {
    const variance = (r() - 0.5) * 50;
    const ca = Math.max(40, Math.min(190, Math.round(baseCA + variance)));
    const age = pos === "GK"
      ? 22 + Math.floor(r() * 14)
      : 17 + Math.floor(r() * 18);
    const hungarian = r() < hungarianRatio;
    return generatePlayer(seed + i * 137, { pos, ca, age, hungarian, number: num++ });
  });
}

/** Megadott valós játékosokkal kiegészített keret. */
export function generateSquadWithStars(
  seed: number,
  baseCA: number,
  stars: { name: string; pos: Pos; ca: number; age: number; nationality?: string; foot?: Foot }[],
  squadSize = 23,
): PlayerProfile[] {
  const out: PlayerProfile[] = [];
  let num = 1;
  for (const s of stars) {
    const p = generatePlayer(seed + out.length * 31, {
      pos: s.pos, ca: s.ca, age: s.age, name: s.name, number: num++,
    });
    if (s.nationality) p.nationality = s.nationality;
    if (s.foot) p.foot = s.foot;
    out.push(p);
  }
  // Kiegészítjük generált játékosokkal a megfelelő pozíciók szerint
  const have: Record<Pos, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const p of out) have[p.pos]++;
  const target: Record<Pos, number> = { GK: 3, DF: 8, MF: 8, FW: 4 };
  const r = makeRng(seed + 9999);
  while (out.length < squadSize) {
    // Melyik pozícióra van a legnagyobb hiány?
    let pickPos: Pos = "MF";
    let maxDeficit = -Infinity;
    for (const pos of ["GK","DF","MF","FW"] as Pos[]) {
      const def = target[pos] - have[pos];
      if (def > maxDeficit) { maxDeficit = def; pickPos = pos; }
    }
    have[pickPos]++;
    const variance = (r() - 0.5) * 60;
    const ca = Math.max(40, Math.min(170, Math.round(baseCA - 15 + variance)));
    const age = 17 + Math.floor(r() * 18);
    out.push(generatePlayer(seed + out.length * 53, {
      pos: pickPos, ca, age, hungarian: r() < 0.85, number: num++,
    }));
  }
  return out;
}
