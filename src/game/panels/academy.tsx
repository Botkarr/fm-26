import { useState } from "react";
import { Panel } from "@/game/shared";
import { useSeason } from "@/game/store";
import { getTeam } from "@/game/data";
import { PlayerProfileCard } from "@/game/panels/player-profile";
import type { PlayerProfile } from "@/game/players/attributes";

export function AcademyPanel() {
  const { state, promoteYouthPlayer, demoteToYouthPlayer } = useSeason();
  const [selected, setSelected] = useState<PlayerProfile | null>(null);
  if (!state) return null;
  const youth = state.career.youth;
  const team = getTeam(state.userTeamId);
  if (!team) return null;
  const youthSorted = [...youth.squad].sort((a, b) => b.rating - a.rating);
  const demotable = team.squad.filter((p) => p.age <= 20 && !!p.profile);

  return (
    <Panel title={`Akadémia · U19 keret (${youth.squad.length} fő) · ${youth.ticks} fejlődési kör`}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* U19 keret */}
        <section className="rounded border border-border bg-card/40">
          <div className="border-b border-border px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            U19 keret · felhúzható
          </div>
          {youthSorted.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">Üres a keret.</p>
          ) : (
            <ul className="divide-y divide-border">
              {youthSorted.map((p) => (
                <li key={p.name} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="w-7 text-[10px] font-bold uppercase text-muted-foreground">{p.pos}</span>
                  <button
                    onClick={() => setSelected(p)}
                    className="min-w-0 flex-1 truncate text-left hover:text-primary"
                  >
                    {p.name}
                  </button>
                  <span className="w-7 text-right text-[10px] text-muted-foreground">{p.age}é</span>
                  <span className={`w-7 text-right font-mono font-bold ${p.rating >= 75 ? "text-green-400" : p.rating >= 65 ? "text-yellow-400" : "text-foreground"}`}>
                    {p.rating}
                  </span>
                  <button
                    onClick={() => {
                      if (team.squad.length >= 26) {
                        alert("A felnőtt keret megtelt (max. 26 fő).");
                        return;
                      }
                      if (confirm(`Felhúzod ${p.name}-t a felnőtt csapatba?`)) promoteYouthPlayer(p.name);
                    }}
                    className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground"
                  >
                    Felhúz
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Visszaküldhető fiatalok */}
        <section className="rounded border border-border bg-card/40">
          <div className="border-b border-border px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Felnőtt keret 21 év alatt · visszaküldhető
          </div>
          {demotable.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              Nincs visszaküldhető fiatal (21 év feletti vagy nincs profilja).
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {demotable.map((p) => (
                <li key={p.name} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="w-7 text-[10px] font-bold uppercase text-muted-foreground">{p.pos}</span>
                  <button
                    onClick={() => p.profile && setSelected(p.profile)}
                    className="min-w-0 flex-1 truncate text-left hover:text-primary"
                  >
                    {p.name}
                  </button>
                  <span className="w-7 text-right text-[10px] text-muted-foreground">{p.age}é</span>
                  <span className="w-7 text-right font-mono font-bold">{p.rating}</span>
                  <button
                    onClick={() => {
                      if (team.squad.length <= 14) {
                        alert("Min. 14 fős keret kell.");
                        return;
                      }
                      if (confirm(`Visszaküldöd ${p.name}-t az U19-be?`)) demoteToYouthPlayer(p.name);
                    }}
                    className="rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest"
                  >
                    Vissza
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-3 rounded border border-border bg-secondary/40 p-2 text-[11px] text-muted-foreground">
        💡 Az ifik attribútumai fordulónként apránként fejlődnek. A 16-19 éveseknél a leggyorsabb a növekedés;
        24 év után jelentősen lassul. A felhúzott játékosok a felnőtt keretben tovább fejlődnek.
      </div>

      {selected && <PlayerProfileCard profile={selected} onClose={() => setSelected(null)} />}
    </Panel>
  );
}
