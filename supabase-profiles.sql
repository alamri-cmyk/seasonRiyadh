-- ============================================================
-- Xplore Riyadh — جدول الملفات الشخصية + صلاحيات الأدمن
-- شغّل هذا الملف مرة واحدة في: Supabase → SQL Editor
-- ============================================================

-- 1) جدول profiles (مشاريع جديدة — إنشاء الجدول إن لم يكن موجوداً)
create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    full_name   text,
    email       text,
    phone       text,
    role        text not null default 'user' check (role in ('user', 'admin')),
    created_at  timestamptz not null default now()
);

-- 1b) ترحيل: إذا كان الجدول قديماً بدون عمود role (أو أعمدة ناقصة)
--     فـ CREATE TABLE IF NOT EXISTS لا يعدّل الجدول → نضيف الأعمدة هنا.
alter table public.profiles
    add column if not exists full_name text,
    add column if not exists email text,
    add column if not exists phone text;

alter table public.profiles
    add column if not exists role text default 'user';

update public.profiles set role = 'user' where role is null;

alter table public.profiles
    alter column role set default 'user',
    alter column role set not null;

alter table public.profiles
    add column if not exists created_at timestamptz not null default now();

do $$
begin
    if not exists (
        select 1
        from pg_constraint c
        join pg_class t on c.conrelid = t.oid
        join pg_namespace n on t.relnamespace = n.oid
        where n.nspname = 'public'
          and t.relname = 'profiles'
          and c.conname = 'profiles_role_allowed'
    ) then
        alter table public.profiles
            add constraint profiles_role_allowed check (role in ('user', 'admin'));
    end if;
exception
    when duplicate_object then null;
end $$;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

-- 2) تعبئة المستخدمين الحاليين
insert into public.profiles (id, full_name, email, role)
select
    u.id,
    coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    u.email,
    'user'
from auth.users u
on conflict (id) do update set
    email     = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

-- 3) أول أدمن — غيّر الإيميل لإيميلك
update public.profiles
set role = 'admin'
where email = 'alamri2003a@gmail.com';

-- 4) إنشاء profile تلقائياً عند التسجيل
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        'user'
    )
    on conflict (id) do update set
        email     = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 5) دالة التحقق من الأدمن (تتجنب مشاكل RLS المتداخلة)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
    );
$$;

-- 6) Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
    on public.profiles for select
    using (public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
    on public.profiles for update
    using (public.is_admin());

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
    on public.profiles for delete
    using (public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
    on public.profiles for insert
    with check (auth.uid() = id);
