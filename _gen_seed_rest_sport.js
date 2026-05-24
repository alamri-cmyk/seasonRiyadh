const fs = require('fs');
const path = require('path');

const base = __dirname;
const sportDir = path.join(base, 'sport');
const restDir = path.join(base, 'restrent');

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function slug(filename, prefix) {
  const baseName = filename.replace(/\.[^.]+$/, '');
  const s = (prefix + '-' + baseName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return s || prefix + '-' + Math.random().toString(36).slice(2, 8);
}

const sport = fs.readdirSync(sportDir).filter((f) => /\.(jpe?g|png)$/i.test(f));
const rest = fs
  .readdirSync(restDir)
  .filter((f) => /\.jpg$/i.test(f) && !/\.psd$/i.test(f) && /^[\x20-\x7E]+$/.test(f));

const ins = [];

for (const f of rest) {
  const url = 'restrent/' + f;
  ins.push({
    type: 'restaurant',
    sl: slug(f, 'rest'),
    title: 'مطعم ومقهى — ' + f.replace(/\.[^.]+$/, ''),
    desc: 'حجز عبر Xplore Riyadh — من مجموعة صور المطاعم والمقاهي.',
    img: url,
    price: 45,
    stock: 250,
    cat: 'مطاعم ومقاهي',
    venue: 'الرياض',
  });
}

for (const f of sport) {
  const url = 'sport/' + f;
  const raw = f
    .replace(/\.[^.]+$/, '')
    .replace(/-_?Webook-_?Ticket-_?\d+x\d+_?/gi, '')
    .replace(/_/g, ' ')
    .trim();
  const title = raw || f;
  ins.push({
    type: 'sport',
    sl: slug(f, 'sport'),
    title: 'فعالية رياضية — ' + title,
    desc: 'تذكرة حضور فعالية رياضية وإلكترونية عبر Xplore Riyadh.',
    img: url,
    price: 99,
    stock: 400,
    cat: 'رياضة إلكترونية',
    venue: 'الرياض',
  });
}

const lines = ins.map(
  (r) =>
    `    ('${r.type}', '${esc(r.title)}', '${esc(r.sl)}', '${esc(r.desc)}', '${esc(
      r.img
    )}', ${r.price}, ${r.stock}, '${esc(r.cat)}', '${esc(r.venue)}', true, 4.5, 0)`
);

const sql = `-- ============================================================
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
${lines.join(',\n')}
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
`;

const out = path.join(base, 'supabase-seed-restaurant-sport.sql');
fs.writeFileSync(out, sql, 'utf8');
console.log('Wrote', out, 'listings:', ins.length);
