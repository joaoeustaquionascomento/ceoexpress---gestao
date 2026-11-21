"use client";
import { useFormStatus } from "react-dom";
import { primaryButton } from "@/components/ui";

export function SubmitButton({ children, pendingText = "Aguarde…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${primaryButton} w-full sm:w-auto`}>
      {pending ? pendingText : children}
    </button>
  );
}
