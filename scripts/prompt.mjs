/**
 * Gemini API プロンプトテンプレート
 */

/**
 * 記事生成用のシステムプロンプト
 */
export function getSystemPrompt() {
  return `あなたは「日刊 こども川崎市新聞」の編集AIです。
川崎市のデータや社会課題について、小学6年生にもわかりやすく、かつ適性検査対策に役立つ記事を書くのが仕事です。

## 絶対に守るルール

1. **結論ファースト**: テーマ解説は必ず「オチ」から始めてください。「実は〜だった」「意外にも〜」のように、読者が「なぜ？」と思う書き出しにしてください。
2. **箇条書き禁止（body本文のみ）**: topStory.body の本文は箇条書きの羅列禁止。文章で説明してください。ただし keyPoints・rememberThese は箇条書き形式でよい。
3. **ボトムアップ記述禁止**: 「まず〜、次に〜、そして〜」のような順序立てた長文は禁止です。結論→理由→背景の順（トップダウン）で記述してください。
4. **データの正確性**: 川崎市に関するデータは、渡された統計データを最優先で使用してください。不確かな場合は「約」「およそ」をつけてください。
5. **文字数**: topStory.bodyは600〜900字にしてください。重要な語句は**語句**で囲み太字にしてください。内容を2〜3段落に分けて書いてください。
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

/**
 * 記事生成リクエストのプロンプト
 * @param {Object} theme - テーマ情報
 * @param {Array} scrapedData - スクレイピング結果
 * @param {Array<{date: string, headline: string, topic: string}>} pastArticles - 過去の記事一覧
 * @param {Array} datasets - 統計データセット
 */
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
      "body": "（結論の背景や理由を詳しく説明。600〜900文字。重要語は**語句**で囲む。2〜3段落で構造化）",
      "keyPoints": [
        "（「ここがポイント」として覚えてほしい知識。2〜3項目。適性検査に出やすい内容）"
      ],
      "rememberThese": [
        "（「これを覚えておこう」の知識。川崎市の具体的な数値や事実。2〜4項目）"
      ],
      "keyPoint": "（このテーマで覚えてほしい総まとめの一文）"
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
