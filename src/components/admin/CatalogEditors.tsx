"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { adminCatalog } from "@/lib/adminApi";

const field = "min-h-10 w-full rounded-xl border border-steam bg-surface px-3 text-sm";

function useSave() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run(body: object, after?: () => void) {
    setBusy(true);
    const r = await adminCatalog(body);
    setBusy(false);
    if (!r.ok) { alert(r.error); return; }
    after?.(); router.refresh();
  }
  return { busy, run };
}

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.82));
}

export function QuickToggle({ id, available }: { id: string; available: boolean }) {
  const { busy, run } = useSave();
  return <Button variant={available ? "ghost" : "primary"} className="!min-h-9 !px-4 text-sm" disabled={busy}
    onClick={() => run({ op: "product.toggle", id, is_available: !available })}>{available ? "Tandai habis" : "Tersedia lagi"}</Button>;
}

export function ProductForm({ product }: { product?: any }) {
  const router = useRouter();
  const { busy, run } = useSave();
  const [name, setName] = useState(product?.name ?? "");
  const [desc, setDesc] = useState(product?.description ?? "");
  const [ing, setIng] = useState(product?.ingredients ?? "");
  const [price, setPrice] = useState(product ? String(product.base_price) : "");
  const [sort, setSort] = useState(String(product?.sort_order ?? 0));
  const [avail, setAvail] = useState<boolean>(product?.is_available ?? true);
  const [img, setImg] = useState<string | null>(product?.image_url ?? null);
  const [up, setUp] = useState(false);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUp(true);
    try {
      const blob = await shrink(f);
      const fd = new FormData(); fd.append("file", blob, "foto.jpg");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) {
        alert(j.error ?? "Gagal mengunggah");
      } else if (product?.id) {
        const saved = await adminCatalog({ op: "product.image.save", id: product.id, image_url: j.url });
        if (!saved.ok) alert(saved.error ?? "Foto gagal disimpan ke produk");
        else { setImg(j.url); router.refresh(); }
      } else {
        setImg(j.url);
      }
    } catch { alert("Foto tidak bisa dibaca. Coba format JPG atau PNG."); }
    setUp(false);
  }
  const save = () => run(
    { op: "product.save", id: product?.id, name, description: desc || null, ingredients: ing || null, price: Number(price || 0), sort_order: Number(sort || 0), is_available: avail, image_url: img },
    () => { if (!product) { setName(""); setDesc(""); setIng(""); setPrice(""); setImg(null); } });
  const remove = () => { if (confirm(`Hapus produk "${product.name}" beserta pilihannya?`)) run({ op: "product.delete", id: product.id }); };

  return (
    <div className="space-y-3">
      <input className={field} placeholder="Nama produk" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <textarea className={field + " py-2"} rows={2} placeholder="Deskripsi / bahan (opsional)" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} />
      <textarea className={field + " py-2"} rows={2} placeholder="Bahan (pisahkan dengan koma, mis. ayam, wortel, kulit tahu)" value={ing} onChange={(e) => setIng(e.target.value)} maxLength={500} />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs">Harga dasar (Rp)<input className={field} type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label className="space-y-1 text-xs">Urutan tampil<input className={field} type="number" min={0} value={sort} onChange={(e) => setSort(e.target.value)} /></label>
      </div>
      <div className="flex items-center gap-3">
        {img && <img src={img} alt="Foto produk" className="h-16 w-16 rounded-xl object-cover" />}
        <label className="text-xs">Foto (opsional)<input type="file" accept="image/*" onChange={pick} className="block text-sm" /></label>
        {img && <button type="button" className="text-xs underline" onClick={() => setImg(null)}>Hapus foto</button>}
        {up && <span className="text-xs">Mengunggah...</span>}
        {img && !product?.id && <p className="text-xs opacity-70">Foto produk baru akan tersimpan setelah menekan “Tambah produk”.</p>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} className="h-5 w-5 accent-[#F5B731]" />Tersedia untuk dipesan</label>
      <div className="flex gap-2">
        <Button disabled={busy || up} onClick={save}>{product ? "Simpan produk" : "Tambah produk"}</Button>
        {product && <Button variant="ghost" disabled={busy} onClick={remove}>Hapus</Button>}
      </div>
    </div>
  );
}

export function ItemRow({ groupId, item }: { groupId: string; item?: any }) {
  const { busy, run } = useSave();
  const [name, setName] = useState(item?.name ?? "");
  const [price, setPrice] = useState(item ? String(item.extra_price) : "0");
  const [avail, setAvail] = useState<boolean>(item?.is_available ?? true);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className={field + " !w-40"} placeholder="Nama pilihan" value={name} onChange={(e) => setName(e.target.value)} />
      <span className="text-xs">+Rp</span>
      <input className={field + " !w-24"} type="number" min={0} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} className="h-4 w-4 accent-[#F5B731]" />Ada</label>
      <Button variant="ghost" className="!min-h-9 !px-3 text-sm" disabled={busy}
        onClick={() => run({ op: "item.save", id: item?.id, group_id: groupId, name, extra_price: Number(price || 0), is_available: avail }, () => { if (!item) { setName(""); setPrice("0"); } })}>{item ? "Simpan" : "Tambah pilihan"}</Button>
      {item && <button type="button" className="text-xs underline" onClick={() => confirm(`Hapus pilihan "${item.name}"?`) && run({ op: "item.delete", id: item.id })}>Hapus</button>}
    </div>
  );
}

export function GroupRow({ productId, group }: { productId: string; group?: any }) {
  const { busy, run } = useSave();
  const [name, setName] = useState(group?.name ?? "");
  const [req, setReq] = useState<boolean>(group?.is_required ?? false);
  const [min, setMin] = useState(String(group?.min_select ?? 0));
  const [max, setMax] = useState(String(group?.max_select ?? 1));
  const items = [...(group?.option_items ?? [])].sort((a: any, b: any) => a.name.localeCompare(b.name));
  return (
    <div className="space-y-2 rounded-xl border border-steam p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input className={field + " !w-44"} placeholder="Nama grup (mis. Saus)" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={req} onChange={(e) => setReq(e.target.checked)} className="h-4 w-4 accent-[#F5B731]" />Wajib</label>
        <label className="text-xs">Min<input className={field + " !w-16"} type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} /></label>
        <label className="text-xs">Maks<input className={field + " !w-16"} type="number" min={1} value={max} onChange={(e) => setMax(e.target.value)} /></label>
        <Button variant="ghost" className="!min-h-9 !px-3 text-sm" disabled={busy}
          onClick={() => run({ op: "group.save", id: group?.id, product_id: productId, name, is_required: req, min_select: Number(min || 0), max_select: Number(max || 1) }, () => { if (!group) { setName(""); setReq(false); setMin("0"); setMax("1"); } })}>{group ? "Simpan grup" : "Tambah grup"}</Button>
        {group && <button type="button" className="text-xs underline" onClick={() => confirm(`Hapus grup "${group.name}" beserta pilihannya?`) && run({ op: "group.delete", id: group.id })}>Hapus grup</button>}
      </div>
      {group && (
        <div className="space-y-2 border-l-2 border-steam pl-3">
          {items.map((it: any) => <ItemRow key={it.id} groupId={group.id} item={it} />)}
          <ItemRow groupId={group.id} />
        </div>
      )}
    </div>
  );
}
