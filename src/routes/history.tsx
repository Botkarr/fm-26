import { createFileRoute, Link } from "@tanstack/react-router";
import { useSeason } from "@/game/store";
import { useState } from "react";
import { TeamLogo, Panel, Empty, Stat, teamName, teamShort } from "@/game/shared";
import { ACHIEVEMENTS } from "@/game/achievements";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Szezon archívum — FM 26 Hungarian" },
      { name: "description", content: "Korábbi szezonok bajnokai, tabellái, góllövőlistái és kiérdemelt eredményei." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { state, ready } = useSeason();
  const [openSeason, setOpenSeason] = useState<number | null>(null);

  if (!ready) return <div className="min-h-screen bg-background" />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Vissza a dashboardra</Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Szezon archívum</span>
          <div className="w-32" />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Karrier történet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {state ? `${state.history.length} lejátszott szezon · jelenleg #${state.season} szezon fut.` : "Nincs futó karrier."}
          </p>
        </div>

        {!state || state.history.length === 0 ? (
          <Panel title="Még nincs befejezett szezon">
            <Empty text="Játssz le egy teljes 22 fordulós szezont, és itt megjelenik az archívum minden eredménnyel és statisztikával." />
          </Panel>
        ) : (
          <div className="space-y-4">
            {[...state.history].reverse().map((h) => {
              const isOpen = openSeason === h.season;
              return (
                <div key={h.season} className="rounded-md border border-border bg-card">
                  <button
                    onClick={() => setOpenSeason(isOpen ? null : h.season)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-secondary/40"
                  >
                    <div className="text-2xl font-mono font-bold text-muted-foreground">#{h.season}</div>
                    <TeamLogo id={h.championId} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{teamName(h.championId)}</span>
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">Bajnok</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Te: {h.userPosition}. hely · {h.userPts} pont
                        {h.topScorer && ` · gólkirály: ${h.topScorer.player} (${h.topScorer.goals})`}
                      </div>
                    </div>
                    <span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-border p-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Bajnok" value={teamShort(h.championId)} />
                        <Stat label="Helyezésed" value={`${h.userPosition}.`} />
                        <Stat label="Pontod" value={`${h.userPts}`} />
                        <Stat label="Eredmények" value={`${h.achievementsUnlocked?.length ?? 0}`} />
                      </div>

                      {(h.cupChampionId || h.userCupExit) && (
                        <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Magyar Kupa</div>
                          <div className="flex items-center gap-3 text-sm">
                            {h.cupChampionId && (
                              <div className="flex items-center gap-2">
                                <span className="text-base">🏆</span>
                                <TeamLogo id={h.cupChampionId} size={18} />
                                <span className="font-bold">{teamName(h.cupChampionId)}</span>
                                <span className="text-xs text-muted-foreground">kupagyőztes</span>
                              </div>
                            )}
                            {h.userCupExit && (
                              <div className="ml-auto text-xs text-muted-foreground">
                                Te: {h.userCupExit === "champion" ? "🏆 GYŐZTES" : `kiestél a(z) ${h.userCupExit === "R32" ? "1. fordulóban" : h.userCupExit === "R16" ? "nyolcaddöntőben" : h.userCupExit === "QF" ? "negyeddöntőben" : h.userCupExit === "SF" ? "elődöntőben" : "döntőben"}`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {h.finalTable && h.finalTable.length > 0 && (
                        <div>
                          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Végső tabella</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                <tr className="border-b border-border">
                                  <th className="px-2 py-1.5 text-left">#</th>
                                  <th className="px-2 py-1.5 text-left">Csapat</th>
                                  <th className="px-2 py-1.5 text-right">M</th>
                                  <th className="px-2 py-1.5 text-right">Gy-D-V</th>
                                  <th className="px-2 py-1.5 text-right">GK</th>
                                  <th className="px-2 py-1.5 text-right">P</th>
                                </tr>
                              </thead>
                              <tbody>
                                {h.finalTable.map((r, i) => (
                                  <tr key={r.teamId} className={`border-b border-border/50 ${i === 0 ? "bg-primary/10 font-semibold" : ""}`}>
                                    <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
                                    <td className="px-2 py-1.5">
                                      <Link to="/team/$teamId" params={{ teamId: r.teamId }} className="inline-flex items-center gap-2 hover:text-primary">
                                        <TeamLogo id={r.teamId} size={14} />
                                        <span className="truncate">{teamName(r.teamId)}</span>
                                      </Link>
                                    </td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{r.p}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{r.w}-{r.d}-{r.l}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{r.gd > 0 ? "+" : ""}{r.gd}</td>
                                    <td className="px-2 py-1.5 text-right font-bold tabular-nums">{r.pts}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 md:grid-cols-2">
                        {h.finalScorers && h.finalScorers.length > 0 && (
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Góllövőlista</div>
                            <ol className="divide-y divide-border/50 rounded border border-border/40">
                              {h.finalScorers.slice(0, 8).map((s, i) => (
                                <li key={i} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                                  <span className="w-5 text-right text-muted-foreground">{i + 1}.</span>
                                  <TeamLogo id={s.team} size={14} />
                                  <span className="flex-1 truncate">{s.player}</span>
                                  <span className="text-xs text-muted-foreground">{teamShort(s.team)}</span>
                                  <span className="w-8 text-right font-mono font-bold">{s.goals}</span>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {h.achievementsUnlocked && h.achievementsUnlocked.length > 0 && (
                          <div>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Megszerzett eredmények</div>
                            <ul className="space-y-1">
                              {h.achievementsUnlocked.map((id) => {
                                const a = ACHIEVEMENTS.find((x) => x.id === id);
                                if (!a) return null;
                                return (
                                  <li key={id} className="flex items-center gap-2 rounded border border-primary/30 bg-primary/10 px-2 py-1.5 text-sm">
                                    <span className="text-base">{a.icon}</span>
                                    <span className="flex-1 truncate font-semibold">{a.name}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
