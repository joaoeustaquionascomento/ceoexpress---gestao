import "server-only";
import { createClient } from "@/lib/supabase/server";
import { contractDataSchema, EMPTY_SETTINGS, type ContractData, type ContractStatus, type ProviderSettings } from "./dados";

export type ContractRow = {
  id: string;
  code: string;
  title: string;
  party_name: string;
  status: ContractStatus;
  template_id: string | null;
  company_id: string | null;
  data: ContractData;
  body: string | null;
  pdf_path: string | null;
  pdf_sha256: string | null;
  generated_at: string | null;
  sent_at: string | null;
  signed_path: string | null;
  signed_file_name: string | null;
  signed_sha256: string | null;
  signed_at: string | null;
  client_visible: boolean;
  created_at: string;
  updated_at: string;
};

export async function getSettings(): Promise<ProviderSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("contract_settings").select("*").maybeSingle();
  return data ? { ...EMPTY_SETTINGS, ...(data as Partial<ProviderSettings>) } : EMPTY_SETTINGS;
}

export async function getContract(id: string): Promise<ContractRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...(data as ContractRow), data: contractDataSchema.parse(data.data ?? {}) };
}

/** Data de hoje no fuso de Brasília, no formato aaaa-mm-dd. */
export function hojeSP(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}
