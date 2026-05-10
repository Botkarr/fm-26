import { useMemo, useState } from "react";
import { TEAMS } from "@/game/data";
import {
  Tactics,
  FormationId,
  Mentality,
  FORMATION_LIST,
  MENTALITY_LIST,
  FORMATIONS,
  FORMATION_LABEL,
  MENTALITY_LABEL,
  autoLineup,
  normalizeTactics,
  tacticalModifiers,
} from "@/game/tactics";
import { TeamLogo, RatingPill, teamName } from "@/game/shared";

type Pos = "GK" | "DF" | "MF" | "FW";

export function TacticsBoard({
  teamId,
  initial,
  onConfirm,
  opponentId,
  userIsHome,
}: {
  teamId: string;
  initial: Tactics;
  onConfirm: (t: Tactics) => void;
  opponentId: string;
  userIsHome: boolean;
}) {
  const team = TEAMS.find((t) => t.id === teamId)!;
  const [tactics, setTactics] = useState<Tactics>(() => normalizeTactics(initial, teamId));

  const lineupSet = useMemo(() => new Set(tactics.lineup), [tactics.lineup]);
  const shape = FORMATIONS[tactics.formation];

  const lineupPlayersByPos: Record<Pos, { name: string; rating: number }[]> = useMemo(() => {
    const out: Record<Pos, { name: string; rating: number }[]> = { GK: [], DF: [], MF: [], FW: [] };
    for (const name of tactics.lineup) {
      const p = team.squad.find((q) => q.name === name);
      if (p) out[p.pos].push({ name: p.name, rating: p.rating });
    }
    return out;
  }, [tactics.lineup, team]);

  const setFormation = (f: FormationId) => {
    setTactics((prev) => ({ ...prev, formation: f, lineup: autoLineup(team, f) }));
  };
  const setMentality = (m: Mentality) => setTactics((prev) => ({ ...prev, mentality: m }));

  const togglePlayer = (name: string) => {
    const player = team.squad.find((p) => p.name === name);
    if (!player) return;
    setTactics((prev) => {
      const inLine = prev.lineup.includes(name);
      if (inLine) {
        return { ...prev, lineup: prev.lineup.filter((n) => n !== name) };
      }
      // Adding: check shape constraint for that pos
      const counts: Record<Pos, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
      for (const ln of prev.lineup) {
        const lp = team.squad.find((q) => q.name === ln);
        if (lp) counts[lp.pos]++;
      }
      const max = FORMATIONS[prev.formation][player.pos];
      if (counts[player.pos] >= max) {
        // Replace lowest-rated of same pos
        const sameLine = prev.lineup
          .map((n) => team.squad.find((q) => q.name === n))
          .filter((p): p is typeof player => !!p && p.pos === player.pos)
          .sort((a, b) => a.rating - b.rating);
        const removeName = sameLine[0]?.name;
        if (!removeName) return prev;
        return { ...prev, lineup: [...prev.lineup.filter((n) => n !== removeName), name] };
      }
      return { ...prev, lineup: [...prev.lineup, name] };
    });
  };

  const counts: Record<Pos, number> = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const ln of tactics.lineup) {
    const lp = team.squad.find((q) => q.name === ln);
    if (lp) counts[lp.pos]++;
  }
  const valid = (Object.keys(shape) as Pos[]).every((pos) => counts[pos] === shape[pos])
    && tactics.lineup.length === 11;

  const mods = tacticalModifiers(tactics, team);
  const attPct = Math.round(mods.attack * 100);
  const defPct = Math.round(mods.defense * 100);

  const groups: { label: string; pos: Pos }[] = [
    { label: "Kapus", pos: "GK" },
    { label: "Védő", pos: "DF" },
    { label: "Középpályás", pos: "MF" },
    { label: "Csatár", pos: "FW" },
  ];

  return (
    <div className="space-y-4">
      {/* Match header */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {userIsHome ? "Hazai pálya" : "Idegenben"} · taktika
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-1 text-center">
            <TeamLogo id={userIsHome ? teamId : opponentId} size={40} />
            <span className="text-sm font-bold">{teamName(userIsHome ? teamId : opponentId)}</span>
          </div>
          <span className="text-2xl font-bold text-muted-foreground">VS</span>
          <div className="flex flex-col items-center gap-1 text-center">
            <TeamLogo id={userIsHome ? opponentId : teamId} size={40} />
            <span className="text-sm font-bold">{teamName(userIsHome ? opponentId : teamId)}</span>
          </div>
        </div>
      </div>

      {/* Formation */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Formáció</div>
        <div className="flex flex-wrap gap-2">
          {FORMATION_LIST.map((f) => (
            <button
              key={f}
              onClick={() => setFormation(f)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                tactics.formation === f
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/60"
              }`}
            >
              <div>{f}</div>
              <div className="text-[10px] font-normal text-muted-foreground">{FORMATION_LABEL[f].split("·")[1]?.trim()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Mentality */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mentalitás</div>
        <div className="grid grid-cols-3 gap-2">
          {MENTALITY_LIST.map((m) => (
            <button
              key={m}
              onClick={() => setMentality(m)}
              className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                tactics.mentality === m
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-secondary-foreground hover:border-primary/60"
              }`}
            >
              {MENTALITY_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded border border-border bg-secondary/50 p-2">
            <div className="text-muted-foreground">Támadás módosító</div>
            <div className={`font-mono font-bold ${attPct > 0 ? "text-[color:var(--win)]" : attPct < 0 ? "text-destructive" : ""}`}>
              {attPct > 0 ? "+" : ""}{attPct}%
            </div>
          </div>
          <div className="rounded border border-border bg-secondary/50 p-2">
            <div className="text-muted-foreground">Védekezés módosító</div>
            <div className={`font-mono font-bold ${defPct > 0 ? "text-[color:var(--win)]" : defPct < 0 ? "text-destructive" : ""}`}>
              {defPct > 0 ? "+" : ""}{defPct}%
            </div>
          </div>
        </div>
      </div>

      {/* Lineup */}
      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Kezdő XI · {tactics.lineup.length} / 11
          </div>
          <button
            onClick={() => setTactics((prev) => ({ ...prev, lineup: autoLineup(team, prev.formation) }))}
            className="rounded border border-border bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground hover:border-primary"
          >
            ⚡ Auto-választás
          </button>
        </div>

        <div className="space-y-3">
          {groups.map((g) => {
            const need = shape[g.pos];
            const got = counts[g.pos];
            const players = [...team.squad].filter((p) => p.pos === g.pos).sort((a, b) => b.rating - a.rating);
            return (
              <div key={g.pos}>
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground">{g.label}</span>
                  <span className={`font-mono font-bold ${got === need ? "text-[color:var(--win)]" : "text-destructive"}`}>
                    {got} / {need}
                  </span>
                </div>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {players.map((p) => {
                    const picked = lineupSet.has(p.name);
                    const posFull = counts[p.pos] >= need && !picked;
                    return (
                      <li key={p.name}>
                        <button
                          onClick={() => togglePlayer(p.name)}
                          className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-1.5 text-left text-sm transition ${
                            picked
                              ? "border-primary bg-primary/10"
                              : posFull
                                ? "border-border bg-card text-muted-foreground hover:border-primary/40"
                                : "border-border bg-secondary/60 hover:border-primary/60"
                          }`}
                          title={posFull ? "Cseréli a leggyengébb azonos posztos játékost" : ""}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <span className={`inline-block h-2 w-2 rounded-full ${picked ? "bg-primary" : "bg-muted-foreground/40"}`} />
                            <span className="truncate">{p.name}</span>
                          </span>
                          <RatingPill r={p.rating} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Visualisation */}
        <div className="mt-4 rounded-md border border-border bg-[color:var(--win)]/5 p-3">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">Pálya nézet</div>
          <div className="space-y-2">
            {(["FW", "MF", "DF", "GK"] as Pos[]).map((pos) => {
              const arr = lineupPlayersByPos[pos];
              if (arr.length === 0 && shape[pos] === 0) return null;
              return (
                <div key={pos} className="flex flex-wrap items-center justify-center gap-1.5">
                  {arr.map((p) => (
                    <span key={p.name} className="rounded-full border border-primary/40 bg-card px-2.5 py-1 text-[11px] font-semibold">
                      {p.name.split(" ")[0]} <span className="text-muted-foreground">({p.rating})</span>
                    </span>
                  ))}
                  {Array.from({ length: Math.max(0, shape[pos] - arr.length) }).map((_, i) => (
                    <span key={i} className="rounded-full border border-dashed border-destructive/50 px-2.5 py-1 text-[11px] text-destructive">
                      üres
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirm */}
      <div className="flex justify-end">
        <button
          onClick={() => onConfirm(tactics)}
          disabled={!valid}
          className="rounded-md bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▶ Sípszó · Meccs indítása
        </button>
      </div>
    </div>
  );
}
