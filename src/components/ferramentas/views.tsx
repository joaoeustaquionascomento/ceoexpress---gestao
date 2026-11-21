/**
 * Visualizações somente leitura das ferramentas (servem ao cliente e à
 * prévia no editor). Sem hooks: funcionam no servidor e no navegador.
 */
import {
  BOARDS,
  BSC_PERSPECTIVES,
  GUT_SCALE,
  isBoardKind,
  krProgress,
  okrProgress,
  type BoardData,
  type BoardKind,
  type BscData,
  type OkrData,
  ISHIKAWA_CATS,
  SWOT_QUADRANTS,
  gutRanking,
  paretoRows,
  type GutData,
  type IshikawaData,
  type ParetoData,
  type SwotData,
  type ToolData,
  type ToolKind,
  type WhyData,
} from "@/lib/ferramentas";

const fmt = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

const quadTone: Record<string, string> = {
  ok: "border-ok/40 bg-ok-bg",
  bad: "border-bad/40 bg-bad-bg",
  info: "border-line bg-tint",
  warn: "border-warn/40 bg-warn-bg",
};

export function SwotView({ data }: { data: SwotData }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SWOT_QUADRANTS.map((q) => (
        <section key={q.key} className={`rounded-xl border p-4 ${quadTone[q.tone]}`}>
          <h3 className="font-semibold text-ink">{q.label}</h3>
          <p className="mb-2 text-xs text-muted">{q.hint}</p>
          {data[q.key].length === 0 ? <p className="text-sm text-muted">Nada registrado.</p> : (
            <ul className="list-disc space-y-1 pl-5 text-sm">{data[q.key].map((i) => <li key={i.id}>{i.text}</li>)}</ul>
          )}
        </section>
      ))}
    </div>
  );
}

export function GutView({ data }: { data: GutData }) {
  const ranked = gutRanking(data.items);
  if (ranked.length === 0) return <p className="text-sm text-muted">Nenhum problema registrado.</p>;
  const max = 125;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">Problemas ordenados pela pontuação GUT</caption>
        <thead className="bg-tint text-xs uppercase tracking-wider text-muted">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Problema</th>
            <th className="px-3 py-2" title={GUT_SCALE.g.label}>G</th>
            <th className="px-3 py-2" title={GUT_SCALE.u.label}>U</th>
            <th className="px-3 py-2" title={GUT_SCALE.t.label}>T</th>
            <th className="w-48 px-3 py-2">Pontuação</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((i, n) => (
            <tr key={i.id} className="border-t border-line">
              <td className="px-3 py-2 tabular-nums text-muted">{n + 1}</td>
              <td className="px-3 py-2">{i.text}</td>
              <td className="px-3 py-2 tabular-nums">{i.g}</td>
              <td className="px-3 py-2 tabular-nums">{i.u}</td>
              <td className="px-3 py-2 tabular-nums">{i.t}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2" title={`${i.score} de 125`}>
                  <div className="h-3 flex-1">
                    <div className="h-3 rounded-r bg-mauve" style={{ width: `${(i.score / max) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold tabular-nums">{i.score}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function WhyView({ data }: { data: WhyData }) {
  const whys = data.porques.filter(Boolean);
  return (
    <ol className="space-y-2 text-sm">
      <li className="rounded-xl border border-line bg-tint p-3"><span className="font-semibold">Problema:</span> {data.problema || "—"}</li>
      {whys.map((w, i) => (
        <li key={i} className="rounded-xl border border-line bg-surface p-3" style={{ marginLeft: `${Math.min(i + 1, 5) * 12}px` }}>
          <span className="font-semibold">Por quê {i + 1}?</span> {w}
        </li>
      ))}
      <li className="rounded-xl border border-bad/40 bg-bad-bg p-3"><span className="font-semibold">Causa raiz:</span> {data.causa_raiz || "—"}</li>
      <li className="rounded-xl border border-ok/40 bg-ok-bg p-3"><span className="font-semibold">Contramedida:</span> {data.contramedida || "—"}</li>
    </ol>
  );
}

export function IshikawaView({ data }: { data: IshikawaData }) {
  const box = (c: (typeof ISHIKAWA_CATS)[number]) => (
    <section key={c.key} className="rounded-xl border border-line bg-surface p-3">
      <h3 className="text-sm font-semibold text-ink">{c.label}</h3>
      {data.causas[c.key].length === 0 ? <p className="text-xs text-muted">—</p> : (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">{data.causas[c.key].map((i) => <li key={i.id}>{i.text}</li>)}</ul>
      )}
    </section>
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">{ISHIKAWA_CATS.slice(0, 3).map(box)}</div>
      <div className="flex items-center gap-2" aria-hidden>
        <div className="h-1 flex-1 rounded bg-mauve" />
        <span className="text-mauve">▶</span>
      </div>
      <div className="rounded-xl bg-plum px-4 py-3 text-white"><span className="text-xs uppercase tracking-wider opacity-80">Efeito</span><p className="font-semibold">{data.efeito || "—"}</p></div>
      <div className="grid gap-3 sm:grid-cols-3">{ISHIKAWA_CATS.slice(3).map(box)}</div>
    </div>
  );
}

/**
 * Pareto sem eixo duplo: barras horizontais ordenadas (valor escrito ao lado)
 * e o acumulado em coluna de texto. As "poucas vitais" vêm em tom escuro e
 * com a marca escrita, para não depender só da cor.
 */
export function ParetoView({ data }: { data: ParetoData }) {
  const { total, rows } = paretoRows(data.items);
  if (rows.length === 0) return <p className="text-sm text-muted">Lance as categorias e os valores para ver o gráfico.</p>;
  const max = rows[0].valor;
  const vital = rows.filter((r) => r.vital);
  const unit = data.unidade ? ` ${data.unidade}` : "";
  return (
    <div className="space-y-3">
      <p className="text-sm">
        <span className="font-semibold">{vital.length} de {rows.length}</span> categorias respondem por{" "}
        <span className="font-semibold">{fmt(vital.at(-1)?.cum ?? 0, 0)}%</span> do total ({fmt(total, 2)}{unit}).
      </p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface p-3">
        <table className="w-full min-w-[520px] text-sm">
          <caption className="sr-only">Pareto: categorias do maior para o menor, com percentual acumulado</caption>
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="py-1 pr-2 text-left font-semibold">Categoria</th>
              <th className="py-1 text-left font-semibold">Valor</th>
              <th className="w-20 py-1 text-right font-semibold">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} title={`${r.categoria}: ${fmt(r.valor, 2)}${unit} (${fmt(r.pct)}%), acumulado ${fmt(r.cum)}%`}>
                <th scope="row" className="w-48 py-1 pr-2 text-left font-normal">
                  {r.categoria}
                  {r.vital && <span className="ml-1 rounded-full bg-tint px-1.5 text-[10px] font-semibold uppercase text-plum">vital</span>}
                </th>
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 flex-1">
                      <div className={`h-3.5 rounded-r ${r.vital ? "bg-plum" : "bg-soft-rose"}`} style={{ width: `${(r.valor / max) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right tabular-nums text-muted">{fmt(r.valor, 2)} · {fmt(r.pct, 0)}%</span>
                  </div>
                </td>
                <td className="py-1 text-right tabular-nums">{fmt(r.cum, 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const gridCols: Record<2 | 3, string> = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" };

/** Quadro genérico (Canvas, PESTEL, 5 Forças, Eisenhower, PDCA). */
export function BoardView({ kind, data }: { kind: BoardKind; data: BoardData }) {
  const cfg = BOARDS[kind];
  return (
    <div className="space-y-3">
      {data.foco && <p className="rounded-xl bg-plum px-4 py-3 text-white"><span className="block text-xs uppercase tracking-wider opacity-80">{cfg.foco.label}</span><span className="font-semibold">{data.foco}</span></p>}
      <div className={`grid gap-3 ${gridCols[cfg.columns]}`}>
        {cfg.sections.map((sec) => {
          const n = data.notas[sec.key] ?? 0;
          return (
            <section key={sec.key} className={`rounded-xl border p-4 ${sec.tone ? quadTone[sec.tone] : "border-line bg-surface"}`}>
              <h3 className="font-semibold text-ink">{sec.label}</h3>
              <p className="mb-2 text-xs text-muted">{sec.hint}</p>
              {cfg.rating && (
                <p className="mb-2 text-xs">
                  <span className="text-muted">{cfg.rating.label}: </span>
                  {n ? (
                    <>
                      <span className="font-semibold">{cfg.rating.levels[n - 1]}</span>
                      <span className="ml-2 inline-flex gap-0.5 align-middle" aria-hidden>
                        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`inline-block h-2 w-3 rounded-sm ${i <= n ? "bg-plum" : "bg-line"}`} />)}
                      </span>
                    </>
                  ) : <span className="text-muted">não avaliado</span>}
                </p>
              )}
              {data.secoes[sec.key].length === 0 ? <p className="text-sm text-muted">Nada registrado.</p> : (
                <ul className="list-disc space-y-1 pl-5 text-sm">{data.secoes[sec.key].map((i) => <li key={i.id}>{i.text}</li>)}</ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function BscView({ data }: { data: BscData }) {
  return (
    <div className="space-y-3">
      {data.visao && <p className="rounded-xl bg-plum px-4 py-3 text-white"><span className="block text-xs uppercase tracking-wider opacity-80">Foco estratégico</span><span className="font-semibold">{data.visao}</span></p>}
      {BSC_PERSPECTIVES.map((p) => (
        <section key={p.key} className="overflow-x-auto rounded-xl border border-line bg-surface">
          <h3 className="border-b border-line bg-tint px-3 py-2 font-semibold text-plum">{p.label} <span className="text-xs font-normal text-muted">· {p.hint}</span></h3>
          {data.perspectivas[p.key].length === 0 ? <p className="px-3 py-2 text-sm text-muted">Nenhum objetivo.</p> : (
            <table className="w-full min-w-[520px] table-fixed text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr><th className="w-1/2 px-3 py-1">Objetivo</th><th className="w-1/4 px-3 py-1">Indicador</th><th className="w-1/4 px-3 py-1">Meta</th></tr>
              </thead>
              <tbody>
                {data.perspectivas[p.key].map((o) => (
                  <tr key={o.id} className="border-t border-line"><td className="px-3 py-2 font-semibold">{o.text}</td><td className="px-3 py-2">{o.indicador || "—"}</td><td className="px-3 py-2">{o.meta || "—"}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-2" title={`${label}: ${value}%`}>
      <div className="h-3 flex-1 rounded bg-line" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-3 rounded ${value >= 100 ? "bg-ok" : "bg-plum"}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-semibold tabular-nums">{value}%</span>
    </div>
  );
}

export function OkrView({ data }: { data: OkrData }) {
  if (data.objetivos.length === 0) return <p className="text-sm text-muted">Nenhum objetivo registrado.</p>;
  return (
    <div className="space-y-3">
      {data.periodo && <p className="text-sm"><span className="text-muted">Período:</span> <span className="font-semibold">{data.periodo}</span></p>}
      {data.objetivos.map((o) => (
        <section key={o.id} className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold text-plum">{o.text}</h3>
          <Progress value={okrProgress(o)} label={`Progresso do objetivo ${o.text}`} />
          <ul className="space-y-2 border-t border-line pt-2 text-sm">
            {o.krs.map((k) => (
              <li key={k.id} className="grid gap-1 sm:grid-cols-[1fr_14rem] sm:items-center">
                <span>{k.text} <span className="text-xs text-muted">(de {fmt(k.inicial, 2)} para {fmt(k.meta, 2)}; atual {fmt(k.atual, 2)})</span></span>
                <Progress value={krProgress(k)} label={k.text} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ToolView({ kind, data }: { kind: ToolKind; data: ToolData[ToolKind] }) {
  if (isBoardKind(kind)) return <BoardView kind={kind} data={data as BoardData} />;
  switch (kind) {
    case "bsc": return <BscView data={data as BscData} />;
    case "okr": return <OkrView data={data as OkrData} />;
    case "swot": return <SwotView data={data as SwotData} />;
    case "gut": return <GutView data={data as GutData} />;
    case "cinco_porques": return <WhyView data={data as WhyData} />;
    case "ishikawa": return <IshikawaView data={data as IshikawaData} />;
    case "pareto": return <ParetoView data={data as ParetoData} />;
  }
}
