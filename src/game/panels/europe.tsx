import { Panel, TeamLogo, teamName, Empty } from "@/game/shared";
import { useSeason } from "@/game/store";
import {
  EUROPE_LABEL,
  EUROPE_SHORT,
  EUROPE_STAGE_NAME,
  buildEuropeGroupTable,
  participantName,
  participantShort,
  findParticipant,
  type EuropeState,
} from "@/game/europe";

export function EuropePanel() {
  const { state } = useSeason();
  if (!state) return null;
  const e = state.europe;
  if (!e) {
    return (
      <Panel title="Európai kupa">
        <Empty text="Nem kvalifikáltatok európai kupára. NB I 1. → BL, 2-3. → EL, kupa-győztes → EL." />
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      <Panel title={`${EUROPE_LABEL[e.competition]} (${EUROPE_SHORT[e.competition]}) — ${EUROPE_STAGE_NAME[e.stage]}`}>
        <p className="text-xs text-muted-foreground">
          Csoportkör: 8 csapat, 7 forduló. Top 4 → elődöntő, majd döntő.
        </p>
      </Panel>

      <Panel title="Csoporttabella">
        <GroupTable e={e} userTeamId={state.userTeamId} />
      </Panel>

      <Panel title="Csoportkör — meccsek">
        <GroupMatches e={e} userTeamId={state.userTeamId} />
      </Panel>

      {e.knockoutMatches.length > 0 && (
        <Panel title="Kieséses szakasz">
          <KnockoutList e={e} userTeamId={state.userTeamId} />
        </Panel>
      )}
    </div>
  );
}

function GroupTable({ e, userTeamId }: { e: EuropeState; userTeamId: string }) {
  const rows = buildEuropeGroupTable(e);
  return (
    <table className="w-full text-sm">
      <thead className="text-[10px] uppercase tracking-widest text-muted-foreground">
        <tr>
          <th className="px-1 py-1 text-left">#</th>
          <th className="px-1 py-1 text-left">Csapat</th>
          <th className="px-1 py-1 text-right">M</th>
          <th className="px-1 py-1 text-right">Gy</th>
          <th className="px-1 py-1 text-right">D</th>
          <th className="px-1 py-1 text-right">V</th>
          <th className="px-1 py-1 text-right">GF:GA</th>
          <th className="px-1 py-1 text-right font-bold">P</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const p = findParticipant(e, r.participantId);
          const isUser = r.participantId === userTeamId;
          const cut = i < 4 ? "border-l-2 border-primary/60" : "";
          return (
            <tr key={r.participantId} className={`${isUser ? "bg-primary/10 font-semibold" : ""} ${cut}`}>
              <td className="px-1 py-1 font-mono text-muted-foreground">{i + 1}</td>
              <td className="px-1 py-1">
                <span className="inline-flex items-center gap-1.5">
                  {p?.kind === "user" ? <TeamLogo id={userTeamId} size={16} /> : <span className="text-base">{p?.club.flag}</span>}
                  <span className="truncate">{p ? participantName(p) : r.participantId}</span>
                </span>
              </td>
              <td className="px-1 py-1 text-right tabular-nums">{r.p}</td>
              <td className="px-1 py-1 text-right tabular-nums">{r.w}</td>
              <td className="px-1 py-1 text-right tabular-nums">{r.d}</td>
              <td className="px-1 py-1 text-right tabular-nums">{r.l}</td>
              <td className="px-1 py-1 text-right tabular-nums text-muted-foreground">{r.gf}:{r.ga}</td>
              <td className="px-1 py-1 text-right font-bold tabular-nums">{r.pts}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function GroupMatches({ e, userTeamId }: { e: EuropeState; userTeamId: string }) {
  const byRound: Record<number, typeof e.groupMatches> = {};
  for (const m of e.groupMatches) (byRound[m.round] ||= []).push(m);
  return (
    <div className="space-y-3">
      {Object.keys(byRound).map(Number).sort((a, b) => a - b).map((r) => (
        <div key={r}>
          <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{r}. forduló</div>
          <ul className="space-y-1">
            {byRound[r].map((m) => {
              const isUser = m.homeId === userTeamId || m.awayId === userTeamId;
              return (
                <li
                  key={m.id}
                  className={`flex items-center justify-between gap-2 rounded border px-2 py-1.5 text-xs ${
                    isUser ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/40"
                  }`}
                >
                  <ParticipantLabel id={m.homeId} e={e} userTeamId={userTeamId} />
                  <span className="font-mono font-bold tabular-nums">
                    {m.played ? `${m.homeGoals}-${m.awayGoals}` : "—"}
                  </span>
                  <ParticipantLabel id={m.awayId} e={e} userTeamId={userTeamId} reverse />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function KnockoutList({ e, userTeamId }: { e: EuropeState; userTeamId: string }) {
  return (
    <ul className="space-y-2">
      {e.knockoutMatches.map((m) => {
        const isUser = m.homeId === userTeamId || m.awayId === userTeamId;
        const label = m.id <= 1 ? "Elődöntő" : "Döntő";
        return (
          <li key={m.id}
            className={`rounded border p-3 ${isUser ? "border-primary/50 bg-primary/10" : "border-border/60 bg-card/40"}`}>
            <div className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <ParticipantLabel id={m.homeId} e={e} userTeamId={userTeamId} />
              <span className="font-mono text-lg font-bold tabular-nums">
                {m.played ? `${m.homeGoals}-${m.awayGoals}` : "vs"}
              </span>
              <ParticipantLabel id={m.awayId} e={e} userTeamId={userTeamId} reverse />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ParticipantLabel({ id, e, userTeamId, reverse }: { id: string; e: EuropeState; userTeamId: string; reverse?: boolean }) {
  const p = findParticipant(e, id);
  const name = p ? participantShort(p) : id;
  const flag = p?.kind === "fake" ? p.club.flag : null;
  const logo = p?.kind === "user" ? <TeamLogo id={userTeamId} size={16} /> : <span>{flag}</span>;
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-1.5 ${reverse ? "flex-row-reverse text-right" : ""}`}>
      {logo}
      <span className="truncate font-semibold">{name}</span>
    </span>
  );
}
