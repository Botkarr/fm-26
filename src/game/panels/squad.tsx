import { useState } from "react";
import { TEAMS } from "@/game/data";
import { Panel, RatingPill } from "@/game/shared";
import { useSeason } from "@/game/store";
import { TRAINING_FOCUS_LABEL, type TrainingFocus } from "@/game/career";
import { PlayerProfileCard } from "@/game/panels/player-profile";
import { PlayerRadarCompare } from "@/game/panels/player-radar";
import type { PlayerProfile } from "@/game/players/attributes";

export function UserSquadPanel({ teamId }: { teamId: string }) {
  const team = TEAMS.find((t) => t.id === teamId)!;
  const { state, setPlayerFocus, extendPlayerContract, sellSquadPlayer } = useSeason();
  const career = state?.career;
  const [openPlayer, setOpenPlayer] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState<PlayerProfile | null>(null);
  const [compareA, setCompareA] = useState<PlayerProfile | null>(null);
  const [compareB, setCompareB] = useState<PlayerProfile | null>(null);

  const groups: { label: string; pos: "GK" | "DF" | "MF" | "FW" }[] = [
    { label: "Kapus", pos: "GK" },
    { label: "Védő", pos: "DF" },
    { label: "Középpályás", pos: "MF" },
    { label: "Csatár", pos: "FW" },
  ];

  return (
    <Panel title={`Saját keret · ${team.squad.length} fő · keret ${career?.budget ?? 0}M Ft`}>
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.pos}>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{g.label}</div>
            <ul className="space-y-1">
              {team.squad
                .filter((p) => p.pos === g.pos)
                .sort((a, b) => b.rating - a.rating)
                .map((p) => {
                  const cp = career?.players[p.name];
                  const open = openPlayer === p.name;
                  return (
                    <li key={p.name} className="rounded border border-border bg-card/40">
                      <button
                        onClick={() => setOpenPlayer(open ? null : p.name)}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-sm hover:bg-secondary/40"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.age}é</span>
                        </span>
                        <span className="flex items-center gap-2">
                          {cp && cp.trainingFocus !== "none" && (
                            <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">
                              {TRAINING_FOCUS_LABEL[cp.trainingFocus]}
                            </span>
                          )}
                          {cp && (
                            <span className={`text-[10px] font-mono ${cp.contractYears <= 1 ? "text-destructive" : "text-muted-foreground"}`}>
                              {cp.contractYears}é
                            </span>
                          )}
                          <RatingPill r={p.rating} />
                        </span>
                      </button>
                      {open && cp && (
                        <div className="space-y-2 border-t border-border p-2">
                          <div>
                            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">Egyéni edzés</div>
                            <div className="flex flex-wrap gap-1">
                              {(["none", "attack", "defense", "fitness", "technique"] as TrainingFocus[]).map((f) => (
                                <button
                                  key={f}
                                  onClick={() => setPlayerFocus(p.name, f)}
                                  className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                                    cp.trainingFocus === f
                                      ? "bg-primary text-primary-foreground"
                                      : "border border-border bg-secondary text-muted-foreground hover:border-primary"
                                  }`}
                                >
                                  {TRAINING_FOCUS_LABEL[f]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Szerződés: {cp.contractYears} szezon
                            </span>
                            {p.profile && (
                              <button
                                onClick={() => setProfileOpen(p.profile!)}
                                className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                              >
                                Profil
                              </button>
                            )}
                            {p.profile && (
                              <button
                                onClick={() => {
                                  if (!compareA) setCompareA(p.profile!);
                                  else if (compareA.name === p.profile!.name) setCompareA(null);
                                  else setCompareB(p.profile!);
                                }}
                                className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                                  compareA?.name === p.profile.name
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-secondary hover:border-primary"
                                }`}
                                title={compareA ? (compareA.name === p.profile.name ? "Kijelölés törlése" : `Összevet: ${compareA.name}`) : "Kijelölés"}
                              >
                                {compareA?.name === p.profile.name ? "✓ A" : compareA ? "B vs" : "Összevet"}
                              </button>
                            )}
                            <button
                              onClick={() => extendPlayerContract(p.name, 1)}
                              className="rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold hover:border-primary"
                            >
                              +1 év ({Math.round(p.rating * 1.2)}M)
                            </button>
                            <button
                              onClick={() => extendPlayerContract(p.name, 3)}
                              className="rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold hover:border-primary"
                            >
                              +3 év ({Math.round(p.rating * 3.6)}M)
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Eladod: ${p.name}?`)) sellSquadPlayer(p.name);
                              }}
                              className="ml-auto rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-destructive hover:border-destructive"
                            >
                              Eladás
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      {profileOpen && (
        <PlayerProfileCard profile={profileOpen} onClose={() => setProfileOpen(null)} />
      )}
      {compareA && compareB && (
        <PlayerRadarCompare
          a={compareA}
          b={compareB}
          onClose={() => { setCompareA(null); setCompareB(null); }}
        />
      )}
    </Panel>
  );
}
