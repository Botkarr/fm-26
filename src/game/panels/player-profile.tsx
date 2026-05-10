import type { PlayerProfile, Attributes } from "@/game/players/attributes";
import {
  TECHNICAL_LABELS, MENTAL_LABELS, PHYSICAL_LABELS, GK_LABELS,
  PERSONALITY_LABEL, attrColor,
} from "@/game/players/attributes";

const POS_LABEL: Record<PlayerProfile["pos"], string> = {
  GK: "Kapus", DF: "Védő", MF: "Középpályás", FW: "Csatár",
};

const FOOT_LABEL: Record<string, string> = {
  left: "bal", right: "jobb", both: "kétlábas",
};

function NatFlag({ code }: { code: string }) {
  // Egyszerű ország-emoji a kód alapján
  const flag = code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
  return <span title={code} className="text-base leading-none">{flag}</span>;
}

function AttrRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-1 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-bold ${attrColor(value)}`}>{value}</span>
    </div>
  );
}

function AttrColumn({
  title, attrs, keys, labels,
}: {
  title: string;
  attrs: Attributes;
  keys: (keyof Attributes)[];
  labels: Record<string, string>;
}) {
  return (
    <div>
      <div className="mb-1 border-b border-primary/40 pb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
        {title}
      </div>
      {keys.map((k) => {
        const v = attrs[k];
        if (typeof v !== "number") return null;
        return <AttrRow key={k} label={labels[k as string]} value={v} />;
      })}
    </div>
  );
}

const TECH_KEYS: (keyof Attributes)[] = [
  "corners","crossing","dribbling","finishing","firstTouch","freeKicks","heading",
  "longShots","longThrows","marking","passing","penaltyTaking","tackling","technique",
];
const MENT_KEYS: (keyof Attributes)[] = [
  "aggression","anticipation","bravery","composure","concentration","decisions",
  "determination","flair","leadership","offTheBall","positioning","teamwork","vision","workRate",
];
const PHYS_KEYS: (keyof Attributes)[] = [
  "acceleration","agility","balance","jumping","naturalFitness","pace","stamina","strength",
];
const GK_KEYS: (keyof Attributes)[] = [
  "aerialReach","commandOfArea","communication","handling","kicking","oneOnOnes","reflexes","rushingOut","throwing","eccentricity",
];

export function PlayerProfileCard({
  profile, onClose,
}: {
  profile: PlayerProfile;
  onClose: () => void;
}) {
  const isGK = profile.pos === "GK";
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border bg-secondary/40 p-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-2xl font-black text-primary">
            {profile.number ?? "—"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold">{profile.name}</h2>
              <NatFlag code={profile.nationality} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span>{POS_LABEL[profile.pos]}</span>
              <span>· {profile.age} éves</span>
              <span>· {profile.height} cm / {profile.weight} kg</span>
              <span>· {FOOT_LABEL[profile.foot] ?? profile.foot} lábas</span>
            </div>
            <div className="mt-1.5 inline-block rounded bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
              {PERSONALITY_LABEL[profile.personality]}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="rounded bg-primary px-3 py-1 font-mono text-2xl font-black text-primary-foreground">
              {profile.rating}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              érték: <span className="font-bold text-foreground">{profile.value}M Ft</span>
            </div>
            <button
              onClick={onClose}
              className="mt-1 rounded border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest hover:border-destructive hover:text-destructive"
            >
              Bezár
            </button>
          </div>
        </div>

        {/* Attribute grid */}
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <AttrColumn
            title="Technikai"
            attrs={profile.attrs}
            keys={isGK ? GK_KEYS : TECH_KEYS}
            labels={isGK ? GK_LABELS as Record<string, string> : TECHNICAL_LABELS as Record<string, string>}
          />
          <AttrColumn
            title="Mentális"
            attrs={profile.attrs}
            keys={MENT_KEYS}
            labels={MENTAL_LABELS as Record<string, string>}
          />
          <AttrColumn
            title="Fizikai"
            attrs={profile.attrs}
            keys={PHYS_KEYS}
            labels={PHYSICAL_LABELS as Record<string, string>}
          />
        </div>

        {/* Position aptitudes */}
        <div className="border-t border-border p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            Pozíció-alkalmasság
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.entries(profile.aptitude) as [string, number][])
              .filter(([, v]) => v >= 10)
              .sort(([, a], [, b]) => b - a)
              .map(([pos, v]) => (
                <span
                  key={pos}
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                    v >= 18 ? "bg-green-500/20 text-green-400"
                    : v >= 14 ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {pos} {v}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
