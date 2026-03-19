import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase public env vars. Set NEXT_PUBLIC_* or EXPO_PUBLIC_* values.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
