// Wires html/order-received.html (?order=<order_number>) to the real order via
// server/routes/public.js GET /api/public/orders/:orderNumber. Previously only a few lines of
// inline script here read ?order= and set the "ORDER ..." heading text — everything else
// (order date, payment method, total, billing/shipping address, line items, subtotal/shipping/
// total) was static template demo content ("Sophia Brown", "Digital Product - 01", a fabricated
// "Tax: ₹350" line with no backing column on `orders`), shown identically after every checkout
// regardless of what was actually ordered.
(function () {
    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';
    var orderNumber = ElloraRoute.param(/^\/order-confirmation\/([^/?#]+)/, 'order');

    var headingEl = document.getElementById('order-number');
    var numberEl = document.getElementById('order-number-value');
    var dateEl = document.getElementById('order-date-value');
    var paymentMethodEl = document.getElementById('order-payment-method-value');
    var totalEl = document.getElementById('order-total-value');
    var billingListEl = document.getElementById('billing-address-list');
    var shippingListEl = document.getElementById('shipping-address-list');
    var itemsListEl = document.getElementById('order-receive-list');

    var PAYMENT_METHOD_LABELS = { cod: 'Cash on Delivery' };

    function formatDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    function showNotFound(message) {
        if (headingEl) headingEl.textContent = 'Order not found';
        document.querySelectorAll('.order-receive-title-box p').forEach(function (p) { p.textContent = message; });
        if (itemsListEl) itemsListEl.innerHTML = '<li>' + message + '</li>';
    }

    if (!orderNumber) {
        showNotFound('No order specified.');
        return;
    }

    if (headingEl) headingEl.textContent = 'ORDER ' + orderNumber;

    fetch(API_BASE + '/orders/' + encodeURIComponent(orderNumber))
        .then(function (res) {
            if (!res.ok) throw new Error('not found');
            return res.json();
        })
        .then(function (data) {
            var order = data.order;
            var items = order.order_items || [];

            if (numberEl) numberEl.textContent = order.order_number;
            if (dateEl) dateEl.textContent = formatDate(order.created_at);
            var paymentMethodLabel = order.payment_method
                ? (PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method)
                : 'Not recorded';
            if (paymentMethodEl) paymentMethodEl.textContent = paymentMethodLabel;
            if (totalEl) totalEl.textContent = EllroaCurrency.format(order.total);

            // Same real orders.shipping_address snapshot for both — checkout.html only ever
            // collects one address, there's no separate billing form to pull a different one
            // from (see html/js/account-order-details.js, which made the same call for the
            // account order-history page).
            var addr = order.shipping_address || {};
            var addressLines = [order.customer_name];
            var addressParts = [addr.address, addr.city, addr.district, addr.pincode, addr.country].filter(Boolean);
            if (addressParts.length) addressLines.push(addressParts.join(', '));
            var contactParts = [];
            if (order.customer_phone) contactParts.push('<a href="tel:' + order.customer_phone + '">' + order.customer_phone + '</a>');
            if (order.customer_email) contactParts.push('<a href="mailto:' + order.customer_email + '">' + order.customer_email + '</a>');

            var addressHtml = addressLines.map(function (l) { return '<li>' + l + '</li>'; }).join('');
            if (contactParts.length) addressHtml += '<li>' + contactParts.join(' ') + '</li>';
            if (!addressParts.length) addressHtml += '<li>No address on file for this order.</li>';

            if (billingListEl) billingListEl.innerHTML = addressHtml;
            if (shippingListEl) shippingListEl.innerHTML = addressHtml;

            // No tax column on `orders` (server/supabase/phase3_orders.sql) — the static template
            // had a fabricated "Tax: ₹350" line, dropped rather than reproduced.
            var lines = ['<li class="order-receive-content-list-title">Product <span>Total</span></li>'];
            items.forEach(function (item) {
                lines.push(
                    '<li>' + item.product_name + (item.variant_label ? ' (' + item.variant_label + ')' : '') +
                    ' &times; ' + item.quantity + ' <span>' + EllroaCurrency.format(item.line_total) + '</span></li>'
                );
            });
            lines.push('<li>Subtotal: <span>' + EllroaCurrency.format(order.subtotal) + '</span></li>');
            lines.push('<li>Shipping: <span>' + (order.shipping_fee > 0 ? EllroaCurrency.format(order.shipping_fee) : 'Free shipping') + '</span></li>');
            if (order.discount_amount > 0) {
                lines.push('<li>Discount' + (order.coupon_code ? ' (' + order.coupon_code + ')' : '') + ': <span>-' + EllroaCurrency.format(order.discount_amount) + '</span></li>');
            }
            lines.push('<li>Total: <span>' + EllroaCurrency.format(order.total) + '</span></li>');
            lines.push('<li>Payment method: <span>' + paymentMethodLabel + '</span></li>');
            if (order.notes) lines.push('<li>Note: <span>' + order.notes + '</span></li>');

            if (itemsListEl) itemsListEl.innerHTML = lines.join('');
        })
        .catch(function () {
            showNotFound('We could not find that order.');
        });
})();
