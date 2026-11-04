/* Product Radar boot script. Loaded before the app so the strict Content-Security-Policy
   (script-src 'self', no inline scripts or inline event handlers) works:
   - applies the saved light/dark theme before first paint
   - replaces inline onerror/onclick attributes with delegated listeners (data-fb / data-act) */
(function () {
  try { var m = localStorage.getItem("theme"); if (m) document.documentElement.dataset.theme = m } catch (e) {}

  // Broken product photos: data-fb="noimg" shows the placeholder, data-fb="rmpc" removes the whole product card.
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (!el || el.tagName !== "IMG" || !el.dataset) return;
    var fb = el.dataset.fb;
    if (fb === "noimg" && el.parentNode) {
      el.parentNode.innerHTML = typeof noImg !== "undefined" ? noImg : "";
    } else if (fb === "rmpc") {
      var card = el.closest(".pc");
      if (card) card.remove();
    }
  }, true);

  // Buttons: data-act="print"
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
    if (!b) return;
    if (b.dataset.act === "print") { e.preventDefault(); window.print(); }
  });
})();
