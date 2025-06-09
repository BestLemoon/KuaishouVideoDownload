#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Multilingual Keyword Generator for SEO Blog
基于Google Search Console关键词生成多语言文章
"""

import os
import sys
import time
import random
from datetime import datetime
from typing import List, Dict
from language_detector import LanguageDetector
from main import SEOBlogGenerator

class MultilingualKeywordGenerator:
    def __init__(self, keywords_file_path: str = None):
        """初始化多语言关键词生成器"""
        self.language_detector = LanguageDetector()
        self.seo_generator = SEOBlogGenerator()
        self.keywords_file_path = keywords_file_path or "keywords_gsc.txt"
        
        print("🌍 多语言关键词生成器初始化完成")
        print(f"📂 关键词文件: {self.keywords_file_path}")
        print(f"🗣️ 支持的语言: {', '.join(self.language_detector.supported_locales.values())}")
    
    def analyze_keywords_file(self) -> Dict[str, any]:
        """分析关键词文件，返回语言分布统计"""
        print(f"\n📊 分析关键词文件: {self.keywords_file_path}")
        
        # 加载关键词
        keywords = self.language_detector.load_keywords_from_file(self.keywords_file_path)
        
        if not keywords:
            print("❌ 未找到有效关键词")
            return {}
        
        print(f"📝 总计加载关键词: {len(keywords)} 个")
        
        # 获取语言统计
        language_stats = self.language_detector.get_language_stats(keywords)
        
        print(f"\n🌐 语言分布统计:")
        for locale, stats in language_stats.items():
            print(f"   {stats['language_name']} ({locale}):")
            print(f"      数量: {stats['keyword_count']} 个 ({stats['percentage']}%)")
            print(f"      示例: {', '.join(stats['sample_keywords'])}")
        
        return {
            'total_keywords': len(keywords),
            'language_stats': language_stats,
            'filtered_keywords': self.language_detector.filter_keywords_by_supported_languages(keywords)
        }
    
    def generate_topics_from_keywords(self, keywords: List[str], language: str, max_topics: int = 5) -> List[str]:
        """从关键词生成文章主题"""
        print(f"\n💡 为 {language} 生成文章主题...")
        
        # 随机选择关键词作为主题基础
        selected_keywords = random.sample(keywords, min(len(keywords), max_topics * 2))
        
        topics = []
        language_name = self.language_detector.supported_locales.get(language, 'English')
        
        # 根据语言生成不同类型的主题
        topic_templates = self._get_topic_templates(language)
        
        for i, keyword in enumerate(selected_keywords[:max_topics]):
            template = random.choice(topic_templates)
            topic = template.format(keyword=keyword)
            topics.append(topic)
        
        return topics
    
    def _get_topic_templates(self, language: str) -> List[str]:
        """获取不同语言的主题模板"""
        templates = {
            'en': [
                "How to {keyword}: Complete Guide for Beginners",
                "Best {keyword} Tools and Methods in 2024",
                "{keyword}: Tips, Tricks and Best Practices",
                "Ultimate Guide to {keyword} - Everything You Need to Know",
                "Top 10 {keyword} Solutions for Social Media Users"
            ],
            'zh': [
                "{keyword}完整指南：新手必读教程",
                "2024年最佳{keyword}工具和方法推荐",
                "{keyword}技巧分享：提升效率的实用方法",
                "{keyword}全攻略：从入门到精通",
                "社交媒体用户必备的{keyword}解决方案"
            ],
            'ko': [
                "{keyword} 완벽 가이드: 초보자를 위한 단계별 설명",
                "2024년 최고의 {keyword} 도구와 방법",
                "{keyword} 팁과 요령: 효율성을 높이는 방법",
                "{keyword} 마스터 가이드: 모든 것을 알려드립니다",
                "소셜미디어 사용자를 위한 {keyword} 솔루션"
            ],
            'de': [
                "Wie man {keyword}: Vollständiger Leitfaden für Anfänger",
                "Die besten {keyword} Tools und Methoden 2024",
                "{keyword}: Tipps, Tricks und bewährte Praktiken",
                "Der ultimative {keyword} Guide - Alles was Sie wissen müssen",
                "Top 10 {keyword} Lösungen für Social Media Nutzer"
            ],
            'ar': [
                "كيفية {keyword}: دليل شامل للمبتدئين",
                "أفضل أدوات وطرق {keyword} في 2024",
                "{keyword}: نصائح وحيل وأفضل الممارسات",
                "الدليل النهائي لـ {keyword} - كل ما تحتاج لمعرفته",
                "أفضل 10 حلول {keyword} لمستخدمي وسائل التواصل الاجتماعي"
            ]
        }
        
        # 如果语言不在模板中，使用英语模板
        return templates.get(language, templates['en'])
    
    def generate_daily_articles(self, articles_per_language: int = 3) -> Dict[str, List[Dict]]:
        """每日生成多语言文章"""
        print(f"\n📅 开始每日多语言文章生成...")
        print(f"🎯 每种语言生成 {articles_per_language} 篇文章")
        
        # 分析关键词
        analysis = self.analyze_keywords_file()
        if not analysis:
            return {}
        
        filtered_keywords = analysis['filtered_keywords']
        generated_articles = {}
        
        for locale, keywords in filtered_keywords.items():
            if len(keywords) == 0:
                continue
            
            language_name = self.language_detector.supported_locales[locale]
            print(f"\n🌍 生成 {language_name} ({locale}) 文章...")
            
            # 生成主题
            topics = self.generate_topics_from_keywords(keywords, locale, articles_per_language)
            
            print(f"📝 生成的主题:")
            for i, topic in enumerate(topics, 1):
                print(f"   {i}. {topic}")
            
            # 生成文章
            articles = []
            for i, topic in enumerate(topics, 1):
                print(f"\n📄 生成第 {i}/{len(topics)} 篇文章...")
                
                # 构建关键词上下文
                keywords_context = f"相关关键词: {', '.join(keywords[:10])}"
                
                try:
                    result = self.seo_generator.generate_single_article(
                        topic=topic,
                        language=language_name,
                        locale=locale,
                        keywords_context=keywords_context
                    )
                    
                    if result:
                        articles.append(result)
                        print(f"✅ 文章生成成功: {result['title']}")
                    else:
                        print(f"❌ 文章生成失败: {topic}")
                
                except Exception as e:
                    print(f"❌ 生成文章时出错: {e}")
                
                # 添加延迟避免API限制
                if i < len(topics):
                    delay = random.uniform(3, 6)  # 3-6秒随机延迟
                    print(f"⏳ 等待 {delay:.1f} 秒...")
                    time.sleep(delay)
            
            generated_articles[locale] = articles
            print(f"✅ {language_name} 文章生成完成: {len(articles)}/{len(topics)} 篇成功")
        
        return generated_articles
    
    def generate_focused_articles(self, target_languages: List[str] = None, keywords_per_language: int = 5) -> Dict[str, List[Dict]]:
        """针对特定语言生成重点文章"""
        print(f"\n🎯 开始重点语言文章生成...")
        
        # 分析关键词
        analysis = self.analyze_keywords_file()
        if not analysis:
            return {}
        
        filtered_keywords = analysis['filtered_keywords']
        
        # 如果未指定目标语言，选择关键词数量最多的前几种语言
        if not target_languages:
            sorted_languages = sorted(
                filtered_keywords.items(),
                key=lambda x: len(x[1]),
                reverse=True
            )
            target_languages = [lang for lang, _ in sorted_languages[:3]]
        
        print(f"🎯 目标语言: {', '.join(target_languages)}")
        
        generated_articles = {}
        
        for locale in target_languages:
            if locale not in filtered_keywords or len(filtered_keywords[locale]) == 0:
                continue
            
            keywords = filtered_keywords[locale]
            language_name = self.language_detector.supported_locales[locale]
            
            print(f"\n🌍 生成 {language_name} ({locale}) 重点文章...")
            print(f"📊 可用关键词: {len(keywords)} 个")
            
            # 生成更多主题
            topics = self.generate_topics_from_keywords(keywords, locale, keywords_per_language)
            
            articles = []
            for i, topic in enumerate(topics, 1):
                print(f"\n📄 生成第 {i}/{len(topics)} 篇文章...")
                print(f"   主题: {topic}")
                
                # 为该主题选择相关关键词
                related_keywords = keywords[:15]  # 使用前15个关键词作为上下文
                keywords_context = f"目标关键词: {', '.join(related_keywords)}"
                
                try:
                    result = self.seo_generator.generate_single_article(
                        topic=topic,
                        language=language_name,
                        locale=locale,
                        keywords_context=keywords_context
                    )
                    
                    if result:
                        articles.append(result)
                        print(f"✅ 文章生成成功")
                    else:
                        print(f"❌ 文章生成失败")
                
                except Exception as e:
                    print(f"❌ 生成文章时出错: {e}")
                
                # 添加延迟
                if i < len(topics):
                    delay = random.uniform(4, 8)
                    print(f"⏳ 等待 {delay:.1f} 秒...")
                    time.sleep(delay)
            
            generated_articles[locale] = articles
            print(f"✅ {language_name} 重点文章生成完成: {len(articles)}/{len(topics)} 篇成功")
        
        return generated_articles
    
    def interactive_mode(self):
        """交互式模式"""
        print("\n🎮 多语言关键词生成器 - 交互式模式")
        print("=" * 50)
        
        while True:
            print("\n📋 请选择操作:")
            print("1. 📊 分析关键词文件")
            print("2. 📅 生成每日多语言文章")
            print("3. 🎯 生成重点语言文章")
            print("4. 🔧 设置关键词文件路径")
            print("0. ❌ 退出")
            
            choice = input("\n请输入选择 (0-4): ").strip()
            
            if choice == "0":
                print("👋 再见!")
                break
            elif choice == "1":
                self.analyze_keywords_file()
            elif choice == "2":
                articles_per_lang = input("每种语言生成文章数量 (默认3): ").strip()
                articles_per_lang = int(articles_per_lang) if articles_per_lang.isdigit() else 3
                results = self.generate_daily_articles(articles_per_lang)
                self._print_generation_summary(results)
            elif choice == "3":
                keywords_per_lang = input("每种语言生成文章数量 (默认5): ").strip()
                keywords_per_lang = int(keywords_per_lang) if keywords_per_lang.isdigit() else 5
                results = self.generate_focused_articles(keywords_per_language=keywords_per_lang)
                self._print_generation_summary(results)
            elif choice == "4":
                new_path = input("请输入关键词文件路径: ").strip()
                if os.path.exists(new_path):
                    self.keywords_file_path = new_path
                    print(f"✅ 关键词文件路径已更新: {new_path}")
                else:
                    print("❌ 文件不存在")
            else:
                print("❌ 无效选择，请重试")
    
    def _print_generation_summary(self, results: Dict[str, List[Dict]]):
        """打印生成结果摘要"""
        if not results:
            print("\n❌ 没有生成任何文章")
            return
        
        print(f"\n📊 生成结果摘要:")
        print("=" * 40)
        
        total_articles = 0
        for locale, articles in results.items():
            language_name = self.language_detector.supported_locales[locale]
            total_articles += len(articles)
            print(f"🌍 {language_name} ({locale}): {len(articles)} 篇")
            
            for article in articles:
                print(f"   📄 {article['title']}")
                print(f"      🔗 {article.get('slug', 'N/A')}")
        
        print(f"\n✅ 总计成功生成: {total_articles} 篇文章")
        print(f"⏰ 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="多语言关键词驱动的SEO博客生成器")
    parser.add_argument("--keywords-file", "-f", default="keywords_gsc.txt", help="关键词文件路径")
    parser.add_argument("--mode", "-m", choices=["analyze", "daily", "focused", "interactive"], default="interactive", help="运行模式")
    parser.add_argument("--articles-per-language", "-n", type=int, default=3, help="每种语言生成的文章数量")
    parser.add_argument("--target-languages", "-l", nargs="+", help="目标语言代码列表")
    
    args = parser.parse_args()
    
    # 初始化生成器
    generator = MultilingualKeywordGenerator(args.keywords_file)
    
    # 根据模式执行
    if args.mode == "analyze":
        generator.analyze_keywords_file()
    elif args.mode == "daily":
        results = generator.generate_daily_articles(args.articles_per_language)
        generator._print_generation_summary(results)
    elif args.mode == "focused":
        results = generator.generate_focused_articles(
            target_languages=args.target_languages,
            keywords_per_language=args.articles_per_language
        )
        generator._print_generation_summary(results)
    else:
        generator.interactive_mode()

if __name__ == "__main__":
    main() 