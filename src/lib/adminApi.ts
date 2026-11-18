// Dipanggil dari komponen client di dashboard.
export async function adminCatalog(body: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: j.error ?? "Gagal menyimpan" };
  } catch { return { ok: false, error: "Koneksi bermasalah" }; }
}

export async function adminSettings(body: object): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, error: j.error ?? "Gagal menyimpan" };
  } catch { return { ok: false, error: "Koneksi bermasalah" }; }
}
