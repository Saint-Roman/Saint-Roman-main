/**
 * Ellora — Homepage dynamic sections (all-in-one)
 *
 * ┌─────────────────────────────────┬────────────────────────────────────────┐
 * │ Admin panel                     │ Storefront section                     │
 * ├─────────────────────────────────┼────────────────────────────────────────┤
 * │ Categories (auto)               │ "Shop by Style Categories" circles     │
 * │ Products → tag: new-arrival     │ "Fresh Styles just Landed" cards       │
 * │ Banners → Best Offers           │ "Our Best Offers" cards                │
 * │ Products → tag: featured        │ "Discover Featured Products" grid      │
 * │ Categories (auto)               │ "Explore our latest collections" chips │
 * │ Banners → Promo Banners         │ Bottom special-offer large cards       │
 * │ Blog Posts (published)          │ "Follow us for daily style" cards      │
 * │ Testimonials + Settings         │ "Voices of our happy customers"        │
 * └─────────────────────────────────┴────────────────────────────────────────┘
 */

(function () {
    'use strict';

    var API = 'https://saint-roman-main.onrender.com/api/public';

    function get(path) {
        return fetch(API + path).then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        });
    }

    // See js/currency.js - EllroaCurrency.format() is the single shared price formatter.
    var formatPrice = EllroaCurrency.format;

    function discountPercent(base, compare) {
        if (!compare || compare <= base) return 0;
        return Math.round(((compare - base) / compare) * 100);
    }

    function productLink(product) {
        return product.slug
            ? '/product/' + encodeURIComponent(product.slug)
            : '#';
    }

    function categoryLink(cat) {
        return '/category/' + encodeURIComponent(cat.slug);
    }

    function noop() { }

    // ─── 1. Shop by Style Categories ────────────────────────────────────
    //
    // FIX #1: "15 Product" → real product count per category
    // Fetches all products, counts per category, updates the <p> text

    function loadCategories() {
        var items = document.querySelectorAll('.category-item');
        if (!items.length) return;

        // Fetch categories AND products (for counts)
        Promise.all([
            get('/categories'),
            get('/products?limit=48')
        ]).then(function (results) {
            var cats = results[0].categories || [];
            var products = results[1].products || [];

            // Count products per category slug
            var countMap = {};
            products.forEach(function (p) {
                if (p.category && p.category.slug) {
                    countMap[p.category.slug] = (countMap[p.category.slug] || 0) + 1;
                }
            });

            items.forEach(function (el, i) {
                if (i >= cats.length) {
                    el.style.display = 'none';
                    return;
                }
                var cat = cats[i];

                // Image
                var img = el.querySelector('.category-item-image img');
                if (img && cat.image_url) {
                    img.src = cat.image_url;
                    img.alt = cat.name;
                }

                // Name — h3 > a
                var nameEl = el.querySelector('.category-item-content h3 a');
                if (nameEl) {
                    nameEl.textContent = cat.name;
                    nameEl.href = categoryLink(cat);
                }

                // FIX #1: Product count — replace "15 Product" with real count
                var countEl = el.querySelector('.category-item-content p');
                if (countEl) {
                    var count = countMap[cat.slug] || 0;
                    countEl.textContent = count + (count === 1 ? ' Product' : ' Products');
                }

                // All links
                el.querySelectorAll('a').forEach(function (a) {
                    a.href = categoryLink(cat);
                });
            });
        }).catch(noop);
    }

    // ─── 2. New Arrivals ("Fresh Styles just Landed") ───────────────────
    //
    // FIX #2: Update product names (h3 > a inside .new-arrival-item-content)
    // FIX #3: Update "Read More" links to point to product page
    //
    // Tags in admin are stored as typed (e.g. "New Arrival" with space).
    // The API lowercases the query, so we send "new arrival" (with space).
    // Fallback: newest products if no tag matches.

    function loadNewArrivals() {
        var items = document.querySelectorAll('.new-arrival-item');
        if (!items.length) return;

        var count = items.length;

        // Try "new arrival" (space) first — matches admin tag "New Arrival"
        get('/products?tag=new%20arrival&limit=' + count).then(function (data) {
            var products = data.products || [];
            if (products.length === 0) {
                // Try hyphenated version
                return get('/products?tag=new-arrival&limit=' + count).then(function (d2) {
                    var p2 = d2.products || [];
                    if (p2.length === 0) {
                        // Final fallback: newest products
                        return get('/products?sort=newest&limit=' + count).then(function (d3) {
                            applyNewArrivals(items, d3.products || []);
                        });
                    }
                    applyNewArrivals(items, p2);
                });
            }
            applyNewArrivals(items, products);
        }).catch(noop);
    }

    function applyNewArrivals(items, products) {
        items.forEach(function (el, i) {
            if (i >= products.length) {
                el.style.display = 'none';
                return;
            }
            var p = products[i];

            // Image — inside .new-arrival-item-image figure img
            var img = el.querySelector('.new-arrival-item-image img');
            if (img && p.image_url) {
                img.src = p.image_url;
                img.alt = p.name || '';
            }

            // FIX #2: Title — h3 > a inside .new-arrival-item-content
            var title = el.querySelector('.new-arrival-item-content h3 a');
            if (title && p.name) {
                title.textContent = p.name;
            }

            // Build URLs
            var detailUrl = productLink(p);
            var catUrl = (p.category && p.category.slug)
                ? categoryLink(p.category)
                : 'products.html';

            // Image link → category page
            var imageLink = el.querySelector('.new-arrival-item-image > a');
            if (imageLink) imageLink.href = catUrl;

            // Title link → product detail page
            if (title) title.href = detailUrl;

            // FIX #3: "Read More" button → product detail page
            var readMore = el.querySelector('.readmore-btn');
            if (readMore) readMore.href = detailUrl;
        });
    }

    // ─── 3. Our Best Offers ─────────────────────────────────────────────

    function loadOfferBanners() {
        var container = document.querySelector('.best-offer-item-list');
        if (!container) return;

        get('/banners?placement=homepage_offer').then(function (data) {
            var banners = data.banners || [];
            if (!banners.length) return;

            container.innerHTML = '';

            banners.forEach(function (b, i) {
                var div = document.createElement('div');
                div.className = 'best-offer-item wow fadeInUp';
                if (i > 0) div.setAttribute('data-wow-delay', (i * 0.15) + 's');

                div.innerHTML =
                    '<div class="best-offer-item-image">' +
                    '<a href="' + (b.link_url || 'products.html') + '" data-cursor-text="View">' +
                    '<figure class="image-anime">' +
                    '<img src="' + (b.image_url || '') + '" alt="' + (b.title || '') + '">' +
                    '</figure>' +
                    '</a>' +
                    '</div>' +
                    '<div class="best-offer-item-content-box">' +
                    '<div class="best-offer-item-content">' +
                    (b.badge_text ? '<span>' + b.badge_text + '</span>' : '') +
                    '<h3>' + (b.title || '') + '</h3>' +
                    (b.subtitle ? '<p>' + b.subtitle + '</p>' : '') +
                    '</div>' +
                    '<div class="best-offer-item-button">' +
                    '<a href="' + (b.link_url || 'products.html') + '" class="btn-default">Get Offer</a>' +
                    '</div>' +
                    '</div>';

                container.appendChild(div);
            });

            if (typeof WOW !== 'undefined') new WOW().init();
        }).catch(noop);
    }

    // ─── 4. Featured Products ("Discover featured products") ────────────
    //
    // FIX #4: Properly hide extra template cards after Isotope destroy.
    // Uses exact selectors: .product-item-image img, h2.product-item-title a,
    // .product-item-price

    function loadFeaturedProducts() {
        var container = document.querySelector('.product-item-list');
        if (!container) return;

        get('/products?tag=featured&limit=12').then(function (data) {
            var products = data.products || [];
            if (products.length === 0) {
                return get('/products?limit=12').then(function (d) {
                    applyFeatured(container, d.products || []);
                });
            }
            applyFeatured(container, products);
        }).catch(noop);
    }

    function applyFeatured(container, products) {
        var items = container.querySelectorAll('.product-item-box');

        // Collect categories for filter tabs
        var catMap = {};
        products.forEach(function (p) {
            if (p.category && p.category.slug) {
                catMap[p.category.slug] = p.category.name;
            }
        });

        // Update product cards
        items.forEach(function (el, i) {
            if (i >= products.length) return; // hidden after Isotope destroy
            var p = products[i];

            // Image — .product-item-image img
            var img = el.querySelector('.product-item-image img');
            if (img && p.image_url) {
                img.src = p.image_url;
                img.alt = p.name || '';
            }

            // Title — h2.product-item-title > a
            var title = el.querySelector('.product-item-title a') ||
                el.querySelector('.product-item-title');
            if (title && p.name) title.textContent = p.name;

            // Price — .product-item-price
            var priceEl = el.querySelector('.product-item-price');
            if (priceEl && p.base_price) {
                var html = formatPrice(p.base_price);
                if (p.compare_at_price && p.compare_at_price > p.base_price) {
                    html += ' <del>' + formatPrice(p.compare_at_price) + '</del>';
                }
                priceEl.innerHTML = html;
            }

            // Discount badge
            var disc = discountPercent(p.base_price, p.compare_at_price);
            var badge = el.querySelector('.product-item-tag span');
            if (badge) {
                if (disc > 0) {
                    badge.textContent = 'Save ' + disc + '%';
                    if (badge.parentElement) badge.parentElement.style.display = '';
                } else {
                    if (badge.parentElement) badge.parentElement.style.display = 'none';
                }
            }

            // Links
            var url = productLink(p);
            el.querySelectorAll('a').forEach(function (a) {
                var href = a.getAttribute('href');
                if (!href || href === '#' || href.indexOf('product-single') !== -1) {
                    a.href = url;
                }
            });

            // Isotope filter class
            var oldClasses = ['women', 'men', 'accessories', 'footwear', 'beauty_care'];
            oldClasses.forEach(function (c) { el.classList.remove(c); });
            if (p.category && p.category.slug) {
                el.classList.add(p.category.slug.replace(/[^a-z0-9]/g, '-'));
            }
        });

        // Rebuild filter nav tabs
        var filterNav = document.querySelector('.our-product-filter-nav ul');
        if (filterNav && Object.keys(catMap).length > 0) {
            filterNav.innerHTML = '<li><a href="#" class="active-btn" data-filter="*">All</a></li>';
            Object.keys(catMap).forEach(function (slug) {
                var filterClass = slug.replace(/[^a-z0-9]/g, '-');
                var li = document.createElement('li');
                li.innerHTML = '<a href="#" data-filter=".' + filterClass + '">' + catMap[slug] + '</a>';
                filterNav.appendChild(li);
            });
        }

        // FIX #4: Destroy Isotope, THEN hide extras, THEN bind filter clicks
        var productCount = products.length;
        if (typeof jQuery !== 'undefined') {
            setTimeout(function () {
                try {
                    var $grid = jQuery('.product-item-list');
                    if ($grid.data('isotope')) {
                        $grid.isotope('destroy');
                    }
                } catch (e) { }

                // Now hide extras and fix visible items
                var allItems = container.querySelectorAll('.product-item-box');
                allItems.forEach(function (el, i) {
                    if (i >= productCount) {
                        el.style.display = 'none';
                    } else {
                        el.style.display = '';
                        el.style.position = 'relative';
                        el.style.opacity = '1';
                    }
                });

                // Bind filter clicks with a smooth fade/scale transition
                if (filterNav) {
                    var TRANSITION_MS = 280;
                    var allLinks = filterNav.querySelectorAll('a');
                    allLinks.forEach(function (a) {
                        a.addEventListener('click', function (e) {
                            e.preventDefault();
                            if (a.classList.contains('active-btn')) return; // no-op on same tab

                            allLinks.forEach(function (link) { link.classList.remove('active-btn'); });
                            a.classList.add('active-btn');

                            var filterValue = a.getAttribute('data-filter');
                            var filterClass = filterValue === '*' ? null : filterValue.replace('.', '');

                            var toShow = [];
                            var toHide = [];
                            allItems.forEach(function (item, idx) {
                                if (idx >= productCount) { toHide.push(item); return; }
                                var matches = filterValue === '*' || item.classList.contains(filterClass);
                                (matches ? toShow : toHide).push(item);
                            });

                            // Phase 1: fade + shrink whatever is currently visible and leaving
                            toHide.forEach(function (item) {
                                if (item.style.display !== 'none') {
                                    item.style.opacity = '0';
                                    item.style.transform = 'scale(0.92)';
                                }
                            });

                            setTimeout(function () {
                                // Phase 2: remove the leaving items from flow, prep the entering ones (still invisible)
                                toHide.forEach(function (item) { item.style.display = 'none'; });
                                toShow.forEach(function (item) {
                                    item.style.display = '';
                                    item.style.opacity = '0';
                                    item.style.transform = 'scale(0.92)';
                                });

                                // Force a reflow so the browser registers the start state before transitioning
                                void container.offsetHeight;

                                // Phase 3: fade + scale the matching items in, with a light stagger
                                toShow.forEach(function (item, i) {
                                    setTimeout(function () {
                                        item.style.opacity = '1';
                                        item.style.transform = 'scale(1)';
                                    }, i * 45);
                                });
                            }, TRANSITION_MS);
                        });
                    });
                }
            }, 500);
        }
    }

    // ─── 5. Collections ("Explore our latest collections") ──────────────

    function loadCollections() {
        var items = document.querySelectorAll('.collection-item-list ul li');
        if (!items.length) return;

        get('/categories').then(function (data) {
            var cats = data.categories || [];

            items.forEach(function (el, i) {
                if (i >= cats.length) {
                    el.style.display = 'none';
                    return;
                }
                var cat = cats[i];

                var img = el.querySelector('img');
                if (img && cat.image_url) {
                    img.src = cat.image_url;
                    img.alt = cat.name;
                }

                // Replace text node after img
                var textNodes = Array.from(el.childNodes).filter(function (n) {
                    return n.nodeType === 3;
                });
                if (textNodes.length > 0 && cat.name) {
                    textNodes[textNodes.length - 1].textContent = cat.name;
                }

                // Make the item clickable — it was never linked to anything before
                el.style.cursor = 'pointer';
                el.onclick = function () {
                    window.location.href = categoryLink(cat);
                };
            });
        }).catch(noop);
    }

    // ─── 6. Bottom Promo Banners ("Special Offers") ─────────────────────

    function loadPromoBanners() {
        var items = document.querySelectorAll('.special-discount-item');
        if (!items.length) return;

        get('/banners?placement=homepage_promo').then(function (data) {
            var banners = data.banners || [];

            items.forEach(function (el, i) {
                if (i >= banners.length) return;
                var b = banners[i];

                var img = el.querySelector('.special-discount-item-image img');
                if (img && b.image_url) {
                    img.src = b.image_url;
                    img.alt = b.title || '';
                }

                if (b.title) {
                    var t = el.querySelector('.section-title h2');
                    if (t) t.textContent = b.title;
                }

                if (b.subtitle) {
                    var p = el.querySelector('.section-title p');
                    if (p) p.textContent = b.subtitle;
                }

                if (b.badge_text) {
                    var badge = el.querySelector('.section-sub-title');
                    if (badge) badge.textContent = b.badge_text;
                }

                if (b.link_url) {
                    el.querySelectorAll('a').forEach(function (a) {
                        a.href = b.link_url;
                    });
                }
            });
        }).catch(noop);
    }

    // ─── 7. Blog ("Follow us for daily style") ───────────────────────────

    function formatDate(value) {
        if (!value) return '';
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function loadBlogPosts() {
        var items = document.querySelectorAll('.our-blog .post-item');
        if (!items.length) return;

        get('/blog-posts?limit=' + items.length).then(function (data) {
            var posts = data.posts || [];

            items.forEach(function (el, i) {
                if (i >= posts.length) {
                    var col = el.closest('.col-xl-4');
                    if (col) col.style.display = 'none';
                    return;
                }
                var post = posts[i];
                var href = '/blog/' + encodeURIComponent(post.slug);

                var img = el.querySelector('.post-featured-image img');
                if (img) {
                    img.src = post.featured_image_url || 'images/post-1.jpg';
                    img.alt = post.title || '';
                }

                var title = el.querySelector('.post-item-content h2 a');
                if (title && post.title) title.textContent = post.title;

                var dateEl = el.querySelector('.post-item-meta li');
                if (dateEl) {
                    dateEl.innerHTML = '<i class="fa-regular fa-calendar-days"></i>' + formatDate(post.published_at || post.created_at);
                }

                el.querySelectorAll('a').forEach(function (a) { a.href = href; });
            });
        }).catch(noop);
    }

    // ─── 8. Testimonials ("Voices of our happy customers") ──────────────
    //
    // Three things driven off the same /testimonials + /settings fetch:
    //   - the .testimonial-slider swiper slides (cloned from the first slide, one per testimonial)
    //   - the 3 .satisfy-client-images avatars (first 3 testimonials)
    //   - the star-rating counter/label (average of every testimonial's rating)
    // Falls back to the static markup untouched if there are no active testimonials yet, same as
    // every other section here.

    function avgRating(testimonials) {
        var sum = testimonials.reduce(function (s, t) { return s + (Number(t.rating) || 0); }, 0);
        return sum / testimonials.length;
    }

    function buildTestimonialSlide(template, testimonial) {
        var slide = template.cloneNode(true);

        var quote = slide.querySelector('.testimonial-item-content p');
        if (quote) quote.textContent = '“' + testimonial.quote + '”';

        var img = slide.querySelector('.testimonial-author-image img');
        if (img) {
            img.src = testimonial.author_image_url || 'images/author-1.jpg';
            img.alt = testimonial.author_name || '';
        }

        var name = slide.querySelector('.testimonial-author-content h2');
        if (name) name.textContent = testimonial.author_name || '';

        var role = slide.querySelector('.testimonial-author-content p');
        if (role) role.textContent = testimonial.author_role || '';

        return slide;
    }

    function applyTestimonialSlider(testimonials) {
        var wrapper = document.querySelector('.testimonial-slider .swiper-wrapper');
        if (!wrapper) return;

        var swiperEl = document.querySelector('.testimonial-slider .swiper');
        // Swiper 6+ stores the live instance directly on the element it was initialized on
        // (js/function.js already ran a Swiper() on this element, loop:true included, by the
        // time this file loads — see the <script> order in index.html). Loop mode clones extra
        // slides into the wrapper at init, so destroy() has to run BEFORE reading a template
        // slide out of the wrapper — destroy(true, true) is what removes those clones and
        // restores the wrapper to its original 3-slide markup; grabbing a "first slide" before
        // that could just as easily grab one of Swiper's own duplicated clones instead of the
        // real authored one. Same "destroy the plugin instance before mutating, then rebuild it"
        // approach the Isotope product grid above uses.
        if (swiperEl && swiperEl.swiper) {
            swiperEl.swiper.destroy(true, true);
        }

        var template = wrapper.querySelector('.swiper-slide');
        if (!template) return;

        wrapper.innerHTML = '';
        testimonials.forEach(function (t) {
            wrapper.appendChild(buildTestimonialSlide(template, t));
        });

        if (typeof Swiper !== 'undefined' && swiperEl) {
            new Swiper('.testimonial-slider .swiper', {
                slidesPerView: 1,
                speed: 1500,
                spaceBetween: 30,
                loop: true,
                autoplay: {
                    delay: 5000,
                },
                pagination: {
                    el: '.testimonial-pagination',
                    clickable: true,
                },
                navigation: {
                    nextEl: '.testimonial-button-next',
                    prevEl: '.testimonial-button-prev',
                },
                breakpoints: {
                    768: {
                        slidesPerView: 2,
                    },
                }
            });
        }

        if (typeof WOW !== 'undefined') new WOW().init();
    }

    function applySatisfyClientImages(testimonials) {
        var avatars = document.querySelectorAll('.satisfy-client-images .satisfy-client-image:not(.add-more) img');
        avatars.forEach(function (img, i) {
            if (i >= testimonials.length) return;
            var t = testimonials[i];
            if (t.author_image_url) {
                img.src = t.author_image_url;
                img.alt = t.author_name || '';
            }
        });
    }

    function applyTestimonialRating(testimonials) {
        var box = document.querySelector('.testimonial-client-box-content');
        if (!box || testimonials.length === 0) return;

        var rating = avgRating(testimonials).toFixed(1);

        var counter = box.querySelector('.counter');
        if (counter) counter.textContent = rating;

        var label = box.querySelector('p');
        if (label) label.textContent = rating + ' / 5 Ratings';
    }

    function applyTestimonialBackground(settings) {
        var section = document.querySelector('.our-testimonials');
        if (!section || !settings || !settings.testimonial_bg_image_url) return;
        section.style.backgroundImage = 'url("' + settings.testimonial_bg_image_url + '")';
    }

    function loadTestimonials() {
        if (!document.querySelector('.our-testimonials')) return;

        Promise.all([
            get('/testimonials'),
            get('/settings')
        ]).then(function (results) {
            var testimonials = results[0].testimonials || [];
            var settings = results[1].settings || {};

            if (testimonials.length > 0) {
                applyTestimonialSlider(testimonials);
                applySatisfyClientImages(testimonials);
                applyTestimonialRating(testimonials);
            }

            applyTestimonialBackground(settings);
        }).catch(noop);
    }

    // ─── Boot ───────────────────────────────────────────────────────────

    loadCategories();
    loadNewArrivals();
    loadOfferBanners();
    loadFeaturedProducts();
    loadCollections();
    loadPromoBanners();
    loadBlogPosts();
    loadTestimonials();

})();
