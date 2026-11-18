# Ghopyeong
Website pemesanan gohyong (Tubes Kewirausahaan, Teknik Industri Undip).

## Menjalankan
1. `npm install`
2. Salin `.env.example` ke `.env.local`, isi dari dashboard Supabase.
3. Jalankan `supabase/migrations/0001_init.sql` lalu `supabase/seed.sql` di SQL Editor.
4. `npm run dev`

## Masih perlu diisi tim (TBD)
Produk/varian/harga/foto, `preorder_min_days`, kuota & tanggal PO, gambar QRIS (`settings.qris_image_url`), lokasi pengambilan.
Aturan: jangan menaruh secret di frontend; jangan memakai QRIS palsu untuk transaksi nyata.
