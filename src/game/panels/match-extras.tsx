import { useMemo } from "react";
import type { MatchEvent } from "@/game/match";
import { TEAMS } from "@/game/data";

function teamColor(id: string) { return TEAMS.find((t) => t.id === id)?.color ?? "var(--muted)"; }
function teamShort(id: string) { return TEAMS.find((t) => t.id === id)?.short ?? id; }

const SHOT_TYPES = new Set<MatchEvent["type"]>(["chance", "save", "goal"]);

export function XgTimeline({
  events, home, away,
}: {
  events: MatchEvent[]; home: string; away: string;
}) {
  const data = useMemo(() => {
    let h = 0, a = 0;
    const pts: { m: number; h: number; a: number }[] = [{ m: 0, h: 0, a: 0 }];
    const sorted = [...events].sort((x, y) => x.minute - y.minute);
    for (const e of sorted) {
      if (!SHOT_TYPES.has(e.type) || !e.xg) continue;
      if (e.team === home) h += e.xg;
      if (e.team === away) a += e.xg;
      pts.push({ m: e.minute, h: Math.round(h * 100) / 100, a: Math.round(a * 100) / 100 });
    }
    return pts;
  }, [events, home, away]);

  const totalH = data[data.length - 1]?.h ?? 0;
  const totalA = data[data.length - 1]?.a ?? 0;
  const max = Math.max(0.5, totalH, totalA);
  const w = 100, hpx = 60;
  const xAt = (m: number) => (m / 90) * w;
  const yAt = (v: number) => hpx - (v / max) * hpx;

  const pathFor = (key: "h" | "a") =>
    data.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(p.m).toFixed(2)} ${yAt(p[key]).toFixed(2)}`).join(" ");

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span>xG idővonal</span>
        <span className="font-mono normal-case tracking-normal">
          <span style={{ color: teamColor(home) }}>{teamShort(home)} {totalH.toFixed(2)}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span style={{ color: teamColor(away) }}>{teamShort(away)} {totalA.toFixed(2)}</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${hpx}`} className="h-24 w-full" preserveAspectRatio="none">
        <line x1="50" y1="0" x2="50" y2={hpx} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="2 2" />
        <path d={pathFor("h")} fill="none" stroke={teamColor(home)} strokeWidth="1.5" />
        <path d={pathFor("a")} fill="none" stroke={teamColor(away)} strokeWidth="1.5" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>0'</span><span>45'</span><span>90'</span>
      </div>
    </div>
  );
}

export function ShotMap({
  events, home, away,
}: {
  events: MatchEvent[]; home: string; away: string;
}) {
  const shots = events.filter((e) => SHOT_TYPES.has(e.type) && e.shotX != null && e.shotY != null);

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        <span>Lövéstérkép</span>
        <span className="font-mono normal-case tracking-normal text-[10px]">{shots.length} lövés</span>
      </div>
      <div className="relative aspect-[105/68] w-full overflow-hidden rounded border border-border bg-[#0b3d20]">
        {/* Pitch lines */}
        <svg viewBox="0 0 100 64" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <rect x="0.5" y="0.5" width="99" height="63" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <line x1="50" y1="0" x2="50" y2="64" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <circle cx="50" cy="32" r="7" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          {/* boxes */}
          <rect x="0.5" y="14" width="14" height="36" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <rect x="85.5" y="14" width="14" height="36" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <rect x="0.5" y="22" width="5" height="20" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
          <rect x="94.5" y="22" width="5" height="20" fill="none" stroke="white" strokeOpacity="0.5" strokeWidth="0.3" />
        </svg>
        {shots.map((e, i) => {
          const cx = e.shotX!;
          const cy = (e.shotY! / 100) * 64;
          const r = Math.max(0.7, Math.min(2.6, (e.xg ?? 0.05) * 6));
          const isGoal = e.type === "goal";
          const color = teamColor(e.team!);
          return (
            <svg
              key={i}
              viewBox="0 0 100 64"
              className="absolute inset-0 h-full w-full"
              preserveAspectRatio="none"
              style={{ pointerEvents: "none" }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={isGoal ? color : "transparent"}
                fillOpacity={isGoal ? 0.85 : 0}
                stroke={color}
                strokeWidth={isGoal ? 0.4 : 0.5}
                strokeOpacity={0.95}
              />
              {isGoal && (
                <circle cx={cx} cy={cy} r={r + 0.6} fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="0.2" />
              )}
            </svg>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: teamColor(home) }} />
          {teamShort(home)} (→)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: teamColor(away) }} />
          {teamShort(away)} (←)
        </span>
        <span className="ml-auto">teli kör = gól · átmérő ~ xG</span>
      </div>
    </div>
  );
}
