/**
 * Ellora — Hero banner slider
 *
 * Converts the static hero section into a dynamic Swiper carousel.
 * Banners are fetched from admin → Banners → "Show on: Hero Slider"
 *
 * How it works (like Flipkart/Myntra/Nykaa):
 *   1. Admin uploads full-width banner images with a link URL
 *   2. This script fetches those banners and builds a Swiper slider
 *   3. Auto-rotates every 4 seconds, with dots + arrows
 *   4. Each slide is clickable → goes to the link URL
 *
 * Drop this file into html/js/ and add before </body>:
 *   <script src="js/homepage-hero-dynamic.js"></script>
 */

(function () {
    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';

    var heroEl = document.querySelector('.hero');
    if (!heroEl) return;

    fetch(API_BASE + '/banners?placement=homepage_hero')
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var banners = data.banners || [];
            if (banners.length === 0) return; // keep the existing static hero

            // Build Swiper HTML
            var slidesHtml = banners.map(function (b) {
                var linkUrl = b.link_url || '#';
                var imageUrl = b.image_url || '';
                var alt = b.title || 'Banner';

                return '' +
                    '<div class="swiper-slide">' +
                    '  <a href="' + linkUrl + '">' +
                    '    <img src="' + imageUrl + '" alt="' + alt + '" ' +
                    '         style="width:100%; height:100%; object-fit:cover; display:block;">' +
                    '  </a>' +
                    '</div>';
            }).join('');

            // Replace hero content with Swiper slider
            heroEl.className = 'hero-banner-slider';
            heroEl.style.cssText = 'width:100%; overflow:hidden; position:relative;';
            heroEl.innerHTML = '' +
                '<div class="swiper hero-swiper" style="width:100%;">' +
                '  <div class="swiper-wrapper">' +
                slidesHtml +
                '  </div>' +
                '  <div class="swiper-pagination"></div>' +
                '  <div class="swiper-button-prev"></div>' +
                '  <div class="swiper-button-next"></div>' +
                '</div>';

            // Initialize Swiper (library is already loaded on the page)
            if (typeof Swiper !== 'undefined') {
                new Swiper('.hero-swiper', {
                    loop: banners.length > 1,
                    autoplay: {
                        delay: 4000,
                        disableOnInteraction: false,
                    },
                    pagination: {
                        el: '.hero-swiper .swiper-pagination',
                        clickable: true,
                    },
                    navigation: {
                        nextEl: '.hero-swiper .swiper-button-next',
                        prevEl: '.hero-swiper .swiper-button-prev',
                    },
                    speed: 600,
                    effect: 'slide',
                });
            }
        })
        .catch(function () {
            // keep the existing static hero on error
        });
})();
