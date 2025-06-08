#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO Blog Generator for TwitterDown
自动生成 SEO 优化的博客文章并部署到 Next.js 网站
"""

import sys
import os
import subprocess
from config import *
from database import DatabaseManager
from content_generator import ContentGenerator
from image_downloader import ImageDownloader
from sitemap_updater import SitemapUpdater

class SEOBlogGenerator:
    def __init__(self):
        print("🚀 SEO 博客生成器启动中...")
        
        # 检查必要的环境变量
        self.check_environment()
        
        # 初始化各个模块
        self.db = DatabaseManager()
        self.content_generator = ContentGenerator()
        self.image_downloader = ImageDownloader()
        self.sitemap_updater = SitemapUpdater()
        
        print("✅ 所有模块初始化完成")
        print(f"📄 已读取 sitemap，包含 {len(self.content_generator.sitemap_content['existing_posts'])} 个博客文章")
    
    def check_environment(self):
        """检查必要的环境变量"""
        required_vars = ["GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"❌ 缺少必要的环境变量: {', '.join(missing_vars)}")
            print("请在 .env 文件中设置这些变量")
            sys.exit(1)
    
    def generate_single_article(self, topic, language="English", locale="en"):
        """生成单篇文章"""
        try:
            print(f"\n📝 开始生成文章:")
            print(f"   主题: {topic}")
            print(f"   语言: {language} ({locale})")
            
            # 1. 生成内容
            article = self.content_generator.generate_article(topic, language)
            
            # 2. 生成唯一的 slug
            slug = article.get("slug") or self.db.generate_unique_slug(article["title"], locale)
            print(f"   Slug: {slug}")
            
            # 3. 获取封面图片URL
            cover_url = self.image_downloader.get_twitter_cover_image()
            print(f"   封面图片: {cover_url}")
            
            # 4. 插入数据库
            post_data = self.db.insert_post(
                title=article["title"],
                slug=slug,
                description=article["description"],
                content=article["content"],
                locale=locale,
                cover_url=cover_url,
                author_name=DEFAULT_AUTHOR_NAME,
                author_avatar_url=DEFAULT_AUTHOR_AVATAR_URL
            )
            
            # 5. 更新 sitemap
            self.sitemap_updater.add_blog_post_url(slug, locale)
            
            print(f"✅ 文章生成完成!")
            print(f"   文章 ID: {post_data['uuid']}")
            print(f"   URL: {SITE_URL}/{locale}/posts/{slug}" if locale != "en" else f"{SITE_URL}/posts/{slug}")
            
            return post_data
            
        except Exception as e:
            print(f"❌ 文章生成失败: {e}")
            return None
    
    def generate_bilingual_articles(self, topic):
        """生成双语文章（中英文）"""
        results = []
        
        # 生成英文文章
        print("\n🇺🇸 生成英文文章...")
        en_result = self.generate_single_article(topic, "English", "en")
        if en_result:
            results.append(en_result)
        
        # 生成中文文章
        print("\n🇨🇳 生成中文文章...")
        zh_result = self.generate_single_article(topic, "Chinese (Simplified)", "zh")
        if zh_result:
            results.append(zh_result)
        
        return results
    
    def batch_generate(self, topics, language="English", locale="en"):
        """批量生成文章"""
        results = []
        total = len(topics)
        
        print(f"\n📚 开始批量生成 {total} 篇文章...")
        
        for i, topic in enumerate(topics, 1):
            print(f"\n進度: {i}/{total}")
            result = self.generate_single_article(topic, language, locale)
            if result:
                results.append(result)
            
            # 短暂延迟避免 API 限制
            if i < total:
                print("⏳ 等待 2 秒...")
                import time
                time.sleep(2)
        
        print(f"\n✅ 批量生成完成! 成功生成 {len(results)} 篇文章")
        return results
    
    def deploy_to_vercel(self):
        """部署到 Vercel"""
        try:
            print("\n🚀 开始部署到 Vercel...")
            
            # 切换到项目根目录
            os.chdir("..")
            
            # 执行部署命令
            result = subprocess.run(
                ["vercel", "--prod"],
                capture_output=True,
                text=True,
                timeout=300  # 5分钟超时
            )
            
            if result.returncode == 0:
                print("✅ Vercel 部署成功!")
                print(f"输出: {result.stdout}")
                return True
            else:
                print(f"❌ Vercel 部署失败: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print("❌ Vercel 部署超时")
            return False
        except Exception as e:
            print(f"❌ Vercel 部署异常: {e}")
            return False
        finally:
            # 切换回脚本目录
            os.chdir("seo_blog_generator")
    
    def interactive_mode(self):
        """交互式模式"""
        print("\n🎯 欢迎使用 SEO 博客生成器!")
        print("=" * 50)
        
        while True:
            print("\n请选择操作:")
            print("1. 生成文章题目建议")
            print("2. 生成单篇文章（指定语言）")
            print("3. 生成双语文章（中英文）")
            print("4. 批量生成文章")
            print("5. 验证 sitemap")
            print("6. 部署到 Vercel")
            print("7. 查看文章列表")
            print("8. 从数据库更新 Sitemap")
            print("0. 退出")
            
            choice = input("\n请输入选项 (0-8): ").strip()
            
            if choice == "0":
                print("👋 再见!")
                break
            elif choice == "1":
                self.handle_topic_suggestions()
            elif choice == "2":
                self.handle_single_article()
            elif choice == "3":
                self.handle_bilingual_articles()
            elif choice == "4":
                self.handle_batch_generation()
            elif choice == "5":
                self.sitemap_updater.validate_sitemap()
            elif choice == "6":
                self.deploy_to_vercel()
            elif choice == "7":
                self.show_articles_list()
            elif choice == "8":
                self.sitemap_updater.update_sitemap_from_db()
            else:
                print("❌ 无效选项，请重新选择")
    
    def handle_topic_suggestions(self):
        """处理题目建议生成"""
        theme = input("请输入主题方向（留空使用默认）: ").strip()
        
        print("\n请选择语言:")
        print("1. English")
        print("2. 中文")
        
        lang_choice = input("请选择 (1-2): ").strip()
        
        if lang_choice == "1":
            language = "English"
        elif lang_choice == "2":
            language = "Chinese"
        else:
            print("❌ 无效选择，使用默认英文")
            language = "English"
        
        count_input = input("请输入生成题目数量 (默认5个): ").strip()
        try:
            count = int(count_input) if count_input else 5
            count = max(1, min(count, 20))  # 限制在1-20之间
        except ValueError:
            count = 5
        
        try:
            topics = self.content_generator.generate_topic_suggestions(theme, language, count)
            
            if not topics:
                print("❌ 没有生成有效的题目建议")
                return
            
            print(f"\n📝 生成的题目建议：")
            print("=" * 60)
            for i, topic in enumerate(topics, 1):
                print(f"{i:2d}. {topic}")
            
            print("\n" + "=" * 60)
            
            # 询问是否直接生成文章
            generate_choice = input("\n是否要选择其中一个题目直接生成文章？(y/N): ").strip().lower()
            if generate_choice == 'y':
                try:
                    choice_num = int(input(f"请选择题目编号 (1-{len(topics)}): "))
                    if 1 <= choice_num <= len(topics):
                        selected_topic = topics[choice_num - 1]
                        print(f"\n📝 已选择题目: {selected_topic}")
                        
                        locale = "en" if language == "English" else "zh"
                        self.generate_single_article(selected_topic, language, locale)
                    else:
                        print("❌ 无效的题目编号")
                except ValueError:
                    print("❌ 请输入有效的数字")
                    
        except Exception as e:
            print(f"❌ 题目生成失败: {e}")
    
    def handle_single_article(self):
        """处理单篇文章生成"""
        topic = input("请输入文章主题: ").strip()
        if not topic:
            print("❌ 主题不能为空")
            return
        
        print("\n请选择语言:")
        print("1. English (en)")
        print("2. 中文 (zh)")
        
        lang_choice = input("请选择 (1-2): ").strip()
        
        if lang_choice == "1":
            language, locale = "English", "en"
        elif lang_choice == "2":
            language, locale = "Chinese (Simplified)", "zh"
        else:
            print("❌ 无效选择，使用默认英文")
            language, locale = "English", "en"
        
        self.generate_single_article(topic, language, locale)
    
    def handle_bilingual_articles(self):
        """处理双语文章生成"""
        topic = input("请输入文章主题: ").strip()
        if not topic:
            print("❌ 主题不能为空")
            return
        
        self.generate_bilingual_articles(topic)
    
    def handle_batch_generation(self):
        """处理批量生成"""
        print("请输入多个文章主题，每行一个，输入空行结束:")
        topics = []
        while True:
            topic = input().strip()
            if not topic:
                break
            topics.append(topic)
        
        if not topics:
            print("❌ 没有输入任何主题")
            return
        
        print(f"\n共输入 {len(topics)} 个主题:")
        for i, topic in enumerate(topics, 1):
            print(f"  {i}. {topic}")
        
        confirm = input("\n确认批量生成? (y/N): ").strip().lower()
        if confirm != 'y':
            print("❌ 已取消")
            return
        
        print("\n请选择语言:")
        print("1. English (en)")
        print("2. 中文 (zh)")
        
        lang_choice = input("请选择 (1-2): ").strip()
        
        if lang_choice == "1":
            language, locale = "English", "en"
        elif lang_choice == "2":
            language, locale = "Chinese (Simplified)", "zh"
        else:
            print("❌ 无效选择，使用默认英文")
            language, locale = "English", "en"
        
        self.batch_generate(topics, language, locale)
    
    def show_articles_list(self):
        """显示文章列表"""
        try:
            articles = self.db.get_all_posts()
            if not articles:
                print("📄 暂无文章")
                return
            
            print(f"\n📚 共 {len(articles)} 篇文章:")
            print("-" * 80)
            
            for i, article in enumerate(articles[:20], 1):  # 只显示前20篇
                print(f"{i:2d}. [{article['locale']}] {article['title']}")
                print(f"    Slug: {article['slug']}")
                print(f"    创建时间: {article['created_at'][:10]}")
                print()
                
            if len(articles) > 20:
                print(f"... 还有 {len(articles) - 20} 篇文章")
                
        except Exception as e:
            print(f"❌ 获取文章列表失败: {e}")
    
    def cleanup(self):
        """清理资源"""
        try:
            self.db.close()
            print("✅ 资源清理完成")
        except Exception as e:
            print(f"⚠️ 资源清理异常: {e}")

def main():
    """主函数"""
    generator = None
    try:
        generator = SEOBlogGenerator()
        
        # 检查命令行参数
        if len(sys.argv) > 1:
            if sys.argv[1] == "topics":
                # 生成题目建议
                theme = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else ""
                print(f"🎯 命令行模式 - 生成题目建议，主题: {theme or '默认'}")
                topics = generator.content_generator.generate_topic_suggestions(theme, "English", 10)
                print(f"\n📝 生成的题目建议：")
                for i, topic in enumerate(topics, 1):
                    print(f"{i:2d}. {topic}")
            else:
                # 命令行模式生成文章
                topic = " ".join(sys.argv[1:])
                print(f"🎯 命令行模式，主题: {topic}")
                generator.generate_bilingual_articles(topic)
        else:
            # 交互式模式
            generator.interactive_mode()
            
    except KeyboardInterrupt:
        print("\n\n👋 用户中断，正在退出...")
    except Exception as e:
        print(f"\n❌ 程序异常: {e}")
    finally:
        if generator:
            generator.cleanup()

if __name__ == "__main__":
    main() 