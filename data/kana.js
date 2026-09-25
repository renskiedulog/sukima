// Kana dataset. Katakana basic/dakuten/yōon are derived from the hiragana tables.
// Ids are content-based ("h_basic_あ") so reordering never breaks stored progress.
(function (root) {
  'use strict';

  const HIRAGANA = {
    basic:
      'あ:a|い:i|う:u|え:e|お:o|か:ka|き:ki|く:ku|け:ke|こ:ko|さ:sa|し:shi,si|す:su|せ:se|そ:so|' +
      'た:ta|ち:chi,ti|つ:tsu,tu|て:te|と:to|な:na|に:ni|ぬ:nu|ね:ne|の:no|は:ha|ひ:hi|ふ:fu,hu|へ:he|ほ:ho|' +
      'ま:ma|み:mi|む:mu|め:me|も:mo|や:ya|ゆ:yu|よ:yo|ら:ra|り:ri|る:ru|れ:re|ろ:ro|わ:wa|を:wo,o|ん:n,nn',
    dakuten:
      'が:ga|ぎ:gi|ぐ:gu|げ:ge|ご:go|ざ:za|じ:ji,zi|ず:zu|ぜ:ze|ぞ:zo|だ:da|ぢ:ji,di,zi|づ:zu,du,dzu|で:de|ど:do|' +
      'ば:ba|び:bi|ぶ:bu|べ:be|ぼ:bo|ぱ:pa|ぴ:pi|ぷ:pu|ぺ:pe|ぽ:po',
    yoon:
      'きゃ:kya|きゅ:kyu|きょ:kyo|しゃ:sha,sya|しゅ:shu,syu|しょ:sho,syo|ちゃ:cha,tya,cya|ちゅ:chu,tyu,cyu|ちょ:cho,tyo,cyo|' +
      'にゃ:nya|にゅ:nyu|にょ:nyo|ひゃ:hya|ひゅ:hyu|ひょ:hyo|みゃ:mya|みゅ:myu|みょ:myo|りゃ:rya|りゅ:ryu|りょ:ryo|' +
      'ぎゃ:gya|ぎゅ:gyu|ぎょ:gyo|じゃ:ja,zya,jya|じゅ:ju,zyu,jyu|じょ:jo,zyo,jyo|びゃ:bya|びゅ:byu|びょ:byo|ぴゃ:pya|ぴゅ:pyu|ぴょ:pyo',
  };

  const KATAKANA_EXTENDED =
    'ファ:fa|フィ:fi|フェ:fe|フォ:fo|ティ:ti,thi|ディ:di,dhi|トゥ:tu,twu|ドゥ:du,dwu|ウィ:wi|ウェ:we|ウォ:wo|' +
    'ヴァ:va|ヴィ:vi|ヴ:vu|ヴェ:ve|ヴォ:vo|シェ:she|ジェ:je|チェ:che|ツァ:tsa';

  const toKata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

  function parse(table, script, group, map = (k) => k) {
    return table.split('|').map((entry) => {
      const [kana, romaji] = entry.split(':');
      const k = map(kana);
      return { id: `${script[0]}_${group}_${k}`, script, group, kana: k, romaji: romaji.split(',') };
    });
  }

  const out = [];
  for (const group of Object.keys(HIRAGANA)) out.push(...parse(HIRAGANA[group], 'hiragana', group));
  for (const group of Object.keys(HIRAGANA)) out.push(...parse(HIRAGANA[group], 'katakana', group, toKata));
  out.push(...parse(KATAKANA_EXTENDED, 'katakana', 'extended'));

  root.SUKIMA_KANA = out;
})(typeof self !== 'undefined' ? self : globalThis);
