// Wires html/product-single.html (?slug=...) to a real product from the Ellora admin panel
// (server/routes/public.js: GET /api/public/products/:slug), following the project's convention
// for dynamic pages (mega-menu-dynamic.js, blog-single-dynamic.js, homepage-dynamic-sections.js).
//
// Fixes, each verified against the actual data shape before being written:
//   1. Product image never rendered at all (the sliders were 100% static demo images). The
//      single-product endpoint was also selecting the unused `product_images` gallery table
//      instead of the `image_url` column the admin's image upload actually writes to (see the
//      products.image_url comment in server/routes/public.js). There's one image per product,
//      not a gallery, so it's applied to every slide in both the big slider and the thumbnail
//      strip, matching how the rest of the storefront (products.html, homepage) already do it.
//   2. Price used '$' + toFixed(2); now uses the shared EllroaCurrency.format() (js/currency.js).
//   3. Description/Additional Information/Reviews tabs were the same static template copy on
//      every product. Description comes from products.description (real column), reformatted
//      from plain text into real <p>/<ul><li> markup via js/text-format.js so it matches the
//      paragraph breaks and feature lists the admin actually typed, instead of one run-on
//      paragraph. Additional Information comes from products.specifications (jsonb,
//      phase8_product_specifications.sql) — a flexible label/value store filled in per-product
//      via the admin's product form, since no category-agnostic fixed columns for this exist or
//      make sense (a t-shirt's Fit/Neckline don't apply to a watch or a lipstick). Both tabs
//      honestly say so if nothing is set. There is no reviews table anywhere in
//      server/supabase/*.sql, so Reviews honestly shows "No reviews yet" / "Reviews (0)" instead
//      of 50 fake ones.
//   4. Related products reused the existing GET /products?category=<slug> endpoint (same one
//      products.html uses for the main grid) instead of a new endpoint or fabricated data —
//      fetches products in the same category, excludes the current product, and shows however
//      many are actually available (0-4).
//   5. Wishlist and Compare were both dead `<a href="#">` icon links next to Add To Cart.
//      Wishlist reuses the real authenticated wishlist API (server/routes/customer.js, already
//      consumed by account-wishlist.js) via ElloraAuth — no new endpoint. Compare has no backend
//      and isn't getting one; it's a small localStorage module (js/ellora-compare.js), same tier
//      as js/ellora-cart.js. See initWishlistButton()/initCompareButton() below.
(function () {
    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';
    var slug = ElloraRoute.param(/^\/product\/([^/?#]+)/, 'slug');
    var currentProduct = null;

    // Currently selected real variant (set by renderVariantPicker below, updated whenever the
    // shopper changes the colour/size radios). Add To Cart must use this — never
    // product_variants[0] — otherwise every product behaves as if only its first admin-entered
    // variant exists, and the on-page colour/size selection has no effect on what's purchased.
    var selectedVariant = null;

    document.getElementById('add-to-cart-btn').addEventListener('click', async function (e) {
        e.preventDefault();
        if (!currentProduct) return;

        // Cart requires a real account, same as Wishlist below — no guest cart.
        var session = await ElloraAuth.requireLogin();
        if (!session) return;

        var variant = selectedVariant;
        if (!variant) {
            alert('Please select the available colour/size combination.');
            return;
        }
        if (variant.stock_quantity <= 0) {
            alert('This colour/size combination is out of stock.');
            return;
        }

        var qty = parseInt(document.getElementById('product-qty').value, 10) || 1;

        EllroaCart.add({
            variantId: variant.id,
            productSlug: currentProduct.slug,
            productName: currentProduct.name,
            variantLabel: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
            price: variant.price,
            quantity: qty,
        });

        window.location.href = 'cart.html';
    });

    // ─── Variant picker (colour / size) ────────────────────────────────
    //
    // product-single.html shipped with 5 static colour swatches and 6 static sizes that were the
    // same on every product page regardless of what the admin actually entered for that product
    // (product_variants: {id, size, color, price, stock_quantity} — server/routes/public.js). This
    // renders only the colour/size values that actually exist on this product's variants (e.g. a
    // product with a single "M / Yellow" variant shows exactly one size button and one swatch,
    // both pre-selected) and keeps `selectedVariant` above in sync with whatever's clicked.
    function uniqueValues(variants, key) {
        var values = variants.map(function (v) { return v[key]; }).filter(Boolean);
        return values.filter(function (v, i) { return values.indexOf(v) === i; });
    }

    function findVariant(variants, color, size) {
        return variants.filter(function (v) {
            return (color === null || v.color === color) && (size === null || v.size === size);
        })[0] || null;
    }

    function renderVariantPicker(product) {
        var variants = product.product_variants || [];
        var colors = uniqueValues(variants, 'color');
        var sizes = uniqueValues(variants, 'size');

        var colorSection = document.getElementById('product-color-section');
        var colorOptions = document.getElementById('product-color-options');
        var sizeSection = document.getElementById('product-size-section');
        var sizeOptions = document.getElementById('product-size-options');
        var message = document.getElementById('product-variant-message');

        var selectedColor = colors[0] || null;
        var selectedSize = sizes[0] || null;

        function updateSelection() {
            selectedVariant = findVariant(variants, selectedColor, selectedSize);
            if (!message) return;
            if (!selectedVariant) {
                message.textContent = 'This combination is not available.';
            } else if (selectedVariant.stock_quantity <= 0) {
                message.textContent = 'Out of stock.';
            } else {
                message.textContent = '';
            }
        }

        if (colorSection && colorOptions) {
            if (colors.length === 0) {
                colorSection.style.display = 'none';
                colorOptions.innerHTML = '';
            } else {
                colorSection.style.display = '';
                colorOptions.innerHTML = colors.map(function (color, i) {
                    var safeColor = EllroaText.escapeHtml(color);
                    return '<input type="radio" name="color" id="product-color-' + i + '"' + (i === 0 ? ' checked' : '') + '>' +
                        '<label for="product-color-' + i + '" class="color-variant" style="background:' + safeColor + '" title="' + safeColor + '"></label>';
                }).join('');

                colors.forEach(function (color, i) {
                    document.getElementById('product-color-' + i).addEventListener('change', function () {
                        selectedColor = color;
                        updateSelection();
                    });
                });
            }
        }

        if (sizeSection && sizeOptions) {
            if (sizes.length === 0) {
                sizeSection.style.display = 'none';
                sizeOptions.innerHTML = '';
            } else {
                sizeSection.style.display = '';
                sizeOptions.innerHTML = sizes.map(function (size, i) {
                    var safeSize = EllroaText.escapeHtml(size);
                    return '<li><input type="radio" id="product-size-' + i + '" name="Size" value="' + safeSize + '"' + (i === 0 ? ' checked' : '') + '><label for="product-size-' + i + '">' + safeSize + '</label></li>';
                }).join('');

                sizes.forEach(function (size, i) {
                    document.getElementById('product-size-' + i).addEventListener('change', function () {
                        selectedSize = size;
                        updateSelection();
                    });
                });
            }
        }

        updateSelection();
    }

    // Single real image per product (products.image_url) — repeated across every slide in both
    // sliders, matching the "single image_url, not a gallery" data shape. Only overwritten when
    // the product actually has one set; otherwise the template's static placeholder image stays,
    // same fallback convention used in homepage-dynamic-sections.js.
    function renderImages(product) {
        if (!product.image_url) return;
        document.querySelectorAll('.product-single-image-slider img, .product-single-image-item img').forEach(function (img) {
            img.src = product.image_url;
            img.alt = product.name || '';
        });
    }

    // The admin's Description field (admin/src/pages/ProductsPage.tsx) is a plain <Textarea> —
    // authors write real paragraph breaks and feature lists into it (blank line = new paragraph,
    // consecutive lines = a list), but dumping that string straight into one <p> ignores all of
    // that structure since HTML collapses literal newlines. EllroaText.render (js/text-format.js)
    // rebuilds real <p>/<ul><li> markup so the storefront matches what's actually in the admin
    // textarea instead of running everything together into one paragraph.
    function renderDescriptionTab(product) {
        var el = document.getElementById('product-description-tab');
        if (!el) return;
        el.innerHTML = EllroaText.render(product.description, 'No description available yet.');
    }

    // products.specifications (jsonb, server/supabase/phase8_product_specifications.sql) — a
    // flexible label/value store filled in per-product from the admin's product edit form
    // (admin/src/pages/ProductsPage.tsx "Additional Information" section), since fixed columns
    // like material/fit/neckline only make sense for apparel and don't fit every category Ellora
    // sells (watches, beauty, accessories, ...). Real data only — no fallback to fabricated rows.
    function renderAdditionalInfo(product) {
        var container = document.getElementById('product-additional-info');
        if (!container) return;

        var specs = product.specifications || {};
        var rows = Object.keys(specs).filter(function (label) {
            return specs[label] !== null && specs[label] !== undefined && specs[label] !== '';
        });

        if (rows.length === 0) {
            container.innerHTML = '<p>No additional information available.</p>';
            return;
        }

        container.innerHTML = '<table>' + rows.map(function (label) {
            return '<tr><td><b>' + EllroaText.escapeHtml(label) + '</b></td><td>' + EllroaText.escapeHtml(specs[label]) + '</td></tr>';
        }).join('') + '</table>';
    }

    // No reviews table exists anywhere in server/supabase/*.sql — nothing to fetch. Honest
    // empty state instead of the 50 fake "Author" reviews the static template shipped with.
    function renderReviews() {
        var tab = document.getElementById('third-tab');
        if (tab) tab.textContent = 'Reviews (0)';
    }

    // Related products: same category as the current product, real data only, reusing the
    // existing GET /products?category=<slug> endpoint (the same one products.html's main grid
    // uses) instead of adding a duplicate catalog query or a new endpoint.
    function loadRelatedProducts(product) {
        var section = document.querySelector('.related-products');
        var cards = document.querySelectorAll('.related-product-items-list .product-item');
        if (!section || !cards.length) return;

        var categorySlug = product.category && product.category.slug;
        if (!categorySlug) {
            section.style.display = 'none';
            return;
        }

        fetch(API_BASE + '/products?category=' + encodeURIComponent(categorySlug) + '&limit=' + (cards.length + 1))
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var related = (data.products || []).filter(function (p) { return p.id !== product.id; }).slice(0, cards.length);

                if (related.length === 0) {
                    section.style.display = 'none';
                    return;
                }

                cards.forEach(function (card, i) {
                    if (i >= related.length) {
                        card.style.display = 'none';
                        return;
                    }
                    var p = related[i];
                    var href = '/product/' + encodeURIComponent(p.slug);

                    var img = card.querySelector('.product-item-image img');
                    if (img) {
                        img.src = p.image_url || 'images/product-image-1.png';
                        img.alt = p.name || '';
                    }
                    var imgLink = card.querySelector('.product-item-image a');
                    if (imgLink) imgLink.href = href;

                    var title = card.querySelector('.product-item-title a');
                    if (title) {
                        title.textContent = p.name;
                        title.href = href;
                    }

                    var priceEl = card.querySelector('.product-item-price h3');
                    if (priceEl) {
                        var html = EllroaCurrency.format(p.base_price);
                        if (p.compare_at_price && p.compare_at_price > p.base_price) {
                            html += ' <span>' + EllroaCurrency.format(p.compare_at_price) + '</span>';
                        }
                        priceEl.innerHTML = html;
                    }
                });
            })
            .catch(function () {
                section.style.display = 'none';
            });
    }

    // ─── Toast ───────────────────────────────────────────────────────────
    //
    // No shared toast/notification component exists anywhere in html/js — checked ellora-cart.js
    // (pure localStorage, no UI at all) and checkout.html (a page-local inline #order-message
    // element wired to its own script, not reusable from here). This is a minimal, self-contained
    // one scoped to this page; styling lives in css/custom.css (.ellora-toast) so it matches the
    // site's existing look instead of being inline-styled.
    //
    // messageHtml is always a hardcoded string from this file (never user input), so innerHTML is
    // safe here — it's what lets the "Added to compare" toast include a real, clickable link to
    // compare.html without a second component.
    var toastTimer = null;
    function showToast(messageHtml) {
        var el = document.getElementById('ellora-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ellora-toast';
            el.className = 'ellora-toast';
            document.body.appendChild(el);
        }

        el.innerHTML = messageHtml;
        el.classList.add('is-visible');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            el.classList.remove('is-visible');
        }, 2500);
    }

    // ─── Wishlist button ────────────────────────────────────────────────
    //
    // Reuses the real authenticated wishlist API (server/routes/customer.js: GET/POST /wishlist,
    // DELETE /wishlist/:productId — the same one account-wishlist.js already calls through
    // ElloraAuth.apiFetch). No new endpoint.
    //
    // ElloraAuth.apiFetch() redirects to login.html itself whenever there's no session — correct
    // for the click handler (wishlisting requires login), but wrong for the page-load status
    // check: an anonymous shopper just browsing a product page must not get bounced to login.html
    // merely because this code tried to read their wishlist. So the load-time check calls
    // ElloraAuth.getSession() first (never redirects on its own) and only calls apiFetch() if a
    // session actually exists.
    function setWishlistState(btn, active) {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
    }

    function initWishlistButton(product) {
        var btn = document.getElementById('product-wishlist-btn');
        if (!btn || typeof ElloraAuth === 'undefined') return;

        ElloraAuth.getSession().then(function (session) {
            if (!session) return;
            return ElloraAuth.apiFetch('/wishlist').then(function (json) {
                var wishlist = (json && json.wishlist) || [];
                var wishlisted = wishlist.some(function (item) { return item.id === product.id; });
                setWishlistState(btn, wishlisted);
            });
        });

        btn.addEventListener('click', function (e) {
            e.preventDefault();

            ElloraAuth.getSession().then(function (session) {
                if (!session) {
                    window.location.href = 'login.html';
                    return;
                }

                if (btn.classList.contains('active')) {
                    ElloraAuth.apiFetch('/wishlist/' + product.id, { method: 'DELETE' }).then(function (json) {
                        if (!json || !json.success) return;
                        setWishlistState(btn, false);
                        showToast('Removed from wishlist');
                    });
                } else {
                    ElloraAuth.apiFetch('/wishlist', {
                        method: 'POST',
                        body: JSON.stringify({ product_id: product.id }),
                    }).then(function (json) {
                        if (!json || !json.success) return;
                        setWishlistState(btn, true);
                        showToast('Added to wishlist');
                    });
                }
            });
        });
    }

    // ─── Compare button ─────────────────────────────────────────────────
    //
    // Client-side only (js/ellora-compare.js, localStorage) — no backend. compare.html (js/
    // compare-page-dynamic.js) is where the list is actually viewed — the toasts below link there.
    var VIEW_COMPARE_LINK = ' <a href="compare.html">View compare</a>';

    function setCompareState(btn, active) {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-label', active ? 'Remove from compare' : 'Add to compare');
    }

    function initCompareButton(product) {
        var btn = document.getElementById('product-compare-btn');
        if (!btn || typeof ElloraCompare === 'undefined') return;

        setCompareState(btn, ElloraCompare.has(product.id));

        btn.addEventListener('click', function (e) {
            e.preventDefault();

            if (ElloraCompare.has(product.id)) {
                ElloraCompare.remove(product.id);
                setCompareState(btn, false);
                showToast('Removed from compare' + VIEW_COMPARE_LINK);
                return;
            }

            var result = ElloraCompare.add({
                id: product.id,
                slug: product.slug,
                name: product.name,
                image: product.image_url || '',
                price: product.base_price,
            });

            if (result.added) {
                setCompareState(btn, true);
                showToast('Added to compare' + VIEW_COMPARE_LINK);
            } else if (result.reason === 'full') {
                showToast('Remove an item to compare more (max ' + ElloraCompare.MAX + ')' + VIEW_COMPARE_LINK);
            }
        });
    }

    if (!slug) return;

    fetch(API_BASE + '/products/' + encodeURIComponent(slug))
        .then(function (res) {
            if (!res.ok) throw new Error('Product not found');
            return res.json();
        })
        .then(function (data) {
            var product = data.product;
            currentProduct = product;

            var price = EllroaCurrency.format(product.base_price);
            var compareAt = product.compare_at_price
                ? '<sub>' + EllroaCurrency.format(product.compare_at_price) + '</sub>'
                : '';

            document.title = product.name + ' - Ellora';
            document.getElementById('product-breadcrumb').textContent = product.name;
            document.getElementById('product-title').textContent = product.name;
            document.getElementById('product-category').textContent = product.category ? product.category.name : '';
            document.getElementById('product-description').textContent = product.description || '';
            document.getElementById('product-price').innerHTML = price + ' ' + compareAt;
            document.getElementById('product-sku').textContent = product.slug;
            document.getElementById('product-categories-detail').textContent = product.category ? product.category.name : 'Uncategorized';

            renderImages(product);
            renderVariantPicker(product);
            renderDescriptionTab(product);
            renderAdditionalInfo(product);
            renderReviews();
            loadRelatedProducts(product);
            initWishlistButton(product);
            initCompareButton(product);
        })
        .catch(function () {
            document.getElementById('product-title').textContent = 'Product not found';
            document.getElementById('product-description').textContent = 'This product could not be found.';
            var relatedSection = document.querySelector('.related-products');
            if (relatedSection) relatedSection.style.display = 'none';
        });
})();
