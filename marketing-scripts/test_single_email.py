#!/usr/bin/env python3

import os
import sys
from pathlib import Path

# 需要安装的依赖包
try:
    import resend
except ImportError:
    print("❌ 缺少必要的Python包，请安装:")
    print("pip install resend")
    sys.exit(1)

# 配置信息
CONFIG = {
    'RESEND_API_KEY': os.environ.get('RESEND_API_KEY', 're_CN2XhdgQ_GPtQKPxEXzQXALbLmcrYxw5f'),
    'WEBSITE_URL': os.environ.get('NEXT_PUBLIC_WEB_URL', 'https://twitterdown.com'),
    'FROM_EMAIL': 'TwitterDown <noreply@updates.twitterdown.com>',
    'SUBJECT': '🎉 一年Pro功能免费！每月150次下载'
}

def load_email_template():
    """读取Gmail兼容的中文HTML模板"""
    template_path = Path(__file__).parent / 'pro-announcement-email-zh-gmail.html'
    if not template_path.exists():
        print(f'❌ 找不到Gmail兼容的中文邮件模板: {template_path}')
        print('💡 正在回退到标准模板...')
        template_path = Path(__file__).parent / 'pro-announcement-email-zh.html'
        if not template_path.exists():
            print(f'❌ 找不到任何邮件模板: {template_path}')
            sys.exit(1)
    return template_path.read_text(encoding='utf-8')

def replace_variables(template, variables):
    """替换模板变量"""
    result = template
    for key, value in variables.items():
        result = result.replace(f'{{{{{key}}}}}', value)
    return result

async def send_test_email(email, name):
    """发送测试邮件"""
    print(f'\n📧 准备发送测试邮件到: {email}')
    
    # 设置 API key
    resend.api_key = CONFIG["RESEND_API_KEY"]
    
    # 读取并处理模板
    template = load_email_template()
    variables = {
        'WEBSITE_URL': CONFIG['WEBSITE_URL']
    }
    
    html_content = replace_variables(template, variables)
    
    # 对于单邮件测试，我们需要手动替换Resend个性化变量
    # 因为这不是通过broadcast发送的
    test_variables = {
        '{{FIRST_NAME|朋友}}': name or '朋友',
        '{{EMAIL}}': email,
        '{{RESEND_UNSUBSCRIBE_URL}}': f"{CONFIG['WEBSITE_URL']}/unsubscribe"
    }
    
    for placeholder, value in test_variables.items():
        html_content = html_content.replace(placeholder, value)
    
    print('🚀 正在发送...')

    try:
        # 使用 Resend SDK 发送邮件
        email_params = {
            "from": CONFIG['FROM_EMAIL'],
            "to": [email],
            "subject": CONFIG['SUBJECT'],
            "html": html_content
        }
        
        response = resend.Emails.send(email_params)
        
        print('✅ 发送成功!')
        print(f'📧 邮件ID: {response["id"]}')
        print(f'📬 发送到: {email}')
        return {'success': True, 'id': response['id']}
    
    except Exception as e:
        print(f'❌ 发送邮件时出错: {str(e)}')
        return {'success': False, 'error': str(e)}

def ask_question(question):
    """询问用户输入"""
    try:
        return input(question).strip()
    except KeyboardInterrupt:
        print('\n操作已取消')
        sys.exit(0)

def main():
    """主函数"""
    try:
        print('🧪 TwitterDown Pro公告邮件测试工具')
        print('=' * 50)
        
        # 检查配置
        if not CONFIG['RESEND_API_KEY'] or CONFIG['RESEND_API_KEY'] == 'your-resend-api-key-here':
            print('❌ 请设置正确的RESEND_API_KEY环境变量')
            sys.exit(1)
        
        print('✅ 配置检查通过')
        print(f'📧 发送邮箱: {CONFIG["FROM_EMAIL"]}')
        print(f'🌐 网站URL: {CONFIG["WEBSITE_URL"]}')
        print(f'📝 邮件主题: {CONFIG["SUBJECT"]}\n')
        
        # 获取用户输入
        email = ask_question('请输入测试邮箱地址: ')
        
        if not email or '@' not in email:
            print('❌ 请输入有效的邮箱地址')
            sys.exit(1)
        
        name = ask_question('请输入测试用户名 (可选): ')
        
        # 发送测试邮件
        import asyncio
        result = asyncio.run(send_test_email(email, name))
        
        if result['success']:
            print('\n🎉 测试邮件发送成功！')
            print('💡 请检查您的邮箱（包括垃圾邮件文件夹）')
        else:
            print('\n❌ 测试邮件发送失败')
            print('错误信息:', result['error'])
        
    except Exception as error:
        print(f'❌ 程序执行出错: {error}')
        sys.exit(1)

if __name__ == '__main__':
    main() 