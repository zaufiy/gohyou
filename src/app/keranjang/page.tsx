"use client";
import Link from "next/link";
import { useCart } from "@/hooks/useCart";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";

export default function CartPage() {
  const { items, total, setQty } = useCart();
  return (
    <main className="mx-auto max-w-xl space-y-3 p-5">
      <h1 className="text-3xl font-extrabold">Keranjang</h1>
      {items.length === 0 && (
        <Card><p>Keranjang masih kosong.</p><Link href="/menu" className="mt-2 inline-block font-semibold underline">Lihat menu</Link></Card>
      )}
      {items.map((i) => (
        <Card key={i.key}>
          <div className="flex justify-between gap-3">
            <div>
              <h2 className="font-semibold">{i.name}</h2>
              {i.options.length > 0 && <p className="text-sm opacity-70">{i.options.map((o) => o.name).join(", ")}</p>}
              <p className="mt-1 text-sm">{formatRupiah(i.unitPrice)} per item</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" aria-label="Kurangi" onClick={() => setQty(i.key, i.qty - 1)}>−</Button>
              <span className="w-5 text-center font-semibold">{i.qty}</span>
              <Button variant="ghost" aria-label="Tambah" onClick={() => setQty(i.key, i.qty + 1)}>+</Button>
            </div>
          </div>
        </Card>
      ))}
      {items.length > 0 && (
        <>
          <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{formatRupiah(total)}</span></div>
          <Link href="/checkout" className="block"><Button full>Lanjut ke checkout</Button></Link>
        </>
      )}
    </main>
  );
}
