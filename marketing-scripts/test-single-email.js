#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const readline = require('readline');

// 配置信息
const CONFIG = {
    RESEND_API_KEY: process.env.RESEND_API_KEY || 're_CN2XhdgQ_GPtQKPxEXzQXALbLmcrYxw5f',
    WEBSITE_URL: process.env.NEXT_PUBLIC_WEB_URL || 'https://twitterdown.com',
    FROM_EMAIL: 'TwitterDown <noreply@updates.twitterdown.com>',
    SUBJECT: '🎉 一年Pro功能免费！每月150次下载'
};

// 创建readline接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 读取中文HTML模板
function loadEmailTemplate() {
    const templatePath = path.join(__dirname, 'pro-announcement-email-zh.html');
    if (!fs.existsSync(templatePath)) {
        console.error('❌ 找不到中文邮件模板:', templatePath);
        process.exit(1);
    }
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

// 转义JSON字符串
function escapeJsonString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

// 发送邮件
async function sendTestEmail(email, name) {
    console.log(`\n📧 准备发送测试邮件到: ${email}`);
    
    // 读取并处理模板
    const template = loadEmailTemplate();
    const variables = {
        USER_NAME: name || '朋友',
        WEBSITE_URL: CONFIG.WEBSITE_URL,
        UNSUBSCRIBE_URL: `${CONFIG.WEBSITE_URL}/unsubscribe`
    };
    
    const htmlContent = replaceVariables(template, variables);
    
    // 构建邮件数据
    const payload = {
        from: CONFIG.FROM_EMAIL,
        to: [email],
        subject: CONFIG.SUBJECT,
        html: htmlContent
    };

    const jsonPayload = JSON.stringify(payload);
    const escapedPayload = escapeJsonString(jsonPayload);

    const curlCommand = `curl -s -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer ${CONFIG.RESEND_API_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d "${escapedPayload}"`;

    console.log('🚀 正在发送...');

    return new Promise((resolve, reject) => {
        exec(curlCommand, (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ 发送失败: ${error.message}`);
                resolve({ success: false, error: error.message });
                return;
            }

            try {
                const response = JSON.parse(stdout);
                if (response.id) {
                    console.log(`✅ 发送成功!`);
                    console.log(`📧 邮件ID: ${response.id}`);
                    console.log(`📬 发送到: ${email}`);
                    resolve({ success: true, id: response.id });
                } else {
                    console.error(`❌ 发送失败:`, response);
                    resolve({ success: false, error: response });
                }
            } catch (parseError) {
                console.error(`❌ 解析响应失败:`, stdout);
                resolve({ success: false, error: 'Response parse error' });
            }
        });
    });
}

// 询问用户输入
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// 主函数
async function main() {
    try {
        console.log('🧪 TwitterDown Pro公告邮件测试工具');
        console.log('='.repeat(50));
        
        // 检查配置
        if (!CONFIG.RESEND_API_KEY || CONFIG.RESEND_API_KEY === 'your-resend-api-key-here') {
            console.error('❌ 请设置正确的RESEND_API_KEY环境变量');
            process.exit(1);
        }
        
        console.log('✅ 配置检查通过');
        console.log(`📧 发送邮箱: ${CONFIG.FROM_EMAIL}`);
        console.log(`🌐 网站URL: ${CONFIG.WEBSITE_URL}`);
        console.log(`📝 邮件主题: ${CONFIG.SUBJECT}\n`);
        
        // 获取用户输入
        const email = await askQuestion('请输入测试邮箱地址: ');
        
        if (!email || !email.includes('@')) {
            console.error('❌ 请输入有效的邮箱地址');
            process.exit(1);
        }
        
        const name = await askQuestion('请输入测试用户名 (可选): ');
        
        // 发送测试邮件
        const result = await sendTestEmail(email, name);
        
        if (result.success) {
            console.log('\n🎉 测试邮件发送成功！');
            console.log('💡 请检查您的邮箱（包括垃圾邮件文件夹）');
        } else {
            console.log('\n❌ 测试邮件发送失败');
            console.log('错误信息:', result.error);
        }
        
    } catch (error) {
        console.error('❌ 程序执行出错:', error);
    } finally {
        rl.close();
    }
}

// 运行程序
if (require.main === module) {
    main().then(() => {
        process.exit(0);
    }).catch(error => {
        console.error('❌ 程序执行失败:', error);
        process.exit(1);
    });
}

module.exports = { main, sendTestEmail }; 