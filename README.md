# CEOEXPRESS | Gestão Estratégica

Plataforma multiempresa de relacionamento e gestão entre a CEOEXPRESS e as empresas clientes.
Primeiro cliente e projeto: **FIQ Brasil — Planejamento e execução 2026–2027**.

> Inteligência estratégica, execução e resultados em uma única plataforma.

## Estado atual (fase 0)

| Parte | Situação |
| --- | --- |
| Banco PostgreSQL com isolamento por empresa (RLS) | Pronto e testado em PostgreSQL real (`tests/db/rls.test.ts`) |
| Conteúdo da FIQ importado do portal original | Pronto e testado (`tests/db/seed-fiq.test.ts`) |
| Login, convite individual, redefinição de senha | Código pronto; **ainda não executado contra um Supabase real** |
| Área administrativa: carteira, empresas, projetos, convites | Código pronto; idem |
| Área dos consultores e Área do Cliente: projetos, pedidos com orientações, plano de ação, agenda | Código pronto, somente leitura; idem |
| Envio de arquivos, análise e aprovação | Próxima fase (2). O banco e as regras de acesso já estão prontos |

## Tecnologia

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- Supabase: PostgreSQL, autenticação e armazenamento de arquivos (região São Paulo)
- PWA instalável (manifesto e ícones)
- Testes: Vitest; os testes de banco rodam contra PostgreSQL 15+

## Estrutura

```
src/app/            telas (entrar, convite, esqueci-senha, redefinir-senha, admin, consultor, cliente)
src/lib/            autenticação, clientes Supabase, consultas, regras de status e tokens
src/proxy.ts        renova a sessão e protege as áreas restritas
supabase/migrations esquema, regras de acesso (RLS), auditoria e armazenamento
supabase/seed       base inicial da FIQ Brasil (gerada a partir de data/fiq)
data/fiq            conteúdo exportado do portal original (versão 10)
scripts/            gerador do seed da FIQ
tests/              testes de unidade e de banco
docs/               implantação e manual de administração
```

## Rodar localmente

```sh
npm install
cp .env.example .env.local   # preencha com os dados do projeto Supabase
npm run dev
```

## Testes

```sh
npm test                                    # testes de unidade
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test   # inclui os testes de banco
```

Os testes de banco criam um banco temporário, aplicam todas as migrações sobre um stub mínimo do ambiente
Supabase (`tests/db/supabase-stub.sql`) e o apagam ao final.

## Documentação

- [Implantação](docs/IMPLANTACAO.md)
- [Manual de administração](docs/MANUAL-ADMINISTRACAO.md)
