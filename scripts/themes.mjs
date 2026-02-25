/**
 * テーマ定義
 * 適性検査の出題傾向に基づく5大テーマとトピック
 */
export const THEMES = [
    {
        category: '人口動態・世帯・高齢化',
        topics: [
            '川崎市の人口推移と世帯数の変化',
            '核家族化と単身世帯の増加',
            '外国人住民の増加と多文化共生',
            '超高齢社会と将来推計人口',
            '区別の住宅数の推移',
            '生産年齢人口の変化',
        ],
    },
    {
        category: '産業・工業・貿易',
        topics: [
            '事業所数と製造品出荷額の推移',
            '産業構造の転換（重化学工業から先端技術へ）',
            '川崎港の貿易と加工貿易の特徴',
            '川崎臨海部の工業地帯の変遷',
            'KING SKYFRONTと先端研究',
            '川崎市の中小企業とものづくり',
        ],
    },
    {
        category: '環境問題・公害と再生',
        topics: [
            '多摩川の水質改善とBOD変化',
            '川崎の公害の歴史と市民運動',
            'エコタウンと環境技術',
            '下水道普及と水環境の再生',
            'ゴミ処理とリサイクルの取り組み',
            '再生可能エネルギーの地域活用',
        ],
    },
    {
        category: '市民生活・行政・財政',
        topics: [
            '川崎市の財政（歳入と歳出の特徴）',
            '図書館の利用状況と蔵書数',
            '高齢者のニーズと地域包括ケア',
            '防災と災害への備え',
            'SDGsと川崎市の取り組み',
            '子育て支援と待機児童問題',
        ],
    },
    {
        category: '地理・交通',
        topics: [
            '通勤・通学の移動パターン',
            '川崎市の地形（北西から南東への傾斜）',
            '鉄道網と主要駅の利用者数',
            '区ごとの特徴と地域性',
            '武蔵小杉の再開発と人口集中',
            '多摩川と鶴見川の流域地理',
        ],
    },
];

/**
 * 過去の出題テーマを避けてランダムにテーマを選定
 * @param {string[]} pastTopics - 過去のトピック名リスト
 * @param {Array<{category: string}>} pastArticles - 過去の記事（日付降順）
 */
export function selectTheme(pastTopics = [], pastArticles = []) {
    // 全トピックをフラット化
    const allTopics = THEMES.flatMap(theme =>
        theme.topics.map(topic => ({
            category: theme.category,
            topic,
        }))
    );

    // 過去30日のトピックを除外
    const available = allTopics.filter(t => !pastTopics.includes(t.topic));

    // すべて出題済みならリセット
    const pool = available.length > 0 ? available : allTopics;

    // 直近の記事と同じカテゴリを除外（連続出題防止）
    const recentCategories = [...new Set(
        pastArticles.slice(0, 2).map(a => a.category)
    )];
    let filtered = pool.filter(t => !recentCategories.includes(t.category));

    // 全除外された場合は直近1日分のみ除外にフォールバック
    if (filtered.length === 0 && pastArticles.length > 0) {
        const lastCategory = pastArticles[0].category;
        filtered = pool.filter(t => t.category !== lastCategory);
    }

    // それでも空なら元のプールを使う
    const categoryFiltered = filtered.length > 0 ? filtered : pool;

    // カテゴリ偏りを防ぐ: カテゴリごとの出題回数を計算
    const categoryCounts = {};
    for (const t of pastTopics) {
        const found = allTopics.find(a => a.topic === t);
        if (found) {
            categoryCounts[found.category] = (categoryCounts[found.category] || 0) + 1;
        }
    }

    // 最も出題回数が少ないカテゴリを優先
    const minCount = Math.min(
        ...THEMES.map(t => categoryCounts[t.category] || 0)
    );
    const underrepresented = categoryFiltered.filter(
        t => (categoryCounts[t.category] || 0) === minCount
    );

    const finalPool = underrepresented.length > 0 ? underrepresented : categoryFiltered;
    return finalPool[Math.floor(Math.random() * finalPool.length)];
}
