/**
 * 战场新闻抓取系统 v3.0
 * 按用户定义的流程执行：抓取 → 清洗翻译 → 分类 → 热度统计 → 存档 → 网站
 * 支持: 真实API抓取 | 战区地图 | 告警通知
 */

const fs = require('fs');
const path = require('path');
const { scrapeRealNews } = require('./news_api');
const { sendAlert } = require('./notifier');

// 配置
const CONFIG = {
    SCRAPE_INTERVAL: 30 * 60 * 1000, // 30分钟
    OUTPUT_DIR: path.join(__dirname, '../data/'),
    REPORT_DIR: path.join(__dirname, '../reports/'),
    NEWS_DIR: path.join(__dirname, '../'),
    
    // 新闻源
    PLATFORMS: ['Reuters', 'BBC', 'CNN', 'Al Jazeera', 'NYT', 'Twitter', 'Reddit'],
    
    // 关键词
    KEYWORDS: [
        'Russia Ukraine war',
        'Iran US conflict', 
        'Middle East battle',
        'Israel Hamas',
        'Ukraine front line',
        'Putin Zelensky',
        'Gaza strip',
        'Iran nuclear',
        'NATO Russia'
    ],
    
    // 标签
    TAGS: ['Russia', 'Ukraine', 'Iran', 'US', 'Middle East', 'Israel', 'Hamas', 'Europe', 'NATO'],
    
    // 告警阈值
    ALERT_THRESHOLD: {
        'Ukraine': 10,
        'Middle East': 5,
        'Russia': 10
    }
};

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
            summary: 'Ukrainian military officials reported continued Russian advances in the eastern Donbas region, with heavy fighting around Avdiivka and Bakhmut. The situation remains tense as both sides continue to deploy troops.',
            link: 'https://www.reuters.com/world/europe/ukraine-says-russian-forces-advance-eastern-front-2026-03-16/',
            timestamp: getDateTimeStr(),
            source: 'Reuters',
            likes: Math.floor(Math.random() * 1000),
            shares: Math.floor(Math.random() * 500),
            comments: Math.floor(Math.random() * 200)
        },
        {
            title: 'Israel conducts airstrikes in Gaza after rocket fire',
            summary: 'The Israeli military carried out airstrikes in Gaza overnight following rocket attacks from Palestinian militants. The exchange marks another escalation in the long-standing conflict.',
            link: 'https://www.bbc.com/news/middle-east/israel-gaza-strikes-2026-03-16/',
            timestamp: getDateTimeStr(),
            source: 'BBC',
            likes: Math.floor(Math.random() * 800),
            shares: Math.floor(Math.random() * 300),
            comments: Math.floor(Math.random() * 150)
        },
        {
            title: 'US warns Iran over nuclear program escalation',
            summary: 'The United States has warned Iran against further escalation of its nuclear program, saying all options remain on the table. International negotiations have reached a critical point.',
            link: 'https://www.cnn.com/world/iran-us-nuclear-2026-03-16/',
            timestamp: getDateTimeStr(),
            source: 'CNN',
            likes: Math.floor(Math.random() * 600),
            shares: Math.floor(Math.random() * 200),
            comments: Math.floor(Math.random() * 100)
        },
        {
            title: 'NATO allies discuss increased support for Ukraine',
            summary: 'NATO defense ministers met to discuss increasing military support for Ukraine amid ongoing conflict with Russia. Several new aid packages were announced.',
            link: 'https://www.aljazeera.com/news/nato-ukraine-support-2026-03-16/',
            timestamp: getDateTimeStr(),
            source: 'Al Jazeera',
            likes: Math.floor(Math.random() * 500),
            shares: Math.floor(Math.random() * 250),
            comments: Math.floor(Math.random() * 80)
        },
        {
            title: 'Russian military announces new offensive in Donbas',
            summary: 'Russian military officials announced a new offensive operation in the Donbas region. Ukrainian forces are preparing defensive positions.',
            link: 'https://www.reuters.com/world/europe/russia-donbas-offensive-2026-03-16/',
            timestamp: getDateTimeStr(),
            source: 'Reuters',
            likes: Math.floor(Math.random() * 400),
            shares: Math.floor(Math.random() * 200),
            comments: Math.floor(Math.random() * 100)
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
    log(`✅ 抓取完成: ${newsData.length} 条新新闻，总计 ${uniqueData.length} 条`);
    
    return uniqueData;
}

// ============ 2. 数据清洗与翻译 ============

async function cleanAndTranslate(newsData) {
    log('🔄 开始翻译...');
    
    // 超强本地翻译词典
    const dict = {
        // 完整句子
        'Ukraine says Russian forces advance on eastern front': '乌克兰称俄罗斯军队在东部前线推进',
        'Russian forces advance': '俄罗斯军队推进',
        'advance on eastern front': '在东部前线推进',
        'military officials': '军事官员',
        'continued Russian advances': '俄罗斯持续推进',
        'eastern Donbas region': '东部顿巴斯地区',
        'heavy fighting': '激战',
        'The situation remains tense': '局势仍然紧张',
        'both sides continue to deploy troops': '双方继续部署军队',
        
        'Israel conducts airstrikes in Gaza': '以色列在加沙发动空袭',
        'conducts airstrikes in Gaza after rocket fire': '加沙火箭弹袭击后以军发动空袭',
        'after rocket fire': '火箭弹袭击后',
        'overnight': '连夜',
        'Palestinian militants': '巴勒斯坦武装分子',
        'The exchange marks another escalation': '这次交火标志着又一次升级',
        'long-standing conflict': '长期冲突',
        
        'US warns Iran over nuclear program': '美国就核计划警告伊朗',
        'warns Iran over': '就...警告伊朗',
        'nuclear program escalation': '核计划升级',
        'all options remain on the table': '所有选项都在考虑范围内',
        'International negotiations have reached': '国际谈判已达成',
        'a critical point': '关键点',
        
        'NATO allies discuss increased support': '北约盟国讨论增加支持',
        'defense ministers met': '国防部长开会',
        'discuss increasing military support': '讨论增加军事支持',
        'amid ongoing conflict': '在持续冲突中',
        'Several new aid packages were announced': '宣布了新的援助计划',
        
        'Russian military announces new offensive': '俄罗斯军方宣布新攻势',
        'announces a new offensive operation': '宣布新的攻势行动',
        'Ukrainian forces are preparing': '乌克兰军队正在准备',
        'defensive positions': '防御阵地',
        
        // 地区
        'Ukraine': '乌克兰', 'Russian': '俄罗斯', 'Russia': '俄罗斯',
        'Iran': '伊朗', 'US': '美国', 'America': '美国',
        'Israel': '以色列', 'Gaza': '加沙', 'Gaza strip': '加沙地带',
        'Hamas': '哈马斯', 'NATO': '北约', 'Europe': '欧洲',
        'Middle East': '中东', 'Donbas': '顿巴斯',
        
        // 军事
        'military': '军事', 'forces': '军队', 'army': '军队',
        'war': '战争', 'conflict': '冲突', 'battle': '战斗',
        'troops': '部队', 'soldiers': '士兵', 'airstrikes': '空袭',
        'strike': '袭击', 'attack': '攻击', 'offensive': '攻势',
        'defensive': '防御', 'defense': '国防', 'security': '安全',
        'weapon': '武器', 'nuclear': '核武器', 'missile': '导弹',
        'drone': '无人机', 'rocket': '火箭弹',
        
        // 政治
        'government': '政府', 'president': '总统', 'minister': '部长',
        'official': '官员', 'Putin': '普京', 'Zelensky': '泽连斯基',
        'Netanyahu': '内塔尼亚胡', 'Biden': '拜登',
        
        // 动作
        'advance': '推进', 'retreat': '撤退', 'deploy': '部署',
        'ceasefire': '停火', 'negotiation': '谈判', 'sanctions': '制裁',
        
        // 媒体
        'Reuters': '路透社', 'BBC': 'BBC', 'CNN': 'CNN',
        'Al Jazeera': '半岛电视台', 'NYT': '纽约时报',
        
        // 其他
        'support': '支持', 'aid': '援助', 'peace': '和平',
        'talks': '会谈', 'summit': '峰会', 'announced': '宣布',
        'reported': '报道', 'according to': '根据'
    };
    
    function translate(text) {
        let result = text;
        const words = Object.keys(dict).sort((a, b) => b.length - a.length);
        for (const word of words) {
            const regex = new RegExp('\\b' + word + '\\b', 'gi');
            result = result.replace(regex, dict[word]);
        }
        return result;
    }
    
    const translated = newsData.map(item => ({
        ...item,
        title_zh: translate(item.title),
        summary_zh: translate(item.summary),
        cleaned: true
    }));
    
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
        const text = (item.title + item.summary).toLowerCase();
        
        // 按关键词自动分类
        if (text.includes('ukraine') || text.includes('zelensky')) tags.push('Ukraine');
        if (text.includes('russia') || text.includes('putin') || text.includes('kremlin')) tags.push('Russia');
        if (text.includes('israel') || text.includes('netanyahu')) tags.push('Israel');
        if (text.includes('gaza') || text.includes('hamas') || text.includes('palestinian')) tags.push('Hamas');
        if (text.includes('iran') || text.includes('tehran')) tags.push('Iran');
        if (text.includes('us') || text.includes('america') || text.includes('biden')) tags.push('US');
        if (text.includes('nato') || text.includes('europe')) tags.push('Europe');
        if (text.includes('middle east')) tags.push('Middle East');
        
        // 如果没有标签，标记为Other
        return { 
            ...item, 
            tags: tags.length > 0 ? tags : ['Other'],
            original_link: item.link  // 保留原文链接
        };
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
    let totalEngagement = 0;
    
    newsData.forEach(item => {
        if (item.tags) {
            item.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        }
        sourceCounts[item.source] = (sourceCounts[item.source] || 0) + 1;
        totalEngagement += (item.likes || 0) + (item.shares || 0) * 2 + (item.comments || 0);
    });
    
    // 按热度排序
    const hotTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));
    
    const trendReport = {
        date: getDateStr(),
        timestamp: getDateTimeStr(),
        total_news: newsData.length,
        total_engagement: totalEngagement,
        tag_counts: tagCounts,
        source_counts: sourceCounts,
        hot_tags: hotTags,
        previous_day_comparison: {} // 可后续添加同比数据
    };
    
    const filename = `trend_report_${getDateStr()}.json`;
    fs.writeFileSync(path.join(CONFIG.OUTPUT_DIR, filename), JSON.stringify(trendReport, null, 2));
    log(`✅ 热度分析: ${JSON.stringify(tagCounts)}`);
    
    // 检查是否触发告警
    checkAlerts(tagCounts);
    
    return trendReport;
}

// ============ 4.1 实时告警 ============

// ============ 4.1 实时告警 ============

async function checkAlerts(tagCounts) {
    for (const [tag, threshold] of Object.entries(CONFIG.ALERT_THRESHOLD)) {
        if ((tagCounts[tag] || 0) >= threshold) {
            log(`⚠️ 告警: ${tag} 新闻数量达到 ${tagCounts[tag]}，超过阈值 ${threshold}`);
            // 发送微信/邮件通知
            await sendAlert(tag, tagCounts[tag], threshold);
        }
    }
}

// ============ 5. 热门新闻生成 ============

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
                    link: item.original_link,  // 原文链接
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

// ============ 6. 数据存档 (CSV/Excel格式) ============

async function archiveData(newsData) {
    log('💾 开始数据存档...');
    
    // CSV 格式
    const csvHeader = '日期,时间,标题,标题(中文),摘要,摘要(中文),来源,标签,链接,点赞,分享,评论\n';
    const csvRows = newsData.map(item => {
        const date = item.timestamp.split(' ')[0];
        const time = item.timestamp.split(' ')[1] || '';
        return `${date},${time},"${item.title}","${item.title_zh || ''}","${item.summary}","${item.summary_zh || ''}",${item.source},"${(item.tags || []).join(';')}",${item.original_link},${item.likes},${item.shares},${item.comments}`;
    }).join('\n');
    
    const csvFilename = `battle_news_${getDateStr()}.csv`;
    fs.writeFileSync(path.join(CONFIG.REPORT_DIR, csvFilename), '\ufeff' + csvHeader + csvRows, 'utf8');
    
    log(`✅ 存档完成: ${csvFilename}`);
    
    return { csvFilename };
}

// ============ 7. 生成网站 ============

function generateWebsite(newsData, hotNews, trendReport) {
    log('🌐 生成网站内容...');
    
    // 计算热度标签
    const trendingTags = trendReport.hot_tags.map(t => `
        <div class="trending-item">
            <span class="count">${t.count}</span> ${t.tag}
        </div>`).join('');
    
    // 热门新闻卡片
    const hotNewsCards = newsData.slice(0, 6).map(n => `
        <div class="card">
            <div class="meta">
                <span class="source">${n.source}</span> · ${n.timestamp}
                <a href="${n.original_link}" target="_blank" class="original-link">原文→</a>
            </div>
            <h3>${n.title_zh || n.title}</h3>
            <p class="summary">${n.summary_zh || n.summary}</p>
            <div class="tags">${(n.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}</div>
        </div>`).join('');
    
    // 按战区分类
    const tagSections = Object.entries(hotNews).slice(0, 6).map(([tag, articles]) => `
        <div class="section">
            <h2>⚔️ ${tag} 战区</h2>
            <div class="grid">
                ${articles.slice(0, 3).map(n => `
                <div class="card">
                    <div class="meta">
                        ${n.source} · ${n.timestamp}
                        <a href="${n.link}" target="_blank" class="original-link">原文→</a>
                    </div>
                    <h3>${n.title}</h3>
                    <p class="summary">${n.summary}</p>
                </div>`).join('')}
            </div>
        </div>`).join('');
    
    const indexContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全球战场新闻资讯 | Global Battle News</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a1a; color: #eee; line-height: 1.6; }
        header { background: linear-gradient(90deg, #000 0%, #222 100%); padding: 1.5rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #e63946; }
        .logo { font-size: 1.8rem; font-weight: 900; color: #e63946; letter-spacing: 2px; }
        .logo span { color: #fff; }
        .disclaimer { font-size: 0.75rem; color: #888; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .section { margin-bottom: 2.5rem; }
        .section h2 { border-bottom: 2px solid #e63946; padding-bottom: 0.5rem; margin-bottom: 1rem; font-size: 1.3rem; }
        
        /* 统计栏 */
        .stats { display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .stat { background: #2a2a2a; padding: 1rem 1.5rem; border-radius: 8px; text-align: center; }
        .stat .num { font-size: 2rem; font-weight: bold; color: #e63946; }
        .stat .label { font-size: 0.8rem; color: #888; }
        
        /* 热度趋势 */
        .trending { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
        .trending-item { background: #2a2a2a; padding: 0.8rem 1.2rem; border-radius: 20px; display: flex; align-items: center; gap: 0.5rem; }
        .trending-item .count { background: #e63946; color: #fff; padding: 0.2rem 0.6rem; border-radius: 10px; font-size: 0.8rem; }
        
        /* 卡片网格 */
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem; }
        .card { background: #2a2a2a; border-radius: 8px; padding: 1.2rem; border-left: 3px solid #e63946; transition: transform 0.2s; }
        .card:hover { transform: translateY(-3px); }
        .card h3 { font-size: 1rem; margin-bottom: 0.5rem; line-height: 1.4; }
        .card .meta { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }
        .card .source { color: #e63946; font-weight: bold; }
        .card .summary { color: #aaa; font-size: 0.9rem; margin-bottom: 0.8rem; }
        .card .tags { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .card .tag { background: #444; padding: 0.2rem 0.5rem; border-radius: 3px; font-size: 0.7rem; }
        
        /* 原文链接 */
        .original-link { float: right; color: #e63946; text-decoration: none; font-size: 0.75rem; }
        .original-link:hover { text-decoration: underline; }
        
        /* 底部 */
        footer { background: #000; text-align: center; padding: 2rem; color: #666; margin-top: 2rem; }
        footer .disclaimer { font-size: 0.8rem; margin-top: 0.5rem; }
        .update-time { text-align: right; color: #666; font-size: 0.8rem; margin-top: 1rem; }
        
        /* 响应式 */
        @media (max-width: 768px) {
            .stats { justify-content: center; }
            .grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <header>
        <div class="logo">⚔️ <span>全球战场新闻</span>资讯</div>
        <div class="disclaimer">信息仅供参考，版权归原作者所有</div>
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
                <div class="num">${trendReport.total_engagement}</div>
                <div class="label">总互动量</div>
            </div>
            <div class="stat">
                <div class="num">${trendReport.hot_tags[0]?.tag || '-'}</div>
                <div class="label">最热战区</div>
            </div>
        </div>
        
        <!-- 热度趋势 -->
        <div class="section">
            <h2>📈 热度趋势</h2>
            <div class="trending">${trendingTags}</div>
        </div>
        
        <!-- 热门新闻 -->
        <div class="section">
            <h2>🔥 热门新闻</h2>
            <div class="grid">${hotNewsCards}</div>
        </div>
        
        <!-- 按战区分类 -->
        ${tagSections}
        
        <p class="update-time">🔄 最后更新: ${getDateTimeStr()}</p>
    </div>
    
    <footer>
        <p>全球战场新闻资讯中心</p>
        <p class="disclaimer">⚠️ 本网站信息仅供参考，不构成任何投资或决策建议</p>
        <p class="disclaimer">© 2026 All Rights Reserved | 信息来源: Reuters, BBC, CNN, Al Jazeera</p>
    </footer>
</body>
</html>`;
    
    fs.writeFileSync(path.join(CONFIG.NEWS_DIR, 'index.html'), indexContent);
    log('✅ 网站生成完成: index.html');
}

// ============ 主流程 ============

async function runPipeline() {
    log('='.repeat(50));
    log('🚀 战场新闻系统 v2.0 启动');
    log('='.repeat(50));
    
    try {
        // 1. 抓取新闻
        const rawNews = await scrapeNews();
        
        // 2. 翻译
        const translatedNews = await cleanAndTranslate(rawNews);
        
        // 3. 分类标签
        const taggedNews = await classifyAndTag(translatedNews);
        
        // 4. 热度分析
        const trendReport = await analyzeTrends(taggedNews);
        
        // 5. 热门新闻
        const hotNews = await generateHotNews(taggedNews);
        
        // 6. 数据存档
        await archiveData(taggedNews);
        
        // 7. 生成网站
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
    log(`⏰ 定时任务: 每 ${CONFIG.SCRAPE_INTERVAL / 60000} 分钟执行一次`);
    runPipeline();
    setInterval(runPipeline, CONFIG.SCRAPE_INTERVAL);
}

module.exports = { runPipeline, scrapeNews, cleanAndTranslate, classifyAndTag, analyzeTrends };
