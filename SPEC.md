# Sukima — Japanese quiz breaks (Chrome extension)

Short Japanese quizzes that pop up on a timer while you browse, so doomscrolling time turns into study time. Name comes from 隙間時間 (sukima jikan, "gap time"). Rename freely.

## 1. Product decisions (locked)

| Area | Decision |
|---|---|
| Trigger | Time-based. Interval is user-set in settings (default 15 min, min 1 min). |
| Dismissal | Always dismissable: ✕ button and Esc. Dismissing counts as "shown" and resets the timer. |
| Questions per popup | One. After answering, show the result (correct answer + short note). User clicks **Next** for another question or **Close**. |
| Wrong answers | Just show the correct answer. No forced retype. |
| Quiz types | Multiple choice, type the answer, kana ↔ romaji (both directions), fill in the blank, true or false, odd one out. Architecture must allow adding types later. |
| Courses | Hiragana & katakana; JLPT vocab N5–N1; Kanji (meaning + readings); Grammar & particles. All bundled offline. |
| Kana sub-groups | Toggle per script: basic, dakuten/handakuten (が ぱ…), yōon (きゃ しょ…), extended katakana (ファ ヴ…). E.g. katakana basic only, no dakuten. |
| Question picking | Random, weighted toward recently missed items. |
| Domain filtering | Blocklist only. Wildcards supported (`*.mycompany.com`). "Block this site" shortcut in toolbar popup. |
| Popup look | Centered modal, page dimmed behind it. |
| Dark mode | Follows system, with manual override (light / dark / system). |
| Quiet hours | Days of week + time range where quizzes never fire. |
| Stats | Stats & streaks page. |
| Data | Bundled offline JSON/JS datasets. No network calls. |
| Delivery | Manifest V3, loaded unpacked via `chrome://extensions`. Publishable later. |

## 2. Behaviour rules

### Timer
- Background service worker keeps `nextFireAt` (epoch ms) in `chrome.storage.local`.
- A `chrome.alarms` alarm ticks every 1 minute (MV3 minimum). On tick: if `now >= nextFireAt`, attempt to show a quiz.
- After a quiz is shown (answered *or* dismissed), set `nextFireAt = now + interval`.
- If a quiz could not be shown (see "suppression"), retry on the next tick — do **not** push `nextFireAt` forward.
- Pausing (toolbar toggle) stops ticks from doing anything. Resuming sets `nextFireAt = now + interval`.

### Suppression — do not show when
- The active tab's hostname matches the blocklist.
- Current time is inside quiet hours.
- Extension is paused.
- The tab is not focused / window not focused.
- The page is in fullscreen (video).
- An input, textarea, or contenteditable element is focused.
- A quiz modal is already open.
- Tab URL is not http/https (chrome://, extension pages, PDFs).

### Blocklist matching
- Entries are hostnames, case-insensitive. `example.com` matches `example.com` **and** all subdomains. `*.example.com` is accepted as an alias and behaves the same. Exact-only match is not needed for v1.

### Quiet hours
- Config: `{ enabled, days: [0..6], start: "09:00", end: "17:30" }`. Ranges may cross midnight (`22:00` → `07:00`).

## 3. Quiz types

Each type is a module implementing:

```ts
interface QuizType {
  id: string;                       // "mc" | "type" | "kana" | "fill"
  label: string;
  supports(course: CourseId): boolean;
  build(item: Item, pool: Item[], rng): Question;
  check(question: Question, answer: string): boolean;
}
interface Question {
  typeId, courseId, itemId,
  prompt: string;            // main text shown large
  promptSub?: string;        // smaller helper (e.g. "meaning?" / English sentence)
  options?: string[];        // for choice-based types
  answers: string[];         // accepted normalized answers
  reveal: string;            // what to show as "correct answer"
  note?: string;             // one line extra info after answering
}
```

Type × course matrix:

| | Kana | Vocab | Kanji | Grammar |
|---|---|---|---|---|
| Multiple choice | kana → romaji, romaji → kana | word → meaning, meaning → word, word → reading | kanji → meaning, kanji → reading, meaning → kanji | — |
| Type the answer | kana → romaji | word → reading (hiragana), word → meaning (English) | kanji → meaning, kanji → reading | particle to type |
| Kana ↔ romaji | both directions (MC when answer is kana, typed when answer is romaji) | — | — | — |
| Fill in the blank | — | example sentence with word blanked (MC) | — | sentence with particle/grammar point blanked (MC) |
| True or false | kana → romaji, romaji → kana | word → meaning, word → reading | kanji → meaning, kanji → reading | — (some distractor particles are still valid Japanese) |
| Odd one out | 3 kana from one row + 1 from another row, same script | 3 words sharing a `cat` + the quizzed word (tagged items only) | 3 kanji sharing a `cat` + the quizzed kanji (tagged items only) | — |

Answer normalization for typed answers: trim, lowercase, collapse spaces, strip trailing punctuation. Accept any listed alternative (`shi|si`, `to see|to watch`). Romaji answers accept Hepburn and Kunrei variants listed in the data.

True or false: the claim is true half the time; a false claim uses a distractor value (same rules as MC). Options are always `True`, `False`.

Odd one out: the quizzed item is always the intruder. The other three share a group (kana row, or `cat` tag) that differs from the item's, taken from enabled items first, then the whole course. Categories are listed in `CATEGORY_LABELS` (`shared/engine.js`); each item has at most one, and ambiguous items (魚: animal or food?) stay untagged. Vocab verbs and adjectives are tagged by word class, so upper levels without topic nouns still get this type.

Distractors for MC: pick 3 other items from the same course (and same level/group when possible); never duplicate the correct answer's display string.

## 4. Question selection (miss-weighted random)

Per item, store `heat` (number, default 0).

- On miss: `heat += 3`
- On hit: `heat = max(0, heat - 1)`
- Pick weight: `1 + heat * 2`
- Selection: build the eligible pool (enabled courses/groups/types), pick with weighted random. Avoid repeating the last 5 item ids if the pool is larger than 10.

Eligible pool = every item in an enabled course whose group/level toggle is on, crossed with every enabled quiz type that supports that course.

## 5. Settings (`chrome.storage.local`, key `settings`)

```json
{
  "intervalMin": 15,
  "paused": false,
  "theme": "system",
  "blocklist": ["mycompany.com", "mail.google.com"],
  "quietHours": { "enabled": false, "days": [1,2,3,4,5], "start": "09:00", "end": "17:30" },
  "types": { "mc": true, "type": true, "kana": true, "fill": true, "tf": true, "odd": true },
  "courses": {
    "kana": {
      "enabled": true,
      "hiragana": { "basic": true, "dakuten": true, "yoon": false },
      "katakana": { "basic": true, "dakuten": false, "yoon": false, "extended": false }
    },
    "vocab": { "enabled": true, "levels": { "N5": true, "N4": false, "N3": false, "N2": false, "N1": false } },
    "kanji": { "enabled": true, "levels": { "N5": true, "N4": false, "N3": false, "N2": false, "N1": false } },
    "grammar": { "enabled": true, "levels": { "N5": true, "N4": false, "N3": false } }
  }
}
```

Progress (`key: progress`):

```json
{
  "items": { "<itemId>": { "heat": 0, "hits": 4, "misses": 1, "lastSeen": 1757700000000 } },
  "days": { "2026-09-13": { "answered": 12, "correct": 9 } },
  "recent": ["v_N5_3", "h_basic_12"],
  "nextFireAt": 1757700900000
}
```

Progress and datasets are too large for `chrome.storage.sync`; keep everything local. (Optional later: sync only `settings`.)

## 6. Data formats

All datasets are plain JS files that assign a global, so content scripts can load them without ES modules.

**Kana** — `self.SUKIMA_KANA = [{ id, script: "hiragana"|"katakana", group: "basic"|"dakuten"|"yoon"|"extended", kana, romaji: ["shi","si"] }]`

**Vocab** — `self.SUKIMA_VOCAB = [{ id, word, reading, meanings: [], level: "N5", example?: { ja: "＿を飲みます。", en: "I drink water." }, cat?: "food" }]`
The `＿` marks where the word goes for fill-in-the-blank.

**Kanji** — `self.SUKIMA_KANJI = [{ id, kanji, meanings: [], onyomi: [], kunyomi: [], level, cat?: "number" }]`

**Grammar** — `self.SUKIMA_GRAMMAR = [{ id, level, ja: "私＿学生です。", en: "I am a student.", answer: "は", options: ["は","が","を","に"], note: "は marks the topic." }]`

Ship a starter set (full kana; ~75 N5 / ~35 N4 / ~25 N3 / ~20 N2 / ~20 N1 vocab; ~90 N5 / 60 N4 / 60 N3 / 40 N2 / 30 N1 kanji; ~40 grammar sentences) and grow it over time. Open sources for bulk expansion: JMdict (vocab), KANJIDIC2 (kanji), Tanos JLPT lists.

## 7. File structure

```
sukima/
├─ manifest.json
├─ background.js          # alarms, nextFireAt, suppression checks, messaging
├─ content.js             # injects modal (shadow DOM), runs one question, reports result
├─ content.css            # modal styles (inside shadow root, light/dark via CSS vars)
├─ popup.html / popup.js  # toolbar: pause/resume, quiz now, block this site, links
├─ options.html / .js     # settings page
├─ stats.html / .js       # stats & streaks
├─ shared/
│  ├─ settings.js         # defaults, load/save, blocklist + quiet-hours helpers
│  ├─ engine.js           # pool building, weighted pick, quiz type modules
│  └─ theme.css           # CSS variables for light/dark
├─ data/
│  ├─ kana.js
│  ├─ vocab.js
│  ├─ kanji.js
│  └─ grammar.js
└─ icons/ 16.png 48.png 128.png
```

### manifest.json (MV3)

```json
{
  "manifest_version": 3,
  "name": "Sukima — Japanese quiz breaks",
  "version": "1.0.0",
  "permissions": ["storage", "alarms", "tabs"],
  "host_permissions": ["http://*/*", "https://*/*"],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" },
  "options_page": "options.html",
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "js": ["data/kana.js", "data/vocab.js", "data/kanji.js", "data/grammar.js",
           "shared/settings.js", "shared/engine.js", "content.js"],
    "run_at": "document_idle"
  }]
}
```

### Messaging

| Message | From → To | Purpose |
|---|---|---|
| `{type:"SHOW_QUIZ"}` | background → active tab | Ask content script to open a quiz. Reply `{shown: true|false, reason}`. |
| `{type:"QUIZ_CLOSED"}` | content → background | Modal closed (answered or dismissed). Background sets `nextFireAt`. |
| `{type:"ANSWERED", itemId, correct, courseId}` | content → background | Update heat, hits/misses, daily stats. |
| `{type:"QUIZ_NOW"}` | popup → background | Force a quiz on the active tab. |
| `{type:"SET_PAUSED", paused}` | popup → background | Toggle pause. |

## 8. UI

### Modal (content script)
- Rendered in a shadow root attached to a `<div id="sukima-host">` so page CSS can't leak in or out. `position: fixed; inset: 0; z-index: 2147483647`.
- Backdrop: dimmed page (`rgba(0,0,0,.45)`), click outside = close.
- Card ~420px wide, centered. Layout top to bottom: course chip + ✕ · big prompt (kana/kanji/word rendered large, ~56px) · sub-prompt · answer area (4 option buttons **or** text input + Check) · result row (hidden until answered) · footer with **Next** / **Close**.
- Keyboard: 1–4 select options, Enter checks/next, Esc closes. Focus is trapped inside the card and restored on close.
- Result: correct → green tint + "Correct"; wrong → shows "Answer: …" plus note. No sound in v1.
- Font stack: `"Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", "Meiryo", system-ui, sans-serif`. No web font loading (offline).

### Options page
Sections: Timing (interval, quiet hours) · Sites (blocklist textarea, one per line) · Courses (accordion per course with group/level checkboxes) · Quiz types · Appearance (theme) · Data (reset progress, export/import progress JSON).

### Stats page
- Current streak (consecutive days with ≥1 answer) and longest streak.
- Today: answered / correct / accuracy.
- Last 30 days bar row (answered per day).
- Per-course accuracy.
- Weakest 10 items by heat, with hits/misses.

### Toolbar popup
Pause/resume toggle · "Quiz now" · "Block this site" (adds current hostname) · countdown to next quiz · links to Settings and Stats.

## 9. Build order (suggested)

1. `manifest.json`, data files, `shared/settings.js`.
2. `shared/engine.js`: pool + weighted pick + the four types. Unit-test in Node by stubbing `self`.
3. `content.js` + `content.css`: modal, manually triggered via `chrome.runtime.sendMessage` from the console.
4. `background.js`: alarm loop, suppression, messaging.
5. `popup.html`, `options.html`, `stats.html`.
6. Polish: dark mode, keyboard handling, focus trap, edge cases (SPA navigation, multiple windows).

## 10. Out of scope for v1 (later ideas)
Audio/TTS · SRS scheduler (SM-2) · scroll-based trigger · allowlist mode · syncing progress · importing custom word lists · Firefox port (mostly `browser.*` + MV3 differences).
