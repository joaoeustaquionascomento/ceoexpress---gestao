import Link from "next/link";
import { LibraryDelete, LibraryForm, type TagGroup } from "@/components/mentoria/forms";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { THEMES, allTags, tagLabel } from "@/lib/mentoria/biblioteca";
import { listLibrary } from "@/lib/mentoria/dados";

export const metadata = { title: "Biblioteca da mentoria" };

const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3 text-sm font-semibold ${on ? "border-plum bg-plum text-white" : "border-line text-mauve hover:bg-tint"}`;

export default async function Page({ searchParams }: { searchParams: Promise<{ tema?: string; tipo?: string; q?: string; editar?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const all = await listLibrary();
  const tema = THEMES.some((t) => t.key === sp.tema) ? sp.tema! : "";
  const tipo = sp.tipo === "livro" || sp.tipo === "filme" ? sp.tipo : "";
  const q = (sp.q ?? "").trim().toLowerCase();
  const items = all.filter(
    (i) =>
      (!tema || i.tags.some((t) => t === tema || t.startsWith(`${tema}:`))) &&
      (!tipo || i.kind === tipo) &&
      (!q || `${i.title} ${i.author ?? ""}`.toLowerCase().includes(q)),
  );
  const editing = sp.editar ? all.find((i) => i.id === sp.editar) : undefined;

  const groups: TagGroup[] = THEMES.map((t) => ({
    label: t.label,
    tags: allTags()
      .filter((x) => x.tag === t.key || x.tag.startsWith(`${t.key}:`))
      .map((x) => ({ tag: x.tag, label: x.label.replace(`${t.label}: `, "") })),
  }));
  const href = (p: Record<string, string>) => {
    const s = new URLSearchParams({ ...(tema ? { tema } : {}), ...(tipo ? { tipo } : {}), ...(q ? { q } : {}), ...p });
    for (const [k, v] of [...s.entries()]) if (!v) s.delete(k);
    const str = s.toString();
    return `/admin/biblioteca${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageTitle eyebrow="Mentoria" title="Biblioteca de livros e filmes">
        {all.length} títulos. Os relatórios sugerem itens daqui conforme as dimensões que pedem atenção. Marque em que temas cada um deve aparecer.
      </PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link href={href({ tema: "" })} className={chip(!tema)}>Todos</Link>
            {THEMES.map((t) => (
              <Link key={t.key} href={href({ tema: t.key })} className={chip(tema === t.key)}>{t.label}</Link>
            ))}
          </div>
          <form className="flex flex-wrap gap-2" action="/admin/biblioteca">
            {tema && <input type="hidden" name="tema" value={tema} />}
            <select name="tipo" defaultValue={tipo} className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm">
              <option value="">Livros e filmes</option>
              <option value="livro">Só livros</option>
              <option value="filme">Só filmes</option>
            </select>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Buscar por título ou autor" className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-sm" />
            <button className="min-h-11 rounded-lg border border-line px-4 text-sm font-semibold text-mauve hover:bg-tint">Filtrar</button>
          </form>
          <p className="text-sm text-muted">{items.length} {items.length === 1 ? "item" : "itens"}</p>
          {items.length === 0 ? (
            <EmptyState>Nenhum item com esse filtro.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {items.map((i) => (
                <li key={i.id}>
                  <Card className="!p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-plum">
                          {i.title} {!i.active && <Badge tone="neutral">Inativo</Badge>}
                        </p>
                        <p className="text-xs text-muted">
                          {i.kind === "livro" ? "Livro" : "Filme"}
                          {i.author ? ` · ${i.author}` : ""}
                          {i.year ? ` · ${i.year}` : ""}
                        </p>
                      </div>
                      <Link href={href({ editar: i.id })} className="text-sm font-semibold text-mauve hover:text-plum">Editar</Link>
                    </div>
                    {i.note && <p className="mt-1 text-sm">{i.note}</p>}
                    <p className="mt-2 text-xs text-muted">{i.tags.map(tagLabel).join(" · ")}</p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
        <aside className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-plum">{editing ? "Editar item" : "Novo item"}</h2>
              {editing && <Link href={href({ editar: "" })} className="text-sm text-mauve hover:text-plum">Cancelar</Link>}
            </div>
            <LibraryForm key={editing?.id ?? "novo"} item={editing} groups={groups} />
          </Card>
          {editing && <LibraryDelete id={editing.id} />}
        </aside>
      </div>
    </>
  );
}
