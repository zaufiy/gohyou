-- Ghopyeong: skema awal (QRIS statis + verifikasi manual). Uang = integer rupiah.
create extension if not exists pgcrypto;

create type order_type as enum ('direct','preorder');
create type order_status as enum
  ('pending_payment','awaiting_verification','payment_rejected','expired','paid','preparing','ready','completed');

create table sales_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  preorder_opens_at timestamptz, preorder_closes_at timestamptz,
  is_active boolean not null default false
);
create unique index one_active_session on sales_sessions (is_active) where is_active;

create table settings (key text primary key, value jsonb not null);
insert into settings values
  ('payment_timeout_minutes','10'),
  ('preorder_min_days','null'),          -- TBD tim
  ('qris_image_url','null');             -- TBD tim

create table categories (id uuid primary key default gen_random_uuid(), name text not null, sort_order int not null default 0);
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null, slug text not null unique, description text,
  base_price int not null check (base_price >= 0), image_url text,
  is_available boolean not null default true, sort_order int not null default 0
);
create table option_groups (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null, is_required boolean not null default false,
  min_select int not null default 0, max_select int not null default 1,
  check (max_select >= min_select)
);
create table option_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references option_groups(id) on delete cascade,
  name text not null, extra_price int not null default 0 check (extra_price >= 0),
  is_available boolean not null default true
);

create table preorder_slots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sales_sessions(id),
  pickup_date date not null,
  capacity int not null check (capacity >= 0),
  reserved int not null default 0,
  unique (session_id, pickup_date),
  check (reserved >= 0 and reserved <= capacity)
);

create table queue_counters (
  session_id uuid not null references sales_sessions(id),
  type order_type not null, last_number int not null default 0,
  primary key (session_id, type)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sales_sessions(id),
  public_token text not null unique default encode(gen_random_bytes(16),'hex'),
  public_code text not null unique,                 -- kode pendek, mis. GH-4F2K
  customer_name text not null check (length(trim(customer_name)) > 0),
  customer_whatsapp text,                           -- opsional, hanya referensi
  type order_type not null,
  preorder_slot_id uuid references preorder_slots(id),
  queue_number int,
  status order_status not null default 'pending_payment',
  total_amount int not null check (total_amount >= 0),
  estimate_minutes int, estimate_date date,
  agreed_no_cancel boolean not null check (agreed_no_cancel),
  expires_at timestamptz not null,
  paid_at timestamptz, created_at timestamptz not null default now(),
  check ((type = 'preorder') = (preorder_slot_id is not null)),
  unique (session_id, type, queue_number)
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name_snapshot text not null, unit_price_snapshot int not null,
  qty int not null check (qty > 0), subtotal int not null
);
create table order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_item_id uuid references option_items(id),
  name_snapshot text not null, extra_price_snapshot int not null
);
create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id),
  amount int not null,
  status text not null default 'pending' check (status in ('pending','awaiting_verification','verified','rejected')),
  proof_image_url text, customer_claimed_at timestamptz,
  verified_by uuid references auth.users(id), verified_at timestamptz, reject_note text
);
create table order_status_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status, to_status order_status not null,
  changed_by uuid references auth.users(id), note text, created_at timestamptz not null default now()
);
create table staff_profiles (user_id uuid primary key references auth.users(id), display_name text not null);

-- Aturan #11: pesanan yang sudah dibayar tidak boleh kembali ke status belum-bayar/batal.
create function guard_paid_orders() returns trigger language plpgsql as $$
begin
  if old.paid_at is not null and new.status in ('pending_payment','awaiting_verification','payment_rejected','expired') then
    raise exception 'Pesanan yang sudah dibayar tidak dapat dibatalkan';
  end if;
  return new;
end $$;
create trigger trg_guard_paid before update on orders for each row execute function guard_paid_orders();

-- Tahan kuota PO secara atomik (mencegah race condition).
create function reserve_slot(p_slot uuid) returns boolean language plpgsql as $$
begin
  update preorder_slots set reserved = reserved + 1 where id = p_slot and reserved < capacity;
  return found;
end $$;
create function release_slot(p_slot uuid) returns void language plpgsql as $$
begin update preorder_slots set reserved = greatest(reserved - 1, 0) where id = p_slot; end $$;

-- Verifikasi operator: hanya sah dari awaiting_verification; nomor antrean diberikan di sini.
create function verify_payment(p_order uuid, p_staff uuid) returns int language plpgsql as $$
declare o orders; n int;
begin
  select * into o from orders where id = p_order for update;
  if o.status <> 'awaiting_verification' then raise exception 'Pesanan tidak menunggu verifikasi'; end if;
  insert into queue_counters (session_id, type, last_number) values (o.session_id, o.type, 1)
    on conflict (session_id, type) do update set last_number = queue_counters.last_number + 1
    returning last_number into n;
  update orders set status = 'paid', paid_at = now(), queue_number = n where id = p_order;
  update payments set status = 'verified', verified_by = p_staff, verified_at = now() where order_id = p_order;
  insert into order_status_logs (order_id, from_status, to_status, changed_by) values (p_order, 'awaiting_verification', 'paid', p_staff);
  return n;
end $$;

-- RLS aktif. Tanpa policy publik: customer hanya lewat server (service role) memakai token.
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_item_options enable row level security;
alter table payments enable row level security;
alter table order_status_logs enable row level security;
alter table queue_counters enable row level security;
alter table staff_profiles enable row level security;
alter table settings enable row level security;
-- Katalog & slot boleh dibaca publik
alter table categories enable row level security; alter table products enable row level security;
alter table option_groups enable row level security; alter table option_items enable row level security;
alter table preorder_slots enable row level security; alter table sales_sessions enable row level security;
create policy public_read on categories for select using (true);
create policy public_read on products for select using (true);
create policy public_read on option_groups for select using (true);
create policy public_read on option_items for select using (true);
create policy public_read on preorder_slots for select using (true);
create policy public_read on sales_sessions for select using (true);
-- Operator (user login) membaca/mengubah pesanan
create policy staff_all on orders for all using (exists (select 1 from staff_profiles s where s.user_id = auth.uid()));
create policy staff_all on payments for all using (exists (select 1 from staff_profiles s where s.user_id = auth.uid()));
create policy staff_all on order_items for select using (exists (select 1 from staff_profiles s where s.user_id = auth.uid()));
