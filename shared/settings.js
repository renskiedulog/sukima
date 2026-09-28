// Settings + progress: defaults, load/save, blocklist and quiet-hours helpers.
// Plain script (no modules) so it loads in the service worker, content scripts, pages and Node tests.
(function (root) {
  'use strict';

  const DEFAULT_SETTINGS = {
    intervalMin: 15,
    paused: false,
    oneShot: false,
    theme: 'system',
    blocklist: [],
    quietHours: { enabled: false, days: [1, 2, 3, 4, 5], start: '09:00', end: '17:30' },
    types: { mc: true, type: true, kana: true, fill: true, match: true, tf: true, odd: true },
    courses: {
      kana: {
        enabled: true,
        hiragana: { basic: true, dakuten: true, yoon: false },
        katakana: { basic: true, dakuten: false, yoon: false, extended: false },
      },
      vocab: { enabled: true, levels: { N5: true, N4: false, N3: false, N2: false, N1: false } },
      kanji: { enabled: true, levels: { N5: true, N4: false, N3: false, N2: false, N1: false } },
      grammar: { enabled: true, levels: { N5: true, N4: false, N3: false } },
    },
  };

  const DEFAULT_PROGRESS = { items: {}, days: {}, recent: [], nextFireAt: 0 };

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  // Merge stored values over defaults. Keys not in defaults are dropped; type mismatches fall back to default.
  function mergeDefaults(base, over) {
    if (Array.isArray(base)) return Array.isArray(over) ? over.slice() : base.slice();
    if (base && typeof base === 'object') {
      const out = {};
      const src = over && typeof over === 'object' && !Array.isArray(over) ? over : {};
      for (const k of Object.keys(base)) out[k] = mergeDefaults(base[k], src[k]);
      return out;
    }
    return typeof over === typeof base ? over : base;
  }

  function sanitizeSettings(raw) {
    const s = mergeDefaults(DEFAULT_SETTINGS, raw);
    const interval = Number(s.intervalMin);
    s.intervalMin = Number.isFinite(interval) ? Math.max(1, Math.round(interval)) : DEFAULT_SETTINGS.intervalMin;
    if (!['light', 'dark', 'system'].includes(s.theme)) s.theme = 'system';
    s.blocklist = normalizeBlocklist(s.blocklist);
    s.quietHours.days = [...new Set(s.quietHours.days.map(Number))].filter((d) => d >= 0 && d <= 6).sort();
    if (!isTime(s.quietHours.start)) s.quietHours.start = DEFAULT_SETTINGS.quietHours.start;
    if (!isTime(s.quietHours.end)) s.quietHours.end = DEFAULT_SETTINGS.quietHours.end;
    return s;
  }

  function sanitizeProgress(raw) {
    const p = raw && typeof raw === 'object' ? raw : {};
    return {
      items: p.items && typeof p.items === 'object' ? p.items : {},
      days: p.days && typeof p.days === 'object' ? p.days : {},
      recent: Array.isArray(p.recent) ? p.recent.filter((x) => typeof x === 'string') : [],
      nextFireAt: Number(p.nextFireAt) || 0,
    };
  }

  // ---------- blocklist ----------

  // "https://*.Example.com:8080/path" -> "example.com". Returns "" when nothing usable is left.
  function normalizeBlockEntry(entry) {
    let e = String(entry || '').trim().toLowerCase();
    e = e.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
    e = e.split(/[/?#]/)[0];
    e = e.replace(/:\d+$/, '');
    e = e.replace(/^(\*\.)+/, '').replace(/^\.+/, '').replace(/\.+$/, '');
    // "www.youtube.com" means the whole site; blocking youtube.com also covers music.youtube.com
    if (/^www\.[^.]+\.[^.]+/.test(e)) e = e.slice(4);
    return /^[a-z0-9.-]+$/.test(e) && e.includes('.') || e === 'localhost' ? e : '';
  }

  function normalizeBlocklist(list) {
    return [...new Set((Array.isArray(list) ? list : []).map(normalizeBlockEntry).filter(Boolean))];
  }

  // "example.com" (or "*.example.com") matches example.com and every subdomain.
  function hostMatches(hostname, blocklist) {
    const h = String(hostname || '').toLowerCase().replace(/\.$/, '');
    if (!h) return false;
    return normalizeBlocklist(blocklist).some((e) => h === e || h.endsWith('.' + e));
  }

  // ---------- quiet hours ----------

  function isTime(t) {
    return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
  }

  function toMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // Days refer to the day the range starts on, so Fri 22:00 -> 07:00 also covers early Saturday.
  // start === end means the whole day.
  function inQuietHours(qh, date = new Date()) {
    if (!qh || !qh.enabled || !isTime(qh.start) || !isTime(qh.end)) return false;
    const days = qh.days || [];
    const day = date.getDay();
    const prevDay = (day + 6) % 7;
    const now = date.getHours() * 60 + date.getMinutes();
    const start = toMinutes(qh.start);
    const end = toMinutes(qh.end);
    if (start === end) return days.includes(day);
    if (start < end) return days.includes(day) && now >= start && now < end;
    return (days.includes(day) && now >= start) || (days.includes(prevDay) && now < end);
  }

  // ---------- progress ----------

  function dayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function applyAnswer(progress, { itemId, correct, courseId }, now = Date.now()) {
    const rec = progress.items[itemId] || { heat: 0, hits: 0, misses: 0, lastSeen: 0 };
    if (correct) {
      rec.hits = (rec.hits || 0) + 1;
      rec.heat = Math.max(0, (rec.heat || 0) - 1);
    } else {
      rec.misses = (rec.misses || 0) + 1;
      rec.heat = (rec.heat || 0) + 3;
    }
    rec.lastSeen = now;
    if (courseId) rec.courseId = courseId;
    progress.items[itemId] = rec;

    const k = dayKey(new Date(now));
    const day = progress.days[k] || { answered: 0, correct: 0 };
    day.answered += 1;
    if (correct) day.correct += 1;
    progress.days[k] = day;

    progress.recent = [...progress.recent.filter((x) => x !== itemId), itemId].slice(-10);
    return progress;
  }

  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  const answeredOn = (days, date) => (days[dayKey(date)] ? days[dayKey(date)].answered : 0);

  // A streak stays alive through today until midnight even if today has no answers yet.
  function currentStreak(days, today = new Date()) {
    let d = answeredOn(days, today) > 0 ? today : addDays(today, -1);
    let n = 0;
    while (answeredOn(days, d) > 0) {
      n += 1;
      d = addDays(d, -1);
    }
    return n;
  }

  function longestStreak(days) {
    const keys = Object.keys(days).filter((k) => days[k].answered > 0).sort();
    let best = 0;
    let run = 0;
    let prev = null;
    for (const k of keys) {
      const [y, m, d] = k.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      run = prev && Math.round((date - prev) / 86400000) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = date;
    }
    return best;
  }

  // ---------- chrome.storage ----------

  async function loadSettings() {
    const { settings } = await chrome.storage.local.get('settings');
    return sanitizeSettings(settings);
  }

  async function saveSettings(settings) {
    const s = sanitizeSettings(settings);
    await chrome.storage.local.set({ settings: s });
    return s;
  }

  async function updateSettings(fn) {
    const s = await loadSettings();
    const next = (await fn(s)) || s;
    return saveSettings(next);
  }

  async function loadProgress() {
    const { progress } = await chrome.storage.local.get('progress');
    return sanitizeProgress(progress);
  }

  async function saveProgress(progress) {
    const p = sanitizeProgress(progress);
    await chrome.storage.local.set({ progress: p });
    return p;
  }

  // Sets data-theme on <html>; theme.css handles "system" through prefers-color-scheme.
  function applyTheme(theme, doc = root.document) {
    if (doc) doc.documentElement.dataset.theme = theme || 'system';
  }

  function resolveTheme(theme) {
    if (theme === 'light' || theme === 'dark') return theme;
    return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  root.SukimaSettings = {
    DEFAULT_SETTINGS,
    DEFAULT_PROGRESS,
    clone,
    mergeDefaults,
    sanitizeSettings,
    sanitizeProgress,
    normalizeBlockEntry,
    normalizeBlocklist,
    hostMatches,
    isTime,
    inQuietHours,
    dayKey,
    applyAnswer,
    addDays,
    currentStreak,
    longestStreak,
    loadSettings,
    saveSettings,
    updateSettings,
    loadProgress,
    saveProgress,
    applyTheme,
    resolveTheme,
  };
})(typeof self !== 'undefined' ? self : globalThis);
