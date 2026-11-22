import type { Band } from "@/lib/mentoria/pontuacao";

type Series = { label: string; values: number[]; color: string; dashed?: boolean; fill?: boolean };

/** Quebra um rótulo em até duas linhas de ~16 caracteres. */
function wrap(label: string, max = 16): string[] {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  const lines: string[] = [""];
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if ((cur + " " + w).trim().length <= max || cur === "") lines[lines.length - 1] = (cur + " " + w).trim();
    else lines.push(w);
  }
  return lines.length > 2 ? [lines[0], lines.slice(1).join(" ")] : lines;
}

/**
 * Gráfico radar de 0 a 10. Uma ponta por dimensão; séries sobrepostas
 * (atual, anterior tracejada, desejado). Desenhado em SVG, sai igual na impressão.
 */
export function RadarChart({ labels, series, title }: { labels: string[]; series: Series[]; title: string }) {
  const n = labels.length;
  const size = 520;
  const c = size / 2;
  const r = 165;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => {
    const a = angle(i);
    const rr = (Math.max(0, Math.min(10, v)) / 10) * r;
    return [c + rr * Math.cos(a), c + rr * Math.sin(a)] as const;
  };
  const rings = [2, 4, 6, 8, 10];
  return (
    <figure className="mx-auto w-full max-w-[520px]">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title} className="h-auto w-full">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={labels.map((_, i) => pt(i, ring).join(",")).join(" ")}
            fill="none"
            stroke="var(--line)"
            strokeWidth={ring === 10 ? 1.5 : 1}
          />
        ))}
        {labels.map((_, i) => {
          const [x, y] = pt(i, 10);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--line)" />;
        })}
        {rings.map((ring) => (
          <text key={`t${ring}`} x={c + 4} y={c - (ring / 10) * r + 4} fontSize="11" fill="var(--muted)">
            {ring}
          </text>
        ))}
        {series.map((s) => (
          <polygon
            key={s.label}
            points={s.values.map((v, i) => pt(i, v).join(",")).join(" ")}
            fill={s.fill ? s.color : "none"}
            fillOpacity={s.fill ? 0.18 : 0}
            stroke={s.color}
            strokeWidth={s.fill ? 2.5 : 2}
            strokeDasharray={s.dashed ? "6 5" : undefined}
          />
        ))}
        {series
          .filter((s) => s.fill)
          .map((s) =>
            s.values.map((v, i) => {
              const [x, y] = pt(i, v);
              return <circle key={`${s.label}${i}`} cx={x} cy={y} r={4} fill={s.color} />;
            }),
          )}
        {labels.map((label, i) => {
          const a = angle(i);
          const x = c + (r + 22) * Math.cos(a);
          const y = c + (r + 22) * Math.sin(a);
          const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
          const lines = wrap(label);
          const dy = Math.sin(a) < -0.5 ? -(lines.length - 1) * 13 : Math.sin(a) > 0.5 ? 6 : -((lines.length - 1) * 13) / 2 + 4;
          return (
            <text key={label} x={x} y={y + dy} fontSize="12.5" fontWeight={600} fill="var(--ink)" textAnchor={anchor}>
              {lines.map((l, j) => (
                <tspan key={j} x={x} dy={j === 0 ? 0 : 14}>
                  {l}
                </tspan>
              ))}
            </text>
          );
        })}
      </svg>
      {series.length > 1 && (
        <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <svg width="22" height="8" aria-hidden>
                <line x1="0" y1="4" x2="22" y2="4" stroke={s.color} strokeWidth="2.5" strokeDasharray={s.dashed ? "5 4" : undefined} />
              </svg>
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

const TONE_BAR: Record<Band["tone"], string> = {
  ok: "var(--ok)",
  info: "var(--mauve)",
  warn: "var(--warn)",
  bad: "var(--bad)",
};
const TONE_TEXT: Record<Band["tone"], string> = {
  ok: "text-ok",
  info: "text-mauve",
  warn: "text-warn",
  bad: "text-bad",
};

/** Barras horizontais de 0 a 10, com a cor da faixa e a variação desde a aplicação anterior. */
export function ScoreBars({
  rows,
  polarity,
}: {
  rows: { label: string; score: number; band: Band; delta?: number; desired?: number }[];
  polarity: "competencia" | "risco";
}) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const better = r.delta === undefined || r.delta === 0 ? null : polarity === "competencia" ? r.delta > 0 : r.delta < 0;
        return (
          <li key={r.label} className="print:break-inside-avoid">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold">{r.label}</span>
              <span className="whitespace-nowrap">
                <span className="font-semibold">{r.score.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                <span className={`ml-2 text-xs font-semibold ${TONE_TEXT[r.band.tone]}`}>{r.band.label}</span>
                {r.delta !== undefined && r.delta !== 0 && (
                  <span className={`ml-2 text-xs font-semibold ${better ? "text-ok" : "text-bad"}`}>
                    {r.delta > 0 ? "+" : ""}
                    {r.delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                  </span>
                )}
              </span>
            </div>
            <div className="relative mt-1 h-2.5 rounded-full bg-canvas">
              <div className="h-full rounded-full" style={{ width: `${r.score * 10}%`, background: TONE_BAR[r.band.tone] }} />
              {r.desired !== undefined && (
                <span
                  className="absolute top-[-3px] h-4 w-0.5 rounded bg-plum"
                  style={{ left: `calc(${r.desired * 10}% - 1px)` }}
                  title={`Desejado em 90 dias: ${r.desired}`}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
