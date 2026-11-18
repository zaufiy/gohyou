import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { getSettings } from "@/server/settings";
import { Card } from "@/components/ui/Card";
import { buttonClass } from "@/components/ui/Button";
import { OpenSwitch, NumberSetting, SlotRow, QrisSetting, TextSetting } from "@/components/admin/SettingsEditors";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await requireStaff())) redirect("/admin/login");
  const sb = supabaseAdmin();
  const st = await getSettings();
  const { data: session } = await sb.from("sales_sessions").select("id, name").eq("is_active", true).maybeSingle();
  const { data: slots } = session ? await sb.from("preorder_slots").select("*").eq("session_id", session.id).order("pickup_date") : { data: [] as any[] };
  return (
    <main className="mx-auto max-w-3xl space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Pengaturan</h1>
        <Link href="/admin" className={buttonClass("ghost")}>Kembali ke antrean</Link>
      </div>

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">Pembukaan pemesanan</h2>
        <p className="text-sm opacity-70">Buka dan tutup manual kapan saja. Saat ditutup, customer tidak bisa membuat pesanan baru, tapi pesanan yang sudah ada tetap berjalan.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <OpenSwitch k="direct_open" label="Pesanan langsung" open={st.directOpen} />
          <OpenSwitch k="preorder_open" label="Pre-order" open={st.preorderOpen} />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">Kuota pre-order per tanggal</h2>
        <p className="text-sm opacity-70">{session ? `Sesi: ${session.name}. ` : "Belum ada sesi penjualan aktif. "}Kuota tidak bisa diturunkan di bawah jumlah yang sudah terpesan.</p>
        {(slots ?? []).map((s: any) => <SlotRow key={s.id} slot={s} />)}
        {(slots ?? []).length === 0 && <p className="text-sm opacity-70">Belum ada tanggal pre-order.</p>}
        <div className="border-t border-steam pt-3"><SlotRow /></div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Aturan pre-order dan pembayaran</h2>
        <NumberSetting k="preorder_min_days" label="Minimal hari sebelum tanggal ambil" unit="hari" value={st.minDays}
          hint="Customer hanya bisa memesan PO jika tanggal ambil minimal sekian hari dari hari ini. Isi 0 jika tidak ada batas." />
        <NumberSetting k="payment_timeout_minutes" label="Batas waktu pembayaran" unit="menit" value={st.timeoutMin}
          hint="Berlaku sebelum customer menekan 'Saya sudah membayar'. Pesanan yang lewat batas dibatalkan otomatis dan kuotanya dilepas." />
      </Card>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold">Info toko dan pengumuman</h2>
        <TextSetting k="announcement" label="Pengumuman (tampil di beranda dan menu)" value={st.announcement} multiline
          hint="Kosongkan untuk menyembunyikan. Contoh: info stok atau jam pengambilan." />
        <TextSetting k="site_address" label="Alamat / lokasi pengambilan" value={st.address} hint="Tampil di bagian bawah beranda." />
        <TextSetting k="site_hours" label="Jam operasional" value={st.hours} hint="Tampil di bagian bawah beranda." />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">QRIS pembayaran</h2>
        <QrisSetting url={st.qris} />
      </Card>
    </main>
  );
}
