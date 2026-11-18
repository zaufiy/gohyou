-- Bucket publik untuk foto produk (diunggah lewat server memakai service role).
insert into storage.buckets (id, name, public) values ('produk', 'produk', true) on conflict (id) do nothing;
