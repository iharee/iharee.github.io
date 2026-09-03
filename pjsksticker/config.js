// ============================================================================
// Deployment configuration -- the ONLY file that needs to change per
// deployment environment.
// ============================================================================
//
// STICKER_BASE_URL: root URL of sticker PNGs, must end with "/".
//
//   image server: 'https://www.arrowmc.top/yqstatic/standalone/pjsksticker/'
//
// Directory layout stays the same:
//   <STICKER_BASE_URL>/<unit>/<roma>/<roma><n>.png
//   (unit in vs/ln/mmj/vbs/ws/25, n starts at 1, see character_stickers.json)
//
// Two things to do when migrating to an image server:
//   1. Change only this constant. Every image URL in the app goes through
//      stickerPath() in assets.js, so canvas base images and UI thumbnails
//      switch together. Never build image URLs anywhere else.
//   2. Enable CORS on the OSS side (Access-Control-Allow-Origin for this
//      site's origin). Images are always loaded with crossOrigin='anonymous'
//      (no side effect when same-origin); without CORS headers the canvas
//      gets tainted and "copy / download" export breaks.
//
export const STICKER_BASE_URL = 'https://www.arrowmc.top/yqstatic/standalone/pjsksticker/';
