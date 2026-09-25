// Run with: npm test  (Node 18+, no dependencies)
const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.self = globalThis;
require('../data/kana.js');
require('../data/vocab.js');
require('../data/kanji.js');
require('../data/grammar.js');
require('../shared/settings.js');
require('../shared/engine.js');

const S = self.SukimaSettings;
const E = self.SukimaEngine;

// Deterministic PRNG (mulberry32) so failures reproduce.
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allOn() {
  const s = S.clone(S.DEFAULT_SETTINGS);
  for (const script of ['hiragana', 'katakana']) for (const g of Object.keys(s.courses.kana[script])) s.courses.kana[script][g] = true;
  for (const c of ['vocab', 'kanji', 'grammar']) for (const l of Object.keys(s.courses[c].levels)) s.courses[c].levels[l] = true;
  return s;
}

// ---------- data ----------

test('datasets: unique ids and required fields', () => {
  const data = E.getData();
  const ids = new Set();
  for (const [course, items] of Object.entries(data)) {
    assert.ok(items.length > 0, `${course} is empty`);
    for (const item of items) {
      assert.ok(!ids.has(item.id), `duplicate id ${item.id}`);
      ids.add(item.id);
      assert.equal(E.courseOfItemId(item.id), course, `${item.id} prefix`);
    }
  }
  for (const k of data.kana) assert.ok(k.kana && k.romaji.length, k.id);
  for (const v of data.vocab) {
    assert.ok(v.word && v.reading && v.meanings.every(Boolean), v.id);
    assert.ok(/^[ぁ-ゖー]+$/.test(v.reading), `${v.id} reading must be hiragana`);
    if (v.example) assert.equal(v.example.ja.split('＿').length, 2, `${v.id} example needs exactly one ＿`);
  }
  for (const k of data.kanji) {
    assert.equal([...k.kanji].length, 1, k.id);
    assert.ok(k.meanings.every(Boolean) && k.onyomi.length + k.kunyomi.length > 0, k.id);
    for (const on of k.onyomi) assert.ok(/^[ァ-ヶー]+$/.test(on), `${k.id} onyomi ${on}`);
    for (const kun of k.kunyomi) assert.ok(/^[ぁ-ゖ.\-]+$/.test(kun), `${k.id} kunyomi ${kun}`);
  }
  for (const g of data.grammar) {
    assert.equal(g.ja.split('＿').length, 2, `${g.id} needs exactly one ＿`);
    assert.ok(g.options.includes(g.answer), `${g.id} options must include answer`);
    assert.equal(new Set(g.options).size, g.options.length, `${g.id} duplicate options`);
  }
});

test('datasets: starter counts', () => {
  const d = E.getData();
  const count = (arr, level) => arr.filter((x) => x.level === level).length;
  assert.equal(d.kana.filter((k) => k.script === 'hiragana').length, 46 + 25 + 33);
  assert.equal(d.kana.filter((k) => k.group === 'extended').length, 20);
  assert.ok(count(d.vocab, 'N5') >= 75 && count(d.vocab, 'N4') >= 35 && count(d.vocab, 'N3') >= 25);
  assert.ok(count(d.vocab, 'N2') >= 20 && count(d.vocab, 'N1') >= 20);
  assert.ok(count(d.kanji, 'N5') >= 90 && count(d.kanji, 'N4') >= 60 && count(d.kanji, 'N3') >= 60);
  assert.ok(count(d.kanji, 'N2') >= 40 && count(d.kanji, 'N1') >= 30);
  assert.ok(d.grammar.length >= 40);
});

// ---------- text ----------

test('normalize: trim, lowercase, collapse spaces, strip trailing punctuation', () => {
  assert.equal(E.normalize('  To   See!! '), 'to see');
  assert.equal(E.normalize('ＳＨＩ。'), 'shi');
});

test('romajiToHiragana', () => {
  const cases = {
    konnichiha: 'こんにちは', kitte: 'きって', shinbun: 'しんぶん', kan: 'かん', "kan'i": 'かんい',
    tokyo: 'ときょ', gakkou: 'がっこう', matcha: 'まっちゃ', jisho: 'じしょ', zyuu: 'じゅう', mizu: 'みず', ha: 'は',
  };
  for (const [r, h] of Object.entries(cases)) assert.equal(E.romajiToHiragana(r), h, r);
});

test('kanaToRomaji: Hepburn, yoon, sokuon, long vowels, extended katakana', () => {
  const cases = {
    ゲツ: 'getsu', ガツ: 'gatsu', つき: 'tsuki', がっこう: 'gakkou', きょう: 'kyou', しゃしん: 'shashin',
    まっちゃ: 'matcha', コーヒー: 'koohii', ファ: 'fa', ティ: 'ti', ウィ: 'wi', ジェ: 'je', ヴァ: 'va', じゅう: 'juu',
    アルバイト: 'arubaito', を: 'o', しんぶん: 'shinbun',
  };
  for (const [kana, romaji] of Object.entries(cases)) assert.equal(E.kanaToRomaji(kana), romaji, kana);
});

test('answer reveals and notes include romaji', () => {
  const data = E.getData();
  const s = allOn();
  const rng = seeded(9);
  const cand = (id) => E.buildCandidates(s, data).find((c) => c.item.id === id);

  let q;
  do q = E.buildQuestion(cand('j_N5_月'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.equal(q.reveal, 'ゲツ (getsu), ガツ (gatsu), つき (tsuki)');
  assert.equal(q.note, 'month, moon · on: ゲツ (getsu), ガツ (gatsu) · kun: つき (tsuki)');

  do q = E.buildQuestion(cand('v_N5_水'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.equal(q.reveal, 'みず (mizu)');
  assert.equal(q.note, '水 (みず, mizu) — water');

  const particle = E.buildQuestion(cand('g_N5_1'), 'fill', data, rng);
  assert.equal(particle.reveal, 'は (wa)');
});

test('readingKeys strips okurigana markers and converts katakana', () => {
  assert.deepEqual(E.readingKeys(['ショク', 'た.べる']).sort(), ['しょく', 'た', 'たべる'].sort());
});

// ---------- settings helpers ----------

test('blocklist matching: subdomains, wildcard alias, case, junk', () => {
  const list = ['Example.com', '*.mycompany.com', 'https://mail.google.com/mail/u/0', ''];
  assert.deepEqual(S.normalizeBlocklist(list), ['example.com', 'mycompany.com', 'mail.google.com']);
  assert.ok(S.hostMatches('example.com', list));
  assert.ok(S.hostMatches('www.EXAMPLE.com', list));
  assert.ok(S.hostMatches('mycompany.com', list));
  assert.ok(S.hostMatches('a.b.mycompany.com', list));
  assert.ok(S.hostMatches('mail.google.com', list));
  assert.ok(!S.hostMatches('google.com', list));
  assert.ok(!S.hostMatches('notexample.com', list));
  assert.equal(S.normalizeBlockEntry('https://www.YouTube.com/watch?v=1'), 'youtube.com');});

test('quiet hours: same-day, cross-midnight, disabled', () => {
  const at = (day, hh, mm) => {
    // 2026-09-13 is a Sunday (day 0)
    const d = new Date(2026, 8, 13 + day, hh, mm);
    assert.equal(d.getDay(), day);
    return d;
  };
  const work = { enabled: true, days: [1, 2, 3, 4, 5], start: '09:00', end: '17:30' };
  assert.ok(S.inQuietHours(work, at(1, 9, 0)));
  assert.ok(S.inQuietHours(work, at(1, 17, 29)));
  assert.ok(!S.inQuietHours(work, at(1, 17, 30)));
  assert.ok(!S.inQuietHours(work, at(0, 12, 0)));
  assert.ok(!S.inQuietHours({ ...work, enabled: false }, at(1, 10, 0)));

  const night = { enabled: true, days: [5], start: '22:00', end: '07:00' }; // Friday night
  assert.ok(S.inQuietHours(night, at(5, 23, 0)));
  assert.ok(S.inQuietHours(night, at(6, 6, 59)));
  assert.ok(!S.inQuietHours(night, at(6, 7, 0)));
  assert.ok(!S.inQuietHours(night, at(5, 6, 0)));
  assert.ok(!S.inQuietHours(night, at(6, 23, 0)));
});

test('sanitizeSettings merges defaults and clamps interval', () => {
  const s = S.sanitizeSettings({ intervalMin: 0, theme: 'neon', courses: { vocab: { levels: { N2: true } } }, junk: 1 });
  assert.equal(s.intervalMin, 1);
  assert.equal(s.theme, 'system');
  assert.equal(s.courses.vocab.levels.N2, true);
  assert.equal(s.courses.vocab.levels.N5, true);
  assert.equal(s.courses.kana.katakana.basic, true);
  assert.ok(!('junk' in s));
});

test('applyAnswer: heat rules, daily stats, recent', () => {
  const p = S.sanitizeProgress({});
  const now = new Date(2026, 8, 13, 10).getTime();
  S.applyAnswer(p, { itemId: 'x', correct: false, courseId: 'vocab' }, now);
  S.applyAnswer(p, { itemId: 'x', correct: false }, now);
  assert.equal(p.items.x.heat, 6);
  S.applyAnswer(p, { itemId: 'x', correct: true }, now);
  assert.deepEqual({ ...p.items.x, lastSeen: 0 }, { heat: 5, hits: 1, misses: 2, lastSeen: 0, courseId: 'vocab' });
  assert.deepEqual(p.days['2026-09-13'], { answered: 3, correct: 1 });
  assert.deepEqual(p.recent, ['x']);
  const q = S.sanitizeProgress({ items: { y: { heat: 0, hits: 0, misses: 0 } } });
  S.applyAnswer(q, { itemId: 'y', correct: true }, now);
  assert.equal(q.items.y.heat, 0);
});

// ---------- pool + picking ----------

test('buildCandidates honours course, group, level and type toggles', () => {
  const s = S.clone(S.DEFAULT_SETTINGS);
  s.courses.vocab.enabled = false;
  s.courses.kanji.enabled = false;
  s.courses.grammar.enabled = false;
  s.courses.kana.hiragana = { basic: false, dakuten: false, yoon: false };
  s.courses.kana.katakana = { basic: true, dakuten: false, yoon: false, extended: false };
  const cands = E.buildCandidates(s);
  assert.equal(cands.length, 46);
  assert.ok(cands.every((c) => c.item.script === 'katakana' && c.item.group === 'basic'));

  s.types = { mc: false, type: false, kana: false, fill: true };
  assert.equal(E.buildCandidates(s).length, 0, 'fill does not support kana');

  const g = S.clone(S.DEFAULT_SETTINGS);
  g.types = { mc: false, type: false, kana: false, fill: true };
  const fill = E.buildCandidates(g);
  assert.ok(fill.every((c) => c.courseId === 'grammar' || (c.courseId === 'vocab' && c.item.example)));
});

test('weightedPick favours hot items', () => {
  const cands = [{ item: { id: 'a' } }, { item: { id: 'b' } }];
  const progress = { items: { b: { heat: 9 } } }; // weight 19 vs 1
  const rng = seeded(1);
  let b = 0;
  for (let i = 0; i < 2000; i++) if (E.weightedPick(cands, progress, rng).item.id === 'b') b++;
  assert.ok(b / 2000 > 0.9, `b picked ${b}/2000`);
});

test('nextQuestion avoids the last 5 items when pool > 10', () => {
  const s = S.clone(S.DEFAULT_SETTINGS);
  const rng = seeded(7);
  const cands = E.buildCandidates(s);
  const recent = cands.slice(0, 5).map((c) => c.item.id);
  for (let i = 0; i < 300; i++) {
    const q = E.nextQuestion(s, { items: {}, recent }, rng);
    assert.ok(!recent.includes(q.itemId));
  }
});

test('every enabled item x type builds a valid, self-consistent question', () => {
  const s = allOn();
  const data = E.getData();
  const rng = seeded(42);
  let built = 0;
  for (const cand of E.buildCandidates(s, data)) {
    for (const typeId of cand.typeIds) {
      for (let rep = 0; rep < 3; rep++) {
        const q = E.buildQuestion(cand, typeId, data, rng);
        assert.ok(q, `no question for ${cand.item.id} / ${typeId}`);
        built++;
        if (q.input === 'match') {
          const where = `${q.itemId} match`;
          assert.equal(q.pairs.length, 4, `${where} needs 4 pairs`);
          assert.equal(new Set(q.pairs.map((p) => p.left)).size, 4, `${where} duplicate left ${q.pairs.map((p) => p.left)}`);
          assert.equal(new Set(q.pairs.map((p) => E.normalize(p.right))).size, 4, `${where} duplicate right ${q.pairs.map((p) => p.right)}`);
          assert.deepEqual([...q.rightOrder].sort(), [0, 1, 2, 3], `${where} rightOrder`);
          assert.ok(q.itemIds.includes(q.itemId), `${where} includes its own item`);
          q.pairs.forEach((p, i) => q.pairs.forEach((o, j) => assert.equal(E.checkPair(q, i, o.right), i === j, `${where} pair ${i}/${j}`)));
          continue;
        }
        assert.ok(q.prompt && q.reveal && q.answers.length, `${q.itemId} ${typeId} fields`);
        if (q.input === 'choice') {
          assert.ok(q.options.length >= 2 && q.options.length <= 4, `${q.itemId} option count`);
          assert.equal(new Set(q.options).size, q.options.length, `${q.itemId} duplicate options ${q.options}`);
          const right = q.options.filter((o) => E.check(q, o));
          assert.equal(right.length, 1, `${q.itemId} ${typeId} must have exactly one correct option: ${q.options}`);
        } else {
          assert.equal(q.input, 'text');
          for (const a of q.answers) assert.ok(E.check(q, a), `${q.itemId} accepts its own answer ${a}`);
          assert.ok(!E.check(q, ''), 'empty answer rejected');
        }
      }
    }
  }
  assert.ok(built > 1000, `built ${built}`);
});

test('match pairs: companions come from enabled items only', () => {
  const s = S.clone(S.DEFAULT_SETTINGS);
  s.courses.vocab.enabled = false;
  s.courses.kanji.enabled = false;
  s.courses.grammar.enabled = false;
  s.courses.kana.hiragana = { basic: false, dakuten: false, yoon: false };
  s.courses.kana.katakana = { basic: true, dakuten: false, yoon: false, extended: false };
  s.types = { mc: false, type: false, kana: false, fill: false, match: true };
  const rng = seeded(11);
  for (let i = 0; i < 50; i++) {
    const q = E.nextQuestion(s, { items: {}, recent: [] }, rng);
    assert.equal(q.typeId, 'match');
    assert.ok(q.itemIds.every((id) => id.startsWith('k_basic_')), q.itemIds.join());
  }
});

test('typed answers: alternatives, romaji input, katakana readings', () => {
  const data = E.getData();
  const s = allOn();
  const rng = seeded(3);
  const cand = (id) => E.buildCandidates(s, data).find((c) => c.item.id === id);

  const shi = E.buildQuestion(cand('h_basic_し'), 'type', data, rng);
  assert.ok(E.check(shi, 'shi') && E.check(shi, ' SI ') && !E.check(shi, 'chi'));

  let q;
  do q = E.buildQuestion(cand('v_N5_見る'), 'type', data, rng);
  while (q.answerKind !== 'latin');
  assert.ok(E.check(q, 'to watch') && E.check(q, 'see') && E.check(q, 'To Look.'));

  do q = E.buildQuestion(cand('v_N5_学校'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.ok(E.check(q, 'がっこう') && E.check(q, 'gakkou') && E.check(q, 'ガッコウ') && !E.check(q, 'gakou'));
  assert.ok(E.check(q, 'gakkō') && E.check(q, 'GAKKÔ') && !E.check(q, 'gakō'), 'macrons');

  do q = E.buildQuestion(cand('v_N5_大きい'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.ok(E.check(q, 'ōkii') && E.check(q, 'ookii'), 'ō as おお');

  do q = E.buildQuestion(cand('j_N5_後'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.ok(E.check(q, 'kō') && E.check(q, 'kou') && !E.check(q, 'ko'), 'ō as おう');

  do q = E.buildQuestion(cand('j_N5_水'), 'type', data, rng);
  while (q.answerKind !== 'kana');
  assert.ok(E.check(q, 'すい') && E.check(q, 'スイ') && E.check(q, 'mizu') && !E.check(q, 'ひ'));

  const particle = E.buildQuestion(cand('g_N5_1'), 'type', data, rng);
  assert.ok(E.check(particle, 'は') && E.check(particle, 'ha') && E.check(particle, 'wa') && !E.check(particle, 'ga'));
});

test('categories: every tag is known and every used group can form a trio', () => {
  const d = E.getData();
  for (const course of ['vocab', 'kanji']) {
    const counts = {};
    for (const item of d[course]) {
      if (item.cat === undefined) continue;
      assert.ok(E.CATEGORY_LABELS[item.cat], `${item.id} unknown category ${item.cat}`);
      counts[item.cat] = (counts[item.cat] || 0) + 1;
    }
    assert.ok(Object.values(counts).filter((n) => n >= 3).length >= 2, `${course} needs 2+ groups of 3`);
  }
});

test('true or false: both verdicts occur and the claim matches the verdict', () => {
  const data = E.getData();
  const s = allOn();
  const rng = seeded(5);
  const byId = new Map(E.buildCandidates(s, data).map((c) => [c.item.id, c]));
  const seen = { true: 0, false: 0 };
  for (const id of ['v_N5_猫', 'j_N5_水', 'h_basic_し', 'k_basic_ア']) {
    const cand = byId.get(id);
    for (let i = 0; i < 40; i++) {
      const q = E.buildQuestion(cand, 'tf', data, rng);
      assert.deepEqual(q.options, ['True', 'False']);
      const truth = E.check(q, 'True');
      assert.equal(truth, !E.check(q, 'False'));
      seen[truth]++;
      const item = cand.item;
      const m = q.claim.match(/^means "(.*)"$/);
      if (m) assert.equal(item.meanings.includes(m[1]), truth, `${id}: ${q.claim}`);
      const r = q.claim.match(/^is "(.*)"$/);
      if (r) assert.equal(item.romaji.includes(r[1]), truth, `${id}: ${q.claim}`);
      const k = q.claim.match(/^is ([^"\s]+)$/);
      if (k) assert.equal(k[1] === item.kana, truth, `${id}: ${q.claim}`);
      if (!truth) assert.match(q.reveal, /^False: /);
    }
  }
  assert.ok(seen.true > 20 && seen.false > 20, JSON.stringify(seen));
});

test('odd one out: answer is the quizzed item, the other three share one group', () => {
  const data = E.getData();
  const s = allOn();
  const rng = seeded(9);
  const find = { vocab: (d) => data.vocab.find((o) => o.word === d), kanji: (d) => data.kanji.find((o) => o.kanji === d) };
  const rowOf = (kana) => E.kataToHira([...kana][0]);
  let checked = 0;
  for (const cand of E.buildCandidates(s, data)) {
    if (!cand.typeIds.includes('odd')) continue;
    const q = E.buildQuestion(cand, 'odd', data, rng);
    const odd = q.options.filter((o) => E.check(q, o));
    const others = q.options.filter((o) => !E.check(q, o));
    assert.equal(q.options.length, 4, `${cand.item.id} options`);
    assert.equal(others.length, 3);
    if (cand.courseId === 'kana') {
      assert.equal(odd[0], cand.item.kana);
      const same = data.kana.filter((o) => others.includes(o.kana) && o.script === cand.item.script);
      assert.equal(same.length, 3, `${cand.item.id} others must be same script: ${others}`);
    } else {
      assert.equal(odd[0], cand.courseId === 'vocab' ? cand.item.word : cand.item.kanji);
      const cats = new Set(others.map((o) => find[cand.courseId](o).cat));
      assert.equal(cats.size, 1, `${cand.item.id} others mixed: ${others}`);
      assert.ok(!cats.has(cand.item.cat), `${cand.item.id} intruder shares group: ${q.options}`);
    }
    checked++;
  }
  assert.ok(checked > 400, `checked ${checked}`);

  // Kana rows: か row trio + intruder from another row.
  const ka = E.buildCandidates(s, data).find((c) => c.item.id === 'h_basic_ま');
  const q = E.buildQuestion(ka, 'odd', data, rng);
  const rows = q.options.filter((o) => o !== 'ま').map(rowOf);
  assert.ok(!rows.some((r) => 'まみむめも'.includes(r)), `${q.options}`);
});

test('odd one out: untagged items are not eligible', () => {
  const s = allOn();
  s.types = { mc: false, type: false, kana: false, fill: false, match: false, tf: false, odd: true };
  const cands = E.buildCandidates(s);
  assert.ok(cands.every((c) => c.courseId === 'kana' || c.item.cat), 'untagged vocab/kanji leaked in');
  assert.ok(!cands.some((c) => c.courseId === 'grammar'));
});
