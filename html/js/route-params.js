// Small shared helper for the storefront's "pretty URL" pages (product-single,
// products category/tag, blog-single, account-order-details, order-received).
//
// The rewrite layer (scripts/storefront-rewrite-middleware.js, wired into
// browser-sync via bs-config.js/bs-config.dist.js) rewrites a clean path like
// /product/rcb-tshirt to product-single.html *server-side* — window.location
// itself is untouched, so the browser still shows /product/rcb-tshirt. That
// means the old `URLSearchParams(location.search).get('slug')` no longer
// finds anything; the slug is now a path segment, not a query param.
//
// SaintRomanRoute.param() tries the pretty path first, and falls back to the old
// query-string form — so a page still works if it's opened somewhere without
// the rewrite layer in front of it (e.g. directly off disk, or an old
// bookmarked ?slug= link).
window.SaintRomanRoute = {
    param: function (pathPattern, queryKey) {
        var match = window.location.pathname.match(pathPattern);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
        return new URLSearchParams(window.location.search).get(queryKey);
    },
};

// Turns a URL slug into display text for breadcrumbs / hero titles when the real
// name from the API isn't available (yet, or at all).
//
// Naive title-casing gets possessives wrong: the categories are stored as
// "Women's Fashion" / "Men's Fashion", but their slugs drop the apostrophe and
// leave a bare "s" token ("women-s-fashion"), which renders as a separate word —
// "Women S Fashion". Title-case first, then glue a lone trailing "S" back onto
// the word before it. The heuristic is safe for every slug this storefront uses
// (a real one-letter "s" word doesn't occur); single-letter facet values like a
// size "S" are untouched, since there's no preceding word to attach to.
window.SaintRomanRoute.label = function (slug) {
    return String(slug == null ? '' : slug)
        .replace(/[-_]+/g, ' ')
        .trim()
        .replace(/\b\w/g, function (c) { return c.toUpperCase(); })
        .replace(/\b([A-Za-z]+) S\b/g, "$1's");
};
