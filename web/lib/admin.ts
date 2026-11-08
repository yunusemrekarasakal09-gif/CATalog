import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const ADMIN_USER_ID = "2a8597c8-b96c-402e-a5f4-c3acd6b7249d";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/giris");
  }

  if (user.id !== ADMIN_USER_ID) {
    redirect("/");
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/");
  }

  return { supabase, user };
}