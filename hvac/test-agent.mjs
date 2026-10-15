/* Scenario battery for the Copperline demo lead agent.
   Drives the PURE conversation core in agent.js (no DOM, no network).
   Run:  node test-agent.mjs
   Exit code 0 = all scenarios pass. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const A = require("./agent.js");

const FIXED_NOW = new Date("2026-10-14T15:30:00.000Z");
let passed = 0, failed = 0;
const failures = [];

function check(cond, label, extra) {
  if (cond) return true;
  failures.push(label + (extra ? " :: " + extra : ""));
  return false;
}

/* A tiny scripted-conversation driver */
function convo() {
  let session = A.createSession();
  // Mirror the browser: the greeting is shown on open, step = service.
  session.step = "service";
  const api = {
    last: null,
    allText: "",
    say(text) {
      const r = A.handleMessage(session, text, FIXED_NOW);
      session = r.session;
      api.last = r;
      api.allText += "\n" + r.replies.join("\n");
      return r;
    },
    get session() { return session; },
    get step() { return session.step; },
    text() { return api.last.replies.join("\n"); }
  };
  return api;
}

function scenario(name, fn) {
  const before = failures.length;
  try { fn(); } catch (e) { failures.push(name + " threw: " + e.message); }
  if (failures.length === before) { passed++; console.log("PASS  " + name); }
  else { failed++; console.log("FAIL  " + name); }
}

const HAPPY = ["I need heating repair", "routine", "house", "Casey Rivera", "555-014-8821", "tomorrow morning", "yes"];

/* 1 — happy path: all fields -> summary card contents correct */
scenario("01 happy-path lead, summary card contents correct", () => {
  const c = convo();
  HAPPY.forEach((m) => c.say(m));
  const lead = c.last.lead;
  check(!!lead, "lead produced on confirm");
  if (!lead) return;
  check(lead.service === "Heating repair", "service", lead.service);
  check(lead.urgency === "routine" && lead.urgentFlag === false, "routine, no urgent flag");
  check(lead.propertyType === "house", "property", lead.propertyType);
  check(lead.name === "Casey Rivera", "name", lead.name);
  check(lead.phoneDigits === "5550148821", "phone digits", lead.phoneDigits);
  check(lead.callbackTime === "tomorrow morning", "callback", lead.callbackTime);
  check(lead.timestamp === FIXED_NOW.toISOString(), "timestamp from injected clock", lead.timestamp);
  check(/Demo only — in a live setup/.test(lead.demoNote), "honest demo note on lead");
  check(c.step === "done", "ends in done state", c.step);
});

/* 2 — urgent path: no heat */
scenario("02 urgent path: no heat sets urgency flag", () => {
  const c = convo();
  c.say("My furnace stopped and we have no heat");
  check(c.session.data.urgentFlag === true, "urgent flag set at intake");
  check(c.step === "property", "urgency step skipped once already known", c.step);
  c.say("condo"); c.say("Sam Ortiz"); c.say("5550141111"); c.say("as soon as possible"); c.say("yes");
  check(c.last.lead && c.last.lead.urgentFlag === true, "lead carries urgent flag");
  check(c.last.lead.urgency === "urgent", "lead urgency = urgent");
});

/* 3 — urgent path: no cooling via urgency step */
scenario("03 urgent path: no cooling at urgency step", () => {
  const c = convo();
  c.say("AC repair please");
  c.say("It's urgent, no cooling at all");
  check(c.session.data.urgentFlag === true, "flag set");
  c.say("skip"); c.say("Pat Lee"); c.say("5550142222"); c.say("today"); c.say("yes");
  check(c.last.lead && c.last.lead.service === "AC repair", "service recorded");
});

/* 4 — urgent path: water leak */
scenario("04 urgent path: water leak flagged urgent", () => {
  const c = convo();
  c.say("Heating repair");
  c.say("There's a water leak under the unit, it's urgent");
  check(c.session.data.urgency === "urgent" && c.session.data.urgentFlag === true, "water leak = urgent");
});

/* 5 — emergency: gas smell, mid-flow, stops the flow */
scenario("05 emergency: gas smell stops flow immediately", () => {
  const c = convo();
  c.say("I need AC repair");
  const r = c.say("Actually I smell gas in my basement");
  check(r.event === "safety", "safety event");
  check(/leave the home/i.test(r.replies.join(" ")), "says leave the home");
  check(/911/.test(r.replies.join(" ")), "says call 911");
  check(/gas utility/i.test(r.replies.join(" ")), "mentions gas utility");
  check(c.step === "safety" && c.session.stopped === true, "flow stopped", c.step);
  check(!r.lead, "no lead from a safety stop");
  const after = c.say("5550143333");
  check(!after.lead && c.step === "safety", "still stopped on the next turn");
});

/* 6 — emergency: carbon monoxide at greet */
scenario("06 emergency: carbon monoxide mention triggers safety", () => {
  let s = A.createSession();
  const r = A.handleMessage(s, "Our carbon monoxide detector keeps going off", FIXED_NOW);
  check(r.event === "safety", "safety event from greet state");
  check(/911/.test(r.replies.join(" ")), "911 in message");
});

/* 7 — emergency: sparking */
scenario("07 emergency: sparking triggers safety", () => {
  const c = convo();
  const r = c.say("The unit is sparking when it starts");
  check(r.event === "safety", "safety event");
  check(c.step === "safety", "stopped");
});

/* 8 — invalid phone: re-ask once politely, then accept */
scenario("08 invalid phone re-asked, then valid accepted", () => {
  const c = convo();
  c.say("Duct cleaning"); c.say("routine"); c.say("skip"); c.say("Kim Chen");
  const bad = c.say("banana");
  check(c.step === "phone", "still on phone step", c.step);
  check(/couldn't make out|at least 7 digits/i.test(bad.replies.join(" ")), "polite re-ask", bad.replies.join(" "));
  check(!bad.lead, "no lead yet");
  c.say("(555) 014-4444");
  check(c.step === "callback", "valid formatted phone accepted", c.step);
  check(c.session.data.phoneDigits === "5550144444", "digits normalised");
  c.say("Friday afternoon"); c.say("yes");
  check(!!c.last.lead, "lead completes after re-ask");
});

/* 9 — price question: KB range answer with demo label */
scenario("09 price question gets KB range with demo label only", () => {
  const c = convo();
  const r = c.say("How much does a diagnostic visit cost?");
  const t = r.replies.join(" ");
  check(t.includes("$89"), "diagnostic $89 from KB", t);
  check(/demo/i.test(t), "labelled demo");
  check(c.step === "service", "state preserved (still service)", c.step);
});

/* 10 — price for a specific service: that service's KB range, no invented figures */
scenario("10 service price question returns only that KB range", () => {
  const c = convo();
  const t = c.say("What does AC repair cost?").replies.join(" ");
  check(t.includes("$170–$620"), "AC demo range", t);
  check(!t.includes("$180–$650"), "does not blur in the heating range");
  const kbPrices = ["$89", "$180–$650", "$170–$620", "$4,800–$9,500", "$19", "$299–$499"];
  const dollarHits = t.match(/\$[\d,]+(–\$?[\d,]+)?/g) || [];
  check(dollarHits.every((h) => kbPrices.some((k) => k.includes(h) || h.includes(k.replace("$", "")) || k === h)),
    "every $ figure traceable to KB", dollarHits.join(","));
});

/* 11 — unknown question: owner-pass fallback, no guessing */
scenario("11 unknown question -> owner-pass fallback", () => {
  const c = convo();
  c.say("Heating repair");
  const r = c.say("Do you offer a 10-year parts warranty?");
  const t = r.replies.join(" ");
  check(/pass that question to the owner/i.test(t), "owner-pass wording", t);
  check(c.session.data.ownerQuestions.length === 1, "question recorded for owner");
  check(c.step === "urgency", "state preserved at urgency", c.step);
});

/* 12 — mid-flow KB question: state preserved, flow completes */
scenario("12 mid-flow hours question preserves state and flow completes", () => {
  const c = convo();
  c.say("AC repair"); c.say("routine"); c.say("house");
  check(c.step === "name", "at name step before question", c.step);
  const r = c.say("What are your hours?");
  check(/Mon–Sat 8am–6pm/.test(r.replies.join(" ")), "hours from KB");
  check(c.step === "name", "still at name step after answer", c.step);
  c.say("Dana Wells"); c.say("5550145555"); c.say("Monday morning"); c.say("yes");
  check(!!c.last.lead && c.last.lead.name === "Dana Wells", "flow completes with right name");
});

/* 13 — are you human: honest answer */
scenario("13 'are you human?' gets an honest answer", () => {
  const c = convo();
  const t = c.say("Are you human?").replies.join(" ");
  check(/automated demo assistant/i.test(t), "admits automated", t);
  check(/not a human/i.test(t), "explicitly not human");
  check(/website chat/i.test(t), "no phone-answering claim — chat only");
});

/* 14 — hours question content */
scenario("14 hours answer matches KB incl. emergency note", () => {
  const c = convo();
  const t = c.say("When are you open?").replies.join(" ");
  check(/Mon–Sat 8am–6pm/.test(t), "hours label");
  check(/\(555\) 014-2900/.test(t), "emergency line note with 555 number");
});

/* 15 — service area question */
scenario("15 service area answer is the fictional Greater Springfield Area", () => {
  const c = convo();
  const t = c.say("What is your service area?").replies.join(" ");
  check(/Greater Springfield Area/.test(t), "area from KB", t);
});

/* 16 — off-topic: polite redirect, state preserved */
scenario("16 off-topic message redirected politely", () => {
  const c = convo();
  c.say("Maintenance plans");
  const r = c.say("What's the weather like today?");
  check(/only help with heating and cooling/i.test(r.replies.join(" ")), "redirect wording");
  check(c.step === "urgency", "still at urgency step", c.step);
  check(c.session.data.service === "Maintenance plans", "service not lost");
});

/* 17 — property is optional: skip still completes */
scenario("17 optional property skipped, lead still completes", () => {
  const c = convo();
  c.say("Installations"); c.say("routine"); c.say("skip");
  check(c.session.data.propertyType === null, "property null after skip");
  c.say("Robin Fox"); c.say("5550146666"); c.say("next week"); c.say("yes");
  check(!!c.last.lead && c.last.lead.propertyType === null, "lead has null property");
  check(c.last.lead.service === "Installations", "install intent mapped correctly");
});

/* 18 — confirm 'no': no lead, chat closed */
scenario("18 declining at confirm produces no lead", () => {
  const c = convo();
  HAPPY.slice(0, -1).forEach((m) => c.say(m));
  check(c.step === "confirm", "at confirm", c.step);
  const r = c.say("no");
  check(!r.lead && !c.last.lead, "no lead object");
  check(c.step === "closed", "closed state", c.step);
});

/* 19 — 7-digit phone accepted (loose validation per spec) */
scenario("19 seven-digit phone accepted", () => {
  const c = convo();
  c.say("Heating repair"); c.say("routine"); c.say("skip"); c.say("Jo May");
  c.say("014-7777");
  check(c.step === "callback", "7 digits is enough", c.step);
});

/* 20 — duplicate confirm guard + purity of the core */
scenario("20 no double lead; handleMessage does not mutate its input", () => {
  const c = convo();
  HAPPY.forEach((m) => c.say(m));
  check(!!c.last.lead, "first confirm gives lead");
  const again = c.say("yes");
  check(!again.lead, "second confirm gives no second lead");
  check(/already captured/i.test(again.replies.join(" ")), "says already captured");
  // purity: same input session + message -> same result, input untouched
  const s0 = A.createSession(); s0.step = "service";
  const snapshot = JSON.stringify(s0);
  const r1 = A.handleMessage(s0, "Duct cleaning", FIXED_NOW);
  const r2 = A.handleMessage(s0, "Duct cleaning", FIXED_NOW);
  check(JSON.stringify(s0) === snapshot, "input session unmutated");
  check(JSON.stringify(r1.session) === JSON.stringify(r2.session), "deterministic output");
});

/* 21 — KB integrity: agent may only state KB prices */
scenario("21 KB is the only price source (spot-check exports)", () => {
  check(A.KB.diagnostic.demoPrice === "$89", "diagnostic in KB");
  check(A.KB.services.length === 5, "exactly the five spec services");
  check(A.KB.hoursLabel === "Mon–Sat 8am–6pm", "hours in KB");
  const names = A.KB.services.map((s) => s.name).join("|");
  check(names === "Heating repair|AC repair|Installations|Maintenance plans|Duct cleaning", "service names", names);
});

console.log("\n" + passed + "/" + (passed + failed) + " scenarios passed");
if (failures.length) {
  console.log("\nFailures:");
  failures.forEach((f) => console.log("  - " + f));
  process.exit(1);
}
