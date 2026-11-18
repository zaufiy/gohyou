import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { getSettings } from "@/server/settings";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { DeleteOrderButton, ResetPanel } from "@/components/admin/HistoryActions";
import { STATUS_LABEL } from "@/lib/labels";
import { formatRupiah, queueLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
const GROUPS: Record<string, string[]> = {
  active: ["paid", "preparing", "ready"], done: ["completed"],
  unpaid: ["pending_payment", "awaiting_verification"], failed: ["expired", "payment_rejected"],
};
const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";
const field = "min-h-10 rounded-xl border border-steam bg-surface px-3 text-sm";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string }> }) {
  if (!(await requireStaff())) redirect("/admin/login");
  const sp = await searchParams;
  const q = (sp.q ?? "").replace(/[,()%*\\]/g, "").trim().slice(0, 40); // aman untuk filter PostgREST
  const status = sp.status && GROUPS[sp.status] ? sp.status : "";
  const type = sp.type === "direct" || sp.type === "preorder" ? sp.type : "";
  const sb = supabaseAdmin();
  await sb.rpc("expire_stale_orders");

  let query = sb.from("orders")
    .select("id, public_code, queue_number, type, status, customer_name, customer_whatsapp, total_amount, created_at, paid_at, order_items(product_name_snapshot, qty, subtotal, order_item_options(name_snapshot)), order_status_logs(to_status, note, created_at, changed_by)")
    .order("created_at", { ascending: false }).limit(200);
  if (status) query = query.in("status", GROUPS[status]);
  if (type) query = query.eq("type", type);
  if (q) query = query.or(`public_code.ilike.%${q}%,customer_name.ilike.%${q}%`);

  const [{ data: orders }, { data: staff }, st, paid, all] = await Promise.all([
    query,
    sb.from("staff_profiles").select("user_id, display_name"),
    getSettings(),
    sb.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "preparing", "ready", "completed"]),
    sb.from("orders").select("id", { count: "exact", head: true }),
  ]);
  const names = new Map((staff ?? []).map((s: any) => [s.user_id, s.display_name]));

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Riwayat Pesanan</h1>
        <Link href="/admin" className={buttonClass("ghost")}>Kembali ke antrean</Link>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Cari kode atau nama" className={field} />
        <select name="status" defaultValue={status} className={field}>
          <option value="">Semua status</option><option value="active">Aktif (antre/diproses/siap)</option><option value="done">Selesai</option>
          <option value="unpaid">Belum dibayar / menunggu verifikasi</option><option value="failed">Kedaluwarsa / ditolak</option>
        </select>
        <select name="type" defaultValue={type} className={field}>
          <option value="">Semua jenis</option><option value="direct">Langsung</option><option value="preorder">Pre-order</option>
        </select>
        <button type="submit" className={buttonClass("primary") + " !min-h-10 !px-5 text-sm"}>Terapkan</button>
        <Link href="/admin/riwayat" className={buttonClass("ghost") + " !min-h-10 !px-5 text-sm"}>Reset filter</Link>
      </form>
      <p className="text-sm opacity-70">Menampilkan {(orders ?? []).length} pesanan terbaru{(orders ?? []).length === 200 ? " (dibatasi 200, gunakan filter atau unduh Excel untuk data lengkap)" : ""}.</p>

      {(orders ?? []).length === 0 && <Card><p>Tidak ada pesanan yang cocok.</p></Card>}
      {(orders ?? []).map((o: any) => {
        const logs = [...(o.order_status_logs ?? [])].sort((a: any, b: any) => a.created_at.localeCompare(b.created_at));
        const deletable = o.status === "expired" || o.status === "payment_rejected";
        return (
          <Card key={o.id} className="!p-0">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-semibold">{o.public_code}</span>
                  {o.queue_number != null && <Badge tone={o.type === "direct" ? "direct" : "preorder"}>{queueLabel(o.type, o.queue_number)}</Badge>}
                  <span>{o.customer_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={["paid", "preparing", "ready", "completed"].includes(o.status) ? "ok" : "neutral"}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
                  <b>{formatRupiah(o.total_amount)}</b>
                </div>
              </summary>
              <div className="space-y-3 border-t border-steam p-4 text-sm">
                <p>{o.type === "direct" ? "Pesanan langsung" : "Pre-order"} · dibuat {fmt(o.created_at)} · dibayar {fmt(o.paid_at)}{o.customer_whatsapp ? ` · WhatsApp ${o.customer_whatsapp}` : ""}</p>
                <ul className="space-y-1">
                  {o.order_items.map((i: any, k: number) => (
                    <li key={k} className="flex justify-between gap-3"><span>{i.qty}× {i.product_name_snapshot}{i.order_item_options.length ? ` (${i.order_item_options.map((x: any) => x.name_snapshot).join(", ")})` : ""}</span><span>{formatRupiah(i.subtotal)}</span></li>
                  ))}
                </ul>
                <div>
                  <p className="mb-1 font-semibold">Riwayat status</p>
                  <ul className="space-y-1 opacity-80">
                    {logs.map((l: any, k: number) => (
                      <li key={k}>{fmt(l.created_at)} · {STATUS_LABEL[l.to_status] ?? l.to_status}{l.changed_by ? ` oleh ${names.get(l.changed_by) ?? "operator"}` : ""}{l.note ? ` (${l.note})` : ""}</li>
                    ))}
                  </ul>
                </div>
                {deletable && <DeleteOrderButton id={o.id} code={o.public_code} />}
                {!deletable && <p className="text-xs opacity-60">Pesanan yang pernah dibayar tidak bisa dihapus satuan, agar catatan keuangan tetap utuh.</p>}
              </div>
            </details>
          </Card>
        );
      })}

      <Card className="space-y-3 !border-chili">
        <h2 className="text-xl font-semibold text-red-300">Reset data uji</h2>
        <ResetPanel canReset={!st.directOpen && !st.preorderOpen} paidCount={paid.count ?? 0} totalCount={all.count ?? 0} />
      </Card>
    </main>
  );
}
