document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    var json = await ElloraAuth.apiFetch('/orders');
    if (!json) return;
    var orders = json.orders || [];

    // Target: .account-order-table-box tbody
    var box = document.querySelector('.account-order-table-box');
    if (!box) return;
    var tbody = box.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#888;">No orders yet. <a href="products.html">Start shopping</a></td></tr>';
        // Hide "Back To Shop" button area if needed
        return;
    }

    orders.forEach(function (o) {
        var itemCount = (o.order_items || []).reduce(function (s, i) { return s + i.quantity; }, 0);
        var date = new Date(o.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        var status = o.status.charAt(0).toUpperCase() + o.status.slice(1).replace(/_/g, ' ');

        var tr = document.createElement('tr');
        tr.innerHTML =
            '<td class="account-order-table-no">#' + (o.order_number || o.id.slice(0, 8)) + '</td>' +
            '<td>' + date + '</td>' +
            '<td>' + status + '</td>' +
            '<td>' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</td>' +
            '<td>' + EllroaCurrency.format(o.total) + '</td>' +
            '<td><a href="/account/orders/' + o.id + '" class="account-order-table-btn">View</a></td>';
        tbody.appendChild(tr);
    });
});
