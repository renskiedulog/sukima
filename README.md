# Sukima — Japanese quiz breaks

Chrome extension (Manifest V3) that pops up short Japanese quizzes on a timer while you browse. See [SPEC.md](SPEC.md).

## Load it

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → pick this folder.
3. Tabs that were already open need a reload before quizzes can appear on them.

The toolbar popup has pause/resume, **Quiz now**, **Block this site**, and links to Settings and Stats.

## Develop

No build step. Everything is plain JS loaded by the manifest.

```
npm test          # engine, settings and dataset checks (Node 18+, no deps)
```

Modal without reloading the extension: serve the repo root over http (any static server) and open
`/tests/harness.html` — it stubs `chrome.*` and runs `content.js` on a page with hostile CSS.

`/tests/icons.html` renders the toolbar icons (lucide `languages` on the accent tile) as PNG data URLs.

## Data

`data/*.js` assign globals (`SUKIMA_KANA`, `SUKIMA_VOCAB`, `SUKIMA_KANJI`, `SUKIMA_GRAMMAR`) from compact
line-based tables. Kana, vocab and kanji ids are content-based, so entries can be reordered freely.
Grammar ids are positional per level: append only.

## Fonts

M PLUS Rounded 1c (text) and Mochiy Pop One (titles), both SIL Open Font License, bundled in `fonts/` so the
extension stays offline. They're subset to the characters Sukima uses, so **run `npm run fonts` after adding
new kanji or words to `data/*.js`** (needs `npm install` once, and internet the first time).

Icons: [Lucide](https://lucide.dev) (ISC).
