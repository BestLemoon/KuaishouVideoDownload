#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

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

async function getUsers(page = 1, limit = 1000) {
  if (page < 1) page = 1;
  if (limit <= 0) limit = 1000;

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
    SUBJECT: '🎉 一年Pro功能免费！每月150次下载',
    AUDIENCE_NAME: 'TwitterDown Pro公告订阅用户'
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
    console.log('\n📋 即将添加到audience的用户列表：');
    console.log('='.repeat(80));
    console.log('序号 | 邮箱地址 | 用户名 | 注册时间');
    console.log('-'.repeat(80));
    
    users.slice(0, 10).forEach((user, index) => {
        const createdAt = user.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知';
        console.log(`${(index + 1).toString().padStart(3)} | ${user.email.padEnd(30)} | ${(user.nickname || '未知').padEnd(15)} | ${createdAt}`);
    });
    
    if (users.length > 10) {
        console.log(`... 还有 ${users.length - 10} 位用户`);
    }
    
    console.log('='.repeat(80));
    console.log(`📊 总计: ${users.length} 位用户\n`);
    
    const confirmed = await askConfirmation('✋ 确认创建audience并添加这些用户吗？(y/n): ');
    return confirmed;
}

// 创建或获取audience
async function createOrGetAudience(resend) {
    try {
        console.log('🔍 检查现有的audience...');
        
        // 列出现有的audiences
        const audiences = await resend.audiences.list();
        
        // 查找已存在的audience
        const existingAudience = audiences.data?.find(
            audience => audience.name === CONFIG.AUDIENCE_NAME
        );
        
        if (existingAudience) {
            console.log(`✅ 找到已存在的audience: ${existingAudience.name} (ID: ${existingAudience.id})`);
            return existingAudience;
        }
        
        // 创建新的audience
        console.log('📝 创建新的audience...');
        const newAudience = await resend.audiences.create({
            name: CONFIG.AUDIENCE_NAME
        });
        
        console.log(`✅ 成功创建audience: ${newAudience.name} (ID: ${newAudience.id})`);
        return newAudience;
        
    } catch (error) {
        console.error('❌ 创建或获取audience失败:', error);
        throw error;
    }
}

// 批量添加联系人到audience
async function addContactsToAudience(resend, audience, users) {
    console.log('\n📝 开始添加用户到audience...');
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        try {
            console.log(`📧 添加用户 (${i + 1}/${users.length}): ${user.email}`);
            
            const contact = await resend.contacts.create({
                email: user.email,
                firstName: user.nickname ? user.nickname.split(' ')[0] : '',
                lastName: user.nickname ? user.nickname.split(' ').slice(1).join(' ') : '',
                unsubscribed: false,
                audienceId: audience.id,
            });
            
            console.log(`  ✅ 成功添加: ${contact.email}`);
            successCount++;
            
            results.push({
                email: user.email,
                success: true,
                contactId: contact.id
            });
            
        } catch (error) {
            console.error(`  ❌ 添加失败: ${user.email} - ${error.message}`);
            errorCount++;
            
            results.push({
                email: user.email,
                success: false,
                error: error.message
            });
        }
        
        // 添加延迟避免API限制
        if (i < users.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    console.log('\n📊 添加联系人结果统计:');
    console.log('='.repeat(50));
    console.log(`✅ 成功添加: ${successCount} 位用户`);
    console.log(`❌ 添加失败: ${errorCount} 位用户`);
    console.log(`📈 成功率: ${((successCount / users.length) * 100).toFixed(1)}%`);
    
    return {
        total: users.length,
        success: successCount,
        failed: errorCount,
        results: results
    };
}

// 发送broadcast邮件
async function sendBroadcastEmail(resend, audience) {
    try {
        console.log('\n📧 准备发送broadcast邮件...');
        
        // 读取邮件模板
        const template = loadEmailTemplate();
        
        // 替换模板变量（broadcast中可以使用{{firstName}}等变量）
        const variables = {
            USER_NAME: '{{firstName}}', // Resend会自动替换每个联系人的firstName
            WEBSITE_URL: CONFIG.WEBSITE_URL,
            UNSUBSCRIBE_URL: `${CONFIG.WEBSITE_URL}/unsubscribe`
        };
        
        const htmlContent = replaceVariables(template, variables);
        
        console.log('📤 发送broadcast邮件...');
        
        const broadcast = await resend.broadcasts.send({
            from: CONFIG.FROM_EMAIL,
            subject: CONFIG.SUBJECT,
            html: htmlContent,
            audienceId: audience.id,
        });
        
        console.log(`✅ Broadcast发送成功! ID: ${broadcast.id}`);
        return broadcast;
        
    } catch (error) {
        console.error('❌ 发送broadcast失败:', error);
        throw error;
    }
}

// 主函数
async function main() {
    try {
        console.log('🚀 TwitterDown Pro公告邮件发送工具 (Audience版本)');
        console.log('='.repeat(60));
        
        // 检查配置
        if (!CONFIG.RESEND_API_KEY || CONFIG.RESEND_API_KEY === 'your-resend-api-key-here') {
            console.error('❌ 请设置正确的RESEND_API_KEY环境变量');
            process.exit(1);
        }
        
        console.log('✅ 配置检查通过');
        console.log(`📧 发送邮箱: ${CONFIG.FROM_EMAIL}`);
        console.log(`🌐 网站URL: ${CONFIG.WEBSITE_URL}`);
        console.log(`📝 邮件主题: ${CONFIG.SUBJECT}`);
        console.log(`👥 Audience名称: ${CONFIG.AUDIENCE_NAME}\n`);
        
        // 初始化Resend客户端
        const resend = new Resend(CONFIG.RESEND_API_KEY);
        
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
            console.log('❌ 用户取消了操作');
            rl.close();
            process.exit(0);
        }
        
        // 创建或获取audience
        const audience = await createOrGetAudience(resend);
        
        // 添加联系人到audience
        const addResult = await addContactsToAudience(resend, audience, validUsers);
        
        if (addResult.success === 0) {
            console.log('❌ 没有成功添加任何联系人，无法发送邮件');
            rl.close();
            process.exit(1);
        }
        
        // 询问是否要立即发送broadcast
        const sendNow = await askConfirmation('\n🚀 是否要立即发送broadcast邮件？(y/n): ');
        
        if (sendNow) {
            const broadcast = await sendBroadcastEmail(resend, audience);
            
            console.log('\n🎉 邮件发送完成！');
            console.log(`📧 Broadcast ID: ${broadcast.id}`);
            console.log(`👥 Audience ID: ${audience.id}`);
        } else {
            console.log('\n⏰ 已创建audience和联系人，你可以稍后在Resend控制面板中发送broadcast');
            console.log(`👥 Audience ID: ${audience.id}`);
        }
        
        // 保存结果到文件
        const resultFile = path.join(__dirname, `audience-result-${new Date().toISOString().slice(0, 10)}.json`);
        fs.writeFileSync(resultFile, JSON.stringify({
            timestamp: new Date().toISOString(),
            audienceId: audience.id,
            audienceName: audience.name,
            totalUsers: validUsers.length,
            addedContacts: addResult.success,
            failedContacts: addResult.failed,
            broadcastSent: sendNow,
            results: addResult.results
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
        console.log('\n✅ 任务完成！');
        process.exit(0);
    }).catch(error => {
        console.error('\n❌ 任务失败:', error);
        process.exit(1);
    });
}

module.exports = {
    main,
    createOrGetAudience,
    addContactsToAudience,
    sendBroadcastEmail,
    CONFIG
}; 