/**
 * 告警通知模块
 * 支持微信/邮件通知
 */

// 模拟发送消息（实际需要配置真实接口）
async function sendWechatMessage(message) {
    // 方式1: 企业微信群机器人
    // Webhook URL 可以在企业微信群设置中获取
    const webhookUrl = process.env.WECHAT_WEBHOOK;
    
    if (!webhookUrl) {
        console.log('⚠️ 未配置企业微信 webhook');
        return false;
    }
    
    const https = require('https');
    const postData = JSON.stringify({
        msgtype: 'text',
        text: { content: message }
    });
    
    return new Promise((resolve) => {
        const req = https.request(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(true));
        });
        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

async function sendEmail(subject, body) {
    // 方式: 使用 nodemailer
    // 需要配置 SMTP
    
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
    
    const info = await transporter.sendMail({
        from: '"Battle News" <noreply@example.com>',
        to: process.env.EMAIL_TO || 'user@example.com',
        subject: subject,
        text: body
    });
    
    console.log('📧 邮件已发送:', info.messageId);
    return true;
}

// 发送告警
async function sendAlert(tag, count, threshold) {
    const message = `⚠️ 战区新闻更新提醒\n\n${tag} 新闻数量达到 ${count}，超过阈值 ${threshold}！\n\n请及时查看：https://stylemonster.github.io/battle-news/\n\n时间: ${new Date().toLocaleString()}`;
    
    console.log('📨 发送告警:', message);
    
    // 尝试发送微信
    await sendWechatMessage(message);
    
    // 尝试发送邮件
    await sendEmail(`⚠️ ${tag} 战区新闻告警`, message);
    
    return true;
}

module.exports = { sendAlert, sendWechatMessage, sendEmail };
