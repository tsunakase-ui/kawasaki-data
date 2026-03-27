/**
 * 共通ユーティリティ
 */

// ===== GAS WebHook 設定 =====
// 発行された Webアプリ の URL をここに設定してください
const GAS_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzv5vH7m-eeFiiZbuZVEPaiInW-VZGLgwWyRz-W70Tit5NhL-epO9yTKIv_s2lAkCmQ/exec';

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
 * Chart.js でグラフを描画
 * @param {Array} charts - article.sections.charts
 */
export async function renderCharts(charts) {
    if (!charts || charts.length === 0) return;

    const section = document.getElementById('charts-section');
    const container = document.getElementById('charts-container');
    if (!section || !container) return;

    section.hidden = false;
    container.innerHTML = '';

    const { Chart, registerables } = await import('chart.js');
    Chart.register(...registerables);

    const colors = ['#1a73e8', '#e8710a', '#188038', '#a50e0e', '#7b1fa2'];

    for (const chartDef of charts) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-wrapper';

        const title = document.createElement('p');
        title.className = 'chart-title';
        title.textContent = chartDef.title;
        wrapper.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.id = `canvas-${chartDef.id}`;
        wrapper.appendChild(canvas);

        if (chartDef.source) {
            const src = document.createElement('p');
            src.className = 'chart-source';
            src.textContent = `出典: ${chartDef.source}`;
            wrapper.appendChild(src);
        }

        container.appendChild(wrapper);

        const hasRightAxis = chartDef.datasets.some(d => d.yAxisId === 'right');

        const chartData = {
            labels: chartDef.datasets[0].data.map(p => p.x),
            datasets: chartDef.datasets.map((ds, i) => ({
                label: ds.label,
                data: ds.data.map(p => p.y),
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length] + '22',
                yAxisID: ds.yAxisId || 'left',
                tension: 0.3,
                fill: false,
            })),
        };

        const scales = {
            x: { title: { display: !!chartDef.xLabel, text: chartDef.xLabel || '' } },
            left: {
                position: 'left',
                title: {
                    display: true,
                    text: chartDef.datasets.find(d => !d.yAxisId || d.yAxisId === 'left')?.label || '',
                },
            },
        };
        if (hasRightAxis) {
            scales.right = {
                position: 'right',
                grid: { drawOnChartArea: false },
                title: {
                    display: true,
                    text: chartDef.datasets.find(d => d.yAxisId === 'right')?.label || '',
                },
            };
        }

        new Chart(canvas, {
            type: chartDef.type === 'stacked-bar' ? 'bar' : (chartDef.type || 'line'),
            data: chartData,
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } },
                scales,
                ...(chartDef.type === 'stacked-bar' ? {
                    scales: { ...scales, x: { stacked: true }, left: { stacked: true } }
                } : {}),
            },
        });
    }
}

/**
 * exercises セクションを描画（単択・複択・記述）
 * @param {Array} exercises - article.sections.exercises
 * @param {string} headline - 記事見出し（GAS通知用）
 * @param {string} date - 記事日付（GAS通知用）
 */
export function renderExercises(exercises, headline, date) {
    const container = document.getElementById('exercises-container');
    if (!container || !exercises || exercises.length === 0) return;

    container.innerHTML = '';

    exercises.forEach((ex, idx) => {
        const block = document.createElement('div');
        block.className = 'exercise-block';

        const header = document.createElement('p');
        header.className = 'exercise-header';
        const refs = ex.chartRef
            ? (Array.isArray(ex.chartRef) ? ex.chartRef : [ex.chartRef])
            : [];
        header.textContent = `問題${idx + 1}` + (refs.length > 0 ? `（${refs.map(r => `〔${r}〕`).join('')}を見て答えましょう）` : '');
        block.appendChild(header);

        const question = document.createElement('p');
        question.className = 'exercise-question';
        question.textContent = ex.question;
        block.appendChild(question);

        if (ex.type === 'essay') {
            const textarea = document.createElement('textarea');
            textarea.className = 'exercise-essay-input';
            textarea.maxLength = ex.maxLength || 100;
            textarea.placeholder = `${ex.maxLength || 50}字以内で書きましょう`;
            textarea.rows = 3;
            block.appendChild(textarea);

            const counter = document.createElement('p');
            counter.className = 'essay-counter';
            counter.textContent = `0 / ${ex.maxLength || 50}字`;
            textarea.addEventListener('input', () => {
                counter.textContent = `${textarea.value.length} / ${ex.maxLength || 50}字`;
            });
            block.appendChild(counter);

            const btn = createAnswerButton();
            block.appendChild(btn);

            const resultDiv = createExerciseResultDiv();
            block.appendChild(resultDiv);

            btn.addEventListener('click', () => {
                resultDiv.hidden = false;
                resultDiv.innerHTML = `
                    <p class="exercise-result-label">模範解答</p>
                    <p class="exercise-model-answer">${ex.modelAnswer || ''}</p>
                    <p class="exercise-explanation">${ex.explanation || ''}</p>
                `;
            });

        } else {
            const isMultiple = ex.type === 'multiple';
            const choicesDiv = document.createElement('div');
            choicesDiv.className = 'exercise-choices';

            (ex.choices || []).forEach(choice => {
                const label = document.createElement('label');
                label.className = 'exercise-choice-label';

                const input = document.createElement('input');
                input.type = isMultiple ? 'checkbox' : 'radio';
                input.name = `ex-${idx}`;
                input.value = choice.id;
                input.className = 'exercise-choice-input';

                label.appendChild(input);
                label.appendChild(document.createTextNode(` ${choice.id}: ${choice.text}`));
                choicesDiv.appendChild(label);
            });

            block.appendChild(choicesDiv);

            const btn = createAnswerButton();
            block.appendChild(btn);

            const resultDiv = createExerciseResultDiv();
            block.appendChild(resultDiv);

            btn.addEventListener('click', async () => {
                const selected = [...choicesDiv.querySelectorAll('input:checked')].map(i => i.value);
                const correct = ex.correctAnswers || [];
                const isCorrect = selected.length === correct.length &&
                    selected.every(s => correct.includes(s)) &&
                    correct.every(c => selected.includes(c));

                choicesDiv.querySelectorAll('input').forEach(input => {
                    input.disabled = true;
                    const lbl = input.parentElement;
                    if (correct.includes(input.value)) {
                        lbl.classList.add('choice-correct');
                    } else if (selected.includes(input.value) && !correct.includes(input.value)) {
                        lbl.classList.add('choice-incorrect');
                    }
                });

                resultDiv.hidden = false;
                resultDiv.innerHTML = `
                    <p class="exercise-result-icon">${isCorrect ? '🎉 せいかい！' : `🤔 正解は ${correct.join('・')} でした`}</p>
                    <p class="exercise-explanation">${ex.explanation || ''}</p>
                `;
                resultDiv.classList.toggle('correct', isCorrect);
                resultDiv.classList.toggle('incorrect', !isCorrect);

                if (isCorrect && idx === exercises.length - 1) {
                    await sendQuizNotification(headline, date);
                }
            });
        }

        container.appendChild(block);
    });
}

function createAnswerButton() {
    const btn = document.createElement('button');
    btn.className = 'exercise-answer-btn';
    btn.textContent = '答えを確認する';
    return btn;
}

function createExerciseResultDiv() {
    const div = document.createElement('div');
    div.className = 'exercise-result';
    div.hidden = true;
    return div;
}

/**
 * メール送信 (GAS Webアプリ)
 */
async function sendQuizNotification(headline, date) {
    if (!GAS_WEBHOOK_URL) {
        console.log('📧 GAS WebHook 未設定のためメール送信スキップ');
        return false;
    }

    try {
        const now = new Date();
        const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

        const payload = {
            article_title: headline,
            article_date: date,
            answered_time: timeStr,
            article_url: window.location.href
        };

        const response = await fetch(GAS_WEBHOOK_URL, {
            method: 'POST',
            // CORS回避のため、GASへは 'application/x-www-form-urlencoded' または 'text/plain' を使うことが多い
            // 今回はJSONを文字列化して送るシンプルな方法を使用
            body: JSON.stringify(payload)
        });

        // 成功時には JSON形式で {"status": "success"} などが返ることを想定
        const result = await response.json();

        if (result.status === 'success') {
            console.log('📧 メール送信・完了記録成功');
            return true;
        } else {
            console.warn('📧 GAS側からエラーが返されました', result);
            return false;
        }
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

    // クイズ（exercisesがない場合のフォールバック）
    if (!sections.exercises || sections.exercises.length === 0) {
        const fallback = document.getElementById('quiz-fallback');
        if (fallback) fallback.hidden = false;

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
    }

    // グラフ（chart.jsで非同期描画）
    if (sections.charts && sections.charts.length > 0) {
        renderCharts(sections.charts);
    }

    // 問題（exercises形式が優先）
    if (sections.exercises && sections.exercises.length > 0) {
        renderExercises(sections.exercises, theme.headline, data.date);
    }

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
