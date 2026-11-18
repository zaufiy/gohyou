import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { ProductForm, GroupRow, QuickToggle } from "@/components/admin/CatalogEditors";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminProducts() {
  if (!(await requireStaff())) redirect("/admin/login");
  const { data } = await supabaseAdmin().from("products").select("*, option_groups(*, option_items(*))").order("sort_order").order("name");
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Kelola Produk</h1>
        <Link href="/admin" className={buttonClass("ghost")}>Kembali ke antrean</Link>
      </div>
      <p className="text-sm opacity-70">Perubahan langsung terlihat di menu customer. Produk yang pernah dipesan tidak bisa dihapus, tandai habis saja.</p>

      <Card><details><summary className="cursor-pointer font-display text-lg font-semibold">+ Tambah produk baru</summary><div className="pt-3"><ProductForm /></div></details></Card>

      {(data ?? []).map((p: any) => (
        <Card key={p.id} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <p className="text-sm opacity-70">{p.base_price > 0 ? formatRupiah(p.base_price) : "Harga belum diisi"} · {p.option_groups.length} grup pilihan</p>
            </div>
            <div className="flex items-center gap-2">
              {!p.is_available && <Badge>Habis</Badge>}
              <QuickToggle id={p.id} available={p.is_available} />
            </div>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-semibold underline">Ubah detail & pilihan</summary>
            <div className="space-y-4 pt-3">
              <ProductForm product={p} />
              <h3 className="font-semibold">Pilihan kustomisasi</h3>
              <p className="text-xs opacity-70">Maks 1 = pilih satu (radio). Maks lebih dari 1 = boleh pilih beberapa. Harga +Rp dihitung per item.</p>
              {[...p.option_groups].sort((a: any, b: any) => a.name.localeCompare(b.name)).map((g: any) => <GroupRow key={g.id} productId={p.id} group={g} />)}
              <GroupRow productId={p.id} />
            </div>
          </details>
        </Card>
      ))}
    </main>
  );
}
