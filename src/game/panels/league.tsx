import { Link } from "@tanstack/react-router";
import { Panel, TeamBadge, TeamLogo, Empty, Legend, teamName, teamShort } from "@/game/shared";
import type { SeasonState, TableRow } from "@/game/engine";
import type { Division } from "@/game/data";

export function LeagueTablePanel({
  table,
  state,
  division,
  otherDivisionRounds,
}: {
  table: TableRow[];
  state: SeasonState;
  division: Division;
  otherDivisionRounds?: number;
}) {
  void otherDivisionRounds;
  const title = division === "NB1" ? "NB I tabella" : "NB II tabella";
  const promoteCount = division === "NB2" ? 2 : 0;
  const relegateCount = division === "NB1" ? 2 : 0;
  return (
    <Panel title={title}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 text-left">#</th>
              <th className="px-2 py-2 text-left">Csapat</th>
              <th className="px-2 py-2 text-right">M</th>
              <th className="px-2 py-2 text-right">Gy</th>
              <th className="px-2 py-2 text-right">D</th>
              <th className="px-2 py-2 text-right">V</th>
              <th className="px-2 py-2 text-right">RG</th>
              <th className="px-2 py-2 text-right">KG</th>
              <th className="px-2 py-2 text-right">GK</th>
              <th className="px-2 py-2 text-right font-bold text-foreground">P</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r, i) => {
              const isUser = r.teamId === state.userTeamId;
              const isPromote = division === "NB2" && i < promoteCount;
              const isRelegate = division === "NB1" && i >= table.length - relegateCount;
              const zone =
                division === "NB1" && i === 0 ? "border-l-2 border-l-primary" :
                division === "NB1" && i < 3 ? "border-l-2 border-l-accent" :
                isPromote ? "border-l-2 border-l-[color:var(--win)]" :
                isRelegate ? "border-l-2 border-l-destructive" : "border-l-2 border-l-transparent";
              return (
                <tr
                  key={r.teamId}
                  className={`cursor-pointer border-b border-border/50 ${zone} ${isUser ? "bg-primary/10 font-semibold" : "hover:bg-secondary/40"}`}
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    <Link to="/team/$teamId" params={{ teamId: r.teamId }} className="block">{i + 1}</Link>
                  </td>
                  <td className="px-2 py-2">
                    <Link to="/team/$teamId" params={{ teamId: r.teamId }} className="block hover:text-primary">
                      <TeamBadge id={r.teamId} />
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-right">{r.p}</td>
                  <td className="px-2 py-2 text-right">{r.w}</td>
                  <td className="px-2 py-2 text-right">{r.d}</td>
                  <td className="px-2 py-2 text-right">{r.l}</td>
                  <td className="px-2 py-2 text-right">{r.gf}</td>
                  <td className="px-2 py-2 text-right">{r.ga}</td>
                  <td className={`px-2 py-2 text-right ${r.gd > 0 ? "text-[color:var(--win)]" : r.gd < 0 ? "text-[color:var(--loss)]" : ""}`}>
                    {r.gd > 0 ? "+" : ""}{r.gd}
                  </td>
                  <td className="px-2 py-2 text-right text-base font-bold">{r.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        {division === "NB1" && (
          <>
            <Legend color="var(--primary)" label="Bajnok" />
            <Legend color="var(--accent)" label="Európai kupa" />
            <Legend color="var(--destructive)" label="Kiesés (alsó 2)" />
          </>
        )}
        {division === "NB2" && (
          <Legend color="var(--win)" label="Feljutás (felső 2)" />
        )}
      </div>
    </Panel>
  );
}

export function ResultsPanel({
  state, lastRound, division,
}: { state: SeasonState; lastRound: number; division: Division }) {
  const fixtures = division === "NB1"
    ? (state.divisionAssignments[state.userTeamId] === "NB1" ? state.fixtures : state.otherFixtures)
    : (state.divisionAssignments[state.userTeamId] === "NB2" ? state.fixtures : state.otherFixtures);
  const lastResults = fixtures.filter((f) => f.round === lastRound && f.played);
  return (
    <Panel title={`${lastRound > 0 ? `${lastRound}. forduló eredményei` : "Eredmények"}`}>
      {lastResults.length === 0 ? (
        <Empty text="Még nincsenek eredmények ebben a fordulóban." />
      ) : (
        <ul className="divide-y divide-border/60">
          {lastResults.map((f, i) => {
            const userInvolved = f.home === state.userTeamId || f.away === state.userTeamId;
            return (
              <li key={i} className={`flex items-center gap-3 py-2 text-sm ${userInvolved ? "bg-primary/5 -mx-2 px-2 rounded" : ""}`}>
                <div className="flex flex-1 items-center justify-end gap-2 truncate">
                  <span className="truncate">{teamName(f.home)}</span>
                  <TeamLogo id={f.home} size={16} />
                </div>
                <span className="rounded bg-secondary px-2 py-1 font-mono text-xs font-bold">
                  {f.homeGoals} – {f.awayGoals}
                </span>
                <div className="flex flex-1 items-center gap-2 truncate">
                  <TeamLogo id={f.away} size={16} />
                  <span className="truncate">{teamName(f.away)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function FixturesPanel({
  state, currentRound, division,
}: { state: SeasonState; currentRound: number; division: Division }) {
  const userDiv = state.divisionAssignments[state.userTeamId] ?? "NB1";
  const fixtures = division === userDiv ? state.fixtures : state.otherFixtures;
  const round = division === userDiv ? currentRound : state.otherCurrentRound;
  const nextFixtures = fixtures.filter((f) => f.round === round);
  return (
    <Panel title={`${round}. forduló sorsolása`}>
      {nextFixtures.length === 0 ? (
        <Empty text="Nincs több forduló." />
      ) : (
        <ul className="divide-y divide-border/60">
          {nextFixtures.map((f, i) => {
            const userInvolved = f.home === state.userTeamId || f.away === state.userTeamId;
            return (
              <li key={i} className={`flex items-center gap-3 py-2 text-sm ${userInvolved ? "font-semibold text-primary" : ""}`}>
                <span className="flex-1 truncate text-right">{teamShort(f.home)}</span>
                <span className="text-xs text-muted-foreground">vs</span>
                <span className="flex-1 truncate">{teamShort(f.away)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function ScorersPanel({
  scorers, headerExtra,
}: {
  scorers: { team: string; player: string; goals: number }[];
  headerExtra?: React.ReactNode;
}) {
  return (
    <Panel title="Góllövőlista" action={headerExtra}>
      {scorers.length === 0 ? (
        <Empty text="Még nincs gól a szezonban." />
      ) : (
        <ol className="divide-y divide-border/60">
          {scorers.map((s, i) => (
            <li key={i} className="flex items-center gap-2 py-2 text-sm">
              <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
              <TeamLogo id={s.team} size={14} />
              <span className="flex-1 truncate">{s.player}</span>
              <span className="text-xs text-muted-foreground">{teamShort(s.team)}</span>
              <span className="w-8 text-right font-mono font-bold">{s.goals}</span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
