import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serviceRoleKey } from "@/lib/env";

/**
 * Cliente com a chave de serviço: ignora RLS. Usar apenas em ações de servidor
 * que já conferiram a permissão (ex.: criar a conta de quem aceitou um convite).
 */
export function createAdminClient() {
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
