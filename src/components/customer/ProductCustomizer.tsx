"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import type { Product, CartOption } from "@/types/catalog";

export function ProductCustomizer({ product, directOpen, preorderOpen }: { product: Product; directOpen: boolean; preorderOpen: boolean }) {
  const router = useRouter();
  const cart = useCart();
  const groups = product.option_groups ?? [];
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const chosen: CartOption[] = groups.flatMap((g) =>
    (sel[g.id] ?? []).map((id) => {
      const it = g.option_items.find((o) => o.id === id)!;
      return { groupName: g.name, itemId: it.id, name: it.name, extra: it.extra_price };
    })
  );
  const unitPrice = product.base_price + chosen.reduce((s, o) => s + o.extra, 0);
  const allClosed = !directOpen && !preorderOpen;
  const valid = groups.every((g) => {
    const n = (sel[g.id] ?? []).length;
    return n >= (g.is_required ? Math.max(g.min_select, 1) : g.min_select) && n <= g.max_select;
  });

  function toggle(gid: string, id: string, max: number) {
    setSel((s) => {
      const cur = s[gid] ?? [];
      if (max === 1) return { ...s, [gid]: [id] };
      if (cur.includes(id)) return { ...s, [gid]: cur.filter((x) => x !== id) };
      return cur.length >= max ? s : { ...s, [gid]: [...cur, id] };
    });
  }
  function addToCart() {
    const key = product.id + ":" + chosen.map((o) => o.itemId).sort().join(",");
    cart.add({ key, productId: product.id, slug: product.slug, name: product.name, unitPrice, qty, options: chosen });
    router.push("/keranjang");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge tone={directOpen ? "ok" : "neutral"}>Pesanan langsung: {directOpen ? "Buka" : "Tutup"}</Badge>
        <Badge tone={preorderOpen ? "ok" : "neutral"}>Pre-order: {preorderOpen ? "Buka" : "Tutup"}</Badge>
      </div>
      {allClosed && <Card><p className="font-semibold">Pemesanan sedang ditutup.</p><p className="text-sm opacity-70">Kamu masih bisa melihat menu, tetapi belum bisa menambahkan pesanan.</p></Card>}
      {groups.map((g) => (
        <Card key={g.id} className="!bg-paper/50">
          <h2 className="font-semibold">{g.name}</h2>
          <p className="mb-2 text-xs opacity-60">
            {g.is_required ? "Wajib pilih" : "Opsional"}{g.max_select > 1 ? `, maksimal ${g.max_select}` : ""}
          </p>
          <div className="space-y-1">
            {g.option_items.filter((o) => o.is_available).map((o) => {
              const on = (sel[g.id] ?? []).includes(o.id);
              return (
                <label key={o.id} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input type={g.max_select === 1 ? "radio" : "checkbox"} name={g.id} checked={on}
                    onChange={() => toggle(g.id, o.id, g.max_select)} className="h-5 w-5 accent-[#F5B731]" />
                  <span className="flex-1">{o.name}</span>
                  {o.extra_price > 0 && <span className="text-sm opacity-70">+{formatRupiah(o.extra_price)}</span>}
                </label>
              );
            })}
          </div>
        </Card>
      ))}
      <div className="flex items-center justify-between">
        <span className="font-semibold">Jumlah</span>
        <div className="flex items-center gap-4">
          <Button variant="ghost" aria-label="Kurangi" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
          <span className="w-6 text-center font-semibold">{qty}</span>
          <Button variant="ghost" aria-label="Tambah" onClick={() => setQty((q) => q + 1)}>+</Button>
        </div>
      </div>
      <Button full disabled={!valid || allClosed} onClick={addToCart}>Tambah ke keranjang · {formatRupiah(unitPrice * qty)}</Button>
      {!valid && <p className="text-center text-sm opacity-70">Lengkapi pilihan yang wajib dulu.</p>}
    </div>
  );
}
