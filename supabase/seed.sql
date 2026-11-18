-- DATA DUMMY. Ganti dengan data asli tim. Harga 0 = belum ditentukan.
insert into categories (id, name) values ('00000000-0000-0000-0000-000000000001','[DUMMY] Kategori');
insert into products (category_id, name, slug, description, base_price) values
 ('00000000-0000-0000-0000-000000000001','[DUMMY] Produk A','dummy-a','Placeholder, isi oleh tim',0),
 ('00000000-0000-0000-0000-000000000001','[DUMMY] Produk B','dummy-b','Placeholder, isi oleh tim',0);
-- Sesi: 20 Nov 2026. Jendela PO & kuota TBD tim.
insert into sales_sessions (name, starts_at, ends_at, is_active)
 values ('Penjualan 20 Nov 2026','2026-11-20 00:00+07','2026-11-20 23:59+07', true);
