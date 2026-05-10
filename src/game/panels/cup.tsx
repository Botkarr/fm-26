import { Panel, TeamLogo, Empty, teamShort, teamName } from "@/game/shared";
import type { SeasonState } from "@/game/engine";
import { CUP_STAGES, CUP_STAGE_NAME, CUP_SCHEDULE, type CupStage } from "@/game/cup";

export function CupBracketPanel({ state }: { state: SeasonState }) {
  const cup = state.cup;
  const userId = state.userTeamId;
  const stage = cup.currentStage;

  const userTies = cup.ties.filter((t) => t.home === userId || t.away === userId);
  const lastUserTie = userTies[userTies.length - 1];
  const userOut = lastUserTie?.played && (
    lastUserTie.shootoutWinner ? lastUserTie.shootoutWinner !== userId
    : (lastUserTie.home === userId ? lastUserTie.homeGoals! < lastUserTie.awayGoals!
                                    : lastUserTie.awayGoals! < lastUserTie.homeGoals!)
  );

  const userStatus = (() => {
    if (cup.championId === userId) return { text: "Kupagyőztes 🏆", tone: "text-primary" };
    if (userOut && lastUserTie) return { text: `Kiestünk · ${CUP_STAGE_NAME[lastUserTie.stage]}`, tone: "text-muted-foreground" };
    if (cup.alive.includes(userId) && stage !== "done") {
      return { text: `Versenyben · ${CUP_STAGE_NAME[stage as CupStage]} (${CUP_SCHEDULE[stage as CupStage]}. f. után)`, tone: "text-[color:var(--win)]" };
    }
    return null;
  })();

  return (
    <Panel
      title={`Magyar Kupa${cup.championId ? ` · 🏆 ${teamShort(cup.championId)}` : ""}`}
    >
      {userStatus && (
        <div className={`mb-3 rounded border border-border/40 bg-secondary/40 px-3 py-2 text-xs font-semibold ${userStatus.tone}`}>
          {userStatus.text}
        </div>
      )}

      {cup.championId && (
        <div className="mb-3 flex items-center gap-3 rounded border border-primary/40 bg-primary/10 px-3 py-2">
          <span className="text-2xl">🏆</span>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-primary">Kupagyőztes</div>
            <div className="font-bold">{teamName(cup.championId)}</div>
          </div>
          <TeamLogo id={cup.championId} size={32} />
        </div>
      )}

      {/* Vízszintesen görgethető bracket: minden forduló egy oszlop, klasszikus ágakkal */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex items-stretch gap-0 min-w-max pb-1" style={{ minHeight: 520 }}>
          {CUP_STAGES.map((s, sIdx) => {
            const ties = cup.ties.filter((t) => t.stage === s);
            const isCurrent = stage === s && cup.championId === undefined;
            const isDone = ties.length > 0 && ties.every((t) => t.played);
            const isLast = sIdx === CUP_STAGES.length - 1;

            return (
              <div key={s} className="flex items-stretch">
                <div
                  className={`flex w-[230px] shrink-0 flex-col rounded border ${
                    isCurrent ? "border-primary/50 bg-primary/5" : "border-border/40 bg-secondary/20"
                  }`}
                >
                <div className="flex items-center justify-between gap-2 border-b border-border/40 px-2 py-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                    {CUP_STAGE_NAME[s]}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {isDone ? "Lezárt" : isCurrent ? `${CUP_SCHEDULE[s]}. f.` : `${CUP_SCHEDULE[s]}. f. után`}
                  </span>
                </div>

                <div className="flex-1 p-1.5">
                  {ties.length === 0 ? (
                    <div className="flex h-full min-h-[80px] items-center justify-center text-center text-[11px] text-muted-foreground">
                      Még nem sorsolták
                    </div>
                  ) : (
                    <ul className="flex h-full flex-col justify-around gap-1">
                      {ties.map((t) => {
                        const winner = t.played
                          ? (t.shootoutWinner ?? (t.homeGoals! > t.awayGoals! ? t.home : t.away))
                          : null;
                        const userInvolved = t.home === userId || t.away === userId;
                        return (
                          <li
                            key={t.id}
                            className={`rounded border px-1.5 py-1 text-xs ${
                              userInvolved ? "border-primary/50 bg-primary/10" : "border-border/30 bg-card"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <TeamLogo id={t.home} size={14} />
                              <span className={`flex-1 truncate ${winner === t.home ? "font-bold" : t.played ? "text-muted-foreground line-through" : ""}`}>
                                {teamShort(t.home)}
                              </span>
                              <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                                {t.played ? t.homeGoals : "–"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <TeamLogo id={t.away} size={14} />
                              <span className={`flex-1 truncate ${winner === t.away ? "font-bold" : t.played ? "text-muted-foreground line-through" : ""}`}>
                                {teamShort(t.away)}
                              </span>
                              <span className="font-mono tabular-nums text-[11px] text-muted-foreground">
                                {t.played ? t.awayGoals : "–"}
                              </span>
                            </div>
                            {t.shootoutWinner && (
                              <div className="mt-0.5 text-right text-[9px] text-muted-foreground" title="Szétlövés">
                                11m: {teamShort(t.shootoutWinner)}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                </div>

                {!isLast && (
                  <svg
                    width="28"
                    className={`shrink-0 self-stretch ${isDone ? "text-primary/70" : "text-border"}`}
                    viewBox="0 0 28 100"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path
                      key={`${s}-${isDone ? "done" : "pending"}`}
                      d="M0,25 H14 V75 H28 M0,75 H14 V25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                      className={isDone ? "cup-bracket-line" : undefined}
                    />
                  </svg>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!cup.championId && cup.ties.length === 0 && (
        <Empty text="A kupa még nem indult el ebben a szezonban." />
      )}
    </Panel>
  );
}
