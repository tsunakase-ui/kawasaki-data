/**
 * archive.js - バックナンバー一覧ページ
 */
import { fetchIndex, formatDate } from './utils.js';

async function init() {
    const loading = document.getElementById('loading');
    const noArticles = document.getElementById('no-articles');
    const archiveList = document.getElementById('archive-list');

    try {
        const index = await fetchIndex();

        loading.hidden = true;

        if (index.articles.length === 0) {
            noArticles.hidden = false;
            return;
        }

        archiveList.hidden = false;

        // 日付の降順でソート（新しい記事が上に来る）
        const sorted = [...index.articles].sort((a, b) => b.date.localeCompare(a.date));

        archiveList.innerHTML = sorted
            .map(article => `
        <a href="/article.html?date=${article.date}" class="archive-card">
          <div class="archive-card-date">${formatDate(article.date)}</div>
          <div class="archive-card-headline">${article.headline}</div>
          <div class="archive-card-category">${article.category}</div>
        </a>
      `)
            .join('');
    } catch (err) {
        console.error('Failed to load archive:', err);
        loading.hidden = true;
        noArticles.hidden = false;
    }
}

init();
