import { Team, getTeam, teamStrength, Player } from "./data";
import { Tactics, tacticalModifiers, lineupPlayers } from "./tactics";

export type EventType = "kickoff" | "chance" | "save" | "goal" | "yellow" | "red" | "sub" | "halftime" | "fulltime" | "info";

export type ShotZone = "box" | "edge" | "long" | "wing";

export type MatchEvent = {
  minute: number;
  type: EventType;
  team?: string; // teamId
  player?: string;
  detail: string;
  scoreH: number;
  scoreA: number;
  /** Expected goals for this shot event (chance/save/goal). 0 for non-shots. */
  xg?: number;
  /** Shot location on a 0..100 (x = lengthwise, y = width) coordinate. */
  shotX?: number;
  shotY?: number;
  zone?: ShotZone;
};

const CHANCE_TEMPLATES = [
  "{p} elhúz a szélen és belövi a labdát a tizenhatosba...",
  "Szöglet után {p} fejese centikkel kerüli el a kaput!",
  "{p} 25 méterről eleresztett bombája a kapufán csattan!",
  "{p} kiugrik a védők között, de a lesen akad fenn.",
  "Gyors kontra végén {p} elhibázza a kapufa mellé!",
];
const SAVE_TEMPLATES = [
  "{p} lövését a kapus bravúrral hárítja!",
  "{p} fejese védhető magasságban érkezik a kapushoz.",
  "Hatalmas védés! {p} próbálkozását a kapus szögletre tolja.",
];
const GOAL_TEMPLATES = [
  "GÓÓÓL! {p} a kapuba tekeri a labdát! ⚽",
  "GÓL! {p} fejessel zörgeti meg a hálót! ⚽",
  "GÓÓÓL! {p} 20 méterről bombáz a kapuba! ⚽",
  "GÓL! {p} az ötösről nem hibáz! ⚽",
  "GÓÓÓL! {p} büntetőből magabiztosan értékesít! ⚽",
];
const YELLOW_TEMPLATES = [
  "{p} szabálytalankodik, sárga lap a játékvezetőtől.",
  "Kemény becsúszás {p} részéről — sárga lap.",
  "{p} reklamálásért kap sárga lapot.",
];

/** Generates a shot location and xG. side=true → home attacks left→right (x increases). */
function generateShot(isHome: boolean): { xg: number; shotX: number; shotY: number; zone: ShotZone } {
  const r = Math.random();
  let zone: ShotZone;
  let xg: number;
  // distance from goal (along length): box≈4-15, edge≈15-22, long≈22-35
  let dx: number; // 0 = on goal line, larger = farther
  let dy: number; // 0 = centered, ±25 = wide
  if (r < 0.45) {
    zone = "box"; dx = 4 + Math.random() * 11; dy = (Math.random() - 0.5) * 20;
    xg = 0.18 + Math.random() * 0.45;
  } else if (r < 0.75) {
    zone = "edge"; dx = 15 + Math.random() * 7; dy = (Math.random() - 0.5) * 22;
    xg = 0.07 + Math.random() * 0.13;
  } else if (r < 0.9) {
    zone = "long"; dx = 22 + Math.random() * 13; dy = (Math.random() - 0.5) * 22;
    xg = 0.02 + Math.random() * 0.06;
  } else {
    zone = "wing"; dx = 6 + Math.random() * 14; dy = (Math.random() < 0.5 ? -1 : 1) * (22 + Math.random() * 8);
    xg = 0.04 + Math.random() * 0.08;
  }
  // Map to pitch coords 0..100. Home shoots toward x=100, away toward x=0.
  const shotX = isHome ? 100 - dx : dx;
  const shotY = 50 + dy;
  return { xg: Math.round(xg * 100) / 100, shotX, shotY, zone };
}

function tpl(arr: string[], player: string) {
  return arr[Math.floor(Math.random() * arr.length)].replace("{p}", player);
}

function pickPlayer(team: Team, role: "att" | "any" | "def", pool?: Player[]): string {
  const squad = pool && pool.length ? pool : team.squad;
  const weights = squad.map((p) => {
    if (role === "att") return p.pos === "FW" ? p.rating * 3 : p.pos === "MF" ? p.rating * 1.4 : p.pos === "DF" ? p.rating * 0.3 : 0.05;
    if (role === "def") return p.pos === "DF" ? p.rating * 2.5 : p.pos === "MF" ? p.rating * 1.5 : p.pos === "FW" ? p.rating * 0.6 : p.pos === "GK" ? 0.3 : 0.1;
    return p.rating;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return squad[0]?.name ?? team.squad[0].name;
  let r = Math.random() * total;
  for (let i = 0; i < squad.length; i++) {
    r -= weights[i];
    if (r <= 0) return squad[i].name;
  }
  return squad[0].name;
}

export function generateMatchTimeline(
  homeId: string,
  awayId: string,
  opts?: { homeTactics?: Tactics; awayTactics?: Tactics; userMoraleBoost?: number; userIsHome?: boolean },
): {
  events: MatchEvent[];
  finalH: number;
  finalA: number;
} {
  const home = getTeam(homeId)!;
  const away = getTeam(awayId)!;
  const hs = teamStrength(home);
  const as_ = teamStrength(away);
  const diff = hs - as_;

  const hMod = opts?.homeTactics ? tacticalModifiers(opts.homeTactics, home) : { attack: 0, defense: 0 };
  const aMod = opts?.awayTactics ? tacticalModifiers(opts.awayTactics, away) : { attack: 0, defense: 0 };
  const moraleH = opts?.userIsHome ? (opts.userMoraleBoost ?? 0) : 0;
  const moraleA = !opts?.userIsHome && opts?.userIsHome === false ? (opts.userMoraleBoost ?? 0) : 0;

  // Per-minute attack chance, modulated by tactical attack modifier.
  // hMod.attack typical range ~ -0.30..+0.25 → multiplier 0.7..1.25
  const hAttack = (0.18 + diff * 0.005 + 0.02) * (1 + hMod.attack * 0.9 - aMod.defense * 0.5) + moraleH * 0.05;
  const aAttack = (0.16 - diff * 0.005) * (1 + aMod.attack * 0.9 - hMod.defense * 0.5) + moraleA * 0.05;
  // Goal conversion also nudges with mentality (attacking more chances + slightly higher conv)
  const hGoalConv = Math.max(0.08, 0.18 + hMod.attack * 0.15 - aMod.defense * 0.1);
  const aGoalConv = Math.max(0.08, 0.18 + aMod.attack * 0.15 - hMod.defense * 0.1);
  const yellowProb = 0.012;
  const subMinutes = [60, 70, 78];

  // Restrict scorer pools to chosen XI when tactics provided
  const homePool = opts?.homeTactics ? lineupPlayers(opts.homeTactics, home) : home.squad;
  const awayPool = opts?.awayTactics ? lineupPlayers(opts.awayTactics, away) : away.squad;

  const events: MatchEvent[] = [];
  let scoreH = 0, scoreA = 0;
  events.push({ minute: 0, type: "kickoff", detail: `Sípszó! Kezdődik a mérkőzés a ${home.name} és a ${away.name} között.`, scoreH, scoreA });

  const subsHome = [...subMinutes];
  const subsAway = [...subMinutes];
  const usedSubsH: Set<string> = new Set();
  const usedSubsA: Set<string> = new Set();

  // Per-minute probability so attack rate roughly equals hAttack chances over 90 min cluster
  const hPerMin = Math.min(0.5, hAttack / 6);
  const aPerMin = Math.min(0.5, aAttack / 6);

  for (let m = 1; m <= 90; m++) {
    if (m === 45) {
      events.push({ minute: 45, type: "halftime", detail: `Félidő. Állás: ${scoreH}-${scoreA}.`, scoreH, scoreA });
      continue;
    }
    if (Math.random() < hPerMin) {
      const player = pickPlayer(home, "att", homePool);
      const shot = generateShot(true);
      if (Math.random() < hGoalConv * (0.6 + shot.xg * 1.6)) {
        scoreH++;
        events.push({ minute: m, type: "goal", team: home.id, player, detail: tpl(GOAL_TEMPLATES, player), scoreH, scoreA, ...shot });
      } else if (Math.random() < 0.5) {
        events.push({ minute: m, type: "save", team: home.id, player, detail: tpl(SAVE_TEMPLATES, player), scoreH, scoreA, ...shot });
      } else {
        events.push({ minute: m, type: "chance", team: home.id, player, detail: tpl(CHANCE_TEMPLATES, player), scoreH, scoreA, ...shot });
      }
    }
    if (Math.random() < aPerMin) {
      const player = pickPlayer(away, "att", awayPool);
      const shot = generateShot(false);
      if (Math.random() < aGoalConv * (0.6 + shot.xg * 1.6)) {
        scoreA++;
        events.push({ minute: m, type: "goal", team: away.id, player, detail: tpl(GOAL_TEMPLATES, player), scoreH, scoreA, ...shot });
      } else if (Math.random() < 0.5) {
        events.push({ minute: m, type: "save", team: away.id, player, detail: tpl(SAVE_TEMPLATES, player), scoreH, scoreA, ...shot });
      } else {
        events.push({ minute: m, type: "chance", team: away.id, player, detail: tpl(CHANCE_TEMPLATES, player), scoreH, scoreA, ...shot });
      }
    }
    if (Math.random() < yellowProb) {
      const t = Math.random() < 0.5 ? home : away;
      const pool = t === home ? homePool : awayPool;
      const player = pickPlayer(t, "def", pool);
      events.push({ minute: m, type: "yellow", team: t.id, player, detail: tpl(YELLOW_TEMPLATES, player), scoreH, scoreA });
    }
    if (subsHome[0] === m) {
      subsHome.shift();
      const off = pickPlayer(home, "any", homePool);
      let on = pickPlayer(home, "any");
      let tries = 0;
      while ((on === off || usedSubsH.has(on)) && tries < 8) { on = pickPlayer(home, "any"); tries++; }
      usedSubsH.add(on);
      events.push({ minute: m, type: "sub", team: home.id, player: on, detail: `Csere a ${home.name}-nál: ${on} váltja ${off}-t. 🔄`, scoreH, scoreA });
    }
    if (subsAway[0] === m) {
      subsAway.shift();
      const off = pickPlayer(away, "any", awayPool);
      let on = pickPlayer(away, "any");
      let tries = 0;
      while ((on === off || usedSubsA.has(on)) && tries < 8) { on = pickPlayer(away, "any"); tries++; }
      usedSubsA.add(on);
      events.push({ minute: m, type: "sub", team: away.id, player: on, detail: `Csere a ${away.name}-nál: ${on} váltja ${off}-t. 🔄`, scoreH, scoreA });
    }
  }
  events.push({ minute: 90, type: "fulltime", detail: `Vége a mérkőzésnek! Végeredmény: ${home.name} ${scoreH}-${scoreA} ${away.name}.`, scoreH, scoreA });
  return { events, finalH: scoreH, finalA: scoreA };
}
