"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ORDER_STATUS_CHANGE_EVENT, type OrderStatusChangeDetail } from "@/lib/orderStatusEvents";

type Kind = "ready" | "paid" | "preparing" | "rejected" | "completed";
// Nada sederhana (frekuensi Hz, waktu mulai detik).
const NOTES: Record<Kind, { f: number; at: number }[]> = {
  ready: [784, 988, 1175, 784, 988, 1175].map((f, i) => ({ f, at: i < 3 ? i * 0.18 : 0.9 + (i - 3) * 0.18 })),
  paid: [{ f: 660, at: 0 }, { f: 880, at: 0.2 }],
  preparing: [{ f: 740, at: 0 }],
  rejected: [{ f: 330, at: 0 }, { f: 262, at: 0.25 }],
  completed: [{ f: 784, at: 0 }, { f: 988, at: 0.2 }, { f: 1175, at: 0.4 }],
};
const TITLE: Partial<Record<string, string>> = { ready: "Siap diambil!", paid: "Pembayaran diterima", preparing: "Sedang diproses", payment_rejected: "Pembayaran ditolak", completed: "Pesanan selesai" };

// Bunyi + getar + judul tab saat status pesanan berubah. Tidak bunyi saat halaman pertama dibuka.
export function StatusNotifier({ status }: { status: string }) {
  const ctx = useRef<AudioContext | null>(null);
  const prev = useRef(status);
  const baseTitle = useRef("");
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");

  function ensure() {
    if (!ctx.current) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      if (!C) return null;
      ctx.current = new C();
    }
    return ctx.current;
  }
  async function enable() {
    const c = ensure();
    if (!c) return;
    await c.resume();
    setEnabled(c.state === "running");
  }
  function play(kind: Kind) {
    const c = ctx.current;
    if (!c || c.state !== "running") return;
    const t0 = c.currentTime;
    NOTES[kind].forEach(({ f, at }) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.28);
      o.connect(g); g.connect(c.destination);
      o.start(t0 + at); o.stop(t0 + at + 0.3);
    });
  }

  useEffect(() => {
    baseTitle.current = document.title;
    const c = ensure();
    if (c && c.state === "running") setEnabled(true);
    const events = ["pointerdown", "keydown", "touchstart"];
    const on = () => { enable(); };
    events.forEach((e) => window.addEventListener(e, on, { once: true }));
    return () => { events.forEach((e) => window.removeEventListener(e, on)); document.title = baseTitle.current; };
  }, []);

  useEffect(() => {
    function onStatusChange(event: Event) {
      const { status: nextStatus, code: nextCode } = (event as CustomEvent<OrderStatusChangeDetail>).detail;
      if (nextStatus === prev.current) return;
      prev.current = nextStatus;
      const kind: Kind | null = nextStatus === "ready" ? "ready" : nextStatus === "paid" ? "paid" : nextStatus === "preparing" ? "preparing" : nextStatus === "payment_rejected" ? "rejected" : nextStatus === "completed" ? "completed" : null;
      if (!kind) return;
      play(kind);
      if (typeof navigator.vibrate === "function") navigator.vibrate(kind === "ready" ? [300, 150, 300, 150, 300] : kind === "completed" ? [200, 100, 200] : [200]);
      document.title = `${TITLE[nextStatus] ?? ""} ${nextCode ?? ""}`.trim();
      if (nextStatus === "completed") setNotice("Pesanan selesai! Terima kasih.");
    }

    window.addEventListener(ORDER_STATUS_CHANGE_EVENT, onStatusChange);
    return () => window.removeEventListener(ORDER_STATUS_CHANGE_EVENT, onStatusChange);
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-steam bg-surface p-3 text-sm">
      {notice ? <p role="status">{notice}</p> : enabled ? <p>Notifikasi suara aktif. Biarkan halaman ini tetap terbuka.</p> : (
        <>
          <p>Aktifkan suara agar kamu tahu saat pesanan siap.</p>
          <Button variant="ghost" className="!min-h-9 !px-4 text-sm" onClick={enable}>Aktifkan suara</Button>
        </>
      )}
    </div>
  );
}
