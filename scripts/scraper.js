/**
 * 战场新闻抓取系统
 * 按用户定义的流程执行：抓取 → 清洗翻译 → 分类 → 热度统计 → 导出
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    SCRAPE_INTERVAL: 30 * 60 * 1000, // 30分钟
    OUTPUT_DIR: path.join(__dirname, '../data/'),
    REPORT_DIR: path.join(__dirname, '../reports/'),
    NEWS_DIR: path.join(__dirname, '../'),
    PLATFORMS: ['Reuters', 'BBC', 'CNN', 'Al Jazeera', 'NYT', 'Twitter', 'Reddit'],
    KEYWORDS: [
        'Russia Ukraine war',
        'Iran US conflict', 
        'Middle East battle',
        'Israel Hamas',
        'Ukraine front line',
        'Putin',
        'Zelensky',
        'Netanyahu',
        'Gaza'
    ],
    TAGS: ['Russia', 'Ukraine', 'Iran', 'US', 'Middle East', 'Israel', 'Hamas', 'Europe']
};

// ============ 工具函数 ============

function getDateStr() {
    return new Date().toISOString().slice(0, 10);
}

function getDateTimeStr() {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function log(msg) {
    console.log(`[${getDateTimeStr()}] ${msg}`);
}

// ============ 1. 新闻抓取 ============

async function scrapeNews() {
    log('📰 开始抓取新闻...');
    
    // 模拟新闻数据（实际需要接入真实API或爬虫）
    const newsData = [
        {
            title: 'Ukraine says Russian forces advance on eastern front',
            summary: 'Ukrainian military officials reported continued Russian advances in the eastern Donbas region, with heavy fighting around Avdiivka and Bakhmut.',
            link: 'https://www.reuters.com/world/europe/',
            timestamp: getDateTimeStr(),
            source: 'Reuters',
            likes: Math.floor(Math.random() * 1000),
            shares: Math.floor(Math.random() * 500),
            comments: Math.floor(Math.random() * 200)
        },
        {
            title: 'Israel conducts strikes in Gaza after rocket fire',
            summary: 'The Israeli military carried out airstrikes in Gaza overnight following rocket attacks from Palestinian militants.',
            link: 'https://www.bbc.com/news/middle-east',
            timestamp: getDateTimeStr(),
            source: 'BBC',
            likes: Math.floor(Math.random() * 800),
            shares: Math.floor(Math.random() * 300),
            comments: Math.floor(Math.random() * 150)
        },
        {
            title: 'US warns Iran over nuclear program escalation',
            summary: 'The United States has warned Iran against further escalation of its nuclear program, saying all options remain on the table.',
            link: 'https://www.cnn.com/world',
            timestamp: getDateTimeStr(),
            source: 'CNN',
            likes: Math.floor(Math.random() * 600),
            shares: Math.floor(Math.random() * 200),
            comments: Math.floor(Math.random() * 100)
        },
        {
            title: 'NATO allies discuss increased support for Ukraine',
            summary: 'NATO defense ministers met to discuss increasing military support for Ukraine amid ongoing conflict with Russia.',
            link: 'https://www.aljazeera.com/news',
            timestamp: getDateTimeStr(),
            source: 'Al Jazeera',
            likes: Math.floor(Math.random() * 500),
            shares: Math.floor(Math.random() * 250),
            comments: Math.floor(Math.random() * 80)
        }
    ];
    
    const filename = `raw_battle_news_${getDateStr()}.json`;
    const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
    
    // 读取已有数据去重
    let existingData = [];
    if (fs.existsSync(filepath)) {
        existingData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
    
    // 合并并去重
    const newData = [...existingData, ...newsData];
    const uniqueData = newData.filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
    );
    
    fs.writeFileSync(filepath, JSON.stringify(uniqueData, null, 2));
    log(`✅ 抓取完成: ${newsData.length} 条新新闻，保存到 ${filename}`);
    
    return uniqueData;
}

// ============ 2. 数据清洗与翻译 ============

async function cleanAndTranslate(newsData) {
    log('🔄 开始清洗和翻译...');
    
    // 扩展翻译词典
    const translations = {
        // 国家和地区
        'Ukraine': '乌克兰',
        'Russian': '俄罗斯',
        'Russia': '俄罗斯',
        'Iran': '伊朗',
        'US': '美国',
        'America': '美国',
        'American': '美国的',
        'Israel': '以色列',
        'Israeli': '以色列的',
        'Gaza': '加沙',
        'Palestinian': '巴勒斯坦',
        'Hamas': '哈马斯',
        'NATO': '北约',
        'Europe': '欧洲',
        'European': '欧洲的',
        'China': '中国',
        'Chinese': '中国的',
        'Korea': '韩国',
        'Korean': '韩国的',
        'Middle East': '中东',
        'Europe': '欧洲',
        
        // 军事和政治
        'military': '军事',
        'forces': '军队',
        'army': '军队',
        'war': '战争',
        'conflict': '冲突',
        'battle': '战斗',
        'troops': '部队',
        'soldiers': '士兵',
        'airstrikes': '空袭',
        'strike': '袭击',
        'attack': '攻击',
        'defense': '防御',
        'defense': '国防',
        'security': '安全',
        'threat': '威胁',
        'weapon': '武器',
        'nuclear': '核武器',
        'missile': '导弹',
        'drone': '无人机',
        
        // 政府和组织
        'government': '政府',
        'president': '总统',
        'minister': '部长',
        'official': '官员',
        'parliament': '议会',
        'Kremlin': '克里姆林宫',
        'Putin': '普京',
        'Zelensky': '泽连斯基',
        'Netanyahu': '内塔尼亚胡',
        'Biden': '拜登',
        
        // 行动和事件
        'invasion': '入侵',
        'offensive': '进攻',
        'defensive': '防守',
        'advance': '推进',
        'retreat': '撤退',
        'victory': '胜利',
        'defeat': '失败',
        'ceasefire': '停火',
        'negotiation': '谈判',
        'sanctions': '制裁',
        'refugees': '难民',
        'civilians': '平民',
        'casualties': '伤亡',
        
        // 媒体和技术
        'Reuters': '路透社',
        'BBC': 'BBC',
        'CNN': 'CNN',
        'report': '报道',
        'news': '新闻',
        'according to': '根据',
        'statement': '声明',
        'announcement': '公告',
        
        // 其他
        'support': '支持',
        'help': '帮助',
        'peace': '和平',
        'talks': '会谈',
        'summit': '峰会',
        'meeting': '会议',
        'visit': '访问',
        'trip': '行程',
        'criticized': '批评',
        'warned': '警告',
        'urged': '敦促',
        'announced': '宣布',
        'said': '表示',
        'added': '补充说',
        'according to': '根据',
        'reported': '报道称',
        'including': '包括',
        'including': '其中包括',
    };
    
    const translated = newsData.map(item => {
        let translatedSummary = item.summary;
        let translatedTitle = item.title;
        
        // 翻译摘要
        for (const [en, zh] of Object.entries(translations)) {
            const regex = new RegExp('\\b' + en + '\\b', 'gi');
            translatedSummary = translatedSummary.replace(regex, zh);
            translatedTitle = translatedTitle.replace(regex, zh);
        }
        
        return {
            ...item,
            title_zh: translatedTitle,
            summary_zh: translatedSummary,
            cleaned: true
        };
    });
    
    const filename = `translated_news_${getDateStr()}.json`;
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, filename), JSON.stringify(translated, null, 2));
    log(`✅ 翻译完成: ${translated.length} 条`);
    
    return translated;
}

// ============ 3. 分类与标签化 ============

async function classifyAndTag(newsData) {
    log('🏷️ 开始分类和标签化...');
    
    const tagged = newsData.map(item => {
        const tags = [];
        const titleLower = (item.title + item.summary).toLowerCase();
        
        if (titleLower.includes('ukraine') || titleLower.includes('zelensky')) tags.push('Ukraine');
        if (titleLower.includes('russia') || titleLower.includes('putin')) tags.push('Russia');
        if (titleLower.includes('israel') || titleLower.includes('netanyahu')) tags.push('Israel');
        if (titleLower.includes('gaza') || titleLower.includes('hamas')) tags.push('Hamas');
        if (titleLower.includes('iran') || titleLower.includes('tehran')) tags.push('Iran');
        if (titleLower.includes('us') || titleLower.includes('america') || titleLower.includes('biden')) tags.push('US');
        if (titleLower.includes('nato') || titleLower.includes('europe')) tags.push('Europe');
        if (titleLower.includes('middle east')) tags.push('Middle East');
        
        return { ...item, tags: tags.length > 0 ? tags : ['Other'] };
    });
    
    const filename = `tagged_news_${getDateStr()}.json`;
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, filename), JSON.stringify(tagged, null, 2));
    log(`✅ 分类完成`);
    
    return tagged;
}

// ============ 4. 热度统计 ============

async function analyzeTrends(newsData) {
    log('📊 开始热度分析...');
    
    const tagCounts = {};
    const sourceCounts = {};
    
    newsData.forEach(item => {
        // 统计标签
        if (item.tags) {
            item.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
        // 统计来源
        sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
    });
    
    const trendReport = {
        date: getDateStr(),
        timestamp: getDateTimeStr(),
        total_news: newsData.length,
        tag_counts: tagCounts,
        source_counts: sourceCounts,
        hot_tags: Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => ({ tag, count }))
    };
    
    const filename = `trend_report_${getDateStr()}.json`;
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, filename), JSON.stringify(trendReport, null, 2));
    log(`✅ 热度分析完成: ${JSON.stringify(tagCounts)}`);
    
    // 检查触发条件
    if (tagCounts['Ukraine'] >= 10 || tagCounts['Middle East'] >= 5) {
        log('⚠️ 触发热点提醒条件！');
    }
    
    return trendReport;
}

// ============ 5. 生成热门新闻 ============

async function generateHotNews(newsData) {
    log('🔥 生成热门新闻...');
    
    const hotNews = {};
    
    newsData.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => {
                if (!hotNews[tag]) hotNews[tag] = [];
                hotNews[tag].push({
                    title: item.title_zh || item.title,
                    summary: item.summary_zh || item.summary,
                    source: item.source,
                    timestamp: item.timestamp,
                    engagement: (item.likes || 0) + (item.shares || 0) * 2
                });
            });
        }
    });
    
    // 每个标签取热度最高的5条
    const result = {};
    for (const [tag, articles] of Object.entries(hotNews)) {
        result[tag] = articles
            .sort((a, b) => b.engagement - a.engagement)
            .slice(0, 5);
    }
    
    const filename = `hot_news_${getDateStr()}.json`;
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, filename), JSON.stringify(result, null, 2));
    log(`✅ 热门新闻生成完成`);
    
    return result;
}

// ============ 6. 生成网站内容 ============

function generateWebsite(newsData, hotNews, trendReport) {
    log('🌐 生成网站内容...');
    
    const indexContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>战场新闻资讯中心 | Battle News</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #eee; line-height: 1.6; }
        header { background: #000; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.5rem; font-weight: bold; color: #e63946; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .section { margin-bottom: 2rem; }
        .section h2 { border-bottom: 2px solid #e63946; padding-bottom: 0.5rem; margin-bottom: 1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem; }
        .card { background: #2a2a2a; border-radius: 8px; padding: 1.2rem; border-left: 3px solid #e63946; }
        .card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
        .card .meta { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }
        .card .tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .card .tag { background: #e63946; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.7rem; }
        .card .source { color: #e63946; font-weight: bold; }
        .trending { display: flex; gap: 1rem; flex-wrap: wrap; }
        .trending-item { background: #2a2a2a; padding: 0.8rem 1.2rem; border-radius: 20px; }
        .trending-item .count { color: #e63946; font-weight: bold; }
        .stats { display: flex; gap: 2rem; margin-bottom: 2rem; }
        .stat { text-align: center; }
        .stat .num { font-size: 2rem; font-weight: bold; color: #e63946; }
        .stat .label { font-size: 0.8rem; color: #888; }
        footer { background: #000; text-align: center; padding: 2rem; color: #666; }
        .update-time { text-align: right; color: #666; font-size: 0.8rem; }
    </style>
</head>
<body>
    <header>
        <div class="logo">⚔️ 战场新闻资讯中心</div>
        <div>最后更新: ${getDateTimeStr()}</div>
    </header>
    
    <div class="container">
        <!-- 统计 -->
        <div class="stats">
            <div class="stat">
                <div class="num">${trendReport.total_news}</div>
                <div class="label">新闻总数</div>
            </div>
            <div class="stat">
                <div class="num">${Object.keys(trendReport.tag_counts).length}</div>
                <div class="label">涉及战区</div>
            </div>
            <div class="stat">
                <div class="num">${trendReport.hot_tags[0]?.tag || '-'}</div>
                <div class="label">最热战区</div>
            </div>
        </div>
        
        <!-- 热度趋势 -->
        <div class="section">
            <h2>📈 热度趋势</h2>
            <div class="trending">
                ${trendReport.hot_tags.map(t => `
                <div class="trending-item">
                    <span class="count">${t.count}</span> ${t.tag}
                </div>`).join('')}
            </div>
        </div>
        
        <!-- 热门新闻 -->
        <div class="section">
            <h2>🔥 热门新闻</h2>
            <div class="grid">
                ${newsData.slice(0, 6).map(n => `
                <div class="card">
                    <div class="meta"><span class="source">${n.source}</span> · ${n.timestamp}</div>
                    <h3>${n.title_zh || n.title}</h3>
                    <p style="color:#aaa;font-size:0.9rem;margin:0.5rem 0;">${n.summary_zh || n.summary}</p>
                    <div class="tags">${(n.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
                </div>`).join('')}
            </div>
        </div>
        
        <!-- 按战区分类 -->
        ${Object.entries(hotNews).slice(0, 4).map(([tag, articles]) => `
        <div class="section">
            <h2>⚔️ ${tag} 战区</h2>
            <div class="grid">
                ${articles.slice(0, 3).map(n => `
                <div class="card">
                    <div class="meta">${n.source} · ${n.timestamp}</div>
                    <h3>${n.title}</h3>
                    <p style="color:#aaa;font-size:0.9rem;margin:0.5rem 0;">${n.summary}</p>
                </div>`).join('')}
            </div>
        </div>`).join('')}
        
        <p class="update-time">🔄 最后更新: ${getDateTimeStr()}</p>
    </div>
    
    <footer>
        <p>战场新闻资讯中心 | 仅供参改</p>
        <p>© 2026 All Rights Reserved</p>
    </footer>
</body>
</html>`;
    
    fs.writeFileSync(path.join(CONFIG.NEWS_DIR, 'index.html'), indexContent);
    log('✅ 网站生成完成: index.html');
}

// ============ 主流程 ============

async function runPipeline() {
    log('='.repeat(50));
    log('🚀 战场新闻系统启动');
    log('='.repeat(50));
    
    try {
        // 1. 抓取新闻
        const rawNews = await scrapeNews();
        
        // 2. 清洗和翻译
        const translatedNews = await cleanAndTranslate(rawNews);
        
        // 3. 分类标签
        const taggedNews = await classifyAndTag(translatedNews);
        
        // 4. 热度分析
        const trendReport = await analyzeTrends(taggedNews);
        
        // 5. 生成热门新闻
        const hotNews = await generateHotNews(taggedNews);
        
        // 6. 生成网站
        generateWebsite(taggedNews, hotNews, trendReport);
        
        log('✅ 全流程完成!');
        return { rawNews, translatedNews, taggedNews, trendReport, hotNews };
        
    } catch (error) {
        log(`❌ 错误: ${error.message}`);
        throw error;
    }
}

// 命令行运行
const args = process.argv.slice(2);
if (args[0] === '--once') {
    runPipeline();
} else {
    // 定时运行
    log(`⏰ 定时任务: 每 ${CONFIG.SCRAPE_INTERVAL / 60000} 分钟执行一次`);
    runPipeline();
    setInterval(runPipeline, CONFIG.SCRAPE_INTERVAL);
}

module.exports = { runPipeline, scrapeNews, cleanAndTranslate, classifyAndTag, analyzeTrends };
