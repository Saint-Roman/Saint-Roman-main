// Shared plain-text -> HTML formatter for admin-authored content stored as plain <Textarea>
// text (no rich-text editor anywhere yet — see admin/src/pages/BlogPostsPage.tsx and the
// Description field in ProductsPage.tsx). Dumping raw text into innerHTML as a single string
// collapses every blank line and list item into one run-on paragraph, because HTML ignores
// literal newlines. Used by blog-single-dynamic.js and product-single-dynamic.js so both match
// exactly what the admin typed: a blank line starts a new paragraph, and any block of 2+
// consecutive non-blank lines becomes a real <ul><li> list (with an optional "1." / "-" / "*"
// marker stripped, since some authors type one and some just write one item per line — either
// way it's still "2+ lines together", so it renders as a real bulleted list, not literal markers
// glued into one sentence).
var EllroaText = (function () {
    function escapeHtml(str) {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // If the stored value already contains real markup (e.g. a future rich-text editor), pass it
    // straight through instead of escaping/reformatting it as if it were plain text.
    function looksLikeHtml(str) {
        return /<\/?(p|h[1-6]|ul|ol|li|blockquote|strong|em|br|div|span|a)[\s>]/i.test(str);
    }

    function formatPlainText(raw) {
        var blocks = String(raw).replace(/\r\n/g, '\n').split(/\n\s*\n/);
        return blocks
            .map(function (block) {
                var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
                if (!lines.length) return '';

                if (lines.length > 1) {
                    var items = lines
                        .map(function (l) { return '<li>' + escapeHtml(l.replace(/^(\d+[.)]|[-*•])\s+/, '')) + '</li>'; })
                        .join('');
                    return '<ul>' + items + '</ul>';
                }

                return '<p>' + escapeHtml(lines[0]) + '</p>';
            })
            .join('');
    }

    function render(raw, emptyMessage) {
        if (!raw) return '<p>' + escapeHtml(emptyMessage || 'Nothing to show yet.') + '</p>';
        return looksLikeHtml(raw) ? raw : formatPlainText(raw);
    }

    return { escapeHtml: escapeHtml, looksLikeHtml: looksLikeHtml, formatPlainText: formatPlainText, render: render };
})();
