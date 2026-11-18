-- Tahap 5: kedaluwarsa pesanan, klaim bayar customer, tolak pembayaran operator.

create or replace function expire_stale_orders() returns int language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in select id, preorder_slot_id from orders
           where status = 'pending_payment' and expires_at < now() for update skip locked loop
    update orders set status = 'expired' where id = r.id;
    update payments set status = 'rejected', reject_note = 'Waktu pembayaran habis' where order_id = r.id;
    if r.preorder_slot_id is not null then perform release_slot(r.preorder_slot_id); end if;
    insert into order_status_logs (order_id, from_status, to_status, note)
      values (r.id, 'pending_payment', 'expired', 'Waktu pembayaran habis');
    n := n + 1;
  end loop;
  return n;
end $$;

-- Customer menekan "Saya sudah membayar": timer berhenti, menunggu verifikasi operator. Idempotent.
create or replace function claim_payment(p_token text) returns text language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  perform expire_stale_orders();
  select * into o from orders where public_token = p_token for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status = 'awaiting_verification' then return 'awaiting_verification'; end if;
  if o.status <> 'pending_payment' then raise exception 'Pesanan ini sudah tidak bisa dibayar (status: %)', o.status; end if;
  update orders set status = 'awaiting_verification' where id = o.id;
  update payments set status = 'awaiting_verification', customer_claimed_at = now() where order_id = o.id;
  insert into order_status_logs (order_id, from_status, to_status, note)
    values (o.id, 'pending_payment', 'awaiting_verification', 'Customer menyatakan sudah membayar');
  return 'awaiting_verification';
end $$;

-- Operator menolak pembayaran (belum pernah lunas, jadi boleh). Kuota PO dilepas.
create or replace function reject_payment(p_order uuid, p_staff uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
declare o orders;
begin
  select * into o from orders where id = p_order for update;
  if not found or o.status <> 'awaiting_verification' then raise exception 'Pesanan tidak menunggu verifikasi'; end if;
  update orders set status = 'payment_rejected' where id = p_order;
  update payments set status = 'rejected', reject_note = p_note, verified_by = p_staff, verified_at = now() where order_id = p_order;
  if o.preorder_slot_id is not null then perform release_slot(o.preorder_slot_id); end if;
  insert into order_status_logs (order_id, from_status, to_status, changed_by, note)
    values (p_order, 'awaiting_verification', 'payment_rejected', p_staff, p_note);
end $$;

revoke execute on function expire_stale_orders(), claim_payment(text), reject_payment(uuid, uuid, text) from public, anon, authenticated;
grant execute on function expire_stale_orders(), claim_payment(text), reject_payment(uuid, uuid, text) to service_role;
