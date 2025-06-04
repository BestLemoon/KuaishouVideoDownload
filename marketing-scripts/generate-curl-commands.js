#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 配置信息
const CONFIG = {
    RESEND_API_KEY: 'your-resend-api-key-here', // 替换为你的实际API Key
    WEBSITE_URL: 'https://twitterdown.com', // 替换为你的实际网站URL
    FROM_EMAIL: 'TwitterDown <noreply@twitterdown.com>', // 替换为你的发送邮箱
    SUBJECT: '🎉 FREE Pro Access for One Year - 150 Downloads/Month!'
};

// 示例用户列表 - 替换为你的实际用户数据
const USERS = [
    { email: 'user1@example.com', nickname: 'John' },
    { email: 'user2@example.com', nickname: 'Jane' },
    { email: 'user3@example.com', nickname: 'Bob' },
    // 添加更多用户...
];

function loadEmailTemplate() {
    const templatePath = path.join(__dirname, 'pro-announcement-email.html');
    if (!fs.existsSync(templatePath)) {
        console.error('❌ Email template not found:', templatePath);
        process.exit(1);
    }
    return fs.readFileSync(templatePath, 'utf8');
}

function replaceVariables(template, variables) {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
}

function escapeJsonString(str) {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

function generateCurlCommand(user, htmlContent) {
    const payload = {
        from: CONFIG.FROM_EMAIL,
        to: [user.email],
        subject: CONFIG.SUBJECT,
        html: htmlContent
    };

    const jsonPayload = JSON.stringify(payload);
    const escapedPayload = escapeJsonString(jsonPayload);

    return `curl -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer ${CONFIG.RESEND_API_KEY}' \\
  -H 'Content-Type: application/json' \\
  -d "${escapedPayload}"`;
}

function generateAllCommands() {
    console.log('🚀 Generating curl commands for Pro announcement emails...\n');
    
    const template = loadEmailTemplate();
    const commands = [];
    
    USERS.forEach((user, index) => {
        const variables = {
            USER_NAME: user.nickname || 'Friend',
            WEBSITE_URL: CONFIG.WEBSITE_URL,
            UNSUBSCRIBE_URL: `${CONFIG.WEBSITE_URL}/unsubscribe`
        };

        const htmlContent = replaceVariables(template, variables);
        const curlCommand = generateCurlCommand(user, htmlContent);
        
        console.log(`📧 Command ${index + 1} for ${user.email}:`);
        console.log(curlCommand);
        console.log('\n' + '='.repeat(100) + '\n');
        
        commands.push({
            email: user.email,
            command: curlCommand
        });
    });

    // 保存命令到文件
    const outputFile = path.join(__dirname, 'curl-commands.txt');
    const fileContent = commands.map((cmd, index) => 
        `# Command ${index + 1} for ${cmd.email}\n${cmd.command}\n\n`
    ).join('');
    
    fs.writeFileSync(outputFile, fileContent);
    
    console.log(`✅ Generated ${commands.length} curl commands`);
    console.log(`📁 Commands saved to: ${outputFile}`);
    console.log('\n📝 Usage:');
    console.log('1. 替换 CONFIG 中的 RESEND_API_KEY 为你的实际API Key');
    console.log('2. 替换 USERS 数组为你的实际用户数据');
    console.log('3. 复制上面的curl命令到终端执行');
    console.log('4. 或者直接执行保存的文件中的命令');
    
    return commands;
}

// 创建一个简化的单个邮件测试命令
function generateTestCommand() {
    const testUser = { email: 'test@example.com', nickname: 'Test User' };
    const template = loadEmailTemplate();
    
    const variables = {
        USER_NAME: testUser.nickname,
        WEBSITE_URL: CONFIG.WEBSITE_URL,
        UNSUBSCRIBE_URL: `${CONFIG.WEBSITE_URL}/unsubscribe`
    };

    const htmlContent = replaceVariables(template, variables);
    const curlCommand = generateCurlCommand(testUser, htmlContent);
    
    console.log('🧪 Test email command:');
    console.log(curlCommand);
    
    // 保存测试命令
    const testFile = path.join(__dirname, 'test-email-command.txt');
    fs.writeFileSync(testFile, `# Test email command\n${curlCommand}\n`);
    console.log(`\n📁 Test command saved to: ${testFile}`);
    
    return curlCommand;
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--test')) {
    generateTestCommand();
} else if (args.includes('--help')) {
    console.log(`
📧 TwitterDown Pro Announcement Email Generator

使用方法:
  node generate-curl-commands.js          生成所有用户的curl命令
  node generate-curl-commands.js --test   生成测试邮件命令
  node generate-curl-commands.js --help   显示此帮助信息

配置:
  1. 编辑脚本中的 CONFIG 对象，设置你的API Key和网站URL
  2. 编辑 USERS 数组，添加你的用户数据
  3. 确保 pro-announcement-email.html 文件存在

输出:
  - curl-commands.txt: 所有用户的curl命令
  - test-email-command.txt: 测试邮件命令
`);
} else {
    generateAllCommands();
}

module.exports = {
    generateCurlCommand,
    generateAllCommands,
    generateTestCommand,
    CONFIG,
    USERS
}; 