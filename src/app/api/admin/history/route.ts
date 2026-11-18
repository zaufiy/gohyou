import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { getSettings } from "@/server/settings";
import { rpcFail } from "@/server/rpcError";

const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("order.delete"), id: z.string().uuid() }),
  z.object({ op: z.literal("reset"), confirm: z.literal("HAPUS SEMUA", { errorMap: () => ({ message: "Ketik HAPUS SEMUA persis" }) }) }),
]);

export async function POST(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  const sb = supabaseAdmin();

  if (p.data.op === "order.delete") {
    const { error } = await sb.rpc("delete_order", { p_order: p.data.id });
    return error ? rpcFail(error) : NextResponse.json({ ok: true });
  }
  // Reset hanya boleh saat kedua pemesanan ditutup (dicek ulang di server).
  const st = await getSettings();
  if (st.directOpen || st.preorderOpen) return NextResponse.json({ error: "Tutup dulu pesanan langsung dan pre-order sebelum reset" }, { status: 409 });
  console.warn(`RESET data pesanan oleh operator ${staff.display_name} (${staff.user_id})`);
  const { error } = await sb.rpc("reset_orders");
  return error ? rpcFail(error) : NextResponse.json({ ok: true });
}
