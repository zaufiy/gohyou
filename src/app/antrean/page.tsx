import { supabaseAdmin } from "@/server/supabaseAdmin";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Card } from "@/components/ui/Card";
import { queueLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
const GROUPS = [
  { status: "ready", title: "Siap diambil", cls: "bg-jade text-white" },
  { status: "preparing", title: "Sedang diproses", cls: "bg-crust text-paper" },
  { status: "paid", title: "Menunggu giliran", cls: "bg-steam text-soy" },
];

// Papan publik: hanya nomor antrean dan status. Tidak ada nama atau data pribadi.
export default async function QueueBoard() {
  const sb = supabaseAdmin();
  const { data: session } = await sb.from("sales_sessions").select("id").eq("is_active", true).maybeSingle();
  const { data } = session
    ? await sb.from("orders").select("type, status, queue_number").eq("session_id", session.id)
        .in("status", ["paid", "preparing", "ready"]).not("queue_number", "is", null).order("queue_number")
    : { data: [] as any[] };
  const cols = [{ type: "direct", title: "Pesanan Langsung" }, { type: "preorder", title: "Pre-Order" }];
  return (
    <main className="space-y-6 p-5">
      <AutoRefresh ms={5000} />
      <h1 className="text-3xl font-extrabold">Papan Antrean</h1>
      <div className="grid gap-5 md:grid-cols-2">
        {cols.map((c) => (
          <Card key={c.type} className="space-y-4">
            <h2 className="text-xl font-semibold">{c.title}</h2>
            {GROUPS.map((g) => {
              const items = (data ?? []).filter((o: any) => o.type === c.type && o.status === g.status);
              return (
                <div key={g.status}>
                  <p className="mb-2 text-sm font-semibold opacity-70">{g.title}</p>
                  {items.length === 0 ? <p className="text-sm opacity-50">-</p> : (
                    <div className="flex flex-wrap gap-2">
                      {items.map((o: any) => <span key={o.queue_number} className={`rounded-xl px-3 py-2 font-display text-xl font-bold ${g.cls}`}>{queueLabel(o.type, o.queue_number)}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </main>
  );
}
