// Data layer: loads the three metadata JSON files, builds unit/character
// indexes, resolves sticker paths and manages the image cache.
// Every sticker URL in the app goes through stickerPath(); change the image
// server by updating STICKER_BASE_URL in config.js only.

import { STICKER_BASE_URL } from './config.js';

const unitList = [];            // [{name, shortname}] in characters.json order
const charsByUnit = new Map();  // shortname -> [{name, roma}]
const unitOfChar = new Map();   // roma -> unit shortname
const nameOfChar = new Map();   // roma -> display name
const colorOfChar = new Map();  // roma -> 'rgb(r, g, b)'
const countOfChar = new Map();  // roma -> number of base images

async function getJSON(file) {
  const res = await fetch(file);
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
  return res.json();
}

export async function loadData() {
  const [characters, colors, counts] = await Promise.all([
    getJSON('./characters.json'),
    getJSON('./character_colors.json'),
    getJSON('./character_stickers.json'),
  ]);
  for (const unit of Object.values(characters)) {
    unitList.push({ name: unit.name, shortname: unit.shortname });
    charsByUnit.set(
      unit.shortname,
      unit.characters.map((c) => ({ name: c.name, roma: c.roma })),
    );
    for (const c of unit.characters) {
      unitOfChar.set(c.roma, unit.shortname);
      nameOfChar.set(c.roma, c.name);
    }
  }
  for (const [roma, [r, g, b]] of Object.entries(colors)) {
    colorOfChar.set(roma, `rgb(${r}, ${g}, ${b})`);
  }
  for (const [roma, n] of Object.entries(counts)) countOfChar.set(roma, n);
}

export const units = () => unitList;
export const charactersIn = (short) => charsByUnit.get(short) ?? [];
export const unitOf = (roma) => unitOfChar.get(roma);
export const characterName = (roma) => nameOfChar.get(roma) ?? roma;
export const themeColor = (roma) => colorOfChar.get(roma) ?? 'rgb(255, 255, 255)';
export const stickerCount = (roma) => countOfChar.get(roma) ?? 0;

/** Single URL choke point for every sticker image (canvas + thumbnails). */
export function stickerPath(roma, n) {
  return `${STICKER_BASE_URL}${unitOf(roma)}/${roma}/${roma}${n}.png`;
}

// ---------------------------------------------------------------------------
// Image cache shared by the canvas renderer and UI thumbnails.
// ---------------------------------------------------------------------------

const cache = new Map(); // 'roma/n' -> { img, promise }

const keyOf = (roma, n) => `${roma}/${n}`;

/** Loads (and caches) a base image; repeated calls return the same promise. */
export function loadSticker(roma, n) {
  const key = keyOf(roma, n);
  let entry = cache.get(key);
  if (!entry) {
    const img = new Image();
    // crossOrigin: no side effect when same-origin; required after an OSS
    // migration so the canvas stays untainted (copy/download need it).
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = stickerPath(roma, n);
    entry = {
      img,
      promise: new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => {
          cache.delete(key); // allow a retry on transient failures
          reject(new Error(`failed to load sticker: ${img.src}`));
        };
      }),
    };
    cache.set(key, entry);
  }
  return entry.promise;
}

/** Returns the image only if it is already loaded; null otherwise. */
export function cachedSticker(roma, n) {
  const img = cache.get(keyOf(roma, n))?.img;
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}
