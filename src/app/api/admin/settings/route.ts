import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";

const id = z.string().uuid();
const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set"), key: z.enum(["direct_open", "preorder_open", "preorder_min_days", "payment_timeout_minutes", "qris_image_url", "announcement", "site_address", "site_hours"]),
    value: z.union([z.boolean(), z.number(), z.string(), z.null()]) }),
  z.object({ op: z.literal("slot.save"), id: id.optional(), pickup_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    capacity: z.number({ invalid_type_error: "Kuota harus angka" }).int("Kuota harus angka bulat").min(0).max(10000) }),
  z.object({ op: z.literal("slot.delete"), id }),
]);
const fail = (m: string, status = 400) => NextResponse.json({ error: m }, { status });

export async function POST(req: Request) {
  if (!(await requireStaff())) return fail("Belum login", 401);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Data tidak valid");
  const d = p.data;
  const sb = supabaseAdmin();
  let error: { code?: string; message: string } | null = null;

  if (d.op === "set") {
    const v = d.value;
    const okInt = (min: number, max: number) => typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
    const valid =
      d.key === "direct_open" || d.key === "preorder_open" ? typeof v === "boolean"
      : d.key === "preorder_min_days" ? okInt(0, 30)
      : d.key === "payment_timeout_minutes" ? okInt(1, 120)
      : d.key === "announcement" || d.key === "site_address" || d.key === "site_hours" ? v === null || (typeof v === "string" && v.length <= 300)
      : v === null || (typeof v === "string" && v.length <= 500 && (v.startsWith("https://") || v.startsWith("/")));
    if (!valid) return fail("Nilai pengaturan tidak valid");
    const value = typeof v === "string" ? v.trim() || null : v; // teks kosong = dihapus
    ({ error } = await sb.from("settings").upsert({ key: d.key, value }, { onConflict: "key" }));
  } else if (d.op === "slot.save") {
    if (d.id) {
      ({ error } = await sb.from("preorder_slots").update({ capacity: d.capacity }).eq("id", d.id));
    } else {
      const { data: s } = await sb.from("sales_sessions").select("id").eq("is_active", true).maybeSingle();
      if (!s) return fail("Tidak ada sesi penjualan aktif");
      ({ error } = await sb.from("preorder_slots").insert({ session_id: s.id, pickup_date: d.pickup_date, capacity: d.capacity }));
    }
  } else {
    ({ error } = await sb.from("preorder_slots").delete().eq("id", d.id));
  }
  if (error) {
    console.error("settings gagal:", error);
    if (error.code === "23505") return fail("Tanggal itu sudah ada");
    if (error.code === "23514") return fail("Kuota tidak boleh lebih kecil dari jumlah yang sudah terpesan");
    if (error.code === "23503") return fail("Sudah ada pesanan di tanggal ini, tidak bisa dihapus", 409);
    return fail("Gagal menyimpan, coba lagi", 500);
  }
  return NextResponse.json({ ok: true });
}
