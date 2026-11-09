/* ============ Jiří Kratochvíl – podstránky (web, marketing, fotografie) ============
   Lehká obdoba script.js: žádné pinování, hero scéna ani částice — jen to, co
   podstránka opravdu potřebuje (navbar, mobilní menu, tlačítko nahoru, kurzor,
   odkrývání obsahu při scrollu). script.js zůstává jen pro index.html. */
(function () {
  "use strict";

  /* Bez GSAP (výpadek načtení) nesmí zůstat obsah schovaný přes .js .reveal. */
  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    document.documentElement.classList.remove("js");
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isMobile = window.matchMedia("(max-width: 991px)").matches;

  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- Navbar blur on scroll ---------------- */
  var navbar = document.getElementById("mainNav");
  if (navbar) {
    ScrollTrigger.create({
      start: 40,
      end: 99999,
      onUpdate: function (self) {
        navbar.classList.toggle("scrolled", self.scroll() > 40);
      }
    });
  }

  /* ---------------- Mobile nav collapse ---------------- */
  var navMenuEl = document.getElementById("navMenu");
  var navToggler = document.querySelector(".navbar-toggler");
  var navOpen = false;
  function setNav(open) {
    if (!navMenuEl || open === navOpen) return;
    navOpen = open;
    if (navToggler) {
      navToggler.setAttribute("aria-expanded", open ? "true" : "false");
      navToggler.classList.toggle("collapsed", !open);
    }
    gsap.killTweensOf(navMenuEl);
    if (open) {
      navMenuEl.classList.add("show");
      if (!reduceMotion) {
        gsap.fromTo(navMenuEl, { height: 0, overflow: "hidden" },
          { height: "auto", duration: 0.35, ease: "power2.out", clearProps: "height,overflow" });
      }
    } else if (!reduceMotion) {
      gsap.to(navMenuEl, {
        height: 0, overflow: "hidden", duration: 0.3, ease: "power2.in",
        onComplete: function () { navMenuEl.classList.remove("show"); gsap.set(navMenuEl, { clearProps: "height,overflow" }); }
      });
    } else {
      navMenuEl.classList.remove("show");
    }
  }
  if (navToggler) navToggler.addEventListener("click", function () { setNav(!navOpen); });

  /* ---------------- Go to top button (s prstencem postupu) ---------------- */
  var toTopBtn = document.getElementById("toTop");
  if (toTopBtn) {
    ScrollTrigger.create({
      start: 600,
      end: 99999,
      onUpdate: function (self) {
        toTopBtn.classList.toggle("visible", self.scroll() > 600);
      }
    });
    var ringBar = toTopBtn.querySelector(".ring-bar");
    if (ringBar) {
      var ringLen = 2 * Math.PI * ringBar.r.baseVal.value;
      ringBar.style.strokeDasharray = ringLen;
      var setRing = function (self) {
        ringBar.style.strokeDashoffset = ringLen * (1 - self.progress);
      };
      setRing({ progress: 0 });
      ScrollTrigger.create({ start: 0, end: "max", onUpdate: setRing, onRefresh: setRing });
    }
    toTopBtn.addEventListener("click", function () {
      gsap.to(window, { duration: reduceMotion ? 0.01 : 0.8, scrollTo: { y: 0 }, ease: "power2.inOut" });
    });
  }

  /* ---------------- Odkazy na kotvy v rámci stránky ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (navOpen) setNav(false);
      gsap.to(window, {
        duration: reduceMotion ? 0.01 : 0.6,
        scrollTo: { y: target, offsetY: 80 },
        ease: "power2.inOut",
        onComplete: function () { history.pushState(null, "", id); }
      });
    });
  });

  /* ---------------- Custom cursor ---------------- */
  var cursor = document.getElementById("cursor");
  if (cursor && !isMobile) {
    window.addEventListener("mousemove", function (e) {
      gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15, ease: "power2.out" });
    });
    document.querySelectorAll("a, button, summary, input, textarea, .feature-card").forEach(function (el) {
      el.addEventListener("mouseenter", function () { cursor.classList.add("hover"); });
      el.addEventListener("mouseleave", function () { cursor.classList.remove("hover"); });
    });
  }

  /* ---------------- Pozadí: pomalu plovoucí bloby ---------------- */
  if (!reduceMotion) {
    gsap.to("#bg-blob-a", { x: 80, y: 60, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to("#bg-blob-b", { x: -60, y: -80, duration: 17, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to("#bg-gradient", { opacity: 0.85, duration: 6, ease: "sine.inOut", yoyo: true, repeat: -1 });
  }

  /* ---------------- Kontakt: kopírování, třes neplatných polí, odeslání bez přesměrování ----------------
     Totéž co v script.js (index.html). Formulář pořád patří Netlify Forms (stejný název "contact"
     jako na úvodní stránce, takže zprávy chodí do jedné fronty): odesílá se přes fetch (POST na "/"
     s polem form-name), místo přesměrování se ukáže potvrzení ve stránce. Když fetch selže,
     spadne to na nativní odeslání. */
  var copyBtns = document.querySelectorAll(".copy-btn");
  if (copyBtns.length) {
    var toastEl = document.createElement("div");
    toastEl.id = "copyToast";
    toastEl.setAttribute("role", "status");
    toastEl.setAttribute("aria-live", "polite");
    document.body.appendChild(toastEl);
    var toastTimer = null;
    var showToast = function (msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 1900);
    };
    var copyText = function (text) {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
      return new Promise(function (resolve, reject) {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy") ? resolve() : reject(); } catch (err) { reject(err); }
        document.body.removeChild(ta);
      });
    };
    copyBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var icon = btn.querySelector("use");
        copyText(btn.dataset.copy).then(function () {
          showToast("Zkopírováno: " + btn.dataset.copy);
          btn.classList.add("is-copied");
          if (icon) icon.setAttribute("href", "#bi-check2");
          setTimeout(function () { btn.classList.remove("is-copied"); if (icon) icon.setAttribute("href", "#bi-clipboard"); }, 1600);
        }).catch(function () { showToast("Kopírování se nezdařilo"); });
      });
    });
  }

  var form = document.getElementById("contactForm");
  var formSuccess = document.getElementById("formSuccess");
  if (form && formSuccess) {
    if (!reduceMotion) {
      form.addEventListener("invalid", function (e) {
        var box = e.target.closest(".form-floating, .form-check") || e.target;
        gsap.fromTo(box, { x: 0 }, { keyframes: [{ x: -8 }, { x: 8 }, { x: -5 }, { x: 5 }, { x: 0 }], duration: 0.4, ease: "power1.inOut", overwrite: "auto" });
      }, true);
    }
    var showFormSuccess = function () {
      var done = function () {
        form.style.display = "none";
        formSuccess.hidden = false;
        if (!reduceMotion) {
          var circle = formSuccess.querySelector(".fs-circle"), tick = formSuccess.querySelector(".fs-tick");
          gsap.set([circle, tick], { strokeDasharray: 1, strokeDashoffset: 1 });
          gsap.timeline()
            .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" })
            .to(tick, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, "-=0.1")
            .from(formSuccess.querySelectorAll("h3, p"), { y: 14, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.3");
        }
        ScrollTrigger.refresh();
        formSuccess.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      };
      if (reduceMotion) done(); else gsap.to(form, { opacity: 0, y: -10, duration: 0.35, onComplete: done });
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector("button[type=submit]");
      var label = btn && (btn.querySelector(".pill-btn__label") || btn);
      if (btn) { btn.disabled = true; label.textContent = "Odesílám…"; }
      fetch(form.getAttribute("action") || "/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString()
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        showFormSuccess();
      }).catch(function () {
        form.submit(); /* nativní odeslání (stará cesta) */
      });
    });
  }

  /* ---------------- Odkrývání obsahu při scrollu ----------------
     Výchozí průhlednost je v CSS (.js .reveal), tady se jen dávkově odkrývá
     (ScrollTrigger.batch → prvky, které vstoupí najednou, naskakují po sobě).
     Čistě časovaná animace, ne scrub — na mobilech by u scrubu drhla. */
  var revealEls = gsap.utils.toArray(".reveal");
  if (reduceMotion) {
    gsap.set(revealEls, { opacity: 1, y: 0 });
  } else if (revealEls.length) {
    gsap.set(revealEls, { y: 28 });
    ScrollTrigger.batch(revealEls, {
      start: "top 90%",
      once: true,
      onEnter: function (batch) {
        gsap.to(batch, {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
          stagger: 0.09, overwrite: true
        });
      }
    });
  }
})();
