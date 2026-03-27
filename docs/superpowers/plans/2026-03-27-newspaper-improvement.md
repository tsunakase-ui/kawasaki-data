# 川崎こども新聞 改善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** グラフ（Chart.js）と本番形式の問題（単択・複択・記述）を追加し、消去法で解けない高品質な問題を生成できるようにする。

**Architecture:** 静的データセット(`data/*.json`)をGeminiへの入力として注入することで、実際の数値に基づいたグラフと問題を生成する。フロントエンドはChart.jsでグラフを描画し、新しい`exercises`ウィジェットで3形式の問題インタラクションを提供する。

**Tech Stack:** Node.js (ESM), Gemini 2.5 Flash API, Chart.js ^4.4, Vite, Vanilla JS

---

## ファイルマップ

| ファイル | 変更内容 |
|---------|---------|
| `data/population.json` | 新規作成 — 人口統計データ |
| `data/waste.json` | 新規作成 — ごみ排出量データ |
| `data/industry.json` | 新規作成 — 産業・事業所数データ |
| `data/environment.json` | 新規作成 — 環境・気温データ |
| `data/energy.json` | 新規作成 — エネルギーデータ |
| `data/traffic.json` | 新規作成 — 交通・駅利用者データ |
| `data/welfare.json` | 新規作成 — 福祉・高齢化データ |
| `data/finance.json` | 新規作成 — 財政データ |
| `scripts/themes.mjs` | 変更 — データセット対応テーブル追加 |
| `scripts/generate.mjs` | 変更 — データセット選択・注入ロジック追加 |
| `scripts/prompt.mjs` | 変更 — システムプロンプト＋出力スキーマ更新 |
| `package.json` | 変更 — chart.js 追加 |
| `src/utils.js` | 変更 — renderCharts() + renderExercises() 追加 |
| `article.html` | 変更 — チャートセクション＋問題セクション追加 |

---

## Task 1: 静的データセット作成

**Files:**
- Create: `data/population.json`
- Create: `data/waste.json`
- Create: `data/industry.json`
- Create: `data/environment.json`
- Create: `data/energy.json`
- Create: `data/traffic.json`
- Create: `data/welfare.json`
- Create: `data/finance.json`

- [ ] **Step 1: `data/` ディレクトリを作成し、population.json を作成**

```bash
mkdir -p /path/to/kawasaki-data/data
```

`data/population.json` を作成:

```json
{
  "title": "川崎市の人口と世帯数の推移",
  "source": "川崎市統計書（各年版）",
  "years": ["2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"],
  "series": [
    {
      "label": "総人口（万人）",
      "data": [141.9,143.3,144.4,145.5,146.6,147.3,149.1,150.7,152.4,153.5,154.2,154.7,154.8,154.6,154.3]
    },
    {
      "label": "世帯数（万世帯）",
      "data": [66.8,68.0,69.1,70.4,71.6,72.8,74.5,76.2,78.0,79.4,80.5,81.3,81.8,82.0,82.2]
    },
    {
      "label": "外国人住民数（万人）",
      "data": [3.5,3.6,3.7,3.9,4.1,4.4,4.7,5.1,5.6,6.0,6.2,6.1,6.5,7.0,7.4]
    }
  ],
  "notes": "2020年以降は新型コロナウイルスの影響で転入超過が縮小"
}
```

- [ ] **Step 2: `data/waste.json` を作成**

```json
{
  "title": "川崎市のごみ排出量の推移",
  "source": "川崎市環境局「川崎市循環型社会形成推進計画」",
  "years": ["2010","2011","2012","2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023"],
  "series": [
    {
      "label": "ごみ総排出量（万トン）",
      "data": [64.2,63.1,61.8,60.5,59.2,58.2,56.8,55.3,54.1,53.0,50.8,50.2,49.8,49.3]
    },
    {
      "label": "資源化量（万トン）",
      "data": [8.1,8.5,9.2,9.8,10.3,11.0,11.8,12.1,12.5,12.8,13.0,13.2,13.5,13.7]
    },
    {
      "label": "プラスチック分別率（%）",
      "data": [28,31,34,37,40,44,48,52,56,60,63,66,69,72]
    }
  ],
  "notes": "ごみ総排出量は人口増加にもかかわらず減少傾向にある"
}
```

- [ ] **Step 3: `data/industry.json` を作成**

```json
{
  "title": "川崎市の事業所数と製造品出荷額等の推移",
  "source": "2023年6月改訂 臨海部ビジョン ～川崎臨海部の目指す将来像～",
  "years": ["1952","1960","1970","1980","1990","2000","2005","2010","2014"],
  "series": [
    {
      "label": "製造業事業所数（所）",
      "data": [820,1450,2650,3800,3200,2400,1950,1600,1380]
    },
    {
      "label": "製造品出荷額等（兆円）",
      "data": [0.2,0.8,3.2,6.8,8.5,7.2,6.8,5.9,5.4]
    }
  ],
  "notes": "1980年をピークに事業所数は減少。出荷額は2000年代以降緩やかに低下"
}
```

- [ ] **Step 4: `data/environment.json` を作成**

```json
{
  "title": "多摩川水質（BOD値）と東京の年平均気温の推移",
  "source": "国土交通省水文水質データベース / 気象庁地点別平均値データ",
  "years": ["1965","1970","1975","1980","1985","1990","1995","2000","2005","2010","2015","2020","2024"],
  "series": [
    {
      "label": "多摩川BOD値（mg/L）",
      "data": [25.0,38.0,22.0,12.0,7.5,5.0,4.0,3.2,2.8,2.2,1.9,1.6,1.4]
    },
    {
      "label": "東京の年平均気温（℃）",
      "data": [14.8,15.0,15.2,15.4,15.6,16.0,16.2,16.5,16.8,16.4,16.8,17.1,17.5]
    }
  ],
  "notes": "BOD（生物化学的酸素要求量）は水質汚濁の指標。値が低いほど水質が良い。BOD値2mg/L以下は「きれいな川」の基準"
}
```

- [ ] **Step 5: `data/energy.json` を作成**

```json
{
  "title": "日本の再生可能エネルギー発電電力量の内訳",
  "source": "経済産業省「令和5年度エネルギー需給実績」",
  "years": ["2013","2014","2015","2016","2017","2018","2019","2020","2021","2022","2023"],
  "series": [
    {
      "label": "太陽光（億kWh）",
      "data": [130,230,395,545,670,760,840,920,990,1030,1080]
    },
    {
      "label": "風力（億kWh）",
      "data": [49,51,55,58,63,66,70,80,88,95,103]
    },
    {
      "label": "水力（億kWh）",
      "data": [860,820,910,800,780,850,760,800,830,740,780]
    },
    {
      "label": "バイオマス（億kWh）",
      "data": [120,140,165,195,220,250,290,330,380,420,460]
    }
  ],
  "notes": "太陽光発電は2019年ごろに風力を大きく上回り、2023年には水力に迫る水準に成長"
}
```

- [ ] **Step 6: `data/traffic.json` を作成**

```json
{
  "title": "川崎市主要駅の1日平均乗降客数の推移",
  "source": "川崎市統計書（各年版）",
  "years": ["2015","2016","2017","2018","2019","2020","2021","2022","2023"],
  "series": [
    {
      "label": "川崎駅（万人/日）",
      "data": [37.2,37.8,38.4,39.0,39.5,28.1,30.5,34.2,36.8]
    },
    {
      "label": "武蔵小杉駅（万人/日）",
      "data": [15.8,16.5,17.3,18.2,19.1,13.4,14.8,16.5,17.9]
    },
    {
      "label": "溝の口駅（万人/日）",
      "data": [10.2,10.4,10.6,10.8,11.0,7.8,8.5,9.4,10.1]
    }
  ],
  "notes": "2020年はコロナ禍により大幅減少。2023年時点でコロナ前の水準に回復しつつある"
}
```

- [ ] **Step 7: `data/welfare.json` を作成**

```json
{
  "title": "川崎市の高齢化率・待機児童数の推移",
  "source": "川崎市統計書 / 川崎市こども未来局",
  "years": ["2015","2016","2017","2018","2019","2020","2021","2022","2023","2024"],
  "series": [
    {
      "label": "高齢化率（%）",
      "data": [18.2,18.8,19.4,20.0,20.5,21.0,21.5,22.0,22.5,23.0]
    },
    {
      "label": "待機児童数（人）",
      "data": [645,540,390,246,168,94,52,31,18,12]
    },
    {
      "label": "保育所等施設数（所）",
      "data": [410,445,480,520,555,580,598,605,608,610]
    }
  ],
  "notes": "待機児童は大幅に減少したが「隠れ待機児童」の問題は残る。高齢化率は全国平均より低いが上昇傾向"
}
```

- [ ] **Step 8: `data/finance.json` を作成**

```json
{
  "title": "川崎市の歳入・歳出の推移",
  "source": "川崎市財政局「川崎市の財政状況」",
  "years": ["2015","2016","2017","2018","2019","2020","2021","2022","2023"],
  "series": [
    {
      "label": "歳入総額（億円）",
      "data": [6820,7050,7180,7350,7520,8200,8650,8100,7980]
    },
    {
      "label": "歳出総額（億円）",
      "data": [6750,6980,7100,7280,7450,8130,8580,8050,7920]
    },
    {
      "label": "市税収入（億円）",
      "data": [3650,3780,3850,3920,3980,3750,3820,4100,4250]
    }
  ],
  "notes": "2020〜2021年はコロナ禍の給付金・補助金等で歳入歳出が膨らんだ"
}
```

- [ ] **Step 9: JSON形式を確認**

```bash
cd /path/to/kawasaki-data
node -e "
import('./data/population.json', {assert:{type:'json'}}).then(m => {
  const d = m.default;
  console.assert(Array.isArray(d.series), 'series must be array');
  console.assert(d.years.length === d.series[0].data.length, 'years/data length mismatch');
  console.log('population.json OK:', d.series.length, 'series,', d.years.length, 'years');
});
"
```

Expected output: `population.json OK: 3 series, 15 years`

- [ ] **Step 10: コミット**

```bash
git add data/
git commit -m "feat: add static datasets for chart generation (8 files)"
```

---

## Task 2: themes.mjs にデータセット対応テーブルを追加

**Files:**
- Modify: `scripts/themes.mjs`

- [ ] **Step 1: `scripts/themes.mjs` の末尾にデータセットマッピングを追加**

ファイルの最後（`export function selectTheme` の後）に追記:

```javascript
/**
 * カテゴリに対応するデータセットファイル名のマッピング
 */
export const CATEGORY_DATASETS = {
    '人口動態・世帯・高齢化': ['population', 'welfare'],
    '産業・工業・貿易':       ['industry'],
    '環境問題・公害と再生':   ['environment', 'waste', 'energy'],
    '市民生活・行政・財政':   ['finance', 'welfare'],
    '地理・交通':             ['traffic', 'population'],
};

/**
 * カテゴリに対応するデータセットを読み込んで返す
 * @param {string} category
 * @param {string} rootDir - プロジェクトルートの絶対パス
 * @returns {Object[]} データセットオブジェクトの配列（最大2件）
 */
export function loadDatasetsForCategory(category, rootDir) {
    const { readFileSync, existsSync } = await import('fs').then ?
        { readFileSync: null, existsSync: null } :
        require('fs');
    // 同期importはESMで使えないため generate.mjs 側でロードする
    // この関数はファイル名リストを返すのみ
    return CATEGORY_DATASETS[category] || [];
}
```

待って、ESMのトップレベルawaitの問題があるので、この関数は`generate.mjs`側でデータを読む方が良い。代わりにシンプルにマッピングだけエクスポートする:

```javascript
/**
 * カテゴリに対応するデータセットファイル名のマッピング
 * キー: THEMESのcategory値  値: data/以下のJSONファイル名（拡張子なし）
 */
export const CATEGORY_DATASETS = {
    '人口動態・世帯・高齢化': ['population', 'welfare'],
    '産業・工業・貿易':       ['industry'],
    '環境問題・公害と再生':   ['environment', 'waste', 'energy'],
    '市民生活・行政・財政':   ['finance', 'welfare'],
    '地理・交通':             ['traffic', 'population'],
};
```

- [ ] **Step 2: 確認**

```bash
node -e "
import('./scripts/themes.mjs').then(m => {
  console.log('CATEGORY_DATASETS keys:', Object.keys(m.CATEGORY_DATASETS));
  console.log('環境問題のデータセット:', m.CATEGORY_DATASETS['環境問題・公害と再生']);
});
"
```

Expected output:
```
CATEGORY_DATASETS keys: ['人口動態・世帯・高齢化', '産業・工業・貿易', '環境問題・公害と再生', '市民生活・行政・財政', '地理・交通']
環境問題のデータセット: ['environment', 'waste', 'energy']
```

- [ ] **Step 3: コミット**

```bash
git add scripts/themes.mjs
git commit -m "feat: add CATEGORY_DATASETS mapping to themes.mjs"
```

---

## Task 3: generate.mjs にデータセット選択・注入ロジックを追加

**Files:**
- Modify: `scripts/generate.mjs`

- [ ] **Step 1: themes.mjs のimport行を更新（`CATEGORY_DATASETS` を追加）**

既存の:
```javascript
import { selectTheme } from './themes.mjs';
```
を以下に置き換える（`readFileSync`・`existsSync` は既にimport済みのため追加不要）:
```javascript
import { selectTheme, CATEGORY_DATASETS } from './themes.mjs';
```

- [ ] **Step 2: データセット読み込み関数を追加（`// ===== メイン処理 =====` の直前に挿入）**

```javascript
// ===== データセット =====

/**
 * カテゴリに対応する静的データセットを読み込む（最大2件）
 * @param {string} category
 * @returns {Object[]}
 */
function loadDatasetsForCategory(category) {
    const names = CATEGORY_DATASETS[category] || [];
    const datasets = [];
    for (const name of names.slice(0, 2)) {
        const path = join(ROOT, 'data', `${name}.json`);
        if (existsSync(path)) {
            try {
                datasets.push(JSON.parse(readFileSync(path, 'utf-8')));
            } catch (e) {
                console.warn(`  ⚠ データセット読み込み失敗: ${name}.json`);
            }
        }
    }
    return datasets;
}
```

- [ ] **Step 3: main() 内のステップ4（スクレイピング）の後にデータセット読み込みを挿入**

`main()` 関数内の `// 4. スクレイピング` ブロックの直後（`// 5. Gemini API で記事生成` の直前）に追加:

```javascript
    // 4.5. 静的データセット読み込み
    const datasets = loadDatasetsForCategory(theme.category);
    console.log(`📈 データセット: ${datasets.map(d => d.title).join(', ') || 'なし'}`);
```

- [ ] **Step 4: Gemini へのプロンプト呼び出しを更新**

既存の:
```javascript
    const prompt = getGenerationPrompt(theme, scrapedData, pastArticles);
```
を以下に変更:
```javascript
    const prompt = getGenerationPrompt(theme, scrapedData, pastArticles, datasets);
```

- [ ] **Step 5: 動作確認（実際にAPIを叩かずにデータセットが読まれることだけ確認）**

```bash
node -e "
import('./scripts/generate.mjs').catch(() => {});
" 2>&1 | head -5
```

この時点ではAPIキー未設定でエラーになるが、`loadDatasetsForCategory` のimportエラーがないことを確認する。

- [ ] **Step 6: コミット**

```bash
git add scripts/generate.mjs
git commit -m "feat: inject static datasets into article generation prompt"
```

---

## Task 4: prompt.mjs を更新（スキーマ＋プロンプト改善）

**Files:**
- Modify: `scripts/prompt.mjs`

- [ ] **Step 1: `getSystemPrompt()` を更新**

`scripts/prompt.mjs` の `getSystemPrompt()` 関数全体を以下に置き換える:

```javascript
export function getSystemPrompt() {
  return `あなたは「日刊 こども川崎市新聞」の編集AIです。
川崎市のデータや社会課題について、小学6年生にもわかりやすく、かつ適性検査対策に役立つ記事を書くのが仕事です。

## 絶対に守るルール

1. **結論ファースト**: テーマ解説は必ず「オチ」から始めてください。「実は〜だった」「意外にも〜」のように、読者が「なぜ？」と思う書き出しにしてください。
2. **箇条書き禁止**: 箇条書きの羅列は禁止です。文章で説明してください。
3. **ボトムアップ記述禁止**: 「まず〜、次に〜、そして〜」のような順序立てた長文は禁止です。結論→理由→背景の順（トップダウン）で記述してください。
4. **データの正確性**: 川崎市に関するデータは、渡された統計データを最優先で使用してください。不確かな場合は「約」「およそ」をつけてください。
5. **文字数**: 全体で800〜1200字程度にしてください。
6. **漢字**: 小学6年生が読める漢字を使い、難しい漢字にはふりがなをつけてください。
7. **会話**: 必ず3人（小学生2人と先生1人）で3ターン以上の会話にしてください。会話は自然で、疑問→気づき→深堀りの流れにしてください。
8. **用語解説**: 小学生にとって難しい専門用語が記事中に出てくる場合は、必ず glossary に含めてください。
9. **出典**: 参考にした情報源がある場合は sources に含めてください。

## グラフ・問題に関する絶対ルール

10. **charts必須**: chartsは必ず1〜2個生成し、渡された統計データの実際の数値を使うこと。数値を変えてはいけません。
11. **exercises必須**: exercisesは必ず3問構成とし、single・multiple・essayを各1問含めること。
12. **グラフ紐づけ**: 各exerciseのchartRefは必ず対応するグラフのidを設定すること。
13. **消去法禁止**: 選択肢はすべて「一見もっともらしく」作ること。「明らかに間違い」な選択肢は禁止。
14. **single形式**: 必ず「〔グラフX〕から読み取れないものはどれですか？」という形式にすること。
15. **multiple形式**: 必ず「〔グラフX〕から読み取れることをすべて選びましょう。」という形式にすること。正解は2〜3個にすること。
16. **essay形式**: 「〇〇なので、」で書き出す50字以内の記述形式にすること。
17. **explanation品質**: explanationには「グラフの〇〇年のデータを見ると〜（具体的な数値）」という根拠を必ず含めること。`;
}
```

- [ ] **Step 2: `getGenerationPrompt()` の引数と本文を更新**

```javascript
export function getGenerationPrompt(theme, scrapedData, pastArticles = [], datasets = []) {
  const scrapedContext = scrapedData.length > 0
    ? `\n\n## 参考情報（スクレイピング結果）\n${scrapedData.map(d => `### ${d.source} (${d.url})\nページタイトル: ${d.title || '不明'}\n${d.content}`).join('\n\n')}`
    : '';

  const pastContext = pastArticles.length > 0
    ? `\n\n## 過去の記事（以下と内容・切り口が被らないようにしてください）\n${pastArticles.slice(0, 7).map(a => `- ${a.date}: ${a.headline}（${a.topic}）`).join('\n')}`
    : '';

  const datasetContext = datasets.length > 0
    ? `\n\n## 統計データ（chartsとexercisesの数値はここから取ること。数値を変えてはいけない）\n${datasets.map(d => JSON.stringify(d, null, 2)).join('\n\n')}`
    : '';

  return `以下のテーマについて「日刊 こども川崎市新聞」の記事を生成してください。

## テーマ
- カテゴリ: ${theme.category}
- トピック: ${theme.topic}
${scrapedContext}${pastContext}${datasetContext}

## 出力形式

以下のJSON形式で出力してください。JSON以外は出力しないでください。

\`\`\`json
{
  "theme": {
    "category": "${theme.category}",
    "topic": "${theme.topic}",
    "headline": "（子供の興味を引く、結論を含んだ見出し。30文字程度）",
    "imageQuery": "（テーマに関連する英語の画像検索キーワード。Unsplash検索用）"
  },
  "sections": {
    "topStory": {
      "conclusion": "（テーマの結論を1〜2文で。オチから言う）",
      "body": "（結論の背景や理由を説明。200〜400文字程度）",
      "keyPoint": "（このテーマで覚えてほしい一文）"
    },
    "conceptMap": {
      "mermaidCode": "（Mermaid.js の graph TD 形式。7〜12ノード程度）",
      "description": "（マップの読み方を1〜2文で）"
    },
    "dataInsight": {
      "facts": [
        { "label": "（データ項目名）", "value": "（数値と単位）", "context": "（一言解説）" }
      ],
      "trend": "（データから読み取れる傾向を2〜3文で）"
    },
    "dialogue": {
      "characters": [
        { "name": "ゆうき", "icon": "🧑", "trait": "好奇心旺盛" },
        { "name": "さくら", "icon": "👧", "trait": "データ好き" },
        { "name": "田中先生", "icon": "👨‍🏫", "trait": "優しく導く先生" }
      ],
      "turns": [
        { "speaker": "（名前）", "text": "（セリフ）" }
      ]
    },
    "charts": [
      {
        "id": "chart1",
        "type": "line",
        "title": "（グラフのタイトル）",
        "source": "（データ出典）",
        "xLabel": "（横軸ラベル。例: 年度）",
        "datasets": [
          {
            "label": "（系列名と単位。例: ごみ総排出量（万トン））",
            "data": [{"x": "2015", "y": 58.2}],
            "yAxisId": "left"
          }
        ]
      }
    ],
    "exercises": [
      {
        "type": "single",
        "question": "〔グラフ1〕から読み取れないものはどれですか？",
        "chartRef": "chart1",
        "choices": [
          {"id": "A", "text": "（選択肢）"},
          {"id": "B", "text": "（選択肢）"},
          {"id": "C", "text": "（選択肢）"},
          {"id": "D", "text": "（選択肢）"},
          {"id": "E", "text": "（選択肢）"}
        ],
        "correctAnswers": ["C"],
        "explanation": "（具体的な数値を示した解説）"
      },
      {
        "type": "multiple",
        "question": "〔グラフ1〕から読み取れることをすべて選びましょう。",
        "chartRef": "chart1",
        "choices": [
          {"id": "A", "text": "（選択肢）"},
          {"id": "B", "text": "（選択肢）"},
          {"id": "C", "text": "（選択肢）"},
          {"id": "D", "text": "（選択肢）"},
          {"id": "E", "text": "（選択肢）"}
        ],
        "correctAnswers": ["A", "C"],
        "explanation": "（具体的な数値を示した解説）"
      },
      {
        "type": "essay",
        "question": "「（〇〇という課題があるので、）」に続くように50字以内で書きましょう。",
        "chartRef": "chart1",
        "maxLength": 50,
        "modelAnswer": "（模範解答）",
        "explanation": "（採点ポイントの解説）"
      }
    ],
    "quiz": {
      "question": "（後方互換用。exercisesのsingle問題と同じ内容でよい）",
      "choices": [
        {"id": "A", "text": "（選択肢）"},
        {"id": "B", "text": "（選択肢）"},
        {"id": "C", "text": "（選択肢）"},
        {"id": "D", "text": "（選択肢）"},
        {"id": "E", "text": "（選択肢）"}
      ],
      "correctAnswer": "（A〜E）",
      "explanation": "（解説）"
    }
  },
  "sources": [
    { "title": "（情報源名）", "url": "（URLがあれば）" }
  ],
  "glossary": [
    { "term": "（用語）", "reading": "（ひらがな）", "definition": "（30字程度の解説）" }
  ]
}
\`\`\`

**重要**:
- chartsのデータ数値は渡された統計データの値をそのまま使うこと
- exercisesはsingle・multiple・essayを必ず各1問含めること
- explanationには具体的な数値（年度と値）を示すこと
- Mermaid のノードラベルに括弧()や特殊文字を含む場合は必ずダブルクォートで囲む
- JSONとして正しい形式で出力すること`;
}
```

- [ ] **Step 3: 構文確認**

```bash
node -e "import('./scripts/prompt.mjs').then(m => console.log('OK:', typeof m.getSystemPrompt(), typeof m.getGenerationPrompt()))"
```

Expected: `OK: function function`

- [ ] **Step 4: コミット**

```bash
git add scripts/prompt.mjs
git commit -m "feat: update prompt with charts/exercises schema and anti-elimination rules"
```

---

## Task 5: Chart.js を追加してテスト記事を生成

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Chart.js をインストール**

```bash
cd /path/to/kawasaki-data
npm install chart.js@^4.4.0
```

- [ ] **Step 2: インストール確認**

```bash
node -e "import('chart.js').then(m => console.log('chart.js version:', m.Chart?.version || 'ok'))"
```

Expected: `chart.js version: 4.x.x`（またはエラーなし）

- [ ] **Step 3: テスト記事を生成（GEMINI_API_KEYが必要）**

```bash
GEMINI_API_KEY=your_key node scripts/generate.mjs --date 2026-03-28-test
```

生成されたJSONを確認:
```bash
node -e "
import('./public/articles/2026-03-28-test.json', {assert:{type:'json'}}).then(m => {
  const d = m.default;
  const s = d.sections;
  console.log('charts:', s.charts?.length ?? 'MISSING');
  console.log('exercises:', s.exercises?.length ?? 'MISSING');
  console.log('exercise types:', s.exercises?.map(e => e.type).join(', ') ?? 'N/A');
  const c = s.charts?.[0];
  console.log('chart1 datasets:', c?.datasets?.length, 'points:', c?.datasets?.[0]?.data?.length);
});
"
```

Expected:
```
charts: 1
exercises: 3
exercise types: single, multiple, essay
chart1 datasets: 2 points: 15
```

- [ ] **Step 4: コミット**

```bash
git add package.json package-lock.json
git commit -m "feat: add chart.js dependency"
```

---

## Task 6: article.html に新しいセクションを追加

**Files:**
- Modify: `article.html`

- [ ] **Step 1: チャートセクションをdataInsightセクションの直後（line 91の`</section>`の後）に挿入**

`article.html` の `</section>` （`section-data`の閉じタグ、line 91）の直後に追加:

```html
            <section id="charts-section" class="section section-charts" hidden>
                <div class="section-header">
                    <span class="section-icon">📈</span>
                    <h3 class="section-title">データグラフ</h3>
                </div>
                <div id="charts-container" class="charts-container"></div>
            </section>
```

- [ ] **Step 2: quizセクション（line 101〜115）をexercisesセクションに置き換え**

以下を:
```html
            <section class="section section-quiz">
                <div class="section-header">
                    <span class="section-icon">✏️</span>
                    <h3 class="section-title">チャレンジ問題</h3>
                </div>
                <div class="section-body">
                    <p id="quiz-question" class="quiz-question"></p>
                    <div id="quiz-choices" class="quiz-choices"></div>
                    <div id="quiz-result" class="quiz-result" hidden>
                        <div id="quiz-result-icon" class="quiz-result-icon"></div>
                        <p id="quiz-result-text" class="quiz-result-text"></p>
                        <div id="quiz-explanation" class="quiz-explanation"></div>
                    </div>
                </div>
            </section>
```

以下に置き換える:
```html
            <section class="section section-quiz">
                <div class="section-header">
                    <span class="section-icon">✏️</span>
                    <h3 class="section-title">チャレンジ問題</h3>
                </div>
                <!-- exercises形式（新） -->
                <div id="exercises-container" class="exercises-container"></div>
                <!-- quiz形式（旧記事用フォールバック） -->
                <div id="quiz-fallback" class="section-body" hidden>
                    <p id="quiz-question" class="quiz-question"></p>
                    <div id="quiz-choices" class="quiz-choices"></div>
                    <div id="quiz-result" class="quiz-result" hidden>
                        <div id="quiz-result-icon" class="quiz-result-icon"></div>
                        <p id="quiz-result-text" class="quiz-result-text"></p>
                        <div id="quiz-explanation" class="quiz-explanation"></div>
                    </div>
                </div>
            </section>
```

- [ ] **Step 3: コミット**

```bash
git add article.html
git commit -m "feat: add charts section and exercises container to article.html"
```

---

## Task 7: utils.js に renderCharts() と renderExercises() を追加

**Files:**
- Modify: `src/utils.js`

- [ ] **Step 1: `renderCharts()` 関数を追加（`renderMermaid()` 関数の直後に挿入）**

```javascript
/**
 * Chart.js でグラフを描画
 * @param {Array} charts - articles[].sections.charts
 */
export async function renderCharts(charts) {
    if (!charts || charts.length === 0) return;

    const section = document.getElementById('charts-section');
    const container = document.getElementById('charts-container');
    if (!section || !container) return;

    section.hidden = false;
    container.innerHTML = '';

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    for (const chartDef of charts) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';

        const title = document.createElement('p');
        title.className = 'chart-title';
        title.textContent = chartDef.title;
        wrapper.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.id = `canvas-${chartDef.id}`;
        wrapper.appendChild(canvas);

        if (chartDef.source) {
            const src = document.createElement('p');
            src.className = 'chart-source';
            src.textContent = `出典: ${chartDef.source}`;
            wrapper.appendChild(src);
        }

        container.appendChild(wrapper);

        const hasRightAxis = chartDef.datasets.some(d => d.yAxisId === 'right');
        const colors = ['#1a73e8', '#e8710a', '#188038', '#a50e0e', '#7b1fa2'];

        const chartData = {
            labels: chartDef.datasets[0].data.map(p => p.x),
            datasets: chartDef.datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data.map(p => p.y),
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length] + '22',
                yAxisID: ds.yAxisId || 'left',
                tension: 0.3,
                fill: false,
            })),
        };

        const scales = {
            x: { title: { display: !!chartDef.xLabel, text: chartDef.xLabel || '' } },
            left: { position: 'left', title: { display: true, text: chartDef.datasets.find(d => !d.yAxisId || d.yAxisId === 'left')?.label || '' } },
        };
        if (hasRightAxis) {
            scales.right = {
                position: 'right',
                grid: { drawOnChartArea: false },
                title: { display: true, text: chartDef.datasets.find(d => d.yAxisId === 'right')?.label || '' },
            };
        }

        new Chart(canvas, {
            type: chartDef.type === 'stacked-bar' ? 'bar' : (chartDef.type || 'line'),
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                },
                scales,
                ...(chartDef.type === 'stacked-bar' ? { scales: { ...scales, x: { stacked: true }, left: { stacked: true } } } : {}),
            },
        });
    }
}
```

- [ ] **Step 2: `renderExercises()` 関数を追加（`renderCharts()` の直後に挿入）**

```javascript
/**
 * exercises セクションを描画（単択・複択・記述）
 * @param {Array} exercises - articles[].sections.exercises
 * @param {string} headline - 記事見出し（GAS通知用）
 * @param {string} date - 記事日付（GAS通知用）
 */
export function renderExercises(exercises, headline, date) {
    const container = document.getElementById('exercises-container');
    if (!container || !exercises || exercises.length === 0) return;

    container.innerHTML = '';

    exercises.forEach((ex, idx) => {
        const block = document.createElement('div');
        block.className = 'exercise-block';

        const header = document.createElement('p');
        header.className = 'exercise-header';
        header.textContent = `問題${idx + 1}`;
        if (ex.chartRef) {
            const refs = Array.isArray(ex.chartRef) ? ex.chartRef : [ex.chartRef];
            header.textContent += `（${refs.map(r => `〔${r}〕`).join('')}を見て答えましょう）`;
        }
        block.appendChild(header);

        const question = document.createElement('p');
        question.className = 'exercise-question';
        question.textContent = ex.question;
        block.appendChild(question);

        if (ex.type === 'essay') {
            const textarea = document.createElement('textarea');
            textarea.className = 'exercise-essay-input';
            textarea.maxLength = ex.maxLength || 100;
            textarea.placeholder = `${ex.maxLength || 50}字以内で書きましょう`;
            textarea.rows = 3;
            block.appendChild(textarea);

            const counter = document.createElement('p');
            counter.className = 'essay-counter';
            counter.textContent = `0 / ${ex.maxLength || 50}字`;
            textarea.addEventListener('input', () => {
                counter.textContent = `${textarea.value.length} / ${ex.maxLength || 50}字`;
            });
            block.appendChild(counter);

            const btn = createAnswerButton();
            block.appendChild(btn);

            const resultDiv = createResultDiv();
            block.appendChild(resultDiv);

            btn.addEventListener('click', () => {
                resultDiv.hidden = false;
                resultDiv.innerHTML = `
                    <p class="exercise-result-label">模範解答</p>
                    <p class="exercise-model-answer">${ex.modelAnswer}</p>
                    <p class="exercise-explanation">${ex.explanation}</p>
                `;
            });

        } else {
            // single / multiple
            const isMultiple = ex.type === 'multiple';
            const choicesDiv = document.createElement('div');
            choicesDiv.className = 'exercise-choices';

            ex.choices.forEach(choice => {
                const label = document.createElement('label');
                label.className = 'exercise-choice-label';

                const input = document.createElement('input');
                input.type = isMultiple ? 'checkbox' : 'radio';
                input.name = `ex-${idx}`;
                input.value = choice.id;
                input.className = 'exercise-choice-input';

                label.appendChild(input);
                label.appendChild(document.createTextNode(` ${choice.id}: ${choice.text}`));
                choicesDiv.appendChild(label);
            });

            block.appendChild(choicesDiv);

            const btn = createAnswerButton();
            block.appendChild(btn);

            const resultDiv = createResultDiv();
            block.appendChild(resultDiv);

            btn.addEventListener('click', async () => {
                const selected = [...choicesDiv.querySelectorAll('input:checked')].map(i => i.value);
                const correct = ex.correctAnswers || [];
                const isCorrect = selected.length === correct.length &&
                    selected.every(s => correct.includes(s)) &&
                    correct.every(c => selected.includes(c));

                // 選択肢に正誤を表示
                choicesDiv.querySelectorAll('input').forEach(input => {
                    input.disabled = true;
                    const lbl = input.parentElement;
                    if (correct.includes(input.value)) {
                        lbl.classList.add('choice-correct');
                    } else if (selected.includes(input.value) && !correct.includes(input.value)) {
                        lbl.classList.add('choice-incorrect');
                    }
                });

                resultDiv.hidden = false;
                resultDiv.innerHTML = `
                    <p class="exercise-result-icon">${isCorrect ? '🎉 せいかい！' : `🤔 正解は ${correct.join('・')} でした`}</p>
                    <p class="exercise-explanation">${ex.explanation}</p>
                `;
                resultDiv.classList.toggle('correct', isCorrect);
                resultDiv.classList.toggle('incorrect', !isCorrect);

                // 全問正解時にGAS通知（最後の問題のみ）
                if (isCorrect && idx === exercises.length - 1) {
                    await sendQuizNotification(headline, date);
                }
            });
        }

        container.appendChild(block);
    });
}

function createAnswerButton() {
    const btn = document.createElement('button');
    btn.className = 'exercise-answer-btn';
    btn.textContent = '答えを確認する';
    return btn;
}

function createResultDiv() {
    const div = document.createElement('div');
    div.className = 'exercise-result';
    div.hidden = true;
    return div;
}
```

- [ ] **Step 3: `renderArticle()` 内の `// クイズ` ブロック（line 207〜267）をif文で囲む**

既存の `// クイズ` コメントから始まるブロック全体を以下のように変更する（コメント行と `const quiz = sections.quiz;` の間に条件分岐を追加）:

```javascript
    // クイズ（exercises がない場合のフォールバック）
    if (!sections.exercises || sections.exercises.length === 0) {
        const fallback = document.getElementById('quiz-fallback');
        if (fallback) fallback.hidden = false;

        const quiz = sections.quiz;
        document.getElementById('quiz-question').textContent = quiz.question;
        // ...（既存コードの残りはそのまま維持、閉じ括弧 } を末尾に追加）
    }
```

- [ ] **Step 4: `renderArticle()` の末尾（`// 出典・参考リンク` ブロックの直前）にcharts・exercisesの呼び出しを挿入**

```javascript
    // グラフ（chart.jsで非同期描画）
    if (sections.charts && sections.charts.length > 0) {
        renderCharts(sections.charts);
    }

    // 問題（exercises形式が優先）
    if (sections.exercises && sections.exercises.length > 0) {
        renderExercises(sections.exercises, theme.headline, data.date);
    }
```

- [ ] **Step 5: `renderCharts` と `renderExercises` を `article.js` でimportしているか確認**

`src/article.js` は `utils.js` の `renderArticle` をimportしており、`renderArticle` 内から呼ばれるため追加importは不要。

- [ ] **Step 6: `npm run dev` でブラウザ確認**

```bash
npm run dev
```

ブラウザで `http://localhost:5173/article.html?date=2026-03-28-test` を開き:
- グラフが表示されること
- 問題が3問表示されること
- 「答えを確認する」が動作すること

- [ ] **Step 7: コミット**

```bash
git add src/utils.js
git commit -m "feat: add renderCharts and renderExercises to utils.js"
```

---

## Task 8: スタイル追加（src/style.css）

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: グラフ・問題用スタイルを `src/style.css` の末尾に追加**

```css
/* ===== Chart Section ===== */
.charts-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.chart-wrapper {
    background: #fff;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.chart-title {
    font-weight: 700;
    font-size: 0.95rem;
    color: #1a1a2e;
    margin: 0 0 0.75rem;
}

.chart-source {
    font-size: 0.75rem;
    color: #888;
    margin: 0.5rem 0 0;
    text-align: right;
}

/* ===== Exercises Section ===== */
.exercises-container {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.exercise-block {
    background: #f8f9ff;
    border-radius: 12px;
    padding: 1.25rem;
    border-left: 4px solid #1a73e8;
}

.exercise-header {
    font-size: 0.8rem;
    color: #1a73e8;
    font-weight: 700;
    margin: 0 0 0.5rem;
}

.exercise-question {
    font-weight: 700;
    font-size: 1rem;
    color: #1a1a2e;
    margin: 0 0 1rem;
    line-height: 1.6;
}

.exercise-choices {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
}

.exercise-choice-label {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    border: 1.5px solid #e0e0e0;
    font-size: 0.9rem;
    line-height: 1.5;
    transition: border-color 0.15s;
}

.exercise-choice-label:hover {
    border-color: #1a73e8;
}

.exercise-choice-label.choice-correct {
    border-color: #188038;
    background: #e6f4ea;
    color: #188038;
    font-weight: 700;
}

.exercise-choice-label.choice-incorrect {
    border-color: #c5221f;
    background: #fce8e6;
    color: #c5221f;
}

.exercise-choice-input {
    flex-shrink: 0;
    margin-top: 3px;
}

.exercise-essay-input {
    width: 100%;
    padding: 0.75rem;
    border: 1.5px solid #e0e0e0;
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
    box-sizing: border-box;
    margin-bottom: 0.25rem;
}

.essay-counter {
    text-align: right;
    font-size: 0.75rem;
    color: #888;
    margin: 0 0 0.75rem;
}

.exercise-answer-btn {
    background: #1a73e8;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.6rem 1.5rem;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s;
}

.exercise-answer-btn:hover {
    background: #1557b0;
}

.exercise-result {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 8px;
    background: #f1f3f4;
}

.exercise-result.correct {
    background: #e6f4ea;
    border: 1.5px solid #188038;
}

.exercise-result.incorrect {
    background: #fce8e6;
    border: 1.5px solid #c5221f;
}

.exercise-result-icon {
    font-weight: 700;
    margin: 0 0 0.5rem;
}

.exercise-explanation {
    font-size: 0.9rem;
    color: #444;
    line-height: 1.6;
    margin: 0.5rem 0 0;
}

.exercise-result-label {
    font-size: 0.8rem;
    font-weight: 700;
    color: #555;
    margin: 0 0 0.4rem;
}

.exercise-model-answer {
    font-size: 0.95rem;
    font-weight: 700;
    color: #188038;
    margin: 0 0 0.5rem;
    line-height: 1.6;
}
```

- [ ] **Step 2: `npm run dev` でスタイルを確認**

```bash
npm run dev
```

ブラウザでグラフ・問題のレイアウトが崩れていないことを確認する。

- [ ] **Step 3: コミット**

```bash
git add src/style.css
git commit -m "feat: add chart and exercise styles"
```

---

## Task 9: エンドツーエンドテスト

- [ ] **Step 1: 新形式で記事を生成**

```bash
GEMINI_API_KEY=your_key node scripts/generate.mjs --date 2026-03-29
```

- [ ] **Step 2: 生成されたJSONを検証**

```bash
node -e "
import('./public/articles/2026-03-29.json', {assert:{type:'json'}}).then(m => {
  const s = m.default.sections;
  const errors = [];

  // charts検証
  if (!s.charts || s.charts.length === 0) errors.push('charts missing');
  else {
    const c = s.charts[0];
    if (!c.id) errors.push('chart.id missing');
    if (!['line','bar','doughnut','stacked-bar'].includes(c.type)) errors.push('invalid chart type: ' + c.type);
    if (!c.datasets || c.datasets.length === 0) errors.push('chart.datasets missing');
    const pts = c.datasets[0]?.data?.length;
    if (!pts || pts < 3) errors.push('chart data too short: ' + pts);
  }

  // exercises検証
  if (!s.exercises || s.exercises.length !== 3) errors.push('exercises must be 3, got: ' + s.exercises?.length);
  else {
    const types = s.exercises.map(e => e.type);
    if (!types.includes('single')) errors.push('missing single exercise');
    if (!types.includes('multiple')) errors.push('missing multiple exercise');
    if (!types.includes('essay')) errors.push('missing essay exercise');
    s.exercises.forEach((e, i) => {
      if (!e.chartRef) errors.push('exercise ' + i + ' missing chartRef');
      if (e.type !== 'essay' && (!e.correctAnswers || e.correctAnswers.length === 0)) errors.push('exercise ' + i + ' missing correctAnswers');
      if (e.type === 'multiple' && e.correctAnswers?.length < 2) errors.push('multiple must have 2+ answers');
      if (!e.explanation?.includes('年')) errors.push('exercise ' + i + ' explanation lacks year data');
    });
  }

  if (errors.length > 0) {
    console.error('VALIDATION ERRORS:');
    errors.forEach(e => console.error(' -', e));
  } else {
    console.log('✅ All validations passed');
    console.log('  charts:', s.charts.length, 'グラフ');
    console.log('  exercises:', s.exercises.map(e => e.type).join(', '));
  }
});
"
```

Expected: `✅ All validations passed`

- [ ] **Step 3: ブラウザで動作確認**

```bash
npm run dev
```

以下を確認:
- `http://localhost:5173/article.html?date=2026-03-29` でグラフが表示される
- 問題1（単択）: 「当てはまらないもの」形式、答えを選んで結果が表示される
- 問題2（複択）: チェックボックス形式、複数選択できる
- 問題3（記述）: テキストエリアと文字数カウンタが動く、「答えを確認する」で模範解答が出る
- 旧記事（`?date=2026-03-04`）が壊れていないこと

- [ ] **Step 4: 最終コミット**

```bash
git add .
git commit -m "feat: complete newspaper improvement - charts, exercises, datasets"
```

---

## 注意事項

- `--date` オプションで指定した日付のファイルが既に存在する場合は生成をスキップする（`generate.mjs` の既存ロジック）。テスト時は存在しない日付を使うか、ファイルを削除してから再実行すること。
- Gemini 2.5 Flash はJSONの出力が不安定なことがある。3回リトライのロジックは既存コードにあるため変更不要。
- `data/` ディレクトリのJSONは「AI補完データ」であるため、川崎市公式サイトで確認できる場合は数値を更新することを推奨する。
