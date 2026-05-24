-- ============================================================
-- Xplore Riyadh — منصة الفعاليات (قائمة العروض، حجوزات، مفضلة، تقييمات)
-- نفّذ في Supabase → SQL Editor بعد تشغيل supabase-profiles.sql
-- اختياري: لاحقاً شغّل supabase-seed-restaurant-sport.sql لملء صور مجلدي restrent و sport
-- ============================================================

-- مطلوب لـ gen_random_bytes (رمز QR) — في Supabase تُثبَّت الدالة في مخطط extensions
create extension if not exists pgcrypto with schema extensions;

-- أعمدة إضافية للملف الشخصي
alter table public.profiles add column if not exists avatar_url text;

-- ── جدول العروض (فعاليات / مطاعم / رياضة) ──────────────────
create table if not exists public.listings (
    id              uuid primary key default gen_random_uuid(),
    listing_type    text not null check (listing_type in ('event', 'restaurant', 'sport')),
    title           text not null,
    slug            text unique,
    description     text,
    image_url       text,
    price_sar       numeric(12, 2) not null default 0 check (price_sar >= 0),
    stock           integer not null default 0 check (stock >= 0),
    category        text,
    venue           text,
    is_published    boolean not null default true,
    rating_avg      numeric(3, 1) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
    rating_count    integer not null default 0 check (rating_count >= 0),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists listings_type_idx on public.listings (listing_type);
create index if not exists listings_published_idx on public.listings (is_published);
create index if not exists listings_category_idx on public.listings (category);

-- ── الحجوزات ───────────────────────────────────────────────
create table if not exists public.bookings (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references auth.users (id) on delete cascade,
    listing_id      uuid not null references public.listings (id) on delete restrict,
    qty             integer not null check (qty > 0 and qty <= 20),
    unit_price      numeric(12, 2) not null,
    total_price     numeric(12, 2) not null,
    status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
    qr_token        text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
    created_at      timestamptz not null default now()
);

create index if not exists bookings_user_idx on public.bookings (user_id);
create index if not exists bookings_listing_idx on public.bookings (listing_id);
create index if not exists bookings_status_idx on public.bookings (status);

-- ── المفضلة ────────────────────────────────────────────────
create table if not exists public.favorites (
    user_id     uuid not null references auth.users (id) on delete cascade,
    listing_id  uuid not null references public.listings (id) on delete cascade,
    created_at  timestamptz not null default now(),
    primary key (user_id, listing_id)
);

-- ── التقييمات (نجمة واحدة لكل مستخدم لكل عرض) ──────────────
create table if not exists public.reviews (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users (id) on delete cascade,
    listing_id  uuid not null references public.listings (id) on delete cascade,
    stars       smallint not null check (stars between 1 and 5),
    created_at  timestamptz not null default now(),
    unique (user_id, listing_id)
);

create index if not exists reviews_listing_idx on public.reviews (listing_id);

-- ── تحديث متوسط التقييم ────────────────────────────────────
create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    lid uuid;
begin
    if tg_op = 'DELETE' then
        lid := old.listing_id;
    else
        lid := new.listing_id;
    end if;

    update public.listings
    set
        rating_avg = coalesce((
            select round(avg(stars)::numeric, 1) from public.reviews where listing_id = lid
        ), 0),
        rating_count = (select count(*)::int from public.reviews where listing_id = lid),
        updated_at = now()
    where id = lid;

    return null;
end;
$$;

drop trigger if exists tr_reviews_refresh on public.reviews;
create trigger tr_reviews_refresh
    after insert or update or delete on public.reviews
    for each row execute function public.reviews_refresh_rating();

-- ── شراء تذاكر (آمن، يخصم المخزون دفعة واحدة) ─────────────
create or replace function public.purchase_listing(p_listing_id uuid, p_qty integer)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    u uuid := auth.uid();
    st int;
    pr numeric;
    bid uuid;
    tok text;
begin
    if u is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;
    if p_qty is null or p_qty < 1 or p_qty > 20 then
        return json_build_object('ok', false, 'error', 'invalid_quantity');
    end if;

    select stock, price_sar into st, pr
    from public.listings
    where id = p_listing_id and is_published = true
    for update;

    if not found then
        return json_build_object('ok', false, 'error', 'listing_not_found');
    end if;
    if st < p_qty then
        return json_build_object('ok', false, 'error', 'sold_out');
    end if;

    tok := encode(extensions.gen_random_bytes(14), 'hex');

    update public.listings
    set stock = stock - p_qty, updated_at = now()
    where id = p_listing_id and stock >= p_qty;

    if not found then
        return json_build_object('ok', false, 'error', 'stock_race');
    end if;

    insert into public.bookings (user_id, listing_id, qty, unit_price, total_price, status, qr_token)
    values (u, p_listing_id, p_qty, pr, pr * p_qty, 'confirmed', tok)
    returning id into bid;

    return json_build_object('ok', true, 'booking_id', bid, 'qr_token', tok);
end;
$$;

grant execute on function public.purchase_listing(uuid, integer) to authenticated;

-- ── إلغاء حجز (يعيد المخزون) ───────────────────────────────
create or replace function public.cancel_booking(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    u uuid := auth.uid();
    b record;
    adm boolean;
begin
    if u is null then
        return json_build_object('ok', false, 'error', 'not_authenticated');
    end if;

    adm := public.is_admin();

    select * into b from public.bookings where id = p_booking_id for update;
    if not found then
        return json_build_object('ok', false, 'error', 'not_found');
    end if;

    if not adm and b.user_id <> u then
        return json_build_object('ok', false, 'error', 'forbidden');
    end if;

    -- أدمن: حجز ملغى مسبقاً → حذف من السجل
    if b.status = 'cancelled' then
        if adm then
            delete from public.bookings where id = p_booking_id;
            return json_build_object('ok', true, 'removed', true);
        end if;
        return json_build_object('ok', false, 'error', 'already_cancelled');
    end if;

    if b.status <> 'confirmed' then
        return json_build_object('ok', false, 'error', 'invalid_status');
    end if;

    update public.listings
    set stock = stock + b.qty, updated_at = now()
    where id = b.listing_id;

    update public.bookings set status = 'cancelled' where id = p_booking_id;

    return json_build_object('ok', true);
end;
$$;

grant execute on function public.cancel_booking(uuid) to authenticated;

-- ── حذف عرض (أدمن — يحذف الحجوزات المرتبطة ثم العرض) ───────
create or replace function public.admin_delete_listing(p_listing_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    n_bookings int;
begin
    if not public.is_admin() then
        return json_build_object('ok', false, 'error', 'forbidden');
    end if;

    if not exists (select 1 from public.listings where id = p_listing_id) then
        return json_build_object('ok', false, 'error', 'not_found');
    end if;

    delete from public.bookings where listing_id = p_listing_id;
    get diagnostics n_bookings = row_count;

    delete from public.listings where id = p_listing_id;

    return json_build_object('ok', true, 'bookings_removed', n_bookings);
end;
$$;

grant execute on function public.admin_delete_listing(uuid) to authenticated;

-- ── RLS ─────────────────────────────────────────────────────
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.favorites enable row level security;
alter table public.reviews enable row level security;

-- listings: الجميع يقرأ المنشور فقط | الأدمن الكل
drop policy if exists "listings_select_public" on public.listings;
create policy "listings_select_public"
    on public.listings for select
    using (is_published = true or public.is_admin());

drop policy if exists "listings_write_admin" on public.listings;
create policy "listings_write_admin"
    on public.listings for all
    using (public.is_admin())
    with check (public.is_admin());

-- bookings: قراءة الحجوزات (الإدراج فقط عبر purchase_listing — security definer يتجاوز RLS)
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own"
    on public.bookings for select
    using (auth.uid() = user_id or public.is_admin());

drop policy if exists "bookings_insert_own" on public.bookings;

drop policy if exists "bookings_update_admin" on public.bookings;
create policy "bookings_update_admin"
    on public.bookings for update
    using (public.is_admin());

-- favorites
drop policy if exists "fav_select_own" on public.favorites;
create policy "fav_select_own"
    on public.favorites for select
    using (auth.uid() = user_id);

drop policy if exists "fav_insert_own" on public.favorites;
create policy "fav_insert_own"
    on public.favorites for insert
    with check (auth.uid() = user_id);

drop policy if exists "fav_delete_own" on public.favorites;
create policy "fav_delete_own"
    on public.favorites for delete
    using (auth.uid() = user_id);

-- reviews
drop policy if exists "rev_select_all" on public.reviews;
create policy "rev_select_all"
    on public.reviews for select
    using (true);

drop policy if exists "rev_insert_own" on public.reviews;
create policy "rev_insert_own"
    on public.reviews for insert
    with check (auth.uid() = user_id);

drop policy if exists "rev_update_own" on public.reviews;
create policy "rev_update_own"
    on public.reviews for update
    using (auth.uid() = user_id);

drop policy if exists "rev_delete_own" on public.reviews;
create policy "rev_delete_own"
    on public.reviews for delete
    using (auth.uid() = user_id);

-- ── بيانات أولية (يمكن حذفها لاحقاً) ───────────────────────
insert into public.listings (listing_type, title, slug, description, image_url, price_sar, stock, category, venue, is_published, rating_avg, rating_count)
values
    ('event', 'Aquarabia Water Park', 'aquarabia-water-park',
     'أكبر مدينة مائية في السعودية بمدينة القدية — منزلقات ومناطق عائلية.',
     'event/1.jpeg', 185.00, 500, 'ماء وترفيه', 'القدية', true, 4.9, 120),
    ('event', 'Six Flags Qiddiya', 'six-flags-qiddiya',
     'مدينة ملاهي عالمية مع قطارات دوّارة ضخمة.',
     'event/2.jpeg', 295.00, 400, 'مدن ترفيهية', 'القدية', true, 4.8, 95),
    ('event', 'Boulevard City', 'boulevard-city',
     'منطقة موسم الرياض الرئيسية — عروض ومطاعم وتسوق.',
     'event/4.jpeg', 75.00, 2000, 'موسم', 'بوليفارد الرياض', true, 4.7, 300),
    ('event', 'Boulevard World', 'boulevard-world',
     'قرى عالمية وطعام وترفيه من مختلف الدول.',
     'event/5.jpeg', 85.00, 1800, 'موسم', 'بوليفارد الرياض', true, 4.6, 210),
    ('restaurant', 'مقهى أصيل الرياض', 'asil-cafe-riyadh',
     'قهوة مختصة وحلويات سعودية في أجواء عصرية.',
     'cofee pages/coffe1.jpg', 35.00, 80, 'مقاهي', 'الرياض', true, 4.5, 40),
    ('restaurant', 'مطعم نجد للمأكولات الشعبية', 'najd-restaurant',
     'كبسة ومندي وأطباق تقليدية.',
     'cofee pages/coffe2.jpg', 55.00, 120, 'مطاعم', 'الرياض', true, 4.4, 62),
    ('event', 'بطولة الرياض للرياضات الإلكترونية', 'riyadh-esports-cup',
     'فعاليات وبث مباشر وباقات حضور محدودة.',
     'event/6.jpeg', 120.00, 350, 'رياضات إلكترونية', 'الرياض', true, 4.7, 88)
on conflict (slug) do nothing;

-- إذا كانت قاعدة البيانات مُملأة مسبقاً والصف موجود كـ sport، نفّذ مرة واحدة:
-- update public.listings set listing_type = 'event' where slug = 'riyadh-esports-cup';

-- ── تخزين الصور (اختياري — لرفع صور من لوحة الأدمن) ─────────
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
    on storage.objects for select
    using (bucket_id = 'listing-images');

drop policy if exists "listing_images_admin_upload" on storage.objects;
create policy "listing_images_admin_upload"
    on storage.objects for insert
    with check (bucket_id = 'listing-images' and public.is_admin());

drop policy if exists "listing_images_admin_update" on storage.objects;
create policy "listing_images_admin_update"
    on storage.objects for update
    using (bucket_id = 'listing-images' and public.is_admin());

drop policy if exists "listing_images_admin_delete" on storage.objects;
create policy "listing_images_admin_delete"
    on storage.objects for delete
    using (bucket_id = 'listing-images' and public.is_admin());

-- صور الملف الشخصي: أي مستخدم مسجّل يرفع داخل avatars/ باسم ملف يبدأ بمعرّفه
drop policy if exists "listing_images_user_avatar_insert" on storage.objects;
create policy "listing_images_user_avatar_insert"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'listing-images'
        and name like 'avatars/' || auth.uid()::text || '-%'
    );

drop policy if exists "listing_images_user_avatar_update" on storage.objects;
create policy "listing_images_user_avatar_update"
    on storage.objects for update
    to authenticated
    using (
        bucket_id = 'listing-images'
        and name like 'avatars/' || auth.uid()::text || '-%'
    );

drop policy if exists "listing_images_user_avatar_delete" on storage.objects;
create policy "listing_images_user_avatar_delete"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'listing-images'
        and name like 'avatars/' || auth.uid()::text || '-%'
    );
