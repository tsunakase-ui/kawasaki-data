/**
 * 共通ユーティリティ
 */

// ===== EmailJS 設定 =====
// EmailJS アカウント設定後に以下を更新してください
const EMAILJS_CONFIG = {
    serviceId: '',    // EmailJS Service ID
    templateId: '',   // EmailJS Template ID
    publicKey: '',    // EmailJS Public Key
    parentEmail: 'tsuna.kase@gmail.com',
};

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
 * メール送信 (EmailJS)
 */
async function sendQuizNotification(headline, date) {
    if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.publicKey) {
        console.log('📧 EmailJS 未設定のためメール送信スキップ');
        return false;
    }

    try {
        // EmailJS はグローバル変数として読み込まれている
        if (typeof emailjs === 'undefined') {
            console.warn('📧 EmailJS SDK が読み込まれていません');
            return false;
        }

        emailjs.init(EMAILJS_CONFIG.publicKey);

        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

        await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            to_email: EMAILJS_CONFIG.parentEmail,
            article_title: headline,
            article_date: date,
            answered_time: timeStr,
        });

        console.log('📧 メール送信成功');
        return true;
    } catch (err) {
        console.warn('📧 メール送信失敗:', err);
        return false;
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

    // ヒーロー画像
    const heroContainer = document.getElementById('hero-image');
    if (heroContainer && data.heroImage) {
        heroContainer.hidden = false;
        heroContainer.innerHTML = `
            <img src="${data.heroImage.url}" alt="${data.heroImage.alt || theme.headline}" loading="lazy" />
            <div class="hero-image-credit">
                📷 Photo by <a href="${data.heroImage.creditUrl}" target="_blank" rel="noopener">${data.heroImage.credit}</a> on Unsplash
            </div>
        `;
    }

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
        btn.addEventListener('click', async () => {
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

            // 正解時にメール通知
            if (isCorrect) {
                const notifEl = document.createElement('div');
                notifEl.className = 'email-notification sending';
                notifEl.innerHTML = '<p>📧 お知らせを送信中…</p>';
                resultEl.after(notifEl);

                const sent = await sendQuizNotification(theme.headline, formatDate(data.date));
                if (sent) {
                    notifEl.className = 'email-notification';
                    notifEl.innerHTML = '<p>✅ がんばったことをおうちの人に送りました！</p>';
                } else {
                    notifEl.remove(); // 未設定ならバナーを消す
                }
            }
        });
    });

    // 用語解説
    const glossary = data.glossary || [];
    if (glossary.length > 0) {
        const glossarySection = document.getElementById('glossary-section');
        const glossaryList = document.getElementById('glossary-list');
        if (glossarySection && glossaryList) {
            glossarySection.hidden = false;
            glossaryList.innerHTML = glossary
                .map(g => `
                    <div class="glossary-item">
                        <div>
                            <span class="glossary-term">${g.term}</span>
                            ${g.reading ? `<span class="glossary-reading">（${g.reading}）</span>` : ''}
                        </div>
                        <div class="glossary-definition">${g.definition}</div>
                    </div>
                `)
                .join('');
        }
    }

    // 出典・参考リンク
    const sources = data.sources || [];
    if (sources.length > 0) {
        const sourcesSection = document.getElementById('sources-section');
        const sourcesList = document.getElementById('sources-list');
        if (sourcesSection && sourcesList) {
            sourcesSection.hidden = false;
            sourcesList.innerHTML = sources
                .map(s => {
                    if (s.url) {
                        return `<li class="source-item"><a href="${s.url}" target="_blank" rel="noopener"><span class="source-item-title">${s.title}</span></a></li>`;
                    }
                    return `<li class="source-item"><span class="source-item-title">${s.title}</span></li>`;
                })
                .join('');
        }
    }
}
