import { createClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "./config";

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }
  return key;
}

export function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey());
}
