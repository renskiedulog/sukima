// Grammar & particle sentences. Line format: sentence (＿ = blank)|English|answer|option,option,option,option|note
// Ids are "g_<level>_<n>" in list order — only append to a level, never insert or reorder.
(function (root) {
  'use strict';

  const RAW = {
    N5: `
私＿学生です。|I am a student.|は|は,が,を,に|は marks the topic of the sentence.
毎朝りんご＿食べます。|I eat an apple every morning.|を|を,が,に,で|を marks the direct object.
明日、学校＿行きます。|I'll go to school tomorrow.|に|に,を,で,が|に marks a destination (へ also works).
図書館＿勉強します。|I study at the library.|で|で,に,を,が|で marks where an action happens.
友達＿映画を見ます。|I watch a movie with a friend.|と|と,を,に,が|と means "with (someone)".
これは私＿本です。|This is my book.|の|の,が,に,を|の links nouns: 私の本 = my book.
机の上に猫＿います。|There is a cat on the desk.|が|が,を,で,へ|が marks what exists with いる / ある.
バス＿会社に行きます。|I go to work by bus.|で|で,に,を,と|で marks means or method.
毎朝七時＿起きます。|I get up at seven every morning.|に|に,で,を,が|に marks a specific point in time.
田中さんは学生です。私＿学生です。|Mr. Tanaka is a student. I am a student too.|も|も,は,が,を|も means "also / too".
これはペンです＿。|Is this a pen?|か|か,よ,ね,の|か at the end turns a sentence into a question.
今日はいい天気です＿。|It's nice weather today, isn't it?|ね|ね,か,よ,を|ね seeks agreement: "isn't it?".
駅から家＿歩きます。|I walk from the station to my house.|まで|まで,から,に,で|まで means "as far as / until".
九時＿五時まで働きます。|I work from nine to five.|から|から,まで,に,で|から means "from".
パン＿卵などを買いました。|I bought bread, eggs, and so on.|や|や,と,も,か|や lists examples (non-exhaustive), often with など.
コーヒー＿紅茶とどちらがいいですか。|Which would you like, coffee or tea?|と|と,を,に,で|AとBとどちらが… compares two options.
デパートへ服を買い＿行きます。|I'm going to the department store to buy clothes.|に|に,で,を,が|verb stem + に行く = go to do something.
私は犬＿好きです。|I like dogs.|が|が,を,に,で|好き takes が for the thing liked.
`,
    N4: `
雨が降っている＿、出かけません。|Because it's raining, I won't go out.|から|から,のに,けど,まで|から after a clause gives a reason.
薬を飲んだ＿、まだ頭が痛い。|Even though I took medicine, my head still hurts.|のに|のに,から,ので,ために|のに = "even though", often with surprise or frustration.
日本へ行った＿があります。|I have been to Japan.|こと|こと,もの,ところ,の|た-form + ことがある = have done before.
窓を開けて＿いいですか。|May I open the window?|も|も,は,が,を|てもいい asks or gives permission.
ここでたばこを吸って＿いけません。|You must not smoke here.|は|は,も,が,を|てはいけない = must not.
音楽を聞き＿勉強します。|I study while listening to music.|ながら|ながら,たり,ために,のに|verb stem + ながら = while doing.
明日は雨が降る＿しれません。|It might rain tomorrow.|かも|かも,ように,ばかり,だけ|かもしれない = might / maybe.
日本語が話せる＿になりました。|I became able to speak Japanese.|よう|よう,こと,ため,はず|ようになる = come to (be able to) do.
母＿料理を教えてもらいました。|I had my mother teach me cooking.|に|に,を,で,が|てもらう marks the giver with に.
彼はもう家に着いた＿です。|He should have arrived home by now.|はず|はず,べき,ため,こと|はず = should be / expected to be.
健康の＿、毎日走っています。|I run every day for my health.|ため|ため,よう,はず,ばかり|のために = for the sake of.
春になる＿、桜が咲きます。|When spring comes, the cherry blossoms bloom.|と|と,ば,たら,なら|dictionary form + と = whenever / natural result.
パーティーの前に飲み物を買って＿ました。|I bought drinks ahead of the party.|おき|おき,しまい,あげ,くれ|ておく = do something in advance.
`,
    N3: `
この本は読めば読む＿面白い。|The more I read this book, the more interesting it gets.|ほど|ほど,だけ,ばかり,くらい|〜ば〜ほど = the more…, the more….
留学する＿、英語を勉強している。|I'm studying English in order to study abroad.|ために|ために,ように,ながら,のに|ために = in order to (with intentional actions).
日本に来た＿なので、まだ友達がいません。|I just came to Japan, so I don't have friends yet.|ばかり|ばかり,ほど,まで,しか|た-form + ばかり = just did.
財布を家に忘れて＿。|I (regrettably) left my wallet at home.|しまった|しまった,おいた,あげた,みた|てしまう = completion, often with regret.
空が暗くなってきた。雨が降り＿だ。|The sky got dark. It looks like it's going to rain.|そう|そう,よう,らしい,みたい|stem + そうだ = looks like it will.
この料理は子供＿は辛すぎる。|This dish is too spicy for children.|に|に,で,を,が|にとって / には = for (someone).
財布に百円＿ありません。|I only have 100 yen in my wallet.|しか|しか,だけ,ばかり,ほど|しか + negative = nothing but / only.
日本の首都＿いえば、東京です。|Speaking of Japan's capital, it's Tokyo.|と|と,に,で,が|といえば = speaking of.
先生＿よると、明日は休みだそうです。|According to the teacher, tomorrow is a day off.|に|に,で,を,と|によると = according to.
`,
  };

  const out = [];
  for (const [level, block] of Object.entries(RAW)) {
    let n = 0;
    for (const line of block.split('\n')) {
      if (!line.trim()) continue;
      n += 1;
      const [ja, en, answer, options, note] = line.split('|').map((s) => (s || '').trim());
      out.push({ id: `g_${level}_${n}`, level, ja, en, answer, options: options.split(','), note });
    }
  }

  root.SUKIMA_GRAMMAR = out;
})(typeof self !== 'undefined' ? self : globalThis);
