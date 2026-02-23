#!/usr/bin/env node
/**
 * 記事生成スクリプト
 * 毎日1回 GitHub Actions から実行される
 *
 * Usage:
 *   GEMINI_API_KEY=xxx node scripts/generate.mjs
 *   GEMINI_API_KEY=xxx node scripts/generate.mjs --date 2026-02-24
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { selectTheme } from './themes.mjs';
import { scrapeForTheme } from './scraper.mjs';
import { getSystemPrompt, getGenerationPrompt } from './prompt.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARTICLES_DIR = join(ROOT, 'public', 'articles');
const INDEX_PATH = join(ARTICLES_DIR, 'index.json');

// ===== ユーティリティ =====

function getDateStr() {
    // コマンドライン引数から日付を取得、なければ今日の日付
    const args = process.argv.slice(2);
    const dateIdx = args.indexOf('--date');
    if (dateIdx !== -1 && args[dateIdx + 1]) {
        return args[dateIdx + 1];
    }

    const now = new Date();
    const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const y = jst.getFullYear();
    const m = String(jst.getMonth() + 1).padStart(2, '0');
    const d = String(jst.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function loadIndex() {
    if (!existsSync(INDEX_PATH)) {
        return { articles: [] };
    }
    return JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
}

function saveIndex(index) {
    writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
}

function saveArticle(dateStr, article) {
    if (!existsSync(ARTICLES_DIR)) {
        mkdirSync(ARTICLES_DIR, { recursive: true });
    }
    const path = join(ARTICLES_DIR, `${dateStr}.json`);
    writeFileSync(path, JSON.stringify(article, null, 2), 'utf-8');
    return path;
}

// ===== メイン処理 =====

async function main() {
    console.log('📰 日刊 こども川崎市新聞 — 記事生成開始');
    console.log('='.repeat(50));

    // 1. API キー確認
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY が設定されていません');
        process.exit(1);
    }

    // 2. 日付
    const dateStr = getDateStr();
    console.log(`📅 日付: ${dateStr}`);

    // 既に記事が存在する場合はスキップ
    const articlePath = join(ARTICLES_DIR, `${dateStr}.json`);
    if (existsSync(articlePath)) {
        console.log(`⏭ ${dateStr} の記事は既に存在します。スキップします。`);
        process.exit(0);
    }

    // 3. テーマ選定
    const index = loadIndex();
    const pastTopics = index.articles.slice(0, 30).map(a => a.topic);
    const theme = selectTheme(pastTopics);
    console.log(`🎯 テーマ: ${theme.category} > ${theme.topic}`);

    // 4. スクレイピング
    const scrapedData = await scrapeForTheme(theme.topic, theme.category);
    console.log(`📝 スクレイピング結果: ${scrapedData.length}件`);

    // 5. Gemini API で記事生成
    console.log('🤖 Gemini API で記事を生成中...');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
        },
    });

    const prompt = getGenerationPrompt(theme, scrapedData);

    let article;
    let retries = 3;

    while (retries > 0) {
        try {
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: getSystemPrompt() }] },
            });

            const responseText = result.response.text();

            // JSONをパース（コードブロックで囲まれている場合に対応）
            let jsonStr = responseText;
            const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const generated = JSON.parse(jsonStr);

            // 完全な記事オブジェクトを構築
            article = {
                date: dateStr,
                theme: generated.theme,
                sections: generated.sections,
            };

            console.log(`✅ 記事生成成功: "${article.theme.headline}"`);
            break;
        } catch (err) {
            retries--;
            if (retries > 0) {
                console.warn(`⚠ 生成失敗、リトライ (残り${retries}回): ${err.message}`);
                console.log('⏳ 60秒待機中...');
                await new Promise(r => setTimeout(r, 60000));
            } else {
                console.error(`❌ 記事生成に失敗しました: ${err.message}`);
                process.exit(1);
            }
        }
    }

    // 6. 記事の保存
    const savedPath = saveArticle(dateStr, article);
    console.log(`💾 記事保存: ${savedPath}`);

    // 7. インデックス更新（新しい記事を先頭に）
    index.articles.unshift({
        date: dateStr,
        headline: article.theme.headline,
        category: article.theme.category,
        topic: article.theme.topic,
    });
    saveIndex(index);
    console.log('📋 インデックス更新完了');

    console.log('='.repeat(50));
    console.log('🎉 完了！');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
