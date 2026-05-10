import { Panel, TeamLogo, teamName, Empty } from "@/game/shared";
import { useSeason } from "@/game/store";
import {
  EXPECTATION_LABEL,
  TROPHY_ICON,
  TROPHY_LABEL,
  clubPrestige,
} from "@/game/manager";

export function ManagerPanel() {
  const { state, acceptJobOffer, rejectJobOffer } = useSeason();
  if (!state) return null;
  const m = state.manager;
  const conf = Math.round(m.boardConfidence);
  const confTone =
    conf >= 70 ? "bg-[color:var(--win)]" :
    conf >= 40 ? "bg-accent" :
    conf >= 25 ? "bg-[color:var(--draw)]" :
    "bg-[color:var(--loss)]";

  const trophiesByType = m.trophies.reduce<Record<string, number>>((acc, t) => {
    acc[t.type] = (acc[t.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Panel title="Edző karrier">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Manager</div>
            <div className="text-lg font-bold">{m.name}</div>
            <div className="text-xs text-muted-foreground">{m.seasonsAtClub + 1}. szezon a klubnál</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Hírnév</div>
            <div className="text-lg font-bold">{Math.round(m.reputation)} / 100</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded bg-secondary">
              <div className="h-full bg-primary" style={{ width: `${m.reputation}%` }} />
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Klub presztízs</div>
            <div className="text-lg font-bold">{clubPrestige(state.userTeamId)}</div>
            <div className="text-xs text-muted-foreground">{teamName(state.userTeamId)}</div>
          </div>
        </div>
      </Panel>

      <Panel title="Elnöki bizalom és célkitűzés">
        <div className="space-y-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bizalmi szint</span>
              <span className="font-mono font-bold">{conf} / 100</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className={`h-full transition-all ${confTone}`} style={{ width: `${conf}%` }} />
            </div>
            {conf < 25 && (
              <p className="mt-2 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs text-destructive">
                ⚠️ Kritikus szint — eredmények kellenek, különben menesztés.
              </p>
            )}
          </div>
          <div className="rounded border border-border bg-card/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Idei célkitűzés</div>
            <div className="text-lg font-bold">{EXPECTATION_LABEL[m.expectation.goal]}</div>
            <div className="text-xs text-muted-foreground">{m.expectation.text}</div>
          </div>
        </div>
      </Panel>

      <Panel title={`Állásajánlatok · ${m.jobOffers.length}`}>
        {m.jobOffers.length === 0 ? (
          <Empty text="Nincs új ajánlat. Növeld a hírnevet trófeákkal." />
        ) : (
          <ul className="space-y-2">
            {m.jobOffers.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded border border-primary/40 bg-primary/5 p-3">
                <TeamLogo id={o.fromTeamId} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{teamName(o.fromTeamId)}</div>
                  <div className="text-xs text-muted-foreground">Presztízs {o.prestige} · F{o.round} · lejár {o.expiresAfterRounds} forduló múlva</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Aláírsz a ${teamName(o.fromTeamId)} klubhoz? Az aktuális szezon elveszik.`)) acceptJobOffer(o.id);
                  }}
                  className="rounded bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                >
                  Elfogadás
                </button>
                <button
                  onClick={() => rejectJobOffer(o.id)}
                  className="rounded border border-border px-3 py-1.5 text-xs hover:border-destructive hover:text-destructive"
                >
                  Elutasítás
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={`Trófeák · ${m.trophies.length}`}>
        {m.trophies.length === 0 ? (
          <Empty text="Még nincs trófea. Nyerj bajnokságot vagy kupát!" />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(trophiesByType).map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 rounded border border-primary/30 bg-primary/5 p-3">
                <span className="text-2xl">{TROPHY_ICON[type as keyof typeof TROPHY_ICON]}</span>
                <div>
                  <div className="text-sm font-semibold">{TROPHY_LABEL[type as keyof typeof TROPHY_LABEL]}</div>
                  <div className="text-xs text-muted-foreground">×{count}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {m.pastClubs.length > 0 && (
        <Panel title="Korábbi klubok">
          <ul className="divide-y divide-border/60">
            {m.pastClubs.map((pc, i) => (
              <li key={i} className="flex items-center gap-2 py-2 text-sm">
                <TeamLogo id={pc.teamId} size={20} />
                <span className="flex-1">{teamName(pc.teamId)}</span>
                <span className="text-xs text-muted-foreground">#{pc.fromSeason}–{pc.toSeason}</span>
                <span className="text-[10px] uppercase text-muted-foreground">
                  {pc.reason === "fired" ? "menesztve" : pc.reason === "resigned" ? "lemondott" : "klubot váltott"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
