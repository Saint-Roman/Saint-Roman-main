// Minimal client-side cart for the Saint Roman storefront. No server-side cart table —
// state lives in localStorage until checkout, when it's sent to POST /api/public/orders.
window.EllroaCart = (function () {
  var KEY = 'saint_roman_cart';

  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
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
