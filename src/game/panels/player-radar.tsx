import { useMemo } from "react";
import type { PlayerProfile, Attributes } from "@/game/players/attributes";
import { attrColor } from "@/game/players/attributes";

type AxisKey = keyof Attributes;

const AXES: { key: AxisKey; label: string }[] = [
  { key: "pace", label: "Sebesség" },
  { key: "finishing", label: "Befejezés" },
  { key: "passing", label: "Passz" },
  { key: "dribbling", label: "Csel" },
  { key: "technique", label: "Technika" },
  { key: "vision", label: "Játékszem" },
  { key: "tackling", label: "Szerelés" },
  { key: "marking", label: "Fogás" },
  { key: "strength", label: "Erő" },
  { key: "stamina", label: "Állóképesség" },
  { key: "decisions", label: "Döntés" },
  { key: "workRate", label: "Munkabírás" },
];

function valueOf(p: PlayerProfile, k: AxisKey): number {
  const v = p.attrs[k];
  return typeof v === "number" ? v : 0;
}

function polygonPoints(values: number[], cx: number, cy: number, radius: number) {
  const n = values.length;
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (Math.max(0, Math.min(20, v)) / 20) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function PlayerRadarCompare({
  a, b, onClose,
}: {
  a: PlayerProfile;
  b: PlayerProfile;
  onClose: () => void;
}) {
  const cx = 100, cy = 100, R = 80;
  const av = useMemo(() => AXES.map((x) => valueOf(a, x.key)), [a]);
  const bv = useMemo(() => AXES.map((x) => valueOf(b, x.key)), [b]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-4 py-3">
          <div className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Játékos összehasonlítás
          </div>
          <button
            onClick={onClose}
            className="rounded border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest hover:border-destructive hover:text-destructive"
          >
            Bezár
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto_1fr]">
          <PlayerHeader player={a} color="hsl(220 90% 60%)" align="left" />
          <div className="self-center text-center text-xs uppercase tracking-widest text-muted-foreground">vs</div>
          <PlayerHeader player={b} color="hsl(20 90% 60%)" align="right" />
        </div>

        <div className="grid gap-4 p-4 pt-0 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <svg viewBox="0 0 200 200" className="h-64 w-64">
              {/* grid rings */}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <polygon
                  key={f}
                  points={polygonPoints(AXES.map(() => 20 * f), cx, cy, R)}
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.15"
                  strokeWidth="0.6"
                />
              ))}
              {/* spokes */}
              {AXES.map((_, i) => {
                const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={cx} y1={cy}
                    x2={cx + Math.cos(angle) * R}
                    y2={cy + Math.sin(angle) * R}
                    stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.4"
                  />
                );
              })}
              {/* player A polygon */}
              <polygon points={polygonPoints(av, cx, cy, R)} fill="hsl(220 90% 60% / 0.25)" stroke="hsl(220 90% 60%)" strokeWidth="1.2" />
              {/* player B polygon */}
              <polygon points={polygonPoints(bv, cx, cy, R)} fill="hsl(20 90% 60% / 0.25)" stroke="hsl(20 90% 60%)" strokeWidth="1.2" />
              {/* labels */}
              {AXES.map((ax, i) => {
                const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
                const lx = cx + Math.cos(angle) * (R + 12);
                const ly = cy + Math.sin(angle) * (R + 12);
                return (
                  <text
                    key={ax.key}
                    x={lx} y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="6.5"
                    fill="currentColor"
                    fillOpacity="0.7"
                  >
                    {ax.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="space-y-1">
            {AXES.map((ax, i) => {
              const va = av[i], vb = bv[i];
              const diff = va - vb;
              return (
                <div key={ax.key} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-[11px]">
                  <span className={`text-right font-mono font-bold ${attrColor(va)}`}>{va}</span>
                  <div className="text-center text-muted-foreground">
                    {ax.label}
                    {diff !== 0 && (
                      <span className={`ml-1 text-[9px] ${diff > 0 ? "text-blue-400" : "text-orange-400"}`}>
                        ({diff > 0 ? "+" : ""}{diff})
                      </span>
                    )}
                  </div>
                  <span className={`text-left font-mono font-bold ${attrColor(vb)}`}>{vb}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerHeader({
  player, color, align,
}: {
  player: PlayerProfile;
  color: string;
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="flex items-center gap-2" style={{ flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <span className="rounded px-2 py-0.5 font-mono text-sm font-bold text-white" style={{ backgroundColor: color }}>
          {player.rating}
        </span>
        <span className="truncate font-bold">{player.name}</span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        {player.pos} · {player.age}é · {player.value}M Ft
      </div>
    </div>
  );
}
