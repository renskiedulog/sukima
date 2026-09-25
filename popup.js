(() => {
  'use strict';

  const S = self.SukimaSettings;
  const I = self.SukimaIcons;
  const $ = (id) => document.getElementById(id);

  const REASONS = {
    'unsupported-page': "Quizzes can't run on this page (only http/https sites).",
    'no-content-script': 'Reload this tab first — it was opened before Sukima was loaded.',
    'already-open': 'A quiz is already open on this page.',
    'no-questions': 'Nothing to quiz — enable a course and quiz type in Settings.',
    'no-window': 'No browser window found.',
  };

  let settings = null;
  let progress = null;
  let tabHost = null;

  async function refresh() {
    [settings, progress] = await Promise.all([S.loadSettings(), S.loadProgress()]);
    S.applyTheme(settings.theme);
    renderPause();
    renderBlock();
    renderTimer();
  }

  function renderPause() {
    const btn = $('pause');
    btn.innerHTML = settings.paused ? `${I.svg('play')}<span>Resume</span>` : `${I.svg('pause')}<span>Pause</span>`;
    btn.setAttribute('aria-pressed', String(settings.paused));
  }

  function renderBlock() {
    const btn = $('block');
    if (!tabHost) {
      btn.disabled = true;
      $('block-label').textContent = 'Block this site';
      return;
    }
    const blocked = S.hostMatches(tabHost, settings.blocklist);
    btn.disabled = blocked;
    $('block-label').textContent = blocked ? `${tabHost} is blocked` : `Block ${tabHost}`;
  }

  function renderTimer() {
    const box = $('timer');
    box.classList.toggle('paused', settings.paused);
    if (settings.paused) {
      $('timer-label').textContent = 'Quizzes paused';
      $('timer-value').textContent = '—';
      return;
    }
    const ms = progress.nextFireAt - Date.now();
    if (ms <= 0) {
      $('timer-label').textContent = 'Quiz due';
      $('timer-value').textContent = 'soon';
      return;
    }
    const total = Math.ceil(ms / 1000);
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    $('timer-label').textContent = 'Next quiz in';
    $('timer-value').textContent = hh ? `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${mm}:${String(ss).padStart(2, '0')}`;
  }

  function say(text) {
    $('msg').textContent = text || '';
  }

  async function init() {
    I.hydrate(document);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    try {
      const url = new URL(tab && tab.url);
      if (/^https?:$/.test(url.protocol)) tabHost = url.hostname;
    } catch {
      tabHost = null;
    }

    await refresh();
    setInterval(renderTimer, 1000);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && (changes.settings || changes.progress)) refresh();
    });

    $('pause').addEventListener('click', async () => {
      say('');
      await chrome.runtime.sendMessage({ type: 'SET_PAUSED', paused: !settings.paused });
    });

    $('quiz-now').addEventListener('click', async () => {
      say('');
      const res = await chrome.runtime.sendMessage({ type: 'QUIZ_NOW' });
      if (res && res.shown) window.close();
      else say(REASONS[res && res.reason] || `Couldn't show a quiz (${(res && res.reason) || 'unknown'}).`);
    });

    $('block').addEventListener('click', async () => {
      if (!tabHost) return;
      await S.updateSettings((s) => {
        s.blocklist = [...s.blocklist, tabHost];
      });
      say('');
    });

    $('open-settings').addEventListener('click', () => chrome.runtime.openOptionsPage());
    $('open-stats').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('options.html#stats') }));
  }

  init();
})();
