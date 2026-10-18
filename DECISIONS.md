# Decisions

## 2026-10-18 — Design pack has no tokens or UI icons

- Context: the pack is 22 PNGs (emblems, glyphs, patterns). Palette ink `#0A0A09` / amber `#FFAA1D` / bone `#F4F1E8` matches Protoptera Player.
- Options: derive tokens and draw icons; ask for a fuller pack; ship placeholders.
- Choice (approved by owner): added `tokens.json` (W3C DTCG) and `icons/*.svg` (33 icons, 24 px, 1.75 stroke, square caps) into the pack itself, so the pack stays the single source of truth. `scripts/sync-design.mjs` generates `src/design/`.
- Consequences: light theme uses amber only as a fill; amber text on bone is 1.9:1 and fails WCAG AA, so `--color-accent-text` is `#9A5B00` in light. No fonts in the pack: UI uses system Segoe UI Variable / Bahnschrift (both ship with Windows 10/11, no network).

## 2026-10-18 — Engine assets bundled, CDN disabled

- Context: `@embedpdf/engines` 2.15.1 defaults to jsDelivr for `pdfium.wasm` and for fallback fonts (`cdnFontConfig`).
- Choice: `pdfium.wasm` is imported through Vite (`?url`); fallback fonts are copied to `public/engine/fonts` and passed via `fontFallback`.
- Fonts: only Noto Sans Regular/Bold/Italic/BoldItalic (~2.5 MB): Latin, Cyrillic, Central European (Polish), Greek, Vietnamese. CJK/Arabic/Hebrew packs are ~140 MB and break the 20 MB installer budget.
- Consequences: PDFs with non-embedded CJK/Arabic/Hebrew fonts render with missing glyphs; form appearance streams in those scripts are not supported in v1.

## 2026-10-18 — EmbedPDF 2.15.1 (stable), not 3.0.0-next

- 3.x is a prerelease line with a restructured package set. 2.15.1 (2026-09-16) is the newest stable older than 14 days; all 22 required plugins ship Svelte bindings in it.

## 2026-10-18 — TypeScript 6.0.3, not 7.x

- `svelte-check` 4.7.6 supports `typescript ^5 || ^6`. TS 7 (native port) is not supported by the Svelte toolchain yet.

## 2026-10-18 — Rust toolchain pinned to 1.99.0

- Latest stable 1.99.1 is from 2026-10-13 (younger than 14 days). `rust-toolchain.toml` pins 1.99.0 (2026-10-01).

## 2026-10-18 — `open_document(path)` accepts any path, but only PDFs

- Context: drag & drop and argv paths reach the webview; a dialog-only allowlist for reads would block them.
- Choice: reads accept any path, but Rust returns bytes only if `%PDF-` appears within the first 1024 bytes. Writes are restricted to the session allowlist (opened files and "Save as" targets picked in a native dialog driven by Rust).
- Consequences: a compromised webview can read other PDFs on disk, nothing else; it cannot write anywhere it did not open.

## 2026-10-18 — Save as runs the dialog in Rust

- The save dialog is opened by the `save_document_as` command, so the webview never supplies a write path that has not been picked by the user. `dialog:allow-save`/`allow-open` are not granted to the webview.

## 2026-10-18 — CSP `connect-src`

- `'self'` is required on top of IPC: the engine fetches `pdfium.wasm` and fallback fonts from the app origin (`http://tauri.localhost`). IPC on Windows uses `http://ipc.localhost`; `ipc:` is kept for other platforms.
- Dev CSP adds `'unsafe-inline'` styles (Vite injects `<style>` during HMR) and the Vite websocket. Production keeps `style-src 'self'`: Svelte applies dynamic styles via CSSOM (`style.cssText`), which CSP does not block. To verify at runtime in M0.
