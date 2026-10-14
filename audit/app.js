(function () {
  "use strict";

  var chips = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll(".finding[data-severity]"));
  var status = document.getElementById("filter-status");
  var sections = Array.prototype.slice.call(document.querySelectorAll(".audit-section"));

  function applyFilter(filter) {
    var visible = 0;
    cards.forEach(function (card) {
      var show = filter === "all" || card.getAttribute("data-severity") === filter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    sections.forEach(function (section) {
      var anyVisible = Array.prototype.some.call(
        section.querySelectorAll(".finding[data-severity]"),
        function (card) { return !card.hidden; }
      );
      var hasCards = section.querySelectorAll(".finding[data-severity]").length > 0;
      section.style.display = hasCards && !anyVisible ? "none" : "";
    });
    chips.forEach(function (chip) {
      chip.setAttribute("aria-pressed", chip.getAttribute("data-filter") === filter ? "true" : "false");
    });
    if (status) {
      status.textContent = "Showing " + visible + " of " + cards.length + " findings";
    }
  }

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      applyFilter(chip.getAttribute("data-filter"));
    });
  });

  // Expand / collapse per finding
  var toggles = Array.prototype.slice.call(document.querySelectorAll(".toggle[data-target]"));
  toggles.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var body = document.getElementById(btn.getAttribute("data-target"));
      if (!body) return;
      var willShow = body.hidden;
      body.hidden = !willShow;
      btn.setAttribute("aria-expanded", willShow ? "true" : "false");
      btn.textContent = willShow ? "Collapse" : "Details";
    });
  });

  var expandAllBtn = document.getElementById("expand-all");
  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", function () {
      var anyHidden = toggles.some(function (b) {
        var el = document.getElementById(b.getAttribute("data-target"));
        return el && el.hidden;
      });
      toggles.forEach(function (btn) {
        var body = document.getElementById(btn.getAttribute("data-target"));
        if (!body) return;
        body.hidden = !anyHidden;
        btn.setAttribute("aria-expanded", anyHidden ? "true" : "false");
        btn.textContent = anyHidden ? "Collapse" : "Details";
      });
      expandAllBtn.textContent = anyHidden ? "Collapse all findings" : "Expand all findings";
    });
  }

  applyFilter("all");
})();
