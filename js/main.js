/**
 * main.js — Interactive behavior for the static blog
 *
 * Responsibilities:
 *   1. TOC active heading tracking (IntersectionObserver)
 *   2. TOC smooth scroll + history.pushState
 *   3. "Expand more" toggle for post cards
 *   4. Responsive TOC drawer on mobile
 *   5. Footer year
 *   6. Cosplay video preview tiles + modal player
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
  initCosplayVideoModal();
  if (initCosplayEntryDetail()) return;
  initCosplayViewToggle();
  initCosplayGalleryNav();
  initCosplayTimelineNav();
}

function initCosplayViewToggle() {
  var toggleBtns = document.querySelectorAll('.view-toggle-btn');
  if (toggleBtns.length === 0) return;

  var fullView = document.getElementById('cosplay-full');
  var cardsView = document.getElementById('cosplay-cards');

  function setView(view, updateUrl) {
    toggleBtns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === view);
    });

    // "timeline" = card wall (default, /cosplay/);
    // "full" = full-content flow (/cosplay/list/)
    if (view === 'timeline') {
      fullView.classList.add('cosplay-hidden');
      cardsView.classList.remove('cosplay-hidden');
    } else {
      fullView.classList.remove('cosplay-hidden');
      cardsView.classList.add('cosplay-hidden');
    }

    if (updateUrl !== false) {
      var target = view === 'timeline' ? '/cosplay/' : '/cosplay/list/';
      window.location.href = target;
    }
  }

  // Init from URL path
  var isList = /\/list\/?$/.test(window.location.pathname);
  setView(isList ? 'full' : 'timeline', false);

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

function showEntryNotFoundNotice(entryKey) {
  var main = document.querySelector('main.cosplay-main');
  if (!main) return;
  if (document.getElementById('cosplay-entry-notice')) return;
  var notice = document.createElement('p');
  notice.id = 'cosplay-entry-notice';
  notice.className = 'cosplay-entry-notice';
  // textContent: entryKey comes from the URL, never via innerHTML
  notice.textContent = '「' + entryKey + '」不存在——下方已展示全部的有效内容。';
  var toggle = document.querySelector('.cosplay-view-toggle');
  if (toggle) {
    main.insertBefore(notice, toggle);
  } else {
    main.insertBefore(notice, main.firstChild);
  }
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
  for (var i = 0; i < (data.entries || []).length; i++) {
    if (data.entries[i].slug === entryKey) {
      entry = data.entries[i];
      break;
    }
  }
  if (!entry) {
    showEntryNotFoundNotice(entryKey);
    return false;
  }

  // Detail mode = the entry's own timeline. The entry blocks are already
  // server-rendered, so just hide everything else; lightbox and video modal
  // are document-level delegates and keep working on the visible block.
  var main = document.querySelector('main.cosplay-main');
  if (!main) return false;
  main.classList.add('cosplay-detail-mode');

  var toggle = document.querySelector('.cosplay-view-toggle');
  if (toggle) toggle.classList.add('cosplay-hidden');

  // The full-content flow is hidden by default (card wall is the default
  // view), so bring it back for the detail page before filtering entries.
  var full = document.getElementById('cosplay-full');
  if (full) full.classList.remove('cosplay-hidden');

  var cards = document.getElementById('cosplay-cards');
  if (cards) cards.classList.add('cosplay-hidden');

  var entries = document.querySelectorAll('.cosplay-entry');
  entries.forEach(function (el) {
    if (el.getAttribute('data-slug') !== entryKey) el.classList.add('cosplay-hidden');
  });

  // Back button — return to the view the user came from (fixed string only)
  var back = document.createElement('div');
  back.className = 'entry-detail-back';
  back.innerHTML = '<button class="back-btn" id="entryBackBtn">← 返回</button>';
  main.insertBefore(back, main.firstChild);
  document.getElementById('entryBackBtn').addEventListener('click', function () {
    var backUrl = '/cosplay/';
    var referrerPath = document.referrer ? document.referrer.split('?')[0] : '';
    if (/\/cosplay\/list\/?$/.test(referrerPath)) {
      backUrl = '/cosplay/list/';
    }
    window.location.href = backUrl;
  });

  // Page title
  var siteTitle = document.title.split(' — ').slice(-1)[0];
  document.title = entry.character + ' — Cosplay — ' + siteTitle;

  return true;
}

function initCosplayTimelineNav() {
  var headers = document.querySelectorAll('.cosplay-entry-header');
  headers.forEach(function (header) {
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

    var fullUrl = photoItem.getAttribute('data-url');
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

function initCosplayVideoModal() {
  var overlay = document.getElementById('videoOverlay');
  var player = document.getElementById('videoPlayer');
  var closeBtn = document.getElementById('videoClose');
  if (!overlay || !player || !closeBtn) return;

  // Open modal player from timeline/gallery video preview tiles
  document.addEventListener('click', function (e) {
    var tile = e.target.closest('.cosplay-video-item');
    if (!tile || !tile.hasAttribute('data-url')) return;
    player.src = tile.getAttribute('data-url');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    player.play().catch(function () {});
  });

  function closePlayer() {
    overlay.classList.remove('open');
    player.pause();
    player.removeAttribute('src');
    player.load();
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closePlayer);

  overlay.addEventListener('click', function (e) {
    if (e.target === overlay) {
      closePlayer();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      closePlayer();
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
        btn.innerHTML = '收起 ' + arrowHTML; // collapse
      } else {
        btn.innerHTML = '展开剩余 ' + hiddenCards.length + ' 篇 ' + arrowHTML; // expand remaining N posts
      }
    });
  });
}

/* ============================================================
   CODE BLOCKS — COPY BUTTON + WRAPPER
   ============================================================ */

var COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';

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
    var btn = createCopyButton();
    wrapper.appendChild(btn);
  }

  // Copy-button clicks are delegated on document. KaTeX posts re-serialize
  // .post-body via innerHTML (see baseof.html), which strips per-element
  // listeners from the freshly parsed buttons — delegation survives that.
  if (!initCodeBlocks.delegated) {
    initCodeBlocks.delegated = true;
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (btn) handleCopyClick(btn);
    });
  }
}

function createCopyButton() {
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

  return btn;
}

function handleCopyClick(btn) {
  // Resolve the code element through the wrapper instead of closing over it:
  // after a KaTeX innerHTML rewrite the button is a new node, and its wrapper
  // is re-parsed as well, so look everything up fresh per click.
  var wrapper = btn.parentElement;
  var code = wrapper ? wrapper.querySelector('code') : null;
  if (!code) return;

  var iconSpan = btn.querySelector('.copy-btn-icon');
  var textSpan = btn.querySelector('.copy-btn-text');

  // A new click supersedes the previous one's revert timer, so a stale
  // timer can never reset a fresher "copied" state.
  if (btn._revertTimer) {
    clearTimeout(btn._revertTimer);
    btn._revertTimer = null;
  }

  copyTextToClipboard(getCodeText(code), function (ok) {
    if (!ok) {
      if (textSpan) textSpan.textContent = '复制失败';
      btn.setAttribute('aria-label', '复制失败');
      btn._revertTimer = setTimeout(function () {
        btn._revertTimer = null;
        if (textSpan) textSpan.textContent = '复制';
        btn.setAttribute('aria-label', '复制代码');
      }, 1500);
      return;
    }

    btn.classList.add('copied');
    if (iconSpan) iconSpan.innerHTML = CHECK_ICON;
    if (textSpan) textSpan.textContent = '已复制';
    btn.setAttribute('aria-label', '已复制');

    btn._revertTimer = setTimeout(function () {
      btn._revertTimer = null;
      btn.classList.remove('copied');
      if (iconSpan) iconSpan.innerHTML = COPY_ICON;
      if (textSpan) textSpan.textContent = '复制';
      btn.setAttribute('aria-label', '复制代码');
    }, 1500);
  });
}

/**
 * Copy text to the clipboard. The async Clipboard API can reject on some
 * macOS + Chrome combos (focus/permission quirks) and can even stay pending
 * forever, so it races against a timer that falls back to a hidden textarea
 * + execCommand — synchronous and gesture-friendly. `done(ok)` fires exactly
 * once, whichever path settles first.
 */
function copyTextToClipboard(text, done) {
  var settled = false;
  function finish(ok) {
    if (!settled) { settled = true; done(ok); }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () {
      finish(true);
    }, function () {
      finish(legacyCopy(text));
    });
    // If the async API has not settled yet, fall back synchronously. The
    // underlying writeText promise is NOT cancelled — it may still resolve
    // later — but `finish` ignores it, so the UI is never updated twice.
    setTimeout(function () { if (!settled) finish(legacyCopy(text)); }, 800);
    return;
  }
  finish(legacyCopy(text));
}

function legacyCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  var ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

/**
 * Extract clean code text from a <code> element.
 *
 * Newlines are never reconstructed here. The DOM's own line breaks are the
 * only source — Chroma keeps each line's trailing newline INSIDE its span,
 * so any join('\n') layered on top would double every line break. Line-number
 * spans are the only chrome removed.
 */
function getCodeText(codeElement) {
  var clone = codeElement.cloneNode(true);
  var lns = clone.querySelectorAll('.ln');
  for (var i = 0; i < lns.length; i++) {
    lns[i].remove();
  }
  return (clone.textContent || '').replace(/^\n+|\n+$/g, '');
}
