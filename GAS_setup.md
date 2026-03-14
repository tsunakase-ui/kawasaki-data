# GAS（Google Apps Script）による通知サーバーの構築手順

このドキュメントでは、EmailJSに代わり、Google Apps Scriptを用いて「学習完了通知」および「未完了リマインダー」を実装する手順を解説します。

## 1. GAS プロジェクトの作成
1. [Google Apps Script](https://script.google.com/) にアクセスし、「新しいプロジェクト」をクリックします。
2. プロジェクト名を「川崎市新聞通知サーバー」などに変更します。

## 2. スクリプトの貼り付け
最初から入力されている `function myFunction() {}` をすべて消去し、以下のテストコードを貼り付けます。

```javascript
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
    
    // スクリプトプロパティ（保存領域）に「今日学習完了した」というフラグを立てる
    const props = PropertiesService.getScriptProperties();
    const todayStr = getTodayString();
    props.setProperty("COMPLETED_" + todayStr, "true");
    
    // メールの件名と本文
    const subject = `【学習完了！】${articleTitle} のクイズに正解しました`;
    const body = `
娘さんが今日のクイズに正解しました！🎉

■ 学習内容
- 記事: ${articleTitle}
- 日付: ${articleDate}
- 正解時刻: ${answeredTime}
- 記事URL: ${articleUrl}

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
```

## 3. Webアプリとしてデプロイ
1. 画面右上の青い **「デプロイ」** ボタンをクリックし、**「新しいデプロイ」** を選びます。
2. 左側の歯車アイコンから **「ウェブアプリ」** を選択します。
3. 以下の設定にして **「デプロイ」** を押します：
   - **実行するユーザー**: `自分`
   - **アクセスできるユーザー**: `全員`
4. ※初回は「アクセスを承認」が求められます。自分のアカウントを選び、「詳細」→「（安全ではないページ）に移動」をクリックし、許可してください。
5. デプロイ完了画面で **「ウェブアプリのURL」** (`https://script.google.com/macros/s/.../exec`) をコピーします。

## 4. プロジェクトソースの更新
コピーした「ウェブアプリのURL」を、 `src/utils.js` の以下の部分に貼り付けます。

```javascript
// ===== GAS WebHook 設定 =====
// 発行された Webアプリ の URL をここに設定してください
const GAS_WEBHOOK_URL = 'ここにURLを貼り付け';
```

## 5. リマインダーのタイマー（トリガー）設定
1. GASエディタの左メニューから **時計のアイコン（トリガー）** をクリックします。
2. 右下の青い **「トリガーを追加」** ボタンをクリックします。
3. 以下の設定にして **「保存」** を押します：
   - **実行する関数を選択**: `checkAndRemind`
   - **実行するデプロイを選択**: `Head`
   - **イベントのソースを選択**: `時間主導型`
   - **時間ベースのトリガーのタイプを選択**: `日付ベースのタイマー`
   - **時刻を選択**: `午後7時～8時` (※GASの仕様上、19:00ぴったりの指定はできません。19:00〜20:00の間に実行されます。)

これで完了です！ローカルサーバーで記事を開いてクイズに正解し、メールが届くか動作確認してください。
