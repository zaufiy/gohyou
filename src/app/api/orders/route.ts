import { NextResponse } from "next/server";
import { orderSchema } from "@/server/validators/order";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 }); }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  // Harga TIDAK diambil dari client; dihitung ulang di database oleh create_order.
  const sb = supabaseAdmin();
  await sb.rpc("expire_stale_orders"); // bebaskan kuota dari pesanan yang kedaluwarsa
  const { data, error } = await sb.rpc("create_order", {
    p_name: d.name, p_wa: d.whatsapp || null, p_type: d.type,
    p_slot: d.type === "preorder" ? d.slotId ?? null : null, p_agreed: d.agreed,
    p_items: d.items.map((i) => ({ product_id: i.productId, qty: i.qty, option_ids: i.optionIds })),
  });
  if (error) {
    console.error("create_order gagal:", error);
    const known = error.code === "P0001"; // pesan dari RAISE EXCEPTION kita sendiri
    return NextResponse.json({ error: known ? error.message : "Gagal membuat pesanan, coba lagi" }, { status: known ? 400 : 500 });
  }
  return NextResponse.json(data);
}
