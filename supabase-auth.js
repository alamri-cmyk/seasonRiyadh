/* ================================================================
   supabase-auth.js  –  Xplore Riyadh  |  Auth & Nav module
   Requires: @supabase/supabase-js v2 loaded before this file
   ================================================================ */
(function () {
    'use strict';

    var SUPABASE_URL  = 'https://uwtpjimmornuggxyjqqy.supabase.co';
    var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dHBqaW1tb3JudWdneHlqcXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODY3NTQsImV4cCI6MjA5Mzk2Mjc1NH0.zCWt8V4x2dLhaS_2NNEU6owVnlPI8jaNgZXjkv9RjTg';

    /* ── Lazy singleton client ───────────────────────────────── */
    var _client = null;

    function client() {
        if (!_client) {
            if (window.supabase && window.supabase.createClient) {
                _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
                    auth: { persistSession: true, autoRefreshToken: true }
                });
            }
        }
        return _client;
    }

    /* ── Small DOM helper ────────────────────────────────────── */
    function setEl(id, prop, val) {
        var n = document.getElementById(id);
        if (n) n[prop] = val;
    }

    /* ── Build initials from a full name ─────────────────────── */
    function initials(name) {
        if (!name) return '?';
        var parts = name.trim().split(/\s+/);
        return parts.map(function (w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || '?';
    }

    /* ── صورة شخصية صالحة (رابط http/https فقط) ─────────────── */
    function validAvatarUrl(url) {
        if (!url) return false;
        return /^https?:\/\//i.test(String(url).trim());
    }

    function setNavAvatarDisplay(avatarUrl, name) {
        var circle = document.getElementById('avatarInitials');
        if (!circle) return;
        var wrap = circle.parentElement;
        var img = document.getElementById('navAvatarPhoto');
        var displayName = name || 'User';

        if (validAvatarUrl(avatarUrl)) {
            if (!img) {
                img = document.createElement('img');
                img.id = 'navAvatarPhoto';
                img.className = 'nav-avatar-photo';
                img.alt = '';
                wrap.insertBefore(img, circle);
            }
            img.src = avatarUrlWithCache(avatarUrl);
            img.onerror = function () {
                img.removeAttribute('src');
                img.style.display = 'none';
                circle.style.display = 'flex';
                circle.textContent = initials(displayName);
            };
            img.onload = function () {
                img.style.display = 'block';
                circle.style.display = 'none';
            };
        } else {
            if (img) {
                img.removeAttribute('src');
                img.remove();
            }
            circle.style.display = 'flex';
            circle.textContent = initials(displayName);
        }
    }

    function avatarUrlWithCache(url) {
        if (!validAvatarUrl(url)) return '';
        var u = String(url).trim();
        return u + (u.indexOf('?') >= 0 ? '&' : '?') + 't=' + Date.now();
    }

    /* ── Update nav for logged-in / logged-out state ─────────── */
    function updateNav(user) {
        var loginBtn  = document.getElementById('navLogin');
        var signupBtn = document.getElementById('navSignup');
        var userMenu  = document.getElementById('userMenu');

        if (user) {
            /* hide guest buttons */
            if (loginBtn)  loginBtn.style.display  = 'none';
            if (signupBtn) signupBtn.style.display = 'none';

            /* show user menu */
            if (userMenu) {
                var meta  = user.user_metadata || {};
                var name  = meta.full_name || user.email || 'User';
                var first = name.trim().split(/\s+/)[0];

                userMenu.classList.add('visible');
                setEl('navUserName',    'textContent', first);
                setEl('dropName',       'textContent', name);
                setEl('dropEmail',      'textContent', user.email || '');
                setNavAvatarDisplay(null, name);

                getProfile(user.id).then(function (pr) {
                    var p = pr.data || {};
                    var full = p.full_name || name;
                    var firstName = full.trim().split(/\s+/)[0];
                    setEl('navUserName', 'textContent', firstName);
                    setEl('dropName', 'textContent', full);
                    setNavAvatarDisplay(p.avatar_url, full);

                    var adminItem = document.getElementById('navAdminItem');
                    if (adminItem) {
                        adminItem.style.display = (p.role === 'admin') ? '' : 'none';
                    }
                });
            }
        } else {
            /* show guest buttons */
            if (loginBtn)  loginBtn.style.display  = '';
            if (signupBtn) signupBtn.style.display = '';

            var adminItemOut = document.getElementById('navAdminItem');
            if (adminItemOut) adminItemOut.style.display = 'none';

            var navImg = document.getElementById('navAvatarPhoto');
            if (navImg) navImg.remove();
            var circleOut = document.getElementById('avatarInitials');
            if (circleOut) circleOut.style.display = 'flex';

            /* hide user menu */
            if (userMenu) {
                userMenu.classList.remove('visible');
                userMenu.classList.remove('open');
            }
        }
    }

    /* ── Bind dropdown toggle & logout ──────────────────────── */
    function bindNavEvents() {
        var avatarBtn = document.getElementById('userAvatarBtn');
        var userMenu  = document.getElementById('userMenu');
        var logoutBtn = document.getElementById('logoutBtn');

        if (avatarBtn && userMenu) {
            avatarBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                userMenu.classList.toggle('open');
            });
            userMenu.addEventListener('click', function (e) {
                e.stopPropagation();
            });
            document.addEventListener('click', function () {
                userMenu.classList.remove('open');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                var c = client();
                if (c) {
                    c.auth.signOut().then(function () {
                        window.location.href = 'index.html';
                    }).catch(function () {
                        window.location.href = 'index.html';
                    });
                } else {
                    window.location.href = 'index.html';
                }
            });
        }
    }

    /* ── Initialize nav on every page ───────────────────────── */
    function initNav() {
        var c = client();
        if (!c) return;

        bindNavEvents();

        /* read current session */
        c.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            updateNav(session ? session.user : null);
        });

        /* react to auth state changes (login / logout across tabs) */
        c.auth.onAuthStateChange(function (event, session) {
            updateNav(session ? session.user : null);
        });
    }

    /* ── Sign in (email + password) ─────────────────────────── */
    function signIn(email, password) {
        var c = client();
        if (!c) return Promise.reject(new Error('Supabase not initialised'));
        return c.auth.signInWithPassword({ email: email, password: password });
    }

    /* ── Sign up (email + password + full name) ─────────────── */
    function signUp(email, password, fullName) {
        var c = client();
        if (!c) return Promise.reject(new Error('Supabase not initialised'));
        return c.auth.signUp({
            email: email,
            password: password,
            options: { data: { full_name: fullName } }
        });
    }

    /* ── Sign out ────────────────────────────────────────────── */
    function signOut() {
        var c = client();
        var go = function () { window.location.href = 'index.html'; };
        if (c) { c.auth.signOut().then(go).catch(go); } else { go(); }
    }

    /* ── Redirect to home if already logged in ───────────────── */
    function redirectIfLoggedIn(dest) {
        var c = client();
        if (!c) return;
        c.auth.getSession().then(function (res) {
            if (res.data && res.data.session) {
                window.location.replace(dest || 'index.html');
            }
        });
    }

    /* ── Profiles (admin + user management) ──────────────────── */
    function getProfile(userId) {
        var c = client();
        if (!c) return Promise.resolve({ data: null, error: new Error('Supabase not initialised') });
        return c.from('profiles').select('*').eq('id', userId).maybeSingle();
    }

    function upsertProfile(row) {
        var c = client();
        if (!c) return Promise.resolve({ data: null, error: new Error('Supabase not initialised') });
        return getProfile(row.id).then(function (existing) {
            if (existing.data) {
                return c.from('profiles').update({
                    full_name: row.full_name || existing.data.full_name,
                    email:     row.email || existing.data.email,
                    phone:     row.phone !== undefined ? row.phone : existing.data.phone,
                    avatar_url: row.avatar_url !== undefined ? row.avatar_url : existing.data.avatar_url
                }).eq('id', row.id);
            }
            return c.from('profiles').insert({
                id:        row.id,
                full_name: row.full_name,
                email:     row.email,
                phone:     row.phone || null,
                avatar_url: row.avatar_url || null,
                role:      row.role || 'user'
            });
        });
    }

    function fetchAllProfiles() {
        var c = client();
        if (!c) return Promise.resolve({ data: [], error: new Error('Supabase not initialised') });
        return c.from('profiles').select('*').order('created_at', { ascending: false });
    }

    function updateUserRole(userId, role) {
        var c = client();
        if (!c) return Promise.resolve({ data: null, error: new Error('Supabase not initialised') });
        return c.from('profiles').update({ role: role }).eq('id', userId).select().single();
    }

    function deleteProfile(userId) {
        var c = client();
        if (!c) return Promise.resolve({ data: null, error: new Error('Supabase not initialised') });
        return c.from('profiles').delete().eq('id', userId);
    }

    function isAdmin() {
        var c = client();
        if (!c) return Promise.resolve(false);
        return c.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) return false;
            return getProfile(session.user.id).then(function (p) {
                return p.data && p.data.role === 'admin';
            });
        });
    }

    /* ── بعد تسجيل الدخول: إذا كان مشرفاً → admin.html (ما لم يُحدد redirect آخر) ── */
    function resolvePostLoginUrl(userId, explicitRedirect) {
        var r = explicitRedirect != null ? String(explicitRedirect).trim() : '';
        if (r && /^[a-z0-9_.-]+\.html$/i.test(r)) {
            return Promise.resolve(r);
        }
        return getProfile(userId).then(function (res) {
            if (res.data && res.data.role === 'admin') {
                return 'admin.html';
            }
            return 'index.html';
        });
    }

    /* ── Public API ──────────────────────────────────────────── */
    function refreshNav() {
        var c = client();
        if (!c) return Promise.resolve();
        return c.auth.getSession().then(function (res) {
            updateNav(res.data && res.data.session ? res.data.session.user : null);
        });
    }

    /** حفظ أو حذف صورة الملف (null = إزالة نهائية من القاعدة والهيدر) */
    function saveProfileAvatar(avatarUrl) {
        var c = client();
        if (!c) return Promise.resolve({ error: new Error('Supabase not initialised') });

        return c.auth.getSession().then(function (res) {
            var session = res.data && res.data.session;
            if (!session) return { error: new Error('not_authenticated') };

            var u = session.user;
            var url = validAvatarUrl(avatarUrl) ? String(avatarUrl).trim() : null;

            return getProfile(u.id).then(function (pr) {
                var p = pr.data || {};
                var row = {
                    id: u.id,
                    full_name: p.full_name || (u.user_metadata && u.user_metadata.full_name) || u.email,
                    email: u.email,
                    phone: p.phone || null,
                    avatar_url: url
                };

                return upsertProfile(row).then(function (upRes) {
                    if (upRes.error) return { error: upRes.error };

                    var meta = Object.assign({}, u.user_metadata || {});
                    delete meta.avatar_url;
                    delete meta.picture;
                    delete meta.avatar;
                    if (url) meta.avatar_url = url;

                    return c.auth.updateUser({ data: meta }).then(function (authRes) {
                        if (authRes.error) return { error: authRes.error };
                        setNavAvatarDisplay(url, row.full_name);
                        return refreshNav().then(function () {
                            return { data: { avatar_url: url }, error: null };
                        });
                    });
                });
            });
        });
    }

    window.XploreAuth = {
        client:              client,
        initNav:             initNav,
        refreshNav:          refreshNav,
        saveProfileAvatar:   saveProfileAvatar,
        validAvatarUrl:      validAvatarUrl,
        avatarUrlWithCache:  avatarUrlWithCache,
        initials:            initials,
        signIn:              signIn,
        signUp:              signUp,
        signOut:             signOut,
        redirectIfLoggedIn:  redirectIfLoggedIn,
        resolvePostLoginUrl: resolvePostLoginUrl,
        getProfile:          getProfile,
        upsertProfile:       upsertProfile,
        fetchAllProfiles:    fetchAllProfiles,
        updateUserRole:      updateUserRole,
        deleteProfile:       deleteProfile,
        isAdmin:             isAdmin
    };

    /* ── Auto-init nav when DOM is ready ─────────────────────── */
    if (document.readyState !== 'loading') {
        initNav();
    } else {
        document.addEventListener('DOMContentLoaded', initNav);
    }

})();
