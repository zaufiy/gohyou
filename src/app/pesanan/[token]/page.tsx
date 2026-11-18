import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PayPanel } from "@/components/customer/PayPanel";
import { OrderStatusRefresh } from "@/components/customer/OrderStatusRefresh";
import { StatusNotifier } from "@/components/customer/StatusNotifier";
import { formatRupiah, queueLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
const STATUS: Record<string, string> = {
  pending_payment: "Menunggu pembayaran", awaiting_verification: "Menunggu verifikasi", payment_rejected: "Pembayaran ditolak",
  expired: "Kedaluwarsa", paid: "Lunas, menunggu giliran", preparing: "Sedang diproses", ready: "Siap diambil", completed: "Selesai",
};
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

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
      {live && <OrderStatusRefresh token={token} status={o.status} code={code} />}
      {live && <AutoRefresh />}
      <h1 className="text-3xl font-extrabold">Pesanan {displayCode}</h1>
      <div className="flex gap-2">
        <Badge tone={o.type === "direct" ? "direct" : "preorder"}>{o.type === "direct" ? "Langsung" : "Pre-order"}</Badge>
        <Badge tone={["paid", "ready", "completed"].includes(o.status) ? "ok" : "wait"}>{STATUS[o.status] ?? o.status}</Badge>
      </div>
      {["awaiting_verification", "paid", "preparing", "ready", "payment_rejected", "completed"].includes(o.status) && <StatusNotifier status={o.status} />}
      <p>Atas nama {o.customer_name}. {code ? "Nomor antreanmu sudah tersedia." : "Simpan kode pesanan ini."}</p>

      {o.status === "ready" && (
        <Card className="!border-jade !bg-jade text-center text-white">
          <p className="font-display text-2xl font-extrabold">Pesananmu siap diambil!</p>
          <p>Sebutkan nomor <b>{code}</b> ke petugas.</p>
        </Card>
      )}
      {o.status === "completed" && <Card className="!border-jade !bg-jade text-center text-white"><p className="font-display text-2xl font-extrabold">Pesanan selesai!</p><p>Terima kasih, pesananmu sudah diambil.</p></Card>}

      {o.status === "pending_payment" && (
        <Card className="space-y-3">
          <img src={qris} alt="QRIS pembayaran" className="mx-auto w-64 max-w-full" />
          <p className="text-center">Bayar tepat <b className="font-display text-2xl">{formatRupiah(o.total_amount)}</b></p>
          <PayPanel token={token} expiresAt={o.expires_at} />
        </Card>
      )}
      {o.status === "awaiting_verification" && <Card><p>Pembayaranmu sedang dicek operator. Halaman ini akan berubah otomatis, tidak perlu ditutup.</p></Card>}
      {o.status === "payment_rejected" && <Card><p>Pembayaran belum bisa diverifikasi. Silakan datang ke operator dengan kode <b>{o.public_code}</b>.</p></Card>}
      {o.status === "expired" && <Card><p>Waktu pembayaran habis dan pesanan dibatalkan otomatis. Silakan buat pesanan baru.</p></Card>}

      {code && o.status !== "completed" && (
        <Card className="space-y-1 text-center">
          <p className="text-sm opacity-70">Nomor antrean</p>
          <p className="font-display text-5xl font-extrabold">{code}</p>
          {ahead !== null && <p>Di depanmu: <b>{ahead}</b> pesanan</p>}
          {o.type === "direct" && o.estimate_minutes != null && <p>Estimasi waktu tunggu: <b>{o.estimate_minutes} menit</b></p>}
          {o.type === "preorder" && (o.estimate_date || pickup) && <p>Siap diambil: <b>{fmtDate((o.estimate_date ?? pickup) as string)}</b></p>}
        </Card>
      )}

      {o.order_items.map((i: any, idx: number) => (
        <Card key={idx}><div className="flex justify-between"><span>{i.qty}× {i.product_name_snapshot}</span><span>{formatRupiah(i.subtotal)}</span></div>
          {i.order_item_options.length > 0 && <p className="text-sm opacity-70">{i.order_item_options.map((x: any) => x.name_snapshot).join(", ")}</p>}</Card>
      ))}
      <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatRupiah(o.total_amount)}</span></div>
    </main>
  );
}
