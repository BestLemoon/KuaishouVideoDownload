#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 读取HTML模板
function loadEmailTemplate() {
    const templatePath = path.join(__dirname, 'pro-announcement-email.html');
    return fs.readFileSync(templatePath, 'utf8');
}

// 替换模板变量
function replaceVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

// 模拟用户数据 - 你需要替换为实际的数据库查询
const sampleUsers = [
    { email: 'test@example.com', nickname: 'Test User', locale: 'en' },
    // 添加更多测试用户或连接实际数据库
];

async function sendEmails() {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const WEBSITE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://twitterdown.com';
    
    if (!RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY environment variable is required');
        process.exit(1);
    }

    console.log('🚀 Starting email campaign...\n');
    
    const template = loadEmailTemplate();
    const results = [];

    for (const user of sampleUsers) {
        try {
            const variables = {
                USER_NAME: user.nickname || 'Friend',
                WEBSITE_URL: WEBSITE_URL,
                UNSUBSCRIBE_URL: `${WEBSITE_URL}/unsubscribe`
            };

            const htmlContent = replaceVariables(template, variables);
            
            const payload = {
                from: 'TwitterDown <noreply@twitterdown.com>', // 替换为你的发送域名
                to: [user.email],
                subject: '🎉 FREE Pro Access for One Year - 150 Downloads/Month!',
                html: htmlContent
            };

            console.log(`📧 Sending email to: ${user.email}`);
            
            // 使用curl发送邮件
            const curlCommand = `curl -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer ${RESEND_API_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify(payload).replace(/'/g, "\\'")}'`;

            console.log('Curl command for', user.email);
            console.log(curlCommand);
            console.log('\n' + '='.repeat(80) + '\n');

            results.push({
                email: user.email,
                status: 'prepared',
                curlCommand: curlCommand
            });

            // 为了演示，我们不实际发送，只显示curl命令
            // 如果要实际发送，取消下面的注释：
            /*
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            
            if (response.ok) {
                console.log(`✅ Email sent successfully to ${user.email}`);
                results.push({ email: user.email, status: 'sent', id: result.id });
            } else {
                console.error(`❌ Failed to send email to ${user.email}:`, result);
                results.push({ email: user.email, status: 'failed', error: result });
            }
            */

        } catch (error) {
            console.error(`❌ Error sending email to ${user.email}:`, error);
            results.push({ email: user.email, status: 'error', error: error.message });
        }

        // 添加延迟避免触发限制
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n📊 Campaign Summary:');
    console.log(`Total users: ${sampleUsers.length}`);
    console.log(`Prepared: ${results.filter(r => r.status === 'prepared').length}`);
    
    return results;
}

// 如果直接运行此文件
if (require.main === module) {
    // 设置环境变量（仅用于测试）
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'your-resend-api-key-here';
    process.env.NEXT_PUBLIC_WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://twitterdown.com';
    
    sendEmails()
        .then(() => {
            console.log('\n✅ Email campaign completed!');
        })
        .catch(error => {
            console.error('\n❌ Campaign failed:', error);
            process.exit(1);
        });
}

module.exports = { sendEmails, loadEmailTemplate, replaceVariables }; 