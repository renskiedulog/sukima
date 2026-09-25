(() => {
  "use strict";

  const S = self.SukimaSettings;
  const E = self.SukimaEngine;
  const I = self.SukimaIcons;
  const $ = (id) => document.getElementById(id);

  const data = E.getData();

  const KANA_GROUPS = {
    basic: "Basic",
    dakuten: "Dakuten",
    yoon: "Yōon",
    extended: "Extended",
  };
  const KANA_SAMPLES = {
    hiragana: { basic: "あ", dakuten: "が", yoon: "きゃ" },
    katakana: { basic: "ア", dakuten: "ガ", yoon: "キャ", extended: "ファ" },
  };
  const COURSE_COPY = {
    kana: { name: "Kana", desc: "Hiragana and katakana, one set at a time." },
    vocab: { name: "Vocabulary", desc: "JLPT word lists, N5 is the easiest." },
    kanji: { name: "Kanji", desc: "Meanings and readings, on and kun." },
    grammar: {
      name: "Grammar",
      desc: "Fill in the missing particle or pattern.",
    },
  };
  const STYLE_COPY = {
    mc: { name: "Multiple choice", desc: "Pick the answer from four options." },
    type: {
      name: "Type the answer",
      desc: "Type the romaji, reading, meaning or particle.",
    },
    kana: {
      name: "Kana and romaji",
      desc: "Read kana as romaji, or find the kana for a sound.",
    },
    fill: { name: "Fill in the blank", desc: "Complete an example sentence." },
    match: {
      name: "Match pairs",
      desc: "Connect four words, kanji or kana to their meaning, reading or romaji.",
    },
    tf: {
      name: "True or false",
      desc: "Judge one statement about a kana, word or kanji.",
    },
    odd: {
      name: "Odd one out",
      desc: "Spot the item that doesn't share a kana row or topic.",
    },
  };
  const INTERVAL_PRESETS = [5, 10, 15, 30, 60];
  const DAYS = [
    [1, "Mon"],
    [2, "Tue"],
    [3, "Wed"],
    [4, "Thu"],
    [5, "Fri"],
    [6, "Sat"],
    [0, "Sun"],
  ];

  let settings = null;

  // ---------- saving ----------
  // Each change is a mutation applied locally right away, then replayed onto freshly loaded
  // settings when saving, so edits made elsewhere (pause, block from the popup) aren't overwritten.

  let pending = [];
  let flushTimer = null;
  let savedTimer = null;

  function change(mutate) {
    mutate(settings);
    pending.push(mutate);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, 250);
    updateStatus();
  }

  async function flush() {
    const batch = pending;
    pending = [];
    if (!batch.length) return;
    const saved = await S.updateSettings((s) => {
      for (const mutate of batch) mutate(s);
    });
    for (const mutate of pending) mutate(saved); // changes made while saving
    settings = saved;
    S.applyTheme(settings.theme);
    updateStatus();
    const el = $("saved");
    el.textContent = "Saved";
    clearTimeout(savedTimer);
    savedTimer = setTimeout(
      () => (el.textContent = "Changes save automatically"),
      1400,
    );
  }

  // ---------- helpers ----------

  function el(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat())
      if (c != null && c !== false) node.append(c);
    return node;
  }

  function switchButton(label, checked, onToggle) {
    const btn = el("button", {
      class: "switch",
      type: "button",
      role: "switch",
      "aria-checked": String(checked),
      "aria-label": label,
    });
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-checked") !== "true";
      btn.setAttribute("aria-checked", String(on));
      onToggle(on);
    });
    return btn;
  }

  function tile({ glyph, name, count, pressed, onToggle }) {
    const btn = el(
      "button",
      {
        class: "tile",
        type: "button",
        "aria-pressed": String(pressed),
        "aria-label": `${name}, ${count} items`,
      },
      el("span", { class: "glyph", lang: "ja", "aria-hidden": "true" }, glyph),
      el(
        "span",
        { class: "tile-meta", "aria-hidden": "true" },
        el("span", { class: "tile-name" }, name),
        el("span", { class: "tile-count" }, String(count)),
      ),
    );
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      onToggle(on);
    });
    return btn;
  }

  function blockHead(title, desc, control) {
    return el(
      "div",
      { class: "block-head" },
      el("div", {}, el("h2", {}, title), el("p", {}, desc)),
      control || null,
    );
  }

  // ---------- nav ----------

  const PANELS = ["study", "schedule", "sites", "appearance", "data", "stats"];

  function showPanel(name) {
    const panel = PANELS.includes(name) ? name : "study";
    for (const a of document.querySelectorAll(".nav a[data-panel]")) {
      if (a.dataset.panel === panel) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    for (const p of PANELS) $(`panel-${p}`).hidden = p !== panel;
  }

  // ---------- status ----------

  function updateStatus() {
    const n = E.buildCandidates(settings, data).length;
    $("status-count").textContent = String(n);
    $("status-text").textContent = n
      ? "items in rotation"
      : "Nothing to quiz. Turn on a course and a question style.";
    $("status").classList.toggle("warn", !n);
  }

  // ---------- study ----------

  function renderCourses() {
    const root = $("courses");
    root.replaceChildren();

    for (const courseId of Object.keys(E.COURSES)) {
      const cs = settings.courses[courseId];
      const copy = COURSE_COPY[courseId];
      const block = el("div", {
        class: "block course",
        "data-off": String(!cs.enabled),
      });
      const area = el("div", { class: "tiles-area" });

      if (courseId === "kana") {
        for (const script of ["hiragana", "katakana"]) {
          const tiles = el("div", { class: "tiles" });
          for (const group of Object.keys(cs[script])) {
            tiles.append(
              tile({
                glyph: KANA_SAMPLES[script][group],
                name: KANA_GROUPS[group],
                count: data.kana.filter(
                  (k) => k.script === script && k.group === group,
                ).length,
                pressed: cs[script][group],
                onToggle: (on) =>
                  change((s) => (s.courses.kana[script][group] = on)),
              }),
            );
          }
          area.append(
            el(
              "div",
              { class: "tile-row" },
              el(
                "span",
                { class: "row-label", lang: "ja" },
                script === "hiragana" ? "ひらがな" : "カタカナ",
              ),
              tiles,
            ),
          );
        }
      } else {
        const tiles = el("div", { class: "tiles" });
        for (const level of Object.keys(cs.levels)) {
          const items = data[courseId].filter((x) => x.level === level);
          const first = items[0];
          const glyph = !first
            ? level
            : courseId === "vocab"
              ? first.word
              : courseId === "kanji"
                ? first.kanji
                : first.answer;
          tiles.append(
            tile({
              glyph,
              name: level,
              count: items.length,
              pressed: cs.levels[level],
              onToggle: (on) =>
                change((s) => (s.courses[courseId].levels[level] = on)),
            }),
          );
        }
        area.append(tiles);
      }

      block.append(
        blockHead(
          copy.name,
          copy.desc,
          switchButton(copy.name, cs.enabled, (on) => {
            block.dataset.off = String(!on);
            change((s) => (s.courses[courseId].enabled = on));
          }),
        ),
        area,
      );
      root.append(block);
    }
  }

  function renderStyles() {
    const root = $("styles");
    root.replaceChildren();
    for (const type of Object.values(E.TYPES)) {
      const copy = STYLE_COPY[type.id] || { name: type.label, desc: "" };
      root.append(
        el(
          "div",
          { class: "row" },
          el("div", {}, el("strong", {}, copy.name), el("span", {}, copy.desc)),
          switchButton(copy.name, settings.types[type.id], (on) =>
            change((s) => (s.types[type.id] = on)),
          ),
        ),
      );
    }
  }

  // ---------- schedule ----------

  function renderInterval() {
    const seg = $("interval");
    const custom = $("custom-min");
    const paint = () => {
      for (const b of seg.children)
        b.setAttribute(
          "aria-pressed",
          String(Number(b.dataset.min) === settings.intervalMin),
        );
      custom.value = INTERVAL_PRESETS.includes(settings.intervalMin)
        ? ""
        : settings.intervalMin;
    };

    seg.replaceChildren(
      ...INTERVAL_PRESETS.map((m) =>
        el(
          "button",
          {
            type: "button",
            "data-min": m,
            onclick: () => {
              change((s) => (s.intervalMin = m));
              paint();
            },
          },
          String(m),
        ),
      ),
    );

    custom.addEventListener("change", () => {
      const n = Math.round(Number(custom.value));
      if (!Number.isFinite(n) || n < 1) return paint();
      change((s) => (s.intervalMin = n));
      paint();
    });

    paint();
  }

  function formatTime(t) {
    const [h, m] = t.split(":").map(Number);
    return new Date(2000, 0, 1, h, m).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function quietSummary() {
    const qh = settings.quietHours;
    const picked = DAYS.filter(([d]) => qh.days.includes(d)).map(
      ([, name]) => name,
    );
    let label = picked.join(", ");
    if (picked.length === 7) label = "Every day";
    else if (picked.join() === "Mon,Tue,Wed,Thu,Fri") label = "Weekdays";
    else if (picked.join() === "Sat,Sun") label = "Weekends";

    let text;
    if (!picked.length) text = "Pick at least one day.";
    else if (qh.start === qh.end) text = `${label}, all day.`;
    else
      text = `${label}, ${formatTime(qh.start)} to ${formatTime(qh.end)}${qh.end < qh.start ? " the next morning" : ""}.`;
    $("quiet-summary").textContent = text;
  }

  function renderQuiet() {
    const qh = settings.quietHours;
    const sw = $("quiet-switch");
    sw.setAttribute("aria-checked", String(qh.enabled));
    $("quiet-body").dataset.off = String(!qh.enabled);
    sw.addEventListener("click", () => {
      const on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on));
      $("quiet-body").dataset.off = String(!on);
      change((s) => (s.quietHours.enabled = on));
    });

    const days = $("days");
    days.replaceChildren(
      ...DAYS.map(([d, name]) => {
        const btn = el(
          "button",
          { type: "button", "aria-pressed": String(qh.days.includes(d)) },
          name,
        );
        btn.addEventListener("click", () => {
          const on = btn.getAttribute("aria-pressed") !== "true";
          btn.setAttribute("aria-pressed", String(on));
          change((s) => {
            const set = new Set(s.quietHours.days);
            on ? set.add(d) : set.delete(d);
            s.quietHours.days = [...set].sort();
          });
          quietSummary();
        });
        return btn;
      }),
    );

    for (const key of ["start", "end"]) {
      const input = $(`q-${key}`);
      input.value = qh[key];
      input.addEventListener("change", () => {
        if (!S.isTime(input.value))
          return (input.value = settings.quietHours[key]);
        change((s) => (s.quietHours[key] = input.value));
        quietSummary();
      });
    }

    quietSummary();
  }

  // ---------- sites ----------

  function renderSites() {
    const list = $("site-list");
    list.replaceChildren();
    if (!settings.blocklist.length) {
      list.append(
        el(
          "li",
          { class: "empty" },
          "No blocked sites. Add work tools or anywhere you need to focus.",
        ),
      );
      return;
    }
    for (const host of settings.blocklist) {
      list.append(
        el(
          "li",
          {},
          el("span", { class: "site-host" }, host),
          el("span", { class: "site-sub" }, "and subdomains"),
          el("button", {
            class: "icon-btn",
            type: "button",
            "aria-label": `Unblock ${host}`,
            html: I.svg("x"),
            onclick: () => {
              change(
                (s) => (s.blocklist = s.blocklist.filter((x) => x !== host)),
              );
              renderSites();
            },
          }),
        ),
      );
    }
  }

  function bindSiteForm() {
    const input = $("site-input");
    const err = $("site-error");
    $("add-site").addEventListener("submit", (e) => {
      e.preventDefault();
      const host = S.normalizeBlockEntry(input.value);
      if (!host) {
        err.textContent = "Enter a site address like example.com.";
        err.hidden = false;
        return;
      }
      const cover = settings.blocklist.find(
        (b) => host === b || host.endsWith("." + b),
      );
      if (cover) {
        err.textContent =
          cover === host
            ? `${host} is already blocked.`
            : `${host} is already blocked by ${cover}.`;
        err.hidden = false;
        return;
      }
      err.hidden = true;
      input.value = "";
      change(
        (s) => (s.blocklist = [host, ...s.blocklist.filter((x) => x !== host)]),
      );
      renderSites();
    });
    input.addEventListener("input", () => (err.hidden = true));
  }

  // ---------- appearance ----------

  function renderTheme() {
    const opts = document.querySelectorAll(".theme-opt");
    const paint = () => {
      for (const o of opts)
        o.setAttribute(
          "aria-checked",
          String(o.dataset.themeValue === settings.theme),
        );
    };
    for (const o of opts) {
      o.addEventListener("click", () => {
        change((s) => (s.theme = o.dataset.themeValue));
        S.applyTheme(settings.theme);
        paint();
      });
    }
    paint();
  }

  // ---------- data ----------

  function dataMsg(text, bad) {
    const m = $("data-msg");
    m.textContent = text;
    m.classList.toggle("bad", Boolean(bad));
  }

  function bindData() {
    $("export").addEventListener("click", async () => {
      const progress = await S.loadProgress();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              app: "sukima",
              version: 1,
              exportedAt: new Date().toISOString(),
              progress,
            },
            null,
            2,
          ),
        ],
        {
          type: "application/json",
        },
      );
      const a = el("a", {
        href: URL.createObjectURL(blob),
        download: `sukima-progress-${S.dayKey()}.json`,
      });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      dataMsg("Progress exported.");
    });

    $("import").addEventListener("click", () => $("import-file").click());
    $("import-file").addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        const json = JSON.parse(await file.text());
        const progress = json && json.progress ? json.progress : json;
        if (
          !progress ||
          typeof progress !== "object" ||
          typeof progress.items !== "object"
        ) {
          throw new Error("this file isn't a Sukima progress export");
        }
        if (!confirm("Replace your current progress with the imported file?"))
          return;
        const res = await chrome.runtime.sendMessage({
          type: "IMPORT_PROGRESS",
          progress,
        });
        dataMsg(`Progress imported for ${res.items} items.`);
      } catch (err) {
        dataMsg(`Import failed: ${err.message}.`, true);
      }
    });

    $("reset").addEventListener("click", async () => {
      if (!confirm("Reset all progress and stats? This cannot be undone."))
        return;
      await chrome.runtime.sendMessage({ type: "RESET_PROGRESS" });
      dataMsg("Progress reset.");
    });
  }

  // ---------- init ----------

  async function init() {
    settings = await S.loadSettings();
    S.applyTheme(settings.theme);
    I.hydrate(document);

    showPanel(location.hash.slice(1));
    window.addEventListener("hashchange", () =>
      showPanel(location.hash.slice(1)),
    );

    renderCourses();
    renderStyles();
    renderInterval();
    renderQuiet();
    renderSites();
    bindSiteForm();
    renderTheme();
    bindData();
    updateStatus();

    // Blocklist or other settings changed elsewhere (e.g. "Block this site" in the popup).
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local" || !changes.settings || pending.length) return;
      const fresh = await S.loadSettings();
      const sitesChanged = fresh.blocklist.join() !== settings.blocklist.join();
      settings = fresh;
      if (sitesChanged) renderSites();
      updateStatus();
    });
  }

  init();
})();
