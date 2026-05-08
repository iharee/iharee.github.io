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
  var sidebar = document.getElementById('tocSidebar');
  var tocHeader = sidebar ? sidebar.querySelector('.toc-header') : null;
  var tocNav = document.getElementById('tocNav');

  if (!sidebar || !tocHeader || !tocNav) return;

  tocHeader.addEventListener('click', function () {
    var visible = tocNav.classList.toggle('visible');
    sidebar.classList.toggle('toc-open', visible);
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
