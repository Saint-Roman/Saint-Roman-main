// Wires html/testimonials.html to the real testimonials managed in the Ellora admin panel
// (server/routes/public.js: GET /api/public/testimonials), following the project's convention
// for dynamic pages (product-single-dynamic.js, blog-single-dynamic.js, homepage-dynamic-sections.js).
//
// The page's .page-testimonials grid was 6 hardcoded blocks. The first block is kept as the
// clone template; if fewer than 6 testimonials are active the extra static blocks are hidden,
// if more than 6 exist extra blocks are appended — same "clone a real template, don't invent
// markup" approach product-single-dynamic.js uses for related products.
(function () {
    var API_BASE = 'https://saint-roman-main.onrender.com/api/public';

    // Matches the wow-delay stagger already on the 6 static blocks (0s, 0.2s, ... 1s); cycles
    // for however many testimonials actually render.
    var DELAYS = ['0s', '0.2s', '0.4s', '0.6s', '0.8s', '1s'];

    function buildTestimonialBlock(template, testimonial, delay) {
        var block = template.cloneNode(true);

        var item = block.querySelector('.testimonial-item');
        if (item) {
            if (delay === '0s') {
                item.removeAttribute('data-wow-delay');
            } else {
                item.setAttribute('data-wow-delay', delay);
            }
        }

        var quote = block.querySelector('.testimonial-item-content p');
        if (quote) quote.textContent = '“' + testimonial.quote + '”';

        var img = block.querySelector('.testimonial-author-image img');
        if (img) {
            img.src = testimonial.author_image_url || 'images/author-1.jpg';
            img.alt = testimonial.author_name || '';
        }

        var name = block.querySelector('.testimonial-author-content h2');
        if (name) name.textContent = testimonial.author_name || '';

        var role = block.querySelector('.testimonial-author-content p');
        if (role) role.textContent = testimonial.author_role || '';

        return block;
    }

    function applyTestimonials(testimonials) {
        var row = document.querySelector('.page-testimonials .row');
        if (!row) return;

        var blocks = row.querySelectorAll('.col-xl-4.col-md-6');
        if (!blocks.length) return;

        var template = blocks[0];

        testimonials.forEach(function (t, i) {
            var delay = DELAYS[i % DELAYS.length];
            if (i < blocks.length) {
                var current = blocks[i];
                var replacement = buildTestimonialBlock(template, t, delay);
                current.parentNode.replaceChild(replacement, current);
            } else {
                row.appendChild(buildTestimonialBlock(template, t, delay));
            }
        });

        // Fewer testimonials than static blocks — hide the leftovers instead of leaving stale
        // placeholder content on the page.
        var allBlocks = row.querySelectorAll('.col-xl-4.col-md-6');
        allBlocks.forEach(function (block, i) {
            block.style.display = i < testimonials.length ? '' : 'none';
        });

        if (typeof WOW !== 'undefined') new WOW().init();
    }

    fetch(API_BASE + '/testimonials')
        .then(function (r) {
            if (!r.ok) throw new Error(r.status);
            return r.json();
        })
        .then(function (data) {
            var testimonials = data.testimonials || [];
            if (testimonials.length === 0) return;
            applyTestimonials(testimonials);
        })
        .catch(function () { });
})();
