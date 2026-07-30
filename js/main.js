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
  initCodeBlocks();
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
  initCosplayLightbox();
  if (initCosplayEntryDetail()) return;
  initCosplayViewToggle();
  initCosplayGalleryNav();
  initCosplayTimelineNav();
}

function initCosplayViewToggle() {
  var toggleBtns = document.querySelectorAll('.view-toggle-btn');
  if (toggleBtns.length === 0) return;

  var timelineView = document.getElementById('cosplay-timeline');
  var galleryView = document.getElementById('cosplay-gallery');

  function setView(view, updateUrl) {
    toggleBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });

    if (view === 'timeline') {
      timelineView.classList.remove('cosplay-hidden');
      galleryView.classList.add('cosplay-hidden');
    } else {
      timelineView.classList.add('cosplay-hidden');
      galleryView.classList.remove('cosplay-hidden');
    }

    if (updateUrl !== false) {
      var target = view === 'timeline' ? '/cosplay/' : '/cosplay/list/';
      window.location.href = target;
    }
  }

  // Init from URL path
  var isList = /\/list\/?$/.test(window.location.pathname);
  setView(isList ? 'list' : 'timeline', false);

  toggleBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setView(btn.getAttribute('data-view'));
    });
  });
}

function initCosplayGalleryNav() {
  var cards = document.querySelectorAll('.cosplay-gallery-card');
  cards.forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function (e) {
      if (e.target.closest('a')) return;
      var slug = card.getAttribute('data-slug');
      if (!slug) return;
      var url = new URL('/cosplay/', window.location.origin);
      url.searchParams.set('entry', slug);
      url.searchParams.delete('display');
      window.open(url.toString(), '_blank');
    });
  });
}

function initCosplayEntryDetail() {
  var params = new URLSearchParams(window.location.search);
  var entryKey = params.get('entry');
  if (!entryKey) return false;

  var dataEl = document.getElementById('cosplay-data');
  if (!dataEl) return false;

  var data;
  try {
    data = JSON.parse(dataEl.textContent);
  } catch (e) {
    return false;
  }

  var entry = null;
  for (var i = 0; i < data.entries.length; i++) {
    if (data.entries[i].slug === entryKey) {
      entry = data.entries[i];
      break;
    }
  }
  if (!entry) return false;

  // Hide toggle, timeline, gallery
  var toggle = document.querySelector('.cosplay-view-toggle');
  if (toggle) toggle.style.display = 'none';

  var timeline = document.getElementById('cosplay-timeline');
  if (timeline) timeline.classList.add('cosplay-hidden');

  var gallery = document.getElementById('cosplay-gallery');
  if (gallery) gallery.classList.add('cosplay-hidden');

  // Show and populate detail
  var detailView = document.getElementById('cosplay-entry-detail');
  if (!detailView) return false;
  detailView.classList.remove('cosplay-hidden');

  var photoCount = entry.photos.length;
  var html = '';

  // Back button
  html += '<div class="entry-detail-back">';
  html += '<button class="back-btn" id="entryBackBtn">← 返回图集</button>';
  html += '</div>';

  // Header
  html += '<div class="entry-detail-header">';
  html += '<h1 class="entry-detail-character">';
  html += escapeHtml(entry.character);
  if (entry.franchise) {
    html += ' <span class="cosplay-franchise">' + escapeHtml(entry.franchise) + '</span>';
  }
  html += '</h1>';
  html += '<div class="entry-detail-meta">';
  html += '<span class="cosplay-date">' + escapeHtml(entry.date) + '</span>';
  if (entry.location) {
    html += '<span class="cosplay-location">' + escapeHtml(entry.location) + '</span>';
  }
  html += '<span class="cosplay-count">' + photoCount + ' 张</span>';
  html += '</div>';
  if (entry.note) {
    html += '<div class="cosplay-entry-note">' + escapeHtml(entry.note) + '</div>';
  }
  html += '</div>';

  // Photo grid
  html += '<div class="cosplay-photo-grid entry-detail-grid">';
  for (var j = 0; j < photoCount; j++) {
    var photo = entry.photos[j];
    var thumb = photo.thumb || (photo.full + '?imageMogr2/thumbnail/1080x/format/webp');
    html += '<div class="cosplay-photo-item" data-full="' + escapeAttr(photo.full) + '">';
    html += '<img src="' + escapeAttr(thumb) + '" alt="" loading="lazy"';
    html += ' onerror="this.onerror=null;this.src=\'' + escapeAttr(photo.full) + '\'">';
    html += '</div>';
  }
  html += '</div>';

  detailView.innerHTML = html;

  // Back button handler
  document.getElementById('entryBackBtn').addEventListener('click', function () {
    window.location.href = '/cosplay/list/';
  });

  // Page title
  var siteTitle = document.title.split(' — ').slice(-1)[0];
  document.title = entry.character + ' — Cosplay — ' + siteTitle;

  return true;
}

function initCosplayTimelineNav() {
  var headers = document.querySelectorAll('.cosplay-entry-header');
  headers.forEach(function (header) {
    header.style.cursor = 'pointer';
    header.addEventListener('click', function () {
      var entry = header.closest('.cosplay-entry');
      if (!entry) return;
      var slug = entry.getAttribute('data-slug');
      if (!slug) return;
      var url = new URL('/cosplay/', window.location.origin);
      url.searchParams.set('entry', slug);
      window.open(url.toString(), '_blank');
    });
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

/* ============================================================
   UTILITY — HTML / attribute escaping
   ============================================================ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* ============================================================
   CODE BLOCKS — COPY BUTTON + WRAPPER
   ============================================================ */

var COPY_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var CHECK_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

function initCodeBlocks() {
  var pres = document.querySelectorAll('.post-body pre');

  for (var i = 0; i < pres.length; i++) {
    var pre = pres[i];
    var code = pre.querySelector(':scope > code');
    if (!code) continue;

    // Determine the root element to wrap.
    // If pre's parent is .highlight, wrap the .highlight;
    // otherwise wrap the pre itself.
    var root = pre;
    var parent = pre.parentElement;
    if (parent && parent.classList.contains('highlight')) {
      root = parent;
    }

    // Avoid double-wrapping
    if (root.parentElement && root.parentElement.classList.contains('code-block-wrapper')) continue;

    // Create wrapper and replace root with it
    var wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    root.parentElement.replaceChild(wrapper, root);
    wrapper.appendChild(root);

    // Append copy button
    var btn = createCopyButton(code);
    wrapper.appendChild(btn);
  }
}

function createCopyButton(codeElement) {
  var btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', '复制代码');
  btn.type = 'button';

  var iconSpan = document.createElement('span');
  iconSpan.className = 'copy-btn-icon';
  iconSpan.innerHTML = COPY_ICON;

  var textSpan = document.createElement('span');
  textSpan.className = 'copy-btn-text';
  textSpan.textContent = '复制';

  btn.appendChild(iconSpan);
  btn.appendChild(textSpan);

  btn.addEventListener('click', function () {
    var text = getCodeText(codeElement);

    navigator.clipboard.writeText(text).then(function () {
      btn.classList.add('copied');
      iconSpan.innerHTML = CHECK_ICON;
      textSpan.textContent = '已复制';
      btn.setAttribute('aria-label', '已复制');

      setTimeout(function () {
        btn.classList.remove('copied');
        iconSpan.innerHTML = COPY_ICON;
        textSpan.textContent = '复制';
        btn.setAttribute('aria-label', '复制代码');
      }, 1500);
    });
  });

  return btn;
}

/**
 * Extract clean code text from a <code> element, skipping line-number spans.
 */
function getCodeText(codeElement) {
  // Prefer .cl spans (Chroma with line numbers) for clean line-by-line extraction
  var codeLines = codeElement.querySelectorAll('.cl');
  if (codeLines.length > 0) {
    var lines = [];
    for (var i = 0; i < codeLines.length; i++) {
      lines.push(codeLines[i].textContent || '');
    }
    return lines.join('\n').replace(/\n+$/, '');
  }

  // Fallback: clone the element, strip .ln spans, get textContent
  var clone = codeElement.cloneNode(true);
  var lns = clone.querySelectorAll('.ln');
  for (var j = 0; j < lns.length; j++) {
    lns[j].remove();
  }
  return (clone.textContent || '').replace(/^\n+|\n+$/g, '');
}
