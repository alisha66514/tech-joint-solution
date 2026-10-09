/* ============================================================
   Shared site interactions. Loads AFTER header.js / footer.js.
   Content is failsafe: if anything throws, everything with the
   .reveal class is made visible so the page is never blank.
   ============================================================ */
(function () {
  "use strict";

  /* CSS only hides .reveal content when html.js is present, so
     if this file fails to load, content stays visible. */
  document.documentElement.classList.add("js");
  document.documentElement.classList.remove("no-js");

  var reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealAll() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("in");
    });
  }

  try {
    /* ---------- Reveal on scroll ---------- */
    var reveals = document.querySelectorAll(".reveal");
    if (!reducedMotion && "IntersectionObserver" in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -36px 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      revealAll();
    }

    /* ---------- Hero background video: desktop + motion-allowed only ---------- */
    (function () {
      var v = document.getElementById("heroVideo");
      if (!v || !v.dataset.sources) return;
      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var small = window.matchMedia("(max-width: 900px)").matches;
      var saveData = navigator.connection && navigator.connection.saveData;
      if (reduced || small || saveData) return;   /* poster image only */
      v.dataset.sources.split("|").forEach(function (pair) {
        var bits = pair.split("::");
        if (!bits[0]) return;
        var srcEl = document.createElement("source");
        srcEl.src = bits[0];
        srcEl.type = bits[1] || "";
        v.appendChild(srcEl);
      });
      v.load();
      var go = v.play();
      if (go && go.catch) go.catch(function () {});
      v.addEventListener("playing", function () {
        document.querySelector(".hero-video").classList.add("video-ready");
      }, { once: true });
    })();

    /* ---------- Sticky header state ---------- */
    var header = document.getElementById("site-header");
    var solid = document.body.hasAttribute("data-header-solid");
    function onScroll() {
      if (header) header.classList.toggle("scrolled", solid || window.scrollY > 10);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    /* ---------- Mobile menu ---------- */
    var toggle = document.getElementById("navToggle");
    var navLinks = document.getElementById("navLinks");
    if (toggle && navLinks) {
      function setMenu(open, restoreFocus) {
        navLinks.classList.toggle("open", open);
        document.body.classList.toggle("menu-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        if (!open && restoreFocus) toggle.focus();
      }

      toggle.addEventListener("click", function () {
        setMenu(!navLinks.classList.contains("open"), false);
      });

      navLinks.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", function () { setMenu(false, false); });
      });

      document.addEventListener("click", function (e) {
        if (window.innerWidth <= 920 && navLinks.classList.contains("open") &&
            !navLinks.contains(e.target) && !toggle.contains(e.target)) {
          setMenu(false, false);
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && navLinks.classList.contains("open")) {
          setMenu(false, true);
        }
      });

      window.addEventListener("resize", function () {
        if (window.innerWidth > 920 && navLinks.classList.contains("open")) {
          setMenu(false, false);
        }
      }, { passive: true });
    }

    /* ---------- Services dropdown (accessible) ---------- */
    var sItem = document.getElementById("servicesItem");
    var sBtn = document.getElementById("servicesBtn");
    if (sItem && sBtn) {
      function setDrop(open) {
        sItem.classList.toggle("open", open);
        sBtn.setAttribute("aria-expanded", open ? "true" : "false");
      }
      var hoverable = window.matchMedia && window.matchMedia("(hover:hover) and (min-width:921px)").matches;
      sBtn.addEventListener("click", function () {
        /* On hover-capable desktops the menu is already open when the
           click lands (mouseenter opened it) — keep it open instead of
           toggling it straight back off. Esc / click-outside closes it. */
        if (hoverable) { setDrop(true); return; }
        setDrop(!sItem.classList.contains("open"));
      });
      if (hoverable) {
        var hideTimer;
        sItem.addEventListener("mouseenter", function () { clearTimeout(hideTimer); setDrop(true); });
        sItem.addEventListener("mouseleave", function () { hideTimer = setTimeout(function () { setDrop(false); }, 120); });
      }
      sItem.addEventListener("focusout", function () {
        setTimeout(function () {
          if (!sItem.contains(document.activeElement)) setDrop(false);
        }, 0);
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && sItem.classList.contains("open")) { setDrop(false); sBtn.focus(); }
      });
      document.addEventListener("click", function (e) {
        if (!sItem.contains(e.target)) setDrop(false);
      });
    }

    /* ---------- FAQ accordion ---------- */
    document.querySelectorAll(".faq-item").forEach(function (item) {
      var q = item.querySelector(".faq-q");
      var a = item.querySelector(".faq-a");
      if (!q || !a) return;
      q.setAttribute("aria-expanded", "false");
      q.addEventListener("click", function () {
        var open = item.classList.toggle("open");
        q.setAttribute("aria-expanded", open ? "true" : "false");
        a.style.maxHeight = open ? a.scrollHeight + "px" : "";
      });
    });

    /* ---------- Portfolio filter + client-side pagination ---------- */
    var filterBtns = Array.prototype.slice.call(document.querySelectorAll(".filter-btn"));
    var projCards = Array.prototype.slice.call(document.querySelectorAll("[data-cat]"));
    var pagination = document.getElementById("portfolioPagination");
    if (filterBtns.length && projCards.length) {
      var activeFilter = "all";
      var currentProjectPage = 1;
      var projectsPerPage = 6;

      function visibleProjectCards() {
        return projCards.filter(function (card) {
          return activeFilter === "all" || card.getAttribute("data-cat") === activeFilter;
        });
      }

      function pageButton(label, page, disabled, current, ariaLabel) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "portfolio-page-btn" + (current ? " is-current" : "");
        btn.textContent = label;
        btn.disabled = !!disabled;
        btn.setAttribute("data-page", page);
        if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
        if (current) btn.setAttribute("aria-current", "page");
        return btn;
      }

      function renderProjectPagination(scrollToGrid) {
        var filtered = visibleProjectCards();
        var totalPages = Math.max(1, Math.ceil(filtered.length / projectsPerPage));
        if (currentProjectPage > totalPages) currentProjectPage = totalPages;

        projCards.forEach(function (card) { card.classList.add("hide"); });
        filtered.forEach(function (card, index) {
          var start = (currentProjectPage - 1) * projectsPerPage;
          var show = index >= start && index < start + projectsPerPage;
          card.classList.toggle("hide", !show);
        });

        if (pagination) {
          pagination.innerHTML = "";
          if (totalPages > 1) {
            pagination.appendChild(pageButton("←", currentProjectPage - 1, currentProjectPage === 1, false, "Previous project page"));
            for (var pageNo = 1; pageNo <= totalPages; pageNo += 1) {
              pagination.appendChild(pageButton(String(pageNo), pageNo, false, pageNo === currentProjectPage, "Project page " + pageNo));
            }
            pagination.appendChild(pageButton("→", currentProjectPage + 1, currentProjectPage === totalPages, false, "Next project page"));
          }
          var pageStatus = document.createElement("span");
          pageStatus.className = "portfolio-page-status";
          pageStatus.setAttribute("aria-live", "polite");
          pageStatus.textContent = "Page " + currentProjectPage + " of " + totalPages;
          pagination.appendChild(pageStatus);
        }

        if (scrollToGrid) {
          var grid = document.getElementById("portfolio-grid");
          if (grid) {
            var offset = 92;
            window.scrollTo({ top: Math.max(0, grid.getBoundingClientRect().top + window.pageYOffset - offset), behavior: reducedMotion ? "auto" : "smooth" });
          }
        }
      }

      filterBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          activeFilter = btn.getAttribute("data-filter") || "all";
          currentProjectPage = 1;
          filterBtns.forEach(function (b) {
            b.classList.toggle("active", b === btn);
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          renderProjectPagination(false);
        });
      });

      if (pagination) {
        pagination.addEventListener("click", function (event) {
          var btn = event.target.closest("[data-page]");
          if (!btn || btn.disabled) return;
          currentProjectPage = parseInt(btn.getAttribute("data-page"), 10) || 1;
          renderProjectPagination(true);
        });
      }

      renderProjectPagination(false);
    }

    /* ---------- Monthly launch-offer countdown ----------
       The offer always ends at the real end of the current month, so the
       timer remains accurate without pretending that every visitor gets a
       different secret deadline. */
    var offerCountdown = document.querySelector("[data-offer-countdown]");
    if (offerCountdown) {
      var offerDays = offerCountdown.querySelector("[data-offer-days]");
      var offerHours = offerCountdown.querySelector("[data-offer-hours]");
      var offerMinutes = offerCountdown.querySelector("[data-offer-minutes]");
      var offerSeconds = offerCountdown.querySelector("[data-offer-seconds]");
      var offerDeadline = document.querySelector("[data-offer-deadline]");
      var offerTimer;

      function twoDigits(value) {
        return String(Math.max(0, value)).padStart(2, "0");
      }

      function updateOfferCountdown() {
        var now = new Date();
        var monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
        var remaining = Math.max(0, monthEnd.getTime() - now.getTime());
        var days = Math.floor(remaining / 86400000);
        var hours = Math.floor((remaining % 86400000) / 3600000);
        var minutes = Math.floor((remaining % 3600000) / 60000);
        var seconds = Math.floor((remaining % 60000) / 1000);

        if (offerDays) offerDays.textContent = twoDigits(days);
        if (offerHours) offerHours.textContent = twoDigits(hours);
        if (offerMinutes) offerMinutes.textContent = twoDigits(minutes);
        if (offerSeconds) offerSeconds.textContent = twoDigits(seconds);
        if (offerDeadline) {
          var finalDay = new Date(monthEnd.getTime() - 1);
          offerDeadline.textContent = finalDay.toLocaleDateString(undefined, {
            month: "long", day: "numeric", year: "numeric"
          });
        }
      }

      updateOfferCountdown();
      offerTimer = window.setInterval(updateOfferCountdown, 1000);
      window.addEventListener("pagehide", function () { window.clearInterval(offerTimer); }, { once: true });
    }

    /* ---------- Responsive client-review sliders ---------- */
    document.querySelectorAll("[data-review-slider]").forEach(function (reviewSlider) {
      var reviewViewport = reviewSlider.querySelector(".reviews-viewport-v8");
      var reviewTrack = reviewSlider.querySelector(".reviews-track-v8");
      var reviewCards = Array.prototype.slice.call(reviewSlider.querySelectorAll(".review-slide-v8"));
      var reviewPrev = reviewSlider.querySelector("[data-review-prev]");
      var reviewNext = reviewSlider.querySelector("[data-review-next]");
      var reviewDots = reviewSlider.querySelector("[data-review-dots]");
      if (!reviewViewport || !reviewTrack || !reviewCards.length || !reviewPrev || !reviewNext || !reviewDots) return;

      var reviewPage = 0;
      var reviewPages = 1;
      var reviewAutoPlay;
      var reviewScrollTimer;
      var reviewResizeTimer;

      function reviewVisibleCards() {
        if (window.innerWidth <= 680) return 1;
        if (window.innerWidth <= 980) return 2;
        return 3;
      }

      function reviewPageOffset(page) {
        var cardWidth = reviewCards[0].getBoundingClientRect().width;
        var gap = parseFloat(window.getComputedStyle(reviewTrack).gap) || 0;
        return (cardWidth + gap) * reviewVisibleCards() * page;
      }

      function updateReviewControls() {
        reviewPrev.disabled = reviewPage === 0;
        reviewNext.disabled = reviewPage === reviewPages - 1;
        reviewDots.querySelectorAll(".reviews-dot-v8").forEach(function (dot, index) {
          dot.setAttribute("aria-current", index === reviewPage ? "true" : "false");
        });
      }

      function buildReviewDots() {
        reviewPages = Math.ceil(reviewCards.length / reviewVisibleCards());
        reviewPage = Math.min(reviewPage, reviewPages - 1);
        reviewDots.innerHTML = "";
        for (var index = 0; index < reviewPages; index += 1) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "reviews-dot-v8";
          dot.dataset.reviewPage = index;
          dot.setAttribute("aria-label", "Show review group " + (index + 1));
          reviewDots.appendChild(dot);
        }
        updateReviewControls();
      }

      function goToReviewPage(page) {
        reviewPage = Math.max(0, Math.min(page, reviewPages - 1));
        reviewViewport.scrollTo({
          left: reviewPageOffset(reviewPage),
          behavior: reducedMotion ? "auto" : "smooth"
        });
        updateReviewControls();
      }

      function startReviewAutoPlay() {
        if (reducedMotion) return;
        window.clearInterval(reviewAutoPlay);
        reviewAutoPlay = window.setInterval(function () {
          goToReviewPage(reviewPage === reviewPages - 1 ? 0 : reviewPage + 1);
        }, 6000);
      }

      reviewPrev.addEventListener("click", function () {
        goToReviewPage(reviewPage - 1);
        startReviewAutoPlay();
      });
      reviewNext.addEventListener("click", function () {
        goToReviewPage(reviewPage + 1);
        startReviewAutoPlay();
      });
      reviewDots.addEventListener("click", function (event) {
        var dot = event.target.closest("[data-review-page]");
        if (!dot) return;
        goToReviewPage(parseInt(dot.dataset.reviewPage, 10) || 0);
        startReviewAutoPlay();
      });
      reviewViewport.addEventListener("scroll", function () {
        window.clearTimeout(reviewScrollTimer);
        reviewScrollTimer = window.setTimeout(function () {
          var onePage = reviewPageOffset(1) || reviewViewport.clientWidth;
          reviewPage = Math.max(0, Math.min(Math.round(reviewViewport.scrollLeft / onePage), reviewPages - 1));
          updateReviewControls();
        }, 80);
      }, { passive: true });
      reviewSlider.addEventListener("mouseenter", function () { window.clearInterval(reviewAutoPlay); });
      reviewSlider.addEventListener("mouseleave", startReviewAutoPlay);
      reviewSlider.addEventListener("focusin", function () { window.clearInterval(reviewAutoPlay); });
      reviewSlider.addEventListener("focusout", startReviewAutoPlay);
      window.addEventListener("resize", function () {
        window.clearTimeout(reviewResizeTimer);
        reviewResizeTimer = window.setTimeout(function () {
          buildReviewDots();
          goToReviewPage(reviewPage);
        }, 150);
      }, { passive: true });
      window.addEventListener("pagehide", function () { window.clearInterval(reviewAutoPlay); }, { once: true });

      buildReviewDots();
      startReviewAutoPlay();
    });

    /* ---------- Animated counters ---------- */
    var counters = document.querySelectorAll("[data-count]");
    if (counters.length) {
      function animate(el) {
        var target = parseInt(el.getAttribute("data-count"), 10) || 0;
        if (reducedMotion) { el.textContent = target; return; }
        var dur = 1300, t0 = null;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
      if ("IntersectionObserver" in window && !reducedMotion) {
        var cio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); }
          });
        }, { threshold: 0.5 });
        counters.forEach(function (el) { cio.observe(el); });
      } else {
        counters.forEach(animate);
      }
    }

    /* ---------- Device animation tier ----------
       desktop = full | tablet = moderate | mobile = light | reduced = none */
    var isTouch = window.matchMedia && window.matchMedia("(hover:none)").matches;
    var isDesktop = window.innerWidth >= 1025 && !isTouch;
    var isMobile = window.innerWidth <= 640;

    /* ---------- Full-section hero background video ----------
       Muted inline autoplay is enabled on desktop and mobile. Reduced-motion,
       data-saver and very slow connections retain the poster instead. */
    var heroVideo = document.getElementById("heroVideo");
    if (heroVideo) {
      var heroVisible = true;
      var manuallyPaused = false;
      var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      var allowVideo = !reducedMotion && !(connection &&
        (connection.saveData || /2g/.test(connection.effectiveType || "")));
      var videoToggle = document.getElementById("heroVideoToggle");

      function setToggle(paused) {
        if (!videoToggle) return;
        videoToggle.classList.toggle("is-paused", paused);
        videoToggle.setAttribute("aria-label", paused ? "Play background video" : "Pause background video");
        var label = videoToggle.querySelector(".toggle-label");
        if (label) label.textContent = paused ? "Play motion" : "Pause motion";
      }

      function safePlay() {
        if (!allowVideo || manuallyPaused || !heroVisible || document.hidden) return;
        var promise = heroVideo.play();
        if (promise && promise.catch) promise.catch(function () { setToggle(true); });
      }

      heroVideo.addEventListener("playing", function () {
        heroVideo.classList.add("is-playing");
        setToggle(false);
      });
      heroVideo.addEventListener("pause", function () {
        setToggle(true);
      });
      heroVideo.addEventListener("error", function () {
        heroVideo.classList.remove("is-playing");
        setToggle(true);
      });

      if (videoToggle) {
        videoToggle.addEventListener("click", function () {
          if (heroVideo.paused) {
            manuallyPaused = false;
            safePlay();
          } else {
            manuallyPaused = true;
            heroVideo.pause();
          }
        });
      }

      if (allowVideo) {
        if (heroVideo.readyState >= 2) safePlay();
        else heroVideo.addEventListener("canplay", safePlay, { once: true });

        if ("IntersectionObserver" in window) {
          var vio = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              heroVisible = entry.isIntersecting;
              if (heroVisible) safePlay();
              else if (!heroVideo.paused) heroVideo.pause();
            });
          }, { threshold: 0.05 });
          vio.observe(heroVideo);
        } else {
          safePlay();
        }

        document.addEventListener("visibilitychange", function () {
          if (document.hidden && !heroVideo.paused) heroVideo.pause();
          else safePlay();
        });
      } else {
        try { heroVideo.pause(); heroVideo.removeAttribute("autoplay"); } catch (e) {}
        if (videoToggle) videoToggle.hidden = true;
      }
    }

    /* ---------- Scroll progress indicator ---------- */
    if (!reducedMotion) {
      var bar = document.createElement("div");
      bar.className = "scroll-progress";
      document.body.appendChild(bar);
      var ticking = false;
      var setBar = function () {
        var h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = "scaleX(" + (h > 0 ? window.scrollY / h : 0) + ")";
        ticking = false;
      };
      window.addEventListener("scroll", function () {
        if (!ticking) { ticking = true; requestAnimationFrame(setBar); }
      }, { passive: true });
      setBar();
    }

    /* ---------- Cursor glow (desktop pointers only) ---------- */
    if (isDesktop && !reducedMotion) {
      var glow = document.createElement("div");
      glow.className = "cursor-glow";
      document.body.appendChild(glow);
      document.body.classList.add("has-cursor");
      var gx = 0, gy = 0, gRaf = false;
      window.addEventListener("mousemove", function (e) {
        gx = e.clientX; gy = e.clientY;
        if (!gRaf) {
          gRaf = true;
          requestAnimationFrame(function () {
            glow.style.transform = "translate(" + (gx - 210) + "px," + (gy - 210) + "px)";
            gRaf = false;
          });
        }
      }, { passive: true });
    }

    /* ---------- Hero: assemble the logo symbol, then pulse ---------- */
    var build = document.querySelector(".logo-build");
    if (build) {
      /* start once it is actually on screen so the entrance is seen */
      if ("IntersectionObserver" in window) {
        var bio = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            if (e.isIntersecting) { build.classList.add("run"); bio.disconnect(); }
          });
        }, { threshold: 0.25 });
        bio.observe(build);
      } else {
        build.classList.add("run");
      }
    }

    /* ---------- Hero: mouse parallax (desktop only) ---------- */
    var stage = document.querySelector("[data-parallax]");
    if (stage && isDesktop && !reducedMotion) {
      var layers = stage.querySelectorAll("[data-depth]");
      var px = 0, py = 0, pRaf = false;
      stage.closest("section").addEventListener("mousemove", function (e) {
        var r = this.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        if (!pRaf) {
          pRaf = true;
          requestAnimationFrame(function () {
            layers.forEach(function (l) {
              var d = parseFloat(l.getAttribute("data-depth")) || 0;
              l.style.transform = "translate3d(" + (-px * 34 * d) + "px," + (-py * 26 * d) + "px,0)";
            });
            pRaf = false;
          });
        }
      }, { passive: true });
      stage.closest("section").addEventListener("mouseleave", function () {
        layers.forEach(function (l) { l.style.transform = ""; });
      });
    }

    /* ---------- Card 3D tilt + cursor highlight (desktop only) ---------- */
    if (isDesktop && !reducedMotion) {
      document.querySelectorAll(".tilt").forEach(function (card) {
        card.addEventListener("mousemove", function (e) {
          var r = card.getBoundingClientRect();
          var x = (e.clientX - r.left) / r.width;
          var y = (e.clientY - r.top) / r.height;
          card.style.setProperty("--mx", (x * 100) + "%");
          card.style.setProperty("--my", (y * 100) + "%");
          card.classList.add("tilting");
          card.style.transform =
            "perspective(900px) rotateY(" + ((x - .5) * 6).toFixed(2) + "deg) rotateX(" +
            ((.5 - y) * 6).toFixed(2) + "deg) translateY(-6px)";
        });
        card.addEventListener("mouseleave", function () {
          card.classList.remove("tilting");
          card.style.transform = "";
        });
      });
    }

    /* ---------- Process: illuminate each stage on scroll ---------- */
    var tlItems = document.querySelectorAll(".tl-item");
    if (tlItems.length) {
      if ("IntersectionObserver" in window && !reducedMotion) {
        var tio = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add("lit"); tio.unobserve(e.target); }
          });
        }, { threshold: 0.45, rootMargin: "0px 0px -12% 0px" });
        tlItems.forEach(function (i) { tio.observe(i); });
      } else {
        tlItems.forEach(function (i) { i.classList.add("lit"); });
      }
    }

    /* ---------- Section dividers draw themselves in ---------- */
    var dividers = document.querySelectorAll(".divider");
    if (dividers.length) {
      if ("IntersectionObserver" in window && !reducedMotion) {
        var dio = new IntersectionObserver(function (en) {
          en.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add("in"); dio.unobserve(e.target); }
          });
        }, { threshold: 0.6 });
        dividers.forEach(function (d) { dio.observe(d); });
      } else {
        dividers.forEach(function (d) { d.classList.add("in"); });
      }
    }

    /* ---------- Hero node network (SVG, count scales with device) ---------- */
    var nodeSvg = document.getElementById("hero-nodes");
    if (nodeSvg && !reducedMotion) {
      var NS = "http://www.w3.org/2000/svg";
      var count = isMobile ? 8 : (isDesktop ? 20 : 13);
      var W = 100, H = 100, pts = [];
      for (var i = 0; i < count; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H });
      }
      /* connect near neighbours only — keeps the DOM small */
      for (var a = 0; a < pts.length; a++) {
        for (var b = a + 1; b < pts.length; b++) {
          var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y;
          if (dx * dx + dy * dy < 460) {
            var ln = document.createElementNS(NS, "line");
            ln.setAttribute("x1", pts[a].x); ln.setAttribute("y1", pts[a].y);
            ln.setAttribute("x2", pts[b].x); ln.setAttribute("y2", pts[b].y);
            nodeSvg.appendChild(ln);
          }
        }
      }
      pts.forEach(function (p) {
        var c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", p.x); c.setAttribute("cy", p.y);
        c.setAttribute("r", (Math.random() * .5 + .45).toFixed(2));
        c.setAttribute("class", "n");
        nodeSvg.appendChild(c);
      });
    }

    /* ---------- Pause hero video for reduced motion ---------- */
    var hv = document.querySelector(".hero-video-bg");
    if (hv && reducedMotion) {
      try { hv.pause(); hv.removeAttribute("autoplay"); } catch (e) {}
    }

    /* ---------- Blog search (client-side filter) ---------- */
    var bs = document.getElementById("blogSearch");
    if (bs) {
      var posts = document.querySelectorAll("[data-post]");
      var empty = document.getElementById("blogEmpty");
      bs.addEventListener("input", function () {
        var q = bs.value.trim().toLowerCase();
        var shown = 0;
        posts.forEach(function (p) {
          var hit = !q || p.getAttribute("data-post").indexOf(q) !== -1;
          p.style.display = hit ? "" : "none";
          if (hit) shown++;
        });
        if (empty) empty.style.display = shown ? "none" : "block";
      });
    }

    /* ---------- Contact form ---------- */
    var form = document.getElementById("contactForm");
    if (form) {
      /* To send real emails: sign up at https://web3forms.com (free),
         paste your access key below, and the form goes live.
         Until a key is set, the form validates and shows a demo notice. */
      var WEB3FORMS_ACCESS_KEY = "";

      var statusEl = document.getElementById("formStatus");
      function setStatus(kind, msg) {
        statusEl.className = "form-status " + kind;
        statusEl.textContent = msg;
        statusEl.setAttribute("role", "alert");
        statusEl.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
      }
      function fieldWrap(input) { return input.closest(".field") || input.closest(".consent"); }
      function validate() {
        var ok = true;
        form.querySelectorAll("[required]").forEach(function (input) {
          var wrap = fieldWrap(input);
          var bad = input.type === "checkbox" ? !input.checked :
                    input.type === "email" ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) :
                    !input.value.trim();
          if (wrap && wrap.classList) wrap.classList.toggle("invalid", bad);
          input.setAttribute("aria-invalid", bad ? "true" : "false");
          if (bad) ok = false;
        });
        return ok;
      }
      form.querySelectorAll("input,select,textarea").forEach(function (input) {
        var w = input.closest(".field");
        if (!w) return;
        input.addEventListener("focus", function () { w.classList.add("is-focus"); });
        input.addEventListener("blur", function () { w.classList.remove("is-focus"); });
      });
      form.querySelectorAll("[required]").forEach(function (input) {
        input.addEventListener("input", function () {
          var wrap = fieldWrap(input);
          if (wrap && wrap.classList) wrap.classList.remove("invalid");
        });
        input.addEventListener("change", function () {
          var wrap = fieldWrap(input);
          if (wrap && wrap.classList) wrap.classList.remove("invalid");
        });
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!validate()) {
          setStatus("err", "Please fill in the highlighted fields so we can get back to you.");
          var first = form.querySelector('[aria-invalid="true"]');
          if (first) first.focus();
          return;
        }
        /* Honeypot: bots fill hidden fields; humans never see it. */
        if (form.querySelector('[name="website_url"]').value) return;

        var btn = form.querySelector('button[type="submit"]');
        var data = new FormData(form);
        data.delete("website_url");

        if (!WEB3FORMS_ACCESS_KEY) {
          setStatus("ok", "Thanks, " + (data.get("name") || "there") +
            "! Your message is valid and ready to send. (Site owner: add your free Web3Forms access key in js/main.js to enable live email delivery.)");
          form.reset();
          return;
        }

        data.append("access_key", WEB3FORMS_ACCESS_KEY);
        data.append("subject", "New project inquiry — techjointsolution.com");
        btn.disabled = true;
        btn.dataset.label = btn.textContent;
        btn.textContent = "Sending…";
        fetch("https://api.web3forms.com/submit", { method: "POST", body: data })
          .then(function (r) { return r.json(); })
          .then(function (r) {
            if (r.success) {
              setStatus("ok", "Thanks! Your message has been sent — redirecting…");
              form.reset();
              /* Conversion event for GA4 / Google Ads, then a real thank-you URL.
                 Without a distinct URL there is nothing to count as a conversion. */
              if (typeof window.gtag === "function") {
                window.gtag("event", "generate_lead", { form: "contact" });
              }
              window.setTimeout(function () {
                window.location.href = "thank-you.html";
              }, 900);
            } else {
              setStatus("err", "Something went wrong sending your message. Please email info@techjointsolution.com instead.");
            }
          })
          .catch(function () {
            setStatus("err", "Network error — please try again, or email info@techjointsolution.com.");
          })
          .finally(function () {
            btn.disabled = false;
            btn.textContent = btn.dataset.label;
          });
      });
    }
  } catch (err) {
    revealAll(); /* failsafe: content must always be visible */
    if (window.console && console.error) console.error(err);
  }
})();
