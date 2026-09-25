// Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.self = globalThis;
require('../shared/settings.js');
require('../shared/engine.js');
require('../shared/share-card.js');

const S = self.SukimaSettings;
const Share = self.SukimaShare;

function progressWith(days, items = {}) {
  return { ...S.clone(S.DEFAULT_PROGRESS), days, items };
}

test('streaks: current survives an empty today, longest spans gaps', () => {
  const days = { '2026-09-20': { answered: 2, correct: 1 }, '2026-09-22': { answered: 1, correct: 1 }, '2026-09-23': { answered: 3, correct: 3 } };
  assert.equal(S.currentStreak(days, new Date(2026, 8, 24)), 2);
  assert.equal(S.currentStreak(days, new Date(2026, 8, 25)), 0);
  assert.equal(S.longestStreak(days), 2);
});

test('summarizeMonth: month totals, same-span delta, calendar shape', () => {
  const s = Share.summarizeMonth(
    progressWith({
      '2026-08-02': { answered: 10, correct: 5 },
      '2026-08-20': { answered: 99, correct: 99 }, // after the same span, ignored
      '2026-09-01': { answered: 4, correct: 3 },
      '2026-09-03': { answered: 11, correct: 9 },
      '2026-10-01': { answered: 50, correct: 50 }, // future, ignored
    }),
    new Date(2026, 8, 3, 15)
  );
  assert.equal(s.monthLabel, 'September 2026');
  assert.equal(s.throughLabel, 'Sep 1 – Sep 3');
  assert.equal(s.answered, 15);
  assert.equal(s.correct, 12);
  assert.equal(s.accuracy, 80);
  assert.equal(s.prevAnswered, 10);
  assert.equal(s.deltaPct, 50);
  assert.equal(s.activeDays, 2);
  assert.deepEqual(s.series, [4, 0, 11]);
  assert.equal(s.daysInMonth, 30);
  assert.equal(s.firstWeekday, 1); // 2026-09-01 is a Tuesday
});

test('summarizeMonth: previous span clamps to the shorter month; no history gives null delta', () => {
  const s = Share.summarizeMonth(progressWith({ '2026-02-28': { answered: 6, correct: 6 } }), new Date(2026, 2, 31));
  assert.equal(s.prevAnswered, 6);
  assert.equal(Share.summarizeMonth(progressWith({}), new Date(2026, 2, 31)).deltaPct, null);
});

test('summarizeMonth: all-time course accuracy and toughest item', () => {
  const items = {
    v_a: { heat: 3, hits: 1, misses: 1 },
    v_b: { heat: 6, hits: 3, misses: 2 },
    h_a: { heat: 0, hits: 4, misses: 0 },
  };
  const s = Share.summarizeMonth(progressWith({}, items), new Date(2026, 8, 24), self.SukimaEngine.COURSES);
  const byLabel = Object.fromEntries(s.courses.map((c) => [c.label, c.pct]));
  assert.deepEqual(byLabel, { Kana: 100, Vocab: 57, Kanji: null, Grammar: null });
  assert.equal(s.toughestId, 'v_b');
});
