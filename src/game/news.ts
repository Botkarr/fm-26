import { TEAMS } from "./data";
import type { SeasonState, Fixture } from "./engine";
import { buildTable, topScorers, userDivision, totalRoundsFor } from "./engine";

export type NewsItem = {
  id: string;
  round: number;
  season: number;
  type: "result" | "form" | "scorer" | "position" | "manager" | "milestone";
  icon: string;
  title: string;
  body: string;
  important?: boolean;
};

const teamName = (id: string) => TEAMS.find((t) => t.id === id)?.name ?? id;
const teamShort = (id: string) => TEAMS.find((t) => t.id === id)?.short ?? id;

function userResultsAfter(state: SeasonState, round: number) {
  const played = state.fixtures
    .filter((f) => f.played && (f.home === state.userTeamId || f.away === state.userTeamId))
    .sort((a, b) => a.round - b.round);
  const series = played.map((f) => {
    const isHome = f.home === state.userTeamId;
    const own = isHome ? f.homeGoals! : f.awayGoals!;
    const opp = isHome ? f.awayGoals! : f.homeGoals!;
    return { f, isHome, own, opp, result: own > opp ? "W" : own < opp ? "L" : ("D" as "W" | "L" | "D") };
  });
  return series.filter((x) => x.f.round <= round);
}

/**
 * Generate news items based on what happened in the most recent finished round.
 * Returns NEW items only — caller appends to existing inbox.
 */
export function generateNewsForRound(state: SeasonState, round: number): NewsItem[] {
  const items: NewsItem[] = [];
  const userId = state.userTeamId;
  const userDiv = userDivision(state);
  const table = buildTable(state, userDiv);
  const scorers = topScorers(state, 3, userDiv);
  const userMatch = state.fixtures.find(
    (f) => f.round === round && f.played && (f.home === userId || f.away === userId),
  ) as Fixture | undefined;

  const mk = (
    type: NewsItem["type"],
    icon: string,
    title: string,
    body: string,
    important = false,
  ): NewsItem => ({
    id: `${state.season}-${round}-${type}-${items.length}`,
    round,
    season: state.season,
    type,
    icon,
    title,
    body,
    important,
  });

  // 1. User match result coverage
  if (userMatch) {
    const isHome = userMatch.home === userId;
    const own = isHome ? userMatch.homeGoals! : userMatch.awayGoals!;
    const opp = isHome ? userMatch.awayGoals! : userMatch.homeGoals!;
    const oppId = isHome ? userMatch.away : userMatch.home;
    const margin = own - opp;
    if (margin >= 4) {
      items.push(mk("result", "🔥", "Kiütéses győzelem!", `${teamName(userId)} ${own}–${opp} ${teamName(oppId)} — emlékezetes diadal.`, true));
    } else if (margin <= -4) {
      items.push(mk("result", "💔", "Súlyos vereség", `${teamName(userId)} ${own}–${opp} ${teamName(oppId)} — felejthető nap.`, true));
    } else if (margin > 0) {
      items.push(mk("result", "✅", "Győzelem", `${teamShort(userId)} ${own}–${opp} ${teamShort(oppId)} — három pont a zsebben.`));
    } else if (margin < 0) {
      items.push(mk("result", "❌", "Vereség", `${teamShort(userId)} ${own}–${opp} ${teamShort(oppId)} — pont nélkül távoztunk.`));
    } else {
      items.push(mk("result", "🤝", "Döntetlen", `${teamShort(userId)} ${own}–${opp} ${teamShort(oppId)} — megosztoztunk a pontokon.`));
    }
  }

  // 2. Form streaks (last 3+)
  const series = userResultsAfter(state, round);
  if (series.length >= 3) {
    const last3 = series.slice(-3);
    if (last3.every((x) => x.result === "W")) {
      const last5 = series.slice(-5);
      const winStreak = (() => {
        let n = 0;
        for (let i = series.length - 1; i >= 0; i--) {
          if (series[i].result === "W") n++; else break;
        }
        return n;
      })();
      if (winStreak >= 3 && winStreak !== state.lastWinStreakReported) {
        items.push(mk("form", "🚀", `${winStreak} meccses győzelmi sorozat`, `A ${teamName(userId)} sorozatban ${winStreak} mérkőzést nyert meg.`, winStreak >= 5));
        last5; // ref
      }
    } else if (last3.every((x) => x.result === "L")) {
      const lossStreak = (() => {
        let n = 0;
        for (let i = series.length - 1; i >= 0; i--) {
          if (series[i].result === "L") n++; else break;
        }
        return n;
      })();
      if (lossStreak >= 3 && lossStreak !== state.lastLossStreakReported) {
        items.push(mk("form", "⚠️", `${lossStreak} meccses vereségsorozat`, `A szurkolók türelmetlenek — sürgős fordulat kell a ${teamName(userId)}-nél.`, lossStreak >= 4));
      }
    }
  }

  // 3. Top scorer leader change
  if (scorers.length > 0) {
    const leader = scorers[0];
    if (leader.goals >= 3 && state.lastTopScorerReported !== `${leader.team}|${leader.player}`) {
      items.push(mk(
        "scorer",
        "⚽",
        "Új góllövőlista-vezető",
        `${leader.player} (${teamShort(leader.team)}) átvette a vezetést ${leader.goals} találattal.`,
      ));
    }
  }

  // 4. User position change
  const userIdx = table.findIndex((r) => r.teamId === userId);
  const userPos = userIdx + 1;
  if (state.lastUserPosition && userPos > 0) {
    const delta = state.lastUserPosition - userPos;
    if (delta >= 2) {
      items.push(mk("position", "📈", `Helyezés: ${userPos}.`, `${delta} helyet léptünk előre a tabellán.`));
    } else if (delta <= -2) {
      items.push(mk("position", "📉", `Helyezés: ${userPos}.`, `${-delta} helyet csúsztunk vissza a tabellán.`));
    }
    if (userPos === 1 && state.lastUserPosition !== 1) {
      items.push(mk("position", "👑", "Tabellavezető!", `A ${teamName(userId)} átvette a vezetést a bajnokságban.`, true));
    }
  }

  // 5. Manager comments at thirds of season
  const totalRounds = totalRoundsFor(state);
  if (round === Math.floor(totalRounds / 3) || round === Math.floor((totalRounds * 2) / 3)) {
    const row = table[userIdx];
    const phase = round === Math.floor(totalRounds / 3) ? "első harmad" : "második harmad";
    const tone = userPos <= 3 ? "Élmezőnyben tartózkodunk" : userPos <= 6 ? "Stabil középmezőny" : userPos >= 10 ? "Aggasztó helyzet" : "Több kell";
    items.push(mk("manager", "🎙️", `Edzői kommentár — ${phase}`, `${tone}: ${userPos}. hely, ${row?.pts ?? 0} pont. ${row?.gf ?? 0} rúgott, ${row?.ga ?? 0} kapott gól.`));
  }

  return items;
}

/** Compute a snapshot of metadata used to detect changes between rounds. */
export function newsSnapshot(state: SeasonState): {
  lastUserPosition: number;
  lastTopScorerReported?: string;
  lastWinStreakReported: number;
  lastLossStreakReported: number;
} {
  const userDiv = userDivision(state);
  const table = buildTable(state, userDiv);
  const scorers = topScorers(state, 1, userDiv);
  const userIdx = table.findIndex((r) => r.teamId === state.userTeamId);
  const series = userResultsAfter(state, state.currentRound - 1);
  let winStreak = 0, lossStreak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].result === "W") winStreak++; else break;
  }
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].result === "L") lossStreak++; else break;
  }
  return {
    lastUserPosition: userIdx + 1,
    lastTopScorerReported: scorers[0] ? `${scorers[0].team}|${scorers[0].player}` : undefined,
    lastWinStreakReported: winStreak,
    lastLossStreakReported: lossStreak,
  };
}
