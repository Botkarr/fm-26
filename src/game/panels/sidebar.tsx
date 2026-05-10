import { Link } from "@tanstack/react-router";
import { Panel, TeamLogo, Empty, teamShort } from "@/game/shared";
import type { SeasonState } from "@/game/engine";
import { ACHIEVEMENTS } from "@/game/achievements";

export function InboxPanel({ state, onClear }: { state: SeasonState; onClear: () => void }) {
  const items = [...state.inbox].slice(-8).reverse();
  return (
    <Panel
      title={`Inbox${state.inbox.length > 0 ? ` · ${state.inbox.length}` : ""}`}
      action={
        state.inbox.length > 0 ? (
          <button
            onClick={onClear}
            className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            Törlés
          </button>
        ) : null
      }
    >
      {items.length === 0 ? (
        <Empty text="Nincsenek új hírek." />
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex gap-3 py-2 text-sm ${n.important ? "bg-primary/5 -mx-2 px-2 rounded" : ""}`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`truncate font-semibold ${n.important ? "text-primary" : ""}`}>{n.title}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
                    F{n.round}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AchievementsPanel({ state }: { state: SeasonState }) {
  const unlocked = new Set(state.achievements);
  return (
    <Panel
      title={`Eredmények · ${unlocked.size} / ${ACHIEVEMENTS.length}`}
    >
      <ul className="grid grid-cols-1 gap-1.5">
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a.id);
          return (
            <li
              key={a.id}
              className={`flex items-center gap-2 rounded border px-2 py-1.5 text-sm ${
                got
                  ? "border-primary/40 bg-primary/10"
                  : "border-border/40 bg-secondary/20 opacity-60"
              }`}
              title={a.description}
            >
              <span className={`text-base ${got ? "" : "grayscale"}`}>{a.icon}</span>
              <div className="min-w-0 flex-1">
                <div className={`truncate text-xs font-semibold ${got ? "text-foreground" : "text-muted-foreground"}`}>
                  {a.name}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">{a.description}</div>
              </div>
              {got && <span className="text-[10px] font-bold uppercase tracking-widest text-primary">✓</span>}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function MoralePanel({ state }: { state: SeasonState }) {
  const m = Math.round(state.morale);
  const label =
    m >= 80 ? "Kiváló" :
    m >= 65 ? "Jó" :
    m >= 50 ? "Stabil" :
    m >= 35 ? "Ingatag" :
    "Válságos";
  const tone =
    m >= 65 ? "bg-[color:var(--win)]" :
    m >= 50 ? "bg-accent" :
    m >= 35 ? "bg-[color:var(--draw)]" :
    "bg-[color:var(--loss)]";
  return (
    <Panel title="Csapathangulat">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tabular-nums">{m}</span>
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className={`h-full transition-all ${tone}`} style={{ width: `${m}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Az utolsó 3 meccs eredménye alapján változik. Hatással van a csapat teljesítményére.
      </p>
    </Panel>
  );
}

export function HistoryPanel({ state }: { state: SeasonState }) {
  if (state.history.length === 0) return null;
  return (
    <Panel
      title="Korábbi szezonok"
      action={
        <Link to="/history" className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">
          Összes →
        </Link>
      }
    >
      <ul className="divide-y divide-border/60">
        {[...state.history].reverse().slice(0, 5).map((h) => (
          <li key={h.season} className="flex items-center gap-2 py-2 text-sm">
            <span className="w-12 font-mono text-xs text-muted-foreground">#{h.season}</span>
            <TeamLogo id={h.championId} size={16} />
            <span className="flex-1 truncate">
              <span className="font-semibold">{teamShort(h.championId)}</span>
              <span className="text-muted-foreground"> bajnok</span>
            </span>
            <span className="text-xs text-muted-foreground">{h.userPosition}. hely</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
