/**
 * Ellora — Mega menu dynamic links + normalised cards
 */
document.addEventListener('DOMContentLoaded', function () {

    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';

    // ── 1. Rewrite collection links ─────────────────────────────────
    var tagMap = {
        'summer collection': 'summer',
        'winter collection': 'winter',
        'formal wear collection': 'formal',
        'luxury fashion collection': 'luxury',
        'accessories collection': 'accessories',
        'footwear collection': 'footwear'
    };

    document.querySelectorAll('.mega-menu-link a').forEach(function (link) {
        var tag = tagMap[link.textContent.trim().toLowerCase()];
        if (tag) link.href = '/tag/' + tag;
    });

    document.querySelectorAll('.mega-menu-item a').forEach(function (link) {
        if (link.getAttribute('href') !== '/products') return;
        var item = link.closest('.mega-menu-item');
        if (!item) return;
        var titleEl = item.querySelector('.mega-menu-item-content h2 a') || item.querySelector('.mega-menu-item-content h2');
        if (!titleEl) return;
        var title = titleEl.textContent.trim().toLowerCase();
        if (title === 'new arrivals') {
            link.href = '/tag/new-arrival';
            if (titleEl.tagName === 'A') titleEl.href = '/tag/new-arrival';
        } else if (title === 'summer collection') {
            link.href = '/tag/summer';
            if (titleEl.tagName === 'A') titleEl.href = '/tag/summer';
        }
    });

    // ── 2. Convert every big-offer-box into a normal card ───────────
    document.querySelectorAll('.mega-menu-item.big-offer-box').forEach(function (card) {
        card.classList.remove('big-offer-box');

        // Rebuild content to match normal card: <h2><a>Title</a></h2><p>Desc</p>
        var contentDiv = card.querySelector('.mega-menu-item-content');
        if (contentDiv) {
            var oldH2 = contentDiv.querySelector('h2');
            var oldTitle = oldH2 ? oldH2.textContent.trim() : 'Special Offers';
            var oldLink = (oldH2 && oldH2.querySelector('a'))
                ? oldH2.querySelector('a').getAttribute('href') : 'products.html';
            var oldH3 = contentDiv.querySelector('h3');
            var oldDesc = oldH3 ? oldH3.textContent.trim() : '';

            contentDiv.innerHTML = '';
            var h2 = document.createElement('h2');
            var a = document.createElement('a');
            a.href = oldLink || 'products.html';
            a.textContent = oldTitle || 'Special Offers';
            h2.appendChild(a);
            contentDiv.appendChild(h2);

            var p = document.createElement('p');
            p.textContent = oldDesc || 'Explore our latest deals and exclusive offers.';
            contentDiv.appendChild(p);
        }
    });

    // ── 3. Fetch mega_menu banners from API ──────────────────────────
    fetch(API_BASE + '/banners?placement=mega_menu')
        .then(function (r) { return r.json(); })
        .then(function (json) {
            var banners = json.banners || [];
            if (!banners.length) return;

            document.querySelectorAll('.mega-menu-items-list').forEach(function (list) {
                var cards = list.querySelectorAll('.mega-menu-item');
                banners.forEach(function (b, i) {
                    if (i >= cards.length) return;
                    var card = cards[i];
                    var img = card.querySelector('.mega-menu-item-image img');
                    var titleEl = card.querySelector('.mega-menu-item-content h2 a')
                        || card.querySelector('.mega-menu-item-content h2');
                    var descEl = card.querySelector('.mega-menu-item-content p');
                    var imgLink = card.querySelector('.mega-menu-item-image a');

                    if (img && b.image_url) { img.src = b.image_url; img.alt = b.title || ''; }
                    if (titleEl) {
                        titleEl.textContent = b.title || '';
                        if (titleEl.tagName === 'A') titleEl.href = b.link_url || 'products.html';
                    }
                    if (descEl && b.subtitle) descEl.textContent = b.subtitle;
                    if (imgLink && b.link_url) imgLink.href = b.link_url;
                });
            });
        })
        .catch(function () { });

    console.log('[Ellora] Mega menu ready');
});
