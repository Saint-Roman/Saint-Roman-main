document.addEventListener('DOMContentLoaded', function () {
    var SUPABASE_URL = 'https://gxbebydzhrmjvnkyryub.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YmVieWR6aHJtanZua3lyeXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzIyNzgsImV4cCI6MjEwMDEwODI3OH0.vKT-2syR9-2ZKU9z5HnA74vbvfWa657-Re4434Gb1jE';
    var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // If already logged in, go to dashboard
    client.auth.getSession().then(function (result) {
        if (result.data && result.data.session) window.location.href = 'account-dashboard.html';
    });

    var form = document.getElementById('resetForm');
    if (!form) return;

    var emailInput = document.getElementById('name');
    if (!emailInput) return;

    // Find the submit button
    var submitBtn = form.querySelector('.btn-default, button[type="submit"]');
    if (!submitBtn) return;
    submitBtn.type = 'button';

    // Add message element
    var msgEl = document.createElement('p');
    msgEl.style.cssText = 'margin-top:12px;font-size:14px;';
    submitBtn.parentNode.appendChild(msgEl);

    submitBtn.addEventListener('click', async function () {
        var email = emailInput.value.trim();
        if (!email) {
            msgEl.textContent = 'Please enter your email address';
            msgEl.style.color = '#d26d69';
            return;
        }

        msgEl.textContent = 'Sending reset link...';
        msgEl.style.color = '#888';

        try {
            var result = await client.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (result.error) {
                msgEl.textContent = result.error.message;
                msgEl.style.color = '#d26d69';
            } else {
                msgEl.textContent = '✓ Reset link sent! Check your email inbox.';
                msgEl.style.color = '#28b76b';
                emailInput.value = '';
            }
        } catch (err) {
            msgEl.textContent = 'Something went wrong. Please try again.';
            msgEl.style.color = '#d26d69';
        }
    });
});
