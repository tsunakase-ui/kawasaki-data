/**
 * 共通ユーティリティ
 */

/**
 * 日付を「2026年2月24日（月）」形式にフォーマット
 */
export function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00+09:00');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return `${year}年${month}月${day}日（${weekday}）`;
}

/**
 * 記事JSONを取得
 */
export async function fetchArticle(date) {
    try {
        const res = await fetch(`/articles/${date}.json`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * 記事一覧JSONを取得
 */
export async function fetchIndex() {
    try {
        const res = await fetch('/articles/index.json');
        if (!res.ok) return { articles: [] };
        return await res.json();
    } catch {
        return { articles: [] };
    }
}

/**
 * 今日の日付 (YYYY-MM-DD)
 */
export function getToday() {
    const now = new Date();
    const jst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const y = jst.getFullYear();
    const m = String(jst.getMonth() + 1).padStart(2, '0');
    const d = String(jst.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Mermaid を初期化して描画
 */
export async function renderMermaid(containerId, mermaidCode) {
    const container = document.getElementById(containerId);
    if (!container || !mermaidCode) return;

    const { default: mermaid } = await import('mermaid');
    mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
            primaryColor: '#e8f0fe',
            primaryTextColor: '#1a1a2e',
            primaryBorderColor: '#1a73e8',
            lineColor: '#5f6368',
            secondaryColor: '#f3f0ff',
            tertiaryColor: '#e8faf5',
            fontFamily: "'Noto Sans JP', sans-serif",
            fontSize: '14px',
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 12,
        },
    });

    try {
        const { svg } = await mermaid.render('mermaid-svg', mermaidCode);
        container.innerHTML = svg;
    } catch (e) {
        console.warn('Mermaid render error:', e);
        container.innerHTML = `<p style="color: #999; text-align: center;">マップの表示に失敗しました</p>`;
    }
}

/**
 * 記事セクションを描画（index.html と article.html で共通）
 */
export function renderArticle(data) {
    const { theme, sections } = data;

    // メタ情報
    document.getElementById('article-date').textContent = formatDate(data.date);
    document.getElementById('article-category').textContent = theme.category;
    document.getElementById('article-headline').textContent = theme.headline;

    // テーマ解説
    document.getElementById('top-story-conclusion').textContent = sections.topStory.conclusion;
    document.getElementById('top-story-body').innerHTML = sections.topStory.body
        .split('\n')
        .filter(p => p.trim())
        .map(p => `<p>${p}</p>`)
        .join('');
    document.getElementById('top-story-keypoint').textContent = sections.topStory.keyPoint;

    // 概念マップ
    renderMermaid('concept-map-diagram', sections.conceptMap.mermaidCode);
    document.getElementById('concept-map-description').textContent = sections.conceptMap.description;

    // データ
    const factsGrid = document.getElementById('data-facts');
    factsGrid.innerHTML = sections.dataInsight.facts
        .map(f => `
      <div class="data-fact-card">
        <div class="data-fact-label">${f.label}</div>
        <div class="data-fact-value">${f.value}</div>
        <div class="data-fact-context">${f.context}</div>
      </div>
    `)
        .join('');
    document.getElementById('data-trend').textContent = sections.dataInsight.trend;

    // 会話
    const dialogueContainer = document.getElementById('dialogue-container');
    dialogueContainer.innerHTML = sections.dialogue.turns
        .map((turn, i) => {
            const char = sections.dialogue.characters.find(c => c.name === turn.speaker);
            const isTeacher = char?.trait?.includes('先生') || char?.trait?.includes('導く');
            return `
        <div class="dialogue-turn ${isTeacher ? 'teacher' : ''}" style="--turn-index: ${i}">
          <div class="dialogue-avatar">${char?.icon || '👤'}</div>
          <div class="dialogue-bubble">
            <div class="dialogue-name">${turn.speaker}</div>
            <div class="dialogue-text">${turn.text}</div>
          </div>
        </div>
      `;
        })
        .join('');

    // クイズ
    const quiz = sections.quiz;
    document.getElementById('quiz-question').textContent = quiz.question;
    const choicesContainer = document.getElementById('quiz-choices');
    choicesContainer.innerHTML = quiz.choices
        .map(c => `
      <button class="quiz-choice" data-id="${c.id}" id="quiz-choice-${c.id}">
        <span class="quiz-choice-id">${c.id}</span>
        <span class="quiz-choice-text">${c.text}</span>
      </button>
    `)
        .join('');

    // クイズのインタラクション
    let answered = false;
    choicesContainer.querySelectorAll('.quiz-choice').forEach(btn => {
        btn.addEventListener('click', () => {
            if (answered) return;
            answered = true;

            const selectedId = btn.dataset.id;
            const isCorrect = selectedId === quiz.correctAnswer;

            // 全選択肢を無効化
            choicesContainer.querySelectorAll('.quiz-choice').forEach(b => {
                b.classList.add('disabled');
                if (b.dataset.id === quiz.correctAnswer) {
                    b.classList.add('correct');
                } else if (b.dataset.id === selectedId && !isCorrect) {
                    b.classList.add('incorrect');
                }
            });
            btn.classList.add('selected');

            // 結果表示
            const resultEl = document.getElementById('quiz-result');
            resultEl.hidden = false;
            resultEl.classList.add(isCorrect ? 'correct' : 'incorrect');
            document.getElementById('quiz-result-icon').textContent = isCorrect ? '🎉' : '🤔';
            document.getElementById('quiz-result-text').textContent = isCorrect
                ? 'せいかい！すごい！'
                : `ざんねん… 正解は ${quiz.correctAnswer} でした`;
            document.getElementById('quiz-explanation').textContent = quiz.explanation;
        });
    });
}
