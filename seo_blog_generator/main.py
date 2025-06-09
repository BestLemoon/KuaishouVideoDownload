#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO Blog Generator for TwitterDown
自动生成 SEO 优化的博客文章并部署到 Next.js 网站
"""

import sys
import os
import subprocess
from datetime import datetime
from config import *
from database import DatabaseManager
from content_generator import ContentGenerator
from image_downloader import ImageDownloader
from sitemap_updater import SitemapUpdater
from keyword_generator import KeywordGenerator
from language_detector import LanguageDetector

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
        self.language_detector = LanguageDetector()
        
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
    
    def multilingual_keyword_generation(self, keywords_file_path="keywords_gsc.txt"):
        """基于关键词文件的多语言文章生成"""
        try:
            print(f"\n🌍 开始多语言关键词驱动生成...")
            print(f"📂 关键词文件: {keywords_file_path}")
            
            # 加载和分析关键词
            keywords = self.language_detector.load_keywords_from_file(keywords_file_path)
            if not keywords:
                print("❌ 未找到有效关键词")
                return []
            
            print(f"📝 总计加载关键词: {len(keywords)} 个")
            
            # 按语言分组关键词
            language_keywords = self.language_detector.filter_keywords_by_supported_languages(keywords)
            
            print(f"\n🌐 发现的语言分布:")
            for locale, kws in language_keywords.items():
                language_name = self.language_detector.supported_locales[locale]
                print(f"   {language_name} ({locale}): {len(kws)} 个关键词")
                print(f"      示例: {', '.join(kws[:3])}")
            
            # 为每种语言生成文章
            all_results = []
            for locale, kws in language_keywords.items():
                if len(kws) < 3:  # 关键词太少跳过
                    continue
                
                language_name = self.language_detector.supported_locales[locale]
                print(f"\n📝 为 {language_name} 生成文章...")
                
                # 从关键词中选择主题
                import random
                selected_keywords = random.sample(kws, min(len(kws), 3))
                
                for keyword in selected_keywords:
                    # 生成针对该关键词的文章主题
                    topic_templates = {
                        'en': f"Complete Guide to {keyword}: Tips and Best Practices",
                        'zh': f"{keyword}完整指南：实用技巧和最佳实践",
                        'ko': f"{keyword} 완전 가이드: 팁과 모범 사례",
                        'de': f"Vollständiger Leitfaden zu {keyword}: Tipps und Best Practices",
                        'ar': f"الدليل الكامل لـ {keyword}: نصائح وأفضل الممارسات"
                    }
                    
                    topic = topic_templates.get(locale, f"Complete Guide to {keyword}")
                    
                    # 构建关键词上下文
                    keywords_context = f"目标关键词: {keyword}\n相关关键词: {', '.join(kws[:10])}"
                    
                    print(f"   生成文章: {topic}")
                    
                    result = self.generate_single_article(
                        topic=topic,
                        language=language_name,
                        locale=locale,
                        keywords_context=keywords_context
                    )
                    
                    if result:
                        all_results.append(result)
                        print(f"   ✅ 成功生成: {result['title']}")
                    
                    # 添加延迟避免API限制
                    import time
                    time.sleep(3)
            
            print(f"\n✅ 多语言生成完成! 总计生成 {len(all_results)} 篇文章")
            return all_results
            
        except Exception as e:
            print(f"❌ 多语言生成失败: {e}")
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
            print("6. 🌍 多语言关键词驱动生成")
            print("7. 🤖 智能GSC博客生成器 (NEW)")
            print("8. 验证 sitemap")
            print("9. 部署到 Vercel")
            print("10. 查看文章列表")
            print("11. 从数据库更新 Sitemap")
            print("0. 退出")
            
            choice = input("\n请输入选项 (0-11): ").strip()
            
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
                self.handle_multilingual_keyword_generation()
            elif choice == "7":
                self.handle_smart_gsc_generation()
            elif choice == "8":
                self.sitemap_updater.validate_sitemap()
            elif choice == "9":
                self.deploy_to_vercel()
            elif choice == "10":
                self.show_articles_list()
            elif choice == "11":
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
    
    def handle_multilingual_keyword_generation(self):
        """处理多语言关键词驱动生成"""
        print("\n🌍 多语言关键词驱动生成模式")
        print("=" * 50)
        print("这个模式将:")
        print("1. 📊 分析GSC关键词文件")
        print("2. 🌐 识别并分组不同语言的关键词")
        print("3. 📝 为每种语言生成对应的文章")
        print("4. 💾 自动保存到数据库对应的locale")
        
        # 询问关键词文件路径
        keywords_file = input(f"\n关键词文件路径 (默认: keywords_gsc.txt): ").strip()
        if not keywords_file:
            keywords_file = "keywords_gsc.txt"
        
        # 检查文件是否存在
        if not os.path.exists(keywords_file):
            print(f"❌ 文件不存在: {keywords_file}")
            return
        
        confirm = input(f"\n确认开始多语言生成? (y/N): ").strip().lower()
        if confirm != 'y':
            print("❌ 已取消")
            return
        
        try:
            results = self.multilingual_keyword_generation(keywords_file)
            
            if results:
                print(f"\n🎉 多语言生成成功完成!")
                print(f"📊 总计生成: {len(results)} 篇文章")
                
                # 按语言分组显示结果
                language_groups = {}
                for result in results:
                    locale = result.get('locale', 'unknown')
                    if locale not in language_groups:
                        language_groups[locale] = []
                    language_groups[locale].append(result)
                
                for locale, articles in language_groups.items():
                    language_name = self.language_detector.supported_locales.get(locale, locale)
                    print(f"\n🌍 {language_name} ({locale}): {len(articles)} 篇")
                    for article in articles:
                        print(f"   📄 {article['title']}")
                        print(f"      🔗 /posts/{article['slug']}")
            else:
                print("❌ 没有生成任何文章")
                
        except Exception as e:
            print(f"❌ 多语言生成失败: {e}")
    
    def handle_smart_gsc_generation(self):
        """处理智能GSC博客生成"""
        print("\n🤖 智能GSC博客生成器")
        print("=" * 50)
        print("这个模式将:")
        print("1. 📊 分析GSC数据，筛选符合条件的关键词")
        print("2. 🔍 按语言分组和排序关键词")
        print("3. 🤖 AI直接基于关键词生成优化标题")
        print("4. 📝 生成针对性SEO优化文章")
        print("5. 💾 自动保存到对应locale数据库")
        
        # 检查CSV文件
        csv_file = "查询数.csv"
        if not os.path.exists(csv_file):
            csv_file = input(f"\nGSC CSV文件未找到，请输入文件路径: ").strip()
            if not os.path.exists(csv_file):
                print(f"❌ 文件不存在: {csv_file}")
                return
        
        print(f"\n📂 使用GSC文件: {csv_file}")
        
        # 询问筛选条件
        print(f"\n⚙️ 设置筛选条件:")
        min_impressions = input("最小展示量 (默认10): ").strip()
        min_impressions = int(min_impressions) if min_impressions.isdigit() else 10
        
        min_rank = input("最小排名 (默认4): ").strip()
        min_rank = float(min_rank) if min_rank.replace('.', '').isdigit() else 4.0
        
        max_rank = input("最大排名 (默认10): ").strip()
        max_rank = float(max_rank) if max_rank.replace('.', '').isdigit() else 10.0
        
        print(f"\n🎯 筛选条件: 展示量>{min_impressions}, 排名{min_rank}-{max_rank}")
        
        # 选择生成模式
        print(f"\n📋 选择生成模式:")
        print("1. 🔍 仅分析数据，不生成文章")
        print("2. 🎯 为优先级语言生成文章 (英文+中文+韩文)")
        print("3. 🌍 为所有语言生成文章")
        print("4. 🔤 为指定语言生成文章")
        
        mode_choice = input("请选择模式 (1-4): ").strip()
        
        try:
            from smart_gsc_generator import SmartGSCGenerator
            generator = SmartGSCGenerator(csv_file)
            
            if mode_choice == "1":
                # 仅分析
                generator.run_analysis_only()
                
            elif mode_choice == "2":
                # 优先级语言
                articles_count = input("每种语言生成文章数量 (默认3): ").strip()
                articles_count = int(articles_count) if articles_count.isdigit() else 3
                
                if generator.analyze_gsc_data(min_impressions, min_rank, max_rank):
                    results = generator.generate_priority_articles(articles_per_language=articles_count)
                    self._print_gsc_generation_summary(results)
                    
            elif mode_choice == "3":
                # 所有语言
                articles_count = input("每种语言生成文章数量 (默认2): ").strip()
                articles_count = int(articles_count) if articles_count.isdigit() else 2
                
                if generator.analyze_gsc_data(min_impressions, min_rank, max_rank):
                    results = generator.generate_articles_for_all_languages(articles_count)
                    self._print_gsc_generation_summary(results)
                    
            elif mode_choice == "4":
                # 指定语言
                if generator.analyze_gsc_data(min_impressions, min_rank, max_rank):
                    available_languages = set(kw['language_code'] for kw in generator.filtered_keywords)
                    print(f"可用语言: {', '.join(available_languages)}")
                    
                    lang_code = input("请输入语言代码: ").strip()
                    if lang_code not in available_languages:
                        print("❌ 无效的语言代码")
                        return
                    
                    articles_count = input("生成文章数量 (默认5): ").strip()
                    articles_count = int(articles_count) if articles_count.isdigit() else 5
                    
                    results = generator.generate_articles_by_language(lang_code, articles_count)
                    if results:
                        results_dict = {lang_code: results}
                        self._print_gsc_generation_summary(results_dict)
            else:
                print("❌ 无效选择")
                
        except ImportError:
            print("❌ 智能GSC生成器模块未找到")
        except Exception as e:
            print(f"❌ 智能GSC生成失败: {e}")
    
    def _print_gsc_generation_summary(self, results):
        """打印GSC生成结果摘要"""
        if not results:
            print("\n❌ 没有生成任何文章")
            return
        
        print(f"\n🎉 GSC智能生成完成!")
        print("=" * 40)
        
        total_articles = 0
        for lang_code, articles in results.items():
            total_articles += len(articles)
            lang_name = articles[0].get('language_name', lang_code) if articles else lang_code
            print(f"\n🌍 {lang_name} ({lang_code}): {len(articles)} 篇")
            
            for article in articles:
                keyword = article.get('source_keyword', 'N/A')
                rank = article.get('keyword_rank', 'N/A')
                impressions = article.get('keyword_impressions', 'N/A')
                print(f"   📄 {article['title']}")
                print(f"      🔑 关键词: {keyword} (排名: {rank}, 展示: {impressions})")
                print(f"      🔗 /posts/{article['slug']}")
        
        print(f"\n✅ 总计成功生成: {total_articles} 篇文章")
        print(f"⏰ 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
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