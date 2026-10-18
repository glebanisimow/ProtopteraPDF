// Engine assets come from the bundle only: no CDN for pdfium.wasm or fallback fonts.
import { FontCharset, type FontFallbackConfig } from '@embedpdf/engines';
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url';

const base = new URL('/engine/', window.location.href).href;

// Absolute URL: the engine fetches it from a blob worker, which has no base URL of its own.
export const WASM_URL = new URL(wasmUrl, window.location.href).href;

const notoSans = [
  { url: `${base}fonts/NotoSans-Regular.ttf`, weight: 400 },
  { url: `${base}fonts/NotoSans-Bold.ttf`, weight: 700 },
  { url: `${base}fonts/NotoSans-Italic.ttf`, weight: 400, italic: true },
  { url: `${base}fonts/NotoSans-BoldItalic.ttf`, weight: 700, italic: true },
];

// Latin, Cyrillic, Greek, Central European and Vietnamese. CJK, Arabic and Hebrew are not bundled (DECISIONS.md).
export const FONT_FALLBACK: FontFallbackConfig = {
  fonts: {
    [FontCharset.ANSI]: notoSans,
    [FontCharset.DEFAULT]: notoSans,
    [FontCharset.CYRILLIC]: notoSans,
    [FontCharset.EASTERNEUROPEAN]: notoSans,
    [FontCharset.GREEK]: notoSans,
    [FontCharset.VIETNAMESE]: notoSans,
  },
  defaultFont: notoSans,
};
