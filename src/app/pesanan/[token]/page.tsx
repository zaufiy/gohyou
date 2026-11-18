import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AutoRefresh } from "@/components/AutoRefresh";
import { OrderStatusRefresh } from "@/components/customer/OrderStatusRefresh";
import { formatRupiah, queueLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = supabaseAdmin();
  await sb.rpc("expire_stale_orders");
  const { data: o } = await sb.from("orders")
    .select("session_id, public_code, customer_name, type, status, total_amount, expires_at, queue_number, estimate_minutes, estimate_date, preorder_slots(pickup_date), order_items(product_name_snapshot, qty, subtotal, order_item_options(name_snapshot))")
    .eq("public_token", token).maybeSingle();
  if (!o) notFound();
  const { data: s } = await sb.from("settings").select("value").eq("key", "qris_image_url").maybeSingle();
  const qris = typeof s?.value === "string" && s.value ? s.value : "/images/qris-gohyong.jpeg";
  const live = ["pending_payment", "awaiting_verification", "paid", "preparing", "ready"].includes(o.status);
  const pickup = (o as any).preorder_slots?.pickup_date as string | undefined;

  let ahead: number | null = null;
  if (o.queue_number != null && ["paid", "preparing"].includes(o.status)) {
    const { count } = await sb.from("orders").select("id", { count: "exact", head: true })
      .eq("session_id", o.session_id).eq("type", o.type).lt("queue_number", o.queue_number).in("status", ["paid", "preparing"]);
    ahead = count ?? 0;
  }
  const code = o.queue_number != null ? queueLabel(o.type, o.queue_number) : null;
  const displayCode = code ?? o.public_code;

  return (
    <main className="mx-auto max-w-xl space-y-4 p-5">
      {live && <AutoRefresh />}
      <h1 className="text-3xl font-extrabold">Pesanan {displayCode}</h1>
      <OrderStatusRefresh
        token={token}
        status={o.status}
        type={o.type}
        customerName={o.customer_name}
        code={code}
        publicCode={o.public_code}
        totalAmount={o.total_amount}
        expiresAt={o.expires_at}
        qris={qris}
        ahead={ahead}
        estimateMinutes={o.estimate_minutes}
        estimateDate={o.estimate_date}
        pickupDate={pickup}
      />

      {o.order_items.map((i: any, idx: number) => (
        <Card key={idx}><div className="flex justify-between"><span>{i.qty}× {i.product_name_snapshot}</span><span>{formatRupiah(i.subtotal)}</span></div>
          {i.order_item_options.length > 0 && <p className="text-sm opacity-70">{i.order_item_options.map((x: any) => x.name_snapshot).join(", ")}</p>}</Card>
      ))}
      <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatRupiah(o.total_amount)}</span></div>
    </main>
  );
}
