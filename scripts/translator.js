/**
 * 翻译模块 - 使用 Google Translate API
 */

const https = require('https');

// 翻译函数
function translateText(text, targetLang = 'zh-CN') {
    return new Promise((resolve, reject) => {
        // 使用 Google Translate API (免费方式)
        const encodedText = encodeURIComponent(text);
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodedText}`;
        
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    // 提取翻译结果
                    const translated = result[0]?.map(item => item[0]).join('') || text;
                    resolve(translated);
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('翻译超时'));
        });
    });
}

// 批量翻译
async function translateBatch(texts) {
    console.log(`📝 正在翻译 ${texts.length} 条内容...`);
    
    const results = [];
    for (const text of texts) {
        try {
            const translated = await translateText(text);
            results.push(translated);
            // 添加延迟避免请求过快
            await new Promise(r => setTimeout(r, 100));
        } catch (e) {
            console.log(`翻译失败: ${e.message}`);
            results.push(text);
        }
    }
    
    return results;
}

module.exports = { translateText, translateBatch };
