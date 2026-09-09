document.addEventListener('DOMContentLoaded', function () {
    var SUPABASE_URL = 'https://gxbebydzhrmjvnkyryub.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4YmVieWR6aHJtanZua3lyeXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzIyNzgsImV4cCI6MjEwMDEwODI3OH0.vKT-2syR9-2ZKU9z5HnA74vbvfWa657-Re4434Gb1jE';
    var client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    var newPwEl = document.getElementById('newPassword');
    var confirmPwEl = document.getElementById('confirmPassword');
    var resetBtn = document.getElementById('resetBtn');
    var msgEl = document.getElementById('resetMsg');

    if (!resetBtn || !newPwEl || !confirmPwEl || !msgEl) return;

    // Supabase processes the recovery token from the URL hash automatically.
    // Listen for the PASSWORD_RECOVERY event to confirm we have a valid recovery session.
    var hasRecoverySession = false;

    client.auth.onAuthStateChange(function (event, session) {
        if (event === 'PASSWORD_RECOVERY') {
            hasRecoverySession = true;
        }
    });

    // Also check if there's already a session (token might have been processed before listener attached)
    client.auth.getSession().then(function (result) {
        if (result.data && result.data.session) {
            hasRecoverySession = true;
        }
    });

    // After a short delay, if no recovery session found, show error
    setTimeout(function () {
        if (!hasRecoverySession) {
            msgEl.textContent = 'Invalid or expired reset link. Please request a new one.';
            msgEl.style.color = '#d26d69';
            resetBtn.disabled = true;
            resetBtn.style.opacity = '0.5';
        }
    }, 3000);

    resetBtn.addEventListener('click', async function () {
        var newPw = newPwEl.value;
        var confirmPw = confirmPwEl.value;

        // Validate
        if (!newPw || newPw.length < 6) {
            msgEl.textContent = 'Password must be at least 6 characters';
            msgEl.style.color = '#d26d69';
            return;
        }
        if (newPw !== confirmPw) {
            msgEl.textContent = 'Passwords do not match';
            msgEl.style.color = '#d26d69';
            return;
        }

        msgEl.textContent = 'Updating password...';
        msgEl.style.color = '#888';
        resetBtn.disabled = true;

        try {
            var result = await client.auth.updateUser({ password: newPw });

            if (result.error) {
                msgEl.textContent = result.error.message;
                msgEl.style.color = '#d26d69';
                resetBtn.disabled = false;
            } else {
                msgEl.innerHTML = '✓ Password updated successfully! <a href="login.html">Login now</a>';
                msgEl.style.color = '#28b76b';
                newPwEl.value = '';
                confirmPwEl.value = '';

                // Sign out so they login fresh with new password
                await client.auth.signOut();

                // Redirect to login after 2 seconds
                setTimeout(function () {
                    window.location.href = 'login.html';
                }, 2500);
            }
        } catch (err) {
            msgEl.textContent = 'Something went wrong. Please try again.';
            msgEl.style.color = '#d26d69';
            resetBtn.disabled = false;
        }
    });
});
