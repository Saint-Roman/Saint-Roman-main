document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    var json = await ElloraAuth.apiFetch('/addresses');
    if (!json) return;

    // Target: works with both class names used across pages
    var box = document.querySelector('.account-addresses-content-box') ||
        document.querySelector('.account-address-content-box');
    if (!box) return;

    renderAddresses();

    function renderAddresses() {
        box.innerHTML =
            '<!-- Account Addresses Content Header Start -->' +
            '<div class="account-address-content-header wow fadeInUp">' +
            '<p>The following addresses will be used on the checkout page by default.</p>' +
            '</div>' +
            '<!-- Account Addresses Content Header End -->' +
            '<div class="account-address-item-list">' +
            renderCard('Billing', 'billing', json.billing) +
            renderCard('Shipping', 'shipping', json.shipping) +
            '</div>' +
            '<div id="addr-form-wrap" style="display:none;margin-top:30px;padding:24px;border:1px solid #e7e9ed;border-radius:8px;background:#fafafa">' +
            buildForm() +
            '</div>';

        box.querySelectorAll('.addr-edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) { e.preventDefault(); openForm(btn.dataset.type); });
        });
    }

    function renderCard(label, type, addr) {
        var infoHtml = '';
        if (addr) {
            infoHtml =
                '<ul>' +
                '<li>' + (addr.full_name || '') + '</li>' +
                '<li>' + [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code].filter(Boolean).join(', ') + '</li>' +
                (addr.phone ? '<li>Phone: ' + addr.phone + '</li>' : '') +
                '</ul>';
        } else {
            infoHtml = '<p style="color:#888">No ' + label.toLowerCase() + ' address saved yet.</p>';
        }

        return '<!-- Account Addresses Item Start -->' +
            '<div class="account-address-item wow fadeInUp">' +
            '<div class="account-address-item-title">' +
            '<h2>' + label + ' address</h2>' +
            '<p><a href="#" class="addr-edit-btn" data-type="' + type + '">Edit Address <img src="images/icon-pen.svg" alt=""></a></p>' +
            '</div>' +
            '<div class="account-address-item-info-list">' +
            infoHtml +
            '</div>' +
            '</div>' +
            '<!-- Account Addresses Item End -->';
    }

    function buildForm() {
        var fields = [
            'full_name:Full Name',
            'phone:Phone',
            'address_line1:Address Line 1',
            'address_line2:Address Line 2 (optional)',
            'city:City',
            'state:State',
            'postal_code:PIN Code',
            'country:Country'
        ];

        var html = '<div class="checkout-bill-address-title"><h3 id="addr-form-title">Edit address</h3></div>' +
            '<form id="addr-form">' +
            '<input type="hidden" id="addr-type" value="">' +
            '<div class="checkout-bill-address-form"><div class="row">';

        fields.forEach(function (f) {
            var p = f.split(':');
            var colClass = (p[0] === 'full_name' || p[0] === 'phone') ? 'col-md-6' : 'col-lg-12';
            html += '<div class="form-group ' + colClass + '">' +
                '<label>' + p[1] + '</label>' +
                '<input type="text" id="addr-' + p[0] + '" class="form-control" placeholder="Enter ' + p[1].toLowerCase() + '">' +
                '</div>';
        });

        html += '</div></div>' +
            '<div class="checkout-login-btn" style="margin-top:16px">' +
            '<button type="submit" class="btn-default">Save Address</button>' +
            '<button type="button" class="btn-default addr-cancel-btn" style="margin-left:12px;background:transparent;color:#252930;border:1px solid #e7e9ed">Cancel</button>' +
            '<span id="addr-msg" style="display:block;margin-top:10px;font-size:14px;"></span>' +
            '</div></form>';

        return html;
    }

    function openForm(type) {
        var wrap = document.getElementById('addr-form-wrap');
        wrap.style.display = 'block';

        document.getElementById('addr-form-title').textContent =
            'Edit ' + (type === 'billing' ? 'Billing' : 'Shipping') + ' Address';
        document.getElementById('addr-type').value = type;

        // Pre-fill with existing data
        var addr = type === 'billing' ? json.billing : json.shipping;
        var fillFields = ['full_name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country'];
        fillFields.forEach(function (f) {
            var el = document.getElementById('addr-' + f);
            if (el) el.value = (addr && addr[f]) ? addr[f] : (f === 'country' ? 'India' : '');
        });

        wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Wire cancel
        wrap.querySelector('.addr-cancel-btn').onclick = function () {
            wrap.style.display = 'none';
        };

        // Wire submit
        document.getElementById('addr-form').onsubmit = async function (e) {
            e.preventDefault();
            var msg = document.getElementById('addr-msg');
            msg.textContent = 'Saving...';
            msg.style.color = '#888';

            var payload = { type: type };
            fillFields.forEach(function (f) {
                payload[f] = document.getElementById('addr-' + f).value;
            });

            var result = await ElloraAuth.apiFetch('/addresses', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            if (result && result.success) {
                msg.textContent = '✓ Address saved';
                msg.style.color = '#28b76b';
                // Update local data and re-render
                json[type] = payload;
                setTimeout(function () {
                    wrap.style.display = 'none';
                    renderAddresses();
                }, 800);
            } else {
                msg.textContent = '✕ ' + (result && result.error ? result.error : 'Failed to save');
                msg.style.color = '#d26d69';
            }
        };
    }

    // ── Wire sidebar Logout link ──
    document.querySelectorAll('.my-account-sidebar-item a').forEach(function (a) {
        if (a.textContent.trim().toLowerCase() === 'logout') {
            a.addEventListener('click', function (e) { e.preventDefault(); ElloraAuth.logout(); });
        }
    });
});
