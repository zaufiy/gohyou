import Link from "next/link";
import { getProducts } from "@/lib/catalog";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { ProductCard } from "@/components/customer/ProductCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getSettings } from "@/server/settings";
import { AutoRefresh } from "@/components/AutoRefresh";
import { buttonClass } from "@/components/ui/Button";
import { SITE } from "@/config/site";

export const dynamic = "force-dynamic";

const WHY = [
  { t: "Pilih sesuai selera", d: "Pilih varian dan tambahan untuk tiap menu. Harga ikut berubah saat kamu memilih." },
  { t: "Bayar di awal", d: "Cukup pindai QRIS. Pesananmu masuk antrean setelah pembayaran dikonfirmasi petugas." },
  { t: "Pantau dari HP", d: "Lihat nomor antrean, status, dan estimasi waktu tunggu tanpa berdiri menunggu di stan." },
];
const STEPS = [
  { t: "Pilih menu", d: "Atur varian dan jumlah." },
  { t: "Isi nama", d: "Cek lagi pesananmu sebelum membayar." },
  { t: "Bayar QRIS", d: "Pembayaran dikonfirmasi petugas." },
  { t: "Pantau antrean", d: "Ambil saat statusnya siap diambil." },
];

async function directQueueCount() {
  try {
    const { count } = await supabaseAdmin().from("orders").select("id", { count: "exact", head: true })
      .eq("type", "direct").in("status", ["paid", "preparing"]);
    return count ?? 0;
  } catch { return null; }
}

export default async function Home() {
  const [products, queue, st] = await Promise.all([getProducts().catch(() => []), directQueueCount(), getSettings().catch(() => null)]);
  return (
    <main className="space-y-12 p-5 pt-8">
      <AutoRefresh ms={5000} />
      {st?.announcement && <Card className="!border-crust"><p><b>Pengumuman:</b> {st.announcement}</p></Card>}
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="space-y-4">
          {st && (
            <div className="flex flex-wrap gap-2">
              <Badge tone={st.directOpen ? "ok" : "neutral"}>Pesanan langsung: {st.directOpen ? "Buka" : "Tutup"}</Badge>
              <Badge tone={st.preorderOpen ? "ok" : "neutral"}>Pre-order: {st.preorderOpen ? "Buka" : "Tutup"}</Badge>
            </div>
          )}
          {queue !== null && (
            <span className="inline-block rounded-pill border border-steam bg-surface px-3 py-1 text-xs font-semibold">
              Antrean langsung sekarang: {queue} pesanan
            </span>
          )}
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">Mau gohyong? Nggak perlu ribet.</h1>
          <p className="opacity-80">Pilih menu favoritmu, bayar pakai QRIS, lalu pantau antrean sampai pesananmu siap..</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/menu" className={buttonClass("primary")}>Pesan sekarang</Link>
            <Link href="/menu" className={buttonClass("ghost")}>Lihat menu</Link>
          </div>
        </div>
        <div className="rounded-card bg-[#3a2a12] p-6">
          <img src="/images/hero.jpeg" alt="Gohyong hangat" className="mx-auto w-full max-w-sm rounded-card object-cover" />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold">Kenapa pesan di sini</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {WHY.map((w) => (<Card key={w.t}><h3 className="font-semibold">{w.t}</h3><p className="mt-1 text-sm opacity-70">{w.d}</p></Card>))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold">Menu</h2>
        {products.length === 0 && <p className="opacity-70">Menu belum tersedia.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 3).map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
        </div>
        <Link href="/menu" className={buttonClass("ghost")}>Lihat semua menu</Link>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold">Cara pemesanan</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.t} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crust font-bold text-paper">{i + 1}</span>
              <div><h3 className="font-semibold">{s.t}</h3><p className="text-sm opacity-70">{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="space-y-1 border-t border-steam pt-5 text-sm">
        <p className="font-semibold">{SITE.name}</p>
        <p className="opacity-70">{st?.address ?? SITE.address ?? "Alamat usaha belum diisi"}</p>
        <p className="opacity-70">{st?.hours ?? SITE.hours ?? "Jam operasional belum diisi"}</p>
        <Link href="/admin" className="underline opacity-70">Khusus petugas</Link>
      </footer>
    </main>
  );
}
