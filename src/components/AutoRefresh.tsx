"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
// Pembaruan otomatis berkala. Dilewati saat tab disembunyikan agar hemat kuota dan beban server.
export function AutoRefresh({ ms = 5000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) router.refresh(); }, ms);
    return () => clearInterval(id);
  }, [router, ms]);
  return null;
}
