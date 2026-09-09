// Minimal client-side cart for the Ellora storefront. localStorage is still the only source of
// truth this file itself reads from — checkout (POST /api/public/orders) uses get() directly, not
// the server sync below. save() also fires a debounced best-effort sync to POST
// /api/customer/cart purely so the admin Abandoned Carts page can see who has items sitting in
// their cart, since the backend otherwise has zero visibility into carts at all.
window.EllroaCart = (function () {
  var KEY = 'ellora_cart';
  var syncTimer = null;

  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    scheduleSync();
  }

  // Debounced so rapid +/- quantity clicks don't fire a request per click. Silently does nothing
  // if auth.js isn't loaded on this page, there's no logged-in session, or the request fails —
  // this is telemetry for the admin panel, never something the shopper's flow depends on.
  function scheduleSync() {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(doSync, 800);
  }

  async function doSync() {
    if (!window.ElloraAuth || typeof window.ElloraAuth.getSession !== 'function') return;

    var session;
    try {
      session = await window.ElloraAuth.getSession();
    } catch (e) {
      return;
    }
    if (!session) return;

    var items = get().map(function (i) {
      return { variant_id: i.variantId, quantity: i.quantity };
    });

    try {
      await fetch(window.ElloraAuth.apiBase + '/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token,
        },
        body: JSON.stringify({ items: items }),
      });
    } catch (e) {
      // Network error, server down, whatever — never surface this to the shopper.
    }
  }

  function add(item) {
    var items = get();
    var existing = items.filter(function (i) { return i.variantId === item.variantId; })[0];
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      items.push(item);
    }
    save(items);
  }

  function updateQuantity(variantId, quantity) {
    var items = get()
      .map(function (i) {
        if (i.variantId !== variantId) return i;
        var copy = {};
        for (var k in i) copy[k] = i[k];
        copy.quantity = quantity;
        return copy;
      })
      .filter(function (i) { return i.quantity > 0; });
    save(items);
  }

  function remove(variantId) {
    save(get().filter(function (i) { return i.variantId !== variantId; }));
  }

  function clear() {
    save([]);
  }

  function subtotal() {
    return get().reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
  }

  return { get: get, add: add, updateQuantity: updateQuantity, remove: remove, clear: clear, subtotal: subtotal };
})();
