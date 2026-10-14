/* Willow Ember demo storefront — cart + UI logic.
   The discount engine (computeTotals) is a pure function implementing
   the store's real rules from its policy notes:
   - Candle Trio: 3+ full-size candles in cart -> 15% off those candles
   - GLOW10: 10% off the order (first-order code, entered in the field)
   - The two never combine: the better value applies
   - Shipping: $5.95, free when the subtotal is $50 or more
   No real checkout exists: the checkout button shows a demo notice. */
(function () {
  var KB = null;
  if (typeof WillowKB !== "undefined") KB = WillowKB;
  if (!KB && typeof require !== "undefined") {
    try { KB = require("./kb.js"); } catch (e) {}
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  /* items: [{ price, qty, isFullSizeCandle }] */
  function computeTotals(items, code) {
    var subtotal = 0, fullQty = 0, fullSubtotal = 0, count = 0;
    (items || []).forEach(function (it) {
      var line = it.price * it.qty;
      subtotal += line; count += it.qty;
      if (it.isFullSizeCandle) { fullQty += it.qty; fullSubtotal += line; }
    });
    subtotal = round2(subtotal);
    var trioDiscount = fullQty >= 3 ? round2(fullSubtotal * 0.15) : 0;
    var codeDiscount = (code && String(code).trim().toUpperCase() === "GLOW10")
      ? round2(subtotal * 0.10) : 0;
    var discount = Math.max(trioDiscount, codeDiscount);
    var discountLabel = "";
    if (discount > 0) {
      discountLabel = trioDiscount >= codeDiscount
        ? "Candle Trio — 15% off full-size candles"
        : "GLOW10 — 10% off";
    }
    var shipping = count === 0 ? 0 : (subtotal >= 50 ? 0 : 5.95);
    return {
      count: count,
      subtotal: subtotal,
      trioDiscount: trioDiscount,
      codeDiscount: codeDiscount,
      discount: discount,
      discountLabel: discountLabel,
      shipping: shipping,
      total: round2(subtotal - discount + shipping)
    };
  }

  var api = { computeTotals: computeTotals };
  if (typeof module !== "undefined") module.exports = api;
  if (typeof document === "undefined") return; /* Node: tests only */

  /* ---------------- Browser cart UI ---------------- */
  var bySku = {};
  KB.products.forEach(function (p) { bySku[p.sku] = p; });
  var cart = {}; /* sku -> qty */
  var appliedCode = "";

  function cartItems() {
    return Object.keys(cart).filter(function (s) { return cart[s] > 0; }).map(function (s) {
      return { sku: s, price: bySku[s].price, qty: cart[s], isFullSizeCandle: bySku[s].isFullSizeCandle };
    });
  }
  function count() { return cartItems().reduce(function (a, i) { return a + i.qty; }, 0); }
  window.WillowCart = { count: count, items: cartItems, totals: function () { return computeTotals(cartItems(), appliedCode); } };

  function fmt(n) { return "$" + n.toFixed(2); }
  var drawer = document.getElementById("cart-drawer");
  var backdrop = document.getElementById("cart-backdrop");
  var linesEl = document.getElementById("cart-lines");
  var countEls = document.querySelectorAll(".cart-count");

  function openCart() { drawer.hidden = false; backdrop.hidden = false; }
  function closeCart() { drawer.hidden = true; backdrop.hidden = true; }

  function render() {
    var items = cartItems();
    var t = computeTotals(items, appliedCode);
    countEls.forEach(function (el) { el.textContent = String(t.count); });
    if (!items.length) {
      linesEl.innerHTML = '<p class="cart-empty">Your cart is empty. Add a candle to try the demo discounts — 3 full-size candles trigger the Candle Trio.</p>';
    } else {
      linesEl.innerHTML = items.map(function (it) {
        var p = bySku[it.sku];
        return '<div class="cart-line">' +
          '<div class="cart-line-info"><strong>' + p.name + '</strong><span>' + fmt(p.price) + " each</span></div>" +
          '<div class="qty">' +
            '<button type="button" data-act="dec" data-sku="' + it.sku + '" aria-label="Decrease quantity">−</button>' +
            '<span>' + it.qty + '</span>' +
            '<button type="button" data-act="inc" data-sku="' + it.sku + '" aria-label="Increase quantity">+</button>' +
          '</div>' +
          '<div class="cart-line-total">' + fmt(p.price * it.qty) + '</div>' +
        '</div>';
      }).join("");
    }
    document.getElementById("ct-subtotal").textContent = fmt(t.subtotal);
    var dRow = document.getElementById("ct-discount-row");
    if (t.discount > 0) {
      dRow.hidden = false;
      document.getElementById("ct-discount-label").textContent = t.discountLabel;
      document.getElementById("ct-discount").textContent = "−" + fmt(t.discount);
    } else dRow.hidden = true;
    document.getElementById("ct-shipping").textContent =
      t.count === 0 ? "—" : (t.shipping === 0 ? "Free (subtotal $50+)" : fmt(t.shipping));
    document.getElementById("ct-total").textContent = fmt(t.total);
    var hint = document.getElementById("cart-hint");
    if (t.count > 0 && t.subtotal < 50) {
      hint.textContent = "You're " + fmt(50 - t.subtotal) + " of subtotal away from free standard shipping.";
      hint.hidden = false;
    } else hint.hidden = true;
  }

  document.addEventListener("click", function (ev) {
    var add = ev.target.closest("[data-add]");
    if (add) {
      var sku = add.getAttribute("data-add");
      cart[sku] = (cart[sku] || 0) + 1;
      render();
      add.textContent = "Added ✓";
      setTimeout(function () { add.textContent = "Add to Cart"; }, 1200);
      return;
    }
    var qtyBtn = ev.target.closest("[data-act]");
    if (qtyBtn) {
      var s = qtyBtn.getAttribute("data-sku");
      cart[s] = (cart[s] || 0) + (qtyBtn.getAttribute("data-act") === "inc" ? 1 : -1);
      if (cart[s] <= 0) delete cart[s];
      render();
    }
  });
  document.getElementById("cart-open").addEventListener("click", openCart);
  document.getElementById("cart-close").addEventListener("click", closeCart);
  backdrop.addEventListener("click", closeCart);
  document.getElementById("code-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var v = document.getElementById("code-input").value.trim().toUpperCase();
    var msg = document.getElementById("code-msg");
    if (v === "GLOW10") { appliedCode = v; msg.textContent = "GLOW10 applied — 10% off. If the Candle Trio is worth more, the better value is used instead."; }
    else if (!v) { appliedCode = ""; msg.textContent = ""; }
    else { appliedCode = ""; msg.textContent = "That code isn't in this demo store's data — the only code is GLOW10."; }
    render();
  });
  document.getElementById("checkout-btn").addEventListener("click", function () {
    document.getElementById("demo-notice").hidden = false;
  });
  render();
})();
