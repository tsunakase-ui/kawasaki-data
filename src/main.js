/**
 * main.js - トップページ（今日の記事を表示）
 */
import { getToday, fetchArticle, fetchIndex, renderArticle } from './utils.js';

async function init() {
    const loading = document.getElementById('loading');
    const noArticle = document.getElementById('no-article');
    const articleEl = document.getElementById('article');

    try {
        // まず今日の記事を試す
        const today = getToday();
        let data = await fetchArticle(today);

        // 今日の記事がなければ最新の記事を表示
        if (!data) {
            const index = await fetchIndex();
            if (index.articles.length > 0) {
                const latestDate = index.articles[0].date;
                data = await fetchArticle(latestDate);
            }
        }

        loading.hidden = true;

        if (!data) {
            noArticle.hidden = false;
            return;
        }

        articleEl.hidden = false;
        renderArticle(data);
    } catch (err) {
        console.error('Failed to load article:', err);
        loading.hidden = true;
        noArticle.hidden = false;
    }
}

init();
