import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminLive } from "@/components/admin/AdminLive";
import { VerifyButtons } from "@/components/admin/VerifyButtons";
import { QueueColumn } from "@/components/admin/QueueColumn";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";
import { getSettings } from "@/server/settings";
import { OpenSwitch } from "@/components/admin/SettingsEditors";

export const dynamic = "force-dynamic";
const ACTIVE = "id, public_code, customer_name, type, status, queue_number, total_amount, estimate_minutes, estimate_date, preorder_slots(pickup_date), order_items(product_name_snapshot, qty, order_item_options(name_snapshot))";

export default async function AdminPage() {
  const staff = await requireStaff();
  if (!staff) redirect("/admin/login");
  const sb = supabaseAdmin();
  await sb.rpc("expire_stale_orders");
  const st = await getSettings();
  const [{ data: waiting }, { data: active }] = await Promise.all([
    sb.from("orders").select("id, public_code, customer_name, type, total_amount, payments(customer_claimed_at)").eq("status", "awaiting_verification"),
    sb.from("orders").select(ACTIVE).in("status", ["paid", "preparing", "ready"]).order("queue_number"),
  ]);
  const claimedAt = (o: any) => o.payments?.[0]?.customer_claimed_at ?? "";
  const sorted = [...(waiting ?? [])].sort((a: any, b: any) => claimedAt(a).localeCompare(claimedAt(b)));
  const direct = (active ?? []).filter((o: any) => o.type === "direct");
  const pre = (active ?? []).filter((o: any) => o.type === "preorder");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-5">
      <AutoRefresh ms={4000} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Halo, {staff.display_name}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/produk" className={buttonClass("ghost") + " !min-h-10 !px-4 text-sm"}>Kelola produk</Link>
          <Link href="/admin/pengaturan" className={buttonClass("ghost") + " !min-h-10 !px-4 text-sm"}>Pengaturan</Link>
          <Link href="/admin/riwayat" className={buttonClass("ghost") + " !min-h-10 !px-4 text-sm"}>Riwayat</Link>
          <a href="/api/admin/export" className={buttonClass("ghost") + " !min-h-10 !px-4 text-sm"}>Unduh Excel</a>
          <AdminLive waiting={sorted.length} />
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        <OpenSwitch k="direct_open" label="Pesanan langsung" open={st.directOpen} />
        <OpenSwitch k="preorder_open" label="Pre-order" open={st.preorderOpen} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Menunggu verifikasi ({sorted.length})</h2>
        {sorted.length === 0 && <p className="opacity-70">Belum ada pembayaran yang perlu dicek.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((o: any) => (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold">{o.public_code}</span>
                <Badge tone={o.type === "direct" ? "direct" : "preorder"}>{o.type === "direct" ? "Langsung" : "Pre-order"}</Badge>
              </div>
              <p>{o.customer_name} · <b>{formatRupiah(o.total_amount)}</b></p>
              <p className="text-xs opacity-60">Klaim: {claimedAt(o) ? new Date(claimedAt(o)).toLocaleTimeString("id-ID") : "-"}</p>
              <VerifyButtons id={o.id} code={o.public_code} amount={o.total_amount} />
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <QueueColumn title="Antrean Langsung" tone="direct" orders={direct} />
        <QueueColumn title="Antrean Pre-Order" tone="preorder" orders={pre} />
      </div>
    </main>
  );
}
