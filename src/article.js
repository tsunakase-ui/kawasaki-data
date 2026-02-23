/**
 * article.js - 個別記事ページ
 */
import { fetchArticle, renderArticle } from './utils.js';

async function init() {
    const loading = document.getElementById('loading');
    const notFound = document.getElementById('not-found');
    const articleEl = document.getElementById('article');

    const params = new URLSearchParams(window.location.search);
    const date = params.get('date');

    if (!date) {
        loading.hidden = true;
        notFound.hidden = false;
        return;
    }

    try {
        const data = await fetchArticle(date);
        loading.hidden = true;

        if (!data) {
            notFound.hidden = false;
            return;
        }

        articleEl.hidden = false;
        renderArticle(data);

        // ページタイトルを更新
        document.title = `${data.theme.headline} ｜ 日刊 こども川崎市新聞`;
    } catch (err) {
        console.error('Failed to load article:', err);
        loading.hidden = true;
        notFound.hidden = false;
    }
}

init();
