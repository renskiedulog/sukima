// Shareable "month so far" card: summarizeMonth() turns progress into numbers (pure, tested in Node),
// drawCard() paints a 1080x1350 PNG-ready canvas (4:5, the tallest crop Instagram/Facebook feeds
// accept without letterboxing). Colors come from the page's theme.css tokens, so the card follows
// light/dark like the rest of the extension.
(function (root) {
  'use strict';

  const S = root.SukimaSettings;
  const W = 1080;
  const H = 1350;

  // Always English: the bundled fonts are subset, so a localized month name (九月, etc.) could miss glyphs.
  const LOCALE = 'en-US';

  // Only day totals are stored per day, so the month numbers come from progress.days; course accuracy and
  // the toughest item are all-time (item records have no per-day split) and the card labels them that way.
  function summarizeMonth(progress, now = new Date(), courses = {}) {
    const days = progress.days || {};
    const y = now.getFullYear();
    const m = now.getMonth();
    const today = now.getDate();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const on = (date) => days[S.dayKey(date)] || { answered: 0, correct: 0 };

    const series = [];
    let answered = 0;
    let correct = 0;
    for (let d = 1; d <= today; d++) {
      const day = on(new Date(y, m, d));
      series.push(day.answered);
      answered += day.answered;
      correct += day.correct;
    }

    // Same-span comparison: a half-finished month against a whole one would always look like a slump.
    const daysInPrev = new Date(y, m, 0).getDate();
    let prevAnswered = 0;
    for (let d = 1; d <= Math.min(today, daysInPrev); d++) prevAnswered += on(new Date(y, m - 1, d)).answered;

    const byCourse = {};
    for (const [id, rec] of Object.entries(progress.items || {})) {
      const c = rec.courseId || (root.SukimaEngine && root.SukimaEngine.courseOfItemId(id));
      if (!c) continue;
      const agg = (byCourse[c] = byCourse[c] || { hits: 0, misses: 0 });
      agg.hits += rec.hits || 0;
      agg.misses += rec.misses || 0;
    }

    const toughest = Object.entries(progress.items || {})
      .filter(([, r]) => (r.heat || 0) > 0)
      .sort((a, b) => b[1].heat - a[1].heat || (b[1].misses || 0) - (a[1].misses || 0))[0];

    const month = new Intl.DateTimeFormat(LOCALE, { month: 'short' }).format(now);

    return {
      monthLabel: new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(now),
      monthName: new Intl.DateTimeFormat(LOCALE, { month: 'long' }).format(now),
      throughLabel: today === 1 ? `${month} 1` : `${month} 1 – ${month} ${today}`,
      answered,
      correct,
      accuracy: answered ? Math.round((correct / answered) * 100) : null,
      prevAnswered,
      deltaPct: prevAnswered ? Math.round(((answered - prevAnswered) / prevAnswered) * 100) : null,
      activeDays: series.filter((n) => n > 0).length,
      daysSoFar: today,
      daysInMonth,
      firstWeekday: (new Date(y, m, 1).getDay() + 6) % 7, // Monday = 0
      series,
      streak: S.currentStreak(days, now),
      longest: S.longestStreak(days),
      courses: Object.entries(courses).map(([id, info]) => {
        const agg = byCourse[id] || { hits: 0, misses: 0 };
        const total = agg.hits + agg.misses;
        return { label: info.label, total, pct: total ? Math.round((agg.hits / total) * 100) : null };
      }),
      toughestId: toughest ? toughest[0] : null,
    };
  }

  // ---------- drawing ----------

  const TOKENS = ['bg', 'surface', 'fg', 'muted', 'line', 'chip', 'accent', 'accent-soft', 'seal', 'seal-soft','right', 'right-bg', 'wrong', 'wrong-bg', 'font-ui', 'font-ja', 'font-head'];

  function readTokens(el = root.document.documentElement) {
    const cs = root.getComputedStyle(el);
    const t = {};
    for (const name of TOKENS) t[name] = cs.getPropertyValue(`--${name}`).trim();
    return t;
  }

  // Canvas text never triggers @font-face loading, so fetch every face the card uses first.
  function loadFonts(t, extraText = '') {
    const specs = [`400 40px ${t['font-head']}`, `500 30px ${t['font-ui']}`, `700 30px ${t['font-ui']}`, `800 30px ${t['font-ui']}`];
    return Promise.all([...specs.map((f) => root.document.fonts.load(f, `Sukima 0123 隙${extraText}`)), root.document.fonts.ready]);
  }

  // Lucide icons from shared/icons.js, replayed onto the canvas (path, circle, rect, line, poly*).
  function drawIcon(ctx, name, x, y, size, color) {
    const src = root.SukimaIcons && root.SukimaIcons.PATHS[name];
    if (!src) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 24, size / 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [, tag, attrs] of src.matchAll(/<(\w+)([^>]*)\/>/g)) {
      const a = {};
      for (const [, k, v] of attrs.matchAll(/([\w-]+)="([^"]*)"/g)) a[k] = v;
      const n = (k) => Number(a[k] || 0);
      let p;
      if (tag === 'path') p = new Path2D(a.d);
      else {
        p = new Path2D();
        if (tag === 'circle') p.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2);
        else if (tag === 'rect') p.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx'));
        else if (tag === 'line') {
          p.moveTo(n('x1'), n('y1'));
          p.lineTo(n('x2'), n('y2'));
        } else if (tag === 'polyline' || tag === 'polygon') {
          const pts = a.points.trim().split(/[\s,]+/).map(Number);
          for (let i = 0; i < pts.length; i += 2) (i ? p.lineTo : p.moveTo).call(p, pts[i], pts[i + 1]);
          if (tag === 'polygon') p.closePath();
        }
      }
      ctx.stroke(p);
    }
    ctx.restore();
  }

  function box(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }

  // Draws a pill whose left edge is x and vertical center is cy; returns its width.
  function pill(ctx, text, x, cy, { bg, fg, stroke, font, h = 52, padX = 22 }) {
    ctx.font = font;
    const w = ctx.measureText(text).width + padX * 2;
    box(ctx, x, cy - h / 2, w, h, h / 2, bg, stroke);
    ctx.fillStyle = fg;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, cy + 1);
    ctx.textBaseline = 'alphabetic';
    return w;
  }

  // Shrinks from max to min px to fit, then ellipsizes. Returns the font size used.
  function fitText(ctx, text, x, y, maxW, { weight, family, max, min }) {
    let size = max;
    ctx.font = `${weight} ${size}px ${family}`;
    while (size > min && ctx.measureText(text).width > maxW) {
      size -= 2;
      ctx.font = `${weight} ${size}px ${family}`;
    }
    let out = text;
    if (ctx.measureText(out).width > maxW) {
      while (out.length > 1 && ctx.measureText(`${out}…`).width > maxW) out = out.slice(0, -1);
      out += '…';
    }
    ctx.fillText(out, x, y);
    return size;
  }

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // s: summarizeMonth() output; toughest: { label, sub } for s.toughestId or null; t: readTokens().
  function drawCard(canvas, s, toughest, t) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const ui = (w, px) => `${w} ${px}px ${t['font-ui']}`;
    const head = (px) => `400 ${px}px ${t['font-head']}`;
    const P = 64;
    const IW = W - P * 2;

    // Paper with an indigo wash top right and a vermilion one bottom left.
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = t['accent-soft'];
    ctx.beginPath();
    ctx.arc(W - 60, 40, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = t['seal-soft'];
    ctx.beginPath();
    ctx.arc(-40, H + 20, 280, 0, Math.PI * 2);
    ctx.fill();

    // Masthead: hanko seal + wordmark, month pill on the right.
    box(ctx, P, P, 80, 80, 14, t.seal);
    ctx.fillStyle = '#fff';
    ctx.font = `700 50px ${t['font-ja']}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('隙', P + 40, P + 42);
    ctx.textAlign = 'left';
    ctx.fillStyle = t.fg;
    ctx.font = head(46);
    ctx.fillText('Sukima', P + 102, P + 42);
    ctx.textBaseline = 'alphabetic';
    ctx.font = ui(700, 26);
    const monthW = ctx.measureText(s.monthLabel).width + 44;
    pill(ctx, s.monthLabel, W - P - monthW, P + 40, { bg: t.surface, fg: t.fg, stroke: t.line, font: ui(700, 26), h: 56 });

    // Hero: questions answered this month.
    let y = 180;
    box(ctx, P, y, IW, 350, 40, t.surface, t.line);
    ctx.fillStyle = t.muted;
    ctx.font = ui(700, 30);
    ctx.fillText('This month so far', P + 48, y + 80);
    ctx.fillStyle = t.accent;
    ctx.font = head(160);
    const big = s.answered.toLocaleString(LOCALE);
    ctx.fillText(big, P + 44, y + 238);
    const bigW = ctx.measureText(big).width;
    ctx.fillStyle = t.fg;
    ctx.font = ui(700, 38);
    ctx.fillText(s.answered === 1 ? 'question answered' : 'questions answered', P + 44 + bigW + 22, y + 236);

    let cx = P + 48;
    const cy = y + 294;
    const chip = ui(700, 25);
    cx += pill(ctx, `${s.accuracy}% correct`, cx, cy, { bg: t['right-bg'], fg: t.right, font: chip }) + 12;
    cx += pill(ctx, s.throughLabel, cx, cy, { bg: t.chip, fg: t.muted, font: chip }) + 12;
    const d = s.deltaPct;
    const deltaText =
      d === null ? 'Up from 0 last month' : d === 0 ? 'Same pace as last month' : `${d > 0 ? 'Up' : 'Down'} ${Math.abs(d)}% vs last month`;
    const good = d === null || d > 0;
    pill(ctx, deltaText, cx, cy, { bg: d === 0 ? t.chip : good ? t['right-bg'] : t['wrong-bg'], fg: d === 0 ? t.muted : good ? t.right : t.wrong, font: chip });

    // Three tiles: streak, active days, toughest item.
    y = 554;
    const TW = (IW - 40) / 3;
    const tiles = [
      { icon: 'flame', label: 'Streak', value: plural(s.streak, 'day'), sub: `Longest ${plural(s.longest, 'day')}` },
      { icon: 'target', label: 'Active days', value: `${s.activeDays}`, sub: `of ${plural(s.daysSoFar, 'day')} so far` },
      toughest
        ? { icon: 'alert', label: 'Toughest', value: toughest.label, sub: toughest.sub, ja: true }
        : { icon: 'alert', label: 'Toughest', value: 'None yet', sub: 'Nothing missed' },
    ];
    tiles.forEach((tile, i) => {
      const x = P + i * (TW + 20);
      box(ctx, x, y, TW, 200, 32, t.surface, t.line);
      drawIcon(ctx, tile.icon, x + 32, y + 30, 28, t.accent);
      ctx.fillStyle = t.muted;
      ctx.font = ui(700, 25);
      ctx.fillText(tile.label, x + 70, y + 53);
      ctx.fillStyle = t.fg;
      if (tile.ja) fitText(ctx, tile.value, x + 32, y + 128, TW - 64, { weight: 800, family: t['font-ja'], max: 56, min: 30 });
      else fitText(ctx, tile.value, x + 32, y + 128, TW - 64, { weight: 400, family: t['font-head'], max: 54, min: 30 });
      ctx.fillStyle = t.muted;
      fitText(ctx, tile.sub, x + 32, y + 168, TW - 64, { weight: 600, family: t['font-ui'], max: 23, min: 23 });
    });

    // Bottom row: month calendar + course accuracy.
    y = 778;
    const BH = 424;
    const HW = (IW - 24) / 2;

    box(ctx, P, y, HW, BH, 32, t.surface, t.line);
    ctx.fillStyle = t.fg;
    ctx.font = ui(800, 28);
    ctx.fillText(s.monthName, P + 36, y + 62);
    const rows = Math.ceil((s.firstWeekday + s.daysInMonth) / 7);
    const gap = 8;
    const gridTop = y + 124;
    const cell = Math.min((HW - 72 - gap * 6) / 7, (y + BH - 32 - gridTop - gap * (rows - 1)) / rows);
    const gridX = P + (HW - (cell * 7 + gap * 6)) / 2;
    ctx.font = ui(700, 20);
    ctx.fillStyle = t.muted;
    ctx.textAlign = 'center';
    'MTWTFSS'.split('').forEach((ch, i) => ctx.fillText(ch, gridX + i * (cell + gap) + cell / 2, y + 108));
    ctx.textAlign = 'left';
    const peak = Math.max(1, ...s.series);
    for (let day = 1; day <= s.daysInMonth; day++) {
      const idx = s.firstWeekday + day - 1;
      const x = gridX + (idx % 7) * (cell + gap);
      const cy2 = gridTop + Math.floor(idx / 7) * (cell + gap);
      const n = s.series[day - 1];
      if (n === undefined) {
        // Days still to come: outline only.
        ctx.beginPath();
        ctx.roundRect(x + 1, cy2 + 1, cell - 2, cell - 2, 10);
        ctx.lineWidth = 2;
        ctx.strokeStyle = t.chip;
        ctx.stroke();
        continue;
      }
      box(ctx, x, cy2, cell, cell, 10, t.chip);
      if (n > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.7 * (n / peak);
        box(ctx, x, cy2, cell, cell, 10, t.accent);
        ctx.restore();
      }
      if (day === s.daysSoFar) {
        ctx.beginPath();
        ctx.roundRect(x - 3, cy2 - 3, cell + 6, cell + 6, 12);
        ctx.lineWidth = 3;
        ctx.strokeStyle = t.seal;
        ctx.stroke();
      }
    }

    const rx = P + HW + 24;
    box(ctx, rx, y, HW, BH, 32, t.surface, t.line);
    ctx.fillStyle = t.fg;
    ctx.font = ui(800, 28);
    ctx.fillText('Accuracy', rx + 36, y + 62);
    const accW = ctx.measureText('Accuracy').width;
    ctx.fillStyle = t.muted;
    ctx.font = ui(600, 22);
    ctx.fillText('all time', rx + 36 + accW + 12, y + 62);
    s.courses.forEach((c, i) => {
      const ry = y + 128 + i * 76;
      ctx.fillStyle = t.fg;
      ctx.font = ui(700, 26);
      ctx.fillText(c.label, rx + 36, ry);
      ctx.fillStyle = c.pct === null ? t.muted : t.fg;
      ctx.font = ui(800, 26);
      ctx.textAlign = 'right';
      ctx.fillText(c.pct === null ? '—' : `${c.pct}%`, rx + HW - 36, ry);
      ctx.textAlign = 'left';
      box(ctx, rx + 36, ry + 16, HW - 72, 14, 7, t.chip);
      if (c.pct) box(ctx, rx + 36, ry + 16, Math.max(14, (HW - 72) * (c.pct / 100)), 14, 7, t.right);
    });

    // Footer
    ctx.fillStyle = t.muted;
    ctx.font = ui(600, 24);
    ctx.fillText(`${plural(s.correct, 'right answer')} this month`, P, H - P + 2);
    ctx.fillStyle = t.accent;
    ctx.font = head(28);
    ctx.textAlign = 'right';
    ctx.fillText('Sukima · Japanese quiz breaks', W - P, H - P + 2);
    ctx.textAlign = 'left';
  }

  root.SukimaShare = { W, H, summarizeMonth, readTokens, loadFonts, drawCard };
})(typeof self !== 'undefined' ? self : globalThis);
