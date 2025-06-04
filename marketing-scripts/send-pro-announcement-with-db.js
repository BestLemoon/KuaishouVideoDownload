#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// 数据库访问函数
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || "https://irpiwdocgnevzlxtqpws.supabase.co";

  let supabaseKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycGl3ZG9jZ25ldnpseHRxcHdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk2NjM3MSwiZXhwIjoyMDYzNTQyMzcxfQ.4O2gjwLBLACL0aJfeVWcdxGGdvghomPVtC47qPHlD6w";
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or key is not set");
  }

  const client = createClient(supabaseUrl, supabaseKey);
  return client;
}

async function getUsers(page = 1, limit = 50) {
  if (page < 1) page = 1;
  if (limit <= 0) limit = 50;

  const offset = (page - 1) * limit;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching users:', error);
    return undefined;
  }

  return data;
}

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

// 发送单封邮件
async function sendEmailWithCurl(user, htmlContent) {
    const payload = {
        from: CONFIG.FROM_EMAIL,
        to: [user.email],
        subject: CONFIG.SUBJECT,
        html: htmlContent
    };

    const jsonPayload = JSON.stringify(payload);
    const escapedPayload = escapeJsonString(jsonPayload);

    const curlCommand = `curl -s -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer ${CONFIG.RESEND_API_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d "${escapedPayload}"`;

    try {
        console.log(`📧 正在发送邮件到: ${user.email} (${user.nickname || '未知用户'})`);
        
        const { exec } = require('child_process');
        
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
                        console.log(`✅ 发送成功! ID: ${response.id}`);
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
    } catch (error) {
        console.error(`❌ 发送邮件时出错:`, error);
        return { success: false, error: error.message };
    }
}

// 询问用户确认
function askConfirmation(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
        });
    });
}

// 显示用户列表并请求确认
async function confirmUserList(users) {
    console.log('\n📋 即将发送邮件的用户列表：');
    console.log('='.repeat(80));
    console.log('序号 | 邮箱地址 | 用户名 | 注册时间');
    console.log('-'.repeat(80));
    
    users.forEach((user, index) => {
        const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知';
        console.log(`${(index + 1).toString().padStart(3)} | ${user.email.padEnd(30)} | ${(user.nickname || '未知').padEnd(15)} | ${createdAt}`);
    });
    
    console.log('='.repeat(80));
    console.log(`📊 总计: ${users.length} 位用户\n`);
    
    const confirmed = await askConfirmation('✋ 确认向以上用户发送Pro免费通知邮件吗？(y/n): ');
    return confirmed;
}

// 主函数
async function main() {
    try {
        console.log('🚀 TwitterDown Pro公告邮件发送工具');
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
        
        // 从数据库获取用户
        console.log('🔍 正在从数据库查询用户...');
        const users = await getUsers(1, 1000); // 获取前1000个用户
        
        if (!users || users.length === 0) {
            console.log('❌ 没有找到用户数据');
            process.exit(1);
        }
        
        // 过滤有效用户（有邮箱地址的）
        const validUsers = users.filter(user => user.email && user.email.includes('@'));
        
        if (validUsers.length === 0) {
            console.log('❌ 没有找到有效的用户邮箱');
            process.exit(1);
        }
        
        console.log(`✅ 找到 ${validUsers.length} 位有效用户\n`);
        
        // 显示用户列表并请求确认
        const confirmed = await confirmUserList(validUsers);
        
        if (!confirmed) {
            console.log('❌ 用户取消了发送操作');
            rl.close();
            process.exit(0);
        }
        
        console.log('\n🚀 开始发送邮件...\n');
        
        // 读取邮件模板
        const template = loadEmailTemplate();
        
        const results = [];
        let successCount = 0;
        
        // 批量发送邮件
        for (let i = 0; i < validUsers.length; i++) {
            const user = validUsers[i];
            
            try {
                // 替换模板变量
                const variables = {
                    USER_NAME: user.nickname || '朋友',
                    WEBSITE_URL: CONFIG.WEBSITE_URL,
                    UNSUBSCRIBE_URL: `${CONFIG.WEBSITE_URL}/unsubscribe`
                };
                
                const htmlContent = replaceVariables(template, variables);
                
                // 发送邮件
                const result = await sendEmailWithCurl(user, htmlContent);
                
                if (result.success) {
                    successCount++;
                }
                
                results.push({
                    email: user.email,
                    nickname: user.nickname,
                    success: result.success,
                    id: result.id,
                    error: result.error
                });
                
                // 添加延迟避免触发限制
                if (i < validUsers.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                
            } catch (error) {
                console.error(`❌ 发送邮件到 ${user.email} 时出错:`, error);
                results.push({
                    email: user.email,
                    nickname: user.nickname,
                    success: false,
                    error: error.message
                });
            }
        }
        
        // 显示发送结果
        console.log('\n📊 发送结果统计:');
        console.log('='.repeat(50));
        console.log(`✅ 成功发送: ${successCount} 封`);
        console.log(`❌ 发送失败: ${validUsers.length - successCount} 封`);
        console.log(`📈 成功率: ${((successCount / validUsers.length) * 100).toFixed(1)}%`);
        
        // 保存详细结果到文件
        const resultFile = path.join(__dirname, `email-results-${new Date().toISOString().slice(0, 10)}.json`);
        fs.writeFileSync(resultFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            total: validUsers.length,
            success: successCount,
            failed: validUsers.length - successCount,
            results: results
        }, null, 2));
        
        console.log(`📁 详细结果已保存到: ${resultFile}`);
        
    } catch (error) {
        console.error('❌ 程序执行出错:', error);
    } finally {
        rl.close();
    }
}

// 如果直接运行此文件
if (require.main === module) {
    main().then(() => {
        console.log('\n✅ 邮件发送任务完成！');
        process.exit(0);
    }).catch(error => {
        console.error('\n❌ 邮件发送任务失败:', error);
        process.exit(1);
    });
}

module.exports = {
    main,
    sendEmailWithCurl,
    confirmUserList,
    CONFIG
}; 