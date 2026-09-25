// Stats panel inside options.html. Theme and icons are handled by options.js.
(() => {
  'use strict';

  const S = self.SukimaSettings;
  const E = self.SukimaEngine;
  const $ = (id) => document.getElementById(id);

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function pct(correct, total) {
    return total ? `${Math.round((correct / total) * 100)}%` : '—';
  }

  function itemIndex() {
    const idx = {};
    const data = E.getData();
    for (const k of data.kana) idx[k.id] = { label: k.kana, sub: k.romaji.join(' / '), course: k.script === 'katakana' ? 'Katakana' : 'Hiragana' };
    for (const v of data.vocab) {
      idx[v.id] = { label: v.word, sub: `${v.word !== v.reading ? v.reading + ', ' : ''}${v.meanings.join(', ')}`, course: `Vocab ${v.level}` };
    }
    for (const k of data.kanji) idx[k.id] = { label: k.kanji, sub: k.meanings.join(', '), course: `Kanji ${k.level}` };
    for (const g of data.grammar) idx[g.id] = { label: g.ja.replace('＿', `［${g.answer}］`), sub: g.en, course: `Grammar ${g.level}` };
    return idx;
  }

  function renderTiles(days, today) {
    $('streak').textContent = plural(S.currentStreak(days, today), 'day');
    $('longest').textContent = `Longest: ${plural(S.longestStreak(days), 'day')}`;

    const t = days[S.dayKey(today)] || { answered: 0, correct: 0 };
    $('today-answered').textContent = `${t.answered} answered`;
    $('today-correct').textContent = `${t.correct} correct`;
    $('today-acc').textContent = pct(t.correct, t.answered);

    const totals = Object.values(days).reduce((a, d) => ({ answered: a.answered + d.answered, correct: a.correct + d.correct }), {
      answered: 0,
      correct: 0,
    });
    $('all-time').textContent = totals.answered ? `All time: ${pct(totals.correct, totals.answered)} of ${totals.answered}` : 'All time: no answers yet';
  }

  function renderBars(days, today) {
    const series = [];
    for (let i = 29; i >= 0; i--) {
      const date = S.addDays(today, -i);
      series.push({ date, ...(days[S.dayKey(date)] || { answered: 0, correct: 0 }) });
    }
    const max = Math.max(1, ...series.map((s) => s.answered));
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

    const bars = $('bars');
    bars.replaceChildren(
      ...series.map((s, i) => {
        const bar = document.createElement('div');
        bar.className = `bar${i === series.length - 1 ? ' today' : ''}`;
        bar.title = `${fmt.format(s.date)}: ${s.answered} answered, ${s.correct} correct`;
        const fill = document.createElement('div');
        fill.className = 'bar-fill';
        fill.style.height = `${(s.answered / max) * 100}%`;
        bar.append(fill);
        return bar;
      })
    );
    const active = series.filter((s) => s.answered).length;
    bars.setAttribute('aria-label', `Answers per day over the last 30 days: ${active} active days, most in one day ${max}.`);
    $('axis-start').textContent = fmt.format(series[0].date);
  }

  function renderCourses(items) {
    const byCourse = {};
    for (const [id, rec] of Object.entries(items)) {
      const c = rec.courseId || E.courseOfItemId(id);
      if (!c) continue;
      const agg = (byCourse[c] = byCourse[c] || { hits: 0, misses: 0 });
      agg.hits += rec.hits || 0;
      agg.misses += rec.misses || 0;
    }

    $('stats-courses').replaceChildren(
      ...Object.entries(E.COURSES).map(([id, info]) => {
        const agg = byCourse[id] || { hits: 0, misses: 0 };
        const total = agg.hits + agg.misses;
        const row = document.createElement('div');
        row.className = 'course-row';
        row.innerHTML = '<strong></strong><div class="meter"><span></span></div><div class="num"></div>';
        row.querySelector('strong').textContent = info.label;
        row.querySelector('.meter span').style.width = total ? `${(agg.hits / total) * 100}%` : '0';
        row.querySelector('.num').textContent = total ? `${pct(agg.hits, total)} (${agg.hits} of ${total})` : 'No answers yet';
        return row;
      })
    );
  }

  function renderWeak(items) {
    const box = $('stats-weak');
    const weak = Object.entries(items)
      .filter(([, r]) => (r.heat || 0) > 0)
      .sort((a, b) => b[1].heat - a[1].heat || (b[1].misses || 0) - (a[1].misses || 0))
      .slice(0, 10);

    if (!weak.length) {
      box.innerHTML = '<p class="stats-empty">No weak spots yet. Items you miss will show up here.</p>';
      return;
    }

    const idx = itemIndex();
    const table = document.createElement('table');
    table.className = 'weak-table';
    table.innerHTML =
      '<thead><tr><th>Item</th><th>Course</th><th class="n">Heat</th><th class="n">Right</th><th class="n">Missed</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');
    for (const [id, rec] of weak) {
      const info = idx[id] || { label: id, sub: 'No longer in the word lists', course: '' };
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><div class="weak-item" lang="ja"></div><div class="muted"></div></td><td></td><td class="n"></td><td class="n"></td><td class="n"></td>';
      const cells = tr.querySelectorAll('td');
      cells[0].querySelector('.weak-item').textContent = info.label;
      cells[0].querySelector('.muted').textContent = info.sub;
      cells[1].textContent = info.course;
      cells[2].textContent = rec.heat;
      cells[3].textContent = rec.hits || 0;
      cells[4].textContent = rec.misses || 0;
      tbody.append(tr);
    }
    box.replaceChildren(table);
  }

  // ---------- share card ----------

  const Share = self.SukimaShare;
  let latest = null;
  let busy = false;

  function renderShareButton(progress) {
    const empty = !Share.summarizeMonth(progress).answered;
    $('share-open').disabled = empty;
    $('share-open').title = empty ? 'Answer a quiz this month to unlock your card' : '';
  }

  async function drawShareCard() {
    const s = Share.summarizeMonth(latest, new Date(), E.COURSES);
    const info = s.toughestId ? itemIndex()[s.toughestId] : null;
    const t = Share.readTokens();
    await Share.loadFonts(t, info ? info.label : '');
    Share.drawCard($('share-canvas'), s, info && { label: info.label, sub: info.sub }, t);
    $('share-canvas').setAttribute('aria-label', `Sukima summary for ${s.monthLabel}: ${s.answered} questions answered, ${s.accuracy}% correct.`);
    return s;
  }

  const cardBlob = () => new Promise((resolve, reject) => $('share-canvas').toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));

  const fileName = () => `sukima-${Share.summarizeMonth(latest).monthLabel.toLowerCase().replace(/\s+/g, '-')}.png`;

  function shareMsg(text, bad = false) {
    $('share-msg').textContent = text;
    $('share-msg').classList.toggle('bad', bad);
  }

  async function shareAction(btn, fn) {
    if (busy) return;
    busy = true;
    btn.disabled = true;
    shareMsg('');
    try {
      await fn();
    } catch (e) {
      // A cancelled share sheet rejects too; that one isn't an error.
      if (e && e.name !== 'AbortError') shareMsg("Couldn't do that. Try Save image instead.", true);
    } finally {
      busy = false;
      btn.disabled = false;
    }
  }

  function initShare() {
    const dialog = $('share-dialog');

    $('share-open').addEventListener('click', async () => {
      shareMsg('');
      dialog.showModal();
      await drawShareCard();
    });
    $('share-close').addEventListener('click', () => dialog.close());
    // Click on the backdrop (the dialog box itself, outside its content) closes it.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    $('share-copy').addEventListener('click', (e) =>
      shareAction(e.currentTarget, async () => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': cardBlob() })]);
        shareMsg('Copied. Paste it anywhere.');
      })
    );

    $('share-save').addEventListener('click', (e) =>
      shareAction(e.currentTarget, async () => {
        const url = URL.createObjectURL(await cardBlob());
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName();
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      })
    );

    // canShare({ files }) is the only reliable probe; plenty of browsers have share() but reject files.
    let canShareFiles = false;
    try {
      canShareFiles = !!navigator.canShare?.({ files: [new File([new Blob()], 'probe.png', { type: 'image/png' })] });
    } catch {
      canShareFiles = false;
    }
    $('share-native').hidden = !canShareFiles;
    $('share-native').addEventListener('click', (e) =>
      shareAction(e.currentTarget, async () => {
        const file = new File([await cardBlob()], fileName(), { type: 'image/png' });
        await navigator.share({ files: [file], text: `My ${Share.summarizeMonth(latest).monthLabel} on Sukima` });
      })
    );
  }

  function render(progress) {
    const today = new Date();
    latest = progress;
    renderTiles(progress.days, today);
    renderBars(progress.days, today);
    renderCourses(progress.items);
    renderWeak(progress.items);
    renderShareButton(progress);
    if ($('share-dialog').open) drawShareCard();
  }

  async function init() {
    initShare();
    render(await S.loadProgress());
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'local' && changes.progress) render(await S.loadProgress());
    });
  }

  init();
})();
