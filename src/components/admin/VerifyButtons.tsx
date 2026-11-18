"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatRupiah } from "@/lib/format";

export function VerifyButtons({ id, code, amount }: { id: string; code: string; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function act(action: "verify" | "reject") {
    let note: string | undefined;
    if (action === "verify") {
      if (!confirm(`Pastikan ${formatRupiah(amount)} untuk ${code} sudah masuk di mutasi merchant QRIS. Terima pembayaran ini?`)) return;
    } else {
      const n = prompt("Alasan menolak (opsional):");
      if (n === null) return;
      note = n;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/orders/${id}/${action}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }),
    });
    setBusy(false);
    if (!res.ok) alert((await res.json()).error ?? "Gagal");
    router.refresh();
  }
  return (
    <div className="mt-3 flex gap-2">
      <Button disabled={busy} onClick={() => act("verify")}>Terima</Button>
      <Button variant="ghost" disabled={busy} onClick={() => act("reject")}>Tolak</Button>
    </div>
  );
}
