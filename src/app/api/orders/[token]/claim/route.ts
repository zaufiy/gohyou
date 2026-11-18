import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { rpcFail } from "@/server/rpcError";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  const { data, error } = await supabaseAdmin().rpc("claim_payment", { p_token: token });
  return error ? rpcFail(error) : NextResponse.json({ status: data });
}
