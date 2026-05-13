-- ============================================================
-- My Enterprise — Supabase schema
-- วางทั้งหมดนี้ใน Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ตาราง: เก็บข้อมูลทุกประเภทแยกตาม user + store
-- store = 'settings' | 'customers' | 'inventory' | 'quotations' | 'invoices'
--       | 'receipts' | 'billings' | 'billing_combined' | 'doc_counters' | 'address_book'
-- data = JSONB array (สำหรับ store ที่เป็น list) หรือ JSONB object (settings)
create table if not exists public.app_store (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, store)
);

-- เปิด Row Level Security: คนเห็นเฉพาะข้อมูลตัวเอง
alter table public.app_store enable row level security;

drop policy if exists "own rows select" on public.app_store;
drop policy if exists "own rows insert" on public.app_store;
drop policy if exists "own rows update" on public.app_store;
drop policy if exists "own rows delete" on public.app_store;

create policy "own rows select" on public.app_store
  for select to authenticated
  using (user_id = auth.uid());

create policy "own rows insert" on public.app_store
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "own rows update" on public.app_store
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows delete" on public.app_store
  for delete to authenticated
  using (user_id = auth.uid());

-- index ช่วยตอน query หลายๆ store
create index if not exists app_store_user_idx on public.app_store(user_id);

-- trigger อัปเดต updated_at อัตโนมัติ
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists app_store_touch on public.app_store;
create trigger app_store_touch
  before update on public.app_store
  for each row execute function public.touch_updated_at();
