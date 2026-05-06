# AI Context

## Architecture
- `manifest.json`: MV3 manifest. Loads `config.js` + `content.js` on chat.openai.com/chatgpt.com.
- `config.js`: shared defaults and shortcut matcher used by options/content scripts.
- `content.js`: core runtime behavior (UI injection, navigation, delete flow, auto-scroll, snippets).
- `options.html` + `options.js`: settings UI and persistence via `chrome.storage.sync`.
- `background.js`: opens options page from runtime messages.

## Refactoring Notes
- Numeric settings handling in `options.js` is table-driven with `NUMERIC_INPUT_DEFS`.
- Each definition owns:
  - DOM input id
  - payload key
  - clamp bounds
  - read/write conversion (e.g., sec↔ms, min↔ms)
- This avoids duplicated per-field logic and reduces maintenance cost.

## Invariants
- Storage payload keys should remain aligned with `DEFAULTS` in `config.js`.
- Checkbox keys are inferred as `DEFAULTS - NUMERIC_SETTING_KEYS - TEXT_SETTING_KEYS`.
- Text fields fallback to defaults when empty.

## Safe Extension Strategy
1. Add default key in `config.js`.
2. If numeric: append to `NUMERIC_INPUT_DEFS` in `options.js` and add UI control in `options.html`.
3. If text: add key to `TEXT_SETTING_KEYS` in `config.js` and matching input in `options.html`.
4. Wire behavior in `content.js` guarded by feature flag.
