-- Hapus satu pesanan yang tidak pernah lunas (kedaluwarsa / ditolak). Pesanan lunas TIDAK bisa dihapus satuan.
create or replace function delete_order(p_order uuid) returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status not in ('expired', 'payment_rejected') then
    raise exception 'Hanya pesanan kedaluwarsa atau ditolak yang bisa dihapus satuan'; end if;
  delete from payments where order_id = p_order;
  delete from orders where id = p_order;
end $$;

-- Kosongkan semua pesanan (untuk membersihkan data uji). Produk, pengaturan, QRIS, dan akun operator tetap ada.
create or replace function reset_orders() returns void language plpgsql security definer set search_path = public as $$
begin
  delete from order_status_logs where true;
  delete from payments where true;
  delete from orders where true;          -- item pesanan ikut terhapus (cascade)
  update preorder_slots set reserved = 0 where true;
  delete from queue_counters where true;  -- nomor antrean mulai dari 1 lagi
end $$;

revoke execute on function delete_order(uuid), reset_orders() from public, anon, authenticated;
grant execute on function delete_order(uuid), reset_orders() to service_role;
