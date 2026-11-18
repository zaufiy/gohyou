-- DUMMY opsi kustomisasi untuk Produk A. Jalankan SETELAH seed.sql. Ganti dengan varian/topping asli tim.
with p as (select id from products where slug = 'dummy-a'),
g1 as (insert into option_groups (product_id, name, is_required, min_select, max_select)
       select id, '[DUMMY] Varian', true, 1, 1 from p returning id),
g2 as (insert into option_groups (product_id, name, is_required, min_select, max_select)
       select id, '[DUMMY] Tambahan', false, 0, 2 from p returning id),
i1 as (insert into option_items (group_id, name, extra_price)
       select id, v, 0 from g1, (values ('[DUMMY] Varian 1'),('[DUMMY] Varian 2')) t(v) returning id)
insert into option_items (group_id, name, extra_price)
select id, v, 0 from g2, (values ('[DUMMY] Tambahan 1'),('[DUMMY] Tambahan 2'),('[DUMMY] Tambahan 3')) t(v);
