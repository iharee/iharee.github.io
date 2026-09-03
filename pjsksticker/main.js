// App layer: owns the state object (single source of truth), binds UI
// controls, schedules rAF-debounced redraws and handles export (copy /
// download). All actual drawing lives in render.js.

import {
  loadData, units, charactersIn, characterName, unitOf,
  themeColor, stickerCount, stickerPath, cachedSticker, loadSticker,
} from './assets.js';
import { draw } from './render.js';

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// State (SPEC §6) -- defaults.json overrides text/x/y/rotation/fontSize per
// character on selection; everything else stays app-global.
// ---------------------------------------------------------------------------

const state = {
  unit: 'ws',
  character: 'emu',
  stickerIndex: 1,
  text: '',
  font: 'auto',
  x: 0.5,
  y: 0.6,
  rotation: 1,
  fontSize: 42,
  spaceSize: 42,
  curve: false,
  background: { type: 'none', c1: '#ffffff', c2: '#333333' },
};

let defaults = {}; // roma -> {x, y, rotation, fontSize, text}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

const canvas = $('stage');
const ctx = canvas.getContext('2d');
const el = {
  loading: $('loading'),
  sizeInfo: $('sizeInfo'),
  unitTabs: $('unitTabs'),
  charGrid: $('charGrid'),
  stickerGrid: $('stickerGrid'),
  text: $('textInput'),
  x: $('xSlider'), y: $('ySlider'), rot: $('rotSlider'),
  size: $('sizeSlider'), space: $('spaceSlider'), spaceRow: $('spaceRow'),
  xOut: $('xOut'), yOut: $('yOut'), rotOut: $('rotOut'),
  sizeOut: $('sizeOut'), spaceOut: $('spaceOut'),
  curve: $('curveToggle'), font: $('fontSelect'),
  bgSeg: $('bgSeg'), bgColors: $('bgColors'), c1: $('c1'), c2: $('c2'),
  copy: $('copyBtn'), download: $('downloadBtn'), reset: $('resetBtn'),
  toast: $('toast'),
};

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.toast.classList.remove('show'), 2200);
}

/** Render view of the state: merge the character theme color for render.js. */
const renderState = () => ({ ...state, color: themeColor(state.character) });

const isHexColor = (v) => /^#[0-9a-f]{6}$/i.test(v);
const hexOr = (v, fallback) => (isHexColor(v) ? v : fallback);

// ---------------------------------------------------------------------------
// Render scheduling -- rAF debounce keeps slider dragging smooth (SPEC §6).
// ---------------------------------------------------------------------------

let rafPending = false;
function scheduleDraw() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    renderNow();
  });
}

async function renderNow() {
  const roma = state.character;
  const index = state.stickerIndex;
  let img = cachedSticker(roma, index);
  if (!img) {
    try {
      img = await loadSticker(roma, index);
    } catch {
      toast('底图加载失败，请稍后重试');
      return;
    }
    // Drop stale frames if the user moved on while we were loading.
    if (state.character !== roma || state.stickerIndex !== index) return;
  }
  draw(ctx, img, renderState());
  el.sizeInfo.textContent = `底图原始尺寸 ${img.naturalWidth} × ${img.naturalHeight}`;
}

// ---------------------------------------------------------------------------
// UI builders
// ---------------------------------------------------------------------------

function buildUnitTabs() {
  el.unitTabs.replaceChildren(
    ...units().map((u) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.unit = u.shortname;
      const short = document.createElement('span');
      short.className = 'unit-short';
      short.textContent = u.shortname === '25' ? '25时' : u.shortname;
      const name = document.createElement('span');
      name.className = 'unit-name';
      name.textContent = u.name;
      b.append(short, name);
      return b;
    }),
  );
}

function buildCharGrid() {
  el.charGrid.dataset.unit = state.unit;
  el.charGrid.replaceChildren(
    ...charactersIn(state.unit).map((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.roma = c.roma;
      b.title = c.name;
      b.setAttribute('aria-label', c.name);
      const img = document.createElement('img');
      img.src = stickerPath(c.roma, 1); // first base image as the avatar
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      const label = document.createElement('span');
      label.textContent = c.name;
      b.append(img, label);
      return b;
    }),
  );
}

function buildStickerGrid() {
  el.stickerGrid.replaceChildren(
    ...Array.from({ length: stickerCount(state.character) }, (_, i) => {
      const n = i + 1;
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.n = n;
      b.title = `底图 ${n}`;
      b.setAttribute('aria-label', `底图 ${n}`);
      const img = document.createElement('img');
      img.src = stickerPath(state.character, n);
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = n;
      b.append(img, num);
      return b;
    }),
  );
}

// ---------------------------------------------------------------------------
// Selection & syncing
// ---------------------------------------------------------------------------

function applyCharacterDefaults(roma) {
  const d = defaults[roma] ?? {};
  state.text = d.text ?? characterName(roma);
  state.x = d.x ?? 0.5;
  state.y = d.y ?? 0.6;
  state.rotation = d.rotation ?? 1;
  state.fontSize = d.fontSize ?? 42;
  state.spaceSize = 42;
  state.curve = false;
  state.font = 'auto';
}

function updateTheme() {
  document.documentElement.style.setProperty('--theme', themeColor(state.character));
}

function syncStickerActive() {
  for (const b of el.stickerGrid.querySelectorAll('button[data-n]')) {
    b.classList.toggle('active', Number(b.dataset.n) === state.stickerIndex);
  }
}

function syncBackground() {
  for (const b of el.bgSeg.querySelectorAll('button[data-bg]')) {
    const on = b.dataset.bg === state.background.type;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  }
  el.c1.value = hexOr(state.background.c1, '#ffffff');
  el.c2.value = hexOr(state.background.c2, '#333333');
  const off = state.background.type === 'none';
  el.c1.disabled = off;
  el.c2.disabled = off;
  el.bgColors.classList.toggle('disabled', off);
}

/** Pushes the whole state into the controls (used after character/reset). */
function syncControls() {
  for (const b of el.unitTabs.querySelectorAll('button[data-unit]')) {
    b.classList.toggle('active', b.dataset.unit === state.unit);
  }
  for (const b of el.charGrid.querySelectorAll('button[data-roma]')) {
    b.classList.toggle('active', b.dataset.roma === state.character);
  }
  syncStickerActive();

  el.text.value = state.text;
  el.spaceRow.hidden = !state.text.includes('\n');
  el.x.value = state.x;
  el.xOut.textContent = state.x.toFixed(3);
  el.y.value = state.y;
  el.yOut.textContent = state.y.toFixed(3);
  el.rot.value = state.rotation;
  el.rotOut.textContent = state.rotation.toFixed(1);
  el.size.value = state.fontSize;
  el.sizeOut.textContent = String(Math.round(state.fontSize));
  el.space.value = state.spaceSize;
  el.spaceOut.textContent = String(Math.round(state.spaceSize));
  el.curve.checked = state.curve;
  el.font.value = state.font;
  syncBackground();
}

function selectCharacter(roma) {
  state.character = roma;
  state.unit = unitOf(roma);
  state.stickerIndex = 1;
  applyCharacterDefaults(roma);
  updateTheme();
  if (el.charGrid.dataset.unit !== state.unit) buildCharGrid();
  buildStickerGrid();
  syncControls();
  scheduleDraw();
}

function selectUnit(short) {
  if (state.unit === short) return;
  const first = charactersIn(short)[0];
  if (first) selectCharacter(first.roma);
}

function selectSticker(n) {
  if (n < 1 || n > stickerCount(state.character)) return;
  state.stickerIndex = n;
  syncStickerActive();
  scheduleDraw();
}

// ---------------------------------------------------------------------------
// Export (SPEC §8) -- copy falls back to download, never throws uncaught.
// ---------------------------------------------------------------------------

function downloadPNG() {
  const a = document.createElement('a');
  a.download = 'pjsk-sticker.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

async function copyToClipboard() {
  try {
    if (!window.isSecureContext || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
      throw new Error('clipboard image write not available');
    }
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    toast('已复制到剪贴板');
  } catch (err) {
    downloadPNG();
    toast('复制不可用，已改为下载');
    console.warn('copy failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Control bindings
// ---------------------------------------------------------------------------

function bindRange(input, out, key, format) {
  input.addEventListener('input', () => {
    state[key] = Number(input.value);
    out.textContent = format(state[key]);
    scheduleDraw();
  });
}

function bindControls() {
  el.text.addEventListener('input', () => {
    state.text = el.text.value;
    el.spaceRow.hidden = !state.text.includes('\n'); // line-spacing slider: multiline only
    scheduleDraw();
  });

  bindRange(el.x, el.xOut, 'x', (v) => v.toFixed(3));
  bindRange(el.y, el.yOut, 'y', (v) => v.toFixed(3));
  bindRange(el.rot, el.rotOut, 'rotation', (v) => v.toFixed(1));
  bindRange(el.size, el.sizeOut, 'fontSize', (v) => String(Math.round(v)));
  bindRange(el.space, el.spaceOut, 'spaceSize', (v) => String(Math.round(v)));

  el.curve.addEventListener('change', () => {
    state.curve = el.curve.checked;
    scheduleDraw();
  });
  el.font.addEventListener('change', () => {
    state.font = el.font.value;
    scheduleDraw();
  });

  el.bgSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-bg]');
    if (!btn) return;
    state.background.type = btn.dataset.bg;
    syncBackground();
    scheduleDraw();
  });
  el.c1.addEventListener('input', () => {
    state.background.c1 = el.c1.value;
    scheduleDraw();
  });
  el.c2.addEventListener('input', () => {
    state.background.c2 = el.c2.value;
    scheduleDraw();
  });

  el.unitTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-unit]');
    if (btn) selectUnit(btn.dataset.unit);
  });
  el.charGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-roma]');
    if (btn) selectCharacter(btn.dataset.roma);
  });
  el.stickerGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-n]');
    if (btn) selectSticker(Number(btn.dataset.n));
  });

  el.reset.addEventListener('click', () => {
    applyCharacterDefaults(state.character);
    syncControls();
    scheduleDraw();
    toast('已恢复本角色默认');
  });
  el.copy.addEventListener('click', copyToClipboard);
  el.download.addEventListener('click', () => {
    downloadPNG();
    toast('已开始下载');
  });
}

// ---------------------------------------------------------------------------
// Boot: gate the first frame on fonts + metadata (SPEC §4).
// ---------------------------------------------------------------------------

async function readyFonts() {
  try {
    await Promise.all([
      document.fonts.load('12px YurukaStd', 'わんだほーい'),
      document.fonts.load('12px SSFangTangTi', '世界'),
    ]);
  } catch (err) {
    console.warn('font loading failed, falling back to system fonts', err);
  }
}

async function loadDefaults() {
  try {
    const res = await fetch('./defaults.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    defaults = await res.json();
  } catch (err) {
    // Non-fatal: built-in heuristics cover everything defaults.json provides.
    console.warn('defaults.json unavailable, using built-in heuristics', err);
    defaults = {};
  }
}

async function boot() {
  try {
    await Promise.all([loadData(), loadDefaults(), readyFonts()]);
  } catch (err) {
    console.error(err);
    el.loading.textContent = '资源加载失败，请刷新重试';
    return;
  }
  buildUnitTabs();
  bindControls();
  selectCharacter(state.character);
  el.loading.hidden = true;
}

boot();
