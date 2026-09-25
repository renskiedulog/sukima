// Service worker: 1-minute alarm loop, nextFireAt bookkeeping, suppression checks, messaging.
importScripts('shared/settings.js');

const S = self.SukimaSettings;
const ALARM = 'sukima-tick';

// ---------- progress writes (serialized so concurrent messages don't clobber each other) ----------

let progressChain = Promise.resolve();

function withProgress(fn) {
  const run = progressChain.then(async () => {
    const progress = await S.loadProgress();
    const result = await fn(progress);
    await S.saveProgress(progress);
    return result;
  });
  progressChain = run.catch(() => {});
  return run;
}

function scheduleNext(intervalMin) {
  return withProgress((p) => {
    p.nextFireAt = Date.now() + intervalMin * 60 * 1000;
    return p.nextFireAt;
  });
}

// ---------- setup ----------

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM);
  if (!existing) await chrome.alarms.create(ALARM, { periodInMinutes: 1, delayInMinutes: 1 });
}

async function setup() {
  await ensureAlarm();
  const settings = await S.saveSettings(await S.loadSettings());
  await scheduleNext(settings.intervalMin);
}

chrome.runtime.onInstalled.addListener(setup);
chrome.runtime.onStartup.addListener(setup);
ensureAlarm();

// ---------- tick ----------

let ticking = false;

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM || ticking) return;
  ticking = true;
  try {
    const settings = await S.loadSettings();
    if (settings.paused) return;
    const progress = await S.loadProgress();
    if (Date.now() < progress.nextFireAt) return;
    // Not shown -> nextFireAt stays in the past, so the next tick retries.
    await attemptShow(settings, false);
  } finally {
    ticking = false;
  }
});

async function activeTab() {
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  if (!win) return { reason: 'no-window' };
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  return { win, tab };
}

// force = "Quiz now" from the toolbar: skips pause, quiet hours, blocklist and focus checks.
async function attemptShow(settings, force) {
  const { win, tab, reason } = await activeTab();
  if (reason) return { shown: false, reason };
  if (!force && !win.focused) return { shown: false, reason: 'window-not-focused' };
  if (!tab || !tab.url || !/^https?:\/\//i.test(tab.url)) return { shown: false, reason: 'unsupported-page' };

  if (!force) {
    if (settings.paused) return { shown: false, reason: 'paused' };
    if (S.inQuietHours(settings.quietHours)) return { shown: false, reason: 'quiet-hours' };
    if (S.hostMatches(new URL(tab.url).hostname, settings.blocklist)) return { shown: false, reason: 'blocked-site' };
  }

  let res;
  try {
    res = await chrome.tabs.sendMessage(tab.id, { type: 'SHOW_QUIZ', force });
  } catch {
    // No content script: tab opened before install/reload, a PDF viewer, or a restricted page.
    return { shown: false, reason: 'no-content-script' };
  }
  if (res && res.shown) {
    // Counts as shown right away, so navigating away mid-quiz still resets the timer.
    await scheduleNext(settings.intervalMin);
    return { shown: true };
  }
  return { shown: false, reason: (res && res.reason) || 'unknown' };
}

// ---------- messaging ----------

const HANDLERS = {
  async QUIZ_CLOSED() {
    const settings = await S.loadSettings();
    await scheduleNext(settings.intervalMin);
    return { ok: true };
  },

  async ANSWERED(msg) {
    if (typeof msg.itemId !== 'string') return { ok: false };
    await withProgress((p) => S.applyAnswer(p, { itemId: msg.itemId, correct: Boolean(msg.correct), courseId: msg.courseId }));
    return { ok: true };
  },

  async QUIZ_NOW() {
    return attemptShow(await S.loadSettings(), true);
  },

  async SET_PAUSED(msg) {
    // Resuming resets the timer via storage.onChanged below.
    const s = await S.updateSettings((s) => {
      s.paused = Boolean(msg.paused);
    });
    return { ok: true, paused: s.paused };
  },

  async RESET_PROGRESS() {
    await withProgress((p) => {
      p.items = {};
      p.days = {};
      p.recent = [];
    });
    return { ok: true };
  },

  async IMPORT_PROGRESS(msg) {
    const incoming = S.sanitizeProgress(msg.progress);
    await withProgress((p) => {
      p.items = incoming.items;
      p.days = incoming.days;
      p.recent = incoming.recent;
    });
    return { ok: true, items: Object.keys(incoming.items).length };
  },
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = msg && HANDLERS[msg.type];
  if (!handler) return false;
  Promise.resolve(handler(msg, sender)).then(sendResponse, (err) => sendResponse({ ok: false, error: String((err && err.message) || err) }));
  return true;
});

// Interval change or resume -> restart the countdown from now.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  const before = changes.settings.oldValue;
  const after = changes.settings.newValue;
  if (!before || !after) return;
  if (before.intervalMin !== after.intervalMin || (before.paused && !after.paused)) {
    scheduleNext(S.sanitizeSettings(after).intervalMin);
  }
});
