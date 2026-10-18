# Design TODO

Items the design pack does not cover yet. Placeholders render as `<MissingIcon>`.

## Icons

None missing: all 33 icons from AGENTS.md §6 are in `<pack>/icons/` (drawn 2026-10-18, owner-approved). Review them visually with the designer.

## Tokens (derived, approved, worth a designer pass)

- Light theme surfaces: `#E4E0D4` canvas, `#FAF8F2` surface, `#D6D1C3` border, `#5E5A50` muted text.
- `--color-accent-text` in light: `#9A5B00` (amber darkened for AA contrast on bone).
- State colors: danger `#FF6B5A` / `#B42318`, success `#7FB069` / `#2F7D32`; warning reuses amber.
- Page overlays: amber at 18–80 % alpha for selection, search hits and form fields; redaction marks are ink 55 % with a danger outline.
- `--color-paper` `#FFFFFF`: page placeholder while rendering.

## Fonts

The pack has no font files. UI uses Segoe UI Variable and Bahnschrift from Windows. If the brand gets its own typeface, put it in `<pack>/fonts/` and re-run `npm run sync-design`.
