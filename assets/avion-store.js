/* ============================================================
   AVION STORE JS
   Collection grid stagger · product card hover shimmer
   Product page: thumbnail rail · tabs · media zoom
   ============================================================ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================================================================
     1. COLLECTION GRID — stagger reveal items as they scroll in
  ================================================================ */
  function initGridStagger() {
    var items = document.querySelectorAll('.product-grid__item');
    if (!items.length) return;

    if (REDUCED) {
      for (var i = 0; i < items.length; i++) {
        items[i].classList.add('av-item-visible');
      }
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var idx = parseInt(el.getAttribute('data-grid-idx') || '0', 10);
        var delay = Math.min(idx % 4, 3) * 90;
        setTimeout(function () {
          el.classList.add('av-item-visible');
        }, delay);
        obs.unobserve(el);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

    var grid = document.querySelector('.product-grid__list, ul[data-av-grid]');
    if (grid) grid.classList.add('av-product-grid');

    for (var j = 0; j < items.length; j++) {
      items[j].setAttribute('data-grid-idx', j);
      obs.observe(items[j]);
    }
  }

  /* ================================================================
     2. COLLECTION HERO — reveal heading + meta line
  ================================================================ */
  function initCollectionHero() {
    var hero = document.querySelector('.av-collection-hero');
    if (!hero) return;

    var eyebrow = hero.querySelector('.av-collection-hero__eyebrow');
    var line    = hero.querySelector('.av-collection-hero__line');

    if (REDUCED) {
      if (eyebrow) eyebrow.classList.add('av-visible');
      if (line)    line.classList.add('av-visible');
      return;
    }

    setTimeout(function () {
      if (eyebrow) eyebrow.classList.add('av-visible');
    }, 120);

    setTimeout(function () {
      if (line) line.classList.add('av-visible');
    }, 300);
  }

  /* ================================================================
     3. PRODUCT CARD — shimmer on hover (desktop)
  ================================================================ */
  function initCardShimmer() {
    if (window.matchMedia('(hover: none)').matches) return;

    var cards = document.querySelectorAll('.product-card, .av-product-card');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r  = card.getBoundingClientRect();
        var x  = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        var y  = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        card.style.setProperty('--shimmer-x', x + '%');
        card.style.setProperty('--shimmer-y', y + '%');
      });
      card.addEventListener('mouseleave', function () {
        card.style.removeProperty('--shimmer-x');
        card.style.removeProperty('--shimmer-y');
      });
    });
  }

  /* ================================================================
     4. PRODUCT PAGE — thumbnail rail switcher
  ================================================================ */
  function initThumbnailRail() {
    var thumbs = document.querySelectorAll('.av-thumb');
    if (!thumbs.length) return;

    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var target = thumb.getAttribute('data-target');
        if (!target) return;

        // Deactivate all
        thumbs.forEach(function (t) { t.classList.remove('active'); });
        thumb.classList.add('active');

        // Swap main image
        var mainImg = document.querySelector('.av-product-media__main img');
        if (mainImg) {
          mainImg.style.opacity = '0';
          mainImg.style.transform = 'scale(1.04)';
          setTimeout(function () {
            mainImg.src = target;
            mainImg.style.transition = 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.2,0.8,0.2,1)';
            mainImg.style.opacity = '1';
            mainImg.style.transform = 'scale(1)';
          }, 200);
        }
      });
    });
  }

  /* ================================================================
     5. PRODUCT PAGE — accordion tabs
  ================================================================ */
  function initProductTabs() {
    var tabs   = document.querySelectorAll('.av-tab-btn');
    var panels = document.querySelectorAll('.av-tab-panel');
    if (!tabs.length) return;

    tabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-tab');
        tabs.forEach(function (t)   { t.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        btn.classList.add('active');
        var panel = document.querySelector('.av-tab-panel[data-tab="' + target + '"]');
        if (panel) panel.classList.add('active');
      });
    });
  }

  /* ================================================================
     6. PRODUCT PAGE — variant selection feedback
        Adds a brief scale pulse on the add-to-cart button when
        a variant is picked, confirming the selection.
  ================================================================ */
  function initVariantFeedback() {
    var pickers = document.querySelectorAll(
      'variant-picker-component, .variant-picker, [data-section-type="product"]'
    );
    if (!pickers.length) return;

    var btn = document.querySelector('[name="add"], .av-atc-btn');
    if (!btn) return;

    pickers.forEach(function (picker) {
      picker.addEventListener('change', function () {
        if (REDUCED) return;
        btn.style.transition = 'transform 0.15s ease';
        btn.style.transform  = 'scale(0.97)';
        setTimeout(function () {
          btn.style.transform = 'scale(1)';
        }, 150);
      });
    });
  }

  /* ================================================================
     7. PRODUCT PAGE — media zoom on click (lightbox-feel)
        Adds .av-product-media-zoom; on click expands inline.
  ================================================================ */
  function initMediaZoom() {
    var mediaWrap = document.querySelector('.product-information__media, .av-product-media');
    if (!mediaWrap) return;
    mediaWrap.classList.add('av-product-media-zoom');
  }

  /* ================================================================
     8. COLLECTION HERO — count display
  ================================================================ */
  function initProductCount() {
    var countEl = document.querySelector('.av-collection-count');
    if (!countEl) return;

    var raw = countEl.textContent.trim();
    if (!raw || REDUCED) return;

    // Animate number from 0 to N
    var target = parseInt(raw, 10);
    if (isNaN(target)) return;

    var current = 0;
    var step = Math.ceil(target / 24);
    var timer = setInterval(function () {
      current = Math.min(current + step, target);
      countEl.textContent = current + ' products';
      if (current >= target) clearInterval(timer);
    }, 40);
  }

  /* ================================================================
     9. QUICK-ADD button stagger
        Makes quick-add buttons on hovered cards slide in smoothly
  ================================================================ */
  function initQuickAddHover() {
    var cards = document.querySelectorAll('.product-card, .av-product-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      var qa = card.querySelector('.quick-add, .av-product-card__cta');
      if (!qa) return;

      card.addEventListener('mouseenter', function () {
        qa.style.opacity = '1';
        qa.style.transform = 'translateY(0)';
      });

      card.addEventListener('mouseleave', function () {
        qa.style.opacity = '0';
        qa.style.transform = 'translateY(8px)';
      });
    });
  }

  /* ================================================================
     BOOT
  ================================================================ */
  function boot() {
    initCollectionHero();
    initGridStagger();
    initCardShimmer();
    initThumbnailRail();
    initProductTabs();
    initVariantFeedback();
    initMediaZoom();
    initProductCount();
    initQuickAddHover();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-run on Shopify section load (infinite scroll, editor)
  document.addEventListener('shopify:section:load', boot);

}());
