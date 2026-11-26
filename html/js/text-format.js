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

    function truncate(text, maxLen) {
        if (text.length <= maxLen) return text;
        var cut = text.slice(0, maxLen);
        var lastSpace = cut.lastIndexOf(' ');
        return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim() + '…';
    }

    // Beside the product image there's room for a one-line teaser and a handful of quick
    // highlights, not the whole description — that's what the "Product Description" tab further
    // down is for. Rather than a second field for the admin to keep in sync, this reads the same
    // plain-text blocks formatPlainText() already parses: the first block becomes the teaser, and
    // any later block that is a single "Label: detail" line (the shape every example description
    // in the catalogue already uses for its feature list, e.g. "Architectural Balcony Lift:
    // Straight-cut cups...") contributes just its label as a quick-glance highlight. A block that
    // doesn't fit either (a real multi-line <ul> block, or a line with no leading label) simply
    // isn't picked up as a highlight — the full text is still one click away, never lost.
    function summarize(raw, opts) {
        opts = opts || {};
        var maxLen = opts.maxLen || 220;
        var maxHighlights = opts.maxHighlights == null ? 5 : opts.maxHighlights;

        if (!raw || looksLikeHtml(raw)) {
            var plain = raw ? String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
            return { teaser: truncate(plain, maxLen), highlights: [], hasMore: plain.length > maxLen };
        }

        var blocks = String(raw).replace(/\r\n/g, '\n').split(/\n\s*\n/)
            .map(function (b) { return b.split('\n').map(function (l) { return l.trim(); }).filter(Boolean); })
            .filter(function (lines) { return lines.length > 0; });

        if (!blocks.length) return { teaser: '', highlights: [], hasMore: false };

        var introText = blocks[0].join(' ');
        var highlights = [];
        for (var i = 1; i < blocks.length && highlights.length < maxHighlights; i++) {
            if (blocks[i].length !== 1) continue;
            var line = blocks[i][0].replace(/^(\d+[.)]|[-*•])\s+/, '');
            var match = line.match(/^([^:]{3,45}):\s*(.+)$/);
            if (match) highlights.push(match[1].trim());
        }

        return {
            teaser: truncate(introText, maxLen),
            highlights: highlights,
            hasMore: blocks.length > 1 || introText.length > maxLen
        };
    }

    return {
        escapeHtml: escapeHtml,
        looksLikeHtml: looksLikeHtml,
        formatPlainText: formatPlainText,
        render: render,
        summarize: summarize
    };
})();
