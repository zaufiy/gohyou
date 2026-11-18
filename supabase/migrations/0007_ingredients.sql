-- Kolom bahan/ingredients untuk produk (diisi operator lewat Kelola Produk).
alter table products add column if not exists ingredients text;
