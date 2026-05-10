import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { TEAMS, getTeam, teamStrength } from "@/game/data";
import { teamLogo } from "@/game/logos";
import { useSeason } from "@/game/store";
import { buildTable, userDivision, otherDivision } from "@/game/engine";

export const Route = createFileRoute("/team/$teamId")({
  component: TeamPage,
  notFoundComponent: () => (
    <Centered>
      <p className="mb-3 text-muted-foreground">Ilyen csapat nem létezik.</p>
      <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Vissza</Link>
    </Centered>
  ),
  loader: ({ params }) => {
    if (!getTeam(params.teamId)) throw notFound();
    return null;
  },
});

function teamShort(id: string) { return TEAMS.find((t) => t.id === id)?.short ?? id; }
function teamName(id: string) { return TEAMS.find((t) => t.id === id)?.name ?? id; }
function teamColor(id: string) { return TEAMS.find((t) => t.id === id)?.color ?? "var(--muted)"; }

function TeamPage() {
  const { teamId } = Route.useParams();
  const team = getTeam(teamId)!;
  const { state, ready } = useSeason();
  const logo = teamLogo(teamId);

  const { table, row, position, played, form, recent, upcoming, topScorers, posSeries, h2h } = useMemo(() => {
    if (!state) return { table: [], row: null, position: 0, played: [], form: [], recent: [], upcoming: [], topScorers: [], posSeries: [] as { round: number; pos: number; pts: number }[], h2h: [] as { oppId: string; w: number; d: number; l: number; gf: number; ga: number }[] };
    // Determine which division this team is in for the current season, then pull
    // the corresponding fixtures/table from state.
    const teamDiv = state.divisionAssignments[teamId] ?? "NB1";
    const isUserDiv = teamDiv === userDivision(state);
    const fixtures = isUserDiv ? state.fixtures : state.otherFixtures;
    const table = buildTable(state, teamDiv);
    const idx = table.findIndex((r) => r.teamId === teamId);
    const row = idx >= 0 ? table[idx] : null;
    const played = fixtures
      .filter((f) => f.played && (f.home === teamId || f.away === teamId))
      .sort((a, b) => a.round - b.round);
    const form = played.slice(-5).map((f) => {
      const isHome = f.home === teamId;
      const own = isHome ? f.homeGoals! : f.awayGoals!;
      const opp = isHome ? f.awayGoals! : f.homeGoals!;
      return own > opp ? "W" : own < opp ? "L" : "D";
    });
    const recent = played.slice(-5).reverse();
    const upcoming = fixtures
      .filter((f) => !f.played && (f.home === teamId || f.away === teamId))
      .slice(0, 5);
    // Suppress unused-var lint for otherDivision import — referenced for future use
    void otherDivision;
    const scorerCounts: Record<string, number> = {};
    for (const [k, n] of Object.entries(state.scorers)) {
      const [t, p] = k.split("|");
      if (t === teamId) scorerCounts[p] = (scorerCounts[p] ?? 0) + n;
    }
    const topScorers = Object.entries(scorerCounts)
      .map(([player, goals]) => ({ player, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);

    // Position series from roundHistory
    const posSeries = state.roundHistory
      .map((snap, i) => ({ round: i + 1, ...(snap[teamId] ?? { pos: 0, pts: 0 }) }))
      .filter((x) => x.pos > 0);

    // Head-to-head per opponent (current season)
    const h2hMap = new Map<string, { w: number; d: number; l: number; gf: number; ga: number }>();
    for (const f of played) {
      const isHome = f.home === teamId;
      const oppId = isHome ? f.away : f.home;
      const own = isHome ? f.homeGoals! : f.awayGoals!;
      const opp = isHome ? f.awayGoals! : f.homeGoals!;
      const cur = h2hMap.get(oppId) ?? { w: 0, d: 0, l: 0, gf: 0, ga: 0 };
      cur.gf += own; cur.ga += opp;
      if (own > opp) cur.w++; else if (own < opp) cur.l++; else cur.d++;
      h2hMap.set(oppId, cur);
    }
    const h2h = Array.from(h2hMap.entries())
      .map(([oppId, s]) => ({ oppId, ...s }))
      .sort((a, b) => (b.w * 3 + b.d) - (a.w * 3 + a.d));

    return { table, row, position: idx + 1, played, form, recent, upcoming, topScorers, posSeries, h2h };
  }, [state, teamId]);

  if (!ready) return <div className="min-h-screen bg-background" />;

  const groups: { label: string; pos: "GK" | "DF" | "MF" | "FW" }[] = [
    { label: "Kapus", pos: "GK" },
    { label: "Védő", pos: "DF" },
    { label: "Középpályás", pos: "MF" },
    { label: "Csatár", pos: "FW" },
  ];

  const isUserTeam = state?.userTeamId === teamId;
  const strength = Math.round(teamStrength(team) * 10) / 10;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Vissza a tabellára</Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Csapat profil</span>
          <div className="w-32" />
        </div>
      </header>

      {/* Hero */}
      <section
        className="border-b border-border"
        style={{
          background: `linear-gradient(135deg, color-mix(in oklab, ${team.color} 30%, transparent), transparent 60%), var(--card)`,
        }}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:items-center">
          {logo ? (
            <img src={logo} alt={`${team.name} címer`} className="h-24 w-24 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]" />
          ) : (
            <div className="h-24 w-24 rounded-md border border-border" style={{ backgroundColor: team.color }} />
          )}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground sm:justify-start">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: team.color }} />
              <span>{team.short} · {team.city}</span>
              {isUserTeam && <span className="rounded-full bg-primary/20 px-2 py-0.5 font-bold text-primary">Saját csapat</span>}
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{team.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Vezetőedző: <span className="font-semibold text-foreground">{team.manager}</span>
              {" · "}Alapítva: <span className="font-semibold text-foreground">{team.founded}</span>
              {" · "}Stadion: <span className="font-semibold text-foreground">{team.stadium}</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:gap-5">
            <Stat label="Helyezés" value={position ? `${position}.` : "—"} />
            <Stat label="Pont" value={`${row?.pts ?? 0}`} />
            <Stat label="Kerei erő" value={`${strength}`} />
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-3">
        {/* Squad */}
        <section className="lg:col-span-2">
          <Panel title="Teljes keret">
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map((g) => {
                const players = team.squad.filter((p) => p.pos === g.pos).sort((a, b) => b.rating - a.rating);
                return (
                  <div key={g.pos}>
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                      <span>{g.label}</span>
                      <span className="text-foreground/40">{players.length}</span>
                    </div>
                    <ul className="space-y-1">
                      {players.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded border border-border/40 bg-secondary/30 px-2 py-1.5 text-sm">
                          <span className="flex items-center gap-2 truncate">
                            <span className="w-5 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                            <span className="truncate">{p.name}</span>
                          </span>
                          <RatingPill r={p.rating} />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Panel>
        </section>

        {/* Side */}
        <aside className="space-y-4">
          <Panel title="Klub adatok">
            <dl className="space-y-2 text-sm">
              <Row label="Város" value={team.city} />
              <Row label="Stadion" value={team.stadium} />
              <Row label="Alapítva" value={String(team.founded)} />
              <Row label="Vezetőedző" value={team.manager} />
              <Row
                label="Klubszín"
                value={
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 rounded-sm border border-border/60" style={{ backgroundColor: team.color }} />
                    <span className="font-mono text-xs text-muted-foreground">{team.color}</span>
                  </span>
                }
              />
            </dl>
          </Panel>

          <Panel title="Szezonbeli forma">
            {!state ? (
              <Empty text="Nincs futó szezon." />
            ) : form.length === 0 ? (
              <Empty text="Még nincs lejátszott meccs." />
            ) : (
              <>
                <div className="mb-3 flex items-center gap-1.5">
                  {form.map((r, i) => (
                    <span
                      key={i}
                      className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold ${
                        r === "W" ? "bg-[color:var(--win)]/20 text-[color:var(--win)]" :
                        r === "D" ? "bg-[color:var(--draw)]/20 text-[color:var(--draw)]" :
                        "bg-[color:var(--loss)]/20 text-[color:var(--loss)]"
                      }`}
                      title={r === "W" ? "Győzelem" : r === "D" ? "Döntetlen" : "Vereség"}
                    >
                      {r === "W" ? "Gy" : r === "D" ? "D" : "V"}
                    </span>
                  ))}
                </div>
                {row && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <MiniStat label="M" value={row.p} />
                    <MiniStat label="Gy" value={row.w} />
                    <MiniStat label="D" value={row.d} />
                    <MiniStat label="V" value={row.l} />
                  </div>
                )}
              </>
            )}
          </Panel>

          {posSeries.length >= 2 && (
            <Panel title="Helyezés alakulása">
              <PositionSparkline series={posSeries} totalTeams={table.length} />
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>F1</span>
                <span>{posSeries[posSeries.length - 1]?.pts ?? 0} pont</span>
                <span>F{posSeries[posSeries.length - 1]?.round ?? 0}</span>
              </div>
            </Panel>
          )}

          {h2h.length > 0 && (
            <Panel title="Fej-fej elleni (jelen szezon)">
              <ul className="divide-y divide-border/60">
                {h2h.map((x) => (
                  <li key={x.oppId} className="flex items-center gap-2 py-1.5 text-sm">
                    <Link
                      to="/team/$teamId"
                      params={{ teamId: x.oppId }}
                      className="flex flex-1 items-center gap-2 truncate hover:text-primary"
                    >
                      <span className="truncate">{teamShort(x.oppId)}</span>
                    </Link>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {x.w}-{x.d}-{x.l}
                    </span>
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold tabular-nums">
                      {x.gf}–{x.ga}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Utolsó meccsek">
            {recent.length === 0 ? (
              <Empty text="Még nincsenek eredmények." />
            ) : (
              <ul className="divide-y divide-border/60">
                {recent.map((f, i) => {
                  const isHome = f.home === teamId;
                  const own = isHome ? f.homeGoals! : f.awayGoals!;
                  const opp = isHome ? f.awayGoals! : f.homeGoals!;
                  const oppId = isHome ? f.away : f.home;
                  const result = own > opp ? "W" : own < opp ? "L" : "D";
                  return (
                    <li key={i} className="flex items-center gap-2 py-2 text-sm">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        result === "W" ? "bg-[color:var(--win)]" :
                        result === "D" ? "bg-[color:var(--draw)]" :
                        "bg-[color:var(--loss)]"
                      }`} />
                      <span className="text-xs text-muted-foreground">{isHome ? "H" : "I"}</span>
                      <Link
                        to="/team/$teamId"
                        params={{ teamId: oppId }}
                        className="flex-1 truncate hover:text-primary"
                      >
                        {teamName(oppId)}
                      </Link>
                      <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-bold">
                        {own}–{opp}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {upcoming.length > 0 && (
            <Panel title="Következő meccsek">
              <ul className="divide-y divide-border/60">
                {upcoming.map((f, i) => {
                  const isHome = f.home === teamId;
                  const oppId = isHome ? f.away : f.home;
                  return (
                    <li key={i} className="flex items-center gap-2 py-2 text-sm">
                      <span className="w-8 font-mono text-xs text-muted-foreground">{f.round}.</span>
                      <span className="text-xs text-muted-foreground">{isHome ? "H" : "I"}</span>
                      <Link
                        to="/team/$teamId"
                        params={{ teamId: oppId }}
                        className="flex-1 truncate hover:text-primary"
                      >
                        {teamShort(oppId)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {topScorers.length > 0 && (
            <Panel title="Csapat góllövői">
              <ol className="divide-y divide-border/60">
                {topScorers.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 py-2 text-sm">
                    <span className="w-5 text-right text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 truncate">{s.player}</span>
                    <span className="w-8 text-right font-mono font-bold">{s.goals}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </aside>
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/40 bg-secondary/30 py-1.5">
      <div className="font-mono text-base font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-b-0">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function RatingPill({ r }: { r: number }) {
  const tone =
    r >= 80 ? "bg-[color:var(--win)]/20 text-[color:var(--win)]" :
    r >= 70 ? "bg-accent/20 text-accent" :
    r >= 60 ? "bg-secondary text-secondary-foreground" :
    "bg-muted text-muted-foreground";
  return <span className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${tone}`}>{r}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">{children}</div>
    </div>
  );
}

function PositionSparkline({
  series,
  totalTeams,
}: {
  series: { round: number; pos: number; pts: number }[];
  totalTeams: number;
}) {
  const W = 280;
  const H = 80;
  const PAD = 6;
  const xs = series.map((_, i) => PAD + (i / Math.max(1, series.length - 1)) * (W - 2 * PAD));
  // Position 1 = top (good), totalTeams = bottom (bad)
  const ys = series.map((s) => PAD + ((s.pos - 1) / Math.max(1, totalTeams - 1)) * (H - 2 * PAD));
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-20 w-full" preserveAspectRatio="none">
        {/* Top 3 zone */}
        <rect x={0} y={0} width={W} height={(2 / Math.max(1, totalTeams - 1)) * (H - 2 * PAD) + PAD} fill="var(--accent)" opacity={0.08} />
        {/* Bottom 2 zone */}
        <rect
          x={0}
          y={H - PAD - (1 / Math.max(1, totalTeams - 1)) * (H - 2 * PAD)}
          width={W}
          height={H}
          fill="var(--destructive)"
          opacity={0.08}
        />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r={3.5} fill="var(--primary)" />
      </svg>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Aktuális</span>
        <span className="text-2xl font-bold tabular-nums">{last?.pos}.</span>
      </div>
    </div>
  );
}
