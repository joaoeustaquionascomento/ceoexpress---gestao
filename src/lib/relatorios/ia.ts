import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { REPORT_SCHEMA, SYSTEM_PROMPT, normalizeContent, userPrompt, type ReportContent, type ReportKind } from "./conteudo";

/** Modelo mais recente da Anthropic. Com "fallbacks: default", se ele recusar, a própria API tenta outro modelo. */
export const AI_MODEL = "claude-opus-5-5";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Erro com mensagem pronta para mostrar à consultoria. */
export class AiError extends Error {}

export type AiResult = {
  content: ReportContent;
  model: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number | null };
};

/** Chamada à IA com resposta em JSON (saída estruturada). Devolve o JSON já lido e o consumo. */
export async function runStructured(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<{ json: unknown; model: string; usage: AiResult["usage"] }> {
  if (!aiConfigured()) throw new AiError("A IA ainda não está ligada: falta a chave ANTHROPIC_API_KEY na Vercel.");
  const client = new Anthropic({ maxRetries: 2, timeout: 280_000 });
  let msg;
  try {
    const stream = client.beta.messages.stream({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: opts.schema } },
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: opts.user }],
    });
    msg = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new AiError("A chave da IA foi recusada. Confira a ANTHROPIC_API_KEY na Vercel e o crédito na conta da Anthropic.");
    if (e instanceof Anthropic.RateLimitError)
      throw new AiError("Limite de uso da IA atingido. Aguarde alguns minutos e tente de novo.");
    if (e instanceof Anthropic.BadRequestError && /credit|billing/i.test(e.message))
      throw new AiError("Sem crédito na conta da Anthropic. Adicione crédito em Billing e tente de novo.");
    if (e instanceof Anthropic.APIConnectionTimeoutError)
      throw new AiError("A IA demorou demais para responder. Tente de novo.");
    if (e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError)
      throw new AiError("O serviço de IA está instável agora. Tente de novo em alguns minutos.");
    console.error("ia: falha na chamada", e);
    throw new AiError("Não foi possível gerar com a IA. Tente de novo.");
  }

  if (msg.stop_reason === "refusal") throw new AiError("A IA não aceitou analisar este conteúdo. Revise o texto e tente de novo.");
  if (msg.stop_reason === "max_tokens") throw new AiError("A resposta ficou longa demais e foi cortada. Tente de novo.");

  // Se houve troca de modelo no meio, vale só o que veio depois do último bloco "fallback".
  const lastFallback = msg.content.map((b) => b.type).lastIndexOf("fallback");
  const text = msg.content
    .slice(lastFallback + 1)
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AiError("A IA devolveu um formato inesperado. Tente de novo.");
  }
  return {
    json,
    model: msg.model,
    usage: {
      input_tokens: msg.usage.input_tokens,
      output_tokens: msg.usage.output_tokens,
      cache_read_input_tokens: msg.usage.cache_read_input_tokens ?? null,
    },
  };
}

export async function runAnalysis(kind: ReportKind, dossier: string): Promise<AiResult> {
  const r = await runStructured({ system: SYSTEM_PROMPT[kind], user: userPrompt(kind, dossier), schema: REPORT_SCHEMA as unknown as Record<string, unknown> });
  const content = normalizeContent(r.json);
  if (!content.resumo && content.secoes.length === 0) throw new AiError("A IA devolveu uma análise vazia. Tente de novo.");
  return { content, model: r.model, usage: r.usage };
}
