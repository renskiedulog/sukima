// JLPT kanji starter set. Line format: kanji|meaning;meaning|onyomi (katakana, space-separated)|kunyomi (hiragana, "." = okurigana)|category (optional)
// Ids are content-based ("j_N5_水").
(function (root) {
  'use strict';

  const RAW = {
    N5: `
一|one|イチ イツ|ひと ひと.つ|number
二|two|ニ|ふた ふた.つ|number
三|three|サン|み み.つ|number
四|four|シ|よ よ.つ よん|number
五|five|ゴ|いつ いつ.つ|number
六|six|ロク|む む.つ|number
七|seven|シチ|なな なな.つ|number
八|eight|ハチ|や や.つ|number
九|nine|キュウ ク|ここの ここの.つ|number
十|ten|ジュウ|とお|number
百|hundred|ヒャク||number
千|thousand|セン|ち|number
万|ten thousand|マン バン||number
円|yen;circle|エン|まる.い
日|day;sun|ニチ ジツ|ひ か
月|month;moon|ゲツ ガツ|つき
火|fire|カ|ひ|nature
水|water|スイ|みず|nature
木|tree;wood|モク ボク|き|nature
金|gold;money|キン コン|かね
土|earth;soil|ド ト|つち|nature
年|year|ネン|とし|time
時|time;hour|ジ|とき|time
分|minute;part|ブン フン ブ|わ.かる わ.ける|time
半|half|ハン|なか.ば
今|now|コン キン|いま|time
何|what|カ|なに なん
先|previous;ahead|セン|さき
毎|every|マイ|
午|noon|ゴ||time
前|before;front|ゼン|まえ
後|after;behind|ゴ コウ|あと うし.ろ のち
週|week|シュウ||time
人|person|ジン ニン|ひと|people
男|man;male|ダン ナン|おとこ|people
女|woman;female|ジョ ニョ|おんな|people
子|child|シ ス|こ|people
父|father|フ|ちち|people
母|mother|ボ|はは|people
友|friend|ユウ|とも|people
名|name|メイ ミョウ|な
学|study;learning|ガク|まな.ぶ
生|life;birth|セイ ショウ|い.きる う.まれる なま
校|school|コウ||place
本|book;origin|ホン|もと
上|up;above|ジョウ|うえ あ.がる のぼ.る|direction
下|down;below|カ ゲ|した さ.がる くだ.る|direction
中|middle;inside|チュウ|なか|direction
外|outside|ガイ ゲ|そと ほか|direction
右|right|ウ ユウ|みぎ|direction
左|left|サ|ひだり|direction
東|east|トウ|ひがし|direction
西|west|セイ サイ|にし|direction
南|south|ナン|みなみ|direction
北|north|ホク|きた|direction
大|big|ダイ タイ|おお.きい|quality
小|small|ショウ|ちい.さい こ|quality
高|tall;expensive|コウ|たか.い|quality
安|cheap;safe|アン|やす.い|quality
長|long;leader|チョウ|なが.い
新|new|シン|あたら.しい|quality
古|old|コ|ふる.い|quality
白|white|ハク|しろ しろ.い|color
多|many|タ|おお.い|quality
少|few;little|ショウ|すく.ない すこ.し|quality
山|mountain|サン|やま|nature
川|river|セン|かわ|nature
田|rice field|デン|た|nature
天|heaven;sky|テン|あま|nature
気|spirit;air|キ ケ|
雨|rain|ウ|あめ|nature
電|electricity|デン|
花|flower|カ|はな|nature
空|sky;empty|クウ|そら あ.く から|nature
国|country|コク|くに|place
車|car;vehicle|シャ|くるま
道|road;way|ドウ|みち|place
駅|station|エキ||place
店|shop|テン|みせ|place
社|company;shrine|シャ|やしろ|place
会|meet;meeting|カイ|あ.う
食|eat;food|ショク|た.べる
飲|drink|イン|の.む|action
見|see;look|ケン|み.る|action
聞|hear;listen|ブン モン|き.く|action
話|talk;speak|ワ|はな.す はなし|action
読|read|ドク|よ.む|action
書|write|ショ|か.く|action
言|say|ゲン ゴン|い.う こと|action
行|go|コウ ギョウ|い.く おこな.う|action
来|come|ライ|く.る|action
出|exit;go out|シュツ|で.る だ.す|action
入|enter|ニュウ|はい.る い.れる|action
休|rest|キュウ|やす.む|action
買|buy|バイ|か.う|action
立|stand|リツ|た.つ|action
目|eye|モク|め|body
耳|ear|ジ|みみ|body
口|mouth|コウ ク|くち|body
手|hand|シュ|て|body
足|foot;leg;sufficient|ソク|あし た.りる|body
語|language;word|ゴ|かた.る
間|interval;between|カン ケン|あいだ ま
`,
    N4: `
事|thing;matter|ジ|こと
自|oneself|ジ シ|みずか.ら
者|person|シャ|もの|people
業|business;work|ギョウ|わざ
発|departure;emit|ハツ ホツ|
場|place|ジョウ|ば|place
体|body|タイ|からだ|body
力|power;strength|リョク リキ|ちから
物|thing|ブツ モツ|もの
品|goods;article|ヒン|しな
心|heart;mind|シン|こころ
思|think|シ|おも.う|action
知|know|チ|し.る|action
考|consider;think about|コウ|かんが.える|action
意|idea;mind|イ|
味|flavor;taste|ミ|あじ
問|question|モン|と.う
題|topic;subject|ダイ|
答|answer|トウ|こた.える こた.え
教|teach|キョウ|おし.える|action
習|learn|シュウ|なら.う|action
勉|exertion;endeavor|ベン|
強|strong|キョウ ゴウ|つよ.い|quality
弱|weak|ジャク|よわ.い|quality
早|early|ソウ|はや.い
朝|morning|チョウ|あさ|time
昼|noon;daytime|チュウ|ひる|time
夜|night|ヤ|よる よ|time
夕|evening|セキ|ゆう|time
春|spring|シュン|はる|time
夏|summer|カ|なつ|time
秋|autumn|シュウ|あき|time
冬|winter|トウ|ふゆ|time
色|color|ショク シキ|いろ|color
赤|red|セキ|あか あか.い|color
青|blue|セイ|あお あお.い|color
黒|black|コク|くろ くろ.い|color
近|near|キン|ちか.い|quality
遠|far|エン|とお.い|quality
重|heavy|ジュウ チョウ|おも.い かさ.ねる|quality
軽|light (weight)|ケイ|かる.い|quality
明|bright|メイ ミョウ|あか.るい あ.ける
暗|dark|アン|くら.い
病|illness;sick|ビョウ|や.む
院|institution|イン||place
医|doctor;medicine|イ|
薬|medicine;drug|ヤク|くすり
料|fee;materials|リョウ|
理|reason;logic|リ|
家|house;home|カ ケ|いえ や|place
族|family;tribe|ゾク||people
兄|older brother|ケイ キョウ|あに|people
姉|older sister|シ|あね|people
弟|younger brother|テイ ダイ|おとうと|people
妹|younger sister|マイ|いもうと|people
歩|walk|ホ|ある.く|action
走|run|ソウ|はし.る|action
持|hold;have|ジ|も.つ|action
待|wait|タイ|ま.つ|action
使|use|シ|つか.う|action
作|make|サク|つく.る|action
送|send|ソウ|おく.る|action
始|begin;start|シ|はじ.める|action
終|end;finish|シュウ|お.わる|action
開|open|カイ|ひら.く あ.ける|action
`,
    N3: `
政|politics;government|セイ|まつりごと|government
経|manage;pass through|ケイ|へ.る
済|settle;finish|サイ|す.む
治|govern;cure|ジ チ|おさ.める なお.る
法|law;method|ホウ||government
律|rhythm;law|リツ||government
権|authority;rights|ケン||government
利|profit;advantage|リ|き.く
際|occasion;edge|サイ|きわ
関|barrier;relation|カン|せき
係|person in charge;connection|ケイ|かか.る かかり
解|unravel;solve|カイ|と.く
決|decide|ケツ|き.める|action
定|determine;fix|テイ ジョウ|さだ.める
変|change;strange|ヘン|か.わる
化|transform;change|カ ケ|ば.ける
増|increase|ゾウ|ふ.える ま.す|action
減|decrease|ゲン|へ.る|action
過|pass;exceed|カ|す.ぎる
去|leave;past|キョ コ|さ.る
現|present;appear|ゲン|あらわ.れる
在|exist;be located|ザイ|あ.る
存|exist;be aware of|ソン ゾン|
続|continue|ゾク|つづ.く|action
両|both|リョウ|
全|whole;all|ゼン|まった.く
部|section;part|ブ|
役|role;service|ヤク エキ|
員|member|イン|
議|deliberation|ギ||government
選|choose;select|セン|えら.ぶ|action
挙|raise|キョ|あ.げる
戦|war;battle|セン|たたか.う いくさ
争|conflict;dispute|ソウ|あらそ.う
平|flat;peace|ヘイ ビョウ|たい.ら ひら
和|harmony;Japan|ワ|やわ.らぐ なご.む
告|announce;inform|コク|つ.げる
報|report;news|ホウ|むく.いる
情|feeling;emotion|ジョウ|なさ.け|emotion
感|feeling;sense|カン||emotion
想|concept;idea|ソウ|
静|quiet|セイ|しず.か|quality
深|deep|シン|ふか.い|quality
浅|shallow|セン|あさ.い|quality
残|remain;leftover|ザン|のこ.る
願|petition;wish|ガン|ねが.う
望|hope;desire|ボウ|のぞ.む
記|record;write down|キ|しる.す
録|record|ロク|
製|manufacture|セイ|
造|create;build|ゾウ|つく.る
材|material;lumber|ザイ|
果|fruit;result|カ|は.たす
験|test;verify|ケン|
助|help|ジョ|たす.ける|action
守|protect;guard|シュ ス|まも.る|action
失|lose|シツ|うしな.う|action
例|example|レイ|たと.える
点|point;dot|テン|
由|reason;cause|ユ ユウ|よし
`,
    N2: `
援|help;assist|エン|
護|protect|ゴ|
象|elephant;phenomenon|ショウ ゾウ|
像|image;statue|ゾウ|
導|guide;lead|ドウ|みちび.く
層|layer;stratum|ソウ|
境|boundary;border|キョウ ケイ|さかい
略|abbreviation;omit|リャク|
臨|look to;face|リン|のぞ.む
恵|blessing;favor|ケイ エ|めぐ.む
輸|transport|ユ|
貿|trade|ボウ|
募|recruit;gather|ボ|つの.る
販|sell;market|ハン|
策|plan;policy|サク|
崩|crumble;collapse|ホウ|くず.れる
患|afflicted;illness|カン|わずら.う
療|heal;cure|リョウ|
豊|abundant;rich|ホウ|ゆた.か|quality
乏|scarce;poor|ボウ|とぼ.しい|quality
劇|drama;play|ゲキ|
刻|engrave;carve|コク|きざ.む
符|token;sign|フ|
渋|astringent;reluctant|ジュウ|しぶ しぶ.い
濃|thick;dense|ノウ|こ.い|quality
薄|thin;pale|ハク|うす.い|quality
緩|slack;loose|カン|ゆる.い ゆる.やか|quality
鋭|sharp;keen|エイ|するど.い|quality
鈍|dull;blunt|ドン|にぶ.い|quality
憎|hate|ゾウ|にく.む
怒|angry|ド|おこ.る いか.る|emotion
恐|fear|キョウ|おそ.れる おそ.ろしい|emotion
脳|brain|ノウ||body
胸|chest|キョウ|むね|body
腰|waist;hips|ヨウ|こし|body
溶|melt;dissolve|ヨウ|と.ける|action
沈|sink|チン|しず.む|action
浮|float|フ|う.く|action
凍|freeze|トウ|こお.る|action
燃|burn|ネン|も.える|action
`,
    N1: `
謙|humble;modest|ケン|
譲|defer;yield|ジョウ|ゆず.る
璧|sphere;jewel|ヘキ|
叙|describe;confer|ジョ|
逸|deviate;elude|イツ|そ.れる
摂|take in;absorb|セツ|と.る
該|above-stated;the said|ガイ|
顕|appear;manifest|ケン|あらわ.れる
懸|hang;suspend|ケン ケ|か.ける
緒|cord;beginning|ショ チョ|お
培|cultivate;foster|バイ|つちか.う|action
阻|thwart;obstruct|ソ|はば.む|action
覆|overturn;cover|フク|おお.う くつがえ.す
携|carry;portable|ケイ|たずさ.える たずさ.わる|action
賄|bribe;provide|ワイ|まかな.う
潔|pure;clean|ケツ|いさぎよ.い
紛|distract;confuse|フン|まぎ.れる
斬|chop;behead|ザン|き.る
滞|stagnate;stay|タイ|とどこお.る
督|supervise;coach|トク|
篤|fervent;cordial|トク|あつ.い
崇|revere;worship|スウ|あが.める
尚|esteem;furthermore|ショウ|なお
翻|flip;translate|ホン|ひるがえ.る|action
伺|visit (humble);inquire|シ|うかが.う
嘆|lament;sigh|タン|なげ.く
魂|soul;spirit|コン|たましい
犠|sacrifice|ギ|
牲|animal sacrifice|セイ|
稼|earn;work|カ|かせ.ぐ|action
`,
  };

  const words = (s) => (s || '').trim().split(/\s+/).filter(Boolean);

  const out = [];
  for (const [level, block] of Object.entries(RAW)) {
    for (const line of block.split('\n')) {
      if (!line.trim()) continue;
      const [kanji, meanings, on, kun, cat] = line.split('|');
      out.push({
        id: `j_${level}_${kanji.trim()}`,
        kanji: kanji.trim(),
        meanings: meanings.split(';').map((m) => m.trim()),
        onyomi: words(on),
        kunyomi: words(kun),
        level,
        ...(cat && cat.trim() ? { cat: cat.trim() } : {}),
      });
    }
  }

  root.SUKIMA_KANJI = out;
})(typeof self !== 'undefined' ? self : globalThis);
