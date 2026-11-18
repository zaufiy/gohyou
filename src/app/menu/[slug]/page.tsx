import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/catalog";
import { getSettings } from "@/server/settings";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ProductCustomizer } from "@/components/customer/ProductCustomizer";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getSettings().catch(() => null),
  ]);
  if (!product) notFound();
  // Bahan ditulis dipisah koma atau baris baru di dashboard.
  const ingredients = (product.ingredients ?? "").split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-5">
      <AutoRefresh ms={5000} />
      <Link href="/menu" className="inline-block text-sm underline">← Kembali ke menu</Link>
      <div className="overflow-hidden rounded-card border border-steam bg-surface md:grid md:grid-cols-[1.1fr_1fr]">
        {/* Foto: di laptop memanjang setinggi panel agar tidak ada ruang kosong */}
        <div className="relative aspect-[4/3] bg-[#3a2a12] md:aspect-auto md:min-h-[420px]">
          {product.image_url
            ? <img src={product.image_url} alt={product.name} className="absolute inset-0 h-full w-full object-cover" />
            : <img src="/images/hero.jpeg" alt={product.name} className="absolute inset-0 h-full w-full object-cover" />}
        </div>
        <div className="space-y-5 p-6 md:p-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold leading-tight">{product.name}</h1>
            {product.description && <p className="opacity-80">{product.description}</p>}
            <p className="font-display text-2xl font-semibold text-crust">{product.base_price > 0 ? formatRupiah(product.base_price) : "Harga belum diisi"}</p>
          </div>
          {ingredients.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide opacity-70">Bahan</h2>
              <div className="flex flex-wrap gap-2">
                {ingredients.map((i) => <span key={i} className="rounded-pill border border-steam bg-paper/50 px-3 py-1 text-sm">{i}</span>)}
              </div>
            </div>
          )}
          <div className="border-t border-steam pt-5">
            {product.is_available
              ? <ProductCustomizer product={product} directOpen={settings?.directOpen ?? false} preorderOpen={settings?.preorderOpen ?? false} />
              : <p>Produk ini sedang habis.</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
