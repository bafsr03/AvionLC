/* ============================================================
   AVION ANIMATIONS — Scroll reveals, parallax, word splits,
   image curtains, card hover, cursor glow, scroll progress
   Vanilla JS · No dependencies · ~7KB
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------------
     ENV FLAGS
  ---------------------------------------------------------------- */
  var REDUCED  = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IS_TOUCH = !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ================================================================
     1. SCROLL PROGRESS BAR
     Gold stripe across the top that fills as you scroll
  ================================================================ */
  function initProgressBar() {
    var bar = document.createElement('div');
    bar.className = 'av-progress-bar';
    document.body.appendChild(bar);

    var ticking = false;

    function update() {
      var scrolled = window.scrollY || window.pageYOffset;
      var total = document.documentElement.scrollHeight - window.innerHeight;
      var p = total > 0 ? Math.min(scrolled / total, 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ================================================================
     2. CURSOR GLOW (desktop pointer only)
     Soft amber radial gradient follows the mouse with lag
  ================================================================ */
  function initCursorGlow() {
    if (IS_TOUCH || REDUCED) return;

    var glow = document.createElement('div');
    glow.className = 'av-cursor-glow';
    document.body.appendChild(glow);

    var tx = -1000, ty = -1000;
    var cx = -1000, cy = -1000;
    var raf = null;

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });

    function tick() {
      cx += (tx - cx) * 0.065;
      cy += (ty - cy) * 0.065;
      glow.style.left = cx + 'px';
      glow.style.top  = cy + 'px';

      if (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }
  }

  /* ================================================================
     3. TEXT SPLITTER — wrap each word in .av-word > .av-word-inner
     Preserves <br> line-breaks from Liquid's newline_to_br filter
  ================================================================ */
  function splitWords(el) {
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = '';

    for (var pi = 0; pi < parts.length; pi++) {
      // Strip any stray HTML tags (escaped chars, etc.)
      var text = parts[pi].replace(/<[^>]+>/g, '').trim();
      if (!text) {
        if (pi < parts.length - 1) el.appendChild(document.createElement('br'));
        continue;
      }

      var words = text.split(/\s+/).filter(Boolean);
      for (var wi = 0; wi < words.length; wi++) {
        if (wi > 0) el.appendChild(document.createTextNode('\u00A0'));
        var word  = document.createElement('span');
        word.className = 'av-word';
        var inner = document.createElement('span');
        inner.className = 'av-word-inner';
        inner.textContent = words[wi];
        word.appendChild(inner);
        el.appendChild(word);
      }

      if (pi < parts.length - 1) el.appendChild(document.createElement('br'));
    }
  }

  /* ================================================================
     4. IMAGE CURTAIN SETUP
     Adds .av-img-curtain + --av-curtain-bg CSS var to each element
     that carries data-av-curtain
  ================================================================ */
  function initCurtains() {
    var els = document.querySelectorAll('[data-av-curtain]');
    for (var i = 0; i < els.length; i++) {
      var el    = els[i];
      var color = el.getAttribute('data-av-curtain-color') || '#F8F0E3';
      el.classList.add('av-img-curtain');
      el.style.setProperty('--av-curtain-bg', color);
    }
  }

  /* ================================================================
     5. SCROLL REVEAL — IntersectionObserver
     Handles all [data-av-reveal] elements + curtain triggers
  ================================================================ */
  function initScrollReveal() {

    /* ---- 5a. Word splits ---- */
    if (!REDUCED) {
      var wordEls = document.querySelectorAll('[data-av-reveal="words"]');
      for (var i = 0; i < wordEls.length; i++) {
        splitWords(wordEls[i]);
      }
    }

    /* ---- 5b. Apply data-av-delay as transition-delay ---- */
    var delayed = document.querySelectorAll('[data-av-delay]');
    for (var j = 0; j < delayed.length; j++) {
      var ms = parseInt(delayed[j].getAttribute('data-av-delay'), 10);
      if (!isNaN(ms) && ms > 0) {
        delayed[j].style.transitionDelay = (ms / 1000).toFixed(3) + 's';
      }
    }

    /* ---- 5c. Word stagger delays ---- */
    if (!REDUCED) {
      var wordContainers = document.querySelectorAll('[data-av-reveal="words"]');
      for (var k = 0; k < wordContainers.length; k++) {
        var base   = parseInt(wordContainers[k].getAttribute('data-av-delay') || '0', 10);
        var inners = wordContainers[k].querySelectorAll('.av-word-inner');
        for (var n = 0; n < inners.length; n++) {
          inners[n].style.transitionDelay = ((base + n * 68) / 1000).toFixed(3) + 's';
        }
      }
    }

    /* ---- 5d. Reduced motion: show all immediately ---- */
    if (REDUCED) {
      var all = document.querySelectorAll('[data-av-reveal]');
      for (var m = 0; m < all.length; m++) {
        all[m].classList.add('av-visible');
      }
      var curtains = document.querySelectorAll('[data-av-curtain]');
      for (var c = 0; c < curtains.length; c++) {
        curtains[c].classList.add('av-curtain-visible');
      }
      return;
    }

    /* ---- 5e. Reveal observer ---- */
    var revealObs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('av-visible');
          revealObs.unobserve(entries[i].target);
        }
      }
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -5% 0px'
    });

    var targets = document.querySelectorAll('[data-av-reveal]');
    for (var t = 0; t < targets.length; t++) {
      revealObs.observe(targets[t]);
    }

    /* ---- 5f. Curtain observer ---- */
    var curtainObs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.classList.add('av-curtain-visible');
          curtainObs.unobserve(entries[i].target);
        }
      }
    }, {
      threshold: 0.08,
      rootMargin: '0px 0px -2% 0px'
    });

    var curtainEls = document.querySelectorAll('[data-av-curtain]');
    for (var ci = 0; ci < curtainEls.length; ci++) {
      curtainObs.observe(curtainEls[ci]);
    }

    /* ---- 5g. Reveal content already in the viewport on load ----
       IntersectionObserver sometimes misses the first paint (Shopify editor, iOS Safari,
       very large viewports). This prevents [data-av-reveal] staying at opacity:0 and
       [data-av-curtain] covering the full image forever. */
    function revealInitiallyVisible() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var vw = window.innerWidth || document.documentElement.clientWidth;

      function inView(rect) {
        return rect.bottom > 8 && rect.top < vh - 8 && rect.right > 0 && rect.left < vw;
      }

      var rev = document.querySelectorAll('[data-av-reveal]:not(.av-visible)');
      for (var r = 0; r < rev.length; r++) {
        if (inView(rev[r].getBoundingClientRect())) {
          rev[r].classList.add('av-visible');
        }
      }

      var cur = document.querySelectorAll('[data-av-curtain]:not(.av-curtain-visible)');
      for (var c = 0; c < cur.length; c++) {
        if (inView(cur[c].getBoundingClientRect())) {
          cur[c].classList.add('av-curtain-visible');
        }
      }
    }

    revealInitiallyVisible();
    window.requestAnimationFrame(revealInitiallyVisible);
  }

  /* ================================================================
     6. PARALLAX (desktop / non-touch only)
     Subtle vertical shift on images during scroll
  ================================================================ */
  function initParallax() {
    if (REDUCED || IS_TOUCH) return;

    var els = document.querySelectorAll('[data-av-parallax]');
    if (!els.length) return;

    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      for (var i = 0; i < els.length; i++) {
        var el     = els[i];
        var rect   = el.getBoundingClientRect();
        var speed  = parseFloat(el.getAttribute('data-av-parallax') || '0.12');
        // progress: 0 = bottom of el enters bottom of vp; 1 = top of el leaves top of vp
        var prog   = (vh - rect.top) / (vh + rect.height);
        var offset = ((prog - 0.5) * speed * 160).toFixed(1);
        var img    = el.querySelector('img') || el.querySelector('.av-parallax-inner');
        if (img) img.style.transform = 'translate3d(0,' + offset + 'px,0)';
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ================================================================
     7. MAGNETIC BUTTONS (desktop only)
     Elements with .av-magnetic follow cursor within their bounds
  ================================================================ */
  function initMagneticButtons() {
    if (IS_TOUCH || REDUCED) return;

    var btns = document.querySelectorAll('.av-magnetic');
    for (var i = 0; i < btns.length; i++) {
      (function (btn) {
        btn.addEventListener('mousemove', function (e) {
          var r  = btn.getBoundingClientRect();
          var dx = (e.clientX - (r.left + r.width  / 2)) * 0.22;
          var dy = (e.clientY - (r.top  + r.height / 2)) * 0.22;
          btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = '';
        });
      }(btns[i]));
    }
  }

  /* ================================================================
     8. CARD HOVER EFFECTS
     Adds .av-card-hover + .av-img-zoom to Shopify product cards
  ================================================================ */
  function initCardEffects() {
    var cardSelectors = [
      '.card-wrapper',
      '.product-card',
      '.card--product',
      '.card--article'
    ];

    cardSelectors.forEach(function (sel) {
      var cards = document.querySelectorAll(sel);
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (!card.classList.contains('av-card-hover')) {
          card.classList.add('av-card-hover');
        }
        var mediaWrap = card.querySelector('.card__media, .media--hover-effect, .card__image-wrapper');
        if (mediaWrap && !mediaWrap.classList.contains('av-img-zoom')) {
          mediaWrap.classList.add('av-img-zoom');
        }
      }
    });
  }

  /* ================================================================
     9. STAGGER CHILDREN
     [data-av-stagger="120"] containers apply incremental delays
     to their direct [data-av-reveal] children
  ================================================================ */
  function initStagger() {
    var containers = document.querySelectorAll('[data-av-stagger]');
    for (var i = 0; i < containers.length; i++) {
      var c    = containers[i];
      var step = parseInt(c.getAttribute('data-av-stagger') || '100', 10);
      var kids = c.querySelectorAll(':scope > [data-av-reveal]');
      for (var j = 0; j < kids.length; j++) {
        var base = parseInt(kids[j].getAttribute('data-av-delay') || '0', 10);
        kids[j].style.transitionDelay = ((base + j * step) / 1000).toFixed(2) + 's';
      }
    }
  }

  /* ================================================================
     10. MARQUEE POLISH
     Adds pointer-events:none to the marquee track during animation
     to prevent accidental hover interference
  ================================================================ */
  function initMarquee() {
    var tracks = document.querySelectorAll('.avion-hero-poster__track, .marquee-track');
    for (var i = 0; i < tracks.length; i++) {
      tracks[i].style.pointerEvents = 'none';
    }
  }

  /* ================================================================
     10. HEADER SCROLL CLASS
     Adds .av-header-scrolled to #header-group when scrolled past 60px
  ================================================================ */
  function initNavbarScroll() {
    var headerGroup = document.getElementById('header-group');
    if (!headerGroup) return;

    var THRESHOLD = 60;
    var ticking = false;

    function update() {
      var scrolled = window.scrollY || window.pageYOffset;
      if (scrolled > THRESHOLD) {
        headerGroup.classList.add('av-header-scrolled');
      } else {
        headerGroup.classList.remove('av-header-scrolled');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update(); // Run on load
  }

  /* ================================================================
     BOOT
  ================================================================ */
  function boot() {
    initProgressBar();
    initCursorGlow();
    initCurtains();
    initScrollReveal();
    initParallax();
    initMagneticButtons();
    initCardEffects();
    initStagger();
    initMarquee();
    initNavbarScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ----------------------------------------------------------------
     11. SHOPIFY EDITOR INTEGRATION
     Re-run reveal & curtain logic when sections are updated/added
  ---------------------------------------------------------------- */
  document.addEventListener('shopify:section:load', function() {
    initCurtains();
    initScrollReveal();
    initParallax();
    initStagger();
  });

  document.addEventListener('shopify:section:select', function() {
    // Optionally trigger reveals immediately for the selected section
    initScrollReveal();
  });

}());
