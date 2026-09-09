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
// ElloraRoute.param() tries the pretty path first, and falls back to the old
// query-string form — so a page still works if it's opened somewhere without
// the rewrite layer in front of it (e.g. directly off disk, or an old
// bookmarked ?slug= link).
window.ElloraRoute = {
    param: function (pathPattern, queryKey) {
        var match = window.location.pathname.match(pathPattern);
        if (match && match[1]) {
            return decodeURIComponent(match[1]);
        }
        return new URLSearchParams(window.location.search).get(queryKey);
    },
};
