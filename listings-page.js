/* Xplore — صفحات القوائم (فعاليات / مطاعم / رياضة) */
(function () {
    'use strict';

    function listingType() {
        return (document.body.getAttribute('data-listing-type') || 'event').trim();
    }

    function t(key) {
        return typeof XploreLang !== 'undefined' ? XploreLang.t(key) : key;
    }

    function escapeHtml(s) {
        if (!s) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    var favSet = new Set();
    var first = { data: null };

    async function loadFavorites() {
        favSet.clear();
        var res = await XplorePlatform.myFavoriteListingIds();
        if (res.data) {
            res.data.forEach(function (r) { favSet.add(r.listing_id); });
        }
    }

    function loc(row) {
        return typeof XploreListingI18n !== 'undefined'
            ? XploreListingI18n.localizeListing(row)
            : row;
    }

    function renderCard(item) {
        item = loc(item);
        var isFav = favSet.has(item.id);
        var stars = item.rating_avg ? Number(item.rating_avg).toFixed(1) : '—';
        return (
            '<article class="xp-card" data-listing-id="' + item.id + '">' +
            '<button type="button" class="xp-heart' + (isFav ? ' active' : '') + '" data-fav="' + item.id + '" aria-label="' + escapeHtml(t('platform.favBtn')) + '"><i class="fas fa-heart"></i></button>' +
            '<img src="' + escapeHtml(XplorePlatform.encodeLocalImagePath(item.image_url || 'img/LOGO.png')) + '" alt="">' +
            '<div class="xp-card-body">' +
            '<h3>' + escapeHtml(item.title) + '</h3>' +
            '<div class="xp-meta">' + escapeHtml(item.category || '') + (item.venue ? ' · ' + escapeHtml(item.venue) : '') + '</div>' +
            '<div class="xp-meta"><i class="fas fa-star" style="color:#ffd166"></i> ' + stars + ' (' + (item.rating_count || 0) + ')</div>' +
            '<div class="xp-price">' + (item.price_sar != null ? Number(item.price_sar).toFixed(0) : '0') + ' <small>SAR</small></div>' +
            '<div class="xp-meta" style="margin-top:8px">' + t('platform.stock') + ': ' + (item.stock != null ? item.stock : 0) + '</div>' +
            '</div></article>'
        );
    }

    async function reload() {
        var grid = document.getElementById('listingsGrid');
        if (!grid) return;

        XplorePlatform.setLoading(grid.parentElement, true);
        var searchEl = document.getElementById('listingSearch');
        var catEl = document.getElementById('listingCategory');
        var opts = {};
        if (searchEl && searchEl.value.trim()) opts.search = searchEl.value.trim();
        if (catEl && catEl.value) opts.category = catEl.value;

        var session = await XploreAuth.client().auth.getSession();
        if (session.data && session.data.session) {
            await loadFavorites();
        }

        var res = await XplorePlatform.fetchListings(listingType(), opts);
        XplorePlatform.setLoading(grid.parentElement, false);

        if (res.error) {
            grid.innerHTML = '<p class="xp-meta">' + escapeHtml(res.error.message || t('platform.loadErr')) + '</p>';
            XplorePlatform.toast(res.error.message || t('platform.loadErr'), 'error');
            return;
        }

        var rows = res.data || [];
        if (opts.search) {
            var qx = opts.search.toLowerCase();
            rows = rows.filter(function (r) {
                var L = loc(r);
                return (L.title && L.title.toLowerCase().indexOf(qx) !== -1) ||
                    (L.description && L.description.toLowerCase().indexOf(qx) !== -1) ||
                    (r.title && r.title.toLowerCase().indexOf(qx) !== -1) ||
                    (r.description && r.description.toLowerCase().indexOf(qx) !== -1);
            });
        }
        if (!rows.length) {
            grid.innerHTML = '<p class="xp-meta">' + t('platform.empty') + '</p>';
            return;
        }

        grid.innerHTML = rows.map(renderCard).join('');

        grid.querySelectorAll('.xp-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.closest('.xp-heart')) return;
                var id = card.getAttribute('data-listing-id');
                if (id) window.location.href = 'listing-detail.html?id=' + encodeURIComponent(id);
            });
        });

        grid.querySelectorAll('.xp-heart').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                var sess = await XploreAuth.client().auth.getSession();
                if (!sess.data || !sess.data.session) {
                    XplorePlatform.toast(t('platform.loginToFav'), 'error');
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname.split('/').pop() || 'Event.html');
                    return;
                }
                var lid = btn.getAttribute('data-fav');
                var active = btn.classList.contains('active');
                var r;
                if (active) {
                    r = await XplorePlatform.removeFavorite(lid);
                    if (!r.error) {
                        btn.classList.remove('active');
                        favSet.delete(lid);
                        XplorePlatform.toast(t('platform.favRemoved'), 'success');
                    }
                } else {
                    r = await XplorePlatform.addFavorite(lid);
                    if (!r.error) {
                        btn.classList.add('active');
                        favSet.add(lid);
                        XplorePlatform.toast(t('platform.favAdded'), 'success');
                    } else if (r.error && String(r.error.message || '').toLowerCase().includes('duplicate')) {
                        btn.classList.add('active');
                        favSet.add(lid);
                    } else {
                        XplorePlatform.toast(r.error.message || t('platform.err'), 'error');
                    }
                }
            });
        });
    }

    function wireToolbar() {
        var s = document.getElementById('listingSearch');
        var c = document.getElementById('listingCategory');
        var deb;
        function go() {
            clearTimeout(deb);
            deb = setTimeout(reload, 280);
        }
        if (s) s.addEventListener('input', go);
        if (c) c.addEventListener('change', reload);
    }

    function wireTheme() {
        var btn = document.getElementById('xpThemeToggle');
        if (btn) {
            btn.addEventListener('click', function () {
                XplorePlatform.toggleTheme();
            });
        }
    }

    function fillCategories(rows) {
        var sel = document.getElementById('listingCategory');
        if (!sel) return;
        var cur = sel.value;
        while (sel.options.length > 1) sel.remove(1);
        var seen = {};
        rows.forEach(function (r) {
            var key = r.category || (r._categoryKey) || '';
            if (!key) key = r.category;
            if (r.category && !seen[r.category]) {
                seen[r.category] = true;
                var o = document.createElement('option');
                o.value = r.category;
                o.textContent = typeof XploreListingI18n !== 'undefined'
                    ? XploreListingI18n.categoryLabel(r.category)
                    : r.category;
                sel.appendChild(o);
            }
        });
        if (cur) sel.value = cur;
        var allOpt = sel.querySelector('option[value=""]');
        if (allOpt) allOpt.textContent = t('platform.catAll');
    }

    async function init() {
        wireToolbar();
        wireTheme();

        var grid = document.getElementById('listingsGrid');
        if (grid) {
            grid.innerHTML = '<div class="xp-skel"></div><div class="xp-skel"></div><div class="xp-skel"></div>';
        }

        var res0 = await XplorePlatform.fetchListings(listingType(), {});
        first.data = res0.data || null;
        if (first.data) fillCategories(first.data);

        await reload();

        document.addEventListener('xplore:langchange', function () {
            if (first.data) fillCategories(first.data);
            reload();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
