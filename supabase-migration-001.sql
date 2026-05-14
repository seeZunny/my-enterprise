-- ============================================================
-- Migration 001: Add `app` namespace column
-- รันใน Supabase SQL Editor ครั้งเดียว
-- ปลอดภัย: ข้อมูลเดิมจะกลายเป็น app='docs' อัตโนมัติ
-- ============================================================

-- เพิ่มคอลัมน์ app (default 'docs' ให้ข้อมูลเดิม)
alter table public.app_store
  add column if not exists app text not null default 'docs';

-- เปลี่ยน primary key ให้รวม app เข้าไปด้วย
alter table public.app_store drop constraint if exists app_store_pkey;
alter table public.app_store add primary key (user_id, app, store);

-- index เพิ่มเติมเพื่อ query เร็วขึ้น
create index if not exists app_store_user_app_idx on public.app_store(user_id, app);
