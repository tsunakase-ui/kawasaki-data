/**
 * スクレイピングモジュール
 * 川崎市関連の情報ソースからテーマに関連する情報を取得
 */
import * as cheerio from 'cheerio';

const SOURCES = [
    {
        name: '川崎市公式サイト',
        url: 'https://www.city.kawasaki.jp/',
        searchUrl: (query) =>
            `https://www.city.kawasaki.jp/cgi-bin/search.cgi?q=${encodeURIComponent(query)}&num=5`,
    },
    {
        name: 'タウンニュース川崎区版',
        url: 'https://www.townnews.co.jp/0206/',
        searchUrl: (query) =>
            `https://www.townnews.co.jp/0206/search.html?query=${encodeURIComponent(query)}`,
    },
    {
        name: '川崎市オープンデータ',
        url: 'https://www.city.kawasaki.jp/shisei/category/51-7-0-0-0-0-0-0-0-0.html',
        searchUrl: () =>
            'https://www.city.kawasaki.jp/shisei/category/51-7-0-0-0-0-0-0-0-0.html',
    },
];

/**
 * URLからHTMLを取得してテキストを抽出
 */
async function fetchPage(url, timeout = 10000) {
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'KodomoKawasakiNews/1.0 (Educational Purpose)',
                'Accept': 'text/html',
                'Accept-Language': 'ja',
            },
        });
        clearTimeout(id);

        if (!res.ok) return null;
        const html = await res.text();
        return html;
    } catch (err) {
        console.warn(`  ⚠ フェッチ失敗 (${url}): ${err.message}`);
        return null;
    }
}

/**
 * HTMLからページタイトルを抽出
 */
function extractTitle(html) {
    const $ = cheerio.load(html);
    return $('title').text().trim() || $('h1').first().text().trim() || '';
}

/**
 * HTMLからテキストコンテンツを抽出
 */
function extractText(html, maxChars = 2000) {
    const $ = cheerio.load(html);
    // スクリプト、スタイル、ナビを除去
    $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();

    const text = $('article, main, .content, #content, body')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim();

    return text.slice(0, maxChars);
}

/**
 * 検索結果ページから個別記事URLを抽出
 */
function extractArticleLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = [];

    $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (!href || !text || text.length < 5) return;

        // 絶対URLに変換
        let fullUrl;
        try {
            fullUrl = new URL(href, baseUrl).href;
        } catch {
            return;
        }

        // 検索結果やカテゴリページでなく、記事っぽいURLを収集
        if (fullUrl.includes('search') || fullUrl.includes('category')) return;
        if (fullUrl === baseUrl) return;

        links.push({ title: text.slice(0, 80), url: fullUrl });
    });

    // 重複除去して最大5件
    const unique = [...new Map(links.map(l => [l.url, l])).values()];
    return unique.slice(0, 5);
}

/**
 * テーマに関する情報をスクレイピング
 */
export async function scrapeForTheme(topic, category) {
    console.log(`🔍 スクレイピング: "${topic}" (${category})`);

    const results = [];
    const keywords = topic.replace(/[（）()・]/g, ' ').split(/\s+/).filter(w => w.length > 1);
    const searchQuery = `川崎市 ${keywords.slice(0, 3).join(' ')}`;

    for (const source of SOURCES) {
        console.log(`  📡 ${source.name}...`);
        try {
            const url = source.searchUrl(searchQuery);
            const html = await fetchPage(url);
            if (html) {
                const title = extractTitle(html);
                const text = extractText(html);
                const articleLinks = extractArticleLinks(html, url);

                if (text.length > 50) {
                    results.push({
                        source: source.name,
                        url: url,
                        title: title,
                        content: text,
                        relatedLinks: articleLinks,
                    });
                    console.log(`  ✅ ${text.length}文字取得 (関連リンク: ${articleLinks.length}件)`);
                } else {
                    console.log(`  ⏭ テキスト不足 (${text.length}文字)`);
                }
            }
        } catch (err) {
            console.warn(`  ❌ ${source.name}: ${err.message}`);
        }
    }

    // スクレイピング結果が少なくても、Geminiの知識で補完可能
    if (results.length === 0) {
        console.log('  ℹ スクレイピング結果なし。Geminiの知識で生成します。');
    }

    return results;
}
