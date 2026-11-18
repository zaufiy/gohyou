import { supabaseAdmin } from "./supabaseAdmin";

export type AppSettings = { directOpen: boolean; preorderOpen: boolean; minDays: number; timeoutMin: number; qris: string | null; announcement: string | null; address: string | null; hours: string | null };

// Baca pengaturan dari tabel settings (hanya server).
export async function getSettings(): Promise<AppSettings> {
  const { data } = await supabaseAdmin().from("settings").select("key, value");
  const m = new Map<string, unknown>((data ?? []).map((r: any) => [r.key, r.value]));
  const num = (k: string, d: number) => { const v = m.get(k); const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN; return Number.isFinite(n) ? n : d; };
  const str = (k: string) => { const v = m.get(k); return typeof v === "string" && v.trim() ? v : null; };
  const q = m.get("qris_image_url");
  return { directOpen: m.get("direct_open") === true, preorderOpen: m.get("preorder_open") === true,
    minDays: num("preorder_min_days", 0), timeoutMin: num("payment_timeout_minutes", 10), qris: typeof q === "string" && q ? q : null,
    announcement: str("announcement"), address: str("site_address"), hours: str("site_hours") };
}
