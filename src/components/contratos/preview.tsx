import { parseBlocks, type Signatories, type Span } from "@/lib/contratos/markup";

function Falta({ text }: { text: string }) {
  // Destaca os campos que ficaram sem valor.
  const parts = text.split(/(\[falta: [a-z_]+\])/g);
  return <>{parts.map((p, i) => (/^\[falta: /.test(p) ? <mark key={i} className="rounded bg-warn-bg px-1 text-warn">{p}</mark> : p))}</>;
}

function SpansWithGaps({ spans }: { spans: Span[] }) {
  return <>{spans.map((s, i) => (s.bold ? <strong key={i}><Falta text={s.text} /></strong> : <Falta key={i} text={s.text} />))}</>;
}

/** Prévia do contrato na tela, com a mesma marcação do PDF. */
export function ContractPreview({ texto, sig }: { texto: string; sig: Signatories }) {
  const blocks = parseBlocks(texto);
  return (
    <article className="mx-auto max-w-3xl space-y-3 rounded-xl border border-line bg-white p-6 font-serif text-[15px] leading-relaxed text-ink sm:p-10">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "title": return <h2 key={i} className="pb-2 pt-4 text-center text-lg font-bold first:pt-0"><Falta text={b.text} /></h2>;
          case "heading": return <h3 key={i} className="pt-3 font-bold"><Falta text={b.text} /></h3>;
          case "subheading": return <h4 key={i} className="pt-1 font-bold"><Falta text={b.text} /></h4>;
          case "paragraph": return <p key={i} className="text-justify"><SpansWithGaps spans={b.spans} /></p>;
          case "bullet": return <p key={i} className="flex gap-3 pl-2 text-justify"><span aria-hidden>•</span><span><SpansWithGaps spans={b.spans} /></span></p>;
          case "center": return <p key={i} className="py-2 text-center"><SpansWithGaps spans={b.spans} /></p>;
          case "pagebreak": return <hr key={i} className="my-8 border-dashed border-line" aria-label="Nova página" />;
          case "signatures":
            return (
              <div key={i} className="grid gap-8 pt-10 sm:grid-cols-2">
                {[["CONTRATADA", sig.contratada], ["CONTRATANTE", sig.contratante]].map(([label, p]) => {
                  const party = p as Signatories["contratada"];
                  return (
                    <div key={label as string} className="border-t border-ink pt-2 text-center text-sm">
                      <p className="font-bold">{party.nome || "—"}</p>
                      <p>{party.documento}</p>
                      <p className="text-xs text-muted">{label as string}</p>
                    </div>
                  );
                })}
                {sig.testemunhas && (
                  <>
                    <p className="text-sm font-bold sm:col-span-2">Testemunhas:</p>
                    {[1, 2].map((n) => (
                      <div key={n} className="border-t border-ink pt-2 text-xs text-muted">Nome:<br />CPF:</div>
                    ))}
                  </>
                )}
              </div>
            );
        }
      })}
    </article>
  );
}
