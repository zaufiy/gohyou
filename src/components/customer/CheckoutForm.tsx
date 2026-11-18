"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/format";
import type { SlotInfo } from "@/lib/catalog";

const inputCls = "min-h-11 w-full rounded-xl border border-steam bg-surface px-3";

export function CheckoutForm({ slots, directOpen, preorderOpen }: { slots: SlotInfo[]; directOpen: boolean; preorderOpen: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const [name, setName] = useState("");
  const [wa, setWa] = useState("");
  const [type, setType] = useState<"direct" | "preorder">(directOpen || !preorderOpen ? "direct" : "preorder");
  const [slotId, setSlotId] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (directOpen && !preorderOpen) setType("direct");
    else if (!directOpen && preorderOpen) setType("preorder");
  }, [directOpen, preorderOpen]);

  if (cart.items.length === 0)
    return <Card><p>Keranjang kosong.</p><Link href="/menu" className="font-semibold underline">Lihat menu</Link></Card>;
  if (!directOpen && !preorderOpen)
    return <Card><p className="font-semibold">Pemesanan sedang ditutup.</p><p className="text-sm opacity-70">Silakan coba lagi nanti atau tanyakan ke petugas.</p></Card>;

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Nama wajib diisi");
    if (type === "preorder" && !slotId) return setError("Pilih tanggal ambil pre-order");
    if (!agreed) return setError("Setujui ketentuan pesanan terlebih dahulu");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, whatsapp: wa, type, slotId: type === "preorder" ? slotId : null, agreed,
          items: cart.items.map((i) => ({ productId: i.productId, qty: i.qty, optionIds: i.options.map((o) => o.itemId) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Gagal membuat pesanan"); return; }
      cart.clear();
      router.push(`/pesanan/${data.token}`);
    } catch { setError("Koneksi bermasalah, coba lagi"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1"><span className="font-semibold">Nama (wajib)</span>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
      <label className="block space-y-1"><span className="font-semibold">Nomor WhatsApp (opsional)</span>
        <input className={inputCls} inputMode="tel" placeholder="08xxxxxxxxxx" value={wa} onChange={(e) => setWa(e.target.value)} /></label>
      <fieldset className="space-y-1"><legend className="font-semibold">Jenis pesanan</legend>
        {(["direct", "preorder"] as const).map((t) => (
          <label key={t} className="flex min-h-11 items-center gap-3">
            <input type="radio" name="type" checked={type === t} onChange={() => setType(t)} disabled={t === "direct" ? !directOpen : !preorderOpen} className="h-5 w-5 accent-[#F5B731]" />
            {t === "direct" ? "Pesan langsung" : "Pre-order"}{(t === "direct" ? !directOpen : !preorderOpen) ? " (sedang ditutup)" : ""}
          </label>
        ))}
      </fieldset>
      {type === "preorder" && (
        <label className="block space-y-1"><span className="font-semibold">Tanggal ambil</span>
          <select className={inputCls} value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            <option value="">Pilih tanggal</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id} disabled={s.remaining <= 0}>
                {new Date(s.pickup_date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
                {s.remaining > 0 ? ` (sisa ${s.remaining})` : " (penuh)"}
              </option>
            ))}
          </select></label>
      )}
      <Card>
        <div className="flex justify-between font-semibold"><span>Total</span><span>{formatRupiah(cart.total)}</span></div>
        <p className="mt-1 text-xs opacity-60">Total akhir dihitung ulang oleh sistem saat pesanan dibuat.</p>
      </Card>
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 h-5 w-5 accent-[#F5B731]" />
        <span className="text-sm">Saya paham pembayaran harus lunas di awal dan pesanan yang sudah dibayar tidak dapat dibatalkan.</span>
      </label>
      {error && <p role="alert" className="rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
      <Button full disabled={loading} onClick={submit}>{loading ? "Membuat pesanan..." : "Buat pesanan"}</Button>
    </div>
  );
}
