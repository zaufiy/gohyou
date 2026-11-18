import Link from "next/link";
import clsx from "clsx";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { GohyongArt, TINTS } from "./GohyongArt";
import { formatRupiah } from "@/lib/format";
import type { Product } from "@/types/catalog";

export function ProductCard({ p, index = 0 }: { p: Product; index?: number }) {
  const body = (
    <div className={clsx("flex h-full flex-col overflow-hidden rounded-card border border-steam bg-surface", !p.is_available && "opacity-50")}>
      <div className="relative bg-[#3a2a12] p-4">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} className="mx-auto h-36 w-full rounded-xl object-cover" />
          : <GohyongArt tint={TINTS[index % TINTS.length]} className="mx-auto h-36 w-full" />}
        {!p.is_available && <span className="absolute right-3 top-3"><Badge>Habis</Badge></span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="text-lg font-semibold">{p.name}</h2>
        {p.description && <p className="line-clamp-2 text-sm opacity-70">{p.description}</p>}
        {p.ingredients && <p className="line-clamp-2 text-sm"><b>Bahan:</b> <span className="opacity-70">{p.ingredients.replace(/\n+/g, ", ")}</span></p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <p className="font-display text-xl font-semibold">{p.base_price > 0 ? formatRupiah(p.base_price) : "Harga belum diisi"}</p>
          {p.is_available && <span className={buttonClass("primary") + " !min-h-10 !px-4 text-sm"}>Pilih & atur</span>}
        </div>
      </div>
    </div>
  );
  return p.is_available ? <Link href={`/menu/${p.slug}`} className="block h-full">{body}</Link> : body;
}
