import { TEAMS, teamsByDefaultDivision, getTeam, type Division } from "@/game/data";
import { useSeason } from "@/game/store";
import { buildTable, topScorers, totalRoundsFor, userDivision, otherDivision, divisionRounds, type Fixture, type SeasonState } from "@/game/engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { TeamLogo, Stat, Kbd, teamName } from "@/game/shared";
import { LeagueTablePanel, ResultsPanel, FixturesPanel, ScorersPanel } from "@/game/panels/league";
import { InboxPanel, AchievementsPanel, MoralePanel, HistoryPanel } from "@/game/panels/sidebar";
import { UserSquadPanel } from "@/game/panels/squad";
import { CupBracketPanel } from "@/game/panels/cup";
import { TransfersPanel } from "@/game/panels/transfers";
import { PressPanel } from "@/game/panels/press";
import { ScoutingPanel } from "@/game/panels/scouting";
import { AcademyPanel } from "@/game/panels/academy";
import { ManagerPanel } from "@/game/panels/manager";
import { EuropePanel } from "@/game/panels/europe";
import { autoLineup, lineupPlayers, normalizeTactics, FORMATIONS, type Pos } from "@/game/tactics";

export function TeamPicker({ onPick }: { onPick: (id: string) => void }) {
  const nb1 = teamsByDefaultDivision("NB1");
  const nb2 = teamsByDefaultDivision("NB2");
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">FM 26 · Magyar bajnoki piramis</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight">Válassz csapatot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          NB I (12 csapat, 22 forduló) vagy NB II (16 csapat, 30 forduló). Szezon végén top 2 NB II feljut, alsó 2 NB I kiesik.
        </p>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">NB I</span>
          <span className="text-sm font-semibold">Élvonal</span>
          <span className="text-xs text-muted-foreground">· {nb1.length} csapat</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {nb1.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-secondary"
            >
              <TeamLogo id={t.id} size={36} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.city}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">NB II</span>
          <span className="text-sm font-semibold">Másodosztály</span>
          <span className="text-xs text-muted-foreground">· {nb2.length} csapat</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {nb2.map((t) => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="group flex flex-col items-start gap-2 rounded-md border border-border bg-card p-4 text-left transition hover:border-primary hover:bg-secondary"
            >
              <TeamLogo id={t.id} size={36} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.city}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function Dashboard() {
  const { state, advance, reset, nextSeason, clearInbox } = useSeason();
  const navigate = useNavigate();
  const userDiv = state ? userDivision(state) : "NB1";
  const otherDiv: Division = otherDivision(userDiv);
  const totalRounds = state ? totalRoundsFor(state) : 22;

  const [tableDiv, setTableDiv] = useState<Division>(userDiv);
  const [scorersDiv, setScorersDiv] = useState<Division>(userDiv);
  // Sync default to user's division when state changes / new season
  useEffect(() => { setTableDiv(userDiv); setScorersDiv(userDiv); }, [userDiv, state?.season]);

  const table = useMemo(() => (state ? buildTable(state, tableDiv) : []), [state, tableDiv]);
  const scorers = useMemo(() => (state ? topScorers(state, 10, scorersDiv) : []), [state, scorersDiv]);

  const seasonOver = state ? state.currentRound > totalRounds : false;
  const userNext = state
    ? state.fixtures.find((f) => f.round === state.currentRound && (f.home === state.userTeamId || f.away === state.userTeamId))
    : undefined;
  const userNextRef = useRef(userNext);
  userNextRef.current = userNext;

  useEffect(() => {
    if (!state) return;
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (seasonOver) {
        if (e.code === "Enter") { e.preventDefault(); nextSeason(); }
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (userNextRef.current) navigate({ to: "/match" });
        else advance();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, seasonOver, advance, nextSeason, navigate]);

  if (!state) return null;
  const userTable = buildTable(state, userDiv);
  const userRow = userTable.findIndex((r) => r.teamId === state.userTeamId) + 1;
  const userPts = userTable.find((r) => r.teamId === state.userTeamId)?.pts ?? 0;
  const lastRound = state.currentRound - 1;
  const champion = seasonOver ? userTable[0] : null;
  const userIsHome = userNext?.home === state.userTeamId;
  const opponentId = userNext ? (userIsHome ? userNext.away : userNext.home) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardBody
        state={state}
        table={table}
        scorers={scorers}
        tableDiv={tableDiv}
        setTableDiv={setTableDiv}
        scorersDiv={scorersDiv}
        setScorersDiv={setScorersDiv}
        userDiv={userDiv}
        otherDiv={otherDiv}
        lastRound={lastRound}
        currentRound={Math.min(state.currentRound, totalRounds)}
        totalRounds={totalRounds}
        clearInbox={clearInbox}
        seasonOver={seasonOver}
        userNext={userNext}
        opponentId={opponentId}
        userIsHome={userIsHome}
        champion={champion}
        userRow={userRow}
        userPts={userPts}
        advance={advance}
        nextSeason={nextSeason}
        reset={reset}
      />
    </div>
  );
}

function DivisionTabs({
  value, onChange, userDiv, otherDiv,
}: {
  value: Division; onChange: (d: Division) => void; userDiv: Division; otherDiv: Division;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-border bg-card p-1">
      {([userDiv, otherDiv] as Division[]).map((d, i) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`flex-1 rounded px-3 py-2 text-xs font-semibold uppercase tracking-widest transition ${
            value === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          {d === "NB1" ? "NB I" : "NB II"}
          {i === 0 && <span className="ml-1.5 text-[9px] opacity-70">(saját)</span>}
        </button>
      ))}
    </div>
  );
}

function DivisionMiniTabs({ value, onChange }: { value: Division; onChange: (d: Division) => void }) {
  return (
    <div className="flex gap-1">
      {(["NB1", "NB2"] as Division[]).map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
            value === d ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          {d === "NB1" ? "NB I" : "NB II"}
        </button>
      ))}
    </div>
  );
}

type Tab = "overview" | "league" | "cup" | "europe" | "squad" | "tactics" | "press" | "transfers" | "scouting" | "academy" | "manager" | "inbox" | "history";

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",  label: "Áttekintés",   icon: "⌂" },
  { id: "league",    label: "Bajnokság",    icon: "▦" },
  { id: "cup",       label: "Magyar Kupa",  icon: "♛" },
  { id: "europe",    label: "Európa",       icon: "🌍" },
  { id: "squad",     label: "Keret",        icon: "👥" },
  { id: "tactics",   label: "Taktika",      icon: "✦" },
  { id: "press",     label: "Sajtó",        icon: "🎙" },
  { id: "transfers", label: "Átigazolás",   icon: "💱" },
  { id: "academy",   label: "Akadémia",     icon: "🎓" },
  { id: "scouting",  label: "Scouting",     icon: "🔍" },
  { id: "manager",   label: "Edző karrier", icon: "🧑‍💼" },
  { id: "inbox",     label: "Hírek",        icon: "✉" },
  { id: "history",   label: "Archívum",     icon: "⏱" },
];

function DashboardBody({
  state, table, scorers, tableDiv, setTableDiv, scorersDiv, setScorersDiv,
  userDiv, otherDiv, lastRound, currentRound, totalRounds, clearInbox,
  seasonOver, userNext, opponentId, userIsHome, champion,
  userRow, userPts, advance, nextSeason, reset,
}: {
  state: NonNullable<ReturnType<typeof useSeason>["state"]>;
  table: ReturnType<typeof buildTable>;
  scorers: ReturnType<typeof topScorers>;
  tableDiv: Division;
  setTableDiv: (d: Division) => void;
  scorersDiv: Division;
  setScorersDiv: (d: Division) => void;
  userDiv: Division;
  otherDiv: Division;
  lastRound: number;
  currentRound: number;
  totalRounds: number;
  clearInbox: () => void;
  seasonOver: boolean;
  userNext: ReturnType<NonNullable<ReturnType<typeof useSeason>["state"]>["fixtures"]["find"]>;
  opponentId: string | null;
  userIsHome: boolean;
  champion: ReturnType<typeof buildTable>[number] | null;
  userRow: number;
  userPts: number;
  advance: () => void;
  nextSeason: () => void;
  reset: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const inboxCount = state.inbox.length;
  const moraleLabel = state.morale >= 75 ? "Magas" : state.morale >= 55 ? "Jó" : state.morale >= 40 ? "Közepes" : state.morale >= 25 ? "Alacsony" : "Krízis";

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR */}
      <aside
        className="hidden md:flex shrink-0 flex-col border-r border-border"
        style={{ width: "13.5rem", background: "var(--sidebar-bg)" }}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="grid h-8 w-8 place-items-center rounded bg-primary text-[13px] font-black text-primary-foreground">FM</div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Magyar</div>
            <div className="text-sm font-bold">Manager 26</div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <TeamLogo id={state.userTeamId} size={32} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold">{teamName(state.userTeamId)}</div>
            <div className="text-[10px] uppercase tracking-widest text-primary">{userDiv === "NB1" ? "NB I" : "NB II"}</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((n) => {
            const active = tab === n.id;
            const badge = n.id === "inbox" ? inboxCount : n.id === "transfers" ? (state.career.offers?.length ?? 0) : n.id === "manager" ? (state.manager.jobOffers?.length ?? 0) : 0;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left text-sm transition ${
                  active
                    ? "border-primary bg-secondary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <span className="w-4 text-center text-base opacity-80">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-border p-2">
          <button
            onClick={() => { if (confirm("Biztosan új játékot kezdesz? Az aktuális mentés elveszik.")) reset(); }}
            className="w-full rounded border border-border bg-secondary/60 px-2 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
          >
            Új játék
          </button>
        </div>
      </aside>

      {/* MAIN COLUMN */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP STATUS BAR */}
        <header
          className="flex items-center gap-4 border-b border-border px-4 py-2"
          style={{ background: "var(--header-bg)" }}
        >
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as Tab)}
            className="md:hidden rounded border border-border bg-card px-2 py-1 text-xs"
          >
            {NAV.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>

          <div className="hidden md:flex items-center gap-5 text-xs">
            <StatusItem label="Szezon" value={`#${state.season}`} />
            <StatusItem label="Forduló" value={`${currentRound} / ${totalRounds}`} />
            <StatusItem label="Helyezés" value={`${userRow}.`} accent />
            <StatusItem label="Pont" value={`${userPts}`} />
            <StatusItem label="Morál" value={moraleLabel} />
            <StatusItem label="Kupa" value={state.cup.currentStage === "done" ? "vége" : "aktív"} />
            <StatusItem label="Költségvetés" value={`${state.career.budget}M`} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/history"
              className="hidden md:inline-flex items-center rounded border border-border bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:border-primary hover:text-primary"
            >
              Archívum
            </Link>
            {seasonOver ? (
              <button
                onClick={nextSeason}
                className="rounded bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow hover:opacity-90"
              >
                ▶ Új szezon
              </button>
            ) : userNext ? (
              <Link
                to="/match"
                className="rounded bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow hover:opacity-90"
              >
                ▶ Tovább
              </Link>
            ) : (
              <button
                onClick={advance}
                className="rounded bg-primary px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow hover:opacity-90"
              >
                ▶ Tovább
              </button>
            )}
          </div>
        </header>

        {/* PAGE TITLE BAR */}
        <div className="flex items-center justify-between border-b border-border bg-card/40 px-4 py-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            <span className="text-primary">●</span>
            <span>{NAV.find((n) => n.id === tab)?.label}</span>
          </div>
          <div className="hidden sm:block text-[10px] uppercase tracking-widest text-muted-foreground">
            {!seasonOver ? <><Kbd>Space</Kbd> meccs · <Kbd>S</Kbd> szim</> : <><Kbd>Enter</Kbd> új szezon</>}
          </div>
        </div>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-4">
          {tab === "overview" && (
            <OverviewTab
              state={state}
              seasonOver={seasonOver}
              champion={champion}
              userNext={userNext}
              opponentId={opponentId}
              userIsHome={userIsHome}
              advance={advance}
              nextSeason={nextSeason}
              userDiv={userDiv}
              currentRound={currentRound}
              totalRounds={totalRounds}
              userRow={userRow}
              userPts={userPts}
              moraleLabel={moraleLabel}
            />
          )}

          {tab === "league" && (
            <div className="space-y-4">
              <DivisionTabs value={tableDiv} onChange={setTableDiv} userDiv={userDiv} otherDiv={otherDiv} />
              <LeagueTablePanel
                table={table}
                state={state}
                division={tableDiv}
                otherDivisionRounds={divisionRounds(tableDiv)}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <ResultsPanel state={state} lastRound={lastRound} division={tableDiv} />
                <FixturesPanel state={state} currentRound={currentRound} division={tableDiv} />
              </div>
              <ScorersPanel scorers={scorers} headerExtra={
                <DivisionMiniTabs value={scorersDiv} onChange={setScorersDiv} />
              } />
            </div>
          )}

          {tab === "cup" && <CupBracketPanel state={state} />}

          {tab === "europe" && <EuropePanel />}

          {tab === "squad" && <UserSquadPanel teamId={state.userTeamId} />}

          {tab === "tactics" && <MoralePanel state={state} />}

          {tab === "press" && <PressPanel />}

          {tab === "transfers" && <TransfersPanel />}
          {tab === "scouting" && <ScoutingPanel />}
          {tab === "academy" && <AcademyPanel />}
          {tab === "manager" && <ManagerPanel />}


          {tab === "inbox" && (
            <div className="grid gap-4 md:grid-cols-2">
              <InboxPanel state={state} onClear={clearInbox} />
              <AchievementsPanel state={state} />
            </div>
          )}

          {tab === "history" && <HistoryPanel state={state} />}
        </main>
      </div>
    </div>
  );
}

function StatusItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className={`font-bold ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

function OverviewTab({
  state, seasonOver, champion, userNext, opponentId, userIsHome,
  advance, nextSeason, userDiv, currentRound, totalRounds, userRow, userPts, moraleLabel,
}: {
  state: NonNullable<ReturnType<typeof useSeason>["state"]>;
  seasonOver: boolean;
  champion: ReturnType<typeof buildTable>[number] | null;
  userNext: ReturnType<NonNullable<ReturnType<typeof useSeason>["state"]>["fixtures"]["find"]>;
  opponentId: string | null;
  userIsHome: boolean;
  advance: () => void;
  nextSeason: () => void;
  userDiv: Division;
  currentRound: number;
  totalRounds: number;
  userRow: number;
  userPts: number;
  moraleLabel: string;
}) {
  void opponentId;
  return (
    <div className="space-y-4">
      {seasonOver && champion ? (
        <div className="flex flex-col items-center gap-4 rounded border border-primary/40 bg-card p-6 text-center md:flex-row md:justify-between md:text-left">
          <div className="flex items-center gap-4">
            <TeamLogo id={champion.teamId} size={56} />
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary">Szezon vége · #{state.season}</div>
              <div className="text-2xl font-bold">{userDiv === "NB1" ? "NB I bajnok" : "NB II bajnok"}: {teamName(champion.teamId)}</div>
              <div className="text-xs text-muted-foreground">{champion.pts} pont · gólkül. {champion.gd > 0 ? "+" : ""}{champion.gd}</div>
            </div>
          </div>
          <button
            onClick={nextSeason}
            className="rounded bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg transition hover:opacity-90"
          >
            ▶ Új szezon (#{state.season + 1})
          </button>
        </div>
      ) : userNext ? (
        <NextMatchCard
          state={state}
          userNext={userNext}
          userIsHome={userIsHome}
          currentRound={currentRound}
          advance={advance}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{currentRound}. forduló · nincs lejátszandó meccsed</p>
          <button onClick={advance} className="rounded bg-primary px-6 py-3 text-base font-bold text-primary-foreground hover:opacity-90">
            ▶ Forduló szimulálása
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewCard label="Helyezés" value={`${userRow}.`} hint={userDiv === "NB1" ? "NB I" : "NB II"} />
        <OverviewCard label="Pont" value={`${userPts}`} hint={`${currentRound - 1} forduló után`} />
        <OverviewCard label="Morál" value={moraleLabel} hint={`${Math.round(state.morale)} / 100`} />
        <OverviewCard label="Szezon" value={`#${state.season}`} hint={`${currentRound} / ${totalRounds}`} />
      </div>
    </div>
  );
}

function OverviewCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ----- Next match card with kickoff time, form, predicted XI ----- */

const POS_LABEL: Record<Pos, string> = { GK: "K", DF: "V", MF: "K", FW: "T" };
const POS_FULL: Record<Pos, string> = { GK: "Kapus", DF: "Védő", MF: "Középpályás", FW: "Csatár" };

/** Deterministic kickoff time per fixture (Sat 15:00/17:30/20:00 or Sun 17:00). */
function kickoffFor(round: number, fixture: Fixture): { day: string; time: string; channel: string } {
  const seed = (round * 31 + fixture.home.charCodeAt(0) + fixture.away.charCodeAt(0)) % 4;
  const slots = [
    { day: "Szombat", time: "15:00", channel: "M4 Sport" },
    { day: "Szombat", time: "17:30", channel: "M4 Sport+" },
    { day: "Szombat", time: "20:00", channel: "M4 Sport" },
    { day: "Vasárnap", time: "17:00", channel: "M4 Sport" },
  ];
  return slots[seed];
}

/** Last 5 league results for a team — newest LAST. */
function teamForm(state: SeasonState, teamId: string): ("W" | "D" | "L")[] {
  const all: Fixture[] = [...state.fixtures, ...state.otherFixtures];
  const played = all
    .filter((f) => f.played && (f.home === teamId || f.away === teamId))
    .sort((a, b) => a.round - b.round)
    .slice(-5);
  return played.map((f) => {
    const isHome = f.home === teamId;
    const own = isHome ? f.homeGoals! : f.awayGoals!;
    const opp = isHome ? f.awayGoals! : f.homeGoals!;
    return own > opp ? "W" : own === opp ? "D" : "L";
  });
}

function FormPills({ form }: { form: ("W" | "D" | "L")[] }) {
  if (form.length === 0) {
    return <span className="text-[10px] text-muted-foreground">— nincs adat —</span>;
  }
  const cls = (r: "W" | "D" | "L") =>
    r === "W"
      ? "bg-[color:var(--win)]/25 text-[color:var(--win)]"
      : r === "D"
      ? "bg-[color:var(--draw)]/25 text-[color:var(--draw)]"
      : "bg-[color:var(--loss)]/25 text-[color:var(--loss)]";
  return (
    <div className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={`grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${cls(r)}`}
          title={r === "W" ? "Győzelem" : r === "D" ? "Döntetlen" : "Vereség"}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function PredictedXI({ teamId, isUser, state }: { teamId: string; isUser: boolean; state: SeasonState }) {
  const team = getTeam(teamId)!;
  const tactics = isUser
    ? normalizeTactics(state.tactics, teamId)
    : { formation: "4-3-3" as const, mentality: "balanced" as const, lineup: autoLineup(team, "4-3-3") };
  const players = lineupPlayers(tactics, team);
  const shape = FORMATIONS[tactics.formation];
  const groups: Pos[] = ["GK", "DF", "MF", "FW"];
  const byPos: Record<Pos, typeof players> = { GK: [], DF: [], MF: [], FW: [] };
  for (const p of players) byPos[p.pos].push(p);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Kezdő 11 · {tactics.formation}</span>
        {isUser && <span className="text-primary">saját taktika</span>}
      </div>
      <div className="space-y-1">
        {groups.map((pos) => {
          const list = byPos[pos];
          if (list.length === 0) return null;
          return (
            <div key={pos} className="flex items-start gap-2">
              <span
                className="mt-0.5 grid h-4 w-5 shrink-0 place-items-center rounded bg-secondary text-[9px] font-bold text-muted-foreground"
                title={POS_FULL[pos]}
              >
                {POS_LABEL[pos]}
              </span>
              <span className="text-[11px] leading-tight">
                {list.map((p) => p.name).join(", ")}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Felállás {Object.entries(shape).filter(([k]) => k !== "GK").map(([, v]) => v).join("-")}
      </div>
    </div>
  );
}

function NextMatchCard({
  state, userNext, userIsHome, currentRound, advance,
}: {
  state: SeasonState;
  userNext: Fixture;
  userIsHome: boolean;
  currentRound: number;
  advance: () => void;
}) {
  const ko = kickoffFor(currentRound, userNext);
  const homeForm = teamForm(state, userNext.home);
  const awayForm = teamForm(state, userNext.away);

  return (
    <div className="rounded border border-border bg-card p-5">
      {/* Time strip */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="rounded bg-primary/15 px-2 py-0.5 font-bold text-primary">{currentRound}. forduló</span>
          <span>{userIsHome ? "Hazai pálya" : "Idegenben"}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span>📅</span><span className="font-semibold text-foreground">{ko.day}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span>⏰</span><span className="font-mono font-bold text-foreground">{ko.time}</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground">
            <span>📺</span><span className="font-semibold text-foreground">{ko.channel}</span>
          </span>
        </div>
      </div>

      {/* Head-to-head */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo id={userNext.home} size={56} />
          <span className="font-bold">{teamName(userNext.home)}</span>
          {userNext.home === state.userTeamId && <span className="text-[10px] uppercase tracking-widest text-primary">Te</span>}
          <FormPills form={homeForm} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-3xl font-bold text-muted-foreground">VS</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{ko.time}</div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <TeamLogo id={userNext.away} size={56} />
          <span className="font-bold">{teamName(userNext.away)}</span>
          {userNext.away === state.userTeamId && <span className="text-[10px] uppercase tracking-widest text-primary">Te</span>}
          <FormPills form={awayForm} />
        </div>
      </div>

      {/* Predicted XI */}
      <div className="mt-5 grid gap-4 border-t border-border pt-4 md:grid-cols-2">
        <PredictedXI teamId={userNext.home} isUser={userNext.home === state.userTeamId} state={state} />
        <PredictedXI teamId={userNext.away} isUser={userNext.away === state.userTeamId} state={state} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          to="/match"
          className="rounded bg-primary px-8 py-3 text-center text-base font-bold text-primary-foreground shadow transition hover:opacity-90"
        >
          ▶ Meccs lejátszása
        </Link>
        <button
          onClick={advance}
          className="rounded border border-border bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground hover:border-primary"
        >
          ⏩ Szimulálás
        </button>
      </div>
    </div>
  );
}

// Re-export to satisfy unused-warning silencers
void TEAMS;
void Stat;
