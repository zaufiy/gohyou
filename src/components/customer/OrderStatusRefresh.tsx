"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PayPanel } from "@/components/customer/PayPanel";
import { StatusNotifier } from "@/components/customer/StatusNotifier";
import { formatRupiah } from "@/lib/format";

const STATUS: Record<string, string> = {
  pending_payment: "Menunggu pembayaran",
  awaiting_verification: "Menunggu verifikasi",
  payment_rejected: "Pembayaran ditolak",
  expired: "Kedaluwarsa",
  paid: "Lunas, menunggu giliran",
  preparing: "Sedang diproses",
  ready: "Siap diambil",
  completed: "Selesai",
};
const TERMINAL = new Set(["completed", "expired", "payment_rejected"]);
const NOTIFIABLE = new Set(["awaiting_verification", "paid", "preparing", "ready", "payment_rejected", "completed"]);
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

type Props = {
  token: string;
  status: string;
  type: "direct" | "preorder";
  customerName: string;
  code: string | null;
  publicCode: string;
  totalAmount: number;
  expiresAt: string;
  qris: string;
  ahead: number | null;
  estimateMinutes: number | null;
  estimateDate: string | null;
  pickupDate: string | undefined;
};

export function OrderStatusRefresh({
  token, status, type, customerName, code, publicCode, totalAmount, expiresAt, qris, ahead, estimateMinutes, estimateDate, pickupDate,
}: Props) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (TERMINAL.has(currentStatus)) return;
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
        if (data.status !== currentStatus) {
          setCurrentStatus(data.status);
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
  }, [currentStatus, router, token]);

  return (
    <>
      <div className="flex gap-2">
        <Badge tone={type === "direct" ? "direct" : "preorder"}>{type === "direct" ? "Langsung" : "Pre-order"}</Badge>
        <Badge tone={["paid", "ready", "completed"].includes(currentStatus) ? "ok" : "wait"}>
          {STATUS[currentStatus] ?? currentStatus}
        </Badge>
      </div>
      {NOTIFIABLE.has(currentStatus) && <StatusNotifier status={currentStatus} code={code} />}
      <p>Atas nama {customerName}. {code ? "Nomor antreanmu sudah tersedia." : "Simpan kode pesanan ini."}</p>
      {currentStatus === "ready" && (
        <Card className="!border-jade !bg-jade text-center text-white">
          <p className="font-display text-2xl font-extrabold">Pesananmu siap diambil!</p>
          <p>Sebutkan nomor <b>{code}</b> ke petugas.</p>
        </Card>
      )}
      {currentStatus === "completed" && (
        <Card className="!border-jade !bg-jade text-center text-white">
          <p className="font-display text-2xl font-extrabold">Pesanan selesai!</p>
          <p>Terima kasih, pesananmu sudah diambil.</p>
        </Card>
      )}
      {currentStatus === "pending_payment" && (
        <Card className="space-y-3">
          <img src={qris} alt="QRIS pembayaran" className="mx-auto w-64 max-w-full" />
          <p className="text-center">Bayar tepat <b className="font-display text-2xl">{formatRupiah(totalAmount)}</b></p>
          <PayPanel token={token} expiresAt={expiresAt} />
        </Card>
      )}
      {currentStatus === "awaiting_verification" && <Card><p>Pembayaranmu sedang dicek operator. Halaman ini akan berubah otomatis, tidak perlu ditutup.</p></Card>}
      {currentStatus === "payment_rejected" && <Card><p>Pembayaran belum bisa diverifikasi. Silakan datang ke operator dengan kode <b>{publicCode}</b>.</p></Card>}
      {currentStatus === "expired" && <Card><p>Waktu pembayaran habis dan pesanan dibatalkan otomatis. Silakan buat pesanan baru.</p></Card>}
      {code && currentStatus !== "completed" && (
        <Card className="space-y-1 text-center">
          <p className="text-sm opacity-70">Nomor antrean</p>
          <p className="font-display text-5xl font-extrabold">{code}</p>
          {ahead !== null && <p>Di depanmu: <b>{ahead}</b> pesanan</p>}
          {type === "direct" && estimateMinutes != null && <p>Estimasi waktu tunggu: <b>{estimateMinutes} menit</b></p>}
          {type === "preorder" && (estimateDate || pickupDate) && <p>Siap diambil: <b>{fmtDate((estimateDate ?? pickupDate) as string)}</b></p>}
        </Card>
      )}
      {unavailable && <p role="status" className="text-center text-xs text-red-300">Status belum dapat diperbarui. Sistem akan mencoba kembali otomatis.</p>}
    </>
  );
}
