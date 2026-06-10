/* =============================================================================
   Shared dashboard JS. Vanilla, no dependencies.
     - Sortable + filterable + permalinkable DataTable
     - Methodology modals (#method= deep link, .method-pop trigger)
     - Row highlight from #row=<rowId> URL fragment
     - Copy-link buttons on each row anchor
   ============================================================================= */

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // Sortable tables
  // ---------------------------------------------------------------------------
  function initSortable(table) {
    var ths = table.querySelectorAll("thead th[data-sortable]");
    if (!ths.length) return;
    ths.forEach(function (th, idx) {
      th.setAttribute("tabindex", "0");
      th.setAttribute("role", "button");
      th.setAttribute("aria-sort", "none");
      var handler = function () {
        var tb = table.querySelector("tbody");
        if (!tb) return;
        var rows = Array.from(tb.querySelectorAll("tr"));
        var asc = th.dataset.sortAsc !== "true";
        ths.forEach(function (h) {
          delete h.dataset.sortAsc;
          h.setAttribute("aria-sort", "none");
        });
        th.dataset.sortAsc = asc ? "true" : "false";
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        rows.sort(function (a, b) {
          var av = sortValue(a.children[idx]);
          var bv = sortValue(b.children[idx]);
          if (typeof av === "number" && typeof bv === "number") {
            return asc ? av - bv : bv - av;
          }
          var as = String(av).toLowerCase();
          var bs = String(bv).toLowerCase();
          return asc ? as.localeCompare(bs) : bs.localeCompare(as);
        });
        rows.forEach(function (r) { tb.appendChild(r); });
      };
      th.addEventListener("click", handler);
      th.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      });
    });
  }

  function sortValue(cell) {
    if (!cell) return "";
    if (cell.dataset && cell.dataset.sortValue != null) {
      var n = parseFloat(cell.dataset.sortValue);
      return isNaN(n) ? cell.dataset.sortValue : n;
    }
    var t = cell.innerText.trim().replace(/,/g, "");
    if (/^-?\d+(\.\d+)?%?$/.test(t)) return parseFloat(t);
    if (/^-?\d+(\.\d+)?[a-z%]+$/i.test(t)) return parseFloat(t);
    return t;
  }

  // ---------------------------------------------------------------------------
  // Filterable tables
  // ---------------------------------------------------------------------------
  function initFilter(wrap) {
    var input = wrap.querySelector('input[type="search"][data-filter]');
    if (!input) return;
    var table = wrap.querySelector("table.data");
    if (!table) return;
    var info = wrap.querySelector(".table-info");
    var rows = Array.from(table.querySelectorAll("tbody tr"));
    var total = rows.length;
    function apply() {
      var q = input.value.trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (r) {
        var hit = q === "" || r.innerText.toLowerCase().indexOf(q) !== -1;
        r.style.display = hit ? "" : "none";
        if (hit) shown++;
      });
      if (info) info.textContent =
        q ? (shown + " of " + total + " match") : (total + " rows");
    }
    input.addEventListener("input", apply);
    apply();
  }

  // ---------------------------------------------------------------------------
  // Row anchors -- highlight + scroll on #row=<id>
  // ---------------------------------------------------------------------------
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  function initRowAnchors() {
    document.querySelectorAll("table.data tbody tr[data-row-id]").forEach(function (tr) {
      var firstCell = tr.children[0];
      if (!firstCell || firstCell.querySelector(".row-anchor")) return;
      var id = tr.dataset.rowId;
      var anchor = document.createElement("a");
      anchor.className = "row-anchor";
      anchor.href = "#row=" + encodeURIComponent(id);
      anchor.textContent = "\u00b6";
      anchor.title = "Copy link to this row";
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        var url = window.location.href.split("#")[0] + "#row=" + encodeURIComponent(id);
        copyToClipboard(url).then(function () {
          anchor.textContent = "\u2713";
          setTimeout(function () { anchor.textContent = "\u00b6"; }, 1200);
        });
        history.replaceState(null, "", "#row=" + encodeURIComponent(id));
      });
      firstCell.insertBefore(anchor, firstCell.firstChild);
      firstCell.insertBefore(document.createTextNode(" "), firstCell.children[1] || null);
    });
  }

  function highlightFromHash() {
    var m = (window.location.hash || "").match(/^#row=(.+)$/);
    if (!m) return;
    var id = decodeURIComponent(m[1]);
    var tr = document.querySelector('tr[data-row-id="' + cssEscape(id) + '"]');
    if (!tr) return;
    document.querySelectorAll("tr.is-highlighted").forEach(function (e) {
      e.classList.remove("is-highlighted");
    });
    tr.classList.add("is-highlighted");
    // Open any <details> ancestors
    var parent = tr.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === "DETAILS") parent.setAttribute("open", "");
      parent = parent.parentElement;
    }
    setTimeout(function () { tr.scrollIntoView({ behavior: "smooth", block: "center" }); }, 30);
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (c) {
      return "\\" + c.charCodeAt(0).toString(16) + " ";
    });
  }

  // ---------------------------------------------------------------------------
  // Methodology modals
  // ---------------------------------------------------------------------------
  function initMethodPops() {
    document.querySelectorAll("[data-method]").forEach(function (trigger) {
      trigger.setAttribute("role", "button");
      trigger.setAttribute("tabindex", "0");
      var handler = function (e) {
        e.preventDefault();
        var id = trigger.dataset.method;
        var modal = document.getElementById(id);
        if (modal) openModal(modal);
      };
      trigger.addEventListener("click", handler);
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") handler(e);
      });
    });
    document.querySelectorAll(".modal").forEach(function (modal) {
      var close = modal.querySelector(".modal-close");
      if (close) close.addEventListener("click", function () { closeModal(modal); });
      modal.addEventListener("click", function (e) {
        if (e.target === modal) closeModal(modal);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".modal.is-open").forEach(closeModal);
      }
    });
  }
  function openModal(m) { m.classList.add("is-open"); m.setAttribute("aria-hidden", "false"); }
  function closeModal(m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  function init() {
    document.querySelectorAll("table.data").forEach(initSortable);
    document.querySelectorAll(".table-wrap").forEach(initFilter);
    initRowAnchors();
    initMethodPops();
    highlightFromHash();
    window.addEventListener("hashchange", highlightFromHash);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
