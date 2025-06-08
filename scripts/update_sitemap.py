#!/usr/bin/env python3
"""
GitHub Actions sitemap 更新脚本
"""
import os
import requests
from datetime import datetime
from supabase import create_client, Client

# 环境变量配置
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
SITE_URL = os.getenv('NEXT_PUBLIC_WEB_URL', 'https://twitterdown.com')

# 初始化 Supabase 客户端
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_all_posts():
    """获取所有已发布的文章"""
    try:
        result = supabase.table("posts").select("slug, locale, created_at").eq("status", "online").execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"获取文章数据失败: {e}")
        return []

def read_existing_sitemap():
    """读取现有的sitemap文件"""
    sitemap_path = "public/sitemap.xml"
    existing_urls = set()
    
    try:
        with open(sitemap_path, 'r', encoding='utf-8') as f:
            content = f.read()
            import re
            url_matches = re.findall(r'<loc>(.*?)</loc>', content)
            existing_urls = set(url_matches)
            print(f"发现现有sitemap中有 {len(existing_urls)} 个URL")
    except FileNotFoundError:
        print("未找到现有sitemap文件，将创建新文件")
        content = ""
    except Exception as e:
        print(f"读取sitemap失败: {e}")
        content = ""
        
    return existing_urls, content

def generate_sitemap(posts):
    """生成完整的sitemap.xml内容"""
    existing_urls, _ = read_existing_sitemap()
    
    # 基础URL列表（主要页面）
    base_urls = [
        f"{SITE_URL}/",
        f"{SITE_URL}/zh/",
        f"{SITE_URL}/pricing",
        f"{SITE_URL}/zh/pricing",
        f"{SITE_URL}/privacy-policy",
        f"{SITE_URL}/terms-of-service",
    ]
    
    # 生成sitemap头部
    sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'

    # 添加基础页面
    for url in base_urls:
        sitemap_content += f'''
  <url>
    <loc>{url}</loc>
    <lastmod>{datetime.now().date().isoformat()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>'''

    # 添加文章页面
    new_urls_added = 0
    for post in posts:
        slug = post.get('slug')
        locale = post.get('locale')
        created_at = post.get('created_at')
        
        if not slug:
            continue
            
        # 构建文章URL
        if locale == "en":
            url = f"{SITE_URL}/posts/{slug}"
        else:
            url = f"{SITE_URL}/{locale}/posts/{slug}"
        
        # 检查是否是新URL
        if url not in existing_urls:
            new_urls_added += 1
        
        # 使用文章的创建时间或当前时间
        lastmod = created_at or datetime.now().isoformat()
        if 'T' in lastmod:
            lastmod = lastmod.split('T')[0]  # 只取日期部分
        
        sitemap_content += f'''
  <url>
    <loc>{url}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>'''

    # 结束sitemap
    sitemap_content += '\n</urlset>'

    return sitemap_content, new_urls_added

def write_sitemap(content):
    """写入sitemap文件"""
    try:
        os.makedirs("public", exist_ok=True)
        with open("public/sitemap.xml", 'w', encoding='utf-8') as f:
            f.write(content)
        print("✅ Sitemap文件写入成功")
        return True
    except Exception as e:
        print(f"❌ Sitemap文件写入失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 开始更新Sitemap...")
    
    # 获取所有文章
    posts = get_all_posts()
    print(f"获取到 {len(posts)} 篇文章")
    
    if not posts:
        print("❌ 没有获取到文章数据，跳过sitemap更新")
        return False
    
    # 生成sitemap内容
    sitemap_content, new_urls_added = generate_sitemap(posts)
    
    # 写入sitemap文件
    if write_sitemap(sitemap_content):
        print(f"✅ Sitemap更新成功！添加了 {new_urls_added} 个新URL")
        print(f"Sitemap包含总计 {len(posts) + 6} 个URL（包括基础页面）")
        return True
    else:
        print("❌ Sitemap更新失败")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 