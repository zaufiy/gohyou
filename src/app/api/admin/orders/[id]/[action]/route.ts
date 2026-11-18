import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { rpcFail } from "@/server/rpcError";

const ACTIONS = ["verify", "reject", "status", "estimate"];
const rejectSchema = z.object({ note: z.string().max(200).optional() });
const statusSchema = z.object({ to: z.enum(["paid", "preparing", "ready", "completed"]) });
const estimateSchema = z.object({
  minutes: z.number().int().min(0).max(600).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});
const bad = (m = "Permintaan tidak valid") => NextResponse.json({ error: m }, { status: 400 });

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const { id, action } = await params;
  if (!z.string().uuid().safeParse(id).success || !ACTIONS.includes(action)) return bad();
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();

  if (action === "verify") {
    const { data, error } = await sb.rpc("verify_payment", { p_order: id, p_staff: staff.user_id });
    return error ? rpcFail(error) : NextResponse.json({ queue: data });
  }
  if (action === "reject") {
    const b = rejectSchema.safeParse(body);
    const { error } = await sb.rpc("reject_payment", { p_order: id, p_staff: staff.user_id, p_note: (b.success && b.data.note) || null });
    return error ? rpcFail(error) : NextResponse.json({ ok: true });
  }
  if (action === "status") {
    const b = statusSchema.safeParse(body);
    if (!b.success) return bad();
    const { error } = await sb.rpc("set_order_status", { p_order: id, p_staff: staff.user_id, p_to: b.data.to });
    return error ? rpcFail(error) : NextResponse.json({ ok: true });
  }
  // estimate: menit untuk pesanan langsung, tanggal untuk pre-order
  const b = estimateSchema.safeParse(body);
  if (!b.success) return bad("Estimasi tidak valid");
  const { data: o } = await sb.from("orders").select("type, status").eq("id", id).maybeSingle();
  if (!o || !["paid", "preparing", "ready"].includes(o.status)) return bad("Estimasi hanya untuk pesanan yang sudah lunas");
  const patch = o.type === "direct" ? { estimate_minutes: b.data.minutes ?? null } : { estimate_date: b.data.date ?? null };
  const { error } = await sb.from("orders").update(patch).eq("id", id);
  return error ? rpcFail(error) : NextResponse.json({ ok: true });
}
