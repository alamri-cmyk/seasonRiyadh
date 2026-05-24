-- ============================================================
-- إصلاح خطأ الحجز: function gen_random_bytes(integer) does not exist
-- Supabase → SQL Editor → الصق الملف كاملاً → Run
-- (لا يحتاج إعادة رفع الموقع — الإصلاح في قاعدة البيانات فقط)
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- تحديث دالة الشراء (توليد رمز التذكرة)
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

-- القيمة الافتراضية لعمود qr_token عند إدراج صفوف بدون رمز
alter table public.bookings
  alter column qr_token set default encode(extensions.gen_random_bytes(16), 'hex');

grant execute on function public.purchase_listing(uuid, integer) to authenticated;
