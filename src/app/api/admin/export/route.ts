import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireStaff } from "@/server/adminSession";
import { supabaseAdmin } from "@/server/supabaseAdmin";
import { queueLabel } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  pending_payment: "Menunggu pembayaran", awaiting_verification: "Menunggu verifikasi", payment_rejected: "Pembayaran ditolak",
  expired: "Kedaluwarsa", paid: "Lunas (antre)", preparing: "Diproses", ready: "Siap diambil", completed: "Selesai",
};
const PAID = new Set(["paid", "preparing", "ready", "completed"]); // "Lunas" = sudah diverifikasi operator
const SEL = "id, public_code, queue_number, type, status, customer_name, customer_whatsapp, total_amount, estimate_minutes, estimate_date, created_at, paid_at, sales_sessions(name), preorder_slots(pickup_date), payments(verified_by), order_items(product_name_snapshot, unit_price_snapshot, qty, order_item_options(name_snapshot))";

// Excel tidak punya zona waktu: geser +7 jam supaya tampil sebagai WIB.
const wib = (iso?: string | null) => (iso ? new Date(new Date(iso).getTime() + 7 * 3600 * 1000) : null);
const dateOnly = (d?: string | null) => (d ? new Date(d + "T00:00:00Z") : null);
const RP = '"Rp"#,##0', DT = "dd/mm/yyyy hh:mm", DD = "dd/mm/yyyy";
const thin = { style: "thin" as const, color: { argb: "FFD9D2C5" } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

function polish(ws: ExcelJS.Worksheet, lastCol: string, headerRow = 1) {
  const h = ws.getRow(headerRow);
  h.height = 26;
  h.eachCell((c) => {
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF17110C" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5B731" } };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    c.border = BORDER;
  });
  ws.eachRow((row, n) => {
    if (n <= headerRow) return;
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = { name: "Arial", size: 10, ...(c.font ?? {}) };
      c.border = BORDER;
      c.alignment = { vertical: "top", ...(c.alignment ?? {}) };
    });
  });
  ws.views = [{ state: "frozen", ySplit: headerRow }];
  ws.autoFilter = `A${headerRow}:${lastCol}${headerRow}`;
}

async function fetchOrders(sb: ReturnType<typeof supabaseAdmin>) {
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("orders").select(SEL).order("created_at").order("id").range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if ((data?.length ?? 0) < 1000) break;
  }
  return all;
}

export async function GET() {
  if (!(await requireStaff())) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  try {
    const sb = supabaseAdmin();
    const [orders, { data: staff }] = await Promise.all([fetchOrders(sb), sb.from("staff_profiles").select("user_id, display_name")]);
    const staffName = new Map((staff ?? []).map((s: any) => [s.user_id, s.display_name]));

    const wb = new ExcelJS.Workbook();
    wb.creator = "Gohyou";
    const wsSum = wb.addWorksheet("Ringkasan");
    const wsOrd = wb.addWorksheet("Pesanan");
    const wsDet = wb.addWorksheet("Detail Item");
    const wsProd = wb.addWorksheet("Rekap Produk");

    // ---------- Sheet Pesanan: satu baris per pesanan ----------
    wsOrd.columns = [
      { header: "No", key: "no", width: 6 }, { header: "Kode Pesanan", key: "kode", width: 14 },
      { header: "No. Antrean", key: "q", width: 12 }, { header: "Jenis", key: "jenis", width: 12 },
      { header: "Nama", key: "nama", width: 22 }, { header: "WhatsApp", key: "wa", width: 16, style: { numFmt: "@" } },
      { header: "Status", key: "status", width: 21 }, { header: "Lunas", key: "lunas", width: 8 },
      { header: "Total (Rp)", key: "total", width: 14, style: { numFmt: RP } },
      { header: "Dibuat (WIB)", key: "dibuat", width: 17, style: { numFmt: DT } },
      { header: "Dibayar (WIB)", key: "dibayar", width: 17, style: { numFmt: DT } },
      { header: "Diverifikasi oleh", key: "by", width: 18 },
      { header: "Tanggal Ambil (PO)", key: "pickup", width: 17, style: { numFmt: DD } },
      { header: "Estimasi (menit)", key: "em", width: 12 },
      { header: "Estimasi Tanggal", key: "ed", width: 16, style: { numFmt: DD } },
      { header: "Ringkasan Item", key: "items", width: 52, style: { alignment: { wrapText: true, vertical: "top" } } },
      { header: "Sesi", key: "sesi", width: 22 },
    ];
    // ---------- Sheet Detail Item: satu baris per item ----------
    wsDet.columns = [
      { header: "Kode Pesanan", key: "kode", width: 14 }, { header: "No. Antrean", key: "q", width: 12 },
      { header: "Jenis", key: "jenis", width: 12 }, { header: "Nama", key: "nama", width: 22 },
      { header: "Status", key: "status", width: 21 }, { header: "Lunas", key: "lunas", width: 8 },
      { header: "Produk", key: "produk", width: 28 }, { header: "Pilihan", key: "opsi", width: 34, style: { alignment: { wrapText: true, vertical: "top" } } },
      { header: "Jumlah", key: "qty", width: 9 }, { header: "Harga Satuan (Rp)", key: "harga", width: 16, style: { numFmt: RP } },
      { header: "Subtotal (Rp)", key: "sub", width: 15, style: { numFmt: RP } },
    ];

    const prod = new Map<string, { qty: number; rev: number }>();
    let detailRows = 0, paidCount = 0, revenue = 0, revDirect = 0, revPre = 0, cntDirect = 0, cntPre = 0, itemsSold = 0;
    const perStatus = new Map<string, number>();

    orders.forEach((o, i) => {
      const lunas = PAID.has(o.status);
      const q = o.queue_number != null ? queueLabel(o.type, o.queue_number) : "";
      const jenis = o.type === "direct" ? "Langsung" : "Pre-order";
      const label = STATUS[o.status] ?? o.status;
      perStatus.set(label, (perStatus.get(label) ?? 0) + 1);
      if (lunas) {
        paidCount++; revenue += o.total_amount;
        if (o.type === "direct") { revDirect += o.total_amount; cntDirect++; } else { revPre += o.total_amount; cntPre++; }
      }
      const lines: string[] = [];
      for (const it of o.order_items ?? []) {
        const opsi = (it.order_item_options ?? []).map((x: any) => x.name_snapshot).join(", ");
        lines.push(`${it.qty}× ${it.product_name_snapshot}${opsi ? ` (${opsi})` : ""}`);
        const r = wsDet.addRow({ kode: o.public_code, q, jenis, nama: o.customer_name, status: label, lunas: lunas ? "Ya" : "Tidak",
          produk: it.product_name_snapshot, opsi, qty: it.qty, harga: it.unit_price_snapshot });
        r.getCell("sub").value = { formula: `I${r.number}*J${r.number}`, result: it.qty * it.unit_price_snapshot };
        detailRows++;
        if (lunas) {
          itemsSold += it.qty;
          const p = prod.get(it.product_name_snapshot) ?? { qty: 0, rev: 0 };
          p.qty += it.qty; p.rev += it.qty * it.unit_price_snapshot;
          prod.set(it.product_name_snapshot, p);
        }
      }
      wsOrd.addRow({
        no: i + 1, kode: o.public_code, q, jenis, nama: o.customer_name, wa: o.customer_whatsapp ?? "", status: label,
        lunas: lunas ? "Ya" : "Tidak", total: o.total_amount, dibuat: wib(o.created_at), dibayar: wib(o.paid_at),
        by: staffName.get(o.payments?.[0]?.verified_by) ?? "", pickup: dateOnly(o.preorder_slots?.pickup_date),
        em: o.estimate_minutes ?? null, ed: dateOnly(o.estimate_date), items: lines.join("\n"), sesi: o.sales_sessions?.name ?? "",
      });
    });
    polish(wsOrd, "Q"); polish(wsDet, "K");
    const nP = Math.max(2, orders.length + 1), nD = Math.max(2, detailRows + 1);
    const P = (col: string) => `Pesanan!$${col}$2:$${col}$${nP}`;
    const D = (col: string) => `'Detail Item'!$${col}$2:$${col}$${nD}`;

    // ---------- Sheet Rekap Produk ----------
    wsProd.columns = [{ header: "Produk", key: "p", width: 32 }, { header: "Jumlah Terjual (lunas)", key: "q", width: 22 }, { header: "Pendapatan (Rp)", key: "r", width: 18, style: { numFmt: RP } }];
    const products = [...prod.entries()].sort((a, b) => b[1].qty - a[1].qty || a[0].localeCompare(b[0]));
    products.forEach(([name, v]) => {
      const r = wsProd.addRow({ p: name });
      r.getCell("q").value = { formula: `SUMIFS(${D("I")},${D("G")},$A${r.number},${D("F")},"Ya")`, result: v.qty };
      r.getCell("r").value = { formula: `SUMIFS(${D("K")},${D("G")},$A${r.number},${D("F")},"Ya")`, result: v.rev };
    });
    if (products.length === 0) wsProd.addRow({ p: "Belum ada penjualan lunas" });
    else {
      const last = wsProd.rowCount;
      const t = wsProd.addRow({ p: "TOTAL" });
      t.getCell("q").value = { formula: `SUM(B2:B${last})`, result: itemsSold };
      t.getCell("r").value = { formula: `SUM(C2:C${last})`, result: revenue };
      t.font = { name: "Arial", size: 10, bold: true };
    }
    polish(wsProd, "C");

    // ---------- Sheet Ringkasan (rumus mengacu ke sheet lain) ----------
    wsSum.columns = [{ width: 44 }, { width: 18 }, { width: 62 }];
    wsSum.getCell("A1").value = "Gohyou — Rekap Penjualan";
    wsSum.getCell("A1").font = { name: "Arial", size: 16, bold: true };
    wsSum.getCell("A2").value = `Diekspor: ${wib(new Date().toISOString())!.toISOString().slice(0, 16).replace("T", " ")} WIB`;
    wsSum.getCell("A2").font = { name: "Arial", size: 10, italic: true };
    wsSum.getRow(4).values = ["Ringkasan", "Nilai", "Keterangan"];
    let r = 5;
    const row = (label: string, formula: string, result: number, fmt: string, note = "") => {
      const x = wsSum.getRow(r);
      x.getCell(1).value = label; x.getCell(3).value = note;
      x.getCell(2).value = { formula, result }; x.getCell(2).numFmt = fmt;
      return r++;
    };
    const total = row("Total pesanan (semua status)", `COUNTA(${P("B")})`, orders.length, "#,##0");
    const lunas = row("Pesanan lunas", `COUNTIF(${P("H")},"Ya")`, paidCount, "#,##0", "Lunas = status Lunas, Diproses, Siap diambil, atau Selesai (sudah diverifikasi operator)");
    row("Pesanan belum lunas / ditolak / kedaluwarsa", `B${total}-B${lunas}`, orders.length - paidCount, "#,##0");
    const rev = row("Total pendapatan (lunas)", `SUMIFS(${P("I")},${P("H")},"Ya")`, revenue, RP);
    row("Pendapatan pesanan langsung", `SUMIFS(${P("I")},${P("D")},"Langsung",${P("H")},"Ya")`, revDirect, RP);
    row("Pendapatan pre-order", `SUMIFS(${P("I")},${P("D")},"Pre-order",${P("H")},"Ya")`, revPre, RP);
    row("Jumlah pesanan langsung (lunas)", `COUNTIFS(${P("D")},"Langsung",${P("H")},"Ya")`, cntDirect, "#,##0");
    row("Jumlah pesanan pre-order (lunas)", `COUNTIFS(${P("D")},"Pre-order",${P("H")},"Ya")`, cntPre, "#,##0");
    row("Rata-rata nilai pesanan lunas", `IF(B${lunas}=0,0,B${rev}/B${lunas})`, paidCount ? revenue / paidCount : 0, RP);
    row("Total item terjual (lunas)", `SUMIFS(${D("I")},${D("F")},"Ya")`, itemsSold, "#,##0");
    r++;
    const hs = r++;
    wsSum.getRow(hs).values = ["Pesanan per status", "Jumlah", ""];
    for (const label of Object.values(STATUS)) row(label, `COUNTIF(${P("G")},A${r})`, perStatus.get(label) ?? 0, "#,##0");
    r++;
    wsSum.getCell(`A${r}`).value = "Catatan: waktu dalam WIB (UTC+7). Pendapatan hanya menghitung pesanan lunas. Pembayaran QRIS statis diverifikasi manual oleh operator.";
    wsSum.getCell(`A${r}`).font = { name: "Arial", size: 9, italic: true };
    for (const n of [4, hs]) {
      wsSum.getRow(n).eachCell((c) => {
        c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF17110C" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5B731" } };
        c.border = BORDER; c.alignment = { horizontal: "center", vertical: "middle" };
      });
    }
    wsSum.eachRow((rw, n) => { if (n > 4 && n < r - 1 && n !== hs) rw.eachCell((c) => { c.font = { name: "Arial", size: 10 }; c.border = BORDER; }); });

    const buf = await wb.xlsx.writeBuffer();
    const day = wib(new Date().toISOString())!.toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gohyou-pesanan-${day}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("export gagal:", e);
    return NextResponse.json({ error: "Gagal membuat file Excel" }, { status: 500 });
  }
}
