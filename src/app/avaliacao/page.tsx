import type { Metadata } from "next";
import { AnswerForm } from "@/components/mentoria/answer-form";
import { Alert, Logo } from "@/components/ui";
import { INSTRUMENTS } from "@/lib/mentoria/instrumentos";
import { findByToken } from "@/lib/mentoria/publico";

export const metadata: Metadata = { title: "Avaliação de mentoria", robots: { index: false, follow: false } };

const reasons: Record<string, { tone: "ok" | "bad" | "warn"; text: string }> = {
  invalido: { tone: "bad", text: "Este link não é válido. Peça um novo link ao seu mentor." },
  expirado: { tone: "warn", text: "Este link expirou. Peça um novo link ao seu mentor." },
  respondido: { tone: "ok", text: "Esta avaliação já foi enviada. Obrigado! Seu mentor vai conversar com você sobre o resultado." },
  cancelado: { tone: "warn", text: "Esta avaliação foi cancelada pelo mentor." },
};

export default async function AvaliacaoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { token } = await searchParams;
  const check = await findByToken(token);
  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo width={150} />
        </div>
        {check.ok && token ? (
          <AnswerForm
            token={token}
            instrument={INSTRUMENTS[check.app.instrument]}
            firstName={check.app.respondentFirstName}
            initialAnswers={check.app.answers}
            consented={!!check.app.consentAt}
          />
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h1 className="mb-4 text-xl font-semibold text-plum">Avaliação de mentoria</h1>
            <Alert tone={reasons[check.ok ? "invalido" : check.reason].tone}>{reasons[check.ok ? "invalido" : check.reason].text}</Alert>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-muted">CEOEXPRESS | Mentoria · Suas respostas são confidenciais.</p>
      </div>
    </main>
  );
}
