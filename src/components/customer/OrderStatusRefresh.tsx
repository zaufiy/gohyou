"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_CHANGE_EVENT, type OrderStatusChangeDetail } from "@/lib/orderStatusEvents";

export function OrderStatusRefresh({ token, status, code }: { token: string; status: string; code: string | null }) {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const observedStatus = useRef(status);

  useEffect(() => {
    observedStatus.current = status;
  }, [status]);

  useEffect(() => {
    let active = true;
    let checking = false;

    async function checkStatus() {
      if (!active || document.hidden || checking) return;
      checking = true;
      try {
        const res = await fetch(`/api/orders/${token}/status`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Status check returned ${res.status}`);
        const data: { status?: unknown } = await res.json();
        if (typeof data.status !== "string") throw new Error("Respons status pesanan tidak valid");
        if (!active) return;
        setUnavailable(false);
        if (data.status !== observedStatus.current) {
          observedStatus.current = data.status;
          window.dispatchEvent(new CustomEvent<OrderStatusChangeDetail>(ORDER_STATUS_CHANGE_EVENT, {
            detail: { status: data.status, code },
          }));
          router.refresh();
        }
      } catch (error) {
        if (active) {
          console.error("Gagal menyegarkan status pesanan:", error);
          setUnavailable(true);
        }
      } finally {
        checking = false;
      }
    }

    const timer = setInterval(checkStatus, 2000);
    const refreshWhenVisible = () => {
      if (!document.hidden) checkStatus();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refreshWhenVisible);
    checkStatus();

    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [code, router, status, token]);

  return unavailable
    ? <p role="status" className="text-center text-xs text-red-300">Status belum dapat diperbarui. Sistem akan mencoba kembali otomatis.</p>
    : null;
}
