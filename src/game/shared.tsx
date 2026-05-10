import { TEAMS } from "@/game/data";
import { teamLogo } from "@/game/logos";

export function teamShort(id: string) { return TEAMS.find((t) => t.id === id)?.short ?? id; }
export function teamName(id: string) { return TEAMS.find((t) => t.id === id)?.name ?? id; }
export function teamColor(id: string) { return TEAMS.find((t) => t.id === id)?.color ?? "var(--muted)"; }

export function TeamLogo({ id, size = 20 }: { id: string; size?: number }) {
  const src = teamLogo(id);
  if (src) {
    return (
      <img
        src={src}
        alt={`${teamName(id)} címer`}
        className="inline-block shrink-0 object-contain"
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className="inline-block shrink-0 rounded-sm border border-border/60"
      style={{ width: size, height: size, backgroundColor: teamColor(id) }}
    />
  );
}

export function TeamBadge({ id, withName = true }: { id: string; withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <TeamLogo id={id} size={18} />
      {withName && <span className="truncate">{teamName(id)}</span>}
    </span>
  );
}

export function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

export function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="glass-chip rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

export function RatingPill({ r }: { r: number }) {
  const tone =
    r >= 80 ? "bg-[color:var(--win)]/20 text-[color:var(--win)]" :
    r >= 70 ? "bg-accent/20 text-accent" :
    r >= 60 ? "bg-secondary text-secondary-foreground" :
    "bg-muted text-muted-foreground";
  return <span className={`glass-chip rounded px-2 py-0.5 font-mono text-xs font-bold ${tone}`}>{r}</span>;
}
