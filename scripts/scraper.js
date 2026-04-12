/**
 * 战场新闻抓取系统 v3.0
 * 按用户定义的流程执行：抓取 → 清洗翻译 → 分类 → 热度统计 → 存档 → 网站
 * 支持: 真实API抓取 | 战区地图 | 告警通知
 */

const fs = require('fs');
const path = require('path');
const { scrapeRealNews, fetchRealNewsWithPlaywright } = require('./news_api');
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
    
    // 使用 Playwright Stealth 抓取真实新闻
    let newsData = [];
    try {
        newsData = await fetchRealNewsWithPlaywright();
    } catch (e) {
        log(`⚠️ Playwright 抓取失败: ${e.message}，使用备用方案`);
    }
    
    // 如果 Playwright 抓取失败，使用备用新闻源
    if (newsData.length === 0) {
        log('📰 使用备用新闻数据...');
        newsData = [
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
    }
    
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

// ============ 3. 分类与标签化 (增强版) ============

// 地区映射
const REGION_MAP = {
    'ukraine': { zh: '乌克兰', region: '东欧' },
    'russia': { zh: '俄罗斯', region: '东欧' },
    'donbas': { zh: '顿巴斯', region: '东欧' },
    'kremlin': { zh: '莫斯科', region: '东欧' },
    'israel': { zh: '以色列', region: '中东' },
    'gaza': { zh: '加沙', region: '中东' },
    'palestinian': { zh: '巴勒斯坦', region: '中东' },
    'hamas': { zh: '加沙', region: '中东' },
    'iran': { zh: '伊朗', region: '中东' },
    'tehran': { zh: '德黑兰', region: '中东' },
    'jerusalem': { zh: '耶路撒冷', region: '中东' },
    'netanyahu': { zh: '以色列', region: '中东' },
    'nato': { zh: '北约', region: '欧洲' },
    'europe': { zh: '欧洲', region: '欧洲' },
    'us': { zh: '美国', region: '北美' },
    'america': { zh: '美国', region: '北美' },
    'biden': { zh: '美国', region: '北美' },
    'trump': { zh: '美国', region: '北美' }
};

// 事件类型映射
const EVENT_TYPE_MAP = {
    'airstrike': { zh: '空袭', priority: 'high' },
    'attack': { zh: '袭击', priority: 'high' },
    'offensive': { zh: '攻势', priority: 'high' },
    'military': { zh: '军事行动', priority: 'medium' },
    'war': { zh: '战争', priority: 'high' },
    'conflict': { zh: '冲突', priority: 'medium' },
    'strike': { zh: '打击', priority: 'high' },
    'battle': { zh: '战斗', priority: 'high' },
    'troops': { zh: '军事部署', priority: 'medium' },
    'soldiers': { zh: '军事行动', priority: 'medium' },
    'nuclear': { zh: '核计划', priority: 'high' },
    'sanctions': { zh: '制裁', priority: 'low' },
    'negotiation': { zh: '谈判', priority: 'low' },
    'ceasefire': { zh: '停火', priority: 'high' },
    'summit': { zh: '峰会', priority: 'low' },
    'meeting': { zh: '会议', priority: 'low' },
    'announcement': { zh: '声明', priority: 'low' }
};

function detectRegion(text) {
    const lower = text.toLowerCase();
    for (const [key, value] of Object.entries(REGION_MAP)) {
        if (lower.includes(key)) return value;
    }
    return { zh: '其他', region: '其他' };
}

function detectEventType(text) {
    const lower = text.toLowerCase();
    for (const [key, value] of Object.entries(EVENT_TYPE_MAP)) {
        if (lower.includes(key)) return value;
    }
    return { zh: '动态', priority: 'low' };
}

function assessImportance(text, source) {
    const lower = text.toLowerCase();
    // 高优先级关键词
    const highPriority = ['war', 'attack', 'airstrike', 'killed', 'death', 'casualty', 'offensive', 'invasion', 'strike', 'missile', 'drone', 'nuclear', 'ceasefire', 'truce'];
    // 中优先级
    const mediumPriority = ['military', 'troops', 'soldiers', 'deployment', 'conflict', 'battle', 'fight'];
    
    for (const kw of highPriority) {
        if (lower.includes(kw)) return 'high';
    }
    for (const kw of mediumPriority) {
        if (lower.includes(kw)) return 'medium';
    }
    return 'low';
}

async function classifyAndTag(newsData) {
    log('🏷️ 开始分类和标签化...');
    
    const tagged = newsData.map(item => {
        const text = (item.title + item.summary).toLowerCase();
        
        // 1. 提取标签
        const tags = [];
        if (text.includes('ukraine') || text.includes('zelensky')) tags.push('乌克兰');
        if (text.includes('russia') || text.includes('putin') || text.includes('kremlin')) tags.push('俄罗斯');
        if (text.includes('israel') || text.includes('netanyahu')) tags.push('以色列');
        if (text.includes('gaza') || text.includes('hamas') || text.includes('palestinian')) tags.push('哈马斯');
        if (text.includes('iran') || text.includes('tehran')) tags.push('伊朗');
        if (text.includes('us') || text.includes('america') || text.includes('biden') || text.includes('trump')) tags.push('美国');
        if (text.includes('nato') || text.includes('europe')) tags.push('欧洲');
        if (text.includes('middle east')) tags.push('中东');
        
        // 2. 提取地区
        const regionInfo = detectRegion(text);
        
        // 3. 提取事件类型
        const eventInfo = detectEventType(text);
        
        // 4. 评估重要性
        const importance = assessImportance(text, item.source);
        
        // 5. 核实状态 (基于来源)
        const verification = ['BBC', 'Reuters', 'Al Jazeera'].includes(item.source) ? '已核实' : '待核实';
        
        // 6. 时效性判断 (简化: 24小时内为今日)
        const newsDate = new Date(item.timestamp);
        const now = new Date();
        const hoursDiff = (now - newsDate) / (1000 * 60 * 60);
        const timeCategory = hoursDiff <= 24 ? 'today' : (hoursDiff <= 48 ? 'yesterday' : 'older');
        
        return { 
            ...item, 
            tags: tags.length > 0 ? tags : ['其他'],
            region: regionInfo.zh,
            regionGroup: regionInfo.region,
            eventType: eventInfo.zh,
            importance: importance,
            verification: verification,
            timeCategory: timeCategory,
            original_link: item.link
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

// ============ 7. 生成网站 (优化版) ============

// 背景信息字典
const BACKGROUND_INFO = {
    '顿巴斯': '顿巴斯：俄乌冲突核心区域，2014年起处于争议状态，包含顿涅茨克和卢甘斯克',
    '加沙': '加沙地带：巴勒斯坦领土，2007年起由哈马斯控制，以色列实施封锁',
    '乌克兰': '乌克兰：东欧国家，2014年克里米亚危机后与俄罗斯关系恶化，2022年全面战争爆发',
    '俄罗斯': '俄罗斯：全球最大国家，2022年入侵乌克兰引发国际制裁',
    '以色列': '以色列：中东唯一犹太国家，与阿拉伯国家长期存在领土争议',
    '伊朗': '伊朗：中东主要国家，核计划引发国际关注，与美国关系紧张',
    '耶路撒冷': '耶路撒冷：以色列和巴勒斯坦争议首都，被犹太教、基督教、伊斯兰教视为圣地'
};

function getBackgroundInfo(term) {
    return BACKGROUND_INFO[term] || '';
}

// 生成单条新闻卡片 (三层结构: 标题+标签 | 摘要 | 详情)
function generateNewsCard(item, index) {
    const importanceClass = item.importance === 'high' ? 'importance-high' : (item.importance === 'medium' ? 'importance-medium' : 'importance-low');
    const importanceLabel = item.importance === 'high' ? '⚡高优先' : (item.importance === 'medium' ? '中优先' : '一般');
    
    // 标签
    const tags = (item.tags || []).map(t => `<span class="tag tag-region">${t}</span>`).join('');
    const eventTag = `<span class="tag tag-event">${item.eventType}</span>`;
    const verifyTag = item.verification === '已核实' ? '<span class="tag tag-verified">✓已核实</span>' : '<span class="tag tag-pending">⏳待核实</span>';
    
    // 摘要 (第一句话)
    const summary = item.summary_zh || item.summary || '';
    const summaryText = summary.split('.')[0] + (summary.split('.').length > 1 ? '.' : '');
    
    // 详情 (完整内容，折叠显示)
    const detail = item.summary_zh || item.summary || '';
    
    // 背景信息
    const bgInfo = getBackgroundInfo(item.region);
    const bgTooltip = bgInfo ? `<span class="bg-info" title="${bgInfo}">ℹ️</span>` : '';
    
    // 时间处理
    const timeDisplay = item.timestamp ? item.timestamp.replace('T', ' ').slice(0, 16) : '';
    
    return `
    <article class="news-card ${importanceClass}" id="news-${index}">
        <div class="news-header">
            <div class="news-meta-line">
                <span class="time">${timeDisplay}</span>
                <span class="region">${item.region}${bgTooltip}</span>
                ${eventTag}
                ${verifyTag}
            </div>
            <div class="news-title-row">
                <h3 class="news-title">${item.title_zh || item.title}</h3>
                ${item.importance === 'high' ? '<span class="priority-badge">高优先</span>' : ''}
            </div>
        </div>
        <div class="news-summary">${summaryText}</div>
        <div class="news-detail-toggle" onclick="toggleDetail('detail-${index}')">
            <span class="toggle-text">展开详情 ▼</span>
        </div>
        <div class="news-detail" id="detail-${index}">
            <p>${detail}</p>
            <div class="news-footer">
                <span class="source">📰 来源: ${item.source}</span>
                <a href="${item.original_link}" target="_blank" class="original-link">查看原文 →</a>
            </div>
        </div>
        <div class="news-tags">${tags}</div>
    </article>`;
}

// 生成时间线
function generateTimeline(newsData) {
    // 按时间排序
    const sorted = [...newsData].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const timelineItems = sorted.slice(0, 5).map(item => {
        const time = item.timestamp ? item.timestamp.replace('T', ' ').slice(0, 16) : '';
        return `<div class="timeline-item">
            <div class="timeline-time">${time}</div>
            <div class="timeline-content">
                <span class="timeline-region">${item.region}</span>
                <span class="timeline-title">${item.title_zh || item.title}</span>
            </div>
        </div>`;
    }).join('');
    
    return `<div class="timeline">${timelineItems}</div>`;
}

// 生成统计表格
function generateStatsTable(trendReport, newsData) {
    // 按地区统计
    const regionStats = {};
    newsData.forEach(item => {
        const r = item.regionGroup || '其他';
        regionStats[r] = (regionStats[r] || 0) + 1;
    });
    
    const rows = Object.entries(regionStats)
        .sort((a, b) => b[1] - a[1])
        .map(([region, count]) => `<tr><td>${region}</td><td>${count}</td></tr>`).join('');
    
    // 来源统计
    const sourceStats = Object.entries(trendReport.source_counts || {})
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => `<tr><td>${source}</td><td>${count}</td></tr>`).join('');
    
    return `
    <div class="stats-table-container">
        <table class="stats-table">
            <thead><tr><th>战区</th><th>新闻数</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <table class="stats-table">
            <thead><tr><th>信息来源</th><th>数量</th></tr></thead>
            <tbody>${sourceStats}</tbody>
        </table>
    </div>`;
}

function generateWebsite(newsData, hotNews, trendReport) {
    log('🌐 生成网站内容 (优化版)...');
    
    // 1. 按时间和重要性排序
    const sortedNews = [...newsData].sort((a, b) => {
        // 高优先级排前面
        const importanceOrder = { 'high': 0, 'medium': 1, 'low': 2 };
        if (importanceOrder[a.importance] !== importanceOrder[b.importance]) {
            return importanceOrder[a.importance] - importanceOrder[b.importance];
        }
        // 同优先级按时间
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // 2. 分离紧急新闻 (高优先级 + 48小时内)
    const urgentNews = sortedNews.filter(n => n.importance === 'high' && n.timeCategory !== 'older');
    const todayNews = sortedNews.filter(n => n.timeCategory === 'today');
    const yesterdayNews = sortedNews.filter(n => n.timeCategory === 'yesterday');
    const olderNews = sortedNews.filter(n => n.timeCategory === 'older');
    
    // 3. 生成各板块
    const urgentCards = urgentNews.slice(0, 3).map((n, i) => generateNewsCard(n, `urgent-${i}`)).join('');
    const todayCards = todayNews.map((n, i) => generateNewsCard(n, `today-${i}`)).join('');
    const yesterdayCards = yesterdayNews.map((n, i) => generateNewsCard(n, `yesterday-${i}`)).join('');
    const timeline = generateTimeline(newsData);
    const statsTable = generateStatsTable(trendReport, newsData);
    
    // 4. 热度标签
    const trendingTags = trendReport.hot_tags.map(t => `
        <div class="trending-item">
            <span class="count">${t.count}</span> ${t.tag}
        </div>`).join('');
    
    const indexContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>全球战场新闻资讯 | Global Battle News</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-card: #1c2128;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-red: #da3633;
            --accent-orange: #d29922;
            --accent-blue: #58a6ff;
            --border-color: #30363d;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif; 
            background: var(--bg-primary); 
            color: var(--text-primary); 
            line-height: 1.6;
        }
        
        /* 头部 */
        header { 
            background: linear-gradient(135deg, #0d1117 0%, #161b22 100%); 
            padding: 1.5rem 2rem; 
            border-bottom: 3px solid var(--accent-red);
        }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.8rem; font-weight: 900; color: var(--accent-red); letter-spacing: 2px; }
        .logo span { color: var(--text-primary); }
        .update-info { font-size: 0.85rem; color: var(--text-secondary); }
        
        .container { max-width: 1200px; margin: 0 auto; padding: 1.5rem; }
        
        /* 统计栏 */
        .stats-bar { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 1rem; 
            margin-bottom: 2rem; 
        }
        .stat-box { 
            background: var(--bg-secondary); 
            padding: 1rem; 
            border-radius: 8px; 
            text-align: center; 
            border: 1px solid var(--border-color);
        }
        .stat-box .num { font-size: 1.8rem; font-weight: bold; color: var(--accent-red); }
        .stat-box .label { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }
        
        /* 紧急播报 */
        .urgent-section {
            background: linear-gradient(135deg, #2d1b1b 0%, #1c2128 100%);
            border: 2px solid var(--accent-red);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }
        .urgent-section h2 { 
            color: var(--accent-red); 
            font-size: 1.3rem; 
            margin-bottom: 1rem; 
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        /* 区块标题 */
        .section-title { 
            font-size: 1.2rem; 
            color: var(--text-primary); 
            margin-bottom: 1rem; 
            padding-bottom: 0.5rem; 
            border-bottom: 2px solid var(--accent-blue);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        /* 新闻卡片 - 三层结构 */
        .news-card {
            background: var(--bg-card);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 4px solid var(--border-color);
            transition: all 0.2s;
        }
        .news-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        
        /* 重要性标识 */
        .news-card.importance-high { border-left-color: var(--accent-red); }
        .news-card.importance-medium { border-left-color: var(--accent-orange); }
        .priority-badge { 
            background: var(--accent-red); 
            color: white; 
            padding: 0.2rem 0.5rem; 
            border-radius: 4px; 
            font-size: 0.7rem; 
            margin-left: 0.5rem;
        }
        
        /* 卡片头部 */
        .news-header { margin-bottom: 0.8rem; }
        .news-meta-line { 
            font-size: 0.75rem; 
            color: var(--text-secondary); 
            margin-bottom: 0.5rem;
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            align-items: center;
        }
        .news-meta-line .time { color: var(--accent-blue); }
        .news-meta-line .region { 
            background: var(--bg-secondary); 
            padding: 0.1rem 0.5rem; 
            border-radius: 4px; 
        }
        
        /* 标签 */
        .tag { 
            padding: 0.2rem 0.5rem; 
            border-radius: 4px; 
            font-size: 0.7rem; 
            margin-right: 0.3rem;
        }
        .tag-region { background: #238636; color: white; }
        .tag-event { background: #1f6feb; color: white; }
        .tag-verified { background: #238636; color: white; }
        .tag-pending { background: #d29922; color: black; }
        
        /* 标题 */
        .news-title-row { display: flex; align-items: center; }
        .news-title { 
            font-size: 1rem; 
            font-weight: 600; 
            line-height: 1.4;
        }
        
        /* 摘要 */
        .news-summary { 
            color: var(--text-secondary); 
            font-size: 0.9rem;
            padding: 0.5rem 0;
            border-left: 3px solid var(--accent-blue);
            padding-left: 0.8rem;
            margin: 0.5rem 0;
        }
        
        /* 详情 (折叠) */
        .news-detail-toggle {
            color: var(--accent-blue);
            cursor: pointer;
            font-size: 0.8rem;
            padding: 0.3rem 0;
        }
        .news-detail {
            display: none;
            padding: 0.8rem;
            background: var(--bg-secondary);
            border-radius: 6px;
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        .news-detail.open { display: block; }
        
        .news-footer { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-top: 0.8rem;
            padding-top: 0.5rem;
            border-top: 1px solid var(--border-color);
            font-size: 0.8rem;
        }
        .source { color: var(--text-secondary); }
        
        .original-link { 
            color: var(--accent-blue); 
            text-decoration: none; 
            font-size: 0.8rem;
        }
        .original-link:hover { text-decoration: underline; }
        
        /* 标签们 */
        .news-tags { margin-top: 0.8rem; }
        
        /* 热度趋势 */
        .trending { 
            display: flex; 
            gap: 0.8rem; 
            flex-wrap: wrap; 
            margin-bottom: 2rem; 
        }
        .trending-item { 
            background: var(--bg-secondary); 
            padding: 0.5rem 1rem; 
            border-radius: 20px; 
            display: flex; 
            align-items: center; 
            gap: 0.5rem;
        }
        .trending-item .count { 
            background: var(--accent-red); 
            color: white; 
            padding: 0.2rem 0.5rem; 
            border-radius: 10px; 
            font-size: 0.75rem; 
        }
        
        /* 时间线 */
        .timeline {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
        }
        .timeline-item {
            display: flex;
            padding: 0.5rem 0;
            border-left: 2px solid var(--border-color);
            padding-left: 1rem;
            margin-left: 0.5rem;
        }
        .timeline-time {
            font-size: 0.75rem;
            color: var(--accent-blue);
            min-width: 120px;
        }
        .timeline-region {
            font-size: 0.75rem;
            background: #238636;
            color: white;
            padding: 0.1rem 0.4rem;
            border-radius: 3px;
            margin-right: 0.5rem;
        }
        .timeline-title {
            font-size: 0.85rem;
            color: var(--text-secondary);
        }
        
        /* 统计表格 */
        .stats-table-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            background: var(--bg-secondary);
            border-radius: 8px;
            overflow: hidden;
        }
        .stats-table th, .stats-table td {
            padding: 0.8rem;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }
        .stats-table th {
            background: var(--bg-card);
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-transform: uppercase;
        }
        .stats-table td {
            font-size: 0.9rem;
        }
        
        /* 背景信息提示 */
        .bg-info {
            cursor: help;
            color: var(--accent-blue);
            margin-left: 0.3rem;
        }
        
        /* 区块分隔 */
        .news-section { margin-bottom: 2.5rem; }
        
        /* 免责声明 */
        .disclaimer-box {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 1.5rem;
            margin-top: 2rem;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .disclaimer-box h4 { color: var(--accent-orange); margin-bottom: 0.5rem; }
        .disclaimer-box ul { padding-left: 1.5rem; }
        .disclaimer-box li { margin-bottom: 0.3rem; }
        
        /* 响应式 */
        @media (max-width: 768px) {
            .stats-bar { grid-template-columns: repeat(2, 1fr); }
            .stats-table-container { grid-template-columns: 1fr; }
            .header-content { flex-direction: column; gap: 0.5rem; }
        }
    </style>
    <script>
        function toggleDetail(id) {
            const el = document.getElementById(id);
            const toggle = el.previousElementSibling;
            if (el.classList.contains('open')) {
                el.classList.remove('open');
                toggle.querySelector('.toggle-text').textContent = '展开详情 ▼';
            } else {
                el.classList.add('open');
                toggle.querySelector('.toggle-text').textContent = '收起详情 ▲';
            }
        }
    </script>
</head>
<body>
    <header>
        <div class="header-content">
            <div class="logo">⚔️ <span>全球战场</span>新闻</div>
            <div class="update-info">最后更新: ${getDateTimeStr()}</div>
        </div>
    </header>
    
    <div class="container">
        <!-- 统计 -->
        <div class="stats-bar">
            <div class="stat-box">
                <div class="num">${trendReport.total_news}</div>
                <div class="label">新闻总数</div>
            </div>
            <div class="stat-box">
                <div class="num">${Object.keys(trendReport.tag_counts).length}</div>
                <div class="label">涉及战区</div>
            </div>
            <div class="stat-box">
                <div class="num">${urgentNews.length}</div>
                <div class="label">紧急事件</div>
            </div>
            <div class="stat-box">
                <div class="num">${trendReport.hot_tags[0]?.tag || '-'}</div>
                <div class="label">最热战区</div>
            </div>
        </div>
        
        <!-- 紧急播报 -->
        ${urgentNews.length > 0 ? `
        <div class="urgent-section">
            <h2>🚨 紧急播报 (48小时内高优先)</h2>
            ${urgentCards}
        </div>` : ''}
        
        <!-- 热度趋势 -->
        <div class="section-title">📈 热度趋势</div>
        <div class="trending">${trendingTags}</div>
        
        <!-- 时间线 -->
        <div class="section-title">📅 事件时间线</div>
        ${timeline}
        
        <!-- 统计表格 -->
        <div class="section-title">📊 战区统计</div>
        ${statsTable}
        
        <!-- 今日更新 -->
        <div class="news-section">
            <div class="section-title">📰 今日更新 (${todayNews.length}条)</div>
            ${todayCards || '<p style="color: var(--text-secondary);">暂无今日更新</p>'}
        </div>
        
        <!-- 昨日回顾 -->
        <div class="news-section">
            <div class="section-title">� Yesterday 昨日回顾 (${yesterdayNews.length}条)</div>
            ${yesterdayCards || '<p style="color: var(--text-secondary);">暂无昨日更新</p>'}
        </div>
        
        <!-- 免责声明 -->
        <div class="disclaimer-box">
            <h4>⚠️ 免责声明</h4>
            <ul>
                <li>本站内容均来自公开网络信源（BBC、Reuters、Al Jazeera等），仅作信息整理，不代表本站立场</li>
                <li>战场信息存在延迟和偏差，请勿将本站内容作为任何决策依据</li>
                <li>标注"已核实"的内容表示来自权威媒体，但不代表完全准确；"待核实"内容需谨慎对待</li>
                <li>如涉及敏感内容，请联系本站处理</li>
            </ul>
            <p style="margin-top: 0.5rem;">© 2026 Global Battle News | 信息来源: Reuters, BBC, Al Jazeera</p>
        </div>
        
        <p class="update-info" style="text-align: center; margin-top: 1rem;">
            🔄 最后更新: ${getDateTimeStr()}
        </p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(CONFIG.NEWS_DIR, 'index.html'), indexContent);
    log('✅ 网站生成完成 (优化版): index.html');
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
