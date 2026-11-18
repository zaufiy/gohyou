"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

async function post(body: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/history", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: j.error ?? "Gagal" };
  } catch { return { ok: false, error: "Koneksi bermasalah" }; }
}

export function DeleteOrderButton({ id, code }: { id: string; code: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm(`Hapus pesanan ${code} dari riwayat? Tindakan ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const r = await post({ op: "order.delete", id });
    setBusy(false);
    if (!r.ok) alert(r.error); else router.refresh();
  }
  return <Button variant="ghost" className="!min-h-9 !px-4 text-sm" disabled={busy} onClick={go}>Hapus dari riwayat</Button>;
}

export function ResetPanel({ canReset, paidCount, totalCount }: { canReset: boolean; paidCount: number; totalCount: number }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm(`Yakin hapus SEMUA ${totalCount} pesanan? Ini tidak bisa dibatalkan.`)) return;
    setBusy(true);
    const r = await post({ op: "reset", confirm: text });
    setBusy(false);
    if (!r.ok) { alert(r.error); return; }
    setText(""); alert("Semua pesanan sudah dihapus. Nomor antrean dan kuota PO kembali ke awal."); router.refresh();
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">Menghapus <b>semua pesanan</b>, pembayaran, dan riwayat statusnya, lalu mengembalikan nomor antrean dan kuota PO ke awal. Produk, pengaturan, QRIS, dan akun operator <b>tidak</b> ikut terhapus.</p>
      {paidCount > 0 && <p className="rounded-xl bg-red-950/60 p-3 text-sm text-red-300">Peringatan: ada <b>{paidCount} pesanan lunas</b> yang akan ikut terhapus. Unduh Excel dulu untuk arsip.</p>}
      <a href="/api/admin/export" className="inline-block text-sm underline">Unduh Excel dulu (disarankan)</a>
      {!canReset
        ? <p className="rounded-xl bg-crust p-3 text-sm font-semibold text-paper">Tutup dulu Pesanan langsung dan Pre-order di dashboard sebelum reset.</p>
        : <div className="flex flex-wrap items-center gap-2">
            <input className="min-h-10 rounded-xl border border-steam bg-surface px-3 text-sm" placeholder="Ketik HAPUS SEMUA" value={text} onChange={(e) => setText(e.target.value)} />
            <Button disabled={busy || text !== "HAPUS SEMUA" || totalCount === 0} onClick={go}>Hapus semua pesanan</Button>
          </div>}
    </div>
  );
}
