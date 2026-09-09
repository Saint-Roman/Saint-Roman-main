document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    var profile = await ElloraAuth.apiFetch('/profile');
    if (!profile) return;

    // ── Populate existing form fields (keep Ellora's styled markup intact) ──
    var fnameEl = document.getElementById('fname');
    var lnameEl = document.getElementById('lname');
    var dnameEl = document.getElementById('dname');
    var emailEl = document.getElementById('email');

    if (fnameEl) fnameEl.value = profile.first_name || '';
    if (lnameEl) lnameEl.value = profile.last_name || '';
    if (dnameEl) dnameEl.value = profile.display_name || '';
    if (emailEl) {
        emailEl.value = profile.email || '';
        emailEl.readOnly = true;
        emailEl.style.background = '#f5f6f8';
    }

    // ── Add Phone field if not already present ──
    var phoneEl = document.getElementById('phone');
    if (!phoneEl) {
        var emailGroup = emailEl ? emailEl.closest('.form-group') : null;
        if (emailGroup) {
            var phoneGroup = document.createElement('div');
            phoneGroup.className = 'form-group col-lg-12';
            phoneGroup.innerHTML =
                '<label>Phone</label>' +
                '<input type="text" name="phone" class="form-control" id="phone" placeholder="Enter phone number">' +
                '<div class="help-block with-errors"></div>';
            emailGroup.parentNode.insertBefore(phoneGroup, emailGroup.nextSibling);
            phoneEl = document.getElementById('phone');
        }
    }
    if (phoneEl) phoneEl.value = profile.phone || '';

    // ── Fix password fields: type="password", remove required, hide current password ──
    var cpEl = document.getElementById('cpassword');
    var npEl = document.getElementById('npassword');
    var cnpEl = document.getElementById('cnpassword');

    [cpEl, npEl, cnpEl].forEach(function (el) {
        if (el) {
            el.type = 'password';
            el.removeAttribute('required');
        }
    });

    // Also remove required from profile fields so the single <form> doesn't block on them
    ['fname', 'lname', 'dname', 'email'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.removeAttribute('required');
    });

    // Hide "current password" — Supabase admin API doesn't need it
    if (cpEl) {
        var cpGroup = cpEl.closest('.form-group');
        if (cpGroup) cpGroup.style.display = 'none';
    }

    // ── Add status message element near Save button ──
    var saveBtn = document.querySelector('.checkout-login-btn');
    var msgEl = document.createElement('span');
    msgEl.id = 'profile-msg';
    msgEl.style.cssText = 'display:block;margin-top:10px;font-size:14px;';
    if (saveBtn) saveBtn.appendChild(msgEl);

    // ── Handle profile save ──
    // The page uses validator.js which intercepts form submit and blocks it,
    // so we bypass the <form> entirely: swap the submit button to type="button"
    // and attach a direct click handler.
    var form = document.getElementById('addressForm');
    if (form) {
        form.setAttribute('novalidate', '');
        // Stop the form from ever submitting natively
        form.addEventListener('submit', function (e) { e.preventDefault(); });
    }

    var saveBtnEl = saveBtn ? saveBtn.querySelector('button[type="submit"], .btn-default') : null;
    if (saveBtnEl) {
        saveBtnEl.type = 'button'; // prevents form submit + validator.js
        saveBtnEl.addEventListener('click', async function () {
            msgEl.textContent = 'Saving...';
            msgEl.style.color = '#888';

            var result = await ElloraAuth.apiFetch('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    first_name: fnameEl ? fnameEl.value : '',
                    last_name: lnameEl ? lnameEl.value : '',
                    display_name: dnameEl ? dnameEl.value : '',
                    phone: phoneEl ? phoneEl.value : '',
                })
            });

            if (result && result.success) {
                msgEl.textContent = '✓ Changes saved successfully';
                msgEl.style.color = '#28b76b';
            } else {
                msgEl.textContent = '✕ ' + (result && result.error ? result.error : 'Failed to save');
                msgEl.style.color = '#d26d69';
            }
        });
    }

    // ── Handle password change ──
    // We need a separate handler since the original form wraps everything.
    // Find the password section's confirm button or reuse the same form.
    if (npEl && cnpEl) {
        // Create a dedicated password save button after the confirm field
        var pwSection = cnpEl.closest('.account-details-content-item');
        if (pwSection) {
            var existingPwBtn = pwSection.querySelector('.pw-save-btn');
            if (!existingPwBtn) {
                var pwBtnWrap = document.createElement('div');
                pwBtnWrap.className = 'checkout-login-btn';
                pwBtnWrap.style.marginTop = '20px';
                pwBtnWrap.innerHTML =
                    '<button type="button" class="btn-default pw-save-btn">Update Password</button>' +
                    '<span id="pw-msg" style="display:block;margin-top:10px;font-size:14px;"></span>';
                pwSection.appendChild(pwBtnWrap);

                pwBtnWrap.querySelector('.pw-save-btn').addEventListener('click', async function () {
                    var pwMsg = document.getElementById('pw-msg');
                    var newPw = npEl.value;
                    var confirmPw = cnpEl.value;

                    if (!newPw || newPw.length < 6) {
                        pwMsg.textContent = 'Password must be at least 6 characters';
                        pwMsg.style.color = '#d26d69';
                        return;
                    }
                    if (newPw !== confirmPw) {
                        pwMsg.textContent = 'Passwords do not match';
                        pwMsg.style.color = '#d26d69';
                        return;
                    }

                    pwMsg.textContent = 'Updating...';
                    pwMsg.style.color = '#888';

                    var result = await ElloraAuth.apiFetch('/password', {
                        method: 'PUT',
                        body: JSON.stringify({ new_password: newPw })
                    });

                    if (result && result.success) {
                        pwMsg.textContent = '✓ Password updated successfully';
                        pwMsg.style.color = '#28b76b';
                        npEl.value = '';
                        cnpEl.value = '';
                    } else {
                        pwMsg.textContent = '✕ ' + (result && result.error ? result.error : 'Failed to update');
                        pwMsg.style.color = '#d26d69';
                    }
                });
            }
        }
    }

    // ── Wire sidebar Logout link ──
    document.querySelectorAll('.my-account-sidebar-item a').forEach(function (a) {
        if (a.textContent.trim().toLowerCase() === 'logout') {
            a.addEventListener('click', function (e) { e.preventDefault(); ElloraAuth.logout(); });
        }
    });
});
