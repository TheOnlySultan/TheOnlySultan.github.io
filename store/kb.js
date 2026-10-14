/* Willow Ember Candle Co. — demo knowledge base.
   Every fact here comes from the store's sample catalog + policy notes.
   Fields that the source data leaves blank are null ON PURPOSE:
   the assistant must never invent them (see KNOWN_GAPS). */
var WillowKB = {
  store: {
    name: "Willow Ember Candle Co.",
    email: "willowembercandle@gmail.com",
    shipsTo: "Continental US only — no international shipping yet"
  },
  products: [
    {
      sku: "WEC-CED-8",
      name: "Cedar & Sage Soy Candle",
      price: 28.00, compareAt: 36.00,
      size: "8 oz", variant: "8 oz jar only",
      burnTime: "Approx. 45 hours",
      scentNotes: "Cedarwood, sage and amber",
      isFullSizeCandle: true,
      aliases: ["cedar & sage", "cedar and sage", "cedar candle", "cedar"]
    },
    {
      sku: "WEC-VAN-8",
      name: "Vanilla Ember Soy Candle",
      price: 26.00, compareAt: 34.00,
      size: "8 oz", variant: "8 oz jar only",
      burnTime: "Approx. 40 hours",
      scentNotes: "Vanilla bean, smoked cedar and a little cinnamon",
      isFullSizeCandle: true,
      aliases: ["vanilla ember", "vanilla candle", "vanilla"]
    },
    {
      sku: "WEC-FIG-D",
      name: "Fig & Cassis Reed Diffuser",
      price: 34.00, compareAt: 44.00,
      size: "120 ml", variant: "120 ml bottle with reeds",
      burnTime: "Lasts 8–10 weeks",
      scentNotes: "Fig, cassis and green leaves. No flame.",
      isFullSizeCandle: false,
      aliases: ["fig & cassis", "fig and cassis", "reed diffuser", "diffuser", "fig"]
    },
    {
      sku: "WEC-LIN-S",
      name: "Linen & Cotton Room Spray",
      price: 18.00, compareAt: 24.00,
      size: "100 ml", variant: "100 ml spray bottle",
      burnTime: null,
      scentNotes: null, /* GAP: scent notes not provided — never guess */
      isFullSizeCandle: false,
      aliases: ["linen & cotton", "linen and cotton", "room spray", "spray", "linen"]
    },
    {
      sku: "WEC-BEE-P",
      name: "Unscented Beeswax Pillar Candle",
      price: 22.00, compareAt: null, /* GAP: no compare-at — never ran a promo */
      size: "3 × 6 inch pillar", variant: "Single pillar",
      burnTime: "Approx. 60 hours",
      scentNotes: "Unscented, natural beeswax colour",
      isFullSizeCandle: true,
      aliases: ["beeswax pillar", "beeswax", "pillar candle", "pillar", "unscented"]
    },
    {
      sku: "WEC-DIS-4",
      name: "Mini Discovery Candle Set (4 × 2 oz)",
      price: 32.00, compareAt: 40.00,
      size: "4 × 2 oz mini candles", variant: "Gift box",
      burnTime: "Approx. 8 hours each",
      scentNotes: "Seasonal assortment — scents change with the season",
      scentListKnown: false, /* GAP: exact scents not listed — never guess */
      isFullSizeCandle: false,
      aliases: ["mini discovery", "discovery set", "discovery", "mini set"]
    },
    {
      sku: "WEC-EUC-4",
      name: "Eucalyptus Shower Steamers (4-pack)",
      price: 19.00, compareAt: 25.00,
      size: "4 steamers", variant: "Pack of 4",
      burnTime: null,
      scentNotes: "Eucalyptus and menthol. For the shower, not a bath bomb.",
      isFullSizeCandle: false,
      aliases: ["shower steamers", "steamers", "eucalyptus", "steamer"]
    }
  ],
  shipping: {
    standardCost: 5.95,
    freeThreshold: 50,
    packTime: "We pack and ship in 1–2 business days",
    deliveryTime: "Delivery usually takes 4–7 business days after that",
    expressKnown: false /* GAP: express price/speed not confirmed */
  },
  returns: {
    unopened: "Unopened products can be returned within 30 days of delivery, with your receipt / order confirmation, for a refund to the original payment method.",
    damaged: "If something arrives damaged or defective, email us a photo within 7 days of delivery and we will send a replacement or a refund — your choice.",
    openedKnown: false /* GAP: no set policy for opened/burned candles */
  },
  discounts: {
    code: "GLOW10",
    codePercent: 10,
    codeNote: "GLOW10 takes 10% off a first order.",
    trioThreshold: 3,
    trioPercent: 15,
    trioNote: "Candle Trio: buy 3 or more full-size candles and 15% comes off those candles automatically.",
    stacking: "GLOW10 and the Candle Trio discount never combine — the better value applies automatically."
  },
  care: {
    candle: "Trim the wick to about 1/4 inch before each burn. On the first burn, let the wax melt all the way to the edges — about 2–3 hours — so it does not tunnel. The jar candles are soy wax; the pillar is beeswax and unscented.",
    diffuser: "Flip the reeds about once a week for a stronger scent.",
    steamers: "Place one steamer on the shower floor, away from the direct stream of water. Steamers are for showers only — they are not bath bombs and are not for soaking in a bath."
  },
  giftWrap: false,
  healthClaims: false,
  /* The five known ambiguities: the assistant must use the honest
     fallback for these, never an invented answer. */
  knownGaps: [
    "express shipping price or speed",
    "returns of opened or burned candles",
    "the exact scents in the Mini Discovery Candle Set",
    "scent notes for the Linen & Cotton Room Spray",
    "a compare-at price for the Unscented Beeswax Pillar Candle"
  ]
};

if (typeof module !== "undefined") module.exports = WillowKB;
