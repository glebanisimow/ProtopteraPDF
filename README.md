# ProtopteraPDF

Минималистичный локальный PDF-ридер для Windows 10/11: Tauri 2, Svelte 5 и EmbedPDF (PDFium в WASM). Без сети, телеметрии и аккаунтов.

Правила проекта описаны в `AGENTS.md`, решения с компромиссами — в `DECISIONS.md`.

## Требования

- Node.js 24, npm.
- Rust через rustup. Версию берёт из `rust-toolchain.toml`.
- MSVC Build Tools 2022 с компонентом «Desktop development with C++».
- WebView2 (в Windows 10/11 обычно уже установлен).

## Сборка

```sh
npm ci
npm run sync-design     # только после изменения дизайн-пака
npm run tauri dev       # разработка
npm run tauri build     # установщик NSIS: src-tauri/target/release/bundle/nsis/
```

Проверки:

```sh
npm run check           # svelte-check
npm test                # vitest
cd src-tauri && cargo test
```

## Дизайн-пак

Путь к паку лежит в `design.config.json` в поле `designPackPath`. Файл машинный и в git не попадает. Источник истины — пак: `tokens.json` (W3C DTCG), `icons/*.svg`, PNG бренда.

`npm run sync-design` перегенерирует `src/design/`: `tokens.css`, `icons.ts`, `icons/`, `brand/`. Сборка зависит только от `src/design/`. Чтобы подтянуть обновления пака, перезапусти скрипт и закоммить изменения.

## Обновление движка EmbedPDF / PDFium

Раз в месяц и при каждом security-релизе EmbedPDF или PDFium:

1. `npm view @embedpdf/core time --json`. Выбери стабильную версию не моложе 14 дней.
2. Обнови все `@embedpdf/*` до одной и той же точной версии (`npm i -E ...`).
3. Проверь, что дефолты движка не ходят в CDN: `grep -r "cdn.jsdelivr" dist/` допустим только внутри мёртвых дефолтов. В рантайме DevTools → Network не должен показывать внешних запросов.
4. Перед релизом запусти `npm audit` и `cargo audit`.
5. Прогони приёмочные тесты из AGENTS.md §9.
