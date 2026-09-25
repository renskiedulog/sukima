// Builds fonts/*.woff2: downloads the OFL fonts from the Google Fonts repo (cached in node_modules/.cache),
// subsets them to the characters Sukima can show, and copies the licenses.
// Run with: npm run fonts   (re-run after adding new kanji/words to data/*.js)
const fs = require('fs');
const path = require('path');
const subsetFont = require('subset-font');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'fonts');
const CACHE = path.join(ROOT, 'node_modules', '.cache', 'sukima-fonts');
const BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/';

const FONTS = [
  { src: 'mplusrounded1c/MPLUSRounded1c-Medium.ttf', out: 'rounded-500.woff2' },
  { src: 'mplusrounded1c/MPLUSRounded1c-Bold.ttf', out: 'rounded-700.woff2' },
  { src: 'mplusrounded1c/MPLUSRounded1c-ExtraBold.ttf', out: 'rounded-800.woff2' },
  { src: 'mochiypopone/MochiyPopOne-Regular.ttf', out: 'pop-400.woff2' },
];

// The mplusrounded1c folder has no OFL.txt; its METADATA.pb says license "OFL" with the copyright below,
// so that file is built from the (identical) OFL 1.1 text with the right copyright line.
const OFL_TEXT_FROM = 'mochiypopone/OFL.txt';
const LICENSES = [
  { out: 'OFL-MochiyPopOne.txt' },
  { out: 'OFL-MPLUSRounded1c.txt', copyright: 'Copyright 2016 The Rounded M+ Project Authors.' },
];

// Always included, so new kana-only or English content never falls back to a system font.
const BASE_RANGES = [
  [0x20, 0x7e], // ASCII
  [0xa0, 0xff], // Latin-1 (é, ·, etc.)
  [0x100, 0x17f], // Latin Extended-A (ō, ū for romaji)
  [0x2010, 0x2027], // dashes, quotes, ellipsis
  [0x2190, 0x2194], // arrows
  [0x3000, 0x303f], // CJK punctuation (、。「」)
  [0x3040, 0x309f], // hiragana
  [0x30a0, 0x30ff], // katakana
  [0x31f0, 0x31ff], // katakana extensions
  [0xff01, 0xff5e], // fullwidth forms (＿ ！)
];

// Folders that never ship in the extension.
const SKIP_DIRS = new Set(['node_modules', '.git', 'fonts', 'mockups', 'tests', 'tools', '.playwright-mcp']);

function projectChars() {
  const chars = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name));
      } else if (/\.(js|html|css)$/.test(entry.name)) {
        for (const ch of fs.readFileSync(path.join(dir, entry.name), 'utf8')) {
          if (ch.codePointAt(0) > 0x7e) chars.add(ch);
        }
      }
    }
  };
  walk(ROOT);
  return chars;
}

async function cached(rel) {
  const dest = path.join(CACHE, rel);
  if (!fs.existsSync(dest)) {
    const res = await fetch(BASE + rel);
    if (!res.ok) throw new Error(`Download failed (${res.status}): ${BASE + rel}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`downloaded ${rel}`);
  }
  return fs.readFileSync(dest);
}

async function main() {
  const chars = projectChars();
  for (const [from, to] of BASE_RANGES) for (let cp = from; cp <= to; cp++) chars.add(String.fromCodePoint(cp));
  const text = [...chars].join('');
  console.log(`${chars.size} characters`);

  fs.mkdirSync(OUT, { recursive: true });
  for (const font of FONTS) {
    const subset = await subsetFont(await cached(font.src), text, { targetFormat: 'woff2' });
    fs.writeFileSync(path.join(OUT, font.out), subset);
    console.log(`fonts/${font.out}  ${(subset.length / 1024).toFixed(0)} KB`);
  }
  const ofl = (await cached(OFL_TEXT_FROM)).toString('utf8');
  const body = ofl.slice(ofl.indexOf('This Font Software is licensed'));
  if (body === ofl || !body) throw new Error(`Unexpected license format in ${OFL_TEXT_FROM}`);
  for (const lic of LICENSES) {
    fs.writeFileSync(path.join(OUT, lic.out), lic.copyright ? `${lic.copyright}\n\n${body}` : ofl);
  }
  console.log('licenses written');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
