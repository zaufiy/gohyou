import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";

const s = z.string().trim();
const id = z.string().uuid();
const schema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("product.save"), id: id.optional(), name: s.min(1, "Nama produk wajib diisi").max(80), description: s.max(300).nullable().optional(), ingredients: s.max(500).nullable().optional(),
    price: z.number().int("Harga harus angka bulat").min(0).max(1_000_000), sort_order: z.number().int().min(0).max(999).optional(),
    is_available: z.boolean(), image_url: s.max(500).nullable().optional() }),
  z.object({ op: z.literal("product.image.save"), id, image_url: s.max(500).nullable() }),
  z.object({ op: z.literal("product.toggle"), id, is_available: z.boolean() }),
  z.object({ op: z.literal("product.delete"), id }),
  z.object({ op: z.literal("group.save"), id: id.optional(), product_id: id, name: s.min(1, "Nama grup wajib diisi").max(60),
    is_required: z.boolean(), min_select: z.number().int().min(0).max(20), max_select: z.number().int().min(1, "Maksimal pilihan minimal 1").max(20) }),
  z.object({ op: z.literal("group.delete"), id }),
  z.object({ op: z.literal("item.save"), id: id.optional(), group_id: id, name: s.min(1, "Nama pilihan wajib diisi").max(60),
    extra_price: z.number().int("Harga harus angka bulat").min(0).max(1_000_000), is_available: z.boolean() }),
  z.object({ op: z.literal("item.delete"), id }),
]);

const slugify = (t: string) => t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "produk";
const fail = (m: string, status = 400) => NextResponse.json({ error: m }, { status });

export async function POST(req: Request) {
  if (!(await requireStaff())) return fail("Belum login", 401);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0]?.message ?? "Data tidak valid");
  const d = p.data;
  const sb = supabaseAdmin();
  let error: { code?: string; message: string } | null = null;

  switch (d.op) {
    case "product.save": {
      const fields = { name: d.name, description: d.description ?? null, ingredients: d.ingredients ?? null, base_price: d.price, sort_order: d.sort_order ?? 0,
        is_available: d.is_available, ...(d.image_url !== undefined ? { image_url: d.image_url } : {}) };
      ({ error } = d.id
        ? await sb.from("products").update(fields).eq("id", d.id)
        : await sb.from("products").insert({ ...fields, slug: `${slugify(d.name)}-${Math.random().toString(36).slice(2, 7)}` }));
      break;
    }
    case "product.image.save": ({ error } = await sb.from("products").update({ image_url: d.image_url }).eq("id", d.id)); break;
    case "product.toggle": ({ error } = await sb.from("products").update({ is_available: d.is_available }).eq("id", d.id)); break;
    case "product.delete": ({ error } = await sb.from("products").delete().eq("id", d.id)); break;
    case "group.save": {
      const min = d.is_required ? Math.max(d.min_select, 1) : d.min_select;
      if (min > d.max_select) return fail("Minimal pilihan tidak boleh lebih besar dari maksimal");
      const fields = { name: d.name, is_required: d.is_required, min_select: min, max_select: d.max_select };
      ({ error } = d.id ? await sb.from("option_groups").update(fields).eq("id", d.id) : await sb.from("option_groups").insert({ ...fields, product_id: d.product_id }));
      break;
    }
    case "group.delete": ({ error } = await sb.from("option_groups").delete().eq("id", d.id)); break;
    case "item.save": {
      const fields = { name: d.name, extra_price: d.extra_price, is_available: d.is_available };
      ({ error } = d.id ? await sb.from("option_items").update(fields).eq("id", d.id) : await sb.from("option_items").insert({ ...fields, group_id: d.group_id }));
      break;
    }
    case "item.delete": ({ error } = await sb.from("option_items").delete().eq("id", d.id)); break;
  }
  if (error) {
    console.error("catalog gagal:", error);
    if (error.code === "23503") return fail("Sudah pernah dipesan, jadi tidak bisa dihapus. Tandai habis saja.", 409);
    return fail("Gagal menyimpan, coba lagi", 500);
  }
  return NextResponse.json({ ok: true });
}
