/* ============ Cookie consent + Google Tag Manager (GTM-MPVVNJCG) ============
   Loaded on every page. GTM (and anything measured through it, e.g. GA) is
   only injected after the visitor accepts the banner — never on page load —
   so this stays true to the "no third-party analytics without consent"
   claim in gdpr.html#cookies. The GTM <noscript> fallback is deliberately
   NOT included: with no JS, the consent banner can't be shown or answered
   either, so nothing should load in that case. Choice is remembered in
   localStorage so the banner only shows once per browser. */
(function () {
  "use strict";

  var GTM_ID = "GTM-MPVVNJCG";
  var STORAGE_KEY = "cookieConsent"; // "granted" | "denied"

  function loadGTM() {
    if (window.__gtmLoaded) return;
    window.__gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = document.getElementsByTagName("script")[0];
    var j = document.createElement("script");
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    f.parentNode.insertBefore(j, f);
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  if (stored === "granted") {
    loadGTM();
    return;
  }
  if (stored === "denied") return;

  var banner = document.getElementById("cookie-consent");
  if (!banner) return;
  banner.hidden = false;

  var accept = document.getElementById("cookie-accept");
  var decline = document.getElementById("cookie-decline");

  if (accept) {
    accept.addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "granted"); } catch (e) {}
      banner.hidden = true;
      loadGTM();
    });
  }
  if (decline) {
    decline.addEventListener("click", function () {
      try { localStorage.setItem(STORAGE_KEY, "denied"); } catch (e) {}
      banner.hidden = true;
    });
  }
})();
