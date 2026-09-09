// Wires html/account-order-details.html (?id=<order id>) to the real order via
// server/routes/customer.js GET /api/customer/orders/:id. Previously this page loaded
// account-dashboard.js (a copy-paste leftover — wrong script entirely) and never read `?id=` at
// all, so it always showed the same static "Sophia Brown" / "Chic Aura Crop Top" demo order
// regardless of which real order was clicked from account-order.html.
document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    var orderId = ElloraRoute.param(/^\/account\/orders\/([^/?#]+)/, 'id');
    var box = document.querySelector('.view-order-content-box');
    if (!box) return;

    if (!orderId) {
        box.innerHTML = '<p>No order specified. <a href="account-order.html">Back to orders</a>.</p>';
        return;
    }

    var order = await ElloraAuth.apiFetch('/orders/' + encodeURIComponent(orderId));
    if (!order || order.error) {
        box.innerHTML = '<p>Order not found. <a href="account-order.html">Back to orders</a>.</p>';
        return;
    }

    var items = order.order_items || [];

    // order_items has no product image reference (only product_name/variant_label/quantity/
    // unit_price/line_total — see server/supabase/phase3_orders.sql), the same limitation
    // cart.html and checkout.html already accept for their own line items, so this reuses their
    // same generic placeholder rather than fabricating a per-item image that doesn't exist.
    var itemsHtml = items.map(function (item) {
        return (
            '<div class="cart-item">' +
            '  <div class="cart-item-image-content">' +
            '    <div class="cart-item-image"><figure><img src="images/product-image-1.png" alt=""></figure></div>' +
            '    <div class="cart-item-info-content">' +
            '      <div class="cart-item-title"><p>' + item.product_name + (item.variant_label ? ' (' + item.variant_label + ')' : '') + '</p></div>' +
            '    </div>' +
            '  </div>' +
            '  <div class="cart-item-quantity-total">' +
            '    <div class="cart-item-quantity"><p>' + String(item.quantity).padStart(2, '0') + '</p></div>' +
            '    <div class="cart-item-subtotal"><p>' + EllroaCurrency.format(item.line_total) + '</p></div>' +
            '  </div>' +
            '</div>'
        );
    }).join('');

    var PAYMENT_METHOD_LABELS = { cod: 'Cash on Delivery' };
    var paymentMethodLabel = order.payment_method
        ? (PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method)
        : 'Not recorded';

    var summaryHtml =
        '<li>Subtotal: <span>' + EllroaCurrency.format(order.subtotal) + '</span></li>' +
        '<li>Shipping: <span>' + (order.shipping_fee > 0 ? EllroaCurrency.format(order.shipping_fee) : 'Free shipping') + '</span></li>' +
        (order.discount_amount > 0
            ? '<li>Discount' + (order.coupon_code ? ' (' + order.coupon_code + ')' : '') + ': <span>-' + EllroaCurrency.format(order.discount_amount) + '</span></li>'
            : '') +
        '<li>Total: <span>' + EllroaCurrency.format(order.total) + '</span></li>' +
        '<li>Payment method: <span>' + paymentMethodLabel + '</span></li>';

    box.querySelector('.view-order-product-info-box').innerHTML =
        '<div class="cart-item-header">' +
        '  <span class="product-header-tag">Product</span>' +
        '  <span class="quantity-header-tag">Quantity</span>' +
        '  <span class="subtotal-header-tag">Total</span>' +
        '</div>' +
        itemsHtml +
        '<ul class="view-order-product-info-list">' + summaryHtml + '</ul>';

    // Checkout (checkout.html) only ever collects one address for the order — there's no
    // separate billing-address form — so both sections here render that same real
    // orders.shipping_address snapshot instead of fabricating a distinct billing address.
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

    var addressSections = box.querySelectorAll('.view-order-address-item ul');
    addressSections.forEach(function (ul) { ul.innerHTML = addressHtml; });
});
