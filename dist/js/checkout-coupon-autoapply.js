/**
 * Ellora — Checkout coupon auto-apply
 *
 * When the customer clicked "Get Offer" on the homepage, the products page
 * saved the coupon code to sessionStorage. This script runs on checkout.html,
 * reads that saved code, fills the coupon input, and clicks "Apply" automatically.
 *
 * Add to checkout.html AFTER the existing inline <script> block, before </body>:
 *   <script src="js/checkout-coupon-autoapply.js"></script>
 */

(function () {
    var savedCoupon = sessionStorage.getItem('ellora_offer_coupon');
    if (!savedCoupon) return;

    // Wait a moment for the checkout page's own script to initialize
    setTimeout(function () {
        var couponInput = document.getElementById('coupon-code-input');
        var applyBtn = document.getElementById('apply-coupon-btn');

        if (!couponInput || !applyBtn) return;

        // Fill in the coupon code
        couponInput.value = savedCoupon;

        // Click the Apply button to validate it
        applyBtn.click();

        // Clear from sessionStorage so it doesn't keep re-applying on refresh
        // (the user can still manually re-enter it or a different code)
        sessionStorage.removeItem('ellora_offer_coupon');
    }, 500);
})();
