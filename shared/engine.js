// Quiz engine: text normalization, quiz type modules, pool building and miss-weighted picking.
(function (root) {
  'use strict';

  const COURSES = {
    kana: { id: 'kana', label: 'Kana', idPrefixes: ['h_', 'k_'] },
    vocab: { id: 'vocab', label: 'Vocab', idPrefixes: ['v_'] },
    kanji: { id: 'kanji', label: 'Kanji', idPrefixes: ['j_'] },
    grammar: { id: 'grammar', label: 'Grammar', idPrefixes: ['g_'] },
  };

  function getData() {
    return {
      kana: root.SUKIMA_KANA || [],
      vocab: root.SUKIMA_VOCAB || [],
      kanji: root.SUKIMA_KANJI || [],
      grammar: root.SUKIMA_GRAMMAR || [],
    };
  }

  function courseOfItemId(id) {
    for (const c of Object.values(COURSES)) if (c.idPrefixes.some((p) => String(id).startsWith(p))) return c.id;
    return null;
  }

  // ---------- random helpers ----------

  function randInt(n, rng) {
    return Math.min(n - 1, Math.floor(rng() * n));
  }

  function choice(arr, rng) {
    return arr[randInt(arr.length, rng)];
  }

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = randInt(i + 1, rng);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- text helpers ----------

  function normalize(s) {
    return String(s == null ? '' : s)
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[\s.,!?;:。、！？…]+$/u, '');
  }

  function kataToHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

  function hiraToKata(s) {
    return String(s).replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
  }

  const ROMAJI = (() => {
    const t = {};
    const rows = {
      '': 'あいうえお', k: 'かきくけこ', g: 'がぎぐげご', s: 'さしすせそ', z: 'ざじずぜぞ',
      t: 'たちつてと', d: 'だぢづでど', n: 'なにぬねの', h: 'はひふへほ', b: 'ばびぶべぼ',
      p: 'ぱぴぷぺぽ', m: 'まみむめも', r: 'らりるれろ',
    };
    const V = 'aiueo';
    for (const [c, kana] of Object.entries(rows)) for (let i = 0; i < 5; i++) t[c + V[i]] = kana[i];
    Object.assign(t, {
      ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', wi: 'うぃ', we: 'うぇ',
      shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', dzu: 'づ', "n'": 'ん',
      fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ',
      va: 'ゔぁ', vi: 'ゔぃ', vu: 'ゔ', ve: 'ゔぇ', vo: 'ゔぉ',
      she: 'しぇ', je: 'じぇ', che: 'ちぇ', thi: 'てぃ', dhi: 'でぃ', twu: 'とぅ', dwu: 'どぅ', tsa: 'つぁ',
      xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtsu: 'っ', xtu: 'っ',
      la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', ltsu: 'っ', ltu: 'っ',
      '-': 'ー',
    });
    const yoon = {
      ky: 'き', gy: 'ぎ', sy: 'し', sh: 'し', zy: 'じ', jy: 'じ', j: 'じ', ty: 'ち', cy: 'ち', ch: 'ち',
      dy: 'ぢ', ny: 'に', hy: 'ひ', by: 'び', py: 'ぴ', my: 'み', ry: 'り',
    };
    const small = { a: 'ゃ', u: 'ゅ', o: 'ょ' };
    for (const [c, k] of Object.entries(yoon)) for (const v of 'auo') t[c + v] = k + small[v];
    return t;
  })();

  // Minimal IME-style romaji -> hiragana, so readings can be typed without a Japanese keyboard.
  function romajiToHiragana(input) {
    const s = String(input).toLowerCase();
    let out = '';
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      const next = s[i + 1];
      if (c === 'n') {
        if (next === 'n') {
          out += 'ん';
          i += s[i + 2] && /[aiueoy]/.test(s[i + 2]) ? 1 : 2;
          continue;
        }
        if (next === undefined || !/[aiueoy']/.test(next)) {
          out += 'ん';
          i += 1;
          continue;
        }
      } else if ((next === c && /[bcdfghjkmpqrstvwxz]/.test(c)) || (c === 't' && next === 'c')) {
        out += 'っ';
        i += 1;
        continue;
      }
      let matched = false;
      for (let len = 4; len >= 1; len--) {
        const chunk = s.slice(i, i + len);
        if (chunk.length === len && ROMAJI[chunk]) {
          out += ROMAJI[chunk];
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        out += c;
        i += 1;
      }
    }
    return out;
  }

  function kanaKey(s) {
    return kataToHira(romajiToHiragana(normalize(s)));
  }

  // "to see (a movie)" -> ["to see (a movie)", "to see", "see (a movie)", "see"]
  function meaningVariants(meanings) {
    const out = new Set();
    for (const m of meanings) {
      const base = normalize(m);
      const noParen = normalize(base.replace(/\s*\([^)]*\)\s*/g, ' '));
      for (const v of [base, noParen]) {
        if (!v) continue;
        out.add(v);
        const stripped = v.replace(/^(to|a|an|the) /, '');
        if (stripped) out.add(stripped);
      }
    }
    return [...out];
  }

  // Kanji readings as stored: "た.べる", "-ば", "スイ". Accept full form and stem, in hiragana.
  function readingKeys(readings) {
    const out = new Set();
    for (const r of readings) {
      const clean = kataToHira(String(r).replace(/-/g, ''));
      out.add(normalize(clean.replace(/\./g, '')));
      if (clean.includes('.')) out.add(normalize(clean.split('.')[0]));
    }
    out.delete('');
    return [...out];
  }

  function readingDisplay(r) {
    return String(r).replace(/-/g, '').replace(/\./g, '');
  }

  // ---------- kana -> romaji (Hepburn, long vowels doubled: コーヒー -> koohii) ----------

  const KANA_ROMAJI = (() => {
    const t = {};
    const rows = {
      あいうえお: ['a', 'i', 'u', 'e', 'o'],
      かきくけこ: ['ka', 'ki', 'ku', 'ke', 'ko'],
      がぎぐげご: ['ga', 'gi', 'gu', 'ge', 'go'],
      さしすせそ: ['sa', 'shi', 'su', 'se', 'so'],
      ざじずぜぞ: ['za', 'ji', 'zu', 'ze', 'zo'],
      たちつてと: ['ta', 'chi', 'tsu', 'te', 'to'],
      だぢづでど: ['da', 'ji', 'zu', 'de', 'do'],
      なにぬねの: ['na', 'ni', 'nu', 'ne', 'no'],
      はひふへほ: ['ha', 'hi', 'fu', 'he', 'ho'],
      ばびぶべぼ: ['ba', 'bi', 'bu', 'be', 'bo'],
      ぱぴぷぺぽ: ['pa', 'pi', 'pu', 'pe', 'po'],
      まみむめも: ['ma', 'mi', 'mu', 'me', 'mo'],
      らりるれろ: ['ra', 'ri', 'ru', 're', 'ro'],
      ぁぃぅぇぉ: ['a', 'i', 'u', 'e', 'o'],
    };
    for (const [kana, romaji] of Object.entries(rows)) [...kana].forEach((k, i) => (t[k] = romaji[i]));
    Object.assign(t, { や: 'ya', ゆ: 'yu', よ: 'yo', わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'o', ん: 'n', ゔ: 'vu', ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa' });
    return t;
  })();

  const YOON_STEM = { き: 'ky', ぎ: 'gy', し: 'sh', じ: 'j', ち: 'ch', ぢ: 'j', に: 'ny', ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry' };
  const SMALL_YA = { ゃ: 'a', ゅ: 'u', ょ: 'o' };
  const SMALL_VOWEL = { ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o' };

  function kanaToRomaji(input) {
    const chars = [...kataToHira(String(input))];
    let out = '';
    let double = false;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      const next = chars[i + 1];
      if (c === 'っ') {
        double = true;
        continue;
      }
      if (c === 'ー') {
        const vowel = out.match(/[aeiou](?=[^aeiou]*$)/);
        if (vowel) out += vowel[0];
        continue;
      }
      const base = KANA_ROMAJI[c];
      if (!base) {
        out += c;
        double = false;
        continue;
      }
      let syl = base;
      if (SMALL_YA[next] && YOON_STEM[c]) {
        syl = YOON_STEM[c] + SMALL_YA[next];
        i += 1;
      } else if (SMALL_VOWEL[next] && !SMALL_VOWEL[c]) {
        // ファ fa, ティ ti, ウィ wi, ヴァ va, シェ she
        const stem = c === 'う' ? 'w' : c === 'ゔ' ? 'v' : base.slice(0, -1);
        syl = stem + SMALL_VOWEL[next];
        i += 1;
      }
      if (double) {
        syl = (syl.startsWith('ch') ? 't' : syl[0]) + syl;
        double = false;
      }
      out += syl;
    }
    return out;
  }

  // "ゲツ" -> "ゲツ (getsu)"; leaves text without kana untouched.
  function withRomaji(kana, sound = kana) {
    return /[ぁ-ゖァ-ヺー]/.test(kana) ? `${kana} (${kanaToRomaji(sound)})` : kana;
  }

  function overlap(a, b) {
    const set = new Set(a);
    return b.some((x) => set.has(x));
  }

  // ---------- checking ----------

  // Macron/circumflex romaji: ō can stand for おう (kō) or おお (ōkii), ē for えい or ええ.
  const MACRONS = {
    ā: ['aa'], ī: ['ii'], ū: ['uu'], ē: ['ei', 'ee'], ō: ['ou', 'oo'],
    â: ['aa'], î: ['ii'], û: ['uu'], ê: ['ei', 'ee'], ô: ['ou', 'oo'],
  };

  function macronVariants(s) {
    let out = [''];
    for (const ch of s) {
      const reps = MACRONS[ch] || [ch];
      out = out.flatMap((prefix) => reps.map((r) => prefix + r)).slice(0, 32);
    }
    return out;
  }

  function answerCheck(q, answer) {
    const a = normalize(answer);
    if (!a) return false;
    if (q.input === 'choice') return q.answers.includes(a);
    const keys = q.answerKind === 'kana' ? [a, kataToHira(a), ...macronVariants(a).map(kanaKey)] : [a];
    return q.answers.some((x) => keys.includes(x));
  }

  // ---------- question builders ----------

  function pickDistractors(item, pool, rng, { display, same, conflicts }, n = 3) {
    const seen = new Set([display(item)]);
    const out = [];
    const others = pool.filter((o) => o !== item);
    const tiers = [shuffle(others.filter((o) => same(o, item)), rng), shuffle(others.filter((o) => !same(o, item)), rng)];
    for (const tier of tiers) {
      for (const o of tier) {
        if (out.length >= n) return out;
        const d = display(o);
        if (!d || seen.has(d) || (conflicts && conflicts(item, o))) continue;
        seen.add(d);
        out.push(d);
      }
    }
    return out;
  }

  function choiceQuestion({ correct, distractors, rng, ...rest }) {
    if (!distractors || distractors.length < 1) return null;
    return {
      input: 'choice',
      options: shuffle([correct, ...distractors], rng),
      answers: [normalize(correct)],
      reveal: correct,
      ...rest,
    };
  }

  function textQuestion({ answers, answerKind, ...rest }) {
    return {
      input: 'text',
      answerKind,
      answers: [...new Set(answers.map((a) => (answerKind === 'kana' ? kataToHira(normalize(a)) : normalize(a))))],
      ...rest,
    };
  }

  // --- kana ---
  const sameKanaGroup = (o, item) => o.script === item.script && o.group === item.group;
  const kanaConflict = (a, b) => overlap(a.romaji.map(normalize), b.romaji.map(normalize));
  const kanaNote = (item) => (item.romaji.length > 1 ? `Also written: ${item.romaji.slice(1).join(', ')}` : '');

  const KANA = {
    toRomajiChoice(item, pool, rng) {
      return choiceQuestion({
        rng,
        prompt: item.kana,
        promptKind: 'ja',
        promptSub: 'romaji?',
        optionKind: 'latin',
        correct: item.romaji[0],
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.romaji[0], same: sameKanaGroup, conflicts: kanaConflict }),
        reveal: `${item.kana} = ${item.romaji.join(' / ')}`,
        note: kanaNote(item),
      });
    },
    toKanaChoice(item, pool, rng) {
      const sameScript = pool.filter((o) => o.script === item.script);
      return choiceQuestion({
        rng,
        prompt: item.romaji[0],
        promptKind: 'latin',
        promptSub: `which ${item.script}?`,
        optionKind: 'ja',
        correct: item.kana,
        distractors: pickDistractors(item, sameScript, rng, { display: (o) => o.kana, same: sameKanaGroup, conflicts: kanaConflict }),
        reveal: `${item.romaji[0]} = ${item.kana}`,
        note: kanaNote(item),
      });
    },
    toRomajiText(item) {
      return textQuestion({
        prompt: item.kana,
        promptKind: 'ja',
        promptSub: 'type the romaji',
        placeholder: 'romaji',
        answerKind: 'latin',
        answers: item.romaji,
        reveal: `${item.kana} = ${item.romaji.join(' / ')}`,
        note: '',
      });
    },
  };

  // --- vocab ---
  const sameLevel = (o, item) => o.level === item.level;
  const vocabNote = (item) =>
    `${item.word} (${item.word !== item.reading ? `${item.reading}, ` : ''}${kanaToRomaji(item.reading)}) — ${item.meanings.join(', ')}`;
  const meaningConflict = (a, b) => overlap(a.meanings.map(normalize), b.meanings.map(normalize));
  const hasKanji = (item) => item.word !== item.reading;

  const VOCAB = {
    wordToMeaningChoice(item, pool, rng) {
      return choiceQuestion({
        rng,
        prompt: item.word,
        promptKind: 'ja',
        promptSub: 'meaning?',
        optionKind: 'latin',
        correct: item.meanings[0],
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.meanings[0], same: sameLevel, conflicts: meaningConflict }),
        note: vocabNote(item),
      });
    },
    meaningToWordChoice(item, pool, rng) {
      return choiceQuestion({
        rng,
        prompt: item.meanings.join('; '),
        promptKind: 'latin',
        promptSub: 'which word?',
        optionKind: 'ja',
        correct: item.word,
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.word, same: sameLevel, conflicts: meaningConflict }),
        note: vocabNote(item),
      });
    },
    wordToReadingChoice(item, pool, rng) {
      if (!hasKanji(item)) return null;
      return choiceQuestion({
        rng,
        prompt: item.word,
        promptKind: 'ja',
        promptSub: 'reading?',
        optionKind: 'ja',
        correct: item.reading,
        distractors: pickDistractors(item, pool, rng, {
          display: (o) => o.reading,
          same: sameLevel,
          conflicts: (a, b) => kataToHira(a.reading) === kataToHira(b.reading),
        }),
        reveal: withRomaji(item.reading),
        note: vocabNote(item),
      });
    },
    wordToReadingText(item) {
      if (!hasKanji(item)) return null;
      return textQuestion({
        prompt: item.word,
        promptKind: 'ja',
        promptSub: 'type the reading (kana or romaji)',
        placeholder: 'reading',
        answerKind: 'kana',
        answers: [item.reading],
        reveal: withRomaji(item.reading),
        note: vocabNote(item),
      });
    },
    wordToMeaningText(item) {
      return textQuestion({
        prompt: item.word,
        promptKind: 'ja',
        promptSub: 'type the meaning (English)',
        placeholder: 'meaning',
        answerKind: 'latin',
        answers: meaningVariants(item.meanings),
        reveal: item.meanings.join(' / '),
        note: vocabNote(item),
      });
    },
    fillChoice(item, pool, rng) {
      if (!item.example) return null;
      return choiceQuestion({
        rng,
        prompt: item.example.ja,
        promptKind: 'sentence',
        promptSub: item.example.en,
        optionKind: 'ja',
        correct: item.word,
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.word, same: sameLevel, conflicts: (a, b) => a.word === b.word }),
        reveal: item.word,
        note: `${item.example.ja.replace('＿', item.word)} — ${vocabNote(item)}`,
      });
    },
  };

  // --- kanji ---
  const allReadings = (k) => [...k.onyomi, ...k.kunyomi];
  const kanjiNote = (k) =>
    [
      k.meanings.join(', '),
      k.onyomi.length ? `on: ${k.onyomi.map((r) => withRomaji(r)).join(', ')}` : '',
      k.kunyomi.length ? `kun: ${k.kunyomi.map((r) => withRomaji(readingDisplay(r))).join(', ')}` : '',
    ]
      .filter(Boolean)
      .join(' · ');

  const KANJI = {
    kanjiToMeaningChoice(item, pool, rng) {
      return choiceQuestion({
        rng,
        prompt: item.kanji,
        promptKind: 'ja',
        promptSub: 'meaning?',
        optionKind: 'latin',
        correct: item.meanings[0],
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.meanings[0], same: sameLevel, conflicts: meaningConflict }),
        note: kanjiNote(item),
      });
    },
    kanjiToReadingChoice(item, pool, rng) {
      const readings = allReadings(item);
      if (!readings.length) return null;
      const correct = readingDisplay(choice(readings, rng));
      const mine = readingKeys(readings);
      return choiceQuestion({
        rng,
        prompt: item.kanji,
        promptKind: 'ja',
        promptSub: 'which is a reading?',
        optionKind: 'ja',
        correct,
        distractors: pickDistractors(item, pool.filter((o) => allReadings(o).length), rng, {
          display: (o) => (o === item ? correct : readingDisplay(allReadings(o)[0])),
          same: sameLevel,
          conflicts: (a, b) => mine.includes(kataToHira(readingDisplay(allReadings(b)[0]))),
        }),
        reveal: withRomaji(correct),
        note: kanjiNote(item),
      });
    },
    meaningToKanjiChoice(item, pool, rng) {
      return choiceQuestion({
        rng,
        prompt: item.meanings.join('; '),
        promptKind: 'latin',
        promptSub: 'which kanji?',
        optionKind: 'ja-big',
        correct: item.kanji,
        distractors: pickDistractors(item, pool, rng, { display: (o) => o.kanji, same: sameLevel, conflicts: meaningConflict }),
        note: kanjiNote(item),
      });
    },
    kanjiToMeaningText(item) {
      return textQuestion({
        prompt: item.kanji,
        promptKind: 'ja',
        promptSub: 'type a meaning (English)',
        placeholder: 'meaning',
        answerKind: 'latin',
        answers: meaningVariants(item.meanings),
        reveal: item.meanings.join(' / '),
        note: kanjiNote(item),
      });
    },
    kanjiToReadingText(item) {
      const readings = allReadings(item);
      if (!readings.length) return null;
      return textQuestion({
        prompt: item.kanji,
        promptKind: 'ja',
        promptSub: 'type a reading (on or kun, kana or romaji)',
        placeholder: 'reading',
        answerKind: 'kana',
        answers: readingKeys(readings),
        reveal: readings.map((r) => withRomaji(readingDisplay(r))).join(', '),
        note: kanjiNote(item),
      });
    },
  };

  // --- grammar ---
  // Particles pronounced differently from their kana, so "wa" / "e" / "o" also count.
  const PARTICLE_SOUNDS = { は: 'わ', へ: 'え', を: 'お' };

  const GRAMMAR = {
    particleText(item) {
      return textQuestion({
        prompt: item.ja,
        promptKind: 'sentence',
        promptSub: item.en,
        placeholder: 'fill the blank (kana or romaji)',
        answerKind: 'kana',
        answers: PARTICLE_SOUNDS[item.answer] ? [item.answer, PARTICLE_SOUNDS[item.answer]] : [item.answer],
        reveal: withRomaji(item.answer, PARTICLE_SOUNDS[item.answer] || item.answer),
        note: item.note || '',
      });
    },
    fillChoice(item, pool, rng) {
      const options = [...new Set([item.answer, ...(item.options || [])])];
      return choiceQuestion({
        rng,
        prompt: item.ja,
        promptKind: 'sentence',
        promptSub: item.en,
        optionKind: 'ja',
        correct: item.answer,
        distractors: options.filter((o) => o !== item.answer).slice(0, 3),
        reveal: withRomaji(item.answer, PARTICLE_SOUNDS[item.answer] || item.answer),
        note: item.note || '',
      });
    },
  };

  // --- match pairs: 4 items, connect each left box to its right box ---

  // Picks `n` companions for `item`, trying each pool in turn (enabled items first, then the whole course).
  // Left and right labels stay unique and no two chosen items conflict, so every left box has exactly one match.
  function pickCompanions(item, pools, rng, { left, right, same, conflicts }, n = 3) {
    const chosen = [item];
    const lefts = new Set([left(item)]);
    const rights = new Set([normalize(right(item))]);
    for (const pool of pools) {
      const others = pool.filter((o) => !chosen.includes(o));
      const tiers = [shuffle(others.filter((o) => same(o, item)), rng), shuffle(others.filter((o) => !same(o, item)), rng)];
      for (const tier of tiers) {
        for (const o of tier) {
          if (chosen.length > n) return chosen;
          const l = left(o);
          const r = normalize(right(o));
          if (!l || !r || lefts.has(l) || rights.has(r)) continue;
          if (conflicts && chosen.some((c) => conflicts(c, o))) continue;
          chosen.push(o);
          lefts.add(l);
          rights.add(r);
        }
      }
      if (chosen.length > n) return chosen;
    }
    return null;
  }

  function matchQuestion(item, pools, rng, spec) {
    const items = pickCompanions(item, pools, rng, spec);
    if (!items) return null;
    const pairs = shuffle(items, rng).map((o) => ({
      itemId: o.id,
      left: spec.left(o),
      right: spec.right(o),
      note: spec.note ? spec.note(o) : '',
    }));
    let rightOrder = shuffle(pairs.map((_, i) => i), rng);
    for (let tries = 0; tries < 3 && rightOrder.every((v, i) => v === i); tries++) rightOrder = shuffle(rightOrder, rng);
    return {
      input: 'match',
      prompt: 'Match the pairs',
      promptKind: 'latin',
      promptSub: spec.sub,
      leftKind: spec.leftKind,
      rightKind: spec.rightKind,
      pairs,
      rightOrder, // display order of right boxes, as indexes into pairs
      itemIds: pairs.map((p) => p.itemId),
      answers: pairs.map((p) => normalize(p.right)),
      reveal: '',
      note: pairs.map((p) => p.note).filter(Boolean).join(' · '),
    };
  }

  const MATCH = {
    kana: (item, pool, rng, eligible) =>
      matchQuestion(item, [eligible || pool, pool], rng, {
        left: (o) => o.kana,
        right: (o) => o.romaji[0],
        same: sameKanaGroup,
        conflicts: kanaConflict,
        sub: 'kana ↔ romaji',
        leftKind: 'ja',
        rightKind: 'latin',
      }),
    vocabMeaning: (item, pool, rng, eligible) =>
      matchQuestion(item, [eligible || pool, pool], rng, {
        left: (o) => o.word,
        right: (o) => o.meanings[0],
        same: sameLevel,
        conflicts: meaningConflict,
        note: (o) => `${o.word} (${kanaToRomaji(o.reading)})`,
        sub: 'word ↔ meaning',
        leftKind: 'ja',
        rightKind: 'latin',
      }),
    vocabReading(item, pool, rng, eligible) {
      if (!hasKanji(item)) return null;
      const withKanji = (list) => list.filter(hasKanji);
      return matchQuestion(item, [withKanji(eligible || pool), withKanji(pool)], rng, {
        left: (o) => o.word,
        right: (o) => o.reading,
        same: sameLevel,
        conflicts: (a, b) => a.word === b.word || kataToHira(a.reading) === kataToHira(b.reading),
        note: (o) => withRomaji(o.reading),
        sub: 'word ↔ reading',
        leftKind: 'ja',
        rightKind: 'ja',
      });
    },
    kanjiMeaning: (item, pool, rng, eligible) =>
      matchQuestion(item, [eligible || pool, pool], rng, {
        left: (o) => o.kanji,
        right: (o) => o.meanings[0],
        same: sameLevel,
        conflicts: meaningConflict,
        sub: 'kanji ↔ meaning',
        leftKind: 'ja',
        rightKind: 'latin',
      }),
  };

  // --- true or false: show one claim, right half the time ---

  function tfQuestion({ rng, claimTrue, claimFalse, correctFact, ...rest }) {
    const truth = !claimFalse || rng() < 0.5;
    if (!truth && !claimFalse) return null;
    return {
      input: 'choice',
      options: ['True', 'False'],
      optionKind: 'latin',
      claim: truth ? claimTrue : claimFalse,
      promptSub: 'true or false?',
      answers: [truth ? 'true' : 'false'],
      reveal: truth ? 'True' : `False: ${correctFact}`,
      ...rest,
    };
  }

  // One wrong value for the claim, or undefined when the pool has none.
  const falseValue = (item, pool, rng, spec) => pickDistractors(item, pool, rng, spec, 1)[0];

  const TF = {
    kanaToRomaji(item, pool, rng) {
      const wrong = falseValue(item, pool, rng, { display: (o) => o.romaji[0], same: sameKanaGroup, conflicts: kanaConflict });
      return tfQuestion({
        rng,
        prompt: item.kana,
        promptKind: 'ja',
        claimTrue: `is "${item.romaji[0]}"`,
        claimFalse: wrong && `is "${wrong}"`,
        correctFact: `${item.kana} = ${item.romaji[0]}`,
        note: kanaNote(item),
      });
    },
    romajiToKana(item, pool, rng) {
      const sameScript = pool.filter((o) => o.script === item.script);
      const wrong = falseValue(item, sameScript, rng, { display: (o) => o.kana, same: sameKanaGroup, conflicts: kanaConflict });
      return tfQuestion({
        rng,
        prompt: item.romaji[0],
        promptKind: 'latin',
        claimTrue: `is ${item.kana}`,
        claimFalse: wrong && `is ${wrong}`,
        correctFact: `${item.romaji[0]} = ${item.kana}`,
        note: kanaNote(item),
      });
    },
    vocabMeaning(item, pool, rng) {
      const wrong = falseValue(item, pool, rng, { display: (o) => o.meanings[0], same: sameLevel, conflicts: meaningConflict });
      return tfQuestion({
        rng,
        prompt: item.word,
        promptKind: 'ja',
        claimTrue: `means "${item.meanings[0]}"`,
        claimFalse: wrong && `means "${wrong}"`,
        correctFact: `${item.word} = ${item.meanings.join(', ')}`,
        note: vocabNote(item),
      });
    },
    vocabReading(item, pool, rng) {
      if (!hasKanji(item)) return null;
      const wrong = falseValue(item, pool, rng, {
        display: (o) => o.reading,
        same: sameLevel,
        conflicts: (a, b) => kataToHira(a.reading) === kataToHira(b.reading),
      });
      return tfQuestion({
        rng,
        prompt: item.word,
        promptKind: 'ja',
        claimTrue: `is read ${withRomaji(item.reading)}`,
        claimFalse: wrong && `is read ${withRomaji(wrong)}`,
        correctFact: `${item.word} = ${withRomaji(item.reading)}`,
        note: vocabNote(item),
      });
    },
    kanjiMeaning(item, pool, rng) {
      const wrong = falseValue(item, pool, rng, { display: (o) => o.meanings[0], same: sameLevel, conflicts: meaningConflict });
      return tfQuestion({
        rng,
        prompt: item.kanji,
        promptKind: 'ja',
        claimTrue: `means "${item.meanings[0]}"`,
        claimFalse: wrong && `means "${wrong}"`,
        correctFact: `${item.kanji} = ${item.meanings.join(', ')}`,
        note: kanjiNote(item),
      });
    },
    kanjiReading(item, pool, rng) {
      const readings = allReadings(item);
      if (!readings.length) return null;
      const mine = readingKeys(readings);
      const wrong = falseValue(item, pool.filter((o) => allReadings(o).length), rng, {
        display: (o) => readingDisplay(allReadings(o)[0]),
        same: sameLevel,
        conflicts: (a, b) => mine.includes(kataToHira(readingDisplay(allReadings(b)[0]))),
      });
      return tfQuestion({
        rng,
        prompt: item.kanji,
        promptKind: 'ja',
        claimTrue: `can be read ${withRomaji(readingDisplay(choice(readings, rng)))}`,
        claimFalse: wrong && `can be read ${withRomaji(wrong)}`,
        correctFact: readings.map((r) => withRomaji(readingDisplay(r))).join(', '),
        note: kanjiNote(item),
      });
    },
  };

  // --- odd one out: three items share a group, the quizzed item is the intruder ---

  const CATEGORY_LABELS = {
    people: 'people',
    place: 'places',
    transport: 'transport',
    food: 'food & drink',
    nature: 'nature & weather',
    time: 'time',
    direction: 'directions & positions',
    question: 'question words',
    verb: 'verbs',
    adjective: 'adjectives',
    number: 'numbers',
    body: 'body parts',
    color: 'colours',
    action: 'actions',
    quality: 'qualities',
    emotion: 'feelings',
    government: 'politics & law',
  };

  // Kana row: か/き/く share "か"; yōon and extended kana group by their first kana (きゃ/きゅ/きょ).
  const KANA_ROWS = ['あいうえお', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど', 'なにぬねの',
    'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'やゆよ', 'らりるれろ', 'わを'];

  function kanaRowKey(item) {
    const chars = [...item.kana];
    if (chars.length > 1) return `start:${chars[0]}`;
    const row = KANA_ROWS.find((r) => r.includes(kataToHira(chars[0])));
    return row ? `row:${row[0]}` : null;
  }

  function kanaRowLabel(key, script) {
    const [kind, head] = key.split(':');
    const kana = script === 'katakana' ? hiraToKata(head) : head;
    return kind === 'row' ? `${kana} row` : `start with ${kana}`;
  }

  // Groups other items by key, keeps groups with 3+ distinct labels, and picks one (same tier preferred).
  function pickOddGroup(item, pools, rng, { key, display, same }) {
    const mine = key(item);
    if (!mine) return null;
    for (const pool of pools) {
      const groups = new Map();
      for (const o of pool) {
        const k = key(o);
        if (o === item || !k || k === mine || display(o) === display(item)) continue;
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(o);
      }
      const usable = [...groups.entries()]
        .map(([k, list]) => [k, [...new Map(list.map((o) => [display(o), o])).values()]])
        .filter(([, list]) => list.length >= 3);
      if (!usable.length) continue;
      const near = usable.filter(([, list]) => list.filter((o) => same(o, item)).length >= 3);
      const [groupKey, list] = choice(near.length ? near : usable, rng);
      const members = [...shuffle(list.filter((o) => same(o, item)), rng), ...shuffle(list.filter((o) => !same(o, item)), rng)];
      return { groupKey, members: members.slice(0, 3) };
    }
    return null;
  }

  function oddQuestion(item, pools, rng, spec) {
    const group = pickOddGroup(item, pools, rng, spec);
    if (!group) return null;
    const display = spec.display;
    const gloss = (o) => (spec.gloss ? `${display(o)} ${spec.gloss(o)}` : display(o));
    return choiceQuestion({
      rng,
      prompt: "Which one doesn't belong?",
      promptKind: 'latin',
      promptSub: spec.sub,
      optionKind: spec.optionKind,
      correct: display(item),
      distractors: group.members.map(display),
      note: `${group.members.map(gloss).join(', ')}: ${spec.label(group.groupKey, item)} · ${gloss(item)}: ${spec.label(spec.key(item), item)}`,
    });
  }

  const byCategory = { key: (o) => (CATEGORY_LABELS[o.cat] ? o.cat : null), label: (k) => CATEGORY_LABELS[k] };

  const ODD = {
    kana: (item, pool, rng, eligible) => {
      const sameScript = (list) => list.filter((o) => o.script === item.script);
      return oddQuestion(item, [sameScript(eligible || pool), sameScript(pool)], rng, {
        key: kanaRowKey,
        label: (k) => kanaRowLabel(k, item.script),
        display: (o) => o.kana,
        same: sameKanaGroup,
        sub: 'kana rows',
        optionKind: 'ja',
      });
    },
    vocab: (item, pool, rng, eligible) =>
      oddQuestion(item, [eligible || pool, pool], rng, {
        ...byCategory,
        display: (o) => o.word,
        gloss: (o) => `(${o.meanings[0]})`,
        same: sameLevel,
        sub: 'three share a group',
        optionKind: 'ja',
      }),
    kanji: (item, pool, rng, eligible) =>
      oddQuestion(item, [eligible || pool, pool], rng, {
        ...byCategory,
        display: (o) => o.kanji,
        gloss: (o) => `(${o.meanings[0]})`,
        same: sameLevel,
        sub: 'three share a group',
        optionKind: 'ja-big',
      }),
  };

  // ---------- quiz type registry ----------

  const TYPES = {};

  function registerType(type) {
    TYPES[type.id] = type;
  }

  // Each mode list is per course; a mode returns null when it can't build for that item.
  function modeType({ id, label, modes }) {
    return {
      id,
      label,
      supports: (courseId) => Boolean(modes[courseId]),
      build(item, pool, rng, courseId, eligible) {
        for (const mode of shuffle(modes[courseId] || [], rng)) {
          const q = mode(item, pool, rng, eligible);
          if (q) return q;
        }
        return null;
      },
      check: answerCheck,
    };
  }

  registerType(
    modeType({
      id: 'mc',
      label: 'Multiple choice',
      modes: {
        kana: [KANA.toRomajiChoice, KANA.toKanaChoice],
        vocab: [VOCAB.wordToMeaningChoice, VOCAB.meaningToWordChoice, VOCAB.wordToReadingChoice],
        kanji: [KANJI.kanjiToMeaningChoice, KANJI.kanjiToReadingChoice, KANJI.meaningToKanjiChoice],
      },
    })
  );

  registerType(
    modeType({
      id: 'type',
      label: 'Type the answer',
      modes: {
        kana: [KANA.toRomajiText],
        vocab: [VOCAB.wordToReadingText, VOCAB.wordToMeaningText],
        kanji: [KANJI.kanjiToMeaningText, KANJI.kanjiToReadingText],
        grammar: [GRAMMAR.particleText],
      },
    })
  );

  registerType(
    modeType({
      id: 'kana',
      label: 'Kana ↔ romaji',
      modes: { kana: [KANA.toRomajiText, KANA.toKanaChoice] },
    })
  );

  registerType(
    Object.assign(
      modeType({
        id: 'fill',
        label: 'Fill in the blank',
        modes: { vocab: [VOCAB.fillChoice], grammar: [GRAMMAR.fillChoice] },
      }),
      { accepts: (item, courseId) => courseId !== 'vocab' || Boolean(item.example) }
    )
  );

  registerType(
    modeType({
      id: 'match',
      label: 'Match pairs',
      modes: {
        kana: [MATCH.kana],
        vocab: [MATCH.vocabMeaning, MATCH.vocabReading],
        kanji: [MATCH.kanjiMeaning],
      },
    })
  );

  registerType(
    modeType({
      id: 'tf',
      label: 'True or false',
      modes: {
        kana: [TF.kanaToRomaji, TF.romajiToKana],
        vocab: [TF.vocabMeaning, TF.vocabReading],
        kanji: [TF.kanjiMeaning, TF.kanjiReading],
      },
    })
  );

  registerType(
    Object.assign(
      modeType({
        id: 'odd',
        label: 'Odd one out',
        modes: { kana: [ODD.kana], vocab: [ODD.vocab], kanji: [ODD.kanji] },
      }),
      { accepts: (item, courseId) => (courseId === 'kana' ? Boolean(kanaRowKey(item)) : Boolean(CATEGORY_LABELS[item.cat])) }
    )
  );

  // ---------- pool + picking ----------

  function itemEnabled(courseId, item, settings) {
    const cs = settings.courses && settings.courses[courseId];
    if (!cs || !cs.enabled) return false;
    if (courseId === 'kana') return Boolean(cs[item.script] && cs[item.script][item.group]);
    return Boolean(cs.levels && cs.levels[item.level]);
  }

  // Eligible items, each with the enabled quiz types that can quiz it.
  function buildCandidates(settings, data = getData()) {
    const out = [];
    for (const courseId of Object.keys(COURSES)) {
      const types = Object.values(TYPES).filter((t) => settings.types && settings.types[t.id] && t.supports(courseId));
      if (!types.length) continue;
      for (const item of data[courseId] || []) {
        if (!itemEnabled(courseId, item, settings)) continue;
        const typeIds = types.filter((t) => !t.accepts || t.accepts(item, courseId)).map((t) => t.id);
        if (typeIds.length) out.push({ item, courseId, typeIds });
      }
    }
    return out;
  }

  function weightOf(progress, itemId) {
    const rec = progress && progress.items && progress.items[itemId];
    return 1 + (rec && rec.heat ? rec.heat : 0) * 2;
  }

  function weightedPick(cands, progress, rng) {
    const weights = cands.map((c) => weightOf(progress, c.item.id));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < cands.length; i++) {
      r -= weights[i];
      if (r < 0) return cands[i];
    }
    return cands[cands.length - 1];
  }

  function courseLabel(courseId, item) {
    if (courseId === 'kana') return item.script === 'katakana' ? 'Katakana' : 'Hiragana';
    return `${COURSES[courseId].label} · ${item.level}`;
  }

  // eligible: { courseId: [enabled items] }, used by types that pull in extra items (match pairs).
  function buildQuestion(cand, typeId, data, rng, eligible) {
    const type = TYPES[typeId];
    const pool = data[cand.courseId];
    const q = type && type.build(cand.item, pool, rng, cand.courseId, (eligible && eligible[cand.courseId]) || pool);
    if (!q) return null;
    return {
      typeId,
      courseId: cand.courseId,
      itemId: cand.item.id,
      typeLabel: type.label,
      courseLabel: courseLabel(cand.courseId, cand.item),
      ...q,
    };
  }

  function nextQuestion(settings, progress, rng = Math.random, data = getData()) {
    const cands = buildCandidates(settings, data);
    const eligible = {};
    for (const c of cands) (eligible[c.courseId] = eligible[c.courseId] || []).push(c.item);
    let pool = cands;
    if (cands.length > 10) {
      const recent = new Set(((progress && progress.recent) || []).slice(-5));
      const fresh = cands.filter((c) => !recent.has(c.item.id));
      if (fresh.length) pool = fresh;
    }
    for (let attempt = 0; attempt < 10 && pool.length; attempt++) {
      const cand = weightedPick(pool, progress, rng);
      for (const typeId of shuffle(cand.typeIds, rng)) {
        const q = buildQuestion(cand, typeId, data, rng, eligible);
        if (q) return q;
      }
    }
    return null;
  }

  // Match pairs: is `rightText` the partner of the left box at `pairIndex`?
  function checkPair(question, pairIndex, rightText) {
    const pair = question.pairs && question.pairs[pairIndex];
    return Boolean(pair) && normalize(pair.right) === normalize(rightText);
  }

  function check(question, answer) {
    const type = TYPES[question.typeId];
    return type ? type.check(question, answer) : answerCheck(question, answer);
  }

  root.SukimaEngine = {
    COURSES,
    CATEGORY_LABELS,
    TYPES,
    registerType,
    getData,
    courseOfItemId,
    normalize,
    kataToHira,
    hiraToKata,
    romajiToHiragana,
    kanaToRomaji,
    kanaKey,
    meaningVariants,
    readingKeys,
    readingDisplay,
    buildCandidates,
    weightOf,
    weightedPick,
    buildQuestion,
    nextQuestion,
    check,
    checkPair,
  };
})(typeof self !== 'undefined' ? self : globalThis);
