import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth";

export type ProjectAccess = {
  userId: string;
  staff: boolean;
  role: "consultant" | "client_manager" | "client_member" | "client_viewer" | null;
  canUpload: boolean;
};

/** Papel do usuário logado num projeto. A autorização real continua no banco (RLS). */
export async function getProjectAccess(projectId: string): Promise<ProjectAccess | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = (data?.role ?? null) as ProjectAccess["role"];
  const staff = user.role === "admin" || role === "consultant";
  if (!staff && !role) return null;
  return {
    userId: user.id,
    staff,
    role,
    canUpload: staff || role === "client_manager" || role === "client_member",
  };
}
