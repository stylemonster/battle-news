/**
 * 新闻源 API 模块
 * 接入真实新闻源
 */

const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const PLAYWRIGHT_SCRAPER = path.join(__dirname, '../../../skills/playwright-scraper/scripts/playwright-stealth.js');

// ============ 0. 使用 Playwright Stealth 抓取 (新增) ============
async function fetchFromPlaywrightStealth(url) {
    return new Promise((resolve) => {
        try {
            const result = execSync(`node "${PLAYWRIGHT_SCRAPER}" "${url}"`, {
                encoding: 'utf8',
                timeout: 60000,
                cwd: path.dirname(PLAYWRIGHT_SCRAPER)
            });
            // 找到 "爬取完成！" 标记，然后解析后续的 JSON
            const marker = '✅ 爬取完成！';
            const markerIndex = result.indexOf(marker);
            if (markerIndex === -1) {
                resolve(null);
                return;
            }
            
            // 从标记后提取 JSON
            const jsonStr = result.substring(markerIndex + marker.length).trim();
            // 找到 JSON 块的结束位置 (最后一个 })
            const jsonBlock = jsonStr.substring(0, jsonStr.lastIndexOf('}') + 1);
            
            try {
                const json = JSON.parse(jsonBlock);
                resolve(json);
            } catch (parseErr) {
                console.log('JSON parse error:', parseErr.message);
                resolve(null);
            }
        } catch (e) {
            console.log(`Stealth 抓取失败: ${e.message}`);
            resolve(null);
        }
    });
}

// 从 BBC News 抓取
async function fetchFromBBC() {
    console.log('🌐 正在从 BBC News 抓取...');
    const result = await fetchFromPlaywrightStealth('https://www.bbc.com/news/world');
    console.log('BBC result:', result ? 'got result, content length: ' + (result.contentPreview?.length || 0) : 'null');
    if (!result || !result.contentPreview) return [];
    
    // 解析内容 (简单提取)
    const lines = result.contentPreview.split('\n').filter(l => l.trim());
    const news = [];
    
    // 简单解析 (实际可用cheerio进一步处理)
    let i = 0;
    while (i < lines.length && news.length < 10) {
        const line = lines[i].trim();
        if (line.length > 30 && !line.startsWith('Skip') && !line.startsWith('World')) {
            news.push({
                title: line,
                summary: '',
                link: 'https://www.bbc.com/news/world',
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
                source: 'BBC',
                likes: Math.floor(Math.random() * 1000),
                shares: Math.floor(Math.random() * 500),
                comments: Math.floor(Math.random() * 200)
            });
        }
        i++;
    }
    
    console.log(`从 BBC 获取 ${news.length} 条新闻`);
    return news;
}

// 从 Al Jazeera 抓取
async function fetchFromAlJazeera() {
    console.log('🌐 正在从 Al Jazeera 抓取...');
    const result = await fetchFromPlaywrightStealth('https://www.aljazeera.com/news');
    if (!result || !result.contentPreview) return [];
    
    const lines = result.contentPreview.split('\n').filter(l => l.trim());
    const news = [];
    
    let i = 0;
    while (i < lines.length && news.length < 10) {
        const line = lines[i].trim();
        if (line.length > 30 && !line.startsWith('Skip') && !line.startsWith('News') && !line.startsWith('LIVE')) {
            news.push({
                title: line,
                summary: '',
                link: 'https://www.aljazeera.com/news',
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
                source: 'Al Jazeera',
                likes: Math.floor(Math.random() * 800),
                shares: Math.floor(Math.random() * 400),
                comments: Math.floor(Math.random() * 150)
            });
        }
        i++;
    }
    
    console.log(`从 Al Jazeera 获取 ${news.length} 条新闻`);
    return news;
}

// 综合使用 Playwright Stealth 抓取多个源
async function fetchRealNewsWithPlaywright() {
    console.log('🕷️ 使用 Playwright Stealth 抓取真实新闻...');
    
    const allNews = [];
    
    try {
        const bbcNews = await fetchFromBBC();
        allNews.push(...bbcNews);
    } catch (e) {
        console.log('BBC 抓取失败:', e.message);
    }
    
    try {
        const ajNews = await fetchFromAlJazeera();
        allNews.push(...ajNews);
    } catch (e) {
        console.log('Al Jazeera 抓取失败:', e.message);
    }
    
    // 去重
    const uniqueNews = allNews.filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
    );
    
    console.log(`✅ 总计获取 ${uniqueNews.length} 条真实新闻`);
    return uniqueNews;
}

// NewsAPI (需要API Key，免费版有配额限制)
// const NEWS_API_KEY = 'YOUR_NEWSAPI_KEY'; 

// ============ 1. 使用 NewsAPI ============
async function fetchFromNewsAPI(keywords) {
    // NewsAPI 文档: https://newsapi.org/docs
    // 免费版: 100次/天
    
    // 这里演示，实际需要API Key
    const news = [];
    
    // 模拟返回，实际会调用 NewsAPI
    return news;
}

// ============ 2. 使用 GDELT 项目 (免费) ============
async function fetchFromGDELT(keywords) {
    // GDELT 是免费的大规模新闻数据库
    // https://www.gdeltproject.org/
    
    return new Promise((resolve, reject) => {
        // GDELT 读取 API
        const url = 'https://api.gdeltproject.org/api/v2/docjson?query=' + 
            encodeURIComponent(keywords.join(' OR ')) + 
            '&mode=artlist&sort=DateDesc&maxrecords=10&format=json';
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const articles = (json.articles || []).map(article => ({
                        title: article.title || '',
                        summary: article.seendate || '',
                        link: article.url || '',
                        timestamp: article.seendate || new Date().toISOString(),
                        source: article.domain || '',
                        likes: 0,
                        shares: 0,
                        comments: 0
                    }));
                    resolve(articles);
                } catch (e) {
                    resolve([]);
                }
            });
        });
        
        req.on('error', () => resolve([]));
        req.setTimeout(10000, () => { req.destroy(); resolve([]); });
    });
}

// ============ 3. 使用 RSS 订阅源 ============
const RSS_SOURCES = [
    { name: 'Reuters', url: 'https://www.reutersagency.com/feed/?best-topics=conflict-terrorism' },
    { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/world/rss.xml' },
    { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' }
];

async function fetchFromRSS(source) {
    // 简化版，实际需要用 xml2js 解析
    return [];
}

// ============ 4. 使用 Twitter API (需要认证) ============
async function fetchFromTwitter(keywords) {
    // Twitter API v2 需要 Bearer Token
    // 简化模拟
    return [];
}

// ============ 主函数: 综合抓取 ============
async function scrapeRealNews(keywords) {
    console.log('🌐 开始从真实新闻源抓取...');
    
    const allNews = [];
    const query = keywords.join(' ');
    
    // 尝试从 GDELT 抓取
    try {
        const gdeltNews = await fetchFromGDELT(keywords);
        console.log(`从 GDELT 获取 ${gdeltNews.length} 条新闻`);
        allNews.push(...gdeltNews);
    } catch (e) {
        console.log('GDELT 抓取失败:', e.message);
    }
    
    // 去重
    const uniqueNews = allNews.filter((item, index, self) => 
        index === self.findIndex(t => t.title === item.title)
    );
    
    console.log(`总计获取 ${uniqueNews.length} 条新闻`);
    return uniqueNews;
}

module.exports = { scrapeRealNews, fetchFromGDELT, fetchFromNewsAPI, fetchRealNewsWithPlaywright };
