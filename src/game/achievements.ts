import type { SeasonState } from "./engine";
import { buildTable, topScorers, totalRoundsFor, userDivision } from "./engine";

export type Achievement = {
  id: string;
  icon: string;
  name: string;
  description: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win",        icon: "🎉", name: "Első győzelem",     description: "Nyerd meg az első meccsedet." },
  { id: "win_streak_5",     icon: "🚀", name: "Hot streak",        description: "5 győzelem zsinórban." },
  { id: "win_streak_10",    icon: "🌋", name: "Megállíthatatlan",  description: "10 győzelem zsinórban." },
  { id: "big_win",          icon: "💥", name: "Kiütés",            description: "4+ gól különbséggel nyerj." },
  { id: "clean_sheet",      icon: "🛡️", name: "Bevehetetlen",     description: "Nyerj meccset úgy, hogy nem kapsz gólt." },
  { id: "fifty_goals",      icon: "⚽", name: "Gólgyártó",         description: "50+ rúgott gól egy szezonban." },
  { id: "top_scorer",       icon: "👟", name: "Góllövőkirály",     description: "A te csapatod adja a szezon gólkirályát." },
  { id: "europe",           icon: "🌍", name: "Európában",         description: "Top 3-ban végezz a szezon végén." },
  { id: "champion",         icon: "🏆", name: "Bajnok",            description: "Nyerd meg a bajnokságot." },
  { id: "back_to_back",     icon: "👑", name: "Bajnoki dinasztia", description: "Két szezon zsinórban bajnok." },
  { id: "invincible",       icon: "💎", name: "Veretlen",          description: "Veretlenül zárd a szezont." },
];

/**
 * Check which NEW achievements should be unlocked based on current state.
 * Returns achievement IDs not already in state.achievements.
 */
export function checkAchievements(state: SeasonState): string[] {
  const have = new Set(state.achievements);
  const newly: string[] = [];
  const userId = state.userTeamId;
  const userPlayed = state.fixtures.filter((f) => f.played && (f.home === userId || f.away === userId));
  const results = userPlayed.map((f) => {
    const isHome = f.home === userId;
    const own = isHome ? f.homeGoals! : f.awayGoals!;
    const opp = isHome ? f.awayGoals! : f.homeGoals!;
    return { own, opp, win: own > opp, draw: own === opp, loss: own < opp, margin: own - opp, cleanSheet: opp === 0 };
  });
  const wins = results.filter((r) => r.win).length;
  const losses = results.filter((r) => r.loss).length;
  const goalsFor = results.reduce((s, r) => s + r.own, 0);

  const unlock = (id: string) => { if (!have.has(id)) newly.push(id); };

  if (wins >= 1) unlock("first_win");
  if (results.some((r) => r.win && r.margin >= 4)) unlock("big_win");
  if (results.some((r) => r.win && r.cleanSheet)) unlock("clean_sheet");

  // Win streak
  let cur = 0, best = 0;
  for (const r of results) {
    if (r.win) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  if (best >= 5) unlock("win_streak_5");
  if (best >= 10) unlock("win_streak_10");

  // Goals
  if (goalsFor >= 50) unlock("fifty_goals");

  // Season-end achievements
  const total = totalRoundsFor(state);
  const userDiv = userDivision(state);
  const seasonOver = state.currentRound > total;
  if (seasonOver) {
    const table = buildTable(state, userDiv);
    const userIdx = table.findIndex((r) => r.teamId === userId);
    if (userIdx === 0) {
      unlock("champion");
      const prevSeason = state.history[state.history.length - 1];
      if (prevSeason && prevSeason.championId === userId) unlock("back_to_back");
    }
    if (userIdx >= 0 && userIdx < 3) unlock("europe");
    if (losses === 0 && results.length === total) unlock("invincible");
    const top = topScorers(state, 1, userDiv)[0];
    if (top && top.team === userId) unlock("top_scorer");
  }

  return newly;
}
