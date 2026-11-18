import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const headers = { "Cache-Control": "no-store, max-age=0" };

  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404, headers });
  }

  const { data, error } = await supabaseAdmin()
    .from("orders")
    .select("status")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("Gagal membaca status pesanan:", error);
    return NextResponse.json({ error: "Gagal memuat status pesanan" }, { status: 500, headers });
  }
  if (!data) return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404, headers });

  return NextResponse.json({ status: data.status }, { headers });
}
