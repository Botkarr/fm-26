import { TEAMS, Team, teamStrength, getTeam, Player, Division, NB1_ROUNDS, NB2_ROUNDS, NB1_SIZE, NB2_SIZE, teamsByDefaultDivision } from "./data";
import { generateNewsForRound, newsSnapshot, type NewsItem } from "./news";
import { checkAchievements } from "./achievements";
import {
  Tactics,
  DEFAULT_TACTICS,
  normalizeTactics,
  tacticalModifiers,
  lineupPlayers,
} from "./tactics";
import {
  CupState,
  createCup,
  finalizeCupStage,
  CUP_SCHEDULE,
  CUP_STAGE_NAME,
  type CupStage,
} from "./cup";
import { CareerState, createCareer, rolloverCareer, applyTrainingDevelopment, expireOffers, maybeGenerateOffers } from "./career";
import { tickYouthDevelopment, tickSeniorDevelopment } from "./youth";
import { simulateAITransfers, updateWinterWindow } from "./winter";
import {
  ManagerState,
  createManager,
  updateBoardConfidence,
  updateReputationSeasonEnd,
  expireJobOffers,
  maybeGenerateJobOffer,
  deriveExpectation,
  expectedPositionForGoal,
} from "./manager";
import {
  EuropeState,
  createEurope,
  qualifiesForEurope,
  finalizeEuropeRound,
  finalizeKnockoutStage,
  EUROPE_GROUP_ROUNDS,
  EUROPE_KO_ROUNDS,
  EUROPE_LABEL,
  participantName,
} from "./europe";

export type Fixture = {
  round: number;
  home: string;
  away: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
  scorers?: { team: string; player: string }[];
};

export type TableRow = {
  teamId: string;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
};

export type ScorerRow = { team: string; player: string; goals: number };

export type SeasonHistoryEntry = {
  season: number;
  /** User division during that archived season. */
  userDivision: Division;
  /** Champion of user's division. */
  championId: string;
  /** Champion of NB I (top flight). */
  nb1ChampionId: string;
  /** Champion of NB II. */
  nb2ChampionId: string;
  userPosition: number;
  userPts: number;
  topScorer?: { team: string; player: string; goals: number };
  /** Final standings snapshot for user's division (kept for backwards-compat naming). */
  finalTable?: TableRow[];
  /** Final NB I table snapshot. */
  finalTableNB1?: TableRow[];
  /** Final NB II table snapshot. */
  finalTableNB2?: TableRow[];
  /** Top 10 scorers snapshot from user's division. */
  finalScorers?: ScorerRow[];
  /** Achievements unlocked during that season. */
  achievementsUnlocked?: string[];
  /** Promoted/relegated teams between user's old div and the other div. */
  promoted?: string[];
  relegated?: string[];
  /** Magyar Kupa győztese az adott szezonban. */
  cupChampionId?: string;
  /** A user csapatának kupa-eredménye (ahol kiestek, vagy "champion"). */
  userCupExit?: CupStage | "champion";
};

/** Per-round snapshot: position and points of every team after that round. */
export type RoundSnapshot = Record<string, { pos: number; pts: number }>;

export type SeasonState = {
  userTeamId: string;
  /** Division assignment for THIS season (changes when promotion/relegation happens). */
  divisionAssignments: Record<string, Division>;
  /** Fixtures for the user's division (kept name for compat). */
  fixtures: Fixture[];
  /** Fixtures for the OTHER division. */
  otherFixtures: Fixture[];
  /** Next round to play in user's division. */
  currentRound: number;
  /** Next round to play in other division. */
  otherCurrentRound: number;
  scorers: Record<string, number>; // key: team|player (combined for both divisions)
  season: number; // 1-indexed season number
  history: SeasonHistoryEntry[];
  /** Index 0 = after round 1, etc. — for user's division only. */
  roundHistory: RoundSnapshot[];
  /** News inbox for current season (most recent last). */
  inbox: NewsItem[];
  /** Achievement IDs unlocked all-time. */
  achievements: string[];
  /** Achievement IDs unlocked in CURRENT season (cleared on new season). */
  seasonAchievements: string[];
  lastUserPosition?: number;
  lastTopScorerReported?: string;
  lastWinStreakReported: number;
  lastLossStreakReported: number;
  /** Team morale 0..100 (default 50), modulates user team strength slightly. */
  morale: number;
  /** User-selected tactics for the next match. Persisted between matches. */
  tactics: Tactics;
  /** Magyar Kupa állapota a teljes szezonra. */
  cup: CupState;
  /** Karrier-állapot: pénz, edzés, szerződések, átigazolási piac. */
  career: CareerState;
  /** Edző karrier-állapot (hírnév, board, ajánlatok, trófeák). */
  manager: ManagerState;
  /** Európai kupa az aktuális szezonban (ha kvalifikáltak). */
  europe?: EuropeState;
  /** Edzőváltási csengő — ha be van állítva, a Dashboard megjeleníti az ajánlat-modalt. */
  jobOfferAlert?: string;
};

// Round-robin (circle method) double round
export function generateFixtures(teamIds: string[]): Fixture[] {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push("__BYE__");
  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const fixtures: Fixture[] = [];
  let arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      const home = r % 2 === 0 ? a : b;
      const away = r % 2 === 0 ? b : a;
      fixtures.push({ round: r + 1, home, away, played: false });
    }
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  const second = fixtures.map((f) => ({
    round: f.round + rounds,
    home: f.away,
    away: f.home,
    played: false,
  }));
  return [...fixtures, ...second];
}

/** Build a default division-assignment map from teams' defaultDivision. */
export function defaultDivisionAssignments(): Record<string, Division> {
  const map: Record<string, Division> = {};
  for (const t of TEAMS) map[t.id] = t.defaultDivision;
  return map;
}

export function teamsInDivision(state: SeasonState, div: Division): string[] {
  return Object.entries(state.divisionAssignments)
    .filter(([, d]) => d === div)
    .map(([id]) => id);
}

export function userDivision(state: SeasonState): Division {
  return state.divisionAssignments[state.userTeamId] ?? "NB1";
}

export function otherDivision(div: Division): Division {
  return div === "NB1" ? "NB2" : "NB1";
}

export function divisionRounds(div: Division): number {
  return div === "NB1" ? NB1_ROUNDS : NB2_ROUNDS;
}

export function divisionSize(div: Division): number {
  return div === "NB1" ? NB1_SIZE : NB2_SIZE;
}

export function createSeason(userTeamId: string): SeasonState {
  const assignments = defaultDivisionAssignments();
  const userDiv = assignments[userTeamId] ?? "NB1";
  const otherDiv = otherDivision(userDiv);
  const userIds = Object.entries(assignments).filter(([, d]) => d === userDiv).map(([id]) => id);
  const otherIds = Object.entries(assignments).filter(([, d]) => d === otherDiv).map(([id]) => id);
  return {
    userTeamId,
    divisionAssignments: assignments,
    fixtures: generateFixtures(userIds),
    otherFixtures: generateFixtures(otherIds),
    currentRound: 1,
    otherCurrentRound: 1,
    scorers: {},
    season: 1,
    history: [],
    roundHistory: [],
    inbox: [],
    achievements: [],
    seasonAchievements: [],
    lastWinStreakReported: 0,
    lastLossStreakReported: 0,
    morale: 50,
    tactics: normalizeTactics(DEFAULT_TACTICS, userTeamId),
    cup: createCup(),
    career: createCareer(userTeamId),
    manager: createManager(userTeamId),
  };
}

/**
 * Start a new season. Top 2 of NB II promote, bottom 2 of NB I relegate.
 * User team stays with whatever division they end up in.
 */
export function startNextSeason(prev: SeasonState): SeasonState {
  const userDiv = userDivision(prev);
  const tableUser = buildTable(prev, userDiv);
  const otherDiv = otherDivision(userDiv);
  const tableOther = buildTable(prev, otherDiv);
  const nb1Table = userDiv === "NB1" ? tableUser : tableOther;
  const nb2Table = userDiv === "NB2" ? tableUser : tableOther;
  const scorers = topScorers(prev, 10, userDiv);
  const userIdx = tableUser.findIndex((r) => r.teamId === prev.userTeamId);

  // Promotion / relegation: top 2 NB II up, bottom 2 NB I down
  const promoted = nb2Table.slice(0, 2).map((r) => r.teamId);
  const relegated = nb1Table.slice(-2).map((r) => r.teamId);
  const nextAssign: Record<string, Division> = { ...prev.divisionAssignments };
  for (const id of promoted) nextAssign[id] = "NB1";
  for (const id of relegated) nextAssign[id] = "NB2";

  // Determine where the user got knocked out of the cup (or champion)
  let userCupExit: SeasonHistoryEntry["userCupExit"];
  if (prev.cup.championId === prev.userTeamId) {
    userCupExit = "champion";
  } else {
    // Find the latest stage where the user appeared in a tie and lost it
    const userTies = prev.cup.ties.filter(
      (t) => t.home === prev.userTeamId || t.away === prev.userTeamId,
    );
    const last = userTies[userTies.length - 1];
    if (last && last.played) userCupExit = last.stage;
  }

  const entry: SeasonHistoryEntry = {
    season: prev.season,
    userDivision: userDiv,
    championId: tableUser[0]?.teamId ?? prev.userTeamId,
    nb1ChampionId: nb1Table[0]?.teamId ?? "",
    nb2ChampionId: nb2Table[0]?.teamId ?? "",
    userPosition: userIdx + 1,
    userPts: tableUser[userIdx]?.pts ?? 0,
    topScorer: scorers[0],
    finalTable: tableUser,
    finalTableNB1: nb1Table,
    finalTableNB2: nb2Table,
    finalScorers: scorers,
    achievementsUnlocked: [...prev.seasonAchievements],
    promoted,
    relegated,
    cupChampionId: prev.cup.championId,
    userCupExit,
  };

  // Build new fixtures based on new assignments
  const newUserDiv = nextAssign[prev.userTeamId];
  const newOtherDiv = otherDivision(newUserDiv);
  const newUserIds = Object.entries(nextAssign).filter(([, d]) => d === newUserDiv).map(([id]) => id);
  const newOtherIds = Object.entries(nextAssign).filter(([, d]) => d === newOtherDiv).map(([id]) => id);

  // Apply training development for user team BEFORE rolling over career.
  applyTrainingDevelopment(prev.career, prev.userTeamId);
  const { career: nextCareer } = rolloverCareer(prev.career, prev.userTeamId);

  // Manager: hírnév frissítés, új szezon expectation
  const wonLeague = entry.championId === prev.userTeamId;
  const wonCup = entry.cupChampionId === prev.userTeamId;
  const wonEuropeType: "cl" | "el" | null = prev.europe?.championId === prev.userTeamId
    ? (prev.europe.competition) : null;
  const promotedUser = promoted.includes(prev.userTeamId);
  const relegatedUser = relegated.includes(prev.userTeamId);
  let nextManager = updateReputationSeasonEnd(prev.manager, {
    division: userDiv,
    finalPosition: userIdx + 1,
    wonLeague, wonCup,
    wonEurope: wonEuropeType,
    promoted: promotedUser,
    relegated: relegatedUser,
    season: prev.season,
    teamId: prev.userTeamId,
  });
  const newDiv = nextAssign[prev.userTeamId];
  nextManager = {
    ...nextManager,
    seasonsAtClub: nextManager.seasonsAtClub + 1,
    expectation: deriveExpectation(prev.userTeamId, newDiv),
    boardConfidence: 65,
    jobOffers: [],
  };

  // Európai kupa kvalifikáció új szezonra
  const euroComp = qualifiesForEurope({
    userDivision: userDiv,
    userPosition: userIdx + 1,
    wonCup,
  });
  const europe = euroComp ? createEurope(prev.userTeamId, euroComp) : undefined;

  return {
    userTeamId: prev.userTeamId,
    divisionAssignments: nextAssign,
    fixtures: generateFixtures(newUserIds),
    otherFixtures: generateFixtures(newOtherIds),
    currentRound: 1,
    otherCurrentRound: 1,
    scorers: {},
    season: prev.season + 1,
    history: [...prev.history, entry],
    roundHistory: [],
    inbox: [],
    achievements: prev.achievements,
    seasonAchievements: [],
    lastWinStreakReported: 0,
    lastLossStreakReported: 0,
    morale: 50,
    tactics: normalizeTactics(prev.tactics, prev.userTeamId),
    cup: createCup(),
    career: nextCareer,
    manager: nextManager,
    europe,
  };
}

function poissonGoals(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0; let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export function simulateMatch(
  homeId: string,
  awayId: string,
  opts?: {
    homeMoraleBoost?: number;
    awayMoraleBoost?: number;
    homeTactics?: Tactics;
    awayTactics?: Tactics;
  },
): {
  hg: number; ag: number; scorers: { team: string; player: string }[];
} {
  const home = getTeam(homeId)!;
  const away = getTeam(awayId)!;
  const hs = teamStrength(home);
  const as_ = teamStrength(away);
  const diff = hs - as_;

  const hMod = opts?.homeTactics ? tacticalModifiers(opts.homeTactics, home) : { attack: 0, defense: 0 };
  const aMod = opts?.awayTactics ? tacticalModifiers(opts.awayTactics, away) : { attack: 0, defense: 0 };

  const hLambda = Math.max(0.15, 1.4 + diff * 0.05 + 0.25
    + (opts?.homeMoraleBoost ?? 0) + hMod.attack - aMod.defense * 0.6);
  const aLambda = Math.max(0.15, 1.3 - diff * 0.05
    + (opts?.awayMoraleBoost ?? 0) + aMod.attack - hMod.defense * 0.6);
  const hg = Math.min(7, poissonGoals(hLambda));
  const ag = Math.min(7, poissonGoals(aLambda));

  const scorers: { team: string; player: string }[] = [];
  const pickScorer = (t: Team, tactics?: Tactics) => {
    const pool: Player[] = tactics ? lineupPlayers(tactics, t) : t.squad;
    const weighted = pool.map((p) => ({
      p,
      w: p.pos === "FW" ? p.rating * 2.5 : p.pos === "MF" ? p.rating * 1.2 : p.pos === "DF" ? p.rating * 0.3 : 0.05,
    }));
    const total = weighted.reduce((s, x) => s + x.w, 0);
    if (total <= 0) return t.squad[0].name;
    let r = Math.random() * total;
    for (const x of weighted) { r -= x.w; if (r <= 0) return x.p.name; }
    return weighted[0].p.name;
  };
  for (let i = 0; i < hg; i++) scorers.push({ team: home.id, player: pickScorer(home, opts?.homeTactics) });
  for (let i = 0; i < ag; i++) scorers.push({ team: away.id, player: pickScorer(away, opts?.awayTactics) });
  return { hg, ag, scorers };
}

export function moraleBoost(morale: number): number {
  return ((morale - 50) / 50) * 0.18;
}

/** Simulate one round in BOTH divisions. User division advances 1 round; other division also advances 1 round (if possible). */
export function playRound(state: SeasonState): SeasonState {
  const next: SeasonState = {
    ...state,
    scorers: { ...state.scorers },
    fixtures: state.fixtures.map((f) => ({ ...f })),
    otherFixtures: state.otherFixtures.map((f) => ({ ...f })),
    inbox: [...state.inbox],
    achievements: [...state.achievements],
    seasonAchievements: [...state.seasonAchievements],
    roundHistory: [...state.roundHistory],
    cup: state.cup,
  };
  const userBoost = moraleBoost(state.morale);
  const userTactics = normalizeTactics(state.tactics, state.userTeamId);

  // User division
  const userDiv = userDivision(state);
  const userRounds = divisionRounds(userDiv);
  if (state.currentRound <= userRounds) {
    for (const f of next.fixtures) {
      if (f.round !== state.currentRound || f.played) continue;
      const opts: {
        homeMoraleBoost?: number; awayMoraleBoost?: number;
        homeTactics?: Tactics; awayTactics?: Tactics;
      } = {};
      if (f.home === state.userTeamId) { opts.homeMoraleBoost = userBoost; opts.homeTactics = userTactics; }
      if (f.away === state.userTeamId) { opts.awayMoraleBoost = userBoost; opts.awayTactics = userTactics; }
      const { hg, ag, scorers } = simulateMatch(f.home, f.away, opts);
      f.homeGoals = hg; f.awayGoals = ag; f.played = true; f.scorers = scorers;
      for (const s of scorers) {
        const k = `${s.team}|${s.player}`;
        next.scorers[k] = (next.scorers[k] ?? 0) + 1;
      }
    }
    next.currentRound = state.currentRound + 1;
  }

  // Other division (advance one round, no user involvement)
  const otherDiv = otherDivision(userDiv);
  const otherRounds = divisionRounds(otherDiv);
  if (state.otherCurrentRound <= otherRounds) {
    for (const f of next.otherFixtures) {
      if (f.round !== state.otherCurrentRound || f.played) continue;
      const { hg, ag, scorers } = simulateMatch(f.home, f.away);
      f.homeGoals = hg; f.awayGoals = ag; f.played = true; f.scorers = scorers;
      for (const s of scorers) {
        const k = `${s.team}|${s.player}`;
        next.scorers[k] = (next.scorers[k] ?? 0) + 1;
      }
    }
    next.otherCurrentRound = state.otherCurrentRound + 1;
  }

  return finalizeRound(next, state.currentRound);
}

/**
 * Ha az imént lejátszott bajnoki forduló (playedRound) illik a kupa-ütemezésbe ÉS a kupa
 * aktuális fordulója még nincs lefutva, akkor lefuttatja az egész kupafordulót (a user
 * meccsét is szimulálva). News bejegyzéseket fűz a state.inbox-hoz.
 *
 * Ha hagyni akarod a usert, hogy MAGA játssza le a kupameccsét, akkor csak akkor hívd, ha
 * a user kupameccse már `played: true` (de a többi még nem) — akkor csak a többit szimulálja.
 *
 * Ezt a függvényt a playRound (sim mode) használja a teljes forduló lefuttatására.
 * TODO: szimulálás helyett meccs lejátszásának lehetősége
 */
export function progressCupAfterLeagueRound(state: SeasonState, playedRound: number): SeasonState {
  if (state.cup.currentStage === "done") return state;
  const stage = state.cup.currentStage;
  // A kupa csak a megadott bajnoki forduló UTÁN zajlik
  if (CUP_SCHEDULE[stage] !== playedRound) return state;

  const userBoost = moraleBoost(state.morale);
  const userTactics = normalizeTactics(state.tactics, state.userTeamId);
  const newCup = finalizeCupStage(state.cup, {
    userTeamId: state.userTeamId,
    userTactics,
    userMoraleBoost: userBoost,
  });

  // News bejegyzések: stage befejeződött, user kupameccs eredménye, döntő győztese
  const stageTies = newCup.ties.filter((t) => t.stage === stage);
  const userTie = stageTies.find((t) => t.home === state.userTeamId || t.away === state.userTeamId);
  const inbox = [...state.inbox];
  const items: NewsItem[] = [];
  const mk = (icon: string, title: string, body: string, important = false): NewsItem => ({
    id: `${state.season}-cup-${stage}-${items.length}`,
    round: playedRound,
    season: state.season,
    type: "milestone",
    icon, title, body, important,
  });

  if (userTie) {
    const isHome = userTie.home === state.userTeamId;
    const own = isHome ? userTie.homeGoals! : userTie.awayGoals!;
    const opp = isHome ? userTie.awayGoals! : userTie.homeGoals!;
    const oppId = isHome ? userTie.away : userTie.home;
    const oppName = getTeam(oppId)?.name ?? oppId;
    const advanced = userTie.shootoutWinner ? userTie.shootoutWinner === state.userTeamId : own > opp;
    const shootout = userTie.shootoutWinner ? " (büntetők után)" : "";
    if (advanced) {
      items.push(mk("🏆", `Magyar Kupa — ${CUP_STAGE_NAME[stage]}: továbbjutottunk!`,
        `${own}-${opp}${shootout} a ${oppName} ellen. Indulhatunk a következő körben.`, true));
    } else {
      items.push(mk("😞", `Magyar Kupa — ${CUP_STAGE_NAME[stage]}: kiestünk`,
        `${own}-${opp}${shootout} a ${oppName} ellen. Vége a kupakalandnak.`, false));
    }
  } else {
    items.push(mk("📰", `Magyar Kupa — ${CUP_STAGE_NAME[stage]} lezajlott`,
      `Kiderült a ${CUP_STAGE_NAME[stage].toLowerCase()} mezőnye.`));
  }

  if (newCup.currentStage === "done" && newCup.championId) {
    const championName = getTeam(newCup.championId)?.name ?? newCup.championId;
    const userWon = newCup.championId === state.userTeamId;
    items.push(mk(userWon ? "🏆" : "🏅",
      userWon ? "MAGYAR KUPAGYŐZTESEK!" : `Magyar Kupa: ${championName}`,
      userWon
        ? `Történelmi pillanat — a ${championName} elhódította a Magyar Kupát!`
        : `A ${championName} nyerte a Magyar Kupát ebben a szezonban.`,
      true));
  }

  return { ...state, cup: newCup, inbox: [...inbox, ...items] };
}

export function finalizeRound(state: SeasonState, playedRound: number): SeasonState {
  const userDiv = userDivision(state);
  const table = buildTable(state, userDiv);
  const snap: RoundSnapshot = {};
  table.forEach((row, i) => { snap[row.teamId] = { pos: i + 1, pts: row.pts }; });
  const roundHistory = [...state.roundHistory];
  roundHistory[playedRound - 1] = snap;

  const news = generateNewsForRound(state, playedRound);
  const inbox = [...state.inbox, ...news];
  const newAch = checkAchievements(state);
  const achievements = [...state.achievements, ...newAch];
  const seasonAchievements = [...state.seasonAchievements, ...newAch];

  const userPlayed = state.fixtures
    .filter((f) => f.played && (f.home === state.userTeamId || f.away === state.userTeamId))
    .sort((a, b) => a.round - b.round);
  const last3 = userPlayed.slice(-3).map((f) => {
    const isHome = f.home === state.userTeamId;
    const own = isHome ? f.homeGoals! : f.awayGoals!;
    const opp = isHome ? f.awayGoals! : f.homeGoals!;
    return (own > opp ? 8 : own === opp ? 0 : -8) as number;
  });
  const moraleDelta = last3.reduce((s, n) => s + n, 0);
  const morale = Math.max(15, Math.min(95, state.morale + moraleDelta * 0.4));

  const snapMeta = newsSnapshot(state);

  // Beérkező ajánlatok: lejártak kiszűrése, majd újak generálása
  let career = expireOffers(state.career, playedRound);
  const newOffers = maybeGenerateOffers(career, state.userTeamId, playedRound);
  const offerNews: NewsItem[] = newOffers.map((o, i) => ({
    id: `${state.season}-offer-${playedRound}-${i}`,
    round: playedRound,
    season: state.season,
    type: "milestone",
    icon: "💰",
    title: `Ajánlat érkezett: ${o.playerName}`,
    body: `A ${getTeam(o.fromTeamId)?.name ?? o.fromTeamId} ${o.amount}M Ft-ot ajánl. Az Átigazolás panelen döntheted el.`,
    important: true,
  }));
  career = { ...career, offers: [...career.offers, ...newOffers] };

  // Akadémia és felnőtt fejlődés (kis lépésekben fordulónként)
  const youth = tickYouthDevelopment(career.youth, state.season * 100 + playedRound);
  const seniorChanges = tickSeniorDevelopment(state.userTeamId, state.season * 200 + playedRound);
  const devNews: NewsItem[] = [];
  // Csak a "nagy" fejlődéseket jelentjük (rating ugrás)
  for (const c of seniorChanges.changes.slice(0, 3)) {
    if (c.to - c.from >= 2) {
      devNews.push({
        id: `${state.season}-dev-${playedRound}-${c.name}`,
        round: playedRound,
        season: state.season,
        type: "milestone",
        icon: "📈",
        title: `Fejlődés: ${c.name}`,
        body: `${c.name} rating-je ${c.from} → ${c.to} az utóbbi időszakban.`,
      });
    }
  }
  career = { ...career, youth };

  // Téli átigazolási ablak: nyitás/zárás + AI cserék
  const winter = updateWinterWindow(career.winter, playedRound);
  const winterNews: NewsItem[] = [];
  if (winter.open && !career.winter.open) {
    winterNews.push({
      id: `${state.season}-winter-open-${playedRound}`,
      round: playedRound, season: state.season, type: "milestone",
      icon: "❄️", title: "Téli átigazolási ablak nyitva",
      body: "A klubok 3 fordulón át mozgathatnak játékosokat. Figyeld a híreket!",
      important: true,
    });
  }
  if (winter.open) {
    const transfers = simulateAITransfers(state.userTeamId, state.season * 1000 + playedRound);
    for (const t of transfers.slice(0, 5)) {
      winterNews.push({
        id: `${state.season}-winter-${playedRound}-${t.playerName}`,
        round: playedRound, season: state.season, type: "milestone",
        icon: "🔄",
        title: `Átigazolás: ${t.playerName}`,
        body: `${getTeam(t.fromTeamId)?.name} → ${getTeam(t.toTeamId)?.name} (${t.amount}M Ft)`,
      });
    }
  }
  if (!winter.open && career.winter.open) {
    winterNews.push({
      id: `${state.season}-winter-close-${playedRound}`,
      round: playedRound, season: state.season, type: "milestone",
      icon: "🚪", title: "Téli ablak bezárt",
      body: "Vége az átigazolási időszaknak. A nyári ablakig nincs több AI csere.",
    });
  }
  career = { ...career, winter };

  // ===== Manager update =====
  const userFixturePlayed = state.fixtures
    .filter((f) => f.played && f.round === playedRound && (f.home === state.userTeamId || f.away === state.userTeamId))[0];
  let won = false, drew = false, lost = false;
  if (userFixturePlayed) {
    const isHome = userFixturePlayed.home === state.userTeamId;
    const own = isHome ? userFixturePlayed.homeGoals! : userFixturePlayed.awayGoals!;
    const opp = isHome ? userFixturePlayed.awayGoals! : userFixturePlayed.homeGoals!;
    if (own > opp) won = true; else if (own === opp) drew = true; else lost = true;
  }
  // Compute streaks (positive = wins, negative = losses)
  let streak = 0;
  for (const f of [...userPlayed].reverse()) {
    const isHome = f.home === state.userTeamId;
    const own = isHome ? f.homeGoals! : f.awayGoals!;
    const opp = isHome ? f.awayGoals! : f.homeGoals!;
    if (own > opp) { if (streak >= 0) streak++; else break; }
    else if (own < opp) { if (streak <= 0) streak--; else break; }
    else break;
  }
  const userPosNow = table.findIndex((r) => r.teamId === state.userTeamId) + 1;
  const expectedPos = expectedPositionForGoal(state.manager.expectation.goal, table.length || 12);
  let manager = updateBoardConfidence(state.manager, {
    currentPosition: userPosNow,
    expectedPosition: expectedPos,
    won, drew, lost, streak,
  });
  manager = expireJobOffers(manager, playedRound);
  const managerNews: NewsItem[] = [];
  const newJobOffer = maybeGenerateJobOffer(manager, state.userTeamId, state.season, playedRound);
  if (newJobOffer) {
    manager = { ...manager, jobOffers: [...manager.jobOffers, newJobOffer] };
    managerNews.push({
      id: `${state.season}-job-${playedRound}-${newJobOffer.fromTeamId}`,
      round: playedRound, season: state.season, type: "milestone",
      icon: "📞", title: `Edzői ajánlat: ${getTeam(newJobOffer.fromTeamId)?.name ?? newJobOffer.fromTeamId}`,
      body: `Egy másik klub szerződtetni szeretne. Az Edző karrier panelen döntheted el.`,
      important: true,
    });
  }
  // Board confidence figyelmeztetés
  if (manager.boardConfidence < 25 && state.manager.boardConfidence >= 25) {
    managerNews.push({
      id: `${state.season}-board-warn-${playedRound}`,
      round: playedRound, season: state.season, type: "milestone",
      icon: "⚠️", title: "Az elnökség figyelmeztet",
      body: `A bizalmi szint kritikusra esett (${Math.round(manager.boardConfidence)}). Eredmények kellenek.`,
      important: true,
    });
  }

  // ===== Európai kupa előrehaladás =====
  let europe = state.europe;
  const europeNews: NewsItem[] = [];
  if (europe) {
    const userBoost = moraleBoost(state.morale);
    const userTactics = normalizeTactics(state.tactics, state.userTeamId);
    if (europe.stage === "group") {
      const groupRound = Object.entries(EUROPE_GROUP_ROUNDS).find(([, r]) => r === playedRound)?.[0];
      if (groupRound) {
        const gr = parseInt(groupRound, 10);
        const before = europe;
        europe = finalizeEuropeRound(europe, gr, {
          userTeamId: state.userTeamId,
          userTactics,
          userMoraleBoost: userBoost,
        });
        const userMatch = before.groupMatches.find((m) => m.round === gr && (m.homeId === state.userTeamId || m.awayId === state.userTeamId));
        if (userMatch) {
          const after = europe.groupMatches.find((m) => m.id === userMatch.id);
          if (after?.played) {
            const isHome = after.homeId === state.userTeamId;
            const own = isHome ? after.homeGoals! : after.awayGoals!;
            const opp = isHome ? after.awayGoals! : after.homeGoals!;
            const oppId = isHome ? after.awayId : after.homeId;
            const oppP = europe.participants.find((p) => (p.kind === "user" ? p.teamId : p.club.id) === oppId);
            const oppName = oppP ? participantName(oppP) : oppId;
            const verb = own > opp ? "GYŐZELEM" : own === opp ? "Döntetlen" : "Vereség";
            europeNews.push({
              id: `${state.season}-euro-${gr}-user`,
              round: playedRound, season: state.season, type: "milestone",
              icon: "🌍", title: `${EUROPE_LABEL[europe.competition]} ${gr}. forduló — ${verb}`,
              body: `${isHome ? "Otthon" : "Idegenben"}: ${own}-${opp} ${oppName} ellen.`,
              important: own > opp,
            });
          }
        }
      }
    }
    if (europe.stage === "sf" && playedRound === EUROPE_KO_ROUNDS.sf) {
      europe = finalizeKnockoutStage(europe, { userTeamId: state.userTeamId, userTactics, userMoraleBoost: userBoost });
      europeNews.push({
        id: `${state.season}-euro-sf`,
        round: playedRound, season: state.season, type: "milestone",
        icon: "🌍", title: `${EUROPE_LABEL[europe.competition]} elődöntő lezajlott`,
        body: europe.userExit === "sf" ? "Sajnos kiestünk az elődöntőben." : "Tovább a döntőbe!",
        important: true,
      });
    } else if (europe.stage === "final" && playedRound === EUROPE_KO_ROUNDS.final) {
      europe = finalizeKnockoutStage(europe, { userTeamId: state.userTeamId, userTactics, userMoraleBoost: userBoost });
      const champ = europe.participants.find((p) => (p.kind === "user" ? p.teamId : p.club.id) === europe!.championId);
      europeNews.push({
        id: `${state.season}-euro-final`,
        round: playedRound, season: state.season, type: "milestone",
        icon: europe.userExit === "champion" ? "🏆" : "🥈",
        title: europe.userExit === "champion" ? `${EUROPE_LABEL[europe.competition]} GYŐZTESEK!` : `${EUROPE_LABEL[europe.competition]} döntő`,
        body: champ ? `Bajnok: ${participantName(champ)}` : "A döntő lezajlott.",
        important: true,
      });
    }
  }

  const withCore: SeasonState = {
    ...state,
    roundHistory,
    inbox: [...inbox, ...offerNews, ...devNews, ...winterNews, ...managerNews, ...europeNews],
    achievements,
    seasonAchievements,
    morale,
    career,
    manager,
    europe,
    lastUserPosition: snapMeta.lastUserPosition,
    lastTopScorerReported: snapMeta.lastTopScorerReported,
    lastWinStreakReported: snapMeta.lastWinStreakReported,
    lastLossStreakReported: snapMeta.lastLossStreakReported,
  };
  // Kupa-előrehaladás: ha az imént lejátszott bajnoki forduló illik a kupa-ütemezésbe
  return progressCupAfterLeagueRound(withCore, playedRound);
}

/** Build standings table for a specific division. */
export function buildTable(state: SeasonState, division?: Division): TableRow[] {
  const div = division ?? userDivision(state);
  const ids = teamsInDivision(state, div);
  const fixtures = div === userDivision(state) ? state.fixtures : state.otherFixtures;
  const rows: Record<string, TableRow> = {};
  for (const id of ids) rows[id] = { teamId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  for (const f of fixtures) {
    if (!f.played) continue;
    const h = rows[f.home]; const a = rows[f.away];
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += f.homeGoals!; h.ga += f.awayGoals!;
    a.gf += f.awayGoals!; a.ga += f.homeGoals!;
    if (f.homeGoals! > f.awayGoals!) { h.w++; h.pts += 3; a.l++; }
    else if (f.homeGoals! < f.awayGoals!) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(rows)
    .map((r) => ({ ...r, gd: r.gf - r.ga }))
    .sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf);
}

/** Top scorers, optionally filtered by division. */
export function topScorers(state: SeasonState, limit = 10, division?: Division): ScorerRow[] {
  const filter = division ? new Set(teamsInDivision(state, division)) : null;
  return Object.entries(state.scorers)
    .map(([k, goals]) => {
      const [team, player] = k.split("|");
      return { team, player, goals };
    })
    .filter((r) => (filter ? filter.has(r.team) : true))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}

/** Backwards-compat: total rounds for the user's CURRENT division. */
export function totalRoundsFor(state: SeasonState): number {
  return divisionRounds(userDivision(state));
}

/** Legacy constant kept for any imports — equals NB I rounds (default top flight). */
export const TOTAL_ROUNDS = NB1_ROUNDS;

// Re-exports used by other modules
export { teamsByDefaultDivision };
