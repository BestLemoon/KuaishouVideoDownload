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
from keyword_generator import KeywordGenerator

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
        self.keyword_generator = KeywordGenerator()
        
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
    
    def generate_single_article(self, topic, language="English", locale="en", keywords_context=""):
        """生成单篇文章"""
        try:
            print(f"\n📝 开始生成文章:")
            print(f"   主题: {topic}")
            print(f"   语言: {language} ({locale})")
            if keywords_context:
                print(f"   关键词上下文: 已提供")
            
            # 1. 生成内容
            article = self.content_generator.generate_article(topic, language, keywords_context)
            
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
    
    def keyword_driven_generation(self, target_language="English"):
        """关键词驱动的文章生成流程"""
        try:
            print(f"\n🎯 开始关键词驱动的内容生成流程...")
            print(f"目标语言: {target_language}")
            
            # 步骤1: 生成种子关键词
            print(f"\n📊 步骤1: 与AI对话生成种子关键词")
            seed_keywords = self.keyword_generator.generate_seed_keywords(target_language, 8)
            
            print(f"\n🔑 生成的种子关键词:")
            for i, keyword in enumerate(seed_keywords, 1):
                print(f"   {i}. {keyword}")
            
            # 步骤2: 使用Google自动完成扩展关键词
            print(f"\n🔍 步骤2: 使用Google自动完成扩展关键词")
            expanded_keywords = self.keyword_generator.expand_keywords_with_google(seed_keywords, 8)
            
            print(f"\n📈 扩展后的关键词集合:")
            total_keywords = 0
            for seed, suggestions in expanded_keywords.items():
                print(f"   🌱 {seed}:")
                for suggestion in suggestions[:3]:  # 只显示前3个
                    print(f"      └─ {suggestion}")
                total_keywords += len(suggestions)
            print(f"   总计: {len(seed_keywords)}个种子关键词 → {total_keywords}个扩展关键词")
            
            # 步骤3: 基于关键词生成分类文章题目
            print(f"\n📝 步骤3: 基于扩展关键词生成分类文章题目")
            categorized_topics = self.keyword_generator.generate_article_topics_by_category(
                expanded_keywords, target_language
            )
            
            print(f"\n📚 生成的分类文章题目:")
            for category, topics in categorized_topics.items():
                print(f"   📂 {category}:")
                for topic in topics:
                    print(f"      • {topic}")
            
            # 步骤4: 询问用户是否进行文章生成
            total_articles = sum(len(topics) for topics in categorized_topics.values())
            print(f"\n🎯 准备生成 {total_articles} 篇文章，按以下分类:")
            print(f"   🔍 搜索型: {len(categorized_topics['search_keywords'])} 篇")
            print(f"   📘 教程型: {len(categorized_topics['tutorial_lists'])} 篇") 
            print(f"   🌍 双语内容: {len(categorized_topics['bilingual_content'])} 篇")
            print(f"   🧪 A/B测试: {len(categorized_topics['ab_test_keywords'])} 篇")
            
            generate_choice = input(f"\n是否开始生成这{total_articles}篇文章? (y/N): ").strip().lower()
            if generate_choice != 'y':
                print("❌ 用户取消生成")
                return
            
            # 步骤5: 执行文章生成
            print(f"\n🚀 步骤5: 开始生成文章...")
            locale = "zh" if "chinese" in target_language.lower() or "中文" in target_language else "en"
            results = []
            
            # 构建关键词上下文
            keywords_context = self._build_keywords_context(expanded_keywords)
            
            # 生成搜索型文章
            print(f"\n🔍 生成搜索型关键词文章...")
            for topic in categorized_topics['search_keywords']:
                result = self.generate_single_article(topic, target_language, locale, keywords_context)
                if result:
                    results.append(('search_keywords', result))
                import time
                time.sleep(2)
            
            # 生成教程型文章
            print(f"\n📘 生成教程型/列表型文章...")
            for topic in categorized_topics['tutorial_lists']:
                result = self.generate_single_article(topic, target_language, locale, keywords_context)
                if result:
                    results.append(('tutorial_lists', result))
                import time
                time.sleep(2)
            
            # 生成双语文章
            print(f"\n🌍 生成双语对照文章...")
            for topic in categorized_topics['bilingual_content']:
                if '|' in topic:
                    # 分离中英文题目
                    zh_topic, en_topic = [t.strip() for t in topic.split('|')]
                    
                    # 生成中文版本
                    zh_result = self.generate_single_article(zh_topic, "Chinese (Simplified)", "zh", keywords_context)
                    if zh_result:
                        results.append(('bilingual_content_zh', zh_result))
                    
                    # 生成英文版本
                    en_result = self.generate_single_article(en_topic, "English", "en", keywords_context)
                    if en_result:
                        results.append(('bilingual_content_en', en_result))
                else:
                    # 如果没有分隔符，按当前语言生成
                    result = self.generate_single_article(topic, target_language, locale, keywords_context)
                    if result:
                        results.append(('bilingual_content', result))
                import time
                time.sleep(2)
            
            # 生成A/B测试型文章
            print(f"\n🧪 生成A/B测试型文章...")
            for topic in categorized_topics['ab_test_keywords']:
                result = self.generate_single_article(topic, target_language, locale, keywords_context)
                if result:
                    results.append(('ab_test_keywords', result))
                import time
                time.sleep(2)
            
            # 总结
            success_count = len(results)
            print(f"\n🎉 关键词驱动生成完成!")
            print(f"   📊 种子关键词: {len(seed_keywords)} 个")
            print(f"   🔍 扩展关键词: {total_keywords} 个")
            print(f"   📝 成功生成文章: {success_count} 篇")
            
            # 按分类统计
            category_stats = {}
            for category, result in results:
                category_stats[category] = category_stats.get(category, 0) + 1
            
            for category, count in category_stats.items():
                print(f"      {category}: {count} 篇")
            
            return results
            
        except Exception as e:
            print(f"❌ 关键词驱动生成失败: {e}")
            return []
    
    def _build_keywords_context(self, expanded_keywords):
        """构建关键词上下文字符串"""
        context_lines = []
        context_lines.append("相关关键词集合:")
        
        for seed, suggestions in expanded_keywords.items():
            context_lines.append(f"• {seed}")
            for suggestion in suggestions[:5]:  # 每个种子词最多5个建议
                context_lines.append(f"  - {suggestion}")
        
        return '\n'.join(context_lines)
    
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
            print("5. 🔥 关键词驱动智能生成 (推荐)")
            print("6. 验证 sitemap")
            print("7. 部署到 Vercel")
            print("8. 查看文章列表")
            print("9. 从数据库更新 Sitemap")
            print("0. 退出")
            
            choice = input("\n请输入选项 (0-9): ").strip()
            
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
                self.handle_keyword_driven_generation()
            elif choice == "6":
                self.sitemap_updater.validate_sitemap()
            elif choice == "7":
                self.deploy_to_vercel()
            elif choice == "8":
                self.show_articles_list()
            elif choice == "9":
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
    
    def handle_keyword_driven_generation(self):
        """处理关键词驱动的生成"""
        print("\n🔥 关键词驱动智能生成模式")
        print("=" * 50)
        print("这个模式将:")
        print("1. 🧠 与AI对话生成种子关键词")
        print("2. 🔍 使用Google自动完成扩展关键词")
        print("3. 📝 基于关键词生成分类文章题目")
        print("4. ✍️ 自动生成各类优化文章")
        
        print("\n请选择目标语言:")
        print("1. English (英文)")
        print("2. Chinese (中文)")
        print("3. 双语模式 (中英文)")
        
        lang_choice = input("请选择 (1-3): ").strip()
        
        if lang_choice == "1":
            self.keyword_driven_generation("English")
        elif lang_choice == "2":
            self.keyword_driven_generation("Chinese (Simplified)")
        elif lang_choice == "3":
            print("\n🌍 双语模式：将先生成英文，再生成中文")
            print("\n🇺🇸 开始英文关键词驱动生成...")
            en_results = self.keyword_driven_generation("English")
            
            print(f"\n🇨🇳 开始中文关键词驱动生成...")
            zh_results = self.keyword_driven_generation("Chinese (Simplified)")
            
            total_results = len(en_results) + len(zh_results)
            print(f"\n🎉 双语模式完成! 共生成 {total_results} 篇文章")
            print(f"   🇺🇸 英文: {len(en_results)} 篇")
            print(f"   🇨🇳 中文: {len(zh_results)} 篇")
        else:
            print("❌ 无效选择，返回主菜单")
    
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
            elif sys.argv[1] == "keywords":
                # 关键词驱动生成模式
                language = sys.argv[2] if len(sys.argv) > 2 else "English"
                print(f"🔥 命令行模式 - 关键词驱动生成，语言: {language}")
                
                if language.lower() in ["bilingual", "both", "双语"]:
                    print("🌍 双语模式")
                    en_results = generator.keyword_driven_generation("English")
                    zh_results = generator.keyword_driven_generation("Chinese (Simplified)")
                    total = len(en_results) + len(zh_results)
                    print(f"🎉 双语生成完成! 总计: {total} 篇 (英文: {len(en_results)}, 中文: {len(zh_results)})")
                else:
                    results = generator.keyword_driven_generation(language)
                    print(f"🎉 关键词驱动生成完成! 总计: {len(results)} 篇")
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