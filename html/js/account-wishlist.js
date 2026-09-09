document.addEventListener('DOMContentLoaded', async function () {
    var session = await ElloraAuth.requireLogin();
    if (!session) return;

    await renderWishlist();

    async function renderWishlist() {
        var json = await ElloraAuth.apiFetch('/wishlist');
        if (!json) return;
        var items = json.wishlist || [];

        // Target: .wishlist-content-box (the actual Ellora class)
        var box = document.querySelector('.wishlist-content-box');
        if (!box) return;

        if (items.length === 0) {
            box.innerHTML =
                '<div class="wishlist-item-table wow fadeInUp" style="text-align:center;padding:60px 20px;">' +
                '<img src="images/icon-wishlist-primary.svg" alt="" style="width:48px;opacity:0.4;margin-bottom:16px">' +
                '<h3 style="font-size:18px;margin-bottom:8px;">Your wishlist is empty</h3>' +
                '<p style="color:#888;margin-bottom:20px;">Browse our collection and add items you love</p>' +
                '<a href="products.html" class="btn-default" style="display:inline-block">Browse Products</a>' +
                '</div>';
            return;
        }

        var html =
            '<div class="wishlist-item-table wow fadeInUp">' +
            '<div class="wishlist-item-header">' +
            '<span class="wishlist-product-tag">Product</span>' +
            '<span class="wishlist-price-tag">Unit Price</span>' +
            '<span class="wishlist-status-tag">Stock Status</span>' +
            '<span class="wishlist-action-tag">Action</span>' +
            '</div>';

        items.forEach(function (item) {
            var priceHtml = '';
            if (item.compare_at_price && item.compare_at_price > item.base_price) {
                var discount = Math.round((1 - item.base_price / item.compare_at_price) * 100);
                priceHtml =
                    '<p><span>' + EllroaCurrency.format(item.compare_at_price) + '</span> ' + EllroaCurrency.format(item.base_price) + '</p>' +
                    '<p>' + discount + '% OFF</p>';
            } else {
                priceHtml = '<p>' + EllroaCurrency.format(item.base_price) + '</p>';
            }

            var stockHtml = item.status === 'active'
                ? '<p style="color:#28b76b">In Stock</p>'
                : '<p style="color:#999">Unavailable</p>';

            var imgSrc = item.image_url || 'images/placeholder.jpg';

            html +=
                '<div class="wishlist-item">' +
                '<div class="wishlist-item-image-content">' +
                '<div class="wishlist-item-image">' +
                '<figure><a href="/product/' + (item.slug || '') + '"><img src="' + imgSrc + '" alt="' + (item.name || '') + '"></a></figure>' +
                '</div>' +
                '<div class="wishlist-item-info-content">' +
                '<div class="wishlist-item-title"><p><a href="/product/' + (item.slug || '') + '">' + (item.name || '') + '</a></p></div>' +
                '<div class="wishlist-item-price">' + priceHtml + '</div>' +
                '</div>' +
                '</div>' +
                '<div class="wishlist-item-status-action">' +
                '<div class="wishlist-item-status">' + stockHtml + '</div>' +
                '<div class="wishlist-item-action">' +
                '<a href="#" class="wishlist-remove" data-pid="' + item.id + '"><i class="fa-regular fa-trash-can"></i></a>' +
                '</div>' +
                '</div>' +
                '</div>';
        });

        html += '</div>';

        // Add back-to-shop button
        html +=
            '<div class="back-to-shop-btn wow fadeInUp" data-wow-delay="0.2s">' +
            '<a href="products.html" class="btn-default">Back To Shop <img src="images/icon-arrow-right-black.svg" alt=""></a>' +
            '</div>';

        box.innerHTML = html;

        // Wire remove buttons
        box.querySelectorAll('.wishlist-remove').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.preventDefault();
                var pid = btn.dataset.pid;
                await ElloraAuth.apiFetch('/wishlist/' + pid, { method: 'DELETE' });
                await renderWishlist();
            });
        });
    }

    // Wire sidebar Logout link
    document.querySelectorAll('.my-account-sidebar-item a').forEach(function (a) {
        if (a.textContent.trim().toLowerCase() === 'logout') {
            a.addEventListener('click', function (e) { e.preventDefault(); ElloraAuth.logout(); });
        }
    });
});
