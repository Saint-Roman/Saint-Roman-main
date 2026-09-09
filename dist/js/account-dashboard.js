document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    var profile = await ElloraAuth.apiFetch('/profile');
    if (!profile) return;

    var name = profile.display_name || profile.first_name || profile.email;

    // Target: .account-dashboard-detail-box
    var box = document.querySelector('.account-dashboard-detail-box');
    if (box) {
        var titleEl = box.querySelector('.account-dashboard-detail-title');
        if (titleEl) {
            titleEl.innerHTML = 'Hello <b>' + name + '</b> ( not ' + name + '? <a href="#" id="dash-logout">Log out</a> )';
        }
        var descEl = box.querySelector('.account-dashboard-detail-desc') || box.querySelector('p:nth-child(2)');
        if (descEl) {
            descEl.innerHTML = 'From your account dashboard you can view your <a href="account-order.html">recent orders</a>, manage your <a href="account-addresses.html">shipping and billing addresses</a>, and <a href="account-details.html">edit your password and account details</a>.';
        }
    }

    // Wire logout
    var logoutBtn = document.getElementById('dash-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', function (e) { e.preventDefault(); ElloraAuth.logout(); });

    // Wire sidebar Logout link
    document.querySelectorAll('.my-account-sidebar-item a').forEach(function (a) {
        if (a.textContent.trim().toLowerCase() === 'logout') {
            a.addEventListener('click', function (e) { e.preventDefault(); ElloraAuth.logout(); });
        }
    });
});
