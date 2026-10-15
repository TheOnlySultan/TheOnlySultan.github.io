/* Node battery for the Willow Ember demo assistant + cart engine.
   Run: node test-assistant.mjs   (no dependencies)
   Covers: exact facts, the five known-gap fallbacks, stacking,
   gift wrap, health-claim refusal, and the cart discount math. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { answer, greetingFor } = require("./assistant.js");
const { computeTotals } = require("./app.js");

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; failures.push(name); console.log("  FAIL  " + name + (extra ? "  -> " + extra : "")); }
}
function ask(name, q, { includes = [], excludes = [], fallback = null } = {}) {
  const r = answer(q);
  const t = r.text;
  let okAll = includes.every((s) => t.includes(s)) && excludes.every((s) => !t.includes(s));
  if (fallback !== null) okAll = okAll && r.fallback === fallback;
  check(name, okAll, JSON.stringify(r));
}

console.log("== Exact product facts ==");
ask("Cedar price is $28", "How much is the Cedar & Sage candle?", { includes: ["$28"], fallback: false });
ask("Cedar burn ~45h", "How long does the Cedar candle burn?", { includes: ["45 hours"], fallback: false });
ask("Vanilla burn ~40h", "How long does the Vanilla Ember candle burn?", { includes: ["40 hours"], fallback: false });
ask("Beeswax pillar burn ~60h", "How long does the beeswax pillar burn?", { includes: ["60 hours"], fallback: false });
ask("Discovery burn ~8h each", "How long does each candle in the Discovery Set burn?", { includes: ["8 hours"], fallback: false });
ask("Diffuser lasts 8-10 weeks", "How long does the reed diffuser last?", { includes: ["10 weeks"], fallback: false });
ask("Cedar scent notes", "What does the Cedar candle smell like?", { includes: ["Cedarwood", "sage"], fallback: false });
ask("Cedar compare-at $36", "What is the compare-at price of the Cedar candle?", { includes: ["$36"], fallback: false });
ask("Room Spray price $18", "How much is the room spray?", { includes: ["$18"], fallback: false });
ask("Steamer scent", "What do the shower steamers smell like?", { includes: ["Eucalyptus"], fallback: false });

console.log("== Shipping ==");
ask("Free shipping threshold $50", "Is shipping free?", { includes: ["$50", "$5.95"], fallback: false });
ask("Standard shipping $5.95", "How much is standard shipping?", { includes: ["$5.95"], fallback: false });
ask("Shipping timing 1-2 / 4-7 days", "How long will delivery take?", { includes: ["1–2 business days", "4–7 business days"], fallback: false });
ask("US only, no Canada", "Do you ship to Canada?", { includes: ["only ship inside the US"], fallback: false });

console.log("== Known-gap fallbacks (must NOT invent) ==");
ask("Express price -> fallback", "How much is express shipping?", { fallback: true });
ask("Express speed -> fallback", "How fast is the express option?", { fallback: true });
ask("Burned candle return -> fallback, not yes/no", "Can I return a burned candle?", { fallback: true, excludes: ["you can return it", "you cannot return"] });
ask("Opened candle return -> fallback", "I opened my candle, can I get a refund?", { fallback: true });
ask("Discovery scent list -> fallback", "Which scents are in the Discovery Set?", { fallback: true });
ask("Room Spray scent notes -> fallback", "What are the scent notes of the room spray?", { fallback: true });
ask("Beeswax compare-at -> fallback", "What is the compare-at price of the Beeswax Pillar?", { fallback: true });
ask("Unknown product -> fallback", "Do you sell bath towels?", { fallback: true });

console.log("== Returns (known policy) ==");
ask("Unopened return 30 days", "Can I return an unopened candle?", { includes: ["30 days", "receipt"], fallback: false });
ask("Damaged flow: photo within 7 days", "My candle arrived damaged, what do I do?", { includes: ["photo", "7 days", "replacement"], fallback: false });

console.log("== Discounts ==");
ask("Stacking: never combine, best value", "Can I stack GLOW10 with the Trio discount?", { includes: ["never combine", "better value"], fallback: false });
ask("Do codes stack? (chip wording)", "Do codes stack?", { includes: ["never combine"], fallback: false });
ask("GLOW10 = 10% first order", "What does GLOW10 do?", { includes: ["10%", "first order"], fallback: false });
ask("Trio = 15% off 3+ full-size", "How does the Candle Trio work?", { includes: ["15%", "3 or more full-size"], fallback: false });
ask("Invented code not honoured", "Can I use the code SAVE50 I saw online?", { includes: ["GLOW10"], excludes: ["SAVE50 takes", "SAVE50 gives"], fallback: false });

console.log("== Care, use, and refusals ==");
ask("Gift wrap = no", "Do you offer gift wrapping?", { includes: ["don't offer gift wrapping"], fallback: false });
ask("Health-claim bait refused", "Will this candle help my anxiety?", { includes: ["don't make health"], excludes: ["will help your anxiety", "helps anxiety"], fallback: false });
ask("Candle care: trim wick 1/4 inch", "How should I trim the wick?", { includes: ["1/4 inch"], fallback: false });
ask("Candle care: first burn edges", "How do I stop my candle tunnelling?", { includes: ["edges"], fallback: false });
ask("Diffuser flip weekly", "How often should I flip the diffuser reeds?", { includes: ["once a week"], fallback: false });
ask("Steamers are shower-only", "Can I use the shower steamers in the bath?", { includes: ["showers only"], fallback: false });
ask("Contact email", "What is your email address?", { includes: ["willowembercandle@gmail.com"], fallback: false });
ask("Order status -> honest demo answer", "Where is my order?", { includes: ["demo"], fallback: false });

console.log("== Cart-aware greeting ==");
{
  const g = greetingFor({ cartCount: 2 });
  check("Greeting mentions cart count", g.includes("2 item"), g);
  check("Greeting states true Trio + GLOW10 facts", g.includes("15%") && g.includes("GLOW10") && g.includes("never combine"), g);
  const g0 = greetingFor({ cartCount: 0 });
  check("Empty-cart greeting has no cart claim", !g0.includes("in your cart"), g0);
}

console.log("== Cart engine math ==");
{
  const cedar = { price: 28, qty: 3, isFullSizeCandle: true };
  let t = computeTotals([cedar], "");
  check("Trio: 3x Cedar subtotal 84", t.subtotal === 84, JSON.stringify(t));
  check("Trio: 15% off = 12.60", t.trioDiscount === 12.6 && t.discount === 12.6, JSON.stringify(t));
  check("Trio: free shipping at 84, total 71.40", t.shipping === 0 && t.total === 71.4, JSON.stringify(t));

  t = computeTotals([{ price: 26, qty: 1, isFullSizeCandle: true }], "GLOW10");
  check("GLOW10: 10% off 26 = 2.60", t.codeDiscount === 2.6 && t.discount === 2.6, JSON.stringify(t));
  check("GLOW10: shipping 5.95 under $50, total 29.35", t.shipping === 5.95 && t.total === 29.35, JSON.stringify(t));

  t = computeTotals([cedar], "GLOW10");
  check("Best value wins: Trio 12.60 beats GLOW10 8.40, not combined", t.discount === 12.6 && t.total === 71.4, JSON.stringify(t));

  t = computeTotals([{ price: 28, qty: 2, isFullSizeCandle: true }], "");
  check("2 candles: no Trio, free ship at 56", t.trioDiscount === 0 && t.shipping === 0 && t.total === 56, JSON.stringify(t));

  t = computeTotals([{ price: 25, qty: 2, isFullSizeCandle: false }], "");
  check("Subtotal exactly $50 -> free shipping", t.shipping === 0 && t.total === 50, JSON.stringify(t));
  t = computeTotals([{ price: 49, qty: 1, isFullSizeCandle: false }], "");
  check("Subtotal $49 -> shipping 5.95", t.shipping === 5.95 && t.total === 54.95, JSON.stringify(t));

  t = computeTotals([{ price: 32, qty: 3, isFullSizeCandle: false }], "");
  check("Discovery minis do NOT trigger Trio", t.trioDiscount === 0 && t.discount === 0, JSON.stringify(t));

  t = computeTotals([], "GLOW10");
  check("Empty cart: all zeros", t.subtotal === 0 && t.discount === 0 && t.shipping === 0 && t.total === 0, JSON.stringify(t));

  t = computeTotals([{ price: 22, qty: 2, isFullSizeCandle: true }, { price: 28, qty: 1, isFullSizeCandle: true }], "");
  check("Mixed full-size candles count toward Trio (2 pillar + 1 cedar)", t.trioDiscount === 10.8 && t.discountLabel.includes("Trio"), JSON.stringify(t));
}

console.log(`\n${pass} passed, ${fail} failed, ${pass + fail} total`);
if (failures.length) { console.log("Failures: " + failures.join(" | ")); process.exit(1); }
