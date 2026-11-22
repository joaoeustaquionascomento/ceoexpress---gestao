import type { Instrument, InstrumentId } from "../tipos";
import { armadilhasDecisao } from "./armadilhas-decisao";
import { barreirasMudanca } from "./barreiras-mudanca";
import { ieLideranca } from "./ie-lideranca";
import { menteAFavor } from "./mente-a-favor";
import { perfilEmpreendedor } from "./perfil-empreendedor";
import { rodaVida } from "./roda-vida";

/** As avaliações próprias da CEOEXPRESS, na ordem em que aparecem para o mentor. */
export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  roda_vida: rodaVida,
  ie_lideranca: ieLideranca,
  barreiras_mudanca: barreirasMudanca,
  armadilhas_decisao: armadilhasDecisao,
  perfil_empreendedor: perfilEmpreendedor,
  mente_a_favor: menteAFavor,
};

export const INSTRUMENT_LIST: Instrument[] = Object.values(INSTRUMENTS);

export function itemCount(instr: Instrument): number {
  return (instr.index?.items.length ?? 0) + instr.dimensions.reduce((n, d) => n + d.items.length, 0);
}
