#!/usr/bin/env python3

import os
import json
import sys
import re
import time
from pathlib import Path
from datetime import datetime
import asyncio

# 需要安装的依赖包
try:
    import resend
    from supabase import create_client, Client
except ImportError:
    print("❌ 缺少必要的Python包，请安装:")
    print("pip install resend supabase")
    sys.exit(1)

# 数据库访问函数
def get_supabase_client():
    """获取Supabase客户端连接"""
    supabase_url = os.environ.get('SUPABASE_URL', "https://irpiwdocgnevzlxtqpws.supabase.co")
    
    supabase_key = os.environ.get('SUPABASE_ANON_KEY', 
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlycGl3ZG9jZ25ldnpseHRxcHdzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0Nzk2NjM3MSwiZXhwIjoyMDYzNTQyMzcxfQ.4O2gjwLBLACL0aJfeVWcdxGGdvghomPVtC47qPHlD6w")
    
    if os.environ.get('SUPABASE_SERVICE_ROLE_KEY'):
        supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise Exception("Supabase URL or key is not set")
    
    return create_client(supabase_url, supabase_key)

async def get_users(page=1, limit=1000):
    """从数据库获取用户"""
    if page < 1:
        page = 1
    if limit <= 0:
        limit = 1000

    offset = (page - 1) * limit
    supabase = get_supabase_client()

    try:
        response = supabase.table("users").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return response.data
    except Exception as error:
        print(f'Error fetching users: {error}')
        return None

# 配置信息
CONFIG = {
    'RESEND_API_KEY': os.environ.get('RESEND_API_KEY', 're_fkKRnn7d_8KfD4fDy21ncvEsp9zdbQ8wH'),
    'WEBSITE_URL': os.environ.get('NEXT_PUBLIC_WEB_URL', 'https://twitterdown.com'),
    'FROM_EMAIL': 'TwitterDown <noreply@updates.twitterdown.com>',
    'SUBJECT': '🎉 TwitterDown Pro 一年功能免费！每月150次下载',
    'AUDIENCE_ID': '3f4ff163-1d9b-4416-aa42-39810cf87226'  # 现有的audience ID
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

def ask_confirmation(question):
    """询问用户确认"""
    try:
        answer = input(question).strip().lower()
        return answer in ['y', 'yes', '是', '是的']
    except KeyboardInterrupt:
        print('\n操作已取消')
        sys.exit(0)

async def confirm_user_list(users):
    """显示用户列表并请求确认"""
    print('\n📋 即将添加到audience的用户列表：')
    print('=' * 80)
    print('序号 | 邮箱地址 | 用户名 | 注册时间')
    print('-' * 80)
    
    for index, user in enumerate(users[:10]):
        created_at = '未知'
        if user.get('created_at'):
            try:
                created_at = datetime.fromisoformat(user['created_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d')
            except:
                created_at = '未知'
        
        email = user.get('email', '').ljust(30)[:30]
        nickname = (user.get('nickname') or '未知').ljust(15)[:15]
        print(f"{str(index + 1).rjust(3)} | {email} | {nickname} | {created_at}")
    
    if len(users) > 10:
        print(f"... 还有 {len(users) - 10} 位用户")
    
    print('=' * 80)
    print(f"📊 总计: {len(users)} 位用户\n")
    print(f"🎯 目标Audience ID: {CONFIG['AUDIENCE_ID']}\n")
    
    return ask_confirmation('✋ 确认添加这些用户到现有audience吗？(y/n): ')

async def get_audience_info():
    """获取现有audience信息"""
    try:
        print('🔍 获取audience信息...')
        
        # 设置 API key
        resend.api_key = CONFIG["RESEND_API_KEY"]
        
        # 使用 SDK 获取 audience
        audience = resend.Audiences.get(CONFIG["AUDIENCE_ID"])
        
        print(f'✅ 找到audience: {audience["name"]} (ID: {audience["id"]})')
        return audience
        
    except Exception as error:
        print(f'❌ 获取audience失败: {error}')
        raise error

async def get_existing_contacts():
    """获取audience中现有的contacts"""
    try:
        print('🔍 检查audience中现有的contacts...')
        
        # 设置 API key
        resend.api_key = CONFIG["RESEND_API_KEY"]
        
        # 获取现有contacts
        contacts = resend.Contacts.list(audience_id=CONFIG["AUDIENCE_ID"])
        
        if 'data' in contacts:
            existing_emails = {contact['email'].lower() for contact in contacts['data']}
            print(f'📋 找到 {len(existing_emails)} 个现有contacts')
            return existing_emails
        else:
            print('📋 audience中暂无contacts')
            return set()
            
    except Exception as error:
        print(f'❌ 获取现有contacts失败: {error}')
        print('⚠️  将跳过重复检查，继续添加所有用户')
        return set()

async def add_contacts_to_audience(audience, users, delay_seconds=0.6):
    """批量添加联系人到audience"""
    print('\n📝 开始添加用户到audience...')
    
    # 获取现有contacts
    existing_emails = await get_existing_contacts()
    
    # 过滤掉已存在的用户
    new_users = []
    skipped_users = []
    
    for user in users:
        if user['email'].lower() in existing_emails:
            skipped_users.append(user)
        else:
            new_users.append(user)
    
    print(f'📈 需要添加的新用户: {len(new_users)}')
    print(f'⏭️  跳过的现有用户: {len(skipped_users)}')
    
    if len(new_users) == 0:
        print('✅ 所有用户都已存在于audience中，无需添加')
        return {'total': len(users), 'success': len(skipped_users), 'failed': 0, 'results': []}
    
    print(f'⏱️  预计耗时: {len(new_users) * delay_seconds / 60:.1f} 分钟 (API限制: 每秒2个请求)')
    print(f'⚙️  请求间隔: {delay_seconds} 秒')
    
    # 询问用户是否继续
    if not ask_confirmation(f'\n是否继续添加 {len(new_users)} 个新用户到audience? (y/n): '):
        print('操作已取消')
        return None
    
    success_count = len(skipped_users)  # 已存在的用户也算成功
    error_count = 0
    results = []
    
    # 为跳过的用户添加记录
    for user in skipped_users:
        results.append({
            'email': user['email'],
            'success': True,
            'note': 'already_exists'
        })
    
    # 设置 API key
    resend.api_key = CONFIG["RESEND_API_KEY"]
    
    for i, user in enumerate(new_users):
        try:
            print(f'📧 添加用户 ({i + 1}/{len(new_users)}): {user["email"]}')
            
            # 准备联系人数据，参考官方文档格式
            contact_params = {
                "email": user['email'],
                "unsubscribed": False,
                "audience_id": CONFIG['AUDIENCE_ID'],
            }
            
            # 只在有nickname时才添加first_name和last_name
            if user.get('nickname') and user['nickname'].strip():
                name_parts = user['nickname'].strip().split(' ')
                contact_params['first_name'] = name_parts[0]
                if len(name_parts) > 1:
                    contact_params['last_name'] = ' '.join(name_parts[1:])
            
            try:
                # 使用 SDK 创建联系人
                contact = resend.Contacts.create(contact_params)
                
                print(f'  ✅ 成功添加: {user["email"]} (Contact ID: {contact["id"]})')
                success_count += 1
                
                results.append({
                    'email': user['email'],
                    'success': True,
                    'contactId': contact['id']
                })
            except Exception as api_error:
                error_str = str(api_error).lower()
                
                # 检查是否是重复邮箱错误
                if 'already exists' in error_str or 'duplicate' in error_str:
                    print(f'  ⚠️  用户已存在: {user["email"]}')
                    results.append({
                        'email': user['email'],
                        'success': True,
                        'note': 'already_exists'
                    })
                    success_count += 1  # 已存在也算成功
                elif 'rate limit' in error_str or 'too many requests' in error_str:
                    print(f'  ⏱️  速率限制，等待2秒后重试...')
                    time.sleep(2)
                    try:
                        # 重试一次
                        contact = resend.Contacts.create(contact_params)
                        print(f'  ✅ 重试成功: {user["email"]} (Contact ID: {contact["id"]})')
                        success_count += 1
                        results.append({
                            'email': user['email'],
                            'success': True,
                            'contactId': contact['id']
                        })
                    except Exception as retry_error:
                        print(f'  ❌ 重试失败: {user["email"]} - {retry_error}')
                        error_count += 1
                        results.append({
                            'email': user['email'],
                            'success': False,
                            'error': str(retry_error)
                        })
                else:
                    print(f'  ❌ 添加失败: {user["email"]} - {api_error}')
                    error_count += 1
                    
                    results.append({
                        'email': user['email'],
                        'success': False,
                        'error': str(api_error)
                    })
            
        except Exception as error:
            print(f'  ❌ 添加失败: {user["email"]} - {str(error)}')
            error_count += 1
            
            results.append({
                'email': user['email'],
                'success': False,
                'error': str(error)
            })
        
        # 添加延迟避免API限制 (Resend限制: 每秒最多2个请求)
        if i < len(new_users) - 1:
            time.sleep(delay_seconds)  # 根据参数设置的延迟
    
    total_users = len(users)  # 原始用户总数
    
    print('\n📊 添加联系人结果统计:')
    print('=' * 50)
    print(f'📋 原始用户总数: {total_users} 位')
    print(f'⏭️  跳过现有用户: {len(skipped_users)} 位')
    print(f'📈 新添加用户: {success_count - len(skipped_users)} 位')
    print(f'❌ 添加失败: {error_count} 位用户')
    print(f'✅ 总体成功率: {(success_count / total_users * 100):.1f}%')
    
    return {
        'total': total_users,
        'success': success_count,
        'failed': error_count,
        'skipped': len(skipped_users),
        'new_added': success_count - len(skipped_users),
        'results': results
    }

async def send_broadcast_email(audience):
    """发送broadcast邮件"""
    try:
        print('\n📧 准备发送broadcast邮件...')
        
        # 设置 API key
        resend.api_key = CONFIG["RESEND_API_KEY"]
        
        # 读取邮件模板
        template = load_email_template()
        
        # 只替换非Resend个性化的变量（WEBSITE_URL需要在这里设置）
        variables = {
            'WEBSITE_URL': CONFIG['WEBSITE_URL']
        }
        
        html_content = replace_variables(template, variables)
        
        print('📤 创建broadcast...')
        
        # 创建 broadcast
        broadcast_params = {
            "name": "Pro Announcement",
            "audience_id": CONFIG['AUDIENCE_ID'],
            "from": CONFIG['FROM_EMAIL'],
            "subject": CONFIG['SUBJECT'],
            "reply_to": "support@twitterdown.com",
            "html": html_content,
        }
        
        broadcast = resend.Broadcasts.create(broadcast_params)
        print(f'✅ Broadcast创建成功! ID: {broadcast["id"]}')
        
        # 询问用户是否要立即发送
        print(f'\n📧 准备发送broadcast到audience: {audience["name"]}')
        print(f'📝 邮件主题: {CONFIG["SUBJECT"]}')
        
        if ask_confirmation('🚀 确认立即发送这个broadcast吗？(y/n): '):
            print('📤 发送broadcast...')
            send_params = {
                "broadcast_id": broadcast["id"]
            }
            send_result = resend.Broadcasts.send(send_params)
            print(f'✅ Broadcast发送成功! 发送ID: {send_result["id"]}')
            broadcast['sent'] = True
            broadcast['send_id'] = send_result["id"]
        else:
            print('⏰ Broadcast已创建但未发送。你可以稍后在Resend控制面板中发送。')
            broadcast['sent'] = False
        
        return broadcast
        
    except Exception as error:
        print(f'❌ 发送broadcast失败: {error}')
        raise error

async def main():
    """主函数"""
    try:
        print('🚀 TwitterDown Pro公告邮件发送工具 (Audience版本)')
        print('=' * 60)
        
        # 检查配置
        if not CONFIG['RESEND_API_KEY'] or CONFIG['RESEND_API_KEY'] == 'your-resend-api-key-here':
            print('❌ 请设置正确的RESEND_API_KEY环境变量')
            sys.exit(1)
        
        print('✅ 配置检查通过')
        print(f'📧 发送邮箱: {CONFIG["FROM_EMAIL"]}')
        print(f'🌐 网站URL: {CONFIG["WEBSITE_URL"]}')
        print(f'📝 邮件主题: {CONFIG["SUBJECT"]}')
        print(f'👥 Audience ID: {CONFIG["AUDIENCE_ID"]}\n')
        
        # 测试API连接
        try:
            print('🔗 测试Resend API连接...')
            # 初始化 Resend API key
            resend.api_key = CONFIG["RESEND_API_KEY"]
            await get_audience_info()
            print('✅ API连接正常')
        except Exception as error:
            print(f'❌ API连接失败: {error}')
            sys.exit(1)
        
        # 从数据库获取用户
        print('🔍 正在从数据库查询用户...')
        users = await get_users(1, 1000)  # 获取前1000个用户
        
        if not users or len(users) == 0:
            print('❌ 没有找到用户数据')
            sys.exit(1)
        
        # 过滤有效用户（有邮箱地址的）- 更严格的邮箱验证
        email_regex = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
        valid_users = [
            user for user in users 
            if user.get('email') and user['email'].strip() and email_regex.match(user['email'].strip())
        ]
        
        if len(valid_users) == 0:
            print('❌ 没有找到有效的用户邮箱')
            sys.exit(1)
        
        print(f'✅ 找到 {len(valid_users)} 位有效用户\n')
        
        # 显示用户列表并请求确认
        confirmed = await confirm_user_list(valid_users)
        
        if not confirmed:
            print('❌ 用户取消了操作')
            sys.exit(0)
        
        # 获取audience信息
        audience = await get_audience_info()
        
        # 询问是否使用保守的速率限制设置
        use_slow_mode = ask_confirmation('🐌 是否使用保守模式（1秒间隔，更安全但更慢）？(y/n): ')
        delay_seconds = 1.0 if use_slow_mode else 0.6
        
        # 添加联系人到audience
        add_result = await add_contacts_to_audience(audience, valid_users, delay_seconds)
        
        if add_result['success'] == 0:
            print('❌ 没有成功添加任何联系人，无法发送邮件')
            sys.exit(1)
        
        # 创建并处理broadcast
        broadcast = await send_broadcast_email(audience)
        
        if broadcast.get('sent'):
            print('\n🎉 邮件发送完成！')
            print(f'📧 Broadcast ID: {broadcast["id"]}')
            print(f'📤 发送ID: {broadcast["send_id"]}')
            print(f'👥 Audience ID: {audience["id"]}')
        else:
            print('\n⏰ Broadcast已创建，但未发送')
            print(f'📧 Broadcast ID: {broadcast["id"]}')
            print(f'👥 Audience ID: {audience["id"]}')
            print('💡 你可以稍后在Resend控制面板中发送此broadcast')
        
        # 保存结果到文件
        result_file = Path(__file__).parent / f'audience-result-{datetime.now().strftime("%Y-%m-%d")}.json'
        result_data = {
            'timestamp': datetime.now().isoformat(),
            'audienceId': audience['id'],
            'audienceName': audience['name'],
            'totalUsers': len(valid_users),
            'addedContacts': add_result['success'],
            'failedContacts': add_result['failed'],
            'skippedContacts': add_result.get('skipped', 0),
            'newContacts': add_result.get('new_added', 0),
            'broadcastId': broadcast['id'],
            'broadcastSent': broadcast.get('sent', False),
            'sendId': broadcast.get('send_id', None),
            'results': add_result['results']
        }
        
        result_file.write_text(json.dumps(result_data, indent=2, ensure_ascii=False), encoding='utf-8')
        
        print(f'📁 详细结果已保存到: {result_file}')
        
    except Exception as error:
        print(f'❌ 程序执行出错: {error}')
        sys.exit(1)

if __name__ == '__main__':
    asyncio.run(main()) 