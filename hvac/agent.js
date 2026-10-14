/* ============================================================
   Copperline Heating & Air — DEMO lead agent (website chat only)
   ------------------------------------------------------------
   A deterministic, dependency-free conversation core.
   - No external API calls. No LLM. Every fact the agent can state
     comes from the KB object below — and ONLY from there.
   - The core is a pure-function style API (input session + message
     -> new session + replies), usable from the browser AND from
     Node (see the module.exports guard at the bottom), which is
     what test-agent.mjs drives.
   - This agent does NOT answer phones. It is a website chat demo.
   ============================================================ */
(function (root) {
  "use strict";

  /* ---------------- Knowledge base (the ONLY source of facts) -------- */
  var KB = {
    businessName: "Copperline Heating & Air",
    tagline: "Heating & cooling help for homes and small businesses",
    serviceAreaLabel: "Serving the Greater Springfield Area",
    serviceAreaDetail:
      "Springfield and nearby communities within about 25 miles in this demo data",
    phoneDisplay: "(555) 014-2900",
    hoursLabel: "Mon–Sat 8am–6pm",
    hoursDetail: "Monday to Saturday, 8:00am to 6:00pm. Closed Sundays in this demo data.",
    emergencyNote:
      "Outside regular hours, this demo business lists an emergency callback line at (555) 014-2900 for urgent no-heat / no-cooling issues. For any life-safety emergency, call 911 first.",
    services: [
      {
        id: "heating-repair",
        name: "Heating repair",
        blurb: "Furnaces and heat pumps that stopped heating, short-cycle, or make new noises.",
        demoRange: "$180–$650",
        demoRangeNote: "typical repair range in this demo data, after diagnosis",
        keywords: ["heating", "heater", "furnace", "heat pump", "no heat", "not heating"]
      },
      {
        id: "ac-repair",
        name: "AC repair",
        blurb: "Air conditioning that is not cooling, blowing warm air, icing up, or not starting.",
        demoRange: "$170–$620",
        demoRangeNote: "typical repair range in this demo data, after diagnosis",
        keywords: ["ac", "a/c", "air condition", "cooling", "not cooling", "no cooling", "no ac"]
      },
      {
        id: "installations",
        name: "Installations",
        blurb: "New furnace, AC, or heat-pump installations and full system replacements.",
        demoRange: "$4,800–$9,500",
        demoRangeNote: "typical full-system range in this demo data; exact figure needs an in-home assessment",
        keywords: ["install", "installation", "new system", "new furnace", "new ac", "replace", "replacement"]
      },
      {
        id: "maintenance-plans",
        name: "Maintenance plans",
        blurb: "Scheduled tune-ups and seasonal check-ups under a recurring maintenance plan.",
        demoRange: "from $19/mo",
        demoRangeNote: "starting plan price in this demo data",
        keywords: ["maintenance", "tune-up", "tune up", "tuneup", "plan", "check-up", "checkup", "seasonal"]
      },
      {
        id: "duct-cleaning",
        name: "Duct cleaning",
        blurb: "Whole-home duct cleaning for dust build-up, odours, and airflow problems.",
        demoRange: "$299–$499",
        demoRangeNote: "typical whole-home range in this demo data",
        keywords: ["duct", "ducts", "vent cleaning"]
      }
    ],
    diagnostic: {
      label: "Diagnostic visit",
      demoPrice: "$89",
      note: "a diagnostic visit in this demo data starts at $89"
    },
    propertyTypes: ["House", "Condo", "Townhome", "Apartment", "Rental property", "Small business", "Other"]
  };

  var OTHER_SERVICE = "Other / not sure";
  var DEMO_LEAD_NOTE =
    "Demo only — in a live setup this summary goes straight to the owner's inbox.";
  var SAFETY_MESSAGE =
    "Please stop and stay safe first: if you smell gas, suspect carbon monoxide, or see sparking, " +
    "leave the home right away, get outside to fresh air, and from a safe place call 911 and your gas utility. " +
    "Do not flip switches, light anything, or try to fix it yourself. " +
    "I'm stopping this booking chat here — your safety matters more than any repair. " +
    "Once everyone is safe, you can come back and restart this demo chat.";

  /* ---------------- Matchers ------------------------------------------ */
  var SAFETY_RE =
    /(smell(s|ing|ed)?\s+(of\s+)?gas|gas\s+(smell|leak|leaking)|carbon\s+monoxide|\bco\s+(detector|alarm|leak)\b|sparking|sparks?\s+(coming|flying|from)|electrical\s+(fire|burning)|burning\s+(wire|electrical)\s*smell)/i;
  var HUMAN_RE =
    /(are you (a |an )?(human|person|robot|bot|real|ai|machine)|you'?re (a |an )?(robot|bot|ai)|is this (a |an )?(robot|bot|human|ai)|am i (talking|chatting) (to|with) (a )?(human|robot|bot|person))/i;
  var PRICE_RE =
    /(how much|what('s| is| does| will).*?(cost|price|charge)|price|pricing|cost|costs|charge|charges|fee|fees|quote|estimate|ballpark|rate|rates)/i;
  var HOURS_RE =
    /(what (are|time).*?(hour|open|close)|your hours|when are you (open|closed)|opening hours|are you open|what time do you)/i;
  var AREA_RE =
    /(service area|do you serve|areas? (do|that) you (serve|cover)|where do you (serve|operate|work)|do you (cover|come to)|coverage area)/i;
  var SERVICES_Q_RE =
    /(what services|services do you|which services|what do you (do|offer|cover)|do you offer (any )?(heating|ac|a\/c|air condition|duct|maintenance|installation))/i;
  var OFFTOPIC_RE =
    /(weather|football|soccer|baseball|basketball|movie|tell me a joke|\bjoke\b|stock market|bitcoin|crypto|lottery|horoscope|who won|politics|election)/i;
  var INJECTION_RE =
    /(ignore (your|all|the) (rules|instructions|prompts?)|system prompt|disregard (your|all)|pretend you are|jailbreak|reveal your (prompt|instructions))/i;
  var URGENT_RE =
    /(no heat|not heating|no cooling|not cooling|no ac|no a\/c|water leak|leaking water|pipe (is )?leak|emergency|urgent|asap|right (now|away)|immediately|freezing|house is cold|today\b)/i;
  var ROUTINE_RE = /(not urgent|no rush|routine|whenever|next week|not an emergency|no emergency)/i;
  var SKIP_RE = /^(skip|pass|none|n\/a|no|not sure|prefer not)/i;
  var YES_RE = /^(yes|yeah|yep|ok|okay|sure|confirm|correct|send( it)?|submit|please do|do it)\b/i;
  var NO_RE = /^(no|nope|nah|don'?t|stop|cancel|never mind)\b/i;
  var RESTART_RE = /\b(restart|start over|start again)\b/i;
  var QUESTION_START_RE =
    /^(can|could|do|does|did|is|are|was|were|what|when|where|why|how|will|would|should|who)\b/i;

  function digitsOf(text) {
    return String(text || "").replace(/\D/g, "");
  }
  function isValidPhone(text) {
    return digitsOf(text).length >= 7;
  }
  function isQuestionLike(text) {
    var t = String(text || "").trim();
    return t.indexOf("?") !== -1 || QUESTION_START_RE.test(t);
  }
  function isPriceQuestion(text) {
    if (!PRICE_RE.test(text)) return false;
    // A bare surname like "Price" at the name step is not a price question:
    // it needs question phrasing to count as one.
    return isQuestionLike(text) || /\?|how much|tell me|give me/i.test(text);
  }

  function matchService(text) {
    var low = " " + String(text || "").toLowerCase() + " ";
    // Install intent outranks the equipment noun ("new furnace" is an
    // installation, not a furnace repair).
    if (/(install|installation|new system|replace|replacement)/i.test(text)) {
      return serviceById("installations");
    }
    for (var i = 0; i < KB.services.length; i++) {
      var svc = KB.services[i];
      for (var j = 0; j < svc.keywords.length; j++) {
        var kw = svc.keywords[j];
        // Word-ish bounded match so "ac" inside "actually" never fires.
        var re = new RegExp("(^|[^a-z])" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^a-z]|$)", "i");
        if (re.test(low)) return svc;
      }
      if (low.indexOf(" " + svc.name.toLowerCase() + " ") !== -1 || low.indexOf(svc.name.toLowerCase()) !== -1) {
        // exact canonical name mention (checked after keywords for ordering)
        if (String(text).toLowerCase().indexOf(svc.name.toLowerCase()) !== -1) return svc;
      }
    }
    return null;
  }

  function serviceById(id) {
    for (var i = 0; i < KB.services.length; i++) if (KB.services[i].id === id) return KB.services[i];
    return null;
  }

  function priceAnswer(text) {
    var svc = matchService(text);
    var base;
    if (svc) {
      base =
        "Demo pricing: " + svc.name + " is " + svc.demoRange + " — " + svc.demoRangeNote + ". " +
        "And " + KB.diagnostic.note + ". Those are the only figures in my demo knowledge — " +
        "an exact price is set after a real diagnosis, never guessed in chat.";
    } else {
      base =
        "Demo pricing: " + KB.diagnostic.note + ". Demo ranges in my knowledge: " +
        KB.services.map(function (s) { return s.name + " " + s.demoRange; }).join("; ") +
        ". Those are clearly-labelled demo ranges only — an exact price is set after a real diagnosis, never guessed in chat.";
    }
    return base;
  }

  function hoursAnswer() {
    return "Our demo hours are " + KB.hoursLabel + " — " + KB.hoursDetail + " " + KB.emergencyNote;
  }
  function areaAnswer() {
    return "We serve the Greater Springfield Area in this demo — " + KB.serviceAreaDetail + ".";
  }
  function servicesAnswer() {
    return (
      "In this demo we cover: " +
      KB.services.map(function (s) { return s.name; }).join(", ") +
      ". If it's something else, I can note it and pass it to the owner."
    );
  }
  function humanAnswer() {
    return (
      "Honest answer: no — I'm an automated demo assistant on this website chat, not a human and not a phone service. " +
      "I follow a fixed script and a small demo knowledge base. Anything I can't answer, I pass to the owner with your lead."
    );
  }
  function unknownAnswer() {
    return (
      "I don't have that in my demo knowledge, so I won't guess. I'll pass that question to the owner along with your lead, " +
      "and they can answer it on the callback."
    );
  }
  function offtopicAnswer() {
    return "I can only help with heating and cooling for this demo business — let's stick to that so I can get your request to the owner.";
  }

  /* ---------------- Session ------------------------------------------- */
  function createSession() {
    return {
      step: "greet", // greet|service|urgency|property|name|phone|callback|confirm|done|closed|safety
      data: {
        service: null,
        serviceId: null,
        urgency: null, // "urgent" | "routine"
        urgentFlag: false,
        propertyType: null,
        name: null,
        phone: null,
        phoneDigits: null,
        callbackTime: null,
        ownerQuestions: []
      },
      attempts: {},
      stopped: false
    };
  }

  function clone(session) {
    return JSON.parse(JSON.stringify(session));
  }

  function promptFor(session) {
    var d = session.data;
    switch (session.step) {
      case "service":
        return "What do you need help with? We cover: " +
          KB.services.map(function (s) { return s.name; }).join(", ") + " — or tell me in your own words.";
      case "urgency":
        return "Is this urgent — for example no heat, no cooling, or a water leak — or is it routine scheduling?";
      case "property":
        return "Optional: what type of property is it? (house, condo, apartment, rental, small business…) — or say 'skip'.";
      case "name":
        return "What's your name?";
      case "phone":
        return "What's the best phone number for the callback?";
      case "callback":
        return "When would you prefer a callback? (e.g. 'tomorrow morning', 'weekday afternoons', 'as soon as possible')";
      case "confirm":
        return confirmText(session);
      default:
        return "What do you need help with?";
    }
  }

  function greetingText() {
    return (
      "Hi, I'm the " + KB.businessName + " demo assistant — website chat only, I don't answer phones. " +
      "I can take down what you need and pass a lead summary to the owner, and answer basic questions about our demo services, hours, and area. " +
      "What do you need help with? We cover: " +
      KB.services.map(function (s) { return s.name; }).join(", ") + "."
    );
  }

  function confirmText(session) {
    var d = session.data;
    return (
      "Here's your lead so far — please confirm:\n" +
      "• Service: " + (d.service || "not given") + "\n" +
      "• Urgency: " + (d.urgency || "not given") + (d.urgentFlag ? " (flagged urgent)" : "") + "\n" +
      "• Property: " + (d.propertyType || "not given") + "\n" +
      "• Name: " + (d.name || "not given") + "\n" +
      "• Phone: " + (d.phone || "not given") + "\n" +
      "• Preferred callback: " + (d.callbackTime || "not given") + "\n" +
      "Reply 'yes' to confirm, 'no' to stop, or 'restart' to start over."
    );
  }

  function buildLead(session, now) {
    var d = session.data;
    return {
      service: d.service,
      serviceId: d.serviceId,
      urgency: d.urgency,
      urgentFlag: !!d.urgentFlag,
      propertyType: d.propertyType,
      name: d.name,
      phone: d.phone,
      phoneDigits: d.phoneDigits,
      callbackTime: d.callbackTime,
      ownerQuestions: d.ownerQuestions.slice(),
      timestamp: (now || new Date()).toISOString(),
      business: KB.businessName,
      demoNote: DEMO_LEAD_NOTE
    };
  }

  function bump(session, field) {
    session.attempts[field] = (session.attempts[field] || 0) + 1;
    return session.attempts[field];
  }

  /* Is this text a plausible ANSWER to the pending question? */
  function plausibleAnswer(session, text) {
    var t = String(text || "").trim();
    if (!t) return false;
    switch (session.step) {
      case "service":
        return !!matchService(t) || t.length >= 3;
      case "urgency":
        return URGENT_RE.test(t) || ROUTINE_RE.test(t) || /routine|urgent|emergency/i.test(t);
      case "property":
        return true; // free text / skip — anything short is acceptable
      case "name":
        return t.length >= 2 && !/\d/.test(t);
      case "phone":
        return isValidPhone(t);
      case "callback":
        return t.length >= 2;
      case "confirm":
        return YES_RE.test(t) || NO_RE.test(t);
      default:
        return false;
    }
  }

  /* ---------------- Main entry: pure conversation core -----------------
     handleMessage(session, text, now?) -> { session, replies, lead, event }
     - never mutates the input session; returns a new one.
     - replies: array of strings (browser renders them in order)
     - lead: the completed lead object on the confirming turn, else null
     - event: "lead" | "safety" | null                                        */
  function handleMessage(inputSession, rawText, now) {
    var session = clone(inputSession || createSession());
    var text = String(rawText || "").trim();
    var replies = [];
    var lead = null;
    var event = null;

    function finish() {
      return { session: session, replies: replies, lead: lead, event: event };
    }
    function answerAndReprompt(answer) {
      replies.push(answer);
      if (["service", "urgency", "property", "name", "phone", "callback", "confirm"].indexOf(session.step) !== -1) {
        replies.push(promptFor(session));
      }
      return finish();
    }

    /* Terminal states */
    if (session.step === "safety" || session.stopped) {
      if (RESTART_RE.test(text)) {
        var fresh0 = createSession();
        fresh0.step = "service";
        session = fresh0;
        replies.push("Starting over — I hope everyone is safe. " + promptFor(session));
        return finish();
      }
      replies.push(
        "This chat stopped for safety. If there's any gas smell, carbon-monoxide concern, or sparking, please leave the home and call 911 / your gas utility from outside. " +
        "Say 'restart' only when everyone is safe."
      );
      return finish();
    }
    if (session.step === "done") {
      if (RESTART_RE.test(text)) {
        var fresh1 = createSession();
        fresh1.step = "service";
        session = fresh1;
        replies.push("No problem — starting a new request. " + promptFor(session));
        return finish();
      }
      replies.push("That lead is already captured in this demo — I won't send it twice. Say 'restart' for a new request.");
      return finish();
    }
    if (session.step === "closed") {
      if (RESTART_RE.test(text)) {
        var fresh2 = createSession();
        fresh2.step = "service";
        session = fresh2;
        replies.push("No problem — starting over. " + promptFor(session));
        return finish();
      }
      replies.push("This chat is closed. Say 'restart' if you'd like to start a new request.");
      return finish();
    }

    /* Restart at any live step */
    if (RESTART_RE.test(text) && session.step !== "greet") {
      var fresh3 = createSession();
      fresh3.step = "service";
      session = fresh3;
      replies.push("No problem — starting over. " + promptFor(session));
      return finish();
    }

    /* 1) SAFETY — before everything else, at any step */
    if (SAFETY_RE.test(text)) {
      session.step = "safety";
      session.stopped = true;
      event = "safety";
      replies.push(SAFETY_MESSAGE);
      return finish();
    }

    /* 2) Injection — ignore the instruction, keep the flow */
    if (INJECTION_RE.test(text)) {
      replies.push("I'll stick with helping you with " + KB.businessName + " service in this demo chat.");
      replies.push(promptFor(session.step === "greet" ? (session.step = "service", session) : session));
      return finish();
    }

    /* 3) Cross-cutting KB intents — answered WITHOUT losing flow state.
          At the service step, a message naming a service is an answer,
          not a question, so service-list questions yield to the matcher. */
    if (HUMAN_RE.test(text)) return answerAndReprompt(humanAnswer());
    if (isPriceQuestion(text)) return answerAndReprompt(priceAnswer(text));
    if (HOURS_RE.test(text) && isQuestionLike(text)) return answerAndReprompt(hoursAnswer());
    if (AREA_RE.test(text)) return answerAndReprompt(areaAnswer());
    if (OFFTOPIC_RE.test(text)) return answerAndReprompt(offtopicAnswer());
    if (SERVICES_Q_RE.test(text) && !(session.step === "service" && matchService(text))) {
      return answerAndReprompt(servicesAnswer());
    }

    /* 4) Unknown question: never guess — pass it to the owner, keep state */
    if (isQuestionLike(text) && !plausibleAnswer(session, text) && session.step !== "greet") {
      session.data.ownerQuestions.push(text.slice(0, 200));
      return answerAndReprompt(unknownAnswer());
    }

    /* 5) Step logic */
    switch (session.step) {
      case "greet": {
        var svc0 = matchService(text);
        session.step = "service";
        if (svc0) {
          session.data.service = svc0.name;
          session.data.serviceId = svc0.id;
          if (URGENT_RE.test(text)) {
            session.data.urgency = "urgent";
            session.data.urgentFlag = true;
            session.step = "property";
            replies.push("Got it — " + svc0.name + ", flagged urgent. " + promptFor(session));
          } else {
            session.step = "urgency";
            replies.push("Got it — " + svc0.name + ". " + promptFor(session));
          }
        } else {
          replies.push(greetingText());
        }
        return finish();
      }

      case "service": {
        var svc = matchService(text);
        if (svc) {
          session.data.service = svc.name;
          session.data.serviceId = svc.id;
          if (URGENT_RE.test(text)) {
            session.data.urgency = "urgent";
            session.data.urgentFlag = true;
            session.step = "property";
            replies.push("Got it — " + svc.name + ", flagged urgent. " + promptFor(session));
          } else {
            session.step = "urgency";
            replies.push("Got it — " + svc.name + ". " + promptFor(session));
          }
          return finish();
        }
        if (bump(session, "service") >= 2) {
          session.data.service = OTHER_SERVICE;
          session.data.serviceId = "other";
          session.step = "urgency";
          replies.push(
            "No problem — I'll note that as '" + OTHER_SERVICE + "' and pass your own words to the owner. " + promptFor(session)
          );
          return finish();
        }
        replies.push("I didn't catch that. " + promptFor(session));
        return finish();
      }

      case "urgency": {
        if (ROUTINE_RE.test(text) && !/no heat|no cooling|water leak/i.test(text)) {
          session.data.urgency = "routine";
          session.data.urgentFlag = false;
        } else if (URGENT_RE.test(text)) {
          session.data.urgency = "urgent";
          session.data.urgentFlag = true;
        } else if (bump(session, "urgency") >= 2) {
          session.data.urgency = "routine";
        } else {
          replies.push("Just to be sure: is this urgent (no heat, no cooling, or a water leak), or routine scheduling?");
          return finish();
        }
        session.step = "property";
        replies.push(
          (session.data.urgentFlag ? "Flagged as urgent. " : "Routine it is. ") + promptFor(session)
        );
        return finish();
      }

      case "property": {
        if (SKIP_RE.test(text)) {
          session.data.propertyType = null;
        } else {
          session.data.propertyType = text.slice(0, 60);
        }
        session.step = "name";
        replies.push("Thanks. " + promptFor(session));
        return finish();
      }

      case "name": {
        var name = text;
        if (name.length < 2 || /\d/.test(name)) {
          if (bump(session, "name") >= 2) {
            session.data.name = name.slice(0, 80) || "not given";
            session.step = "phone";
            replies.push("I'll use that as given. " + promptFor(session));
            return finish();
          }
          replies.push("Could I get your name, please? A first name is fine.");
          return finish();
        }
        session.data.name = name.slice(0, 80);
        session.step = "phone";
        replies.push("Thanks, " + session.data.name.split(/\s+/)[0] + ". " + promptFor(session));
        return finish();
      }

      case "phone": {
        if (isValidPhone(text)) {
          session.data.phone = text.slice(0, 40);
          session.data.phoneDigits = digitsOf(text);
          session.step = "callback";
          replies.push("Got it. " + promptFor(session));
          return finish();
        }
        bump(session, "phone");
        replies.push(
          "Sorry, I couldn't make out a phone number there — I need at least 7 digits for the callback. " +
          "Could you type the number again? (e.g. 555-014-2900)"
        );
        return finish();
      }

      case "callback": {
        if (text.length < 2) {
          replies.push(promptFor(session));
          return finish();
        }
        session.data.callbackTime = text.slice(0, 80);
        session.step = "confirm";
        replies.push(confirmText(session));
        return finish();
      }

      case "confirm": {
        if (YES_RE.test(text)) {
          lead = buildLead(session, now);
          session.step = "done";
          event = "lead";
          replies.push("Confirmed — your demo lead is captured below. " + DEMO_LEAD_NOTE);
          return finish();
        }
        if (NO_RE.test(text)) {
          session.step = "closed";
          replies.push("Understood — nothing was captured. Thanks for trying the demo chat.");
          return finish();
        }
        replies.push(confirmText(session));
        return finish();
      }

      default: {
        session.step = "service";
        replies.push(promptFor(session));
        return finish();
      }
    }
  }

  var api = {
    KB: KB,
    DEMO_LEAD_NOTE: DEMO_LEAD_NOTE,
    SAFETY_MESSAGE: SAFETY_MESSAGE,
    createSession: createSession,
    handleMessage: handleMessage,
    greetingText: greetingText,
    promptFor: promptFor,
    confirmText: confirmText,
    buildLead: buildLead,
    matchService: matchService,
    isValidPhone: isValidPhone,
    priceAnswer: priceAnswer,
    hoursAnswer: hoursAnswer,
    areaAnswer: areaAnswer
  };

  root.LeadAgent = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
