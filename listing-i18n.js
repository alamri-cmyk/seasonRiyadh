/**
 * ترجمة عروض Supabase (عناوين، أوصاف، تصنيفات، أماكن) حسب اللغة الحالية
 */
var XploreListingI18n = (function () {
    'use strict';

    var CATEGORY_EN = {
        'ماء وترفيه': 'Water & entertainment',
        'عالم وترفيه': 'Water & entertainment',
        'مدن ترفيهية': 'Theme parks',
        'موسم': 'Season',
        'مطاعم': 'Restaurants',
        'مقاهي': 'Cafés',
        'مطاعم ومقاهي': 'Restaurants & coffee shops',
        'مطاعم وكوفيهات': 'Restaurants & coffee shops',
        'رياضات إلكترونية': 'Esports',
        'رياضة إلكترونية': 'Esports'
    };

    var VENUE_EN = {
        'الرياض': 'Riyadh',
        'القدية': 'Qiddiya',
        'بوليفارد الرياض': 'Riyadh Boulevard'
    };

    var SLUG_EN = {
        'aquarabia-water-park': {
            title: 'Aquarabia Water Park',
            description: "Saudi Arabia's largest water park in Qiddiya — slides and family zones."
        },
        'six-flags-qiddiya': {
            title: 'Six Flags Qiddiya',
            description: 'World-class theme park with record-breaking roller coasters.'
        },
        'boulevard-city': {
            title: 'Boulevard City',
            description: 'The heart of Riyadh Season — shows, dining, and shopping.'
        },
        'boulevard-world': {
            title: 'Boulevard World',
            description: 'Global villages, food, and entertainment from around the world.'
        },
        'asil-cafe-riyadh': {
            title: 'Asil Café Riyadh',
            description: 'Specialty coffee and Saudi desserts in a modern setting.'
        },
        'najd-restaurant': {
            title: 'Najd Traditional Restaurant',
            description: 'Kabsa, mandi, and classic Najdi dishes.'
        },
        'riyadh-esports-cup': {
            title: 'Riyadh Esports Championship',
            description: 'Live events, streaming, and limited attendance packages.'
        }
    };

    var SLUG_AR = {
        'aquarabia-water-park': {
            title: 'أكواريبيا — مدينة مائية',
            description: 'أكبر مدينة مائية في السعودية بمدينة القدية — منزلقات ومناطق عائلية.'
        },
        'six-flags-qiddiya': {
            title: 'سيكس فلاجز القدية',
            description: 'مدينة ملاهي عالمية مع قطارات دوّارة ضخمة.'
        },
        'boulevard-city': {
            title: 'بوليفارد سيتي',
            description: 'منطقة موسم الرياض الرئيسية — عروض ومطاعم وتسوق.'
        },
        'boulevard-world': {
            title: 'بوليفارد وورلد',
            description: 'قرى عالمية وطعام وترفيه من مختلف الدول.'
        },
        'asil-cafe-riyadh': {
            title: 'مقهى أصيل الرياض',
            description: 'قهوة مختصة وحلويات سعودية في أجواء عصرية.'
        },
        'najd-restaurant': {
            title: 'مطعم نجد للمأكولات الشعبية',
            description: 'كبسة ومندي وأطباق تقليدية.'
        },
        'riyadh-esports-cup': {
            title: 'بطولة الرياض للرياضات الإلكترونية',
            description: 'فعاليات وبث مباشر وباقات حضور محدودة.'
        }
    };

    var GAME_NAMES = {
        'apex': 'Apex Legends',
        'chess': 'Chess',
        'cod-black-ops-7': 'Call of Duty: Black Ops 7',
        'cod-warzone': 'Call of Duty: Warzone',
        'dota-2': 'Dota 2',
        'ea-fc': 'EA Sports FC',
        'fatal-fury': 'Fatal Fury',
        'free-fire': 'Free Fire',
        'honor-of-kings': 'Honor of Kings',
        'league-of-legends': 'League of Legends',
        'mlbb-mwi': 'Mobile Legends: Bang Bang MWI',
        'mobile-legends-bang-bang': 'Mobile Legends: Bang Bang',
        'overwatch-2': 'Overwatch 2',
        'pubg-battlegrounds': 'PUBG: Battlegrounds',
        'r6s': 'Rainbow Six Siege',
        'rocket-league': 'Rocket League',
        'sf6': 'Street Fighter 6',
        'tekken': 'Tekken',
        'tft': 'Teamfight Tactics'
    };

    function lang() {
        return typeof XploreLang !== 'undefined' ? XploreLang.current() : 'en';
    }

    var CATEGORY_AR = {
        'مطاعم ومقاهي': 'مطاعم وكوفيهات',
        'مقاهي': 'كوفيهات'
    };

    function categoryLabel(cat, l) {
        if (!cat) return '';
        l = l || lang();
        if (l === 'en') return CATEGORY_EN[cat] || cat;
        return CATEGORY_AR[cat] || cat;
    }

    function venueLabel(venue, l) {
        if (!venue) return '';
        l = l || lang();
        if (l === 'en') return VENUE_EN[venue] || venue;
        return venue;
    }

    function gameFromSlug(slug) {
        if (!slug || slug.indexOf('sport-') !== 0) return null;
        var key = slug.replace(/^sport-/, '').replace(/-webook-ticket.*$/, '');
        return GAME_NAMES[key] || null;
    }

    function translateSportTitle(title, slug, l) {
        var game = gameFromSlug(slug);
        if (l === 'en') {
            if (game) return game + ' — WeBook ticket';
            var m = String(title || '').match(/فعالية\s*رياضية\s*[—\-]\s*(.+)/i);
            if (m) {
                var raw = m[1].replace(/\s*Webook.*$/i, '').replace(/\s*Ticket.*$/i, '').trim();
                return raw + ' — WeBook ticket';
            }
        }
        if (l === 'ar' && game) return 'فعالية رياضية — ' + game;
        return title;
    }

    function translateRestaurantTitle(title, l) {
        if (l === 'en') {
            var m = String(title || '').match(/مطعم\s*ومقهى\s*[—\-]\s*(.+)/i);
            if (m) return 'Restaurant & Café — ' + m[1].trim();
        }
        return title;
    }

    function defaultDescription(listingType, l) {
        if (l === 'en') {
            if (listingType === 'sport') return 'Sports & esports event ticket via Xplore Riyadh.';
            if (listingType === 'restaurant') return 'Book via Xplore Riyadh — from our restaurants & coffee shops collection.';
            return 'Book your experience via Xplore Riyadh.';
        }
        if (listingType === 'sport') return 'تذكرة حضور فعالية رياضية وإلكترونية عبر إكسبلور الرياض.';
        if (listingType === 'restaurant') return 'حجز عبر إكسبلور الرياض — من مجموعة المطاعم والكوفيهات.';
        return 'احجز تجربتك عبر إكسبلور الرياض.';
    }

    function localizeListing(row, forcedLang) {
        if (!row) return row;
        var l = forcedLang || lang();
        var out = Object.assign({}, row);
        var slug = row.slug || '';
        var slugPack = l === 'en' ? SLUG_EN[slug] : SLUG_AR[slug];

        if (slugPack) {
            if (slugPack.title) out.title = slugPack.title;
            if (slugPack.description) out.description = slugPack.description;
        } else if (row.listing_type === 'sport') {
            out.title = translateSportTitle(row.title, slug, l);
        } else if (row.listing_type === 'restaurant') {
            out.title = translateRestaurantTitle(row.title, l);
        }

        if (l === 'en' && !slugPack) {
            if (row.description && /[\u0600-\u06FF]/.test(row.description)) {
                out.description = defaultDescription(row.listing_type, l);
            }
        } else if (l === 'ar' && slugPack && slugPack.description) {
            out.description = slugPack.description;
        } else if (l === 'ar' && row.description && !/[\u0600-\u06FF]/.test(row.description)) {
            out.description = defaultDescription(row.listing_type, l);
        }

        out.category = categoryLabel(row.category, l);
        out.venue = venueLabel(row.venue, l);
        out._categoryKey = row.category;
        return out;
    }

    function localizeList(rows, forcedLang) {
        return (rows || []).map(function (r) { return localizeListing(r, forcedLang); });
    }

    return {
        categoryLabel: categoryLabel,
        venueLabel: venueLabel,
        localizeListing: localizeListing,
        localizeList: localizeList
    };
})();
