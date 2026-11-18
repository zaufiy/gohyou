"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function PayPanel({ token, expiresAt }: { token: string; expiresAt: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    let id: ReturnType<typeof setInterval>;
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) { clearInterval(id); router.refresh(); }
    };
    tick();
    id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, router]);

  async function claim() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/orders/${token}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Gagal, coba lagi"); else router.refresh();
    } catch { setError("Koneksi bermasalah, coba lagi"); }
    finally { setBusy(false); }
  }
  const mm = left === null ? "--" : String(Math.floor(left / 60)).padStart(2, "0");
  const ss = left === null ? "--" : String(left % 60).padStart(2, "0");
  return (
    <div className="space-y-3">
      <p className="text-center">Selesaikan pembayaran dalam <b className="font-display text-xl">{mm}:{ss}</b></p>
      {error && <p role="alert" className="rounded-xl bg-red-950/60 p-3 text-sm text-red-300">{error}</p>}
      <Button full disabled={busy || left === 0} onClick={claim}>{busy ? "Memproses..." : "Saya sudah membayar"}</Button>
      <p className="text-center text-xs opacity-60">Tekan tombol ini hanya setelah kamu benar-benar membayar. Timer berhenti setelah ditekan.</p>
    </div>
  );
}
