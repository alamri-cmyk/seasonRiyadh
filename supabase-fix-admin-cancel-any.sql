-- ============================================================
-- أدمن: إلغاء أي حجز (مؤكد → ملغى + إرجاع مخزون | ملغى → حذف من السجل)
-- Supabase → SQL Editor → Run
-- ============================================================

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
