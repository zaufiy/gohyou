import { NextResponse } from "next/server";
// P0001 = pesan dari RAISE EXCEPTION kita sendiri (aman ditampilkan). Error lain disembunyikan.
export function rpcFail(error: { code?: string; message: string }) {
  console.error("RPC gagal:", error);
  const known = error.code === "P0001";
  return NextResponse.json({ error: known ? error.message : "Terjadi kesalahan, coba lagi" }, { status: known ? 400 : 500 });
}
