// Team crest images mapped by team id.
// NB I
import debrecen from "@/assets/logos/debrecen.png";
import diosgyor from "@/assets/logos/diosgyor.png";
import ftc from "@/assets/logos/ftc.png";
import gyor from "@/assets/logos/gyor.png";
import kazincbarcika from "@/assets/logos/kazincbarcika.png";
import kisvarda from "@/assets/logos/kisvarda.png";
import mtk from "@/assets/logos/mtk.png";
import nyiregyhaza from "@/assets/logos/nyiregyhaza.png";
import paks from "@/assets/logos/paks.png";
import puskas from "@/assets/logos/puskas.png";
import ujpest from "@/assets/logos/ujpest.png";
import zte from "@/assets/logos/zte.png";
// NB II
import ajka from "@/assets/logos/ajka.png";
import bekescsaba from "@/assets/logos/bekescsaba.png";
import budafok from "@/assets/logos/budafok.png";
import bvsc from "@/assets/logos/bvsc.png";
import csakvar from "@/assets/logos/csakvar.png";
import honved from "@/assets/logos/honved.png";
import karcag from "@/assets/logos/karcag.png";
import kecskemet from "@/assets/logos/kecskemet.png";
import kozarmisleny from "@/assets/logos/kozarmisleny.png";
import mezokovesd from "@/assets/logos/mezokovesd.png";
import soroksar from "@/assets/logos/soroksar.png";
import szeged from "@/assets/logos/szeged.png";
import szentlorinc from "@/assets/logos/szentlorinc.png";
import tiszakecske from "@/assets/logos/tiszakecske.png";
import vasas from "@/assets/logos/vasas.png";
import videoton from "@/assets/logos/videoton.png";

export const TEAM_LOGOS: Record<string, string> = {
  // NB I
  debrecen, diosgyor, ftc, gyor, kazincbarcika, kisvarda, mtk, nyiregyhaza,
  paks, puskas, ujpest, zte,
  // NB II
  ajka, bekescsaba, budafok, bvsc, csakvar, honved, karcag, kecskemet,
  kozarmisleny, mezokovesd, soroksar, szeged, szentlorinc, tiszakecske,
  vasas, videoton,
};

export function teamLogo(id: string): string | undefined {
  return TEAM_LOGOS[id];
}
