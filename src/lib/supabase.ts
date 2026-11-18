import { createClient } from "@supabase/supabase-js";
// Client publik (anon key). Hanya untuk membaca katalog; RLS membatasi akses.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
