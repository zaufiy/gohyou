import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabaseAdmin";

export const ADMIN_COOKIE = "gh_admin";
export const ADMIN_TTL = 12 * 3600; // 12 jam
const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sign = (p: string) => crypto.createHmac("sha256", secret()).update(p).digest("base64url");

export function makeToken(uid: string) {
  const p = Buffer.from(JSON.stringify({ uid, exp: Math.floor(Date.now() / 1000) + ADMIN_TTL })).toString("base64url");
  return `${p}.${sign(p)}`;
}
function readToken(t?: string): string | null {
  if (!t) return null;
  const [p, s] = t.split(".");
  if (!p || !s) return null;
  const a = Buffer.from(s), b = Buffer.from(sign(p));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString());
    return d.exp > Date.now() / 1000 ? (d.uid as string) : null;
  } catch { return null; }
}
/** Mengembalikan data operator yang sedang login, atau null. Dipanggil di setiap halaman/API admin. */
export async function requireStaff() {
  const id = readToken((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!id) return null;
  const { data } = await supabaseAdmin().from("staff_profiles").select("user_id, display_name").eq("user_id", id).maybeSingle();
  return data;
}
