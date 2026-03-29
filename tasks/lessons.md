# 教訓・パターン集

## 2026-03-29

---

### 1. 記事生成の先祖帰り（format regression）

**何が起きたか**
`feature/newspaper-improvement` マージ後の最初の記事（2026-03-27）が旧フォーマット（quiz のみ・charts/exercises なし）で生成された。

**根本原因**
GitHub Actions が改善マージ前のコードで動いていた可能性が高い（スケジュール実行のタイミング問題）。生成スクリプト側に出力フォーマットの検証がなく、旧形式でも正常終了してしまっていた。

**対処**
`generate.mjs` のパース直後に charts/exercises の存在チェックを追加。バリデーション失敗時は `throw` して既存のリトライ機構（最大3回）を起動するようにした。

**教訓**
- Gemini API のレスポンスは「JSON として正しい」だけでなく「必須フィールドが揃っているか」まで検証する
- 新フォーマット導入時は生成スクリプト側にバリデーションをセットで入れる

---

### 2. 共通 utils の DOM 依存（ページ間の影響範囲）

**何が起きたか**
`article.html` ではグラフ・問題が正常表示されるのに、`index.html`（トップページ）では表示されなかった。

**根本原因**
`utils.js` の `renderCharts()` / `renderExercises()` は `document.getElementById('charts-section')` 等を探して存在しなければ即 `return` する設計。`article.html` には該当 DOM があったが `index.html` には追加されていなかった。

**対処**
`index.html` に `#charts-section`・`#charts-container`・`#exercises-container`・`#quiz-fallback` を追加。

**教訓**
- `utils.js` に共通レンダリング関数を追加・変更するときは、その関数を呼び出す **全ページの HTML** に必要な DOM 要素があるか確認する（現在: `index.html`, `article.html`）
- 「片方で動く＝全ページで動く」ではない

---

### 3. exercises の通知トリガーが essay では発火しない

**何が起きたか**
exercises の最後の問題が essay 形式の場合、メール通知が送られていなかった。

**根本原因**
通知ロジックが choice 型の `btn.addEventListener` の中だけにあり、essay 型のハンドラには含まれていなかった。`idx === exercises.length - 1` の条件を満たすのは常に essay（最後）なのに、そのハンドラ内に通知がなかった。

**対処**
essay ハンドラにも「最後の問題なら通知送信」を追加。さらに choice 型の通知条件から `isCorrect` を撤廃し、最後の問題のボタンを押したら（正誤問わず）送信するよう変更。

**教訓**
- exercises のような「複数タイプを forEach でレンダリング」する構造では、**全タイプのハンドラ**に横断ロジック（通知・集計等）が入っているか確認する
- 「最後の問題」に依存するロジックは、最後が何タイプになるか意識する

---

### 4. clasp push / deploy の注意点

**何が起きたか**
- GAS 上のファイル名が `コード.js`（日本語）だったのにローカルは `Code.gs` で管理していた
- `clasp deploy` をデプロイ ID なしで実行すると**新しいデプロイ**が作成され、既存の Webhook URL は更新されない

**対処**
- `clasp pull` で実態を確認してからファイルを統一
- 既存デプロイの更新は `clasp deploy --deploymentId <ID>` を必ず指定する

**既存デプロイ ID**
`AKfycbzv5vH7m-eeFiiZbuZVEPaiInW-VZGLgwWyRz-W70Tit5NhL-epO9yTKIv_s2lAkCmQ`

**教訓**
- GAS を clasp で初めて触るときは先に `clasp pull` で現状を把握する
- デプロイ更新は常に `--deploymentId` を明示する。省略すると URL が変わり、utils.js の `GAS_WEBHOOK_URL` も更新が必要になる
