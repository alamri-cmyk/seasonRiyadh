/* Xplore Riyadh — منصة الفعاليات (قائمة، حجز، مفضلة، تقييمات) */
(function () {
    'use strict';

    function client() {
        return typeof XploreAuth !== 'undefined' ? XploreAuth.client() : null;
    }

    function toast(msg, type) {
        var el = document.getElementById('xpToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'xpToast';
            el.className = 'xp-toast';
            el.setAttribute('role', 'status');
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.className = 'xp-toast show ' + (type || '');
        clearTimeout(el._t);
        el._t = setTimeout(function () { el.classList.remove('show'); }, 3400);
    }

    function setLoading(el, on) {
        if (!el) return;
        el.classList.toggle('xp-loading', !!on);
    }

    /** مسارات صور محلية قد تحتوي مسافات أو رموز — ترميز كل جزء من المسار */
    function encodeLocalImagePath(url) {
        if (!url || /^https?:\/\//i.test(String(url))) return url || 'img/LOGO.png';
        return String(url)
            .split('/')
            .map(function (seg) {
                return encodeURIComponent(seg);
            })
            .join('/');
    }

    /* ── Listings ─────────────────────────────────────────── */
    function fetchListings(listingType, opts) {
        opts = opts || {};
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });

        var q = supa
            .from('listings')
            .select('*')
            .eq('listing_type', listingType)
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (opts.category) {
            q = q.eq('category', opts.category);
        }
        return q;
    }

    function fetchListingById(id) {
        var supa = client();
        if (!supa) return Promise.resolve({ data: null, error: new Error('no client') });
        return supa.from('listings').select('*').eq('id', id).maybeSingle();
    }

    function adminUpsertListing(row) {
        var supa = client();
        if (!supa) return Promise.resolve({ data: null, error: new Error('no client') });
        var payload = {
            listing_type: row.listing_type,
            title: row.title,
            slug: row.slug,
            description: row.description,
            image_url: row.image_url,
            price_sar: row.price_sar,
            stock: row.stock,
            category: row.category,
            venue: row.venue,
            is_published: row.is_published
        };
        if (row.id) {
            return supa.from('listings').update(payload).eq('id', row.id).select().single();
        }
        return supa.from('listings').insert(payload).select().single();
    }

    function adminDeleteListing(id) {
        var supa = client();
        if (!supa) return Promise.resolve({ error: new Error('no client') });
        return supa.rpc('admin_delete_listing', { p_listing_id: id }).then(function (res) {
            if (res.error) return { data: null, error: res.error };
            var d = res.data;
            if (d && d.ok === false) {
                return { data: null, error: new Error(d.error || 'delete_failed') };
            }
            return { data: d, error: null };
        });
    }

    function adminFetchAllListings() {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });
        return supa.from('listings').select('*').order('created_at', { ascending: false });
    }

    /* ── Bookings ─────────────────────────────────────────── */
    function purchaseListing(listingId, qty) {
        var supa = client();
        if (!supa) return Promise.resolve({ data: null, error: new Error('no client') });
        return supa.rpc('purchase_listing', {
            p_listing_id: listingId,
            p_qty: qty
        });
    }

    function cancelBooking(bookingId) {
        var supa = client();
        if (!supa) return Promise.resolve({ data: null, error: new Error('no client') });
        return supa.rpc('cancel_booking', { p_booking_id: bookingId });
    }

    function myBookings() {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });
        return supa
            .from('bookings')
            .select('*, listings(title, image_url, listing_type)')
            .order('created_at', { ascending: false });
    }

    function adminAllBookingsSimple() {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });
        return supa
            .from('bookings')
            .select('*, listings(title, image_url)')
            .order('created_at', { ascending: false });
    }

    /* ── Favorites ─────────────────────────────────────────── */
    function myFavoriteListingIds() {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: null });
        return supa.from('favorites').select('listing_id');
    }

    function addFavorite(listingId) {
        var supa = client();
        if (!supa) return Promise.resolve({ error: new Error('no client') });
        return supa.auth.getSession().then(function (res) {
            var uid = res.data && res.data.session && res.data.session.user && res.data.session.user.id;
            if (!uid) return { error: new Error('not auth') };
            return supa.from('favorites').insert({ user_id: uid, listing_id: listingId });
        });
    }

    function removeFavorite(listingId) {
        var supa = client();
        if (!supa) return Promise.resolve({ error: new Error('no client') });
        return supa.from('favorites').delete().eq('listing_id', listingId);
    }

    function myFavoritesDetailed() {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });
        return supa
            .from('favorites')
            .select('created_at, listings(*)')
            .order('created_at', { ascending: false });
    }

    /* ── Reviews ───────────────────────────────────────────── */
    function fetchReviews(listingId) {
        var supa = client();
        if (!supa) return Promise.resolve({ data: [], error: new Error('no client') });
        return supa.from('reviews').select('*').eq('listing_id', listingId).order('created_at', { ascending: false });
    }

    function upsertMyReview(listingId, stars) {
        var supa = client();
        if (!supa) return Promise.resolve({ error: new Error('no client') });
        return supa.auth.getSession().then(function (res) {
            var uid = res.data && res.data.session && res.data.session.user && res.data.session.user.id;
            if (!uid) return { error: new Error('not auth') };
            return supa.from('reviews').upsert(
                { user_id: uid, listing_id: listingId, stars: stars },
                { onConflict: 'user_id,listing_id' }
            );
        });
    }

    /* ── Storage (صور العروض) ──────────────────────────────── */
    function uploadListingImage(file) {
        var supa = client();
        if (!supa || !file) return Promise.resolve({ data: null, error: new Error('no file') });
        var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        var path = Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
        return supa.storage.from('listing-images').upload(path, file, { upsert: false }).then(function (up) {
            if (up.error) return up;
            var pub = supa.storage.from('listing-images').getPublicUrl(path);
            var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : ((pub && pub.publicUrl) ? pub.publicUrl : '');
            return { data: { publicUrl: url }, error: null };
        });
    }

    function uploadProfileAvatar(file) {
        var supa = client();
        if (!supa || !file) return Promise.resolve({ data: null, error: new Error('no file') });
        return supa.auth.getSession().then(function (res) {
            var uid = res.data && res.data.session && res.data.session.user && res.data.session.user.id;
            if (!uid) return { data: null, error: new Error('not auth') };
            var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
            var path = 'avatars/' + uid + '-' + Date.now() + '.' + ext;
            return supa.storage.from('listing-images').upload(path, file, { upsert: true }).then(function (up) {
                if (up.error) return up;
                var pub = supa.storage.from('listing-images').getPublicUrl(path);
                var url = (pub && pub.data && pub.data.publicUrl) ? pub.data.publicUrl : ((pub && pub.publicUrl) ? pub.publicUrl : '');
                return { data: { publicUrl: url }, error: null };
            });
        });
    }

    /* ── Theme ─────────────────────────────────────────────── */
    function initTheme() {
        try {
            var t = localStorage.getItem('xp_theme') || 'dark';
            document.documentElement.setAttribute('data-theme', t);
        } catch (e) {}
    }

    function toggleTheme() {
        var cur = document.documentElement.getAttribute('data-theme') || 'dark';
        var next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem('xp_theme', next); } catch (e2) {}
        return next;
    }

    window.XplorePlatform = {
        toast: toast,
        setLoading: setLoading,
        encodeLocalImagePath: encodeLocalImagePath,
        fetchListings: fetchListings,
        fetchListingById: fetchListingById,
        adminUpsertListing: adminUpsertListing,
        adminDeleteListing: adminDeleteListing,
        adminFetchAllListings: adminFetchAllListings,
        purchaseListing: purchaseListing,
        cancelBooking: cancelBooking,
        myBookings: myBookings,
        adminAllBookingsSimple: adminAllBookingsSimple,
        myFavoriteListingIds: myFavoriteListingIds,
        addFavorite: addFavorite,
        removeFavorite: removeFavorite,
        myFavoritesDetailed: myFavoritesDetailed,
        fetchReviews: fetchReviews,
        upsertMyReview: upsertMyReview,
        uploadListingImage: uploadListingImage,
        uploadProfileAvatar: uploadProfileAvatar,
        initTheme: initTheme,
        toggleTheme: toggleTheme
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTheme);
    } else {
        initTheme();
    }
})();
