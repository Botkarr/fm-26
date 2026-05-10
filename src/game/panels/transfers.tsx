import { Panel, TeamLogo } from "@/game/shared";
import { useSeason } from "@/game/store";
import { getTeam } from "@/game/data";

export function TransfersPanel() {
  const { state, buyMarketPlayer, acceptTransferOffer, rejectTransferOffer } = useSeason();
  if (!state) return null;
  const { career } = state;
  const offers = career.offers ?? [];

  return (
    <Panel title={`Átigazolási piac · keret ${career.budget}M Ft`}>
      {/* ===== Beérkező ajánlatok ===== */}
      <div className="mb-4 rounded border border-border bg-card/40">
        <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            💰 Beérkező ajánlatok
          </div>
          <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
            {offers.length}
          </span>
        </div>
        {offers.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            Jelenleg nincs ajánlat. AI klubok forduló után jelentkezhetnek a játékosaidért.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {offers.map((o) => {
              const buyer = getTeam(o.fromTeamId);
              const expiresIn = o.expiresIn - (state.currentRound - 1 - o.round);
              return (
                <li key={o.id} className="flex items-center gap-2 px-2 py-2 text-sm">
                  <TeamLogo id={o.fromTeamId} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{o.playerName}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {buyer?.name ?? o.fromTeamId} · lejár {Math.max(1, expiresIn)} forduló múlva
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold text-foreground">{o.amount}M</div>
                    <div className="mt-1 flex gap-1">
                      <button
                        onClick={() => {
                          if (confirm(`Elfogadod: ${o.playerName} → ${buyer?.name} ${o.amount}M Ft-ért?`))
                            acceptTransferOffer(o.id);
                        }}
                        className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground"
                      >
                        Elfogad
                      </button>
                      <button
                        onClick={() => rejectTransferOffer(o.id)}
                        className="rounded border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        Elutasít
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        🛒 Szabad piac
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Szezon közben szabad piac: bármikor szerződtethetsz. Eladás a Keret panelen.
      </p>
      {career.market.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Üres a piac. Új szezonban frissül.</p>
      ) : (
        <ul className="divide-y divide-border">
          {career.market.map((mp) => {
            const canAfford = career.budget >= mp.price;
            return (
              <li key={mp.id} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className="grid h-6 w-6 place-items-center rounded bg-secondary text-[10px] font-bold text-muted-foreground"
                  title={mp.pos}
                >
                  {mp.pos}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{mp.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {mp.age} év · rating {mp.rating}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-mono text-sm font-bold ${canAfford ? "text-foreground" : "text-destructive"}`}>
                    {mp.price}M
                  </div>
                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      if (confirm(`Megveszed: ${mp.name} – ${mp.price}M Ft?`)) buyMarketPlayer(mp.id);
                    }}
                    className="mt-1 rounded bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  >
                    Vétel
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
