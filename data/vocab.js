// JLPT vocab starter set. Line format: word|reading|meaning;meaning|example ja (＿ = word)|example en|category (optional, see CATEGORY_LABELS in shared/engine.js)
// Ids are content-based ("v_N5_水") so lists can be reordered or grown without breaking progress.
(function (root) {
  'use strict';

  const RAW = {
    N5: `
水|みず|water|毎朝＿を飲みます。|I drink water every morning.
山|やま|mountain|週末に＿に登りました。|I climbed a mountain on the weekend.|nature
川|かわ|river|＿で魚を釣ります。|I fish in the river.|nature
本|ほん|book|図書館で＿を借りました。|I borrowed a book at the library.
学校|がっこう|school|毎日＿へ行きます。|I go to school every day.|place
先生|せんせい|teacher|＿に質問しました。|I asked the teacher a question.|people
学生|がくせい|student|私は＿です。|I am a student.|people
友達|ともだち|friend|＿と映画を見ました。|I watched a movie with a friend.|people
電車|でんしゃ|train|＿で会社に行きます。|I go to work by train.|transport
駅|えき|station|＿はどこですか。|Where is the station?|place
車|くるま|car|新しい＿を買いました。|I bought a new car.|transport
家|いえ|house;home|＿に帰ります。|I'm going home.|place
猫|ねこ|cat|＿が好きです。|I like cats.
犬|いぬ|dog|＿と散歩します。|I go for a walk with the dog.
魚|さかな|fish|夕飯に＿を食べました。|I ate fish for dinner.
肉|にく|meat|この店の＿は高いです。|The meat at this shop is expensive.|food
野菜|やさい|vegetables|毎日＿を食べましょう。|Let's eat vegetables every day.|food
お茶|おちゃ|tea;green tea|＿を一杯ください。|A cup of tea, please.|food
朝ご飯|あさごはん|breakfast|＿を食べましたか。|Did you eat breakfast?|food
時計|とけい|clock;watch|この＿は父のです。|This watch is my father's.
電話|でんわ|telephone;phone call|夜、母に＿をしました。|I called my mother at night.
天気|てんき|weather|今日はいい＿ですね。|Nice weather today, isn't it?|nature
雨|あめ|rain|＿が降っています。|It's raining.|nature
今日|きょう|today|＿は日曜日です。|Today is Sunday.|time
明日|あした|tomorrow|＿また会いましょう。|Let's meet again tomorrow.|time
昨日|きのう|yesterday|＿は忙しかったです。|I was busy yesterday.|time
時間|じかん|time;hours|今日は＿がありません。|I don't have time today.
名前|なまえ|name|お＿は何ですか。|What is your name?
部屋|へや|room|週末に＿を掃除します。|I clean my room on weekends.|place
店|みせ|shop;store|あの＿は安いです。|That shop is cheap.|place
お金|おかね|money|今、＿がありません。|I don't have any money right now.
食べる|たべる|to eat|寿司を＿のが好きです。|I like eating sushi.|verb
飲む|のむ|to drink|薬を＿時間です。|It's time to take your medicine.|verb
見る|みる|to see;to watch;to look|今晩、映画を＿つもりです。|I plan to watch a movie tonight.|verb
行く|いく|to go|明日、病院に＿予定です。|I'm planning to go to the hospital tomorrow.|verb
来る|くる|to come|バスがもうすぐ＿。|The bus is coming soon.|verb
帰る|かえる|to return;to go home|六時に家に＿。|I go home at six.|verb
書く|かく|to write|日本語で手紙を＿のは難しいです。|Writing letters in Japanese is hard.|verb
読む|よむ|to read|毎晩、本を＿。|I read books every night.|verb
聞く|きく|to listen;to hear;to ask|音楽を＿のが好きです。|I like listening to music.|verb
話す|はなす|to speak;to talk|日本語を少し＿ことができます。|I can speak a little Japanese.|verb
買う|かう|to buy|スーパーで卵を＿。|I'll buy eggs at the supermarket.|verb
起きる|おきる|to get up;to wake up|毎朝七時に＿。|I get up at seven every morning.|verb
寝る|ねる|to sleep;to go to bed|いつも十一時に＿。|I always go to bed at eleven.|verb
分かる|わかる|to understand|この問題が＿人はいますか。|Is there anyone who understands this problem?|verb
大きい|おおきい|big;large|庭に＿犬がいます。|There is a big dog in the yard.|adjective
小さい|ちいさい|small;little|＿かばんを買いました。|I bought a small bag.|adjective
高い|たかい|expensive;high;tall|このカメラは＿です。|This camera is expensive.|adjective
安い|やすい|cheap;inexpensive|＿レストランを知っていますか。|Do you know a cheap restaurant?|adjective
新しい|あたらしい|new|＿靴を履いています。|I'm wearing new shoes.|adjective
古い|ふるい|old (things)|＿お寺を見に行きました。|I went to see an old temple.|adjective
暑い|あつい|hot (weather)|今日はとても＿です。|It's very hot today.|adjective
寒い|さむい|cold (weather)|北海道の冬は＿です。|Winter in Hokkaido is cold.|adjective
おいしい|おいしい|delicious;tasty|このケーキは＿です。|This cake is delicious.|adjective
忙しい|いそがしい|busy|今週は仕事が＿です。|Work is busy this week.|adjective
静か|しずか|quiet|図書館はとても＿です。|The library is very quiet.|adjective
元気|げんき|healthy;energetic;well|お＿ですか。|How are you?|adjective
好き|すき|liked;fond of|私は果物が＿です。|I like fruit.|adjective
きれい|きれい|pretty;clean|この部屋は＿です。|This room is clean.|adjective
毎日|まいにち|every day|＿日本語を勉強します。|I study Japanese every day.|time
今|いま|now|＿何時ですか。|What time is it now?|time
誰|だれ|who|あの人は＿ですか。|Who is that person?|question
どこ|どこ|where|トイレは＿ですか。|Where is the toilet?|question
いくら|いくら|how much|このりんごは＿ですか。|How much is this apple?|question
右|みぎ|right (direction)|次の角を＿に曲がってください。|Please turn right at the next corner.|direction
左|ひだり|left (direction)|銀行は駅の＿にあります。|The bank is to the left of the station.|direction
上|うえ|above;on top|机の＿に本があります。|There is a book on the desk.|direction
下|した|below;under|椅子の＿に猫がいます。|There is a cat under the chair.|direction
外|そと|outside|＿は寒いです。|It's cold outside.|direction
花|はな|flower|庭に＿が咲いています。|Flowers are blooming in the garden.|nature
手紙|てがみ|letter|友達に＿を書きました。|I wrote a letter to a friend.
写真|しゃしん|photograph;photo|ここで＿を撮ってもいいですか。|May I take a photo here?
病院|びょういん|hospital|父は＿で働いています。|My father works at a hospital.|place
勉強|べんきょう|study|毎晩日本語の＿をします。|I study Japanese every evening.
旅行|りょこう|trip;travel|来月、京都へ＿に行きます。|Next month I'm going on a trip to Kyoto.
`,
    N4: `
経験|けいけん|experience|海外で働いた＿があります。|I have experience working abroad.
準備|じゅんび|preparation|今、旅行の＿をしています。|I'm preparing for the trip now.
趣味|しゅみ|hobby|私の＿は料理です。|My hobby is cooking.
約束|やくそく|promise;appointment|友達と会う＿をしました。|I made plans to meet a friend.
予定|よてい|plan;schedule|週末の＿は何ですか。|What are your plans for the weekend?
空港|くうこう|airport|＿まで車で一時間かかります。|It takes an hour by car to the airport.|place
地震|じしん|earthquake|昨日の夜、大きい＿がありました。|There was a big earthquake last night.|nature
台風|たいふう|typhoon|＿が来るので、学校は休みです。|School is closed because a typhoon is coming.|nature
会議|かいぎ|meeting;conference|三時から＿があります。|There is a meeting from three o'clock.
説明|せつめい|explanation|先生の＿はわかりやすいです。|The teacher's explanations are easy to understand.
意見|いけん|opinion|あなたの＿を聞かせてください。|Please tell me your opinion.
理由|りゆう|reason|遅れた＿を教えてください。|Please tell me why you were late.
将来|しょうらい|future|＿は医者になりたいです。|I want to become a doctor in the future.|time
世界|せかい|world|いつか＿を旅行したいです。|Someday I want to travel the world.
文化|ぶんか|culture|日本の＿に興味があります。|I'm interested in Japanese culture.
思い出す|おもいだす|to remember;to recall|彼の名前を＿ことができません。|I can't recall his name.|verb
届ける|とどける|to deliver|荷物を＿仕事をしています。|I work delivering packages.|verb
集める|あつめる|to collect;to gather|切手を＿のが趣味です。|My hobby is collecting stamps.|verb
調べる|しらべる|to investigate;to look up|分からない言葉を辞書で＿。|I look up words I don't know in the dictionary.|verb
決める|きめる|to decide|旅行の日をみんなで＿。|We'll decide the trip date together.|verb
続ける|つづける|to continue|毎日運動を＿のは大変です。|Keeping up exercise every day is tough.|verb
比べる|くらべる|to compare|二つの店の値段を＿。|I compare prices at two shops.|verb
壊れる|こわれる|to break;to be broken|||verb
間に合う|まにあう|to be in time|急げば、電車に＿。|If you hurry, you'll make the train.|verb
優しい|やさしい|kind;gentle|彼女はとても＿人です。|She is a very kind person.|adjective
厳しい|きびしい|strict;severe|私の父は＿です。|My father is strict.|adjective
危ない|あぶない|dangerous|この川で泳ぐのは＿です。|Swimming in this river is dangerous.|adjective
珍しい|めずらしい|rare;unusual|公園で＿鳥を見ました。|I saw a rare bird in the park.|adjective
恥ずかしい|はずかしい|embarrassed;shy|人の前で歌うのは＿です。|Singing in front of people is embarrassing.|adjective
複雑|ふくざつ|complicated;complex|この問題は＿です。|This problem is complicated.|adjective
特別|とくべつ|special|今日は＿な日です。|Today is a special day.|adjective
必要|ひつよう|necessary;need|旅行にはパスポートが＿です。|You need a passport to travel.|adjective
丁寧|ていねい|polite;careful|彼はいつも＿な言葉を使います。|He always uses polite language.|adjective
残念|ざんねん|unfortunate;disappointing|パーティーに行けなくて＿です。|It's a shame I can't go to the party.|adjective
アルバイト|あるばいと|part-time job|週末に＿をしています。|I work a part-time job on weekends.
`,
    N3: `
環境|かんきょう|environment|＿を守ることは大切です。|Protecting the environment is important.
状況|じょうきょう|situation;circumstances|今の＿を説明してください。|Please explain the current situation.
影響|えいきょう|influence;effect|天気は気分に＿を与えます。|The weather affects your mood.
関係|かんけい|relationship;connection|あの二人はどんな＿ですか。|What is the relationship between those two?
責任|せきにん|responsibility|それは私の＿です。|That is my responsibility.
努力|どりょく|effort|＿すれば、きっと合格します。|If you make an effort, you'll surely pass.
機会|きかい|opportunity;chance|日本に行く＿がありました。|I had a chance to go to Japan.
結果|けっか|result;outcome|試験の＿はまだわかりません。|I don't know the exam results yet.
原因|げんいん|cause|警察が事故の＿を調べています。|The police are investigating the cause of the accident.
目的|もくてき|purpose;goal|今回の旅行の＿は何ですか。|What is the purpose of this trip?
感情|かんじょう|emotion;feeling|彼は＿を顔に出しません。|He doesn't show his emotions on his face.
自然|しぜん|nature|この町は＿が豊かです。|This town is rich in nature.|nature
記事|きじ|article (news)|新聞で面白い＿を読みました。|I read an interesting article in the newspaper.
与える|あたえる|to give;to provide|植物に水を＿。|I give water to the plants.|verb
増える|ふえる|to increase|観光客が＿のは嬉しいです。|I'm glad the number of tourists is increasing.|verb
減る|へる|to decrease|最近、体重が＿ことはありません。|Lately my weight never goes down.|verb
認める|みとめる|to admit;to recognize|自分の間違いを＿のは難しい。|It's hard to admit your own mistakes.|verb
避ける|さける|to avoid|混雑を＿ために早く出ます。|I leave early to avoid the crowds.|verb
含む|ふくむ|to include;to contain|この値段は税金を＿。|This price includes tax.|verb
迷う|まよう|to get lost;to hesitate|道に＿といけないので地図を持って行きます。|I'll take a map so I don't get lost.|verb
正確|せいかく|accurate;exact|＿な時間を教えてください。|Please tell me the exact time.|adjective
単純|たんじゅん|simple|これは＿な問題です。|This is a simple problem.|adjective
深い|ふかい|deep|この湖はとても＿です。|This lake is very deep.|adjective
詳しい|くわしい|detailed;knowledgeable|もっと＿説明をお願いします。|Please give a more detailed explanation.|adjective
もったいない|もったいない|wasteful|食べ物を捨てるのは＿です。|Throwing away food is wasteful.|adjective
`,
    N2: `
維持|いじ|maintenance;preservation|健康を＿するのは難しい。|Maintaining your health is difficult.
検討|けんとう|consideration;examination|その提案を＿します。|We will consider that proposal.
普及|ふきゅう|spread;diffusion|スマートフォンの＿で生活が変わった。|The spread of smartphones changed our lives.
傾向|けいこう|tendency;trend|若者は本を読まない＿がある。|Young people tend not to read books.
概念|がいねん|concept|この＿を理解するのは難しい。|This concept is difficult to understand.
対象|たいしょう|target;object (of)|この講座は初心者を＿としています。|This course is aimed at beginners.
距離|きょり|distance|駅までの＿はどれくらいですか。|How far is it to the station?
矛盾|むじゅん|contradiction|彼の話には＿がある。|There's a contradiction in his story.
削除|さくじょ|deletion|古いファイルを＿してください。|Please delete the old files.
把握|はあく|grasp;understanding|まず状況を＿する必要がある。|First we need to grasp the situation.
促す|うながす|to urge;to prompt|係員が乗客に注意を＿。|The staff urge passengers to be careful.|verb
補う|おぎなう|to compensate;to make up for|足りない分を貯金で＿。|I make up the shortfall with savings.|verb
抱える|かかえる|to hold;to have (problems)|多くの問題を＿会社。|A company with many problems.|verb
譲る|ゆずる|to hand over;to give up (a seat)|お年寄りに席を＿。|I give up my seat to an elderly person.|verb
慌てる|あわてる|to panic;to be flustered|時間はあるから、＿必要はありません。|There's time, so there's no need to panic.|verb
曖昧|あいまい|vague;ambiguous|彼の答えは＿だった。|His answer was vague.|adjective
著しい|いちじるしい|remarkable;striking|この十年で＿進歩が見られる。|Remarkable progress can be seen over the past decade.|adjective
頼もしい|たのもしい|reliable;promising|彼は＿リーダーだ。|He is a reliable leader.|adjective
穏やか|おだやか|calm;gentle|今日は海が＿だ。|The sea is calm today.|adjective
大げさ|おおげさ|exaggerated|彼はいつも話が＿だ。|He always exaggerates.|adjective
`,
    N1: `
懸念|けねん|concern;worry|経済の先行きに＿がある。|There are concerns about the economic outlook.
妥協|だきょう|compromise|双方が＿する必要がある。|Both sides need to compromise.
踏襲|とうしゅう|following (a precedent)|前例を＿する。|To follow precedent.
該当|がいとう|corresponding;applicable|＿する項目に丸をつけてください。|Please circle the applicable items.
緩和|かんわ|relaxation;easing|規制の＿が進んでいる。|Deregulation is progressing.
逸脱|いつだつ|deviation|規則からの＿は許されない。|Deviation from the rules is not allowed.
網羅|もうら|comprehensive coverage|この辞書は専門用語を＿している。|This dictionary covers technical terms comprehensively.
示唆|しさ|suggestion;hint|研究結果はその可能性を＿している。|The findings suggest that possibility.
憂鬱|ゆううつ|depression;gloom|雨の月曜日は＿だ。|Rainy Mondays are gloomy.
顕著|けんちょ|remarkable;conspicuous|薬の効果が＿に現れた。|The drug's effect appeared clearly.|adjective
阻む|はばむ|to obstruct;to prevent|大雪が行く手を＿。|Heavy snow blocks the way.|verb
培う|つちかう|to cultivate;to foster|子供の頃から協調性を＿ことが大切だ。|It's important to foster cooperation from childhood.|verb
覆す|くつがえす|to overturn;to overthrow|一度出た判決を＿のは難しい。|It's hard to overturn a verdict once handed down.|verb
携わる|たずさわる|to be involved in|教育に＿仕事がしたい。|I want a job involved in education.|verb
賄う|まかなう|to cover (costs);to finance|生活費をアルバイトで＿。|I cover living expenses with a part-time job.|verb
潔い|いさぎよい|graceful;manly;brave|負けを認めるのは＿態度だ。|Admitting defeat is a gracious attitude.|adjective
紛らわしい|まぎらわしい|confusing;misleading|この二つの言葉は＿。|These two words are confusing.|adjective
おろそか|おろそか|negligent;neglectful|勉強を＿にしてはいけない。|You must not neglect your studies.|adjective
円滑|えんかつ|smooth;harmonious|会議は＿に進んだ。|The meeting went smoothly.|adjective
斬新|ざんしん|novel;innovative|＿なデザインが話題になった。|The innovative design became a hot topic.|adjective
`,
  };

  const out = [];
  for (const [level, block] of Object.entries(RAW)) {
    for (const line of block.split('\n')) {
      if (!line.trim()) continue;
      const [word, reading, meanings, ja, en, cat] = line.split('|').map((s) => (s || '').trim());
      const item = { id: `v_${level}_${word}`, word, reading, meanings: meanings.split(';'), level };
      if (ja && ja.includes('＿')) item.example = { ja, en };
      if (cat) item.cat = cat;
      out.push(item);
    }
  }

  root.SUKIMA_VOCAB = out;
})(typeof self !== 'undefined' ? self : globalThis);
