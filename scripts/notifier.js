/**
 * 告警通知模块
 * 支持微信/邮件/飞书通知
 */

// 飞书机器人 Webhook
const FEISHU_WEBHOOK = process.env.FEISHU_WEBHOOK;

// 发送飞书消息
async function sendFeishuMessage(message) {
    if (!FEISHU_WEBHOOK) {
        console.log('⚠️ 未配置飞书 webhook，跳过通知');
        return false;
    }
    
    const https = require('https');
    const postData = JSON.stringify({
        msg_type: 'text',
        content: { text: message }
    });
    
    return new Promise((resolve) => {
        const url = new URL(FEISHU_WEBHOOK);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log('📨 飞书消息已发送');
                resolve(true);
            });
        });
        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

// 发送告警
async function sendAlert(tag, count, threshold) {
    const message = `⚠️ 战区新闻更新提醒\n\n${tag} 新闻数量达到 ${count}，超过阈值 ${threshold}！\n\n查看详情：https://stylemonster.github.io/battle-news/\n\n时间: ${new Date().toLocaleString()}`;
    
    console.log('📨 发送告警:', message);
    
    // 发送飞书
    await sendFeishuMessage(message);
    
    // 尝试发送微信
    await sendWechatMessage(message);
    
    // 尝试发送邮件
    await sendEmail(`⚠️ ${tag} 战区新闻告警`, message);
    
    return true;
}

module.exports = { sendAlert, sendWechatMessage, sendEmail };
