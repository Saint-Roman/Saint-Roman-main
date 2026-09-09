document.addEventListener('DOMContentLoaded', async function () {
    // If already logged in, redirect to dashboard
    var s = await ElloraAuth.getSession();
    if (s) { window.location.href = 'account-dashboard.html'; return; }

    // Wire up the login form — real markup is <form id="LoginForm"> wrapping
    // .checkout-login-form (a div, not a form), with fields #name (username/email,
    // type="text") and #loginpassword.
    var loginForm = document.getElementById('LoginForm');
    if (loginForm) {
        var loginErr = loginForm.querySelector('.login-error');
        if (!loginErr) {
            loginErr = document.createElement('p');
            loginErr.className = 'login-error';
            loginErr.style.cssText = 'color:red;margin-top:8px;display:none';
            loginForm.appendChild(loginErr);
        }

        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            loginErr.style.display = 'none';
            var email = document.getElementById('name');
            var password = document.getElementById('loginpassword');
            if (!email || !password) return;

            var result = await ElloraAuth.login(email.value, password.value);
            if (result.error) {
                loginErr.textContent = result.error;
                loginErr.style.display = 'block';
            } else {
                window.location.href = 'account-dashboard.html';
            }
        });
    }

    // Wire up the signup form — <form id="SignupForm"> with fields #email
    // (type="email") and #signuppassword.
    var registerForm = document.getElementById('SignupForm');
    if (registerForm) {
        var regErr = registerForm.querySelector('.reg-error');
        if (!regErr) {
            regErr = document.createElement('p');
            regErr.className = 'reg-error';
            regErr.style.cssText = 'color:red;margin-top:8px;display:none';
            registerForm.appendChild(regErr);
        }
        var regSuccess = document.createElement('p');
        regSuccess.style.cssText = 'color:green;margin-top:8px;display:none';
        registerForm.appendChild(regSuccess);

        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            regErr.style.display = 'none';
            regSuccess.style.display = 'none';
            var email = document.getElementById('email');
            var password = document.getElementById('signuppassword');
            if (!email || !password) return;

            var result = await ElloraAuth.register(email.value, password.value, '', '');
            if (result.error) {
                regErr.textContent = result.error;
                regErr.style.display = 'block';
            } else if (result.session) {
                window.location.href = 'account-dashboard.html';
            } else {
                regSuccess.textContent = 'Check your email to confirm your account, then log in.';
                regSuccess.style.display = 'block';
            }
        });
    }
});
