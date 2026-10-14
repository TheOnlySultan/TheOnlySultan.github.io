/* Willow Ember demo assistant — deterministic client-side matcher.
   The core `answer(question, context)` function is pure: same input,
   same output, no network, no randomness. It only ever states facts
   from kb.js. Anything unknown — including the five known gaps in the
   source data — returns { fallback: true } so the widget can offer
   lead capture instead of an invented answer. */
(function () {
  var KB = null;
  if (typeof WillowKB !== "undefined") KB = WillowKB;
  if (!KB && typeof require !== "undefined") {
    try { KB = require("./kb.js"); } catch (e) { /* browser without kb.js */ }
  }
  if (!KB && typeof module !== "undefined") KB = null;

  var FALLBACK_TEXT =
    "I don't have that confirmed in this demo store's data, so I won't guess — " +
    "that's one for the store owner to check. If you'd like, leave your email " +
    "below to see the demo lead-capture card — in this demo nothing is sent or stored.";

  function money(n) { return "$" + Number(n).toFixed(2).replace(/\.00$/, ""); }
  function has(q, words) {
    for (var i = 0; i < words.length; i++) if (q.indexOf(words[i]) !== -1) return true;
    return false;
  }
  function findProduct(q) {
    if (!KB) return null;
    for (var i = 0; i < KB.products.length; i++) {
      var p = KB.products[i];
      for (var j = 0; j < p.aliases.length; j++) {
        if (q.indexOf(p.aliases[j]) !== -1) return p;
      }
    }
    return null;
  }
  function ok(text, intent) { return { text: text, fallback: false, intent: intent }; }
  function fb(intent) { return { text: FALLBACK_TEXT, fallback: true, intent: intent || "fallback" }; }

  function productAnswer(p, q) {
    var asksPrice = has(q, ["price", "cost", "how much"]);
    var asksBurn = has(q, ["burn", "how long", "last"]);
    var asksScent = has(q, ["scent", "smell", "notes", "fragrance"]);
    var asksCompare = has(q, ["compare", "compare-at", "original price", "was it", "rrp", "msrp"]);

    if (asksCompare) {
      if (p.compareAt) return ok(p.name + " is " + money(p.price) + ", with a compare-at price of " + money(p.compareAt) + ".", "product-compare");
      return fb("gap-compare-at"); /* e.g. Beeswax Pillar — no compare-at exists */
    }
    if (asksScent) {
      if (p.sku === "WEC-DIS-4") return fb("gap-discovery-scents");
      if (!p.scentNotes) return fb("gap-scent-notes"); /* Room Spray */
      return ok(p.name + " — scent notes: " + p.scentNotes, "product-scent");
    }
    if (asksBurn) {
      if (p.burnTime) return ok(p.name + " — " + p.burnTime.toLowerCase() + ".", "product-burn");
      return ok(p.name + " doesn't have a burn time — it's not a candle. It costs " + money(p.price) + " for " + p.size + ".", "product-burn");
    }
    if (asksPrice) {
      var t = p.name + " costs " + money(p.price);
      if (p.compareAt) t += " (compare-at " + money(p.compareAt) + ")";
      return ok(t + ". Size: " + p.size + ".", "product-price");
    }
    /* General product summary — only facts that exist. */
    var parts = [p.name + " — " + money(p.price) + (p.compareAt ? " (compare-at " + money(p.compareAt) + ")" : "") + ", " + p.size + "."];
    if (p.burnTime) parts.push(p.burnTime + ".");
    if (p.sku === "WEC-DIS-4") parts.push("It's a seasonal assortment — the scents change with the season.");
    else if (p.scentNotes) parts.push("Scent notes: " + p.scentNotes);
    return ok(parts.join(" "), "product");
  }

  function answer(rawQuestion, context) {
    var q = (" " + String(rawQuestion || "").toLowerCase().replace(/\s+/g, " ") + " ").trim();
    if (!KB) return fb("no-kb");
    if (!q) return ok("Ask me about any product, shipping, returns or discounts — everything I say comes from this demo store's data.", "empty");

    /* 1 — Health / wellness claims: never make them, ever. */
    if (has(q, ["anxiety", "anxious", "insomnia", "depression", "cure", "heal", "treat", "therapy", "therapeutic", "health benefit", "help me sleep", "sleep better", "stress relief", "relieve stress"])) {
      return ok("We don't make health or wellness claims — our candles don't cure, heal or treat anything, so I can't say a candle will help with that. They're made to scent a room and feel cosy. If you'd like, I can help you pick one by scent instead.", "health-claim");
    }

    /* 2 — Express shipping: known gap. */
    if (has(q, ["express", "overnight", "next day", "next-day", "faster shipping", "rush shipping", "expedited"])) {
      return fb("gap-express");
    }

    /* 3 — Product-specific gaps + facts (checked before generic intents
          so "what scents are in the discovery set" can't fall through). */
    var product = findProduct(q);
    if (product) {
      if (product.sku === "WEC-DIS-4" && has(q, ["scent", "which", "what's in", "what is in", "include", "flavour", "flavor"])) return fb("gap-discovery-scents");
      if (product.sku === "WEC-LIN-S" && has(q, ["scent", "smell", "notes", "fragrance"])) return fb("gap-room-spray-scents");
      if (has(q, ["flip"]) && product.sku === "WEC-FIG-D") return ok(KB.care.diffuser, "diffuser-use");
      if ((has(q, ["bath", "soak", "tub"])) && product.sku === "WEC-EUC-4") return ok(KB.care.steamers, "steamer-use");
      return productAnswer(product, q);
    }

    /* 4 — Returns. Opened/burned is a known gap and must be checked
          before the general returns policy; "unopened" must not trip it. */
    if (has(q, ["burned", "burnt"]) || (has(q, ["opened", "used", "lit "]) && !has(q, ["unopened"]))) {
      if (has(q, ["return", "refund", "send back", "exchange", "burned", "burnt"])) return fb("gap-opened-returns");
    }
    if (has(q, ["damaged", "broken", "defective", "arrived damaged", "cracked"])) {
      return ok(KB.returns.damaged + " Email: " + KB.store.email + ".", "returns-damaged");
    }
    if (has(q, ["return", "refund", "send back", "exchange"])) {
      return ok(KB.returns.unopened + " " + KB.returns.damaged, "returns");
    }

    /* 5 — Shipping. */
    if (has(q, ["ship", "delivery", "deliver", "postage", "arrive", "how long does shipping", "international", "canada", "outside the us", "abroad"])) {
      if (has(q, ["international", "canada", "abroad", "outside", "another country", "overseas"])) {
        return ok("We only ship inside the US at the moment — no international shipping yet. " + KB.shipping.packTime + ", and " + KB.shipping.deliveryTime.toLowerCase() + ".", "shipping-intl");
      }
      return ok(
        "Standard shipping is " + money(KB.shipping.standardCost) + ", and it's free on orders of " +
        money(KB.shipping.freeThreshold) + " or more (subtotal). " + KB.shipping.packTime +
        ", and " + KB.shipping.deliveryTime.toLowerCase() + ", in the continental US.",
        "shipping");
    }

    /* 5b — Gift wrapping: a clear no. Checked before discounts because
          "Do you offer gift wrapping?" also contains the word "offer". */
    if (has(q, ["gift wrap", "gift-wrap", "wrap it", "wrapping", "gift box", "present"])) {
      if (has(q, ["discovery"])) return productAnswer(KB.products[5], q);
      return ok("No — we don't offer gift wrapping yet, so I can't add it. The Mini Discovery Candle Set does come in a gift box, if that helps.", "gift-wrap");
    }

    /* 6 — Discounts & stacking. */
    if (has(q, ["stack", "combine", "both codes", "together", "at the same time"])) {
      return ok(KB.discounts.stacking + " " + KB.discounts.codeNote + " " + KB.discounts.trioNote, "discounts-stacking");
    }
    if (has(q, ["glow10", "glow 10"])) {
      return ok(KB.discounts.codeNote + " " + KB.discounts.stacking, "discount-glow10");
    }
    if (has(q, ["trio"])) {
      return ok(KB.discounts.trioNote + " " + KB.discounts.stacking, "discount-trio");
    }
    if (has(q, ["discount", "code", "promo", "coupon", "offer", "sale", "cheaper", "deal"])) {
      return ok("Two real discounts exist here — no others, and no invented codes: " + KB.discounts.codeNote + " " + KB.discounts.trioNote + " " + KB.discounts.stacking, "discounts");
    }

    /* 7 — Candle / product care. */
    if (has(q, ["wick", "trim", "tunnel", "first burn", "candle care", "look after", "soy", "wax"])) {
      return ok(KB.care.candle, "candle-care");
    }
    if (has(q, ["flip", "reeds", "diffuser"])) {
      return ok(KB.care.diffuser + " The Fig & Cassis Reed Diffuser lasts 8–10 weeks.", "diffuser-use");
    }
    if (has(q, ["steamer", "steamers", "shower", "bath bomb"])) {
      return ok(KB.care.steamers, "steamer-use");
    }

    /* 9 — Contact. */
    if (has(q, ["email", "contact", "get in touch", "phone", "reach you", "customer service", "human"])) {
      return ok("You can email the store at " + KB.store.email + " — that's the contact in this demo store's data.", "contact");
    }

    /* 10 — Order status: honest demo answer. */
    if (has(q, ["order status", "where is my order", "track my order", "tracking", "my order", "order number"])) {
      return ok("This is a demo storefront, so there are no real orders to look up here. In the real store you'd email " + KB.store.email + " with your order confirmation and they'd check for you.", "order-status");
    }

    /* 11 — Greetings / thanks. */
    if (has(q, ["hello", "hi ", "hey", "good morning", "good afternoon"]) && q.length < 30) {
      return ok("Hello! Ask me about any product, shipping, returns or discounts at " + KB.store.name + " — I answer only from this demo store's data.", "greeting");
    }
    if (has(q, ["thank", "thanks", "bye"])) {
      return ok("You're welcome! Anything else about the products, shipping, returns or discounts?", "thanks");
    }

    /* 12 — Cart-aware context question. */
    if (context && context.cartCount > 0 && has(q, ["my cart", "in my cart", "checkout", "total"])) {
      return ok("You have " + context.cartCount + " item(s) in your cart. Two discount facts that may help: " + KB.discounts.trioNote + " " + KB.discounts.codeNote + " " + KB.discounts.stacking, "cart");
    }

    return fb("unknown");
  }

  /* ---------- Chat widget (browser only) ---------- */
  function greetingFor(context) {
    if (context && context.cartCount > 0) {
      return "Hi! I can see " + context.cartCount + " item(s) in your cart. Quick facts that might help: the Candle Trio takes 15% off when you have 3 or more full-size candles, and GLOW10 takes 10% off a first order — the two never combine; the better value applies. Ask me anything about the products, shipping or returns.";
    }
    return "Hi! I'm the demo assistant for Willow Ember Candle Co. I answer only from this demo store's data — try one of the questions below, or ask about a product, shipping, returns or discounts.";
  }

  function initWidget() {
    var toggle = document.getElementById("assistant-toggle");
    var panel = document.getElementById("assistant-panel");
    var log = document.getElementById("assistant-log");
    var form = document.getElementById("assistant-form");
    var input = document.getElementById("assistant-input");
    var chips = document.getElementById("assistant-chips");
    var leadBox = document.getElementById("assistant-lead");
    if (!toggle || !panel) return;
    var opened = false, pendingQuestion = null;

    function cartContext() {
      try {
        if (window.WillowCart && typeof window.WillowCart.count === "function") {
          return { cartCount: window.WillowCart.count() };
        }
      } catch (e) {}
      return { cartCount: 0 };
    }
    function addMsg(text, who) {
      var div = document.createElement("div");
      div.className = "msg " + who;
      div.textContent = text;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
      return div;
    }
    function ask(question) {
      addMsg(question, "user");
      var res = answer(question, cartContext());
      addMsg(res.text, "bot");
      if (res.fallback) {
        pendingQuestion = question;
        leadBox.hidden = false;
        var li = document.getElementById("lead-email"); if (li) li.focus();
      } else {
        leadBox.hidden = true;
      }
    }
    toggle.addEventListener("click", function () {
      var willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", String(willOpen));
      if (willOpen && !opened) {
        opened = true;
        addMsg(greetingFor(cartContext()), "bot");
      }
      if (willOpen) input.focus();
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      input.value = "";
      ask(v);
    });
    chips.addEventListener("click", function (ev) {
      var b = ev.target.closest("button[data-q]");
      if (b) ask(b.getAttribute("data-q"));
    });
    var leadForm = document.getElementById("lead-form");
    leadForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var email = document.getElementById("lead-email").value.trim();
      if (!email) return;
      leadBox.hidden = true;
      var card = document.createElement("div");
      card.className = "msg bot lead-card";
      card.innerHTML = "<strong>Lead captured (demo)</strong><br>Question: <span></span><br>Email: <span></span><br><em>No message has been sent — this demo stores nothing and contacts no one.</em>";
      var spans = card.querySelectorAll("span");
      spans[0].textContent = pendingQuestion || "(question)";
      spans[1].textContent = email;
      log.appendChild(card);
      log.scrollTop = log.scrollHeight;
      pendingQuestion = null;
      document.getElementById("lead-email").value = "";
    });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initWidget);
    else initWidget();
  }

  var api = { answer: answer, greetingFor: greetingFor };
  if (typeof window !== "undefined") window.WillowAssistant = api;
  if (typeof module !== "undefined") module.exports = api;
})();
