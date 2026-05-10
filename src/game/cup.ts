import { TEAMS, getTeam, teamStrength } from "./data";
import type { Tactics } from "./tactics";
import { simulateMatch } from "./engine";

/**
 * Magyar Kupa — egyenes kieséses, a teljes piramis (NB I + NB II = 28 csapat) résztvevőivel.
 *
 * Struktúra:
 *  - R32 (1. forduló): 4 legerősebb csapat bye-t kap, 24 csapat 12 meccset játszik → 16 továbbjutó
 *  - R16 (2. forduló): 8 meccs → 8
 *  - QF (negyeddöntő):  4 meccs → 4
 *  - SF (elődöntő):     2 meccs → 2
 *  - F  (döntő):        1 meccs → bajnok
 *
 * A kupa fordulók a bajnoki fordulók KÖZÉ vannak ütemezve (lásd CUP_SCHEDULE).
 * A user-meccs (ha kupa is jön) ugyanúgy a /match oldalon játszható le, mint a bajnoki.
 * Döntetlen esetén szétlövést szimulálunk (50-50 random győztes), mert a meccs-szimuláció
 * a meglévő engine-en fut és nem támogat hosszabbítást.
 */

export type CupStage = "R32" | "R16" | "QF" | "SF" | "F";

export const CUP_STAGES: CupStage[] = ["R32", "R16", "QF", "SF", "F"];

export const CUP_STAGE_NAME: Record<CupStage, string> = {
  R32: "1. forduló (16 közé)",
  R16: "Nyolcaddöntő",
  QF:  "Negyeddöntő",
  SF:  "Elődöntő",
  F:   "Döntő",
};

/**
 * A kupa-fordulók akkor zajlanak le, AMIKOR a user bajnoki fordulóinak száma elérte ezeket
 * az értékeket (azaz "a 4. forduló UTÁN játssza R32-t" stb.). Az utolsó (döntő) a 20. forduló után.
 */
export const CUP_SCHEDULE: Record<CupStage, number> = {
  R32: 4,
  R16: 8,
  QF:  12,
  SF:  16,
  F:   20,
};

export type CupTie = {
  /** Egyedi azonosító a fordulón belül. */
  id: number;
  stage: CupStage;
  home: string;
  away: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  /** Szétlövés után a győztes id-je (ha döntetlen volt). */
  shootoutWinner?: string;
  scorers?: { team: string; player: string }[];
};

export type CupState = {
  /** Aktuális forduló (R32 → F). Ha "done", a kupa befejeződött. */
  currentStage: CupStage | "done";
  /** Csapatok, akik bye-t kaptak az R32-ben — csak az R16 sorsolásnál relevánsak. */
  byes: string[];
  /** Az összes eddigi meccs (minden fordulóból). */
  ties: CupTie[];
  /** A még versenyben lévő csapatok aktuális állása. */
  alive: string[];
  /** A kupagyőztes id-je, ha eldőlt. */
  championId?: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Új kupa létrehozása a szezon elején: minden csapat (NB I + NB II) résztvevő. */
export function createCup(): CupState {
  const all = TEAMS.map((t) => t.id);
  // 4 legerősebb csapat bye-t kap (rendszerint a top NB I)
  const sorted = [...all].sort((a, b) => teamStrength(getTeam(b)!) - teamStrength(getTeam(a)!));
  const byes = sorted.slice(0, 4);
  const playing = shuffle(sorted.slice(4)); // 24 csapat
  const ties: CupTie[] = [];
  for (let i = 0; i < playing.length; i += 2) {
    ties.push({
      id: ties.length,
      stage: "R32",
      home: playing[i],
      away: playing[i + 1],
      played: false,
    });
  }
  return {
    currentStage: "R32",
    byes,
    ties,
    alive: [...all],
  };
}

function nextStage(stage: CupStage): CupStage | "done" {
  const i = CUP_STAGES.indexOf(stage);
  if (i < 0 || i >= CUP_STAGES.length - 1) return "done";
  return CUP_STAGES[i + 1];
}

/** A megadott forduló még le nem játszott meccseit szűri. */
export function pendingTies(cup: CupState, stage?: CupStage): CupTie[] {
  const s = stage ?? (cup.currentStage === "done" ? null : cup.currentStage);
  if (!s) return [];
  return cup.ties.filter((t) => t.stage === s && !t.played);
}

/** A felhasználó kupameccse az aktuális fordulóban (ha van). */
export function userCupTie(cup: CupState, userTeamId: string): CupTie | undefined {
  if (cup.currentStage === "done") return undefined;
  return cup.ties.find(
    (t) => t.stage === cup.currentStage && !t.played && (t.home === userTeamId || t.away === userTeamId),
  );
}

/** A még versenyben lévő csapatok az adott (még be nem fejezett) fordulóhoz tartozó pároktól. */
export function tiesForStage(cup: CupState, stage: CupStage): CupTie[] {
  return cup.ties.filter((t) => t.stage === stage);
}

/** Egy meccs eredményének rögzítése (külső szimulációból vagy user lejátszásából). */
export function recordCupResult(
  cup: CupState,
  tieId: number,
  res: { homeGoals: number; awayGoals: number; scorers: { team: string; player: string }[]; shootoutWinner?: string },
): CupState {
  const ties = cup.ties.map((t) => {
    if (t.id !== tieId || t.stage !== cup.currentStage || t.played) return t;
    const winner = res.homeGoals === res.awayGoals
      ? (res.shootoutWinner ?? (Math.random() < 0.5 ? t.home : t.away))
      : (res.homeGoals > res.awayGoals ? t.home : t.away);
    return {
      ...t,
      played: true,
      homeGoals: res.homeGoals,
      awayGoals: res.awayGoals,
      scorers: res.scorers,
      shootoutWinner: res.homeGoals === res.awayGoals ? winner : undefined,
    };
  });
  return { ...cup, ties };
}

/**
 * Az aktuális forduló BEFEJEZÉSE: szimulálja az összes hátralévő (nem user) meccset,
 * majd kisorsolja a következő fordulót (vagy lezárja a kupát).
 */
export function finalizeCupStage(
  cup: CupState,
  opts?: { userTeamId?: string; userTactics?: Tactics; userMoraleBoost?: number },
): CupState {
  if (cup.currentStage === "done") return cup;
  const stage = cup.currentStage;
  const userId = opts?.userTeamId;

  // Szimuláld a fennmaradó meccseket
  const ties = cup.ties.map((t) => {
    if (t.stage !== stage || t.played) return t;
    const isUserHome = userId && t.home === userId;
    const isUserAway = userId && t.away === userId;
    const simOpts: Parameters<typeof simulateMatch>[2] = {};
    if (isUserHome) {
      simOpts.homeMoraleBoost = opts?.userMoraleBoost;
      simOpts.homeTactics = opts?.userTactics;
    }
    if (isUserAway) {
      simOpts.awayMoraleBoost = opts?.userMoraleBoost;
      simOpts.awayTactics = opts?.userTactics;
    }
    const r = simulateMatch(t.home, t.away, simOpts);
    const winner = r.hg === r.ag
      ? (Math.random() < 0.5 ? t.home : t.away)
      : (r.hg > r.ag ? t.home : t.away);
    return {
      ...t,
      played: true,
      homeGoals: r.hg,
      awayGoals: r.ag,
      scorers: r.scorers,
      shootoutWinner: r.hg === r.ag ? winner : undefined,
    } as CupTie;
  });

  // Továbbjutók
  const stageTies = ties.filter((t) => t.stage === stage);
  const winners: string[] = stageTies.map((t) => {
    if (t.shootoutWinner) return t.shootoutWinner;
    return t.homeGoals! > t.awayGoals! ? t.home : t.away;
  });

  // R32 → R16 sorsolás: győztesek + bye-osok
  const next = nextStage(stage);
  if (next === "done") {
    // Döntő győztese = bajnok
    return {
      ...cup,
      ties,
      currentStage: "done",
      alive: winners,
      championId: winners[0],
    };
  }

  const advancing = stage === "R32" ? [...winners, ...cup.byes] : winners;
  const drawn = shuffle(advancing);
  const newTies: CupTie[] = [...ties];
  let nextId = newTies.length;
  for (let i = 0; i < drawn.length; i += 2) {
    newTies.push({
      id: nextId++,
      stage: next,
      home: drawn[i],
      away: drawn[i + 1],
      played: false,
    });
  }
  return {
    ...cup,
    ties: newTies,
    currentStage: next,
    alive: advancing,
  };
}

/** Címke az aktuális kupahelyzetről a UI-nak. */
export function cupStageLabel(cup: CupState): string {
  if (cup.currentStage === "done") return "Befejezve";
  return CUP_STAGE_NAME[cup.currentStage];
}
