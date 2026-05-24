-- ============================================================
-- بذور المطاعم/المقاهي (مجلد restrent) + الرياضة (مجلد sport)
-- نفّذ في SQL Editor بعد supabase-platform.sql
-- يحذف العروض القديمة من نوع مطعم/رياضة والبيانات المرتبطة بها ثم يعيد الإدراج
-- ============================================================

begin;

delete from public.bookings where listing_id in (
  select id from public.listings where listing_type in ('restaurant', 'sport')
);
delete from public.favorites where listing_id in (
  select id from public.listings where listing_type in ('restaurant', 'sport')
);
delete from public.reviews where listing_id in (
  select id from public.listings where listing_type in ('restaurant', 'sport')
);
delete from public.listings where listing_type in ('restaurant', 'sport');

insert into public.listings (listing_type, title, slug, description, image_url, price_sar, stock, category, venue, is_published, rating_avg, rating_count)
values
    ('restaurant', 'مطعم ومقهى — 10', 'rest-10', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/10.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 11 copy', 'rest-11-copy', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/11 copy.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 12', 'rest-12', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/12.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 13', 'rest-13', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/13.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 14', 'rest-14', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/14.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 15', 'rest-15', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/15.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 16', 'rest-16', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/16.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('restaurant', 'مطعم ومقهى — 9', 'rest-9', 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.', 'restrent/9.jpg', 45, 250, 'مطاعم ومقاهي', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Apex- Webook -Ticket- 1280x426', 'sport-apex-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Apex-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Chess- Webook -Ticket- 1280x426', 'sport-chess-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Chess-_Webook_-Ticket-_1280x426_.jpeg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — CoD-Black-Ops-7- Webook -Ticket- 1280x426', 'sport-cod-black-ops-7-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/CoD-Black-Ops-7-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — CoD Warzone- Webook -Ticket- 1280x426', 'sport-cod-warzone-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/CoD_Warzone-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Dota-2- Webook -Ticket- 1280x426', 'sport-dota-2-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Dota-2-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — EA-FC- Webook -Ticket- 1280x426', 'sport-ea-fc-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/EA-FC-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Fatal-Fury- Webook -Ticket- 1280x426', 'sport-fatal-fury-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Fatal-Fury-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Free-Fire- Webook -Ticket- 1280x426', 'sport-free-fire-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Free-Fire-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Honor-of-Kings- Webook -Ticket- 1280x426', 'sport-honor-of-kings-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Honor-of-Kings-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — League-of-Legends- Webook -Ticket- 1280x426', 'sport-league-of-legends-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/League-of-Legends-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — MLBB-MWI- Webook -Ticket- 1280x426', 'sport-mlbb-mwi-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/MLBB-MWI-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Mobile-Legends -Bang-Bang- Webook -Ticket- 1280x426', 'sport-mobile-legends-bang-bang-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Mobile-Legends_-Bang-Bang-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Overwatch 2- Webook -Ticket- 1280x426', 'sport-overwatch-2-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Overwatch_2-_Webook_-Ticket-_1280x426_.png', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — PUBG-Battlegrounds- Webook -Ticket- 1280x426', 'sport-pubg-battlegrounds-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/PUBG-Battlegrounds-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — R6S- Webook -Ticket- 1280x426', 'sport-r6s-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/R6S-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Rocket-League- Webook -Ticket- 1280x426', 'sport-rocket-league-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Rocket-League-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — SF6- Webook -Ticket- 1280x426', 'sport-sf6-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/SF6-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — Tekken- Webook -Ticket- 1280x426', 'sport-tekken-webook-ticket-1280x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/Tekken-_Webook_-Ticket-_1280x426_.jpg', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0),
    ('sport', 'فعالية رياضية — TFT- Webook -Ticket- 1920x426', 'sport-tft-webook-ticket-1920x426', 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.', 'sport/TFT-_Webook_-Ticket-_1920x426_.png', 99, 400, 'رياضة إلكترونية', 'الرياض', true, 4.5, 0)
on conflict (slug) do update set
    title = excluded.title,
    description = excluded.description,
    image_url = excluded.image_url,
    price_sar = excluded.price_sar,
    stock = excluded.stock,
    category = excluded.category,
    venue = excluded.venue,
    updated_at = now();

commit;
