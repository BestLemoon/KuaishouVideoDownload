#!/usr/bin/env python3

import os
import json
import sys
from pathlib import Path

# 可选的 Resend SDK 支持
try:
    import resend
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False

# 配置信息
CONFIG = {
    'RESEND_API_KEY': 'your-resend-api-key-here',  # 替换为你的实际API Key
    'WEBSITE_URL': 'https://twitterdown.com',  # 替换为你的实际网站URL
    'FROM_EMAIL': 'TwitterDown <noreply@twitterdown.com>',  # 替换为你的发送邮箱
    'SUBJECT': '🎉 FREE Pro Access for One Year - 150 Downloads/Month!'
}

# 示例用户列表 - 替换为你的实际用户数据
USERS = [
    {'email': 'user1@example.com', 'nickname': 'John'},
    {'email': 'user2@example.com', 'nickname': 'Jane'},
    {'email': 'user3@example.com', 'nickname': 'Bob'},
    # 添加更多用户...
]

def load_email_template():
    """读取邮件模板"""
    template_path = Path(__file__).parent / 'pro-announcement-email.html'
    if not template_path.exists():
        print(f'❌ Email template not found: {template_path}')
        sys.exit(1)
    return template_path.read_text(encoding='utf-8')

def replace_variables(template, variables):
    """替换模板变量"""
    result = template
    for key, value in variables.items():
        result = result.replace(f'{{{{{key}}}}}', value)
    return result

def escape_json_string(s):
    """转义JSON字符串"""
    return (s.replace('\\', '\\\\')
            .replace('"', '\\"')
            .replace('\n', '\\n')
            .replace('\r', '\\r')
            .replace('\t', '\\t'))

def generate_curl_command(user, html_content):
    """为单个用户生成curl命令"""
    payload = {
        'from': CONFIG['FROM_EMAIL'],
        'to': [user['email']],
        'subject': CONFIG['SUBJECT'],
        'html': html_content
    }

    json_payload = json.dumps(payload)
    escaped_payload = escape_json_string(json_payload)

    return f"""curl -X POST 'https://api.resend.com/emails' \\
  -H 'Authorization: Bearer {CONFIG['RESEND_API_KEY']}' \\
  -H 'Content-Type: application/json' \\
  -d "{escaped_payload}\""""

def generate_all_commands():
    """生成所有用户的curl命令"""
    print('🚀 Generating curl commands for Pro announcement emails...\n')
    
    template = load_email_template()
    commands = []
    
    for index, user in enumerate(USERS):
        variables = {
            'USER_NAME': user.get('nickname', 'Friend'),
            'WEBSITE_URL': CONFIG['WEBSITE_URL'],
            'UNSUBSCRIBE_URL': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
        }

        html_content = replace_variables(template, variables)
        curl_command = generate_curl_command(user, html_content)
        
        print(f"📧 Command {index + 1} for {user['email']}:")
        print(curl_command)
        print('\n' + '=' * 100 + '\n')
        
        commands.append({
            'email': user['email'],
            'command': curl_command
        })

    # 保存命令到文件
    output_file = Path(__file__).parent / 'curl-commands.txt'
    file_content = '\n'.join([
        f"# Command {index + 1} for {cmd['email']}\n{cmd['command']}\n"
        for index, cmd in enumerate(commands)
    ])
    
    output_file.write_text(file_content, encoding='utf-8')
    
    print(f"✅ Generated {len(commands)} curl commands")
    print(f"📁 Commands saved to: {output_file}")
    print('\n📝 Usage:')
    print('1. 替换 CONFIG 中的 RESEND_API_KEY 为你的实际API Key')
    print('2. 替换 USERS 数组为你的实际用户数据')
    print('3. 复制上面的curl命令到终端执行')
    print('4. 或者直接执行保存的文件中的命令')
    
    return commands

def generate_test_command():
    """创建一个简化的单个邮件测试命令"""
    test_user = {'email': 'test@example.com', 'nickname': 'Test User'}
    template = load_email_template()
    
    variables = {
        'USER_NAME': test_user['nickname'],
        'WEBSITE_URL': CONFIG['WEBSITE_URL'],
        'UNSUBSCRIBE_URL': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
    }

    html_content = replace_variables(template, variables)
    curl_command = generate_curl_command(test_user, html_content)
    
    print('🧪 Test email command:')
    print(curl_command)
    
    # 保存测试命令
    test_file = Path(__file__).parent / 'test-email-command.txt'
    test_file.write_text(f'# Test email command\n{curl_command}\n', encoding='utf-8')
    print(f'\n📁 Test command saved to: {test_file}')
    
    return curl_command

async def send_emails_with_sdk():
    """使用 Resend SDK 直接发送邮件"""
    if not SDK_AVAILABLE:
        print('❌ Resend SDK not available. Please install: pip install resend')
        return
    
    print('🚀 Sending emails with Resend SDK...\n')
    
    # 设置 API key
    resend.api_key = CONFIG['RESEND_API_KEY']
    
    template = load_email_template()
    results = []
    
    for index, user in enumerate(USERS):
        try:
            print(f"📧 Sending email {index + 1}/{len(USERS)} to {user['email']}...")
            
            variables = {
                'USER_NAME': user.get('nickname', 'Friend'),
                'WEBSITE_URL': CONFIG['WEBSITE_URL'],
                'UNSUBSCRIBE_URL': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
            }

            html_content = replace_variables(template, variables)
            
            email_params = {
                "from": CONFIG['FROM_EMAIL'],
                "to": [user['email']],
                "subject": CONFIG['SUBJECT'],
                "html": html_content
            }
            
            response = resend.Emails.send(email_params)
            
            print(f"  ✅ Success! Email ID: {response['id']}")
            results.append({
                'email': user['email'],
                'success': True,
                'id': response['id']
            })
            
        except Exception as e:
            print(f"  ❌ Failed: {str(e)}")
            results.append({
                'email': user['email'],
                'success': False,
                'error': str(e)
            })
    
    # 保存结果
    results_file = Path(__file__).parent / 'sdk-send-results.json'
    results_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding='utf-8')
    
    success_count = sum(1 for r in results if r['success'])
    print(f'\n📊 结果统计:')
    print(f'✅ 成功: {success_count}/{len(USERS)}')
    print(f'❌ 失败: {len(USERS) - success_count}/{len(USERS)}')
    print(f'📁 详细结果已保存到: {results_file}')

def show_help():
    """显示帮助信息"""
    sdk_note = "\n  python generate_curl_commands.py --sdk     使用SDK直接发送邮件" if SDK_AVAILABLE else ""
    
    print(f"""
📧 TwitterDown Pro Announcement Email Generator

使用方法:
  python generate_curl_commands.py          生成所有用户的curl命令
  python generate_curl_commands.py --test   生成测试邮件命令{sdk_note}
  python generate_curl_commands.py --help   显示此帮助信息

配置:
  1. 编辑脚本中的 CONFIG 字典，设置你的API Key和网站URL
  2. 编辑 USERS 列表，添加你的用户数据
  3. 确保 pro-announcement-email.html 文件存在

输出:
  - curl-commands.txt: 所有用户的curl命令
  - test-email-command.txt: 测试邮件命令
  - sdk-send-results.json: SDK发送结果 (如果使用 --sdk)

SDK支持: {'✅ 可用' if SDK_AVAILABLE else '❌ 不可用 (pip install resend)'}
""")

def main():
    """主函数"""
    args = sys.argv[1:]
    
    if '--test' in args:
        generate_test_command()
    elif '--sdk' in args:
        if SDK_AVAILABLE:
            import asyncio
            asyncio.run(send_emails_with_sdk())
        else:
            print('❌ SDK不可用，请安装: pip install resend')
    elif '--help' in args:
        show_help()
    else:
        generate_all_commands()

if __name__ == '__main__':
    main() 