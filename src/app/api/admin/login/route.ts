import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { ADMIN_COOKIE, ADMIN_TTL, makeToken } from "@/server/adminSession";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  const { data: staff } = await supabaseAdmin().from("staff_profiles").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!staff) return NextResponse.json({ error: "Akun ini bukan operator" }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, makeToken(data.user.id), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: ADMIN_TTL,
  });
  return res;
}
