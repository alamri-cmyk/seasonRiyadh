/* Xplore Riyadh — Admin Dashboard */
(function () {
    'use strict';

    var users = [];
    var currentAdmin = null;
    var listingsCache = [];

    function $(id) { return document.getElementById(id); }

    function initials(name) {
        if (!name) return '?';
        return name.trim().split(/\s+/).map(function (w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || '?';
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            var d = new Date(iso);
            return d.toLocaleDateString(document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-GB', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        } catch (e) {
            return iso.slice(0, 10);
        }
    }

    function formatToday() {
        return new Date().toLocaleDateString(
            document.documentElement.lang === 'ar' ? 'ar-SA' : 'en-GB',
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        );
    }

    function t(key) {
        return typeof XploreLang !== 'undefined' ? XploreLang.t(key) : key;
    }

    function toast(msg, type) {
        var el = $('admToast');
        if (!el) return;
        el.textContent = msg;
        el.className = 'adm-toast show ' + (type || '');
        clearTimeout(el._timer);
        el._timer = setTimeout(function () { el.classList.remove('show'); }, 3200);
    }

    function showDenied() {
        $('admApp').style.display = 'none';
        $('accessDenied').style.display = 'flex';
    }

    function showApp() {
        $('accessDenied').style.display = 'none';
        $('admApp').style.display = '';
    }

    function setAdminUI(profile, user) {
        var name = profile.full_name || user.email || 'Admin';
        $('sidebarName').textContent = name;
        $('sidebarRole').textContent = t('admin.role.sysadmin');
        $('sidebarAvatar').textContent = initials(name);
        $('topName').textContent = name;
        $('topAvatar').textContent = initials(name);
    }

    function updateStats() {
        var total = users.length;
        var admins = users.filter(function (u) { return u.role === 'admin'; }).length;
        var regular = total - admins;

        $('statTotal').textContent = total;
        $('statAdmins').textContent = admins;
        $('statUsers').textContent = regular;
        $('badgeUsers').textContent = total;

        renderRecentUsers();
    }

    function renderRecentUsers() {
        var list = $('recentUsersList');
        if (!list) return;
        var recent = users.slice().sort(function (a, b) {
            return new Date(b.created_at) - new Date(a.created_at);
        }).slice(0, 6);

        if (!recent.length) {
            list.innerHTML = '<div class="empty-state">' + t('admin.empty') + '</div>';
            return;
        }

        list.innerHTML = recent.map(function (u) {
            var roleTag = u.role === 'admin'
                ? '<span class="tag tag-admin">' + t('admin.role.admin') + '</span>'
                : '<span class="tag tag-user">' + t('admin.role.user') + '</span>';
            return (
                '<div class="list-item">' +
                '<div class="li-avatar">' + initials(u.full_name) + '</div>' +
                '<div class="li-text"><div class="title">' + escapeHtml(u.full_name || '—') + '</div>' +
                '<div class="sub">' + escapeHtml(u.email || '') + '</div></div>' +
                roleTag +
                '</div>'
            );
        }).join('');
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function roleTag(role) {
        if (role === 'admin') {
            return '<span class="tag tag-admin">' + t('admin.role.admin') + '</span>';
        }
        return '<span class="tag tag-user">' + t('admin.role.user') + '</span>';
    }

    function getFilteredUsers() {
        var q = ($('userSearch') && $('userSearch').value || '').trim().toLowerCase();
        var filter = $('roleFilter') ? $('roleFilter').value : 'all';

        return users.filter(function (u) {
            var matchSearch = !q ||
                (u.full_name && u.full_name.toLowerCase().indexOf(q) !== -1) ||
                (u.email && u.email.toLowerCase().indexOf(q) !== -1);
            var matchRole = filter === 'all' || u.role === filter;
            return matchSearch && matchRole;
        });
    }

    function renderUsersTable() {
        var tbody = $('usersTableBody');
        if (!tbody) return;

        var filtered = getFilteredUsers();

        if (!filtered.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">' + t('admin.empty') + '</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(function (u) {
            var isSelf = currentAdmin && u.id === currentAdmin.id;
            return (
                '<tr data-id="' + u.id + '">' +
                '<td class="name-cell">' + escapeHtml(u.full_name || '—') + '</td>' +
                '<td dir="ltr" style="text-align:left">' + escapeHtml(u.email || '—') + '</td>' +
                '<td>' + escapeHtml(u.phone || '—') + '</td>' +
                '<td>' + roleTag(u.role) + '</td>' +
                '<td>' + formatDate(u.created_at) + '</td>' +
                '<td><div class="actions-cell">' +
                '<select class="role-select" data-id="' + u.id + '" ' + (isSelf ? 'disabled' : '') + '>' +
                '<option value="user"' + (u.role === 'user' ? ' selected' : '') + '>' + t('admin.role.user') + '</option>' +
                '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>' + t('admin.role.admin') + '</option>' +
                '</select>' +
                '<button type="button" class="btn-assign" data-id="' + u.id + '" ' + (isSelf ? 'disabled title="' + t('admin.cantSelf') + '"' : '') + '>' +
                '<i class="fas fa-key"></i> ' + t('admin.btn.assign') + '</button>' +
                '<button type="button" class="btn-delete" data-id="' + u.id + '" ' + (isSelf ? 'disabled' : '') + '>' +
                t('admin.btn.delete') + '</button>' +
                '</div></td></tr>'
            );
        }).join('');

        tbody.querySelectorAll('.btn-assign').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-id');
                var row = btn.closest('tr');
                var sel = row ? row.querySelector('.role-select') : null;
                if (sel) assignRole(id, sel.value, btn);
            });
        });

        tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
            btn.addEventListener('click', function () {
                deleteUser(btn.getAttribute('data-id'));
            });
        });
    }

    async function loadUsers() {
        var loading = $('usersLoading');
        var wrap = $('usersTableWrap');
        if (loading) loading.style.display = 'block';
        if (wrap) wrap.style.display = 'none';

        var result = await XploreAuth.fetchAllProfiles();

        if (loading) loading.style.display = 'none';
        if (wrap) wrap.style.display = 'block';

        if (result.error) {
            toast(result.error.message || t('admin.err.load'), 'error');
            users = [];
        } else {
            users = result.data || [];
        }

        updateStats();
        renderUsersTable();
    }

    async function assignRole(userId, role, btn) {
        if (!userId || !role) return;
        if (btn) { btn.disabled = true; }

        var result = await XploreAuth.updateUserRole(userId, role);

        if (btn) { btn.disabled = false; }

        if (result.error) {
            toast(result.error.message || t('admin.err.assign'), 'error');
            return;
        }

        var u = users.find(function (x) { return x.id === userId; });
        if (u) u.role = role;

        toast(t('admin.msg.roleOk'), 'success');
        updateStats();
        renderUsersTable();
    }

    async function deleteUser(userId) {
        if (!userId) return;
        if (!confirm(t('admin.confirm.delete'))) return;

        var result = await XploreAuth.deleteProfile(userId);

        if (result.error) {
            toast(result.error.message || t('admin.err.delete'), 'error');
            return;
        }

        users = users.filter(function (u) { return u.id !== userId; });
        toast(t('admin.msg.deleted'), 'success');
        updateStats();
        renderUsersTable();
    }

    function switchPage(page) {
        document.querySelectorAll('.adm-page').forEach(function (p) {
            p.classList.toggle('active', p.id === 'page-' + page);
        });
        document.querySelectorAll('.adm-nav-link[data-page]').forEach(function (link) {
            link.classList.toggle('active', link.getAttribute('data-page') === page);
        });

        var titles = {
            overview: t('admin.page.overview'),
            users: t('admin.page.users'),
            listings: t('admin.listings.title'),
            bookings: t('admin.bookings.title'),
            stats: t('admin.stats.title')
        };
        $('pageTitle').textContent = titles[page] || titles.overview;
        $('pageSubtitle').textContent = formatToday();

        if (page === 'users') loadUsers();
        if (page === 'listings') loadListingsAdmin();
        if (page === 'bookings') loadBookingsAdmin();
        if (page === 'stats') loadStatsAdmin();

        var sidebar = document.querySelector('.adm-sidebar');
        if (sidebar) sidebar.classList.remove('open');
    }

    function refreshListingTypeSelect() {
        var sel = $('lstType');
        if (!sel) return;
        var v = sel.value || 'event';
        sel.innerHTML =
            '<option value="event">' + escapeHtml(t('admin.lst.typeEvent')) + '</option>' +
            '<option value="restaurant">' + escapeHtml(t('admin.lst.typeRestaurant')) + '</option>' +
            '<option value="sport">' + escapeHtml(t('admin.lst.typeSport')) + '</option>';
        sel.value = v;
    }

    function listingTypeLabel(type) {
        if (type === 'event') return t('admin.lst.typeEvent');
        if (type === 'restaurant') return t('admin.lst.typeRestaurant');
        if (type === 'sport') return t('admin.lst.typeSport');
        return type || '—';
    }

    function localFolderForListingType(type) {
        if (type === 'restaurant') return 'cofee pages';
        if (type === 'sport') return 'sport';
        return 'event';
    }

    function resolveListingPreviewUrl(path) {
        if (!path) return 'img/LOGO.png';
        if (/^https?:\/\//i.test(path)) return path;
        if (typeof XplorePlatform !== 'undefined' && XplorePlatform.encodeLocalImagePath) {
            return XplorePlatform.encodeLocalImagePath(path);
        }
        return path;
    }

    function setListingPreview(path) {
        var img = $('lstPreview');
        var wrap = img && img.parentElement;
        var empty = $('lstPreviewEmpty');
        if (!img || !wrap) return;
        var src = resolveListingPreviewUrl(path);
        img.src = src;
        img.onerror = function () {
            img.src = 'img/LOGO.png';
            wrap.classList.remove('has-image');
        };
        img.onload = function () {
            if (path) wrap.classList.add('has-image');
            else wrap.classList.remove('has-image');
        };
        if (path) {
            wrap.classList.add('has-image');
            if (empty) empty.style.display = 'none';
        } else {
            wrap.classList.remove('has-image');
            if (empty) empty.style.display = '';
        }
    }

    function updateListingFormHeader() {
        var id = $('lstId') && $('lstId').value.trim();
        var titleEl = $('lstFormTitle');
        var hintEl = $('lstFormHint');
        if (titleEl) {
            titleEl.textContent = id ? t('admin.lst.formEdit') : t('admin.lst.formNew');
        }
        if (hintEl) {
            hintEl.textContent = id ? t('admin.listings.loaded') : t('admin.lst.formHint');
        }
    }

    function fillListingForm(L) {
        $('lstId').value = L.id;
        $('lstType').value = L.listing_type || 'event';
        $('lstTitle').value = L.title || '';
        $('lstSlug').value = L.slug || '';
        $('lstPrice').value = L.price_sar != null ? L.price_sar : '';
        $('lstStock').value = L.stock != null ? L.stock : '';
        $('lstCategory').value = L.category || '';
        $('lstVenue').value = L.venue || '';
        $('lstImage').value = L.image_url || '';
        $('lstDesc').value = L.description || '';
        $('lstPub').checked = !!L.is_published;
        var fileIn = $('lstFile');
        if (fileIn) fileIn.value = '';
        setListingPreview(L.image_url || '');
        updateListingFormHeader();
        var panel = document.querySelector('.lst-panel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    async function uploadListingImageFile(file) {
        if (!file) {
            toast(t('admin.lst.imagePickFirst'), 'error');
            return;
        }
        var pickBtn = $('lstPickImage');
        if (pickBtn) pickBtn.disabled = true;

        setListingPreview(URL.createObjectURL(file));

        var up = await XplorePlatform.uploadListingImage(file);

        if (pickBtn) pickBtn.disabled = false;

        if (!up.error && up.data && up.data.publicUrl) {
            $('lstImage').value = up.data.publicUrl;
            setListingPreview(up.data.publicUrl);
            toast(t('admin.lst.imageOk'), 'success');
            return;
        }

        var folder = localFolderForListingType($('lstType').value);
        var safeName = file.name.replace(/[^\w.\-]+/g, '_');
        var localPath = folder + '/' + safeName;
        $('lstImage').value = localPath;
        setListingPreview(localPath);
        toast(t('admin.lst.imageLocal'), 'success');
    }

    async function loadListingsAdmin() {
        var r = await XplorePlatform.adminFetchAllListings();
        var tb = $('listingsTableBody');
        if (!tb) return;
        if (r.error) {
            tb.innerHTML = '<tr><td colspan="7">' + escapeHtml(r.error.message) + '</td></tr>';
            return;
        }
        listingsCache = r.data || [];
        if (!listingsCache.length) {
            tb.innerHTML = '<tr><td colspan="7" class="empty-state">' + escapeHtml(t('admin.empty')) + '</td></tr>';
            return;
        }
        tb.innerHTML = listingsCache.map(function (L) {
            var thumb = L.image_url
                ? '<img class="lst-thumb" src="' + escapeHtml(resolveListingPreviewUrl(L.image_url)) + '" alt="">'
                : '<span class="xp-meta">—</span>';
            return (
                '<tr data-lid="' + L.id + '">' +
                '<td>' + thumb + '</td>' +
                '<td><span class="lst-type-tag">' + escapeHtml(listingTypeLabel(L.listing_type)) + '</span></td>' +
                '<td class="name-cell">' + escapeHtml(L.title) + '</td>' +
                '<td>' + Number(L.price_sar).toFixed(0) + ' <small>SAR</small></td>' +
                '<td>' + L.stock + '</td>' +
                '<td>' + (L.is_published ? '✓' : '—') + '</td>' +
                '<td><div class="actions-cell">' +
                '<button type="button" class="btn-assign lst-edit"><i class="fas fa-pen"></i> ' + escapeHtml(t('admin.listings.edit')) + '</button> ' +
                '<button type="button" class="btn-delete lst-del"><i class="fas fa-trash"></i> ' + escapeHtml(t('admin.listings.del')) + '</button>' +
                '</div></td></tr>'
            );
        }).join('');

        tb.querySelectorAll('.lst-edit').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tr = btn.closest('tr');
                var id = tr.getAttribute('data-lid');
                var L = listingsCache.find(function (x) { return x.id === id; });
                if (!L) return;
                fillListingForm(L);
                toast(t('admin.listings.loaded'), 'success');
            });
        });
        tb.querySelectorAll('.lst-del').forEach(function (btn) {
            btn.addEventListener('click', async function () {
                var tr = btn.closest('tr');
                var id = tr.getAttribute('data-lid');
                if (!confirm(t('admin.listings.confirmDel'))) return;
                var d = await XplorePlatform.adminDeleteListing(id);
                if (d.error) toast(d.error.message, 'error');
                else {
                    toast(t('admin.listings.deleted'), 'success');
                    if ($('lstId').value === id) clearListingForm();
                    loadListingsAdmin();
                }
            });
        });
    }

    function bookingStatusLabel(status) {
        if (status === 'confirmed') return t('bookings.statusOk');
        if (status === 'cancelled') return t('bookings.statusCancelled');
        return status || '—';
    }

    async function adminCancelBooking(bookingId, status, btn) {
        if (!bookingId) return;
        var msg = status === 'cancelled'
            ? t('admin.bookings.confirmRemove')
            : t('bookings.confirmCancel');
        if (!confirm(msg)) return;
        if (btn) btn.disabled = true;

        var r = await XplorePlatform.cancelBooking(bookingId);

        if (btn) btn.disabled = false;

        if (r.error) {
            toast(r.error.message || t('platform.err'), 'error');
            return;
        }
        var d = r.data;
        if (!d || !d.ok) {
            toast((d && d.error) || t('platform.err'), 'error');
            return;
        }

        toast(d.removed ? t('admin.bookings.removed') : t('bookings.cancelled'), 'success');
        loadBookingsAdmin();
        if ($('page-stats') && $('page-stats').classList.contains('active')) {
            loadStatsAdmin();
        }
    }

    async function loadBookingsAdmin() {
        var r = await XplorePlatform.adminAllBookingsSimple();
        var tb = $('bookingsTableBody');
        if (!tb) return;
        if (r.error) {
            tb.innerHTML = '<tr><td colspan="7">' + escapeHtml(r.error.message) + '</td></tr>';
            return;
        }
        var rows = r.data || [];
        if (!rows.length) {
            tb.innerHTML = '<tr><td colspan="7" class="empty-state">' + t('bookings.empty') + '</td></tr>';
            return;
        }
        tb.innerHTML = rows.map(function (b) {
            var title = (b.listings && b.listings.title) ? b.listings.title : '—';
            var btnLabel = b.status === 'cancelled'
                ? t('admin.bookings.remove')
                : t('bookings.cancel');
            var cancelBtn =
                '<button type="button" class="btn-delete bk-admin-cancel" data-id="' + b.id + '" data-status="' + escapeHtml(b.status || '') + '">' +
                '<i class="fas fa-ban"></i> ' + escapeHtml(btnLabel) + '</button>';
            return (
                '<tr data-bid="' + b.id + '">' +
                '<td>' + formatDate(b.created_at) + '</td>' +
                '<td>' + escapeHtml(title) + '</td>' +
                '<td>' + b.qty + '</td>' +
                '<td>' + Number(b.total_price).toFixed(2) + '</td>' +
                '<td>' + escapeHtml(bookingStatusLabel(b.status)) + '</td>' +
                '<td dir="ltr" style="text-align:left;font-size:.8rem">' + escapeHtml((b.user_id || '').slice(0, 8)) + '…</td>' +
                '<td><div class="actions-cell">' + cancelBtn + '</div></td></tr>'
            );
        }).join('');

        tb.querySelectorAll('.bk-admin-cancel').forEach(function (btn) {
            btn.addEventListener('click', function () {
                adminCancelBooking(btn.getAttribute('data-id'), btn.getAttribute('data-status'), btn);
            });
        });
    }

    async function loadStatsAdmin() {
        var r = await XplorePlatform.adminAllBookingsSimple();
        var rev = 0;
        var n = 0;
        var byL = {};
        (r.data || []).forEach(function (b) {
            if (b.status !== 'confirmed') return;
            n++;
            rev += Number(b.total_price) || 0;
            var lid = b.listing_id;
            byL[lid] = (byL[lid] || 0) + (b.qty || 0);
        });
        $('stRevenue').textContent = rev.toFixed(2) + ' SAR';
        $('stBookings').textContent = String(n);

        var top = Object.keys(byL).sort(function (a, b) { return byL[b] - byL[a]; }).slice(0, 8);
        var lr = await XplorePlatform.adminFetchAllListings();
        var map = {};
        (lr.data || []).forEach(function (L) { map[L.id] = L.title; });
        var list = $('stTopList');
        if (!list) return;
        if (!top.length) {
            list.innerHTML = '<div class="empty-state">—</div>';
            return;
        }
        list.innerHTML = top.map(function (id) {
            return '<div class="list-item"><div class="li-text"><div class="title">' + escapeHtml(map[id] || id) + '</div><div class="sub">Qty: ' + byL[id] + '</div></div></div>';
        }).join('');
    }

    function clearListingForm() {
        $('lstId').value = '';
        $('lstType').value = 'event';
        $('lstTitle').value = '';
        $('lstSlug').value = '';
        $('lstPrice').value = '';
        $('lstStock').value = '100';
        $('lstCategory').value = '';
        $('lstVenue').value = '';
        $('lstImage').value = '';
        $('lstDesc').value = '';
        $('lstPub').checked = true;
        var fileIn = $('lstFile');
        if (fileIn) fileIn.value = '';
        setListingPreview('');
        updateListingFormHeader();
    }

    function bindEvents() {
        document.querySelectorAll('.adm-nav-link[data-page]').forEach(function (link) {
            link.addEventListener('click', function () {
                switchPage(link.getAttribute('data-page'));
            });
        });

        var search = $('userSearch');
        var filter = $('roleFilter');
        if (search) search.addEventListener('input', renderUsersTable);
        if (filter) filter.addEventListener('change', renderUsersTable);

        var menuBtn = $('menuToggle');
        if (menuBtn) {
            menuBtn.addEventListener('click', function () {
                document.querySelector('.adm-sidebar').classList.toggle('open');
            });
        }

        var logout = $('admLogout');
        if (logout) {
            logout.addEventListener('click', function () {
                XploreAuth.signOut();
            });
        }

        refreshListingTypeSelect();
        document.addEventListener('xplore:langchange', function () {
            refreshListingTypeSelect();
            updateListingFormHeader();
        });

        var lstImageInput = $('lstImage');
        if (lstImageInput) {
            lstImageInput.addEventListener('input', function () {
                setListingPreview(lstImageInput.value.trim());
            });
        }

        var lstPick = $('lstPickImage');
        var lstFile = $('lstFile');
        if (lstPick && lstFile) {
            lstPick.addEventListener('click', function () { lstFile.click(); });
            lstFile.addEventListener('change', function () {
                var f = lstFile.files && lstFile.files[0];
                if (f) uploadListingImageFile(f);
            });
        }

        var lstSave = $('lstSave');
        if (lstSave) {
            lstSave.addEventListener('click', async function () {
                var title = $('lstTitle').value.trim();
                if (!title) {
                    toast(t('admin.lst.errTitle'), 'error');
                    $('lstTitle').focus();
                    return;
                }
                var id = $('lstId').value.trim();
                var slug = $('lstSlug').value.trim();
                if (!slug) {
                    slug = title.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/gi, '-').replace(/^-|-$/g, '') + '-' + Date.now();
                }
                lstSave.disabled = true;
                var row = {
                    listing_type: $('lstType').value,
                    title: title,
                    slug: slug,
                    description: $('lstDesc').value.trim() || null,
                    image_url: $('lstImage').value.trim() || null,
                    price_sar: parseFloat($('lstPrice').value) || 0,
                    stock: parseInt($('lstStock').value, 10) || 0,
                    category: $('lstCategory').value.trim() || null,
                    venue: $('lstVenue').value.trim() || null,
                    is_published: $('lstPub').checked
                };
                if (id) row.id = id;
                var r = await XplorePlatform.adminUpsertListing(row);
                lstSave.disabled = false;
                if (r.error) toast(r.error.message, 'error');
                else {
                    toast(t('profile.saved'), 'success');
                    if (r.data && r.data.id) $('lstId').value = r.data.id;
                    updateListingFormHeader();
                    loadListingsAdmin();
                }
            });
        }
        var lstNew = $('lstNew');
        if (lstNew) lstNew.addEventListener('click', clearListingForm);
    }

    async function init() {
        if (typeof XploreLang !== 'undefined') XploreLang.init();

        $('pageSubtitle').textContent = formatToday();

        var sessionRes = await XploreAuth.client().auth.getSession();
        var session = sessionRes.data && sessionRes.data.session;

        if (!session) {
            window.location.href = 'login.html?redirect=admin.html';
            return;
        }

        var profileRes = await XploreAuth.getProfile(session.user.id);

        if (profileRes.error || !profileRes.data) {
            await XploreAuth.upsertProfile({
                id: session.user.id,
                full_name: (session.user.user_metadata || {}).full_name || session.user.email,
                email: session.user.email,
                role: 'user'
            });
            profileRes = await XploreAuth.getProfile(session.user.id);
        }

        if (!profileRes.data || profileRes.data.role !== 'admin') {
            showDenied();
            return;
        }

        currentAdmin = profileRes.data;
        showApp();
        setAdminUI(profileRes.data, session.user);
        bindEvents();
        refreshListingTypeSelect();
        setListingPreview('');
        updateListingFormHeader();
        switchPage('overview');

        var overviewRes = await XploreAuth.fetchAllProfiles();
        if (!overviewRes.error) {
            users = overviewRes.data || [];
            updateStats();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
