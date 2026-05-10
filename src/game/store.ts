import { useEffect, useState, useCallback } from "react";
import {
  SeasonState,
  createSeason,
  playRound,
  simulateMatch,
  startNextSeason,
  finalizeRound,
  moraleBoost,
  totalRoundsFor,
  divisionRounds,
  userDivision,
  otherDivision,
} from "./engine";
import { TEAMS } from "./data";
import { Tactics, normalizeTactics } from "./tactics";
import {
  CareerState,
  PressTone,
  DressingRoomTone,
  TrainingFocus,
  pressEffect,
  dressingRoomEffect,
  setTrainingFocus as careerSetFocus,
  buyPlayer as careerBuy,
  sellPlayer as careerSell,
  extendContract as careerExtend,
  acceptOffer as careerAcceptOffer,
  rejectOffer as careerRejectOffer,
} from "./career";
import { promoteYouth as youthPromote, demoteToYouth as youthDemote } from "./youth";
import { switchClub as managerSwitchClub } from "./manager";

const KEY = "fm26_season_v11";
const OLD_KEYS = ["fm26_season_v1","fm26_season_v2","fm26_season_v3","fm26_season_v4","fm26_season_v5","fm26_season_v6","fm26_season_v7","fm26_season_v8","fm26_season_v9","fm26_season_v10"];

function isValid(s: SeasonState): boolean {
  const ids = new Set(TEAMS.map((t) => t.id));
  if (!ids.has(s.userTeamId)) return false;
  for (const f of s.fixtures) {
    if (!ids.has(f.home) || !ids.has(f.away)) return false;
  }
  return !!s.career && !!s.manager;
}

function load(): SeasonState | null {
  if (typeof window === "undefined") return null;
  try {
    for (const k of OLD_KEYS) localStorage.removeItem(k);
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SeasonState;
    parsed.tactics = normalizeTactics(parsed.tactics, parsed.userTeamId);
    if (!isValid(parsed)) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch { return null; }
}
function save(s: SeasonState | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
}

export function useSeason() {
  const [state, setState] = useState<SeasonState | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => { setState(load()); setReady(true); }, []);

  const start = useCallback((teamId: string) => {
    const s = createSeason(teamId);
    save(s); setState(s);
  }, []);

  const advance = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      if (prev.currentRound > totalRoundsFor(prev)) return prev;
      const next = playRound(prev);
      save(next);
      return next;
    });
  }, []);

  const finishUserMatch = useCallback((args: {
    home: string;
    away: string;
    homeGoals: number;
    awayGoals: number;
    scorers: { team: string; player: string }[];
  }) => {
    setState((prev) => {
      if (!prev) return prev;
      const round = prev.currentRound;
      const fixtures = prev.fixtures.map((f) => ({ ...f }));
      const otherFixtures = prev.otherFixtures.map((f) => ({ ...f }));
      const scorers = { ...prev.scorers };
      const userBoost = moraleBoost(prev.morale);
      const userTactics = normalizeTactics(prev.tactics, prev.userTeamId);

      for (const f of fixtures) {
        if (f.round !== round || f.played) continue;
        if (f.home === args.home && f.away === args.away) {
          f.homeGoals = args.homeGoals;
          f.awayGoals = args.awayGoals;
          f.played = true;
          f.scorers = args.scorers;
          for (const s of args.scorers) {
            const k = `${s.team}|${s.player}`;
            scorers[k] = (scorers[k] ?? 0) + 1;
          }
        } else {
          const opts: {
            homeMoraleBoost?: number; awayMoraleBoost?: number;
            homeTactics?: Tactics; awayTactics?: Tactics;
          } = {};
          if (f.home === prev.userTeamId) { opts.homeMoraleBoost = userBoost; opts.homeTactics = userTactics; }
          if (f.away === prev.userTeamId) { opts.awayMoraleBoost = userBoost; opts.awayTactics = userTactics; }
          const r = simulateMatch(f.home, f.away, opts);
          f.homeGoals = r.hg;
          f.awayGoals = r.ag;
          f.played = true;
          f.scorers = r.scorers;
          for (const s of r.scorers) {
            const k = `${s.team}|${s.player}`;
            scorers[k] = (scorers[k] ?? 0) + 1;
          }
        }
      }

      const otherDiv = otherDivision(userDivision(prev));
      const otherRounds = divisionRounds(otherDiv);
      let otherCurrent = prev.otherCurrentRound;
      if (otherCurrent <= otherRounds) {
        for (const f of otherFixtures) {
          if (f.round !== otherCurrent || f.played) continue;
          const r = simulateMatch(f.home, f.away);
          f.homeGoals = r.hg; f.awayGoals = r.ag; f.played = true; f.scorers = r.scorers;
          for (const s of r.scorers) {
            const k = `${s.team}|${s.player}`;
            scorers[k] = (scorers[k] ?? 0) + 1;
          }
        }
        otherCurrent = otherCurrent + 1;
      }

      const intermediate: SeasonState = {
        ...prev,
        fixtures,
        otherFixtures,
        scorers,
        currentRound: round + 1,
        otherCurrentRound: otherCurrent,
      };
      const next = finalizeRound(intermediate, round);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => { save(null); setState(null); }, []);

  const nextSeason = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = startNextSeason(prev);
      save(next);
      return next;
    });
  }, []);

  const clearInbox = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, inbox: [] };
      save(next);
      return next;
    });
  }, []);

  const setTactics = useCallback((t: Tactics) => {
    setState((prev) => {
      if (!prev) return prev;
      const tactics = normalizeTactics(t, prev.userTeamId);
      const next = { ...prev, tactics };
      save(next);
      return next;
    });
  }, []);

  /* ============ Career actions ============ */

  const setCareer = (updater: (c: CareerState, prev: SeasonState) => CareerState | null) => {
    setState((prev) => {
      if (!prev) return prev;
      const updated = updater(prev.career, prev);
      if (!updated) return prev;
      const next = { ...prev, career: updated };
      save(next); return next;
    });
  };

  const doPress = useCallback((tone: PressTone) => {
    setState((prev) => {
      if (!prev) return prev;
      const eff = pressEffect(tone);
      const morale = Math.max(15, Math.min(95, prev.morale + eff.moraleDelta));
      const next: SeasonState = {
        ...prev, morale,
        career: { ...prev.career, lastPress: { round: prev.currentRound, tone } },
      };
      save(next); return next;
    });
  }, []);

  const doDressingRoom = useCallback((tone: DressingRoomTone, halfDiff: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const eff = dressingRoomEffect(tone, halfDiff);
      const morale = Math.max(15, Math.min(95, prev.morale + eff.moraleDelta));
      const next: SeasonState = {
        ...prev, morale,
        career: { ...prev.career, lastDressing: { round: prev.currentRound, tone } },
      };
      save(next); return next;
    });
  }, []);

  const setPlayerFocus = useCallback((playerName: string, focus: TrainingFocus) => {
    setCareer((c) => careerSetFocus(c, playerName, focus));
  }, []);

  const buyMarketPlayer = useCallback((marketId: string) => {
    setCareer((c, prev) => {
      const r = careerBuy(c, prev.userTeamId, marketId);
      return r?.career ?? null;
    });
  }, []);

  const sellSquadPlayer = useCallback((playerName: string) => {
    setCareer((c, prev) => {
      const r = careerSell(c, prev.userTeamId, playerName);
      return r?.career ?? null;
    });
  }, []);

  const extendPlayerContract = useCallback((playerName: string, years: number) => {
    setCareer((c, prev) => {
      const r = careerExtend(c, prev.userTeamId, playerName, years);
      return r?.career ?? null;
    });
  }, []);

  const acceptTransferOffer = useCallback((offerId: string) => {
    setCareer((c, prev) => {
      const r = careerAcceptOffer(c, prev.userTeamId, offerId);
      return r?.career ?? null;
    });
  }, []);

  const rejectTransferOffer = useCallback((offerId: string) => {
    setCareer((c) => careerRejectOffer(c, offerId));
  }, []);

  const promoteYouthPlayer = useCallback((name: string) => {
    setCareer((c, prev) => {
      const y = youthPromote(c.youth, prev.userTeamId, name);
      return y ? { ...c, youth: y } : null;
    });
  }, []);

  const demoteToYouthPlayer = useCallback((name: string) => {
    setCareer((c, prev) => {
      const y = youthDemote(c.youth, prev.userTeamId, name);
      return y ? { ...c, youth: y } : null;
    });
  }, []);

  const acceptJobOffer = useCallback((offerId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const offer = prev.manager.jobOffers.find((o) => o.id === offerId);
      if (!offer) return prev;
      const newManager = managerSwitchClub(prev.manager, offer.fromTeamId, prev.userTeamId, prev.season, "left_for_better");
      // Reset season for new club
      const fresh = createSeason(offer.fromTeamId);
      const next: SeasonState = {
        ...fresh,
        season: prev.season + 1,
        history: prev.history,
        achievements: prev.achievements,
        manager: { ...newManager, trophies: prev.manager.trophies, pastClubs: newManager.pastClubs },
      };
      save(next); return next;
    });
  }, []);

  const rejectJobOffer = useCallback((offerId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const next: SeasonState = {
        ...prev,
        manager: { ...prev.manager, jobOffers: prev.manager.jobOffers.filter((o) => o.id !== offerId) },
      };
      save(next); return next;
    });
  }, []);

  return {
    state, ready, start, advance, finishUserMatch, reset, nextSeason, clearInbox, setTactics,
    doPress, doDressingRoom,
    setPlayerFocus, buyMarketPlayer, sellSquadPlayer, extendPlayerContract,
    acceptTransferOffer, rejectTransferOffer,
    promoteYouthPlayer, demoteToYouthPlayer,
    acceptJobOffer, rejectJobOffer,
  };
}
