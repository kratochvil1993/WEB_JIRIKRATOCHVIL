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

  /* ---------------- Mobilní menu: celoobrazovková vrstva ----------------
     Na <992 px je #navMenu fixní vrstva přes celou obrazovku (CSS). Při prvním otevření se text odkazů
     rozdělí na písmena (+ číslo 01–05), která se při otevření slétnou jako h1 v hero. Reduced motion:
     bez animace, jen zobrazení. Zámek scrollu přes html.nav-open, lišta dostane .nav-open (jinak by její
     backdrop-filter rozbil position:fixed vrstvy), zbytek stránky je inert, Tab drží focus ve vrstvě,
     ESC zavírá a focus se vrací na tlačítko. */
  var navMenuEl = document.getElementById("navMenu");
  var navToggler = document.querySelector(".navbar-toggler");
  var navOpen = false, navBuilt = false, navChars = [], navNums = [], navLinkEls = [], navFootEls = [], navFootLinks = [];
  var navMq = window.matchMedia("(max-width: 991.98px)");
  function buildNavText() {
    if (navBuilt || !navMenuEl) return;
    navBuilt = true;
    navLinkEls = Array.prototype.slice.call(navMenuEl.querySelectorAll(".nav-link"));
    navLinkEls.forEach(function (a, i) {
      var label = a.textContent.replace(/\s+/g, " ").trim();
      a.setAttribute("aria-label", label);
      a.textContent = "";
      var num = document.createElement("span");
      num.className = "nl-num"; num.setAttribute("aria-hidden", "true");
      num.textContent = ("0" + (i + 1)).slice(-2);
      var txt = document.createElement("span");
      txt.className = "nl-txt"; txt.setAttribute("aria-hidden", "true");
      var words = label.split(" ");
      words.forEach(function (word, wi) {
        var w = document.createElement("span");
        w.className = "nl-word";
        word.split("").forEach(function (ch) {
          var c = document.createElement("span");
          c.className = "nl-char"; c.textContent = ch;
          w.appendChild(c); navChars.push(c);
        });
        txt.appendChild(w);
        if (wi < words.length - 1) txt.appendChild(document.createTextNode(" "));
      });
      a.appendChild(num); a.appendChild(txt);
      navNums.push(num);
    });
    /* patička vrstvy: telefon + e-mail jako přímé akce a ikony Instagramu a LinkedInu (na desktopu skrytá CSS) */
    var foot = document.createElement("div");
    foot.className = "nav-foot";
    foot.innerHTML =
      '<span class="nav-foot-item nav-foot-rule" aria-hidden="true"></span>' +
      '<div class="nav-foot-lines">' +
        '<a class="nav-foot-item nav-foot-line" href="tel:+420728544881"><small>Telefon</small><span>+420 728 544 881</span></a>' +
        '<a class="nav-foot-item nav-foot-line" href="mailto:info@jirikratochvil.eu"><small>E-mail</small><span>info@jirikratochvil.eu</span></a>' +
      '</div>' +
      '<div class="nav-foot-item nav-foot-socials">' +
        '<a class="social-ico" href="https://www.instagram.com/ochmi" target="_blank" rel="noopener" aria-label="Instagram"><svg class="bi" aria-hidden="true"><use href="#bi-instagram"/></svg></a>' +
        '<a class="social-ico" href="https://www.linkedin.com/in/ji%C5%99%C3%AD-kratochv%C3%ADl-a61a87208" target="_blank" rel="noopener" aria-label="LinkedIn"><svg class="bi" aria-hidden="true"><use href="#bi-linkedin"/></svg></a>' +
      '</div>';
    navMenuEl.appendChild(foot);
    navFootEls = Array.prototype.slice.call(foot.querySelectorAll(".nav-foot-item"));
    navFootLinks = Array.prototype.slice.call(foot.querySelectorAll("a"));
  }
  /* střed a poloměr kruhu, který se rozlévá z tlačítka menu přes celou obrazovku */
  function navCircle() {
    var r = navToggler ? navToggler.getBoundingClientRect() : null;
    var w = document.documentElement.clientWidth, h = window.innerHeight;
    var cx = r ? r.left + r.width / 2 : w - 40, cy = r ? r.top + r.height / 2 : 40;
    return { cx: cx, cy: cy, R: Math.ceil(Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy))) + 40 };
  }
  function navCircleCss(g, rad) { return "circle(" + rad + "px at " + g.cx + "px " + g.cy + "px)"; }
  function navInert(on) {
    document.querySelectorAll("main, footer, body > section").forEach(function (el) {
      if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  }
  function setNav(open, instant) {
    if (!navMenuEl || open === navOpen) return;
    navOpen = open;
    if (navToggler) {
      navToggler.setAttribute("aria-expanded", open ? "true" : "false");
      navToggler.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
      navToggler.classList.toggle("collapsed", !open);
    }
    if (navbar) {
      navbar.classList.toggle("nav-open", open);
      navbar.classList.remove("nav-closing");   /* případné dozívání předchozího zavření */
    }
    document.documentElement.classList.toggle("nav-open", open);
    navInert(open);
    gsap.killTweensOf([navMenuEl].concat(navChars, navNums, navFootEls));
    var animate = !reduceMotion && !instant;
    if (open) {
      buildNavText();
      navMenuEl.classList.add("show", "nav-layer");
      if (animate) {
        var g = navCircle();
        gsap.fromTo(navMenuEl, { clipPath: navCircleCss(g, 0) }, {
          clipPath: navCircleCss(g, g.R), duration: 0.7, ease: "power3.inOut", overwrite: true,
          onComplete: function () { gsap.set(navMenuEl, { clearProps: "clipPath" }); }
        });
        gsap.fromTo(navChars, {
          x: function () { return gsap.utils.random(-70, 70); },
          y: function () { return gsap.utils.random(-60, 60); },
          rotation: function () { return gsap.utils.random(-45, 45); },
          scale: 0.5, opacity: 0
        }, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.5, ease: "power3.out",
             stagger: { amount: 0.25, from: "random" }, delay: 0.14, overwrite: true });
        gsap.fromTo(navNums, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.05, delay: 0.25, ease: "power2.out", overwrite: true });
        gsap.fromTo(navFootEls, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.07, delay: 0.4, ease: "power2.out", overwrite: true });
      } else {
        gsap.set([navMenuEl].concat(navChars, navNums, navFootEls), { clearProps: "all" });
      }
      if (navLinkEls[0]) navLinkEls[0].focus({ preventScroll: true });
    } else {
      var inMenu = navMenuEl.contains(document.activeElement);
      if (animate) {
        /* odscrollovaná lišta má blur (= containing block pro fixed vrstvu); do konce odeznění ho držíme vypnutý,
           jinak by se mizející menu v půlce fade-outu smrsklo na výšku lišty */
        if (navbar) navbar.classList.add("nav-closing");
        var gc = navCircle();
        gsap.fromTo(navMenuEl, { clipPath: navCircleCss(gc, gc.R) }, {
          clipPath: navCircleCss(gc, 0), duration: 0.45, ease: "power2.inOut", overwrite: true,
          onComplete: function () {
            navMenuEl.classList.remove("show", "nav-layer"); gsap.set(navMenuEl, { clearProps: "opacity,clipPath" });
            if (navbar) navbar.classList.remove("nav-closing");
          }
        });
      } else {
        navMenuEl.classList.remove("show", "nav-layer");
        gsap.set([navMenuEl].concat(navChars, navNums, navFootEls), { clearProps: "all" });
      }
      if (inMenu && navToggler) navToggler.focus({ preventScroll: true });
    }
  }
  if (navToggler) navToggler.addEventListener("click", function () { setNav(!navOpen); });
  document.addEventListener("keydown", function (e) {
    if (!navOpen) return;
    if (e.key === "Escape") { setNav(false); return; }
    if (e.key !== "Tab") return;
    var brand = document.querySelector(".navbar-custom .brand");
    var ring = [brand, navToggler].concat(navLinkEls, navFootLinks).filter(Boolean);
    var i = ring.indexOf(document.activeElement);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); ring[ring.length - 1].focus(); }
    else if (!e.shiftKey && (i === ring.length - 1)) { e.preventDefault(); ring[0].focus(); }
  });
  /* po zvětšení okna na desktop (otočení tabletu) vrstvu hned zavřít, jinak by zůstal zámek scrollu */
  var navMqChange = function (e) { if (!e.matches && navOpen) setNav(false, true); };
  if (navMq.addEventListener) navMq.addEventListener("change", navMqChange); else navMq.addListener(navMqChange);

  /* Kroužek postupu kolem tlačítka menu (mobil): --scroll-progress se píše jen na tlačítko, ne na :root
     (custom property na :root by přepočítávala styly celého dokumentu při každém scrollu). */
  if (navToggler) {
    var ringTick = false;
    var ringUpdate = function () {
      ringTick = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      navToggler.style.setProperty("--scroll-progress", max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)).toFixed(4) : "0");
    };
    window.addEventListener("scroll", function () { if (!ringTick) { ringTick = true; requestAnimationFrame(ringUpdate); } }, { passive: true });
    window.addEventListener("resize", ringUpdate);
    ringUpdate();
  }

  /* ---------------- Desktopové menu: kluzká bublina + rolování textu ----------------
     Na ≥992 px je menu skleněná kapsle (CSS). Bublina .nav-pill jezdí za položkou pod kurzorem/fokusem a
     v klidu odpočívá za aktivní položkou (viditelná jen u odscrollované lišty). Text každé položky je
     zabalený do .nl-roll, hover ho vyroluje nahoru a zespodu přijede kopie z data-t. Pod 992 px jsou obě
     věci vypnuté CSS; mobilní menu si text při prvním otevření stejně přestaví samo. Blok je zrcadlený
     v script.js a page.js. */
  (function () {
    var wrap = document.querySelector("#navMenu > .d-flex");
    var links = wrap ? Array.prototype.slice.call(wrap.querySelectorAll(".nav-link")) : [];
    if (!links.length) return;
    links.forEach(function (a) {
      var label = a.textContent.replace(/\s+/g, " ").trim();
      a.setAttribute("aria-label", label);
      var roll = document.createElement("span");
      roll.className = "nl-roll"; roll.setAttribute("aria-hidden", "true");
      var inner = document.createElement("span");
      inner.className = "nl-roll-in"; inner.setAttribute("data-t", label); inner.textContent = label;
      roll.appendChild(inner);
      a.textContent = ""; a.appendChild(roll);
    });
    var pill = document.createElement("span");
    pill.className = "nav-pill"; pill.setAttribute("aria-hidden", "true");
    wrap.insertBefore(pill, wrap.firstChild);
    var placed = false;
    function place(a) {
      if (!placed) {   /* první umístění bez jízdy z nuly */
        pill.classList.add("no-anim");
        pill.style.width = a.offsetWidth + "px";
        pill.style.transform = "translateX(" + a.offsetLeft + "px)";
        void pill.offsetWidth;
        pill.classList.remove("no-anim");
        placed = true;
      } else {
        pill.style.width = a.offsetWidth + "px";
        pill.style.transform = "translateX(" + a.offsetLeft + "px)";
      }
    }
    function rest() {
      var act = wrap.querySelector(".nav-link.active");
      pill.classList.remove("on");
      if (act) { place(act); pill.classList.add("rest"); } else pill.classList.remove("rest");
    }
    function hover(a) { place(a); pill.classList.add("on"); }
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { hover(a); });
      a.addEventListener("focus", function () { hover(a); });
    });
    wrap.addEventListener("mouseleave", rest);
    wrap.addEventListener("focusout", function (e) { if (!wrap.contains(e.relatedTarget)) rest(); });
    rest();
    window.addEventListener("resize", function () { placed = false; rest(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { placed = false; rest(); });
  })();

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

  /* ---------------- Pozadí: samo se pomalu posouvající bloby ----------------
     Čistě časově řízené (nic z toho nezávisí na scrollu) a jen transform/opacity. Každý blob
     má x a y na vlastní délce (různá čísla → dráha se dlouho neopakuje, nepůsobí mechanicky).
     Rozsahy jsou ve vw/vh, takže se přizpůsobí velikosti okna. Ladí se objektem `drift`.
     (Natáčení rozmazané gradientové vrstvy se záměrně nepoužívá — drahé pro GPU a skoro nevidět.) */
  if (!reduceMotion) {
    var drift = {
      a: { x: "13vw", xDur: 23, y: "9vh", yDur: 31 },
      b: { x: "-11vw", xDur: 27, y: "-12vh", yDur: 19 },
      glow: { opacity: 0.85, dur: 11 }        /* celé pozadí se velmi pomalu "nadechuje" */
    };
    var float = function (sel, c) {
      gsap.to(sel, { x: c.x, duration: c.xDur, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(sel, { y: c.y, duration: c.yDur, ease: "sine.inOut", yoyo: true, repeat: -1 });
    };
    if (!isMobile) { /* na mobilu se bloby nehýbou (skvrna putující přes malý displej působí jako flek) */
      float("#bg-blob-a", drift.a);
      float("#bg-blob-b", drift.b);
    }
    gsap.to("#bg-gradient", { opacity: drift.glow.opacity, duration: drift.glow.dur, ease: "sine.inOut", yoyo: true, repeat: -1 });
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
        /* <dialog> je v "top layer" a překrývá všechno mimo sebe, takže toast se při kopírování
           z modalu musí přesunout dovnitř něj */
        var host = btn.closest("dialog") || document.body;
        if (toastEl.parentNode !== host) host.appendChild(toastEl);
        copyText(btn.dataset.copy).then(function () {
          showToast("Zkopírováno: " + btn.dataset.copy);
          btn.classList.add("is-copied");
          if (icon) icon.setAttribute("href", "#bi-check2");
          setTimeout(function () { btn.classList.remove("is-copied"); if (icon) icon.setAttribute("href", "#bi-clipboard"); }, 1600);
        }).catch(function () { showToast("Kopírování se nezdařilo"); });
      });
    });
  }

  /* Všechny formuláře "contact": ten na kontakt.html i ten v modalu ostatních podstránek.
     Úspěšné panelové potvrzení je sourozenec formuláře (.form-success). */
  function initContactForm(form) {
    var success = form.parentNode.querySelector(".form-success");
    if (!success) return;
    var btn = form.querySelector("button[type=submit]");
    var label = btn && (btn.querySelector(".pill-btn__label") || btn);
    var labelText = label ? label.textContent : "";
    if (!reduceMotion) {
      form.addEventListener("invalid", function (e) {
        var box = e.target.closest(".form-floating, .form-check") || e.target;
        gsap.fromTo(box, { x: 0 }, { keyframes: [{ x: -8 }, { x: 8 }, { x: -5 }, { x: 5 }, { x: 0 }], duration: 0.4, ease: "power1.inOut", overwrite: "auto" });
      }, true);
    }
    var showFormSuccess = function () {
      var done = function () {
        form.style.display = "none";
        success.hidden = false;
        if (!reduceMotion) {
          var circle = success.querySelector(".fs-circle"), tick = success.querySelector(".fs-tick");
          gsap.set([circle, tick], { strokeDasharray: 1, strokeDashoffset: 1 });
          gsap.timeline()
            .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" })
            .to(tick, { strokeDashoffset: 0, duration: 0.4, ease: "power2.out" }, "-=0.1")
            .from(success.querySelectorAll("h3, p"), { y: 14, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" }, "-=0.3");
        }
        ScrollTrigger.refresh();
        success.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      };
      if (reduceMotion) done(); else gsap.to(form, { opacity: 0, y: -10, duration: 0.35, onComplete: done });
    };
    form.addEventListener("submit", function (e) {
      e.preventDefault();
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
    /* po zavření modalu se formulář vrátí do výchozího stavu (po úspěšném odeslání znovu otevřený) */
    form.resetState = function () {
      if (success.hidden && !(btn && btn.disabled)) return;
      form.reset();
      gsap.set(form, { clearProps: "opacity,y" });
      form.style.display = "";
      success.hidden = true;
      if (btn) { btn.disabled = false; label.textContent = labelText; }
    };
  }
  document.querySelectorAll('form[name="contact"]').forEach(initContactForm);

  /* ---------------- Modal s kontaktem (podstránky): telefon + formulář ----------------
     Tlačítka [data-open-contact] ("Napsat mi") mají href na kontakt.html jako zálohu — bez JS
     nebo bez podpory <dialog> se prostě přejde na stránku. Native <dialog>: focus trap, ESC
     i návrat focusu řeší prohlížeč; tady jen animace, zavření klikem na pozadí a zámek scrollu. */
  var modal = document.getElementById("contactModal");
  if (modal && typeof modal.showModal === "function") {
    var panel = modal.querySelector(".contact-modal__panel");
    var modalForm = modal.querySelector("form");
    var closing = false;
    var openModal = function (e) {
      e.preventDefault();
      if (modal.open) return;
      document.documentElement.classList.add("modal-open");
      modal.showModal();
      if (!reduceMotion) {
        gsap.fromTo(panel, { opacity: 0, y: 28, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "power3.out" });
        gsap.from(panel.querySelectorAll(".modal-phone, .modal-or, form .row > *"), { opacity: 0, y: 14, duration: 0.5, stagger: 0.04, delay: 0.12, ease: "power2.out", clearProps: "opacity,transform" });
      }
    };
    var closeModal = function () {
      if (!modal.open || closing) return;
      if (reduceMotion) { modal.close(); return; }
      closing = true;
      gsap.to(panel, { opacity: 0, y: 14, scale: 0.98, duration: 0.25, ease: "power2.in", onComplete: function () { closing = false; modal.close(); gsap.set(panel, { clearProps: "opacity,transform" }); } });
    };
    document.querySelectorAll("[data-open-contact]").forEach(function (a) { a.addEventListener("click", openModal); });
    modal.querySelector(".contact-modal__close").addEventListener("click", closeModal);
    modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); }); /* klik na pozadí */
    modal.addEventListener("cancel", function (e) { e.preventDefault(); closeModal(); });    /* ESC = zavření s animací */
    modal.addEventListener("close", function () {
      document.documentElement.classList.remove("modal-open");
      if (modalForm && modalForm.resetState) modalForm.resetState();
    });
  }

  /* ================= Hero a efekty (jen bez reduced-motion) =================
     Reduced-motion uživatelé dostanou obsah rovnou: CSS (.js .hero-in, .reveal-wipe, …)
     skrývá věci jen mimo @media (prefers-reduced-motion: reduce). */
  var weakHw = !!(navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
  document.documentElement.classList.toggle("weak-hw", weakHw);   /* stejná třída jako na homepage (script.js): CSS ztišení blur navbaru a mobilního menu */
  var blurOk = !weakHw;
  var blurIn = function (px) { return blurOk ? { filter: "blur(" + px + "px)" } : {}; };

  /* Rozdělení nadpisu na písmena (port ze script.js): před splitem se změří
     kerning mezi sousedními písmeny a po něm se rozdíl doplní margin-left, aby
     nadpis zůstal pixel po pixelu stejný. */
  function splitChars(h1) {
    var chars = [];
    h1.setAttribute("aria-label", h1.textContent.replace(/\s+/g, " ").trim());
    var rng = document.createRange(), beforeX = [];
    (function measure(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var txt = child.textContent;
          for (var i = 0; i < txt.length; i++) {
            if (/\s/.test(txt.charAt(i))) continue;
            rng.setStart(child, i); rng.setEnd(child, i + 1);
            beforeX.push(rng.getBoundingClientRect().left);
          }
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          measure(child);
        }
      });
    })(h1);
    var firstInWord = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var word = document.createElement("span");
            word.className = "split-word";
            word.setAttribute("aria-hidden", "true");
            part.split("").forEach(function (ch, k) {
              var c = document.createElement("span");
              c.className = "split-char";
              c.textContent = ch;
              word.appendChild(c);
              chars.push(c);
              firstInWord.push(k === 0);
            });
            frag.appendChild(word);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== "BR") {
          walk(child);
        }
      });
    })(h1);
    if (beforeX.length === chars.length) {
      var box = h1.getBoundingClientRect();
      var scale = h1.offsetWidth ? box.width / h1.offsetWidth : 1;
      var afterX = chars.map(function (c) { return c.getBoundingClientRect().left; });
      chars.forEach(function (c, i) {
        if (firstInWord[i]) return;
        var gapBefore = beforeX[i] - beforeX[i - 1];
        /* pár, který byl původně na dvou řádcích (zalomení za pomlčkou v "e-shopy"),
           se přeskočí — jeho vzdálenost není kerning */
        if (gapBefore <= 0 || gapBefore > 200) return;
        var fix = (gapBefore - (afterX[i] - afterX[i - 1])) / scale;
        if (Math.abs(fix) > 0.02 && Math.abs(fix) < 8) c.style.marginLeft = fix + "px";
      });
    }
    return chars;
  }

  var hero = document.querySelector(".sub-hero");

  /* Jemný "rozpad" nadpisu při odscrollování z hera (obdoba scény na úvodní stránce, ale nic
     neodletí z obrazovky): písmena se lehce rozjedou, rozmažou a zeslábnou, při scrollu zpět se
     složí. Na desktopu scrub, vratné. Na mobilu se scroll hlásí hrubě a pozdě, scrub by škubal, takže tam
     rozpad nejde přes `scrub`, ale přes ručně vyhlazený postup (viz startScatterMobile), bez blur kvůli GPU.
     Amplitudy jsou schválně malé — ladí se číslem v `amp` / `ampM`. */
  var amp = { x: 34, y: 24, rot: 12, fade: 0.12, blur: 4, dist: 300 }; /* dist = kolik px scrollu trvá, než je rozpad hotový */
  var ampM = { x: 22, y: 16, rot: 8, fade: 0.2, dist: 170, smooth: 0.45 }; /* dist = px scrollu do hotového rozpadu, smooth = vyhlazení (s) */
  /* Mobil: rozpad je plynulá funkce scrollu (0 → dist px) bez vlastního stavu — nemá co uváznout a nic
     nepřepíná skokem. Hrubě hlášený scroll nechodí do animace přímo: cílový postup se jen dotahuje
     vyhlazeným tweenem (ruční smoothing, ne `scrub`), takže se škubání prstu / zpožděné eventy slijí. */
  function startScatterMobile(chars) {
    var offs = chars.map(function () {
      return { x: gsap.utils.random(-ampM.x, ampM.x), y: gsap.utils.random(-ampM.y, ampM.y * 0.5), r: gsap.utils.random(-ampM.rot, ampM.rot) };
    });
    var tw = gsap.to(chars, {
      x: function (i) { return offs[i].x; },
      y: function (i) { return offs[i].y; },
      rotation: function (i) { return offs[i].r; },
      opacity: ampM.fade, ease: "power2.out", duration: 1, paused: true
    });
    var prog = { v: 0 };
    var target = function () { return gsap.utils.clamp(0, 1, (window.pageYOffset || 0) / ampM.dist); }; /* záporný scroll (gumový pruh na iOS) = 0 */
    var follow = function (instant) {
      var t = target();
      if (instant) { gsap.killTweensOf(prog); prog.v = t; tw.progress(t); return; }
      gsap.to(prog, { v: t, duration: ampM.smooth, ease: "power2.out", overwrite: true, onUpdate: function () { tw.progress(prog.v); } });
    };
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: function () { follow(false); }, onRefresh: function () { follow(true); } });
    follow(true); /* načteno už odscrollované (obnovení pozice) */
  }
  function startScatter(chars) {
    if (!hero) return;
    if (isMobile) { startScatterMobile(chars); return; }
    var offs = chars.map(function () {
      return { x: gsap.utils.random(-amp.x, amp.x), y: gsap.utils.random(-amp.y, amp.y * 0.5), r: gsap.utils.random(-amp.rot, amp.rot) };
    });
    var vars = {
      x: function (i) { return offs[i].x; },
      y: function (i) { return offs[i].y; },
      rotation: function (i) { return offs[i].r; },
      opacity: amp.fade, ease: "power2.out", immediateRender: false, /* power2.out = největší pohyb hned na začátku scrollu */
      scrollTrigger: { trigger: hero, start: "top top", end: "+=" + amp.dist, scrub: 0.5 }
    };
    if (blurOk) vars.filter = "blur(" + amp.blur + "px)";
    gsap.to(chars, vars);
  }

  if (hero && !reduceMotion) {
    /* --- nadpis: písmena se slétnou z náhodných míst --- */
    var h1 = hero.querySelector("h1");
    if (h1) {
      var shown = false;
      var showH1 = function () { if (!shown) { shown = true; gsap.set(h1, { opacity: 1 }); } };
      var runTitle = function () {
        if (shown) return;
        var chars = splitChars(h1);
        showH1();
        var spread = isMobile ? 0.55 : 1;
        gsap.from(chars, Object.assign({
          x: function () { return gsap.utils.random(-60, 60) * spread; },
          y: function () { return gsap.utils.random(-50, 50) * spread; },
          rotation: function () { return gsap.utils.random(-28, 28); },
          opacity: 0, scale: 0.6,
          /* mobil rychleji: nadpis je první, na co se čeká (a kandidát na LCP) */
          duration: isMobile ? 0.7 : 0.85, ease: "power3.out", delay: isMobile ? 0 : 0.05,
          stagger: { each: isMobile ? 0.016 : 0.02, from: "random" },
          clearProps: "filter",
          onComplete: function () { startScatter(chars); }
        }, blurIn(8)));
      };
      /* split až po načtení fontu (jinak by se měřil kerning záložního písma) */
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(runTitle);
      setTimeout(function () { if (!shown) { showH1(); } }, 1200); /* pojistka, ať nadpis nezůstane skrytý */
    }

    /* --- ostatní prvky hera naskakují po nadpisu --- */
    gsap.utils.toArray(".sub-hero .hero-in").forEach(function (el, i) {
      gsap.fromTo(el, { y: 26 }, {
        opacity: 1, y: 0, duration: 0.75, ease: "power3.out",
        delay: i === 0 ? 0.05 : 0.35 + (i - 1) * 0.12
      });
    });

    /* --- obří obrysový nápis za nadpisem: vplyne a pomalu driftuje při scrollu --- */
    var ghost = hero.querySelector(".sub-ghost");
    if (ghost) {
      /* "baterka": jasnější kopie obrysu (::after) se odkrývá maskou okolo kurzoru; CSS proměnné
         se píšou jen na ghost, takže se nepřepočítává styl celého dokumentu */
      if (!isMobile && window.matchMedia("(hover: hover)").matches) {
        ghost.setAttribute("data-text", ghost.textContent.trim());
        hero.addEventListener("mousemove", function (e) {
          var r = ghost.getBoundingClientRect();
          ghost.style.setProperty("--gx", (e.clientX - r.left) + "px");
          ghost.style.setProperty("--gy", (e.clientY - r.top) + "px");
        });
        hero.addEventListener("mouseleave", function () {
          ghost.style.setProperty("--gx", "-999px");
          ghost.style.setProperty("--gy", "-999px");
        });
      }
      gsap.fromTo(ghost, { opacity: 0 }, { opacity: 1, duration: 1.6, delay: 0.3, ease: "power2.out" });
      gsap.fromTo(ghost, { x: "5vw" }, {
        x: "-6vw", ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 }
      });
    }

    /* --- grafika vpravo: vlétne ze strany a pak se ve smyčce sama přepíná --- */
    var gfx = hero.querySelector(".sub-hero-graphic");
    if (gfx) {
      var kind = gfx.getAttribute("data-graphic");
      var loops = [];

      /* pulz: dva měkké prstence se rozšíří za grafikou JEN JEDNOU, když vlétne po načtení stránky
         (ve smyčkách překlápění se už nepulzuje — rušilo by to)
         (obal drží velikost grafiky, grafika má overflow:hidden, takže prstence jsou vedle ní) */
      var wrap = document.createElement("div");
      wrap.className = "sub-hero-gfxwrap";
      gfx.parentNode.insertBefore(wrap, gfx);
      var rings = [];
      for (var ri = 0; ri < 2; ri++) {
        var ring = document.createElement("div");
        ring.className = "sub-pulse";
        ring.setAttribute("aria-hidden", "true");
        wrap.appendChild(ring);
        rings.push(ring);
      }
      wrap.appendChild(gfx);
      var pulse = function () {
        rings.forEach(function (r, i) {
          gsap.fromTo(r, { scale: 1, opacity: 0.5 }, { scale: 1.16 + i * 0.07, opacity: 0, duration: 1.7, delay: i * 0.22, ease: "power2.out", overwrite: true });
        });
      };

      var intro = isMobile
        ? gsap.fromTo(gfx, { opacity: 0, y: 30, scale: 0.92 }, { opacity: 1, y: 0, scale: 1, duration: 1, delay: 0.4, ease: "power3.out", onComplete: pulse })
        : gsap.fromTo(gfx, { opacity: 0, scale: 0.7, rotationY: 55, rotationX: 10, x: 120, transformPerspective: 1000 },
            { opacity: 1, scale: 1, rotationY: 0, rotationX: 0, x: 0, duration: 1.3, delay: 0.35, ease: "power3.out", onComplete: function () { enableTilt(); pulse(); } });

      /* jemný náklon grafiky za myší (jen desktop) */
      function enableTilt() {
        /* při odscrollování grafika lehce odjede a zeslábne (scrub, vratné) */
        /* stejná dráha a křivka jako rozpad nadpisu (amp.dist, power2.out), ať jdou ruku v ruce;
           scale = jak výrazně se zmenší (1 = vůbec) */
        gsap.to(gfx, { y: -60, scale: 0.8, opacity: 0.35, ease: "power2.out", immediateRender: false,
          scrollTrigger: { trigger: hero, start: "top top", end: "+=" + amp.dist, scrub: 0.5 } });
        var qy = gsap.quickTo(gfx, "rotationY", { duration: 0.8, ease: "power3.out" });
        var qx = gsap.quickTo(gfx, "rotationX", { duration: 0.8, ease: "power3.out" });
        hero.addEventListener("mousemove", function (e) {
          qy((e.clientX / window.innerWidth - 0.5) * 10);
          qx(-(e.clientY / window.innerHeight - 0.5) * 8);
        });
        hero.addEventListener("mouseleave", function () { qy(0); qx(0); });
      }

      /* web: kód se překlopí do drátěného náhledu stránky a zpět */
      var morph = gfx.querySelector(".code-wire-morph");
      if (kind === "code" && morph) {
        var code = morph.querySelector(".code-layer"), wire = morph.querySelector(".wireframe-layer");
        var parts = wire.querySelectorAll(".wf-hero, .wf-text, .wf-cards span, .wf-btn");
        gsap.set(wire, { opacity: 0 });
        gsap.set(parts, { opacity: 0, y: 10 });
        gsap.from(code.querySelectorAll(".code-line"), { opacity: 0, x: -14, duration: 0.5, stagger: 0.09, delay: 0.9, ease: "power2.out" });
        var tlC = gsap.timeline({ repeat: -1, delay: 3.2 });
        /* Obrazce drátěného náhledu se na začátku KAŽDÉHO cyklu schovají (set na čase 0), a teprve pak
           začne vyjíždět vrstva náhledu. Dřív se jim startovní stav nastavil až 0,35 s po začátku
           (fromTo s immediateRender:false), takže byly nejdřív vidět, jedním snímkem zmizely a znovu
           se objevily — to bylo to "sekání". */
        tlC.set(parts, { opacity: 0, y: 10 })
           .to(code, Object.assign({ opacity: 0, y: -14, duration: 0.9, ease: "power2.inOut" }, blurIn(2)), 0)
           .fromTo(wire, Object.assign({ opacity: 0, y: 14 }, blurIn(2)), Object.assign({ opacity: 1, y: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false }, blurOk ? { filter: "blur(0px)" } : {}), "<")
           .to(parts, { opacity: function (i, el) { return el.classList.contains("wf-btn") ? 0.85 : 1; }, y: 0, duration: 0.5, stagger: 0.07, ease: "power2.out" }, "<0.35")
           .to({}, { duration: 2.6 })
           .to(wire, Object.assign({ opacity: 0, y: -14, duration: 0.9, ease: "power2.inOut" }, blurIn(2)))
           .fromTo(code, Object.assign({ opacity: 0, y: 14 }, blurIn(2)), Object.assign({ opacity: 1, y: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false }, blurOk ? { filter: "blur(0px)" } : {}), "<")
           .to({}, { duration: 2.6 });
        loops.push(tlC);
      }

      /* marketing: reklama ve výsledcích vyhledávání se překlopí do dashboardu s grafem */
      var serpMorph = gfx.querySelector(".serp-dash-morph");
      if (kind === "serp" && serpMorph) {
        var serp = serpMorph.querySelector(".serp-layer"), dash = serpMorph.querySelector(".dash-layer");
        var bars = gsap.utils.toArray(serpMorph.querySelectorAll(".dash-bar"));
        var stats = gsap.utils.toArray(serpMorph.querySelectorAll(".dash-stat-value"));
        bars.forEach(function (b) { b.style.height = b.dataset.h + "%"; b.style.transformOrigin = "50% 100%"; });
        var cnt = { v: 0 };
        var setStats = function (v) {
          stats.forEach(function (st) { st.textContent = (v * parseFloat(st.dataset.target)).toFixed(1) + st.dataset.suffix; });
        };
        gsap.set(bars, { scaleY: 0 });
        gsap.set(dash, { opacity: 0 });
        setStats(0);
        var tlS = gsap.timeline({ repeat: -1, delay: 2.4 });
        tlS.to(serp, Object.assign({ opacity: 0, y: -14, duration: 0.9, ease: "power2.inOut" }, blurIn(2)))
           .fromTo(dash, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false }, "<")
           .to(bars, { scaleY: 1, duration: 0.9, ease: "power3.out", stagger: 0.07 }, "<0.3")
           .to(cnt, { v: 1, duration: 1.3, ease: "power2.out", onUpdate: function () { setStats(cnt.v); } }, "<")
           .to({}, { duration: 2.6 })
           .to(dash, { opacity: 0, y: -14, duration: 0.9, ease: "power2.inOut" })
           .fromTo(serp, { opacity: 0, y: 14 }, Object.assign({ opacity: 1, y: 0, duration: 0.9, ease: "power2.inOut", immediateRender: false }, blurOk ? { filter: "blur(0px)" } : {}), "<")
           .set(bars, { scaleY: 0 })
           .set(cnt, { v: 0 })
           .call(function () { setStats(0); })
           .to({}, { duration: 2.2 });
        loops.push(tlS);
      }

      /* fotografie: balíček fotek se po chvíli listuje (přední odletí, ostatní postoupí) */
      var cards = gsap.utils.toArray(gfx.querySelectorAll(".photo-card"));
      if (kind === "cards" && cards.length > 1) {
        var n = cards.length, front = 0;
        var stackedPose = function (i) { var d = i % 2 === 0 ? 1 : -1; return { opacity: 1, x: 0, y: 12 + i * 12, rotate: d * (5 + i * 3), scale: 0.94 - i * 0.06 }; };
        var frontPose = function () { return { opacity: 1, x: 0, y: 0, rotate: 0, scale: 0.94 }; };
        var exitPose = function () { return { opacity: 0, x: 0, y: -80, rotate: -12, scale: 0.86 }; };
        var offsetOf = function (i, idx) { return (i - idx + n) % n; };
        var poseFor = function (o) { return o === 0 ? frontPose() : stackedPose(o - 1); };
        cards.forEach(function (card, i) {
          var o = offsetOf(i, 0);
          gsap.set(card, Object.assign({ zIndex: n - o }, poseFor(o)));
        });
        var curTl = null;
        /* dir = ±1: odlet do strany (swipe na mobilu), bez dir odlet nahoru (autoplay) */
        var advance = function (dir) {
          var old = front;
          front = (front + 1) % n;
          var tl = curTl = gsap.timeline();
          gsap.set(cards[old], { zIndex: n + 1 });
          cards.forEach(function (card, i) {
            if (i === old) return;
            var o = offsetOf(i, front);
            gsap.set(card, { zIndex: n - o });
            var pose = poseFor(o);
            pose.duration = 0.8; pose.ease = "power2.inOut";
            tl.to(card, pose, 0);
          });
          var ex = dir ? { opacity: 0, x: dir * 380, y: -24, rotate: dir * 22, scale: 0.9 } : exitPose();
          ex.duration = dir ? 0.42 : 0.55; ex.ease = "power2.in";
          tl.to(cards[old], ex, 0);
          var back = stackedPose(n - 2); back.opacity = 0; back.zIndex = 1;
          tl.set(cards[old], back);
          tl.to(cards[old], { opacity: 1, duration: 0.5, ease: "power1.out" });
          gsap.delayedCall(0.75, afLock); /* nová fotka dosedne, pak "zaostří" */
        };
        /* políčko autofokusu: najede z odchylky, chvíli "hledá", zamkne se (azurově) a zmizí */
        var af = gfx.querySelector(".af-box"), afTl = null;
        var afLock = function () {
          if (!af) return;
          if (afTl) afTl.kill();
          af.classList.remove("is-locked");
          afTl = gsap.timeline();
          afTl.set(af, { opacity: 0, scale: 1.7, x: gsap.utils.random(-36, 36), y: gsap.utils.random(-28, 28) })
              .to(af, { opacity: 0.6, duration: 0.15 })
              .to(af, { x: gsap.utils.random(-14, 14), y: gsap.utils.random(-12, 12), scale: 1.25, duration: 0.3, ease: "power1.inOut" })
              .to(af, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.22, ease: "power3.out" })
              .call(function () { af.classList.add("is-locked"); })
              .to({}, { duration: 0.3 })
              .to(af, { opacity: 0, duration: 0.3 });
        };
        gsap.delayedCall(1.9, afLock);
        /* zdánlivě prázdný tween jen odměřuje čas mezi kroky (a dá se pozastavit mimo okno) */
        var tlP = gsap.timeline({ repeat: -1, delay: 2.2 });
        tlP.to({}, { duration: 2, onComplete: function () { advance(); } }); /* interval listování fotek v hero (s) */
        loops.push(tlP);

        /* Swipe (jen mobil/tablet, stejně jako na úvodní stránce): přední fotka jde za prstem, ostatní se
           úměrně posunou dopředu; po puštění buď odletí (dost daleko/rychle), nebo se pružně vrátí.
           Vodorovné tažení řeší pointer events, svislé nechává prohlížeči (touch-action: pan-y), takže se
           stránka dál scrolluje. Autoplay se při dotyku zastaví (`_held`, ScrollTrigger ho pak nerozběhne)
           a po chvíli klidu naběhne znovu. */
        if (isMobile) {
          var blendPose = function (a, b, t) {
            var out = {};
            Object.keys(a).forEach(function (key) { out[key] = a[key] + (b[key] - a[key]) * t; });
            return out;
          };
          var tracking = false, dragging = false, sx = 0, sy = 0, st = 0, dx = 0, pid = null, resumeT = null;
          var settleOthers = function (dur) {
            cards.forEach(function (card, i) {
              if (i === front) return;
              var pose = poseFor(offsetOf(i, front));
              pose.duration = dur; pose.ease = "power2.out"; pose.overwrite = "auto";
              gsap.to(card, pose);
            });
          };
          var snapBack = function () {
            var pose = frontPose();
            pose.duration = 0.55; pose.ease = "back.out(1.8)"; pose.overwrite = "auto";
            gsap.to(cards[front], pose);
            settleOthers(0.4);
          };
          var scheduleResume = function (ms) {
            clearTimeout(resumeT);
            resumeT = setTimeout(function () {
              tlP._held = false;
              var r = hero.getBoundingClientRect();
              if (r.bottom > 0 && r.top < window.innerHeight) tlP.restart(); /* mimo okno ho rozběhne ScrollTrigger */
            }, ms);
          };
          gfx.style.touchAction = "pan-y";
          gfx.addEventListener("pointerdown", function (e) {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            tracking = true; dragging = false; dx = 0;
            sx = e.clientX; sy = e.clientY; st = e.timeStamp; pid = e.pointerId;
            tlP._held = true; tlP.pause(); clearTimeout(resumeT);
          });
          gfx.addEventListener("pointermove", function (e) {
            if (!tracking || e.pointerId !== pid) return;
            var mx = e.clientX - sx, my = e.clientY - sy;
            if (!dragging) {
              if (Math.abs(mx) > 8 && Math.abs(mx) > Math.abs(my) * 1.2) {
                dragging = true;
                try { gfx.setPointerCapture(pid); } catch (err) {}
                /* rozběhnutý krok se doběhne až teď, kdy je jisté, že jde o vodorovný tah (ne o scroll) */
                if (curTl) { curTl.progress(1); curTl = null; }
                gsap.killTweensOf(cards[front]);
                if (afTl) { afTl.kill(); gsap.set(af, { opacity: 0 }); }
              } else return;
            }
            dx = mx;
            var pr = Math.min(Math.abs(dx) / 140, 1) * 0.6;
            gsap.set(cards[front], { x: dx, y: -Math.abs(dx) * 0.05, rotate: gsap.utils.clamp(-22, 22, dx * 0.07) });
            cards.forEach(function (card, i) {
              if (i === front) return;
              var o = offsetOf(i, front);
              gsap.set(card, blendPose(poseFor(o), poseFor(o - 1), pr));
            });
          });
          gfx.addEventListener("pointerup", function (e) {
            if (!tracking || e.pointerId !== pid) return;
            tracking = false;
            if (!dragging) { scheduleResume(1500); return; }
            dragging = false;
            var v = Math.abs(dx) / Math.max(e.timeStamp - st, 1);
            if (Math.abs(dx) > 70 || (v > 0.5 && Math.abs(dx) > 30)) { advance(dx > 0 ? 1 : -1); scheduleResume(4500); }
            else { snapBack(); scheduleResume(3500); }
          });
          gfx.addEventListener("pointercancel", function (e) {
            if (!tracking || e.pointerId !== pid) return;
            tracking = false;
            if (dragging) { dragging = false; snapBack(); }
            scheduleResume(2500);
          });
        }
      }

      /* smyčky běží jen dokud je hero v okně */
      if (loops.length) {
        ScrollTrigger.create({
          trigger: hero, start: "top bottom", end: "bottom top",
          onToggle: function (self) { loops.forEach(function (t) { if (self.isActive) { if (!t._held) t.resume(); } else t.pause(); }); }
        });
      }
    }
  }

  /* ---------------- Nadpisy sekcí: odkrytí zleva (wipe) jako na úvodní stránce ----------------
     Výchozí stav (clip-path) je v CSS (.js .reveal-wipe); po doběhnutí se clip-path zruší,
     ať neořezává přesahy písmen. */
  /* Tempo: wipe.dur = délka odkrytí v s, wipe.ease = křivka (power3.out startovalo moc prudce a
     působilo nervózně; inOut se rozjíždí i dojíždí pozvolna), x = o kolik px nadpis při odkrytí
     "dojede" zleva. */
  var wipe = { dur: 1.2, ease: "power1.inOut", x: -26 };
  if (!reduceMotion) {
    gsap.utils.toArray(".reveal-wipe").forEach(function (h) {
      gsap.fromTo(h, { clipPath: "inset(0 100% 0 0)", x: wipe.x }, {
        clipPath: "inset(0 0% 0 0)", x: 0, duration: wipe.dur, ease: wipe.ease,
        scrollTrigger: { trigger: h, start: "top 88%", once: true },
        onComplete: function () { gsap.set(h, { clearProps: "clipPath,x" }); h.classList.add("is-wiped"); }
      });
    });
  }

  /* ---------------- FAQ: plynulé rozbalení a sbalení nativních <details> ----------------
     Obsah (vše za <summary>) se zabalí do .faq-body a animuje se jeho výška + průhlednost.
     Při sbalování zůstává [open], dokud animace nedoběhne (jinak by obsah zmizel hned); třída
     .is-closing otočí plus zpět už na začátku. Bez JS / s reduced-motion zůstává nativní chování. */
  if (!reduceMotion) {
    document.querySelectorAll(".faq details").forEach(function (d) {
      var summary = d.querySelector("summary");
      if (!summary) return;
      var body = document.createElement("div");
      body.className = "faq-body";
      while (summary.nextSibling) body.appendChild(summary.nextSibling);
      d.appendChild(body);
      summary.addEventListener("click", function (e) {
        e.preventDefault();
        gsap.killTweensOf(body);
        if (!d.open) {
          d.classList.remove("is-closing");
          d.open = true;
          gsap.fromTo(body, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.5, ease: "power2.out", clearProps: "height,opacity" });
        } else {
          d.classList.add("is-closing");
          gsap.to(body, {
            height: 0, opacity: 0, duration: 0.38, ease: "power2.inOut",
            onComplete: function () { d.open = false; d.classList.remove("is-closing"); gsap.set(body, { clearProps: "height,opacity" }); }
          });
        }
      });
    });
  }

  /* ---------------- Kroky postupu: číslo naskočí a spojnice se dokreslí ---------------- */
  if (!reduceMotion) {
    gsap.utils.toArray(".step").forEach(function (st) {
      gsap.to(st, {
        "--pop": 1, "--line": 1, duration: 0.9, ease: "back.out(1.6)",
        scrollTrigger: { trigger: st, start: "top 86%", once: true }
      });
    });
  }

  /* ---------------- Schéma "já / agenti" v AI kartě (web.html): spojnice se dokreslí a kroky naskočí, jednou ---------------- */
  if (!reduceMotion) {
    gsap.utils.toArray(".ai-flow").forEach(function (fl) {
      var steps = fl.querySelectorAll(".ai-flow__step");
      var tl = gsap.timeline({ scrollTrigger: { trigger: fl, start: "top 85%", once: true } });
      tl.to(fl, { "--flow": 1, duration: 1.2, ease: "power2.inOut" }, 0)
        .fromTo(steps, { opacity: 0, x: 26 }, { opacity: 1, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.28 }, 0.1);
    });
  }

  /* ---------------- Dekorativní okna s kódem (web.html): řádky se jednou "napíšou" ----------------
     Řádky mají v CSS width: fit-content, takže gsap.from(width: 0) píše přesně do konce textu
     (steps = počet znaků, jako na úvodní stránce). Po doběhnutí se inline width smaže. data-gap
     na řádku = pauza před ním (střídání mluvčích v chatu). Bez animací vidět hotový text. */
  if (!reduceMotion) {
    gsap.utils.toArray("[data-type-code]").forEach(function (win) {
      var tl = gsap.timeline({ scrollTrigger: { trigger: win, start: "top 85%", once: true } });
      var first = true;
      win.querySelectorAll(".code-line").forEach(function (line) {
        var n = line.textContent.trim().length;
        if (!n) return;
        var gap = first ? parseFloat(win.getAttribute("data-type-delay") || "0.5") : parseFloat(line.getAttribute("data-gap") || "0.15");
        first = false;
        tl.from(line, { width: 0, duration: Math.max(0.3, n * 0.032), ease: "steps(" + n + ")", clearProps: "width" }, ">+" + gap);
      });
    });
  }

  /* ---------------- Okna u postupu: git log (web), checklist (marketing), hledáček (fotografie) ----------------
     Na širokém displeji (>=1200 px) je okno sticky vedle kroků, takže se posouvá po jednotlivých krocích
     (#postup-1..N, scroll dojede ke kroku -> show(i)). Pod 1200 px je ale okno až POD seznamem kroků: než
     k němu scroll dojede, všechny kroky by už byly projeté a animace hotová. Tam ji proto spouští samotné
     okno: jakmile se objeví, přehraje se sekvence show(0..n-1) po `gap` sekundách. Obě cesty jsou
     zaregistrované a rozhoduje se až při spuštění (podle šířky), guard `now` brání dvojímu přehrání. */
  var wideMq = window.matchMedia("(min-width: 1200px)");
  function stepsWithWindow(winEl, n, gap, show) {
    var now = -1;
    function go(i) { if (i > now) { now = i; show(i); } }
    for (var i = 0; i < n; i++) {
      (function (i) {
        var st = document.getElementById("postup-" + (i + 1));
        if (!st) return;
        ScrollTrigger.create({ trigger: st, start: "top 72%", onEnter: function () { if (wideMq.matches) go(i); } });
      })(i);
    }
    ScrollTrigger.create({
      trigger: winEl, start: "top 78%", once: true,
      onEnter: function () {
        if (wideMq.matches) return;
        for (var i = 0; i < n; i++) gsap.delayedCall(0.35 + i * gap, go, [i]);
      }
    });
  }

  /* Git log (web.html): commit naskočí s krokem. Bez animací jsou všechny vidět hned. */
  if (!reduceMotion) {
    var gitLog = document.querySelector(".git-log");
    var gitCommits = gsap.utils.toArray(".git-log .git-commit");
    if (gitLog && gitCommits.length) {
      gsap.set(gitCommits, { opacity: 0, x: -12 });
      stepsWithWindow(gitLog, gitCommits.length, 0.55, function (i) {
        gsap.to(gitCommits[i], { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" });
      });
    }
  }

  /* Checklist kampaně (marketing.html): políčko se odškrtne s krokem. V HTML jsou všechny .is-done
     (bez JS / reduced-motion vidět hotovo); tady se sundají a vrací po krocích. */
  if (!reduceMotion) {
    var todoLog = document.querySelector(".todo-log");
    var todoItems = gsap.utils.toArray(".todo-log .todo-item");
    if (todoLog && todoItems.length) {
      todoItems.forEach(function (it) { it.classList.remove("is-done"); });
      stepsWithWindow(todoLog, todoItems.length, 0.6, function (i) { todoItems[i].classList.add("is-done"); });
    }
  }

  /* ---------------- Galerie: fotky se při odkrytí "vyvolají" (rozmazané a ztlumené → ostré) ----------------
     Jen filter na <img> (ne transform: ten má CSS transition pro hover). Na mobilu bez blur, ať to
     nezatěžuje GPU; po doběhnutí se filter smaže. */
  if (!reduceMotion) {
    var devFrom = isMobile ? "brightness(0.55) saturate(0.6)" : "blur(14px) brightness(0.55) saturate(0.6)";
    gsap.utils.toArray(".photo-gallery figure").forEach(function (fig) {
      var img = fig.querySelector("img");
      if (!img) return;
      gsap.set(img, { filter: devFrom });
      ScrollTrigger.create({
        trigger: fig, start: "top 90%", once: true,
        onEnter: function () {
          gsap.to(img, { filter: isMobile ? "brightness(1) saturate(1)" : "blur(0px) brightness(1) saturate(1)", duration: 1.4, delay: 0.15, ease: "power2.out", clearProps: "filter" });
        }
      });
    });
  }

  /* ---------------- Hledáček u postupu (foceni.html): počítadlo snímků, popisek, expozice, záblesk ----------------
     V HTML je hotový stav (5/5), takže bez JS / s reduced-motion zůstane vidět; tady se vrátí na začátek
     a postupuje, jak scroll dojíždí ke krokům (#postup-1..5). */
  var vf = document.querySelector(".viewfinder");
  if (vf && !reduceMotion) {
    var vfCount = vf.querySelector(".vf-count"), vfCap = vf.querySelector(".vf-caption"),
        vfF = vf.querySelector(".vf-f"), vfS = vf.querySelector(".vf-s"), vfISO = vf.querySelector(".vf-iso"),
        vfFlash = vf.querySelector(".vf-flash"), vfFocus = vf.querySelector(".vf-focus");
    var vfSteps = [
      { cap: "káva a pokec", f: "f/2.8", s: "1/125", iso: "ISO 200", ev: -1, blur: 10 },
      { cap: "kde je hezké světlo?", f: "f/2.0", s: "1/200", iso: "ISO 160", ev: -0.5, blur: 5 },
      { cap: "nehlídej se, jen buď", f: "f/1.8", s: "1/250", iso: "ISO 100", ev: 0, blur: 0 },
      { cap: "vyberu jen ty nejlepší", f: "f/1.8", s: "1/250", iso: "ISO 100", ev: 0.3, blur: 0 },
      { cap: "hotovo, pochlub se", f: "f/1.8", s: "1/250", iso: "ISO 100", ev: 0, blur: 0 }
    ];
    var vfLastFlash = -1;
    var vfShow = function (i) {
      var d = vfSteps[i];
      vfCount.textContent = (i + 1) + "/" + vfSteps.length;
      vfCap.textContent = d.cap; vfF.textContent = d.f; vfS.textContent = d.s; vfISO.textContent = d.iso;
      gsap.fromTo([vfCount, vfCap, vfF, vfS, vfISO], { opacity: 0.2 }, { opacity: 1, duration: 0.45, ease: "power1.out" });
      gsap.to(vf, { "--ev": d.ev, "--blur": d.blur, duration: 0.8, ease: "power2.inOut", overwrite: "auto" }); /* fotka se zaostřuje a dostává správnou expozici */
      gsap.fromTo(vfFocus, { scale: 1.6, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.4, ease: "power3.out" });
      if (gsap.ticker.time - vfLastFlash > 0.35) { /* při skoku přes víc kroků nezáblesknout pětkrát */
        vfLastFlash = gsap.ticker.time;
        gsap.fromTo(vfFlash, { opacity: 0.5 }, { opacity: 0, duration: 0.5, ease: "power2.out" });
      }
    };
    /* počáteční stav: nic nevyfoceno, expozice "hledá" */
    vfCount.textContent = "0/" + vfSteps.length; vfCap.textContent = "připraveno";
    vfF.textContent = "f/2.8"; vfS.textContent = "1/125"; vfISO.textContent = "ISO 200";
    gsap.set(vf, { "--ev": -1.4, "--blur": 12 }); /* na začátku rozostřená a podexponovaná fotka */
    stepsWithWindow(vf, vfSteps.length, 1.0, vfShow);
  }

  /* ---------------- Karty: záře za kurzorem a jemný náklon ---------------- */
  document.querySelectorAll(".feature-card").forEach(function (card) {
    card.addEventListener("mousemove", function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      if (!isMobile && !reduceMotion && !card.classList.contains("card-wide")) {
        gsap.to(card, { rotateX: ((y / r.height) - 0.5) * -8, rotateY: ((x / r.width) - 0.5) * 8, duration: 0.3, ease: "power2.out", transformPerspective: 700 });
      }
    });
    card.addEventListener("mouseleave", function () {
      if (!isMobile && !reduceMotion && !card.classList.contains("card-wide")) gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.5, ease: "power2.out" });
    });
  });

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
          opacity: 1, y: 0, duration: 0.9, ease: "power2.out",
          stagger: Math.min(0.09, 0.5 / Math.max(batch.length, 1)), /* celé odkrytí max ~0,5 s, i když se při skoku v okně sejde spousta prvků */
          overwrite: "auto" /* ne true: zabilo by i tweeny kroků/karet na stejných prvcích */
        });
      }
    });
  }
})();
