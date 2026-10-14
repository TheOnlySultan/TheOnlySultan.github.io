/* Copperline demo — page UI + chat widget wiring.
   All conversation logic lives in agent.js (window.LeadAgent).
   This file only renders messages / lead cards and handles page chrome.
   No network calls anywhere: the lead lives and dies in this tab. */
(function () {
  "use strict";

  /* ---------- header / mobile menu ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") menu.classList.remove("open");
    });
  }

  /* ---------- chat widget ---------- */
  var A = window.LeadAgent;
  var launcher = document.getElementById("chatLauncher");
  var panel = document.getElementById("chatPanel");
  var closeBtn = document.getElementById("chatClose");
  var messagesEl = document.getElementById("chatMessages");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatInput");
  var quickEl = document.getElementById("chatQuick");

  var session = A.createSession();
  var greeted = false;

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, kind) {
    var div = document.createElement("div");
    div.className = "msg " + (kind === "user" ? "msg-user" : kind === "safety" ? "msg-safety" : "msg-agent");
    div.textContent = text; // textContent only — visitor text is never HTML
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function fmtTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: "numeric", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit"
      });
    } catch (e) {
      return iso;
    }
  }

  function addLeadCard(lead) {
    var card = document.createElement("div");
    card.className = "lead-card";
    var title = document.createElement("h4");
    title.textContent = "Lead summary — " + lead.business + " (demo)";
    card.appendChild(title);

    var dl = document.createElement("dl");
    var rows = [
      ["Service", lead.service || "not given"],
      ["Urgency", lead.urgentFlag ? "URGENT" : (lead.urgency || "not given")],
      ["Property", lead.propertyType || "not given"],
      ["Name", lead.name || "not given"],
      ["Phone", lead.phone || "not given"],
      ["Preferred callback", lead.callbackTime || "not given"],
      ["Captured", fmtTime(lead.timestamp)]
    ];
    if (lead.ownerQuestions && lead.ownerQuestions.length) {
      rows.push(["Passed to owner", lead.ownerQuestions.join(" · ")]);
    }
    rows.forEach(function (r) {
      var row = document.createElement("div");
      row.className = "row";
      var dt = document.createElement("dt");
      dt.textContent = r[0];
      var dd = document.createElement("dd");
      dd.textContent = r[1];
      if (r[0] === "Urgency" && lead.urgentFlag) dd.className = "urgent";
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });
    card.appendChild(dl);

    var note = document.createElement("p");
    note.className = "demo-note";
    note.textContent = lead.demoNote;
    card.appendChild(note);

    messagesEl.appendChild(card);
    scrollToBottom();
  }

  function send(text) {
    var msg = (text || "").trim();
    if (!msg) return;
    addMessage(msg, "user");
    var result = A.handleMessage(session, msg);
    session = result.session;
    result.replies.forEach(function (r) {
      addMessage(r, result.event === "safety" ? "safety" : "agent");
    });
    if (result.lead) addLeadCard(result.lead);
    if (quickEl && session.step !== "service") quickEl.style.display = "none";
  }

  function openChat(prefill) {
    panel.hidden = false;
    launcher.style.display = "none";
    launcher.setAttribute("aria-expanded", "true");
    if (!greeted) {
      greeted = true;
      addMessage(A.greetingText(), "agent");
      // The greeting already asks the service question; move the core
      // past the greet step so the visitor's first reply is an answer.
      session.step = "service";
    }
    if (prefill) {
      input.value = "";
      send(prefill);
    } else {
      input.focus();
    }
  }

  function closeChat() {
    panel.hidden = true;
    launcher.style.display = "";
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", function () { openChat(); });
  closeBtn.addEventListener("click", closeChat);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) closeChat();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = input.value;
    input.value = "";
    send(v);
    input.focus();
  });

  if (quickEl) {
    quickEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-quick]");
      if (b) send(b.getAttribute("data-quick"));
    });
  }

  /* Any [data-open-chat] button opens the chat; data-prefill sends a
     starter message; data-service just opens it (visitor stays in
     control of what gets sent). */
  document.querySelectorAll("[data-open-chat]").forEach(function (el) {
    el.addEventListener("click", function () {
      openChat(el.getAttribute("data-prefill") || null);
    });
  });
})();
