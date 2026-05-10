import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSeason } from "@/game/store";
import { TEAMS } from "@/game/data";
import { generateMatchTimeline, MatchEvent } from "@/game/match";
import { teamLogo as teamLogoSrc } from "@/game/logos";
import { TacticsBoard } from "@/game/panels/tactics";
import { Tactics, normalizeTactics } from "@/game/tactics";
import { moraleBoost } from "@/game/engine";
import { DR_LABEL, dressingRoomEffect, type DressingRoomTone } from "@/game/career";
import { ShotMap, XgTimeline } from "@/game/panels/match-extras";

export const Route = createFileRoute("/match")({
  component: MatchPage,
});

function teamName(id: string) { return TEAMS.find((t) => t.id === id)?.name ?? id; }
function teamShort(id: string) { return TEAMS.find((t) => t.id === id)?.short ?? id; }
function teamColor(id: string) { return TEAMS.find((t) => t.id === id)?.color ?? "var(--muted)"; }

function MatchPage() {
  const { state, ready, finishUserMatch, setTactics, doDressingRoom } = useSeason();
  const navigate = useNavigate();
  const [halftimeShown, setHalftimeShown] = useState(false);

  // Find the user's next fixture
  const nextFixture = useMemo(() => {
    if (!state) return null;
    return state.fixtures.find(
      (f) => f.round === state.currentRound && !f.played &&
        (f.home === state.userTeamId || f.away === state.userTeamId)
    );
  }, [state]);

  const fixtureKey = nextFixture ? `${nextFixture.round}:${nextFixture.home}:${nextFixture.away}` : null;
  const userIsHome = !!(state && nextFixture && nextFixture.home === state.userTeamId);
  const opponentId = nextFixture && state ? (userIsHome ? nextFixture.away : nextFixture.home) : null;

  // Two phases: tactics → live
  const [phase, setPhase] = useState<"tactics" | "live">("tactics");
  const timelineRef = useRef<{ key: string; events: MatchEvent[]; finalH: number; finalA: number } | null>(null);

  const [minute, setMinute] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [shown, setShown] = useState<MatchEvent[]>([]);
  const [finished, setFinished] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  // Reset everything when the fixture changes
  useEffect(() => {
    setPhase("tactics");
    setMinute(0);
    setRunning(false);
    setShown([]);
    setFinished(false);
    setSubmitted(false);
    timelineRef.current = null;
  }, [fixtureKey]);

  const handleConfirmTactics = (t: Tactics) => {
    if (!state || !nextFixture || !fixtureKey) return;
    setTactics(t);
    const userBoost = moraleBoost(state.morale);
    const result = generateMatchTimeline(nextFixture.home, nextFixture.away, {
      homeTactics: userIsHome ? t : undefined,
      awayTactics: !userIsHome ? t : undefined,
      userMoraleBoost: userBoost,
      userIsHome,
    });
    timelineRef.current = { key: fixtureKey, ...result };
    setPhase("live");
  };

  // Tick simulation
  useEffect(() => {
    if (!running || finished) return;
    const ms = 600 / speed;
    const id = setInterval(() => {
      setMinute((m) => {
        const next = m + 1;
        if (next > 90) {
          setRunning(false);
          setFinished(true);
          return 90;
        }
        // Pause at halftime to show dressing room modal
        if (next === 45 && !halftimeShown) {
          setRunning(false);
          setHalftimeShown(true);
        }
        return next;
      });
    }, ms);
    return () => clearInterval(id);
  }, [running, finished, speed, halftimeShown]);

  // Reset halftime flag when fixture changes
  useEffect(() => { setHalftimeShown(false); }, [fixtureKey]);

  // Add events for new minute
  useEffect(() => {
    if (!timelineRef.current) return;
    const evs = timelineRef.current.events.filter((e) => e.minute === minute);
    if (evs.length) setShown((prev) => [...prev, ...evs]);
  }, [minute]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [shown.length]);

  // Esc → vissza a dashboardra
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate({ to: "/" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  // Auto-write result on finish
  useEffect(() => {
    if (!finished || submitted || !state || !nextFixture || !timelineRef.current) return;
    const t = timelineRef.current;
    finishUserMatch({
      home: nextFixture.home,
      away: nextFixture.away,
      homeGoals: t.finalH,
      awayGoals: t.finalA,
      scorers: t.events.filter((e) => e.type === "goal").map((e) => ({ team: e.team!, player: e.player! })),
    });
    setSubmitted(true);
  }, [finished, submitted, state, nextFixture, finishUserMatch]);

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!state) {
    return <Centered><Link to="/" className="text-primary underline">Indíts új szezont</Link></Centered>;
  }
  if (!nextFixture || !opponentId) {
    return <Centered>
      <p className="mb-3 text-muted-foreground">Nincs lejátszandó meccsed ebben a fordulóban.</p>
      <Link to="/" className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Vissza</Link>
    </Centered>;
  }

  // PHASE 1 — Tactics board
  if (phase === "tactics") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Vissza</Link>
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {state.currentRound}. forduló · taktika
            </span>
            <div className="w-16" />
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">
          <TacticsBoard
            teamId={state.userTeamId}
            initial={normalizeTactics(state.tactics, state.userTeamId)}
            onConfirm={handleConfirmTactics}
            opponentId={opponentId}
            userIsHome={userIsHome}
          />
        </main>
      </div>
    );
  }

  // PHASE 2 — Live match
  if (!timelineRef.current) return null;
  const t = timelineRef.current;
  const live = shown.length > 0 ? shown[shown.length - 1] : null;
  const scoreH = live?.scoreH ?? 0;
  const scoreA = live?.scoreA ?? 0;

  const showHalftimeModal = halftimeShown && minute === 45 && !finished;
  const userHalfScore = userIsHome ? scoreH : scoreA;
  const oppHalfScore = userIsHome ? scoreA : scoreH;
  const halfDiff = userHalfScore - oppHalfScore;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Vissza</Link>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            {state.currentRound}. forduló · Élő közvetítés
          </span>
          <div className="w-16" />
        </div>
      </header>

      {showHalftimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded border border-border bg-card p-5 shadow-2xl">
            <div className="mb-3 text-[10px] uppercase tracking-[0.3em] text-primary">Félidő · {scoreH}–{scoreA}</div>
            <h3 className="mb-1 text-lg font-bold">Öltöző-beszéd</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              {halfDiff > 0 ? "Vezetünk — tartani kell a lendületet."
                : halfDiff === 0 ? "Döntetlen — fokoznunk kell."
                : "Vesztésre állunk — kell egy reakció."}
            </p>
            <div className="space-y-2">
              {(["encourage", "calm", "angry"] as DressingRoomTone[]).map((tone) => {
                const eff = dressingRoomEffect(tone, halfDiff);
                return (
                  <button
                    key={tone}
                    onClick={() => {
                      doDressingRoom(tone, halfDiff);
                      setRunning(true);
                    }}
                    className="flex w-full items-center justify-between rounded border border-border bg-secondary/50 p-3 text-left text-sm hover:border-primary"
                  >
                    <span className="font-semibold">{DR_LABEL[tone]}</span>
                    <span className="text-[10px] text-muted-foreground">
                      morál {eff.moraleDelta > 0 ? `+${eff.moraleDelta}` : eff.moraleDelta} ·
                      II. félidő +{Math.round(eff.secondHalfBonus * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Scoreboard */}
        <div className="rounded-md border border-border bg-card p-6">
          <div className="grid grid-cols-3 items-center gap-4">
            <TeamBig id={nextFixture.home} side="home" />
            <div className="text-center">
              <div className="font-mono text-5xl font-bold tabular-nums">
                <span className={live?.type === "goal" && live.team === nextFixture.home ? "animate-pulse text-[color:var(--win)]" : ""}>{scoreH}</span>
                <span className="mx-2 text-muted-foreground">–</span>
                <span className={live?.type === "goal" && live.team === nextFixture.away ? "animate-pulse text-[color:var(--win)]" : ""}>{scoreA}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${running ? "animate-pulse bg-destructive" : finished ? "bg-muted-foreground" : "bg-accent"}`} />
                <span className="font-mono text-lg font-bold">{minute}'</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {finished ? "Vége" : minute === 0 ? "Kezdés előtt" : minute === 45 ? "Félidő" : running ? "Élő" : "Szünet"}
              </div>
            </div>
            <TeamBig id={nextFixture.away} side="away" />
          </div>

          {/* Timeline progress */}
          <div className="mt-6">
            <div className="relative h-1.5 w-full overflow-hidden rounded bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(minute / 90) * 100}%` }}
              />
              {t.events
                .filter((e) => e.type === "goal" && e.minute <= minute)
                .map((e, i) => (
                  <span
                    key={i}
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background"
                    style={{
                      left: `${(e.minute / 90) * 100}%`,
                      backgroundColor: teamColor(e.team!),
                    }}
                    title={`${e.minute}' — ${e.player}`}
                  />
                ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0'</span><span>45'</span><span>90'</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {!finished && minute === 0 && (
              <button
                onClick={() => setRunning(true)}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                ▶ Sípszó · Mérkőzés indítása
              </button>
            )}
            {!finished && minute > 0 && (
              <button
                onClick={() => setRunning((r) => !r)}
                className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {running ? "⏸ Szünet" : "▶ Folytatás"}
              </button>
            )}
            {!finished && minute > 0 && (
              <div className="flex overflow-hidden rounded-md border border-border">
                {([1, 2, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-2 text-xs font-semibold ${speed === s ? "bg-secondary text-foreground" : "bg-card text-muted-foreground hover:bg-secondary/60"}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
            {!finished && minute > 0 && (
              <button
                onClick={() => {
                  // skip to end: render all remaining events instantly
                  setRunning(false);
                  setShown(t.events);
                  setMinute(90);
                  setFinished(true);
                }}
                className="rounded-md border border-border bg-secondary px-3 py-2 text-xs text-secondary-foreground hover:border-primary"
              >
                ⏭ Ugrás a végére
              </button>
            )}
            {finished && (
              <button
                onClick={() => navigate({ to: "/" })}
                className="rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                ✓ Vissza a szezonhoz
              </button>
            )}
          </div>
        </div>

        {/* Stats + feed */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Statisztikák</div>
            <Stats events={shown} home={nextFixture.home} away={nextFixture.away} />
          </div>
          <div className="rounded-md border border-border bg-card md:col-span-2">
            <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Percről percre
            </div>
            <div ref={feedRef} className="max-h-[420px] space-y-2 overflow-y-auto p-4">
              {shown.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">A meccs még nem indult el.</p>
              )}
              {shown.map((e, i) => (
                <EventLine key={i} e={e} userId={state.userTeamId} homeId={nextFixture.home} awayId={nextFixture.away} />
              ))}
            </div>
          </div>
        </div>

        {/* xG + shot map */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <XgTimeline events={shown} home={nextFixture.home} away={nextFixture.away} />
          <ShotMap events={shown} home={nextFixture.home} away={nextFixture.away} />
        </div>
      </main>
    </div>
  );
}

function TeamBig({ id, side }: { id: string; side: "home" | "away" }) {
  const src = teamLogoSrc(id);
  const Crest = () =>
    src ? (
      <img src={src} alt={`${teamName(id)} címer`} className="h-14 w-14 object-contain" />
    ) : (
      <span className="h-12 w-12 rounded-md border border-border" style={{ backgroundColor: teamColor(id) }} />
    );
  return (
    <div className={`flex items-center gap-3 ${side === "away" ? "justify-end" : ""}`}>
      {side === "home" && <Crest />}
      <div className={side === "away" ? "text-right" : ""}>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{side === "home" ? "Hazai" : "Vendég"}</div>
        <div className="font-bold leading-tight">{teamName(id)}</div>
        <div className="text-xs text-muted-foreground">{teamShort(id)}</div>
      </div>
      {side === "away" && <Crest />}
    </div>
  );
}

function EventLine({ e, userId, homeId, awayId }: { e: MatchEvent; userId: string; homeId: string; awayId: string }) {
  const isHome = e.team === homeId;
  const isUser = e.team === userId;
  const meta = eventMeta(e.type);

  if (e.type === "kickoff" || e.type === "halftime" || e.type === "fulltime" || e.type === "info") {
    return (
      <div className="animate-fade-in my-3 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {e.type === "kickoff" ? "Kezdés" : e.type === "halftime" ? `Félidő · ${e.scoreH}-${e.scoreA}` : `Vége · ${e.scoreH}-${e.scoreA}`}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div
      className={`animate-fade-in flex gap-3 rounded-md border px-3 py-2 ${meta.bg} ${meta.border} ${isUser ? "ring-1 ring-primary/40" : ""} ${isHome ? "" : "flex-row-reverse text-right"}`}
    >
      <div className="flex w-12 flex-col items-center justify-center">
        <span className="font-mono text-sm font-bold">{e.minute}'</span>
        <span className="text-base leading-none">{meta.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground" style={{ flexDirection: isHome ? "row" : "row-reverse" }}>
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: teamColor(e.team!) }} />
          <span className="font-semibold">{teamShort(e.team!)}</span>
          {e.type === "goal" && (
            <span className="font-mono font-bold text-foreground">{e.scoreH}-{e.scoreA}</span>
          )}
        </div>
        <p className={`mt-0.5 text-sm ${meta.text}`}>{e.detail}</p>
      </div>
    </div>
  );
}

function eventMeta(type: MatchEvent["type"]) {
  switch (type) {
    case "goal": return { icon: "⚽", bg: "bg-[color:var(--win)]/10", border: "border-[color:var(--win)]/40", text: "font-bold text-[color:var(--win)]" };
    case "yellow": return { icon: "🟨", bg: "bg-[color:var(--draw)]/10", border: "border-[color:var(--draw)]/40", text: "" };
    case "red": return { icon: "🟥", bg: "bg-destructive/10", border: "border-destructive/40", text: "font-semibold text-destructive" };
    case "sub": return { icon: "🔄", bg: "bg-accent/10", border: "border-accent/30", text: "" };
    case "save": return { icon: "🧤", bg: "bg-card", border: "border-border", text: "text-muted-foreground" };
    case "chance": return { icon: "🎯", bg: "bg-card", border: "border-border", text: "text-muted-foreground" };
    default: return { icon: "•", bg: "bg-card", border: "border-border", text: "" };
  }
}

function Stats({ events, home, away }: { events: MatchEvent[]; home: string; away: string }) {
  const count = (team: string, types: MatchEvent["type"][]) =>
    events.filter((e) => e.team === team && types.includes(e.type)).length;
  const rows: { label: string; h: number; a: number }[] = [
    { label: "Gólok", h: count(home, ["goal"]), a: count(away, ["goal"]) },
    { label: "Helyzetek", h: count(home, ["chance", "save", "goal"]), a: count(away, ["chance", "save", "goal"]) },
    { label: "Kapura lövés", h: count(home, ["save", "goal"]), a: count(away, ["save", "goal"]) },
    { label: "Sárga lap", h: count(home, ["yellow"]), a: count(away, ["yellow"]) },
    { label: "Cserék", h: count(home, ["sub"]), a: count(away, ["sub"]) },
  ];
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const total = Math.max(1, r.h + r.a);
        const hPct = (r.h / total) * 100;
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-mono font-bold">{r.h}</span>
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-mono font-bold">{r.a}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded bg-secondary">
              <div style={{ width: `${hPct}%`, backgroundColor: teamColor(home) }} />
              <div style={{ width: `${100 - hPct}%`, backgroundColor: teamColor(away) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center">{children}</div>
    </div>
  );
}
