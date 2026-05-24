-- ============================================================
-- إصلاح رفع الصورة الشخصية (المستخدمون العاديون)
-- + تأكد من تشغيل supabase-fix-delete-listing إن لزم
-- Supabase → SQL Editor → Run
-- ============================================================

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
