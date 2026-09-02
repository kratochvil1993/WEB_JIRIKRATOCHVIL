/* ============ Cookie consent + Google Consent Mode v2 (Advanced) ============
   Loaded on every page. GTM (GTM-MPVVNJCG) now loads on every page view — but
   an inline <head> snippet on each page sets all consent signals to "denied"
   *before* GTM, so Google tags start in cookieless mode: no analytics/ads
   cookies, only anonymous consent-signal pings, until the visitor answers the
   banner. "Souhlasím" pushes a `consent update` granting analytics + ads
   storage; "Odmítnout" pushes an explicit denied update so GTM stops waiting.
   The choice is remembered in localStorage so the banner only shows once per
   browser (and is re-applied before GTM inits on repeat visits, so there's no
   denied -> granted flip).
   A "Nastavení cookies" link in the footer / GDPR page (#cookie-settings)
   re-opens the banner so the choice can be changed at any time.
   The GTM <noscript> fallback is deliberately NOT included: with no JS the
   banner can't be shown or answered either, so nothing should load. */
(function () {
  "use strict";

  var GTM_ID = "GTM-MPVVNJCG";
  var STORAGE_KEY = "cookieConsent"; // "granted" | "denied"

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  var GRANT = {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted"
  };
  var DENY = {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied"
  };

  function loadGTM() {
    if (window.__gtmLoaded) return;
    window.__gtmLoaded = true;
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var f = document.getElementsByTagName("script")[0];
    var j = document.createElement("script");
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    f.parentNode.insertBefore(j, f);
  }

  var banner = document.getElementById("cookie-consent");

  function remember(v) { try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {} }

  // Show the banner and (once) wire its buttons. Safe to call repeatedly —
  // the footer "Nastavení cookies" link calls it to let visitors change
  // their mind after they've already answered.
  function showBanner() {
    if (!banner) return;
    banner.hidden = false;
    if (banner.__wired) return;
    banner.__wired = true;
    var accept = document.getElementById("cookie-accept");
    var decline = document.getElementById("cookie-decline");
    if (accept) {
      accept.addEventListener("click", function () {
        remember("granted");
        banner.hidden = true;
        gtag("consent", "update", GRANT);
      });
    }
    if (decline) {
      decline.addEventListener("click", function () {
        remember("denied");
        banner.hidden = true;
        gtag("consent", "update", DENY);
      });
    }
  }

  var settings = document.getElementById("cookie-settings");
  if (settings) {
    settings.addEventListener("click", function (e) {
      e.preventDefault();
      showBanner();
    });
  }

  var stored = null;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  // Re-apply a remembered choice before GTM initialises so tags see the final
  // consent state from their first evaluation (no denied -> granted flip).
  if (stored === "granted") gtag("consent", "update", GRANT);
  else if (stored === "denied") gtag("consent", "update", DENY);

  // Advanced mode: the container always loads; consent state gates the tags.
  loadGTM();

  if (stored !== "granted" && stored !== "denied") showBanner();
})();
