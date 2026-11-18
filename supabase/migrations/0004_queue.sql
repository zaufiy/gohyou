-- Tahap 4: operator mengubah status pesanan yang sudah lunas. Hanya langkah maju (dan mundur satu langkah untuk koreksi).
create or replace function set_order_status(p_order uuid, p_staff uuid, p_to order_status)
returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not (
       (o.status = 'paid'      and p_to = 'preparing')
    or (o.status = 'preparing' and p_to in ('ready', 'paid'))
    or (o.status = 'ready'     and p_to in ('completed', 'preparing'))
  ) then
    raise exception 'Perubahan status tidak diizinkan (% ke %)', o.status, p_to;
  end if;
  update orders set status = p_to where id = p_order;
  insert into order_status_logs (order_id, from_status, to_status, changed_by)
    values (p_order, o.status, p_to, p_staff);
end $$;

revoke execute on function set_order_status(uuid, uuid, order_status) from public, anon, authenticated;
grant execute on function set_order_status(uuid, uuid, order_status) to service_role;
