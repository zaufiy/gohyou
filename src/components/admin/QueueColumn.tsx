import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { OrderActions } from "./OrderActions";
import { formatRupiah, queueLabel } from "@/lib/format";

const LABEL: Record<string, string> = { paid: "Antre", preparing: "Diproses", ready: "Siap diambil" };

export function QueueColumn({ title, tone, orders }: { title: string; tone: "direct" | "preorder"; orders: any[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><h2 className="text-xl font-semibold">{title}</h2><Badge tone={tone}>{orders.length}</Badge></div>
      {orders.length === 0 && <p className="text-sm opacity-70">Belum ada pesanan.</p>}
      {orders.map((o) => (
        <Card key={o.id} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-display text-2xl font-extrabold">{queueLabel(o.type, o.queue_number)}</span>
            <Badge tone={o.status === "ready" ? "ok" : o.status === "preparing" ? "wait" : "neutral"}>{LABEL[o.status] ?? o.status}</Badge>
          </div>
          <p>{o.customer_name} · <b>{formatRupiah(o.total_amount)}</b>{o.preorder_slots?.pickup_date ? ` · ambil ${o.preorder_slots.pickup_date}` : ""}</p>
          <ul className="text-sm opacity-80">
            {o.order_items.map((i: any, k: number) => (
              <li key={k}>{i.qty}× {i.product_name_snapshot}{i.order_item_options.length > 0 ? ` (${i.order_item_options.map((x: any) => x.name_snapshot).join(", ")})` : ""}</li>
            ))}
          </ul>
          <OrderActions id={o.id} type={o.type} status={o.status} estimateMinutes={o.estimate_minutes} estimateDate={o.estimate_date} pickupDate={o.preorder_slots?.pickup_date ?? null} />
        </Card>
      ))}
    </section>
  );
}
