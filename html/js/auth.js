// Ellora storefront auth — defines window.ElloraAuth.
// Loaded on every account page (after the supabase-js CDN script, before the page's own
// account-*.js), which already calls ElloraAuth.getSession() / requireLogin() / login() /
// register() / logout() / apiFetch(). This file was previously empty, which is why every
// account page threw "ElloraAuth is not defined" and none of the dynamic logic ever ran.

var ElloraAuth = (function () {
    var SUPABASE_URL = 'https://gxbebydzhrmjvnkyryub.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YmVieWR6aHJtanZua3lyeXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzIyNzgsImV4cCI6MjEwMDEwODI3OH0.vKT-2syR9-2ZKU9z5HnA74vbvfWa657-Re4434Gb1jE';
    var API_BASE = 'https://saint-roman-main.onrender.com/api/customer';

    var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Returns the current session (or null), no redirect. Used by login.html to check
    // "already logged in?" before showing the form.
    async function getSession() {
        var result = await client.auth.getSession();
        return (result.data && result.data.session) || null;
    }

    // Same as getSession(), but redirects to login.html and returns null if there's no session.
    // Used at the top of every protected account page.
    async function requireLogin() {
        var session = await getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session;
    }

    async function login(email, password) {
        var result = await client.auth.signInWithPassword({ email: email, password: password });
        if (result.error) return { error: result.error.message };
        return { session: result.data.session };
    }

    // Tags the signup as a storefront customer (account_type: 'customer') so the
    // handle_new_user() DB trigger creates a `customers` row instead of an admin `profiles` row.
    async function register(email, password, firstName, lastName) {
        var result = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    account_type: 'customer',
                    first_name: firstName || '',
                    last_name: lastName || '',
                }
            }
        });
        if (result.error) return { error: result.error.message };
        // If email confirmations are off, Supabase returns a session immediately and the
        // caller logs the user straight in. If confirmations are required, session is null
        // and the caller shows a "check your email" message instead.
        if (result.data.session) return { session: result.data.session };
        return {};
    }

    async function logout() {
        await client.auth.signOut();
        window.location.href = 'login.html';
    }

    // Attaches the bearer token and calls API_BASE + path. Returns the parsed JSON body on
    // success or on a handled error (so callers can read .error), or null if the session is
    // missing/invalid (and redirects to login.html) or the request fails outright.
    async function apiFetch(path, options) {
        var session = await getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }

        options = options || {};
        var headers = Object.assign(
            {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + session.access_token,
            },
            options.headers || {}
        );

        var res;
        try {
            res = await fetch(API_BASE + path, Object.assign({}, options, { headers: headers }));
        } catch (e) {
            return null; // network error
        }

        if (res.status === 401) {
            // Session expired/invalid server-side — send back to login rather than
            // silently failing.
            window.location.href = 'login.html';
            return null;
        }

        var json;
        try {
            json = await res.json();
        } catch (e) {
            json = null;
        }

        return json;
    }

    return {
        getSession: getSession,
        requireLogin: requireLogin,
        login: login,
        register: register,
        logout: logout,
        apiFetch: apiFetch,
        // Exposed for html/js/ellora-cart.js's background cart sync, which deliberately does a
        // raw fetch instead of apiFetch() — apiFetch redirects to login.html on a missing/expired
        // session, which is exactly wrong for a silent best-effort sync that should never
        // interrupt someone browsing.
        apiBase: API_BASE,
    };
})();
