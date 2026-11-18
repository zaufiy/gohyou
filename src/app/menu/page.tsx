import { getProducts } from "@/lib/catalog";
import { getSettings } from "@/server/settings";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ProductCard } from "@/components/customer/ProductCard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [products, st] = await Promise.all([getProducts(), getSettings().catch(() => null)]);
  const closed = st && !st.directOpen && !st.preorderOpen;
  return (
    <main className="space-y-4 p-5">
      <AutoRefresh ms={5000} />
      <h1 className="text-3xl font-extrabold">Menu</h1>
      {st?.announcement && <Card className="!border-crust"><p><b>Pengumuman:</b> {st.announcement}</p></Card>}
      {st && (
        <div className="flex flex-wrap gap-2">
          <Badge tone={st.directOpen ? "ok" : "neutral"}>Pesanan langsung: {st.directOpen ? "Buka" : "Tutup"}</Badge>
          <Badge tone={st.preorderOpen ? "ok" : "neutral"}>Pre-order: {st.preorderOpen ? "Buka" : "Tutup"}</Badge>
        </div>
      )}
      {closed && <Card><p className="font-semibold">Pemesanan sedang ditutup.</p><p className="text-sm opacity-70">Kamu masih bisa melihat menu. Pemesanan dibuka oleh petugas saat penjualan berlangsung.</p></Card>}
      {products.length === 0 && <p>Belum ada produk.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p, i) => <ProductCard key={p.id} p={p} index={i} />)}
      </div>
    </main>
  );
}
