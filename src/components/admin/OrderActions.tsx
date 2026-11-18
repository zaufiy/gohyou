"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const NEXT: Record<string, { to: string; label: string } | undefined> = {
  paid: { to: "preparing", label: "Mulai proses" },
  preparing: { to: "ready", label: "Siap diambil" },
  ready: { to: "completed", label: "Selesai (sudah diambil)" },
};
const BACK: Record<string, { to: string; label: string } | undefined> = {
  preparing: { to: "paid", label: "Kembali ke antre" },
  ready: { to: "preparing", label: "Kembali ke proses" },
};
const field = "min-h-10 rounded-xl border border-steam bg-surface px-3 text-sm";

export function OrderActions(p: { id: string; type: string; status: string; estimateMinutes: number | null; estimateDate: string | null; pickupDate: string | null }) {
  const router = useRouter();
  const direct = p.type === "direct";
  const [est, setEst] = useState(direct ? String(p.estimateMinutes ?? "") : p.estimateDate ?? p.pickupDate ?? "");
  const [busy, setBusy] = useState(false);

  async function call(action: string, body: object) {
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${p.id}/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!res.ok) alert((await res.json()).error ?? "Gagal");
    router.refresh();
  }
  const next = NEXT[p.status], back = BACK[p.status];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {direct
          ? <><input className={field + " w-24"} type="number" min={0} max={600} inputMode="numeric" placeholder="menit" value={est} onChange={(e) => setEst(e.target.value)} /><span className="text-sm">menit</span></>
          : <input className={field} type="date" value={est} onChange={(e) => setEst(e.target.value)} />}
        <Button variant="ghost" className="!min-h-10 !px-4 text-sm" disabled={busy}
          onClick={() => call("estimate", direct ? { minutes: est === "" ? null : Number(est) } : { date: est || null })}>Simpan estimasi</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {next && <Button disabled={busy} onClick={() => { if (next.to !== "completed" || confirm("Tandai pesanan ini selesai diambil?")) call("status", { to: next.to }); }}>{next.label}</Button>}
        {back && <Button variant="ghost" disabled={busy} onClick={() => call("status", { to: back.to })}>{back.label}</Button>}
      </div>
    </div>
  );
}
