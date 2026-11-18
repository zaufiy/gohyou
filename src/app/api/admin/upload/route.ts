import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(req: Request) {
  if (!(await requireStaff())) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || !TYPES[file.type] || file.size > 2_000_000)
    return NextResponse.json({ error: "Foto harus JPG/PNG/WebP dan maksimal 2 MB" }, { status: 400 });
  const sb = supabaseAdmin();
  const path = `${randomUUID()}.${TYPES[file.type]}`;
  const { error } = await sb.storage.from("produk").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) { console.error("upload gagal:", error); return NextResponse.json({ error: "Gagal mengunggah foto (cek bucket 'produk')" }, { status: 500 }); }
  return NextResponse.json({ url: sb.storage.from("produk").getPublicUrl(path).data.publicUrl });
}
