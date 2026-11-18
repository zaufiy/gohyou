"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminSettings } from "@/lib/adminApi";

const field = "min-h-10 rounded-xl border border-steam bg-surface px-3 text-sm";

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(body: object, after?: () => void) {
    setBusy(true);
    const r = await adminSettings(body);
    setBusy(false);
    if (!r.ok) { alert(r.error); return; }
    after?.(); router.refresh();
  }
  return { busy, run };
}

export function OpenSwitch({ k, label, open }: { k: "direct_open" | "preorder_open"; label: string; open: boolean }) {
  const { busy, run } = useAct();
  const toggle = () => {
    if (open && !confirm(`Tutup ${label}? Customer tidak bisa membuat pesanan baru (pesanan yang sudah ada tetap jalan).`)) return;
    run({ op: "set", key: k, value: !open });
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-steam bg-surface p-4">
      <div className="space-y-1"><p className="font-semibold">{label}</p><Badge tone={open ? "ok" : "neutral"}>{open ? "Sedang dibuka" : "Sedang ditutup"}</Badge></div>
      <Button variant={open ? "ghost" : "primary"} disabled={busy} onClick={toggle}>{open ? "Tutup" : "Buka"}</Button>
    </div>
  );
}

export function NumberSetting({ k, label, hint, value, unit }: { k: string; label: string; hint: string; value: number; unit: string }) {
  const { busy, run } = useAct();
  const [v, setV] = useState(String(value));
  return (
    <div className="space-y-1">
      <p className="font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <input className={field + " w-24"} type="number" min={0} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
        <span className="text-sm">{unit}</span>
        <Button variant="ghost" className="!min-h-10 !px-4 text-sm" disabled={busy} onClick={() => run({ op: "set", key: k, value: Number(v) })}>Simpan</Button>
      </div>
      <p className="text-xs opacity-70">{hint}</p>
    </div>
  );
}

export function SlotRow({ slot }: { slot?: { id: string; pickup_date: string; capacity: number; reserved: number } }) {
  const { busy, run } = useAct();
  const [date, setDate] = useState(slot?.pickup_date ?? "");
  const [cap, setCap] = useState(slot ? String(slot.capacity) : "");
  const label = slot ? new Date(slot.pickup_date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {slot ? <span className="w-52 text-sm font-semibold">{label}</span> : <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
      <input className={field + " w-24"} type="number" min={0} inputMode="numeric" placeholder="kuota" value={cap} onChange={(e) => setCap(e.target.value)} />
      {slot && <span className="text-xs opacity-70">terpesan {slot.reserved}, sisa {Math.max(slot.capacity - slot.reserved, 0)}</span>}
      <Button variant="ghost" className="!min-h-10 !px-4 text-sm" disabled={busy || (!slot && !date)}
        onClick={() => run({ op: "slot.save", id: slot?.id, pickup_date: slot?.pickup_date ?? date, capacity: Number(cap) }, () => { if (!slot) { setDate(""); setCap(""); } })}>{slot ? "Simpan kuota" : "Tambah tanggal"}</Button>
      {slot && <button type="button" className="text-xs underline" onClick={() => confirm(`Hapus tanggal ${label}?`) && run({ op: "slot.delete", id: slot.id })}>Hapus</button>}
    </div>
  );
}

export function QrisSetting({ url }: { url: string | null }) {
  const { busy, run } = useAct();
  const [up, setUp] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2_000_000) { alert("Ukuran gambar maksimal 2 MB. Kecilkan dulu."); return; }
    setUp(true);
    const fd = new FormData(); fd.append("file", f);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    setUp(false);
    if (!res.ok) { alert(j.error ?? "Gagal mengunggah"); return; }
    run({ op: "set", key: "qris_image_url", value: j.url });
  }
  return (
    <div className="space-y-3">
      {url
        ? <img src={url} alt="QRIS saat ini" className="w-48 rounded-xl bg-white p-2" />
        : <div className="space-y-2"><p className="rounded-xl bg-crust p-3 text-sm font-semibold text-paper">Belum ada QRIS unggahan. Customer memakai QRIS default website.</p><img src="/images/qris-gohyong.jpeg" alt="QRIS default" className="w-48 rounded-xl bg-white p-2" /></div>}
      <label className="block text-sm">Unggah gambar QRIS toko (PNG/JPG, maks 2 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="mt-1 block" /></label>
      {up && <p className="text-xs">Mengunggah...</p>}
      {url && <Button variant="ghost" className="!min-h-9 !px-4 text-sm" disabled={busy} onClick={() => confirm("Hapus QRIS unggahan dan pakai QRIS default website?") && run({ op: "set", key: "qris_image_url", value: null })}>Hapus unggahan (pakai QRIS default)</Button>}
      <p className="text-xs opacity-70">Pastikan ini QRIS asli milik tim, lalu tes scan dari HP sebelum hari H.</p>
    </div>
  );
}

export function TextSetting({ k, label, hint, value, multiline }: { k: string; label: string; hint: string; value: string | null; multiline?: boolean }) {
  const { busy, run } = useAct();
  const [v, setV] = useState(value ?? "");
  return (
    <div className="space-y-1">
      <p className="font-semibold">{label}</p>
      {multiline
        ? <textarea className={field + " w-full py-2"} rows={2} maxLength={300} value={v} onChange={(e) => setV(e.target.value)} />
        : <input className={field + " w-full"} maxLength={300} value={v} onChange={(e) => setV(e.target.value)} />}
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="!min-h-9 !px-4 text-sm" disabled={busy} onClick={() => run({ op: "set", key: k, value: v })}>Simpan</Button>
        <p className="text-xs opacity-70">{hint}</p>
      </div>
    </div>
  );
}
