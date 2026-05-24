-- ============================================================
-- إصلاح حذف العرض: foreign key bookings_listing_id_fkey
-- Supabase → SQL Editor → Run (مرة واحدة)
-- ============================================================

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
