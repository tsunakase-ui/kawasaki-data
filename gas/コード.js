// ============================================
// 設定項目（ここをご自身の環境に合わせて変更してください）
// ============================================

// 通知を受信したいメールアドレス（複数ある場合はカンマ区切り、例: "a@test.com,b@test.com"）
const NOTIFY_EMAIL = "tsuna.kase@gmail.com"; 

// メールの送信者名（受信トレイで表示される名前）
const SENDER_NAME = "日刊 こども川崎市新聞";


// ============================================
// メイン処理（WebHook受信） - サイトからの「学習完了」通知
// ============================================
function doPost(e) {
  try {
    // サイトから送られてきたデータ(JSON)を受け取る
    const data = JSON.parse(e.postData.contents);
    
    const articleTitle = data.article_title || "不明な記事";
    const articleDate = data.article_date || "";
    const answeredTime = data.answered_time || "";
    const articleUrl = data.article_url || "";
    const answers = data.answers || [];

    // スクリプトプロパティ（保存領域）に「今日学習完了した」というフラグを立てる
    const props = PropertiesService.getScriptProperties();
    const todayStr = getTodayString();
    props.setProperty("COMPLETED_" + todayStr, "true");

    // 各問の回答サマリを組み立て
    let answersText = "";
    if (answers.length > 0) {
      const lines = answers.map(function(a) {
        if (!a) return "";
        const typeLabel = a.type === "essay" ? "記述" : a.type === "multiple" ? "選択（複数）" : "選択（単一）";
        const correctLabel = a.correct === null
          ? "（自己採点）"
          : a.correct
            ? "→ ○"
            : "→ ✗（正解: " + a.correctAnswer + "）";
        return "問題" + a.number + "（" + typeLabel + "）: " + a.answer + "  " + correctLabel;
      });
      answersText = "\n■ 各問の回答\n" + lines.join("\n");
    }

    // メールの件名と本文
    const subject = `【学習完了！】${articleTitle} の問題に取り組みました`;
    const body = `
娘さんが今日の問題に取り組みました！🎉

■ 学習内容
- 記事: ${articleTitle}
- 日付: ${articleDate}
- 完了時刻: ${answeredTime}
- 記事URL: ${articleUrl}
${answersText}

今日もよく頑張りました！褒めてあげてください😊
    `.trim();
    
    // メール送信
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject,
      body: body,
      name: SENDER_NAME
    });
    
    // 成功をサイト側に返す
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    // エラー時はエラー内容を返す
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// サイトからのOPTIONSリクエスト(CORS対応)を許可する
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.JSON);
}


// ============================================
// 定期実行処理 - 19時の未完了リマインダー
// ============================================
function checkAndRemind() {
  const props = PropertiesService.getScriptProperties();
  const todayStr = getTodayString();
  
  // 今日の完了フラグをチェック
  const isCompleted = props.getProperty("COMPLETED_" + todayStr);
  
  if (isCompleted !== "true") {
    // 未完了の場合、リマインダーメールを送信
    const subject = "【リマインド】今日の「こども川崎市新聞」クイズがまだ終わっていません";
    const body = `
19時になりましたが、今日の「こども川崎市新聞」クイズの正解通知がまだ届いていません。

学習が終わっているか確認をお願いします！

明日の朝には新しい記事が追加されます。
    `.trim();
    
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: subject,
      body: body,
      name: SENDER_NAME
    });
    console.log("リマインダーメールを送信しました。");
  } else {
    // 完了している場合は何もしない
    console.log("本日の学習は完了しているため、リマインダーは送信しません。");
  }
  
  // 翌日のために古いデータを整理（3日前のフラグを消すなど）
  cleanUpOldProperties(props);
}


// ============================================
// ユーティリティ関数
// ============================================
// JSTでの今日の日付文字列 (YYYYMMDD) を取得
function getTodayString() {
  const now = new Date();
  const jst = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// 古いフラグを削除
function cleanUpOldProperties(props) {
  const keys = props.getKeys();
  const now = new Date();
  
  keys.forEach(key => {
    if (key.startsWith("COMPLETED_")) {
      const dateStr = key.replace("COMPLETED_", "");
      if (dateStr.length === 8) {
        const y = parseInt(dateStr.substring(0, 4));
        const m = parseInt(dateStr.substring(4, 6)) - 1;
        const d = parseInt(dateStr.substring(6, 8));
        const recordDate = new Date(y, m, d);
        
        // 3日以上前なら削除
        if ((now - recordDate) > 3 * 24 * 60 * 60 * 1000) {
          props.deleteProperty(key);
        }
      }
    }
  });
}
