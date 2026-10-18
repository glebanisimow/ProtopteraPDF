// Copies fallback fonts into public/engine/ so the engine never hits a CDN (pdfium.wasm is imported via Vite).
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modules = join(root, 'node_modules', '@embedpdf');
const out = join(root, 'public', 'engine');
mkdirSync(join(out, 'fonts'), { recursive: true });

// Latin/Cyrillic/Greek only; CJK, Arabic and Hebrew packs blow the installer budget (see DECISIONS.md).
export const FALLBACK_FONTS = ['NotoSans-Regular.ttf', 'NotoSans-Bold.ttf', 'NotoSans-Italic.ttf', 'NotoSans-BoldItalic.ttf'];
for (const font of FALLBACK_FONTS) {
  copyFileSync(join(modules, 'fonts-latin', 'fonts', font), join(out, 'fonts', font));
}
console.log('engine assets copied to public/engine');
