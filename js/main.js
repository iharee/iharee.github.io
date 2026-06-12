/**
 * main.js — Interactive behavior for the static blog
 *
 * Responsibilities:
 *   1. TOC active heading tracking (IntersectionObserver)
 *   2. TOC smooth scroll + history.pushState
 *   3. "Expand more" toggle for post cards
 *   4. Responsive TOC drawer on mobile
 *   5. Footer year
 */

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  initFooterYear();
  initTOC();
  initMoreToggles();
  initCosplay();
});

/* ============================================================
   FOOTER YEAR
   ============================================================ */
function initFooterYear() {
  var yearEl = document.getElementById('this-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* ============================================================
   TOC — ACTIVE HEADING TRACKING + SMOOTH SCROLL
   ============================================================ */
function initTOC() {
  var tocLinks = document.querySelectorAll('.toc-nav a');
  var headings = findAllHeadings();

  if (tocLinks.length === 0 || headings.length === 0) {
    return;
  }

  // Build a map from heading id to TOC link
  var headingToLink = {};
  tocLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      var id = href.slice(1);
      headingToLink[id] = link;
    }
  });

  // IntersectionObserver: highlight the TOC item for the heading
  // currently in the viewport
  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        var id = entry.target.id;
        var link = headingToLink[id];
        if (!link) return;

        if (entry.isIntersecting) {
          // Remove .active from all TOC links
          tocLinks.forEach(function (l) { l.classList.remove('active'); });
          // Add .active to the current one
          link.classList.add('active');
        }
      });
    },
    {
      rootMargin: '-180px 0px -70% 0px',
      threshold: 0
    }
  );

  headings.forEach(function (h) {
    observer.observe(h);
  });

  // Smooth scroll on TOC link click + update URL hash
  tocLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;

      var id = href.slice(1);
      var target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', href);
      }
    });
  });

  // Responsive TOC toggle for mobile
  initResponsiveTOC();
}

/* ============================================================
   COSPLAY — VIEW TOGGLE, GALLERY EXPAND, LIGHTBOX
   ============================================================ */
function initCosplay() {
  initCosplayViewToggle();
  initCosplayGalleryExpand();
  initCosplayLightbox();
}

function initCosplayViewToggle() {
  var toggleBtns = document.querySelectorAll('.view-toggle-btn');
  if (toggleBtns.length === 0) return;

  var timelineView = document.getElementById('cosplay-timeline');
  var galleryView = document.getElementById('cosplay-gallery');

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var view = btn.getAttribute('data-view');

      toggleBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      if (view === 'timeline') {
        timelineView.classList.remove('cosplay-hidden');
        galleryView.classList.add('cosplay-hidden');
      } else {
        timelineView.classList.add('cosplay-hidden');
        galleryView.classList.remove('cosplay-hidden');
      }
    });
  });
}

function initCosplayGalleryExpand() {
  var cards = document.querySelectorAll('.cosplay-gallery-card');

  cards.forEach(function (card) {
    var preview = card.querySelector('.gallery-card-preview');
    var info = card.querySelector('.gallery-card-info');

    function toggleCard() {
      card.classList.toggle('expanded');
    }

    if (preview) {
      preview.addEventListener('click', toggleCard);
    }
    if (info) {
      info.addEventListener('click', toggleCard);
    }
  });
}

function initCosplayLightbox() {
  var overlay = document.getElementById('lightboxOverlay');
  if (!overlay) return;

  var img = document.getElementById('lightboxImg');
  var downloadLink = document.getElementById('lightboxDownload');
  var closeBtn = document.getElementById('lightboxClose');

  // Open lightbox on photo click
  document.addEventListener('click', function (e) {
    var photoItem = e.target.closest('.cosplay-photo-item');
    if (!photoItem) return;

    var fullUrl = photoItem.getAttribute('data-full');
    if (!fullUrl) return;

    img.src = fullUrl;
    downloadLink.href = fullUrl;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  // Close handlers
  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    img.src = '';
  }

  closeBtn.addEventListener('click', closeLightbox);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closeLightbox();
    }
  });
}

/**
 * Collect all h2, h3, h4 headings from the post body that have IDs.
 */
function findAllHeadings() {
  var postBody = document.querySelector('.post-body');
  if (!postBody) return [];

  var headings = [];
  var els = postBody.querySelectorAll('h2[id], h3[id], h4[id]');
  for (var i = 0; i < els.length; i++) {
    headings.push(els[i]);
  }
  return headings;
}

/* ============================================================
   RESPONSIVE TOC DRAWER (mobile < 768px)
   ============================================================ */
function initResponsiveTOC() {
  var fab = document.getElementById('tocFab');
  var overlay = document.getElementById('tocOverlay');
  var closeBtn = document.getElementById('tocCloseBtn');
  var body = document.body;
  var tocLinks = document.querySelectorAll('.toc-nav a');

  if (!fab || !overlay || !closeBtn) return;

  function openDrawer() {
    body.classList.add('toc-drawer-open');
  }

  function closeDrawer() {
    body.classList.remove('toc-drawer-open');
  }

  fab.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);
  closeBtn.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && body.classList.contains('toc-drawer-open')) {
      closeDrawer();
    }
  });

  tocLinks.forEach(function (link) {
    link.addEventListener('click', closeDrawer);
  });
}

/* ============================================================
   MORE TOGGLE — "展开剩余 N 篇"
   ============================================================ */
function initMoreToggles() {
  var buttons = document.querySelectorAll('.more-toggle');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var catKey = btn.getAttribute('data-cat');
      var hiddenCards = document.querySelectorAll('.cat-' + catKey + '-hidden');
      var isExpanded = btn.classList.toggle('expanded');

      btn.setAttribute('aria-expanded', String(isExpanded));

      hiddenCards.forEach(function (card) {
        card.classList.toggle('visible', isExpanded);
      });

      // Update button text
      var arrow = btn.querySelector('.arrow');
      var arrowHTML = arrow ? arrow.outerHTML : '<span class="arrow">▾</span>';

      if (isExpanded) {
        btn.innerHTML = '收起 ' + arrowHTML; // 收起
      } else {
        btn.innerHTML = '展开剩余 ' + hiddenCards.length + ' 篇 ' + arrowHTML; // 展开剩余 N 篇
      }
    });
  });
}
