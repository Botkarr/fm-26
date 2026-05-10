import { useMemo, useState } from "react";
import { Panel } from "@/game/shared";
import {
  getNB3, getEuropeanLeagues, getFreeAgents, getYouthSquad, getDatabaseStats,
  type ExtClub,
} from "@/game/players/extended-db";
import { TEAMS } from "@/game/data";
import type { PlayerProfile } from "@/game/players/attributes";
import { PlayerProfileCard } from "@/game/panels/player-profile";

type Tab = "stats" | "nb3" | "youth" | "euro" | "fa";

export function ScoutingPanel() {
  const [tab, setTab] = useState<Tab>("stats");
  const [selected, setSelected] = useState<PlayerProfile | null>(null);

  return (
    <Panel title="Scouting & globális adatbázis">
      <div className="mb-3 flex flex-wrap gap-1 border-b border-border pb-2">
        <TabBtn cur={tab} v="stats" onClick={setTab}>Áttekintés</TabBtn>
        <TabBtn cur={tab} v="nb3" onClick={setTab}>NB III régiók</TabBtn>
        <TabBtn cur={tab} v="youth" onClick={setTab}>Ifi (U19)</TabBtn>
        <TabBtn cur={tab} v="euro" onClick={setTab}>Európa</TabBtn>
        <TabBtn cur={tab} v="fa" onClick={setTab}>Free agent</TabBtn>
      </div>

      {tab === "stats" && <StatsView />}
      {tab === "nb3" && <NB3View onSelect={setSelected} />}
      {tab === "youth" && <YouthView onSelect={setSelected} />}
      {tab === "euro" && <EuroView onSelect={setSelected} />}
      {tab === "fa" && <FreeAgentView onSelect={setSelected} />}

      {selected && <PlayerProfileCard profile={selected} onClose={() => setSelected(null)} />}
    </Panel>
  );
}

function TabBtn({ cur, v, onClick, children }: { cur: Tab; v: Tab; onClick: (t: Tab) => void; children: React.ReactNode }) {
  const active = cur === v;
  return (
    <button
      onClick={() => onClick(v)}
      className={`rounded px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest transition ${
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/* ============== ÁTTEKINTÉS ============== */

function StatsView() {
  const [stats, setStats] = useState<ReturnType<typeof getDatabaseStats> | null>(null);
  return (
    <div className="space-y-3">
      {!stats ? (
        <div className="rounded border border-border bg-card/40 p-6 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            Az NB III, európai topligák és free agent pool igény szerint generálódik.
            Az első betöltés ~1-2 másodperc.
          </p>
          <button
            onClick={() => setStats(getDatabaseStats())}
            className="rounded bg-primary px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary-foreground"
          >
            Adatbázis betöltése
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="NB I + NB II" value={`${TEAMS.length} csapat`} />
          <Stat label="NB III régiók" value={`8 × 14 = ${stats.nb3Clubs}`} />
          <Stat label="NB III játékos" value={`~${stats.nb3Players}`} />
          <Stat label="Európai ligák" value={`${stats.euroLeagues}`} />
          <Stat label="Európai klubok" value={`${stats.euroClubs}`} />
          <Stat label="Európai játékos" value={`~${stats.euroPlayers}`} />
          <Stat label="Ifi (U19)" value={`${stats.youthPlayers}`} />
          <Stat label="Free agent" value={`${stats.freeAgents}`} />
          <Stat label="Összesen" value={`~${stats.totalEstimate}`} hl />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hl }: { label: string; value: string; hl?: boolean }) {
  return (
    <div className={`rounded border p-2.5 ${hl ? "border-primary bg-primary/10" : "border-border bg-card/40"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold ${hl ? "text-primary" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

/* ============== NB III ============== */

function NB3View({ onSelect }: { onSelect: (p: PlayerProfile) => void }) {
  const data = useMemo(() => getNB3(), []);
  const regions = Object.keys(data);
  const [region, setRegion] = useState(regions[0]);
  const [clubId, setClubId] = useState<string>(data[regions[0]][0].id);
  const club = data[region].find((c) => c.id === clubId) ?? data[region][0];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => { setRegion(r); setClubId(data[r][0].id); }}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              r === region ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <select
        value={clubId}
        onChange={(e) => setClubId(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
      >
        {data[region].map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <ClubSquadList club={club} onSelect={onSelect} />
    </div>
  );
}

/* ============== IFI ============== */

function YouthView({ onSelect }: { onSelect: (p: PlayerProfile) => void }) {
  const [clubId, setClubId] = useState(TEAMS[0].id);
  const youth = useMemo(() => getYouthSquad(clubId), [clubId]);
  return (
    <div className="space-y-2">
      <select
        value={clubId}
        onChange={(e) => setClubId(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
      >
        {TEAMS.map((t) => (
          <option key={t.id} value={t.id}>{t.name} U19</option>
        ))}
      </select>
      <PlayerList players={youth} onSelect={onSelect} />
    </div>
  );
}

/* ============== EURÓPA ============== */

function EuroView({ onSelect }: { onSelect: (p: PlayerProfile) => void }) {
  const data = useMemo(() => getEuropeanLeagues(), []);
  const leagues = Object.keys(data);
  const [league, setLeague] = useState(leagues[0]);
  const [clubId, setClubId] = useState(data[leagues[0]][0].id);
  const club = data[league].find((c) => c.id === clubId) ?? data[league][0];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {leagues.map((l) => (
          <button
            key={l}
            onClick={() => { setLeague(l); setClubId(data[l][0].id); }}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
              l === league ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
      <select
        value={clubId}
        onChange={(e) => setClubId(e.target.value)}
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
      >
        {data[league].map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <ClubSquadList club={club} onSelect={onSelect} />
    </div>
  );
}

/* ============== FREE AGENT ============== */

function FreeAgentView({ onSelect }: { onSelect: (p: PlayerProfile) => void }) {
  const all = useMemo(() => getFreeAgents(), []);
  const [posF, setPosF] = useState<"" | "GK" | "DF" | "MF" | "FW">("");
  const [minR, setMinR] = useState(60);
  const filtered = useMemo(() => {
    return all
      .filter((p) => (posF ? p.pos === posF : true) && p.rating >= minR)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 200);
  }, [all, posF, minR]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["", "GK", "DF", "MF", "FW"] as const).map((p) => (
            <button
              key={p || "all"}
              onClick={() => setPosF(p)}
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                posF === p ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {p || "Mind"}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          Min rating
          <input
            type="range" min={50} max={90} value={minR}
            onChange={(e) => setMinR(parseInt(e.target.value))}
            className="w-32"
          />
          <span className="w-6 font-mono text-foreground">{minR}</span>
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {filtered.length} találat (max. 200 megjelenítve, rating szerint).
      </p>
      <PlayerList players={filtered} onSelect={onSelect} showValue />
    </div>
  );
}

/* ============== KÖZÖS LISTÁZÓ ============== */

function ClubSquadList({ club, onSelect }: { club: ExtClub; onSelect: (p: PlayerProfile) => void }) {
  return (
    <div className="rounded border border-border bg-card/40">
      <div className="border-b border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        {club.name} · {club.league} · keret-CA ~{club.baseCA}
      </div>
      <PlayerList players={[...club.squad].sort((a, b) => b.rating - a.rating)} onSelect={onSelect} />
    </div>
  );
}

function PlayerList({ players, onSelect, showValue }: { players: PlayerProfile[]; onSelect: (p: PlayerProfile) => void; showValue?: boolean }) {
  return (
    <ul className="max-h-[480px] divide-y divide-border overflow-y-auto">
      {players.map((p, i) => (
        <li key={i}>
          <button
            onClick={() => onSelect(p)}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-secondary"
          >
            <span className="w-6 text-[10px] font-bold uppercase text-muted-foreground">{p.pos}</span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="w-8 text-right text-[10px] text-muted-foreground">{p.age}é</span>
            <span className="w-8 text-right text-[10px] text-muted-foreground">{p.nationality}</span>
            {showValue && <span className="w-12 text-right font-mono text-[11px]">{p.value}M</span>}
            <span className={`w-8 text-right font-mono font-bold ${p.rating >= 80 ? "text-green-400" : p.rating >= 70 ? "text-yellow-400" : "text-foreground"}`}>
              {p.rating}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
