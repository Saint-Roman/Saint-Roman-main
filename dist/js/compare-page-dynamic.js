// Wires html/compare.html to the client-side compare list (js/ellora-compare.js, localStorage
// key `ellora_compare`). Follows the project's convention for dynamic pages (product-single-
// dynamic.js, blog-single-dynamic.js) — IIFE, own hardcoded API_BASE, no new dependencies.
//
// The compare list only stores lightweight data per product (id/slug/name/image/price — see
// ellora-compare.js). Colour/Size/Category aren't part of that, so each product is re-fetched by
// slug from GET /api/public/products/:slug — the same endpoint and shape product-single-
// dynamic.js already uses — to get product_variants (for colour/size) and category.
(function () {
    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';
    var container = document.getElementById('compare-table-container');
    if (!container) return;

    // slug -> fetched product (or null if the fetch failed, e.g. the product was deleted or
    // unpublished since it was added to compare). Rebuilt on every render() so Add to Cart can
    // read variant data without a second fetch.
    var productCache = {};

    function fetchProduct(slug) {
        return fetch(API_BASE + '/products/' + encodeURIComponent(slug))
            .then(function (res) {
                if (!res.ok) throw new Error('not found');
                return res.json();
            })
            .then(function (data) { return data.product; })
            .catch(function () { return null; });
    }

    function renderEmptyState() {
        container.innerHTML =
            '<div class="compare-empty-state wow fadeInUp">' +
            '<img src="images/icon-compare-primary.svg" alt="">' +
            '<h3>No products to compare yet</h3>' +
            '<p>Add products from the shop to compare their price, colours, sizes and more.</p>' +
            '<a href="products.html" class="btn-default">Browse Products</a>' +
            '</div>';
    }

    function colourList(product) {
        if (!product) return null;
        var colours = (product.product_variants || [])
            .map(function (v) { return v.color; })
            .filter(Boolean);
        var unique = colours.filter(function (c, i) { return colours.indexOf(c) === i; });
        return unique.length ? unique.join(', ') : null;
    }

    function sizeList(product) {
        if (!product) return null;
        var sizes = (product.product_variants || [])
            .map(function (v) { return v.size; })
            .filter(Boolean);
        var unique = sizes.filter(function (s, i) { return sizes.indexOf(s) === i; });
        return unique.length ? unique.join(', ') : null;
    }

    function priceHtml(item, product) {
        var base = product ? product.base_price : item.price;
        var compareAt = product ? product.compare_at_price : null;
        var html = EllroaCurrency.format(base);
        if (compareAt && compareAt > base) {
            html += ' <del>' + EllroaCurrency.format(compareAt) + '</del>';
        }
        return html;
    }

    // One <td> per product column, keyed by row so buildTable() can assemble each row across
    // every column without repeating the "which column is this" logic per row.
    function buildProductCell(row, item, product) {
        var href = '/product/' + encodeURIComponent(item.slug);

        if (row === 'image') {
            var img = (product && product.image_url) || item.image || 'images/product-image-1.png';
            return '<td class="compare-col"><a href="' + href + '" class="compare-product-image"><img src="' + img + '" alt="' + (item.name || '') + '"></a></td>';
        }
        if (row === 'name') {
            return '<td class="compare-col"><a href="' + href + '">' + (product ? product.name : item.name) + '</a></td>';
        }
        if (row === 'price') {
            return '<td class="compare-col">' + priceHtml(item, product) + '</td>';
        }
        if (row === 'colour') {
            return '<td class="compare-col">' + (colourList(product) || '—') + '</td>';
        }
        if (row === 'size') {
            return '<td class="compare-col">' + (sizeList(product) || '—') + '</td>';
        }
        if (row === 'category') {
            var category = product && product.category ? product.category.name : '—';
            return '<td class="compare-col">' + category + '</td>';
        }
        if (row === 'cart') {
            // Compare has no colour/size picker of its own — it can only safely add a product
            // straight to cart when there's exactly one real variant to add (no ambiguity about
            // which colour/size the shopper meant). Anything else sends them to the product page,
            // same as picking a specific variant would require there anyway.
            var variants = (product && product.product_variants) || [];
            if (variants.length === 1) {
                return '<td class="compare-col"><button type="button" class="btn-default" data-action="add-to-cart" data-id="' + item.id + '">Add To Cart</button></td>';
            }
            if (variants.length === 0) {
                return '<td class="compare-col"><button type="button" class="btn-default" disabled>Unavailable</button></td>';
            }
            return '<td class="compare-col"><a href="' + href + '" class="btn-default">Choose Options</a></td>';
        }
        if (row === 'remove') {
            return '<td class="compare-col"><a href="#" class="compare-remove-btn" data-action="remove" data-id="' + item.id + '"><i class="fa-regular fa-trash-can"></i> Remove</a></td>';
        }
        return '<td class="compare-col"></td>';
    }

    function buildEmptyCell(row) {
        if (row === 'image') {
            return '<td class="compare-col"><a href="products.html" class="compare-add-placeholder"><i class="fa-solid fa-plus"></i><span>Add Product</span></a></td>';
        }
        return '<td class="compare-col"></td>';
    }

    var ROWS = [
        { key: 'image', label: 'Image' },
        { key: 'name', label: 'Product' },
        { key: 'price', label: 'Price' },
        { key: 'colour', label: 'Colour' },
        { key: 'size', label: 'Size' },
        { key: 'category', label: 'Category' },
        { key: 'cart', label: '' },
        { key: 'remove', label: '' },
    ];

    function buildTable(items) {
        // Pad up to ElloraCompare.MAX columns with "Add Product" placeholders so the table always
        // shows a consistent number of columns.
        var slotCount = Math.max(items.length, ElloraCompare.MAX);
        var slots = [];
        for (var i = 0; i < slotCount; i++) {
            slots.push(i < items.length ? items[i] : null);
        }

        var rowsHtml = ROWS.map(function (row) {
            var cells = slots.map(function (item) {
                if (!item) return buildEmptyCell(row.key);
                return buildProductCell(row.key, item, productCache[item.slug] || null);
            }).join('');
            return '<tr class="compare-row compare-row-' + row.key + '"><th>' + row.label + '</th>' + cells + '</tr>';
        }).join('');

        container.innerHTML =
            '<div class="compare-table-box wow fadeInUp">' +
            '<div class="table-responsive">' +
            '<table class="compare-table"><tbody>' + rowsHtml + '</tbody></table>' +
            '</div>' +
            '</div>' +
            // Reuses .cart-item-buttons (css/custom.css) for the same "Clear Cart"-style button
            // treatment (trash icon, spacing) instead of defining a parallel new one.
            '<div class="cart-item-buttons wow fadeInUp" data-wow-delay="0.2s">' +
            '<a href="#" class="btn-default btn-clear" data-action="clear">Clear Compare List</a>' +
            '</div>';

        if (typeof WOW !== 'undefined') new WOW().init();
    }

    function render() {
        var items = ElloraCompare.get();

        if (items.length === 0) {
            renderEmptyState();
            return;
        }

        Promise.all(items.map(function (item) { return fetchProduct(item.slug); })).then(function (products) {
            productCache = {};
            items.forEach(function (item, i) {
                productCache[item.slug] = products[i];
            });
            buildTable(items);
        });
    }

    container.addEventListener('click', async function (e) {
        var actionEl = e.target.closest('[data-action]');
        if (!actionEl) return;
        e.preventDefault();

        var id = actionEl.dataset.id;

        if (actionEl.dataset.action === 'remove') {
            ElloraCompare.remove(id);
            render();
            return;
        }

        if (actionEl.dataset.action === 'clear') {
            ElloraCompare.clear();
            render();
            return;
        }

        if (actionEl.dataset.action === 'add-to-cart') {
            // Cart requires a real account, same as product-single.html's Add to Cart button.
            var session = await ElloraAuth.requireLogin();
            if (!session) return;

            var items = ElloraCompare.get();
            var item = items.filter(function (i) { return i.id === id; })[0];
            var product = item && productCache[item.slug];
            var variants = (product && product.product_variants) || [];
            // Only ever reachable when buildProductCell rendered a real "Add To Cart" button,
            // which only happens for a product with exactly one variant — see buildProductCell's
            // 'cart' row above. Multi-variant products get a "Choose Options" link instead, so
            // there's never an ambiguous product_variants[0] guess to make here.
            var variant = variants.length === 1 ? variants[0] : null;
            if (!variant) return;

            EllroaCart.add({
                variantId: variant.id,
                productSlug: product.slug,
                productName: product.name,
                variantLabel: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
                price: variant.price,
                quantity: 1,
            });

            // Stays on the compare page (unlike product-single-dynamic.js, which redirects to
            // cart.html after Add to Cart) — the whole point of this page is comparing several
            // products side by side, so navigating away after adding just one defeats that.
            actionEl.textContent = 'Added ✓';
            actionEl.disabled = true;
        }
    });

    render();
})();
