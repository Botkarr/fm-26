import { Panel } from "@/game/shared";
import { useSeason } from "@/game/store";
import { PRESS_LABEL, PRESS_QUESTIONS, pressOption, pressEffect, type PressTone } from "@/game/career";
import { useMemo } from "react";

export function PressPanel() {
  const { state, doPress } = useSeason();
  const question = useMemo(
    () => PRESS_QUESTIONS[(state?.currentRound ?? 0) % PRESS_QUESTIONS.length],
    [state?.currentRound],
  );
  if (!state) return null;
  const lp = state.career.lastPress;
  const alreadyForRound = lp?.round === state.currentRound;

  const tones: PressTone[] = ["motivational", "neutral", "provocative"];

  return (
    <Panel title="Sajtótájékoztató">
      <p className="mb-2 text-sm font-semibold">„{question}”</p>
      <p className="mb-3 text-[11px] text-muted-foreground">
        A nyilatkozat hat a csapat moráljára és a következő meccs támadójátékára.
      </p>
      {alreadyForRound ? (
        <div className="rounded border border-primary/40 bg-card p-3 text-sm">
          <div className="text-[10px] uppercase tracking-widest text-primary">Mai nyilatkozat</div>
          <div className="font-semibold">{PRESS_LABEL[lp!.tone]}</div>
          <p className="mt-1 text-xs text-muted-foreground">{pressOption(question, lp!.tone)}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tones.map((t) => {
            const eff = pressEffect(t);
            return (
              <button
                key={t}
                onClick={() => doPress(t)}
                className="flex w-full items-start gap-3 rounded border border-border bg-card p-3 text-left text-sm hover:border-primary"
              >
                <span className="rounded bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {PRESS_LABEL[t]}
                </span>
                <span className="flex-1 text-xs">{pressOption(question, t)}</span>
                <span className="shrink-0 text-right text-[10px] text-muted-foreground">
                  <div>morál {eff.moraleDelta > 0 ? `+${eff.moraleDelta}` : eff.moraleDelta}</div>
                  <div>támadás +{Math.round(eff.attackBonus * 100)}%</div>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
