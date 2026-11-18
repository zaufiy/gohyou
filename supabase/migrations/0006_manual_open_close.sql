-- Pembukaan pesanan langsung & pre-order diatur manual dari dashboard (bukan jadwal jam).
-- Default DITUTUP: operator harus membukanya di /admin.
insert into settings (key, value) values ('direct_open', 'false'), ('preorder_open', 'false')
  on conflict (key) do nothing;

create or replace function create_order(
  p_name text, p_wa text, p_type order_type, p_slot uuid, p_agreed boolean, p_items jsonb
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  s sales_sessions; slot preorder_slots; prod products; g option_groups;
  it jsonb; v_today date; v_min int; v_timeout int; v_code text; v_oid uuid; v_item uuid; v_token text;
  v_qty int; v_unit int; v_total int := 0; v_opts uuid[]; v_n int; v_open boolean;
begin
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Nama wajib diisi'; end if;
  if not coalesce(p_agreed, false) then raise exception 'Setujui ketentuan pesanan terlebih dahulu'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong'; end if;

  select * into s from sales_sessions where is_active;
  if not found then raise exception 'Penjualan sedang tidak aktif'; end if;
  v_today := (now() at time zone 'Asia/Jakarta')::date;

  if p_type = 'direct' then
    if p_slot is not null then raise exception 'Pesanan langsung tidak memakai tanggal pre-order'; end if;
    select (value #>> '{}')::boolean into v_open from settings where key = 'direct_open';
    if not coalesce(v_open, false) then raise exception 'Pesanan langsung sedang ditutup'; end if;
  else
    select (value #>> '{}')::boolean into v_open from settings where key = 'preorder_open';
    if not coalesce(v_open, false) then raise exception 'Pre-order sedang ditutup'; end if;
    select * into slot from preorder_slots where id = p_slot and session_id = s.id;
    if not found then raise exception 'Tanggal pre-order tidak valid'; end if;
    select (value #>> '{}')::int into v_min from settings where key = 'preorder_min_days';
    v_min := coalesce(v_min, 0);
    if slot.pickup_date < v_today + v_min then
      raise exception 'Tanggal ambil terlalu dekat, pre-order minimal % hari sebelumnya', v_min; end if;
    if not reserve_slot(p_slot) then raise exception 'Kuota pre-order untuk tanggal ini sudah penuh'; end if;
  end if;

  select (value #>> '{}')::int into v_timeout from settings where key = 'payment_timeout_minutes';
  v_timeout := coalesce(v_timeout, 10);

  loop
    v_code := 'GH-' || (select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random()*31)::int, 1), '')
                        from generate_series(1,4));
    exit when not exists (select 1 from orders where public_code = v_code);
  end loop;

  insert into orders (session_id, public_code, customer_name, customer_whatsapp, type, preorder_slot_id,
                      total_amount, agreed_no_cancel, expires_at)
  values (s.id, v_code, trim(p_name), nullif(trim(coalesce(p_wa,'')), ''), p_type, p_slot,
          0, true, now() + make_interval(mins => v_timeout))
  returning id, public_token into v_oid, v_token;

  for it in select value from jsonb_array_elements(p_items) loop
    v_qty := (it->>'qty')::int;
    if v_qty is null or v_qty < 1 or v_qty > 50 then raise exception 'Jumlah item tidak valid'; end if;
    select * into prod from products where id = (it->>'product_id')::uuid and is_available;
    if not found then raise exception 'Ada produk yang tidak tersedia'; end if;

    select coalesce(array_agg(distinct x::uuid), '{}') into v_opts
      from jsonb_array_elements_text(coalesce(it->'option_ids', '[]'::jsonb)) x;

    select count(*) into v_n from option_items oi join option_groups og on og.id = oi.group_id
      where oi.id = any(v_opts) and og.product_id = prod.id and oi.is_available;
    if v_n <> coalesce(array_length(v_opts, 1), 0) then raise exception 'Ada pilihan yang tidak valid atau habis'; end if;

    for g in select * from option_groups where product_id = prod.id loop
      select count(*) into v_n from option_items oi where oi.group_id = g.id and oi.id = any(v_opts);
      if v_n < (case when g.is_required then greatest(g.min_select, 1) else g.min_select end) or v_n > g.max_select then
        raise exception 'Pilihan "%" belum sesuai ketentuan', g.name; end if;
    end loop;

    select prod.base_price + coalesce(sum(oi.extra_price), 0) into v_unit from option_items oi where oi.id = any(v_opts);
    insert into order_items (order_id, product_id, product_name_snapshot, unit_price_snapshot, qty, subtotal)
      values (v_oid, prod.id, prod.name, v_unit, v_qty, v_unit * v_qty) returning id into v_item;
    insert into order_item_options (order_item_id, option_item_id, name_snapshot, extra_price_snapshot)
      select v_item, oi.id, oi.name, oi.extra_price from option_items oi where oi.id = any(v_opts);
    v_total := v_total + v_unit * v_qty;
  end loop;

  update orders set total_amount = v_total where id = v_oid;
  insert into payments (order_id, amount) values (v_oid, v_total);
  insert into order_status_logs (order_id, to_status, note) values (v_oid, 'pending_payment', 'Pesanan dibuat');
  return jsonb_build_object('token', v_token, 'code', v_code, 'total', v_total);
end $$;
