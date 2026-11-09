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
    float("#bg-blob-a", drift.a);
    float("#bg-blob-b", drift.b);
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
     složí. Scrub, vratné. Jen desktop (na mobilu se scroll hlásí hrubě a efekt by škubal).
     Amplitudy jsou schválně malé — ladí se číslem v `amp`. */
  var amp = { x: 34, y: 24, rot: 12, fade: 0.12, blur: 4, dist: 300 }; /* dist = kolik px scrollu trvá, než je rozpad hotový */
  function startScatter(chars) {
    if (isMobile || !hero) return;
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
          duration: 1.15, ease: "power3.out", delay: 0.1,
          stagger: { each: 0.028, from: "random" },
          clearProps: "filter",
          onComplete: function () { startScatter(chars); }
        }, blurIn(8)));
      };
      /* split až po načtení fontu (jinak by se měřil kerning záložního písma) */
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(runTitle);
      setTimeout(function () { if (!shown) { showH1(); } }, 2500); /* pojistka, ať nadpis nezůstane skrytý */
    }

    /* --- ostatní prvky hera naskakují po nadpisu --- */
    gsap.utils.toArray(".sub-hero .hero-in").forEach(function (el, i) {
      gsap.fromTo(el, { y: 26 }, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        delay: i === 0 ? 0.05 : 0.55 + (i - 1) * 0.14
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
        var advance = function () {
          var old = front;
          front = (front + 1) % n;
          var tl = gsap.timeline();
          gsap.set(cards[old], { zIndex: n + 1 });
          cards.forEach(function (card, i) {
            if (i === old) return;
            var o = offsetOf(i, front);
            gsap.set(card, { zIndex: n - o });
            var pose = poseFor(o);
            pose.duration = 0.8; pose.ease = "power2.inOut";
            tl.to(card, pose, 0);
          });
          var ex = exitPose(); ex.duration = 0.55; ex.ease = "power2.in";
          tl.to(cards[old], ex, 0);
          var back = stackedPose(n - 2); back.opacity = 0; back.zIndex = 1;
          tl.set(cards[old], back);
          tl.to(cards[old], { opacity: 1, duration: 0.5, ease: "power1.out" });
        };
        /* zdánlivě prázdný tween jen odměřuje čas mezi kroky (a dá se pozastavit mimo okno) */
        var tlP = gsap.timeline({ repeat: -1, delay: 2.2 });
        tlP.to({}, { duration: 2, onComplete: advance }); /* interval listování fotek v hero (s) */
        loops.push(tlP);
      }

      /* smyčky běží jen dokud je hero v okně */
      if (loops.length) {
        ScrollTrigger.create({
          trigger: hero, start: "top bottom", end: "bottom top",
          onToggle: function (self) { loops.forEach(function (t) { self.isActive ? t.resume() : t.pause(); }); }
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
        var gap = first ? 0.5 : parseFloat(line.getAttribute("data-gap") || "0.15");
        first = false;
        tl.from(line, { width: 0, duration: Math.max(0.3, n * 0.032), ease: "steps(" + n + ")", clearProps: "width" }, ">+" + gap);
      });
    });
  }

  /* ---------------- Git log u postupu (web.html): commit naskočí, když scroll dojede k jeho kroku ----------------
     .git-commit číslo i odpovídá #postup-(i+1). Bez animací jsou všechny vidět hned. */
  if (!reduceMotion) {
    var gitCommits = gsap.utils.toArray(".git-log .git-commit");
    gsap.set(gitCommits, { opacity: 0, x: -12 });
    gitCommits.forEach(function (c, i) {
      var st = document.getElementById("postup-" + (i + 1));
      if (!st) { gsap.set(c, { opacity: 1, x: 0 }); return; }
      ScrollTrigger.create({
        trigger: st, start: "top 72%", once: true,
        onEnter: function () { gsap.to(c, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }); }
      });
    });
  }

  /* ---------------- Checklist kampaně u postupu (marketing.html): políčko se odškrtne, když scroll dojede ke kroku ----------------
     V HTML jsou všechny .is-done (bez JS / reduced-motion vidět hotovo); tady se sundají a vrací po krocích. */
  if (!reduceMotion) {
    var todoItems = gsap.utils.toArray(".todo-log .todo-item");
    todoItems.forEach(function (it, i) {
      var st = document.getElementById("postup-" + (i + 1));
      if (!st) return;
      it.classList.remove("is-done");
      ScrollTrigger.create({ trigger: st, start: "top 72%", once: true, onEnter: function () { it.classList.add("is-done"); } });
    });
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
