// Single source of truth for storefront price formatting — ₹, comma thousands separator via
// en-IN locale, no forced decimals (matches the format products.html already used correctly:
// "₹499", "₹999", "₹1,000"). Every page that renders a price should use this instead of
// hand-rolling '$' + toFixed(2) or its own '₹' + toLocaleString(...) copy.
var EllroaCurrency = (function () {
    function format(value) {
        var n = Number(value);
        if (!isFinite(n)) n = 0;
        return '₹' + n.toLocaleString('en-IN');
    }

    return { format: format };
})();
