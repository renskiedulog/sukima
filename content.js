// Content script: renders the quiz modal in a closed shadow root and reports results to the background.
(() => {
  'use strict';

  if (window.__sukimaContent) return;
  window.__sukimaContent = true;

  const S = self.SukimaSettings;
  const E = self.SukimaEngine;
  const HOST_ID = 'sukima-host';

  // lucide "x"
  const ICON_X =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  // Same files as shared/fonts.css. Loaded via FontFace from bytes, so page CSP (font-src) can't block them.
  const FONT_FILES = [
    ['rounded-500.woff2', '500'],
    ['rounded-700.woff2', '700'],
    ['rounded-800.woff2', '800'],
  ];

  let sheetPromise = null;
  let fontsPromise = null;
  let st = null; // open modal state

  // ---------- helpers ----------

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat()) if (c != null && c !== false) el.append(c);
    return el;
  }

  function send(msg) {
    try {
      return chrome.runtime.sendMessage(msg).catch(() => null);
    } catch {
      return Promise.resolve(null); // extension reloaded; this script is orphaned
    }
  }

  // Constructable stylesheet: not subject to the page's CSP, unlike <style>/<link>.
  function loadSheet() {
    if (!sheetPromise) {
      sheetPromise = fetch(chrome.runtime.getURL('content.css'))
        .then((r) => r.text())
        .then((css) => {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          return sheet;
        })
        .catch(() => null);
    }
    return sheetPromise;
  }

  function loadFonts() {
    if (!fontsPromise) {
      fontsPromise = Promise.all(
        FONT_FILES.map(async ([file, weight]) => {
          const res = await fetch(chrome.runtime.getURL(`fonts/${file}`));
          const face = new FontFace('Sukima Rounded', await res.arrayBuffer(), { weight, display: 'swap' });
          await face.load();
          document.fonts.add(face);
        })
      ).catch(() => null); // fall back to system fonts
    }
    return fontsPromise;
  }

  // Don't hold the quiz back on a slow font load; the text swaps in when ready.
  function upTo(ms, promise) {
    return Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))]);
  }

  function deepActiveElement() {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
    return el;
  }

  const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden']);

  function isEditable(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.tagName === 'TEXTAREA') return !el.disabled && !el.readOnly;
    if (el.tagName === 'INPUT') return !el.disabled && !el.readOnly && !NON_TEXT_INPUTS.has((el.type || 'text').toLowerCase());
    if (el.tagName === 'SELECT') return true;
    // A focused iframe may be an editor we can't look into (cross-origin); play safe.
    if (el.tagName === 'IFRAME') return true;
    return false;
  }

  function isOpen() {
    if (st && !st.host.isConnected) teardown(true); // page removed our host (SPA re-render)
    return Boolean(st);
  }

  function suppressionReason(force) {
    if (isOpen()) return 'already-open';
    if (force) return null;
    if (document.visibilityState !== 'visible') return 'tab-hidden';
    if (!document.hasFocus()) return 'tab-not-focused';
    if (document.fullscreenElement || document.webkitFullscreenElement) return 'fullscreen';
    if (isEditable(deepActiveElement())) return 'input-focused';
    return null;
  }

  // ---------- messaging ----------

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || msg.type !== 'SHOW_QUIZ') return false;
    const reason = suppressionReason(Boolean(msg.force));
    if (reason) {
      sendResponse({ shown: false, reason });
      return false;
    }
    openQuiz()
      .then((shown) => sendResponse(shown ? { shown: true } : { shown: false, reason: 'no-questions' }))
      .catch(() => sendResponse({ shown: false, reason: 'error' }));
    return true;
  });

  // ---------- modal lifecycle ----------

  async function openQuiz() {
    const [settings, progress, sheet] = await Promise.all([S.loadSettings(), S.loadProgress(), loadSheet(), upTo(400, loadFonts())]);
    const q = E.nextQuestion(settings, progress);
    if (!q || isOpen()) return false;
    mount(settings, sheet);
    render(q);
    return true;
  }

  function mount(settings, sheet) {
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText =
      'all:initial !important;position:fixed !important;inset:0 !important;z-index:2147483647 !important;display:block !important;';
    const root = host.attachShadow({ mode: 'closed' });
    if (sheet) root.adoptedStyleSheets = [sheet];

    const backdrop = h('div', { class: 'backdrop', 'data-theme': S.resolveTheme(settings.theme) });
    const card = h('div', { class: 'card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sk-prompt', tabindex: '-1' });
    backdrop.append(card);
    root.append(backdrop);

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close();
    });
    // Keep clicks inside the modal from reaching page "click outside" handlers.
    for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'wheel']) {
      host.addEventListener(type, (e) => e.stopPropagation());
    }

    st = {
      host,
      root,
      backdrop,
      card,
      q: null,
      answered: false,
      pending: null,
      optionButtons: [],
      prevFocus: deepActiveElement(),
      onKey,
      onKeyOther,
      onFocusIn,
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyOther, true);
    window.addEventListener('keypress', onKeyOther, true);
    document.addEventListener('focusin', onFocusIn, true);

    document.documentElement.append(host);
  }

  function render(q) {
    st.q = q;
    st.answered = false;
    st.pending = null;
    st.match = null;
    st.card.classList.remove('is-right', 'is-wrong');
    st.card.replaceChildren();

    const closeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Close quiz', html: ICON_X, onclick: close });
    const header = h(
      'div',
      { class: 'head' },
      h('span', { class: 'chip' }, q.courseLabel),
      h('span', { class: 'chip chip-muted' }, q.typeLabel),
      h('span', { class: 'spacer' }),
      closeBtn
    );

    const prompt = h('div', { id: 'sk-prompt', class: `prompt prompt-${q.promptKind}`, lang: q.promptKind === 'latin' ? 'en' : 'ja' });
    if (q.promptKind === 'sentence') {
      const [before, after] = q.prompt.split('＿');
      prompt.append(before, h('span', { class: 'blank' }, '　　'), after || '');
    } else {
      prompt.textContent = q.prompt;
      if ([...q.prompt].length > 4 && q.promptKind === 'ja') prompt.classList.add('prompt-long');
    }

    // True/false: the statement being judged, e.g. 猫 + 'means "dog"'.
    const claim = q.claim ? h('div', { class: 'claim', lang: 'ja' }, q.claim) : '';
    const sub = h('div', { class: 'sub' }, q.promptSub || '');

    const answerArea = h('div', { class: 'answer' });
    st.optionButtons = [];
    let firstFocus;
    if (q.input === 'choice') {
      const grid = h('div', { class: `options options-${q.optionKind || 'ja'}` });
      q.options.forEach((opt, i) => {
        const btn = h(
          'button',
          { class: 'opt', type: 'button', onclick: () => answer(opt, btn) },
          h('kbd', {}, String(i + 1)),
          h('span', { class: 'opt-text', lang: q.optionKind === 'latin' ? 'en' : 'ja' }, opt)
        );
        st.optionButtons.push(btn);
        grid.append(btn);
      });
      answerArea.append(grid);
      firstFocus = st.optionButtons[0];
    } else if (q.input === 'match') {
      firstFocus = renderMatch(q, answerArea);
    } else {
      const input = h('input', {
        class: 'text-input',
        type: 'text',
        autocomplete: 'off',
        autocapitalize: 'off',
        spellcheck: 'false',
        'aria-label': q.promptSub || 'Your answer',
        placeholder: q.placeholder || 'answer',
        lang: q.answerKind === 'kana' ? 'ja' : 'en',
      });
      const form = h(
        'form',
        {
          class: 'typed',
          onsubmit: (e) => {
            e.preventDefault();
            if (st.answered) return next();
            if (input.value.trim()) answer(input.value, null);
          },
        },
        input,
        h('button', { class: 'btn btn-primary', type: 'submit' }, 'Check')
      );
      st.input = input;
      st.form = form;
      answerArea.append(form);
      firstFocus = input;
    }

    const result = h('div', { class: 'result', role: 'status', 'aria-live': 'polite', hidden: true });
    const nextBtn = h('button', { class: 'btn btn-primary', type: 'button', onclick: next }, 'Next');
    const footer = h(
      'div',
      { class: 'foot', hidden: true },
      h('button', { class: 'btn', type: 'button', onclick: close }, 'Close'),
      nextBtn
    );

    Object.assign(st, { result, footer, nextBtn });
    st.card.append(header, prompt, claim, sub, answerArea, result, footer);
    (firstFocus || st.card).focus({ preventScroll: true });
  }

  // ---------- match pairs ----------

  const RIGHT_KEYS = ['A', 'B', 'C', 'D'];

  function renderMatch(q, area) {
    const m = { left: null, right: null, matched: new Set(), missed: new Set(), leftBtns: [], rightBtns: [], busy: false };
    st.match = m;
    const lang = (kind) => (kind === 'latin' ? 'en' : 'ja');

    const leftCol = h('div', { class: 'match-col', role: 'group', 'aria-label': 'Match from' });
    q.pairs.forEach((p, i) => {
      const btn = h(
        'button',
        { class: `mbtn mbtn-${q.leftKind}`, type: 'button', 'aria-pressed': 'false', onclick: () => pick('left', i) },
        h('kbd', {}, String(i + 1)),
        h('span', { class: 'mbtn-text', lang: lang(q.leftKind) }, p.left)
      );
      m.leftBtns.push(btn);
      leftCol.append(btn);
    });

    const rightCol = h('div', { class: 'match-col', role: 'group', 'aria-label': 'Match to' });
    q.rightOrder.forEach((pairIdx, slot) => {
      const btn = h(
        'button',
        { class: `mbtn mbtn-${q.rightKind}`, type: 'button', 'aria-pressed': 'false', onclick: () => pick('right', slot) },
        h('kbd', {}, RIGHT_KEYS[slot]),
        h('span', { class: 'mbtn-text', lang: lang(q.rightKind) }, q.pairs[pairIdx].right)
      );
      m.rightBtns.push(btn);
      rightCol.append(btn);
    });

    area.append(h('div', { class: 'match' }, leftCol, rightCol));
    return m.leftBtns[0];
  }

  // Select a box on either side; once one of each is selected, check the pair.
  function pick(side, index) {
    if (!st || st.answered || !st.match || st.match.busy) return;
    const m = st.match;
    const btns = side === 'left' ? m.leftBtns : m.rightBtns;
    if (btns[index].disabled) return;
    m[side] = m[side] === index ? null : index;
    btns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === m[side])));
    if (m.left == null || m.right == null) return;

    const L = m.left;
    const leftBtn = m.leftBtns[L];
    const rightBtn = m.rightBtns[m.right];
    const rightText = st.q.pairs[st.q.rightOrder[m.right]].right;
    m.left = m.right = null;
    leftBtn.setAttribute('aria-pressed', 'false');
    rightBtn.setAttribute('aria-pressed', 'false');

    if (E.checkPair(st.q, L, rightText)) {
      const color = m.matched.size; // pairs get colours in the order they're matched
      m.matched.add(L);
      for (const b of [leftBtn, rightBtn]) {
        b.disabled = true;
        b.classList.add('matched', `pair-${color}`);
      }
      if (m.matched.size === st.q.pairs.length) return finishMatch();
      const nextLeft = m.leftBtns.find((b) => !b.disabled);
      if (nextLeft) nextLeft.focus({ preventScroll: true });
    } else {
      m.missed.add(L);
      m.busy = true;
      leftBtn.classList.add('wrong');
      rightBtn.classList.add('wrong');
      setTimeout(() => {
        leftBtn.classList.remove('wrong');
        rightBtn.classList.remove('wrong');
        m.busy = false;
      }, 450);
    }
  }

  function finishMatch() {
    const q = st.q;
    const m = st.match;
    st.answered = true;
    const total = q.pairs.length;
    const perfect = m.missed.size === 0;
    st.card.classList.add(perfect ? 'is-right' : 'is-wrong');
    st.result.replaceChildren(
      h('div', { class: 'verdict' }, perfect ? 'All matched' : `${total - m.missed.size} of ${total} right on the first try`),
      q.note ? h('div', { class: 'note', lang: 'ja' }, q.note) : ''
    );
    st.result.hidden = false;
    st.footer.hidden = false;
    st.nextBtn.focus({ preventScroll: true });
    // Each item gets its own result: missed once = counts as a miss.
    st.pending = Promise.all(
      q.pairs.map((p, i) => send({ type: 'ANSWERED', itemId: p.itemId, correct: !m.missed.has(i), courseId: q.courseId }))
    );
  }

  function answer(value, button) {
    if (!st || st.answered) return;
    const q = st.q;
    st.answered = true;
    const correct = E.check(q, value);

    if (q.input === 'choice') {
      for (const btn of st.optionButtons) {
        btn.disabled = true;
        const text = btn.querySelector('.opt-text').textContent;
        if (E.check(q, text)) btn.classList.add('right');
      }
      if (!correct && button) button.classList.add('wrong');
    } else {
      st.input.readOnly = true;
      st.form.classList.add(correct ? 'right' : 'wrong');
      st.form.querySelector('button').hidden = true;
    }

    st.card.classList.add(correct ? 'is-right' : 'is-wrong');
    st.result.replaceChildren(
      h('div', { class: 'verdict' }, correct ? 'Correct' : h('span', {}, 'Answer: ', h('strong', { lang: 'ja' }, q.reveal))),
      q.note ? h('div', { class: 'note', lang: 'ja' }, q.note) : ''
    );
    st.result.hidden = false;
    st.footer.hidden = false;
    st.nextBtn.focus({ preventScroll: true });

    st.pending = send({ type: 'ANSWERED', itemId: q.itemId, correct, courseId: q.courseId });
  }

  async function next() {
    if (!st) return;
    const mine = st;
    await mine.pending; // let the background record heat before picking again
    if (st !== mine) return;
    try {
      const [settings, progress] = await Promise.all([S.loadSettings(), S.loadProgress()]);
      const q = E.nextQuestion(settings, progress);
      if (!q || st !== mine) return close();
      st.backdrop.dataset.theme = S.resolveTheme(settings.theme);
      render(q);
    } catch {
      close();
    }
  }

  function close() {
    if (!st) return;
    teardown(false);
    send({ type: 'QUIZ_CLOSED' });
  }

  function teardown(silent) {
    const s = st;
    st = null;
    window.removeEventListener('keydown', s.onKey, true);
    window.removeEventListener('keyup', s.onKeyOther, true);
    window.removeEventListener('keypress', s.onKeyOther, true);
    document.removeEventListener('focusin', s.onFocusIn, true);
    s.host.remove();
    if (!silent && s.prevFocus && s.prevFocus.isConnected && typeof s.prevFocus.focus === 'function') {
      try {
        s.prevFocus.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  }

  // ---------- keyboard + focus trap ----------

  function focusables() {
    return [...st.card.querySelectorAll('button:not([disabled]), input:not([disabled])')].filter(
      (el) => !el.closest('[hidden]') && !el.hidden
    );
  }

  function onKey(e) {
    if (!st) return;
    // Page shortcuts never see keys while the modal is open; default actions (typing, Enter-to-submit) still run.
    e.stopImmediatePropagation();
    const active = st.root.activeElement;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const f = focusables();
      if (!f.length) return;
      const i = f.indexOf(active);
      const n = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : i === f.length - 1 ? 0 : i + 1;
      f[n].focus();
      return;
    }

    if (e.isComposing) return; // IME in progress

    const typing = active && active.tagName === 'INPUT' && !active.readOnly;
    if (!st.answered && st.q.input === 'match' && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const left = '1234'.indexOf(e.key);
      const right = 'abcd'.indexOf(e.key.toLowerCase());
      if (left >= 0 || right >= 0) {
        e.preventDefault();
        if (left >= 0) pick('left', left);
        else pick('right', right);
      }
      return;
    }

    if (!typing && !st.answered && st.q.input === 'choice' && /^[1-4]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const btn = st.optionButtons[Number(e.key) - 1];
      if (btn) {
        e.preventDefault();
        btn.click();
      }
      return;
    }

    if (e.key === 'Enter' && st.answered && !(active && active.tagName === 'BUTTON')) {
      e.preventDefault();
      next();
    }
  }

  function onKeyOther(e) {
    if (st) e.stopImmediatePropagation();
  }

  function onFocusIn(e) {
    if (!st || e.composedPath().includes(st.host)) return;
    const f = focusables();
    (f[0] || st.card).focus({ preventScroll: true });
  }
})();
