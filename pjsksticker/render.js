// Render layer: pure functions on a 2D context. No DOM access, no state.
// draw(ctx, base, state) is the stable signature kept open for multi-layer
// rendering (SPEC phase 2).
//
// state contract (SPEC §6, plus one extra field):
//   text, font ('auto' | 'YurukaStd' | 'SSFangTangTi'),
//   x, y (relative 0-1), rotation (slider units, rendered as /10 radians),
//   fontSize, spaceSize (256px-reference units),
//   curve (bool), background { type: 'none'|'solid'|'gradient', c1, c2 },
//   color -- fill color for the text (theme color of current character),
//            merged in by main.js so this module stays data-free.

const KANA_RE = /[\u3041-\u309F\u30A0-\u30FF]/; // hiragana + katakana (incl. prolonged mark)

/** Auto font selection: kana -> YurukaStd (JP), everything else -> SSFangTangTi (CN). */
export function pickFontFamily(text, font) {
  if (font !== 'auto') return font;
  return KANA_RE.test(text) ? 'YurukaStd' : 'SSFangTangTi';
}

/** Color input parsing (SPEC §5): 'w' -> white, 'b' -> black, 't' -> transparent,
    anything else is used verbatim as a CSS color string. */
export function parseColor(input) {
  const s = String(input ?? '').trim().toLowerCase();
  if (s === 'w') return '#ffffff';
  if (s === 'b') return '#000000';
  if (s === 't' || s === '') return 'rgba(0, 0, 0, 0)';
  return s;
}

function drawBackground(ctx, w, h, bg) {
  if (bg?.type === 'solid') {
    ctx.fillStyle = parseColor(bg.c1);
    ctx.fillRect(0, 0, w, h);
  } else if (bg?.type === 'gradient') {
    // Diagonal gradient, top-left -> bottom-right.
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, parseColor(bg.c1));
    g.addColorStop(1, parseColor(bg.c2));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

const widestLine = (ctx, lines) =>
  lines.reduce((max, l) => Math.max(max, ctx.measureText(l).width), 0);

/**
 * Adaptive sizing (simplified fitFontSizeToCanvas):
 * - if the widest line exceeds w*0.92, shrink the font proportionally;
 * - if many lines would overflow vertically, shrink line spacing to match.
 * Returns the final { fontSize, spaceSize } in device pixels.
 */
function fitText(ctx, lines, family, fontSize, spaceSize, w, h) {
  const setFont = (fs) => { ctx.font = `${fs}px ${family}, sans-serif`; };
  setFont(fontSize);

  const maxW = w * 0.92;
  const widest = widestLine(ctx, lines);
  if (widest > maxW && widest > 0) {
    fontSize = Math.max(8, Math.floor((fontSize * maxW) / widest));
    setFont(fontSize);
  }

  if (lines.length > 1) {
    const maxH = h * 0.92;
    if ((lines.length - 1) * spaceSize + fontSize > maxH) {
      spaceSize = Math.max(8, Math.floor((maxH - fontSize) / (lines.length - 1)));
    }
  }
  return { fontSize, spaceSize };
}

/** Text drawn along an arc: every glyph rotates a bit further around the
    anchor point and is lifted by fontSize*3.5 -- matches the reference
    implementation byte for byte (SPEC §3.6). */
function drawCurved(ctx, lines, text, fontSize) {
  const angle = (Math.PI * text.length) / 7;
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      ctx.rotate(angle / line.length / 2.5);
      ctx.save();
      ctx.translate(0, -1 * fontSize * 3.5);
      ctx.strokeText(line[i], 0, 0);
      ctx.fillText(line[i], 0, 0);
      ctx.restore();
    }
  }
}

/** Straight multi-line text, vertically centered around the anchor. */
function drawStraight(ctx, lines, spaceSize) {
  let k = 0;
  for (let i = 0; i < lines.length; i++) {
    const offset = k - ((lines.length - 1) * spaceSize) / 2;
    k += spaceSize;
    ctx.strokeText(lines[i], 0, offset);
    ctx.fillText(lines[i], 0, offset);
  }
}

/**
 * Draws one complete frame: background -> base image -> text.
 * The canvas is resized to the base image's natural size (the source of
 * truth for output dimensions).
 */
export function draw(ctx, base, state) {
  const w = base.naturalWidth;
  const h = base.naturalHeight;
  if (ctx.canvas.width !== w) ctx.canvas.width = w;
  if (ctx.canvas.height !== h) ctx.canvas.height = h;
  // Resize only clears when dimensions change; every other frame must clear
  // explicitly, or drawImage composites over the previous frame and the
  // sticker's semi-transparent pixels (sparkles, AA edges) keep darkening.
  ctx.clearRect(0, 0, w, h);

  const scale = Math.min(w, h) / 256; // normalization factor, 256px reference
  drawBackground(ctx, w, h, state.background);
  ctx.drawImage(base, 0, 0);

  const text = state.text ?? '';
  if (text.length === 0) return;
  const lines = text.split('\n');

  const family = pickFontFamily(text, state.font);
  let fontSize = Math.max(12, Math.round((state.fontSize ?? 42) * scale));
  let spaceSize = Math.max(8, Math.round((state.spaceSize ?? 42) * scale));
  ({ fontSize, spaceSize } = fitText(ctx, lines, family, fontSize, spaceSize, w, h));

  ctx.save();
  ctx.translate(state.x * w, state.y * h);
  ctx.rotate((state.rotation ?? 1) / 10);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, Math.round(9 * scale)); // white stroke width
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = state.color ?? '#ffffff';

  if (state.curve) drawCurved(ctx, lines, text, fontSize);
  else drawStraight(ctx, lines, spaceSize);

  ctx.restore();
}
