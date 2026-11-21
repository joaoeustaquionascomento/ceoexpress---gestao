"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Cliente do navegador: usado só para enviar o arquivo direto ao armazenamento. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
