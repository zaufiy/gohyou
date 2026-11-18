"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

// Bunyi saat ada klaim bayar baru + tombol keluar. Browser butuh satu klik untuk mengizinkan suara.
export function AdminLive({ waiting }: { waiting: number }) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const prev = useRef(waiting);
  const ctx = useRef<AudioContext | null>(null);

  function beep() {
    const c = ctx.current;
    if (!c) return;
    [0, 0.35].forEach((t) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880; g.gain.value = 0.2;
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.25);
    });
  }
  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting}) Verifikasi · Operator` : "Operator";
    if (on && waiting > prev.current) beep();
    prev.current = waiting;
  }, [waiting, on]);

  function toggle() {
    if (!on) {
      ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.current.resume();
      setOn(true); setTimeout(beep, 50);
    } else setOn(false);
  }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.push("/admin/login"); }
  return (
    <div className="flex gap-2">
      <Button variant={on ? "primary" : "ghost"} className="!min-h-10 !px-4 text-sm" onClick={toggle}>{on ? "Suara: aktif" : "Aktifkan suara"}</Button>
      <Button variant="ghost" className="!min-h-10 !px-4 text-sm" onClick={logout}>Keluar</Button>
    </div>
  );
}
