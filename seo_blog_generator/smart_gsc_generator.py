#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart GSC Blog Generator
基于Google Search Console数据的智能博客生成器
"""

import os
import sys
import time
import random
from datetime import datetime
from typing import List, Dict
from gsc_data_processor import GSCDataProcessor

class SmartGSCGenerator:
    def __init__(self, gsc_csv_path: str = "查询数.csv"):
        """初始化智能GSC生成器"""
        print("🤖 智能GSC博客生成器启动")
        print("=" * 50)
        
        self.gsc_processor = GSCDataProcessor(gsc_csv_path)
        
        # 动态导入避免循环导入
        from main import SEOBlogGenerator
        self.seo_generator = SEOBlogGenerator()
        self.filtered_keywords = None
        
        print("✅ 初始化完成")
    
    def analyze_gsc_data(self, min_impressions: int = 10, min_rank: float = 4, max_rank: float = 10) -> bool:
        """分析GSC数据"""
        print(f"\n📊 开始分析GSC数据...")
        
        # 加载数据
        if not self.gsc_processor.load_data():
            return False
        
        # 清理数据
        if not self.gsc_processor.clean_and_prepare_data():
            return False
        
        # 筛选关键词
        self.filtered_keywords = self.gsc_processor.filter_keywords(
            min_impressions=min_impressions,
            min_rank=min_rank,
            max_rank=max_rank
        )
        
        if not self.filtered_keywords:
            print("❌ 没有符合条件的关键词")
            return False
        
        # 打印汇总信息
        self.gsc_processor.print_summary()
        return True
    
    def generate_single_article_from_keyword(self, keyword_data: Dict) -> Dict:
        """基于单个关键词生成文章"""
        try:
            keyword = keyword_data['keyword']
            language_code = keyword_data['language_code']
            language_name = keyword_data['language_name']
            rank = keyword_data['rank']
            impressions = keyword_data['impressions']
            
            print(f"\n📝 开始生成文章...")
            print(f"   关键词: {keyword}")
            print(f"   语言: {language_name} ({language_code})")
            print(f"   当前排名: {rank}")
            print(f"   展示量: {impressions}")
            
            # 1. 生成标题
            title = self.seo_generator.content_generator.generate_title_from_keyword(
                keyword=keyword,
                language=language_code,
                rank=rank,
                impressions=impressions
            )
            
            print(f"   生成标题: {title}")
            
            # 2. 构建关键词上下文
            keywords_context = f"""目标关键词: {keyword}
当前排名: {rank}
展示量: {impressions}
语言: {language_name}

SEO优化目标: 提升关键词"{keyword}"在搜索结果中的排名
请确保文章内容自然地包含该关键词，并提供有价值的信息来满足用户搜索意图。"""
            
            # 3. 生成文章
            result = self.seo_generator.generate_single_article(
                topic=title,
                language=language_name,
                locale=language_code,
                keywords_context=keywords_context
            )
            
            if result:
                result['source_keyword'] = keyword
                result['keyword_rank'] = rank
                result['keyword_impressions'] = impressions
                result['language_name'] = language_name
                result['language_code'] = language_code
                print(f"✅ 文章生成成功!")
                print(f"   文章ID: {result['uuid']}")
                print(f"   Slug: {result['slug']}")
                return result
            else:
                print(f"❌ 文章生成失败")
                return None
                
        except Exception as e:
            print(f"❌ 生成文章时出错: {e}")
            return None
    
    def generate_articles_by_language(self, language_code: str, limit: int = 5, sort_by: str = 'impressions') -> List[Dict]:
        """为指定语言生成文章"""
        if not self.filtered_keywords:
            print("❌ 请先分析GSC数据")
            return []
        
        # 获取该语言的top关键词
        top_keywords = self.gsc_processor.get_top_keywords_by_language(
            language_code=language_code,
            limit=limit,
            sort_by=sort_by
        )
        
        if not top_keywords:
            print(f"❌ 没有找到 {language_code} 语言的关键词")
            return []
        
        language_name = top_keywords[0].get('language_name', language_code)
        print(f"\n🌍 为 {language_name} 生成 {len(top_keywords)} 篇文章")
        print("=" * 40)
        
        generated_articles = []
        
        for i, keyword_data in enumerate(top_keywords, 1):
            print(f"\n📄 生成第 {i}/{len(top_keywords)} 篇文章")
            
            result = self.generate_single_article_from_keyword(keyword_data)
            
            if result:
                generated_articles.append(result)
            
            # 添加延迟避免API限制
            if i < len(top_keywords):
                delay = random.uniform(3, 6)
                print(f"⏳ 等待 {delay:.1f} 秒...")
                time.sleep(delay)
        
        print(f"\n✅ {language_name} 文章生成完成: {len(generated_articles)}/{len(top_keywords)} 篇成功")
        return generated_articles
    
    def generate_articles_for_all_languages(self, articles_per_language: int = 3) -> Dict[str, List[Dict]]:
        """为所有语言生成文章"""
        if not self.filtered_keywords:
            print("❌ 请先分析GSC数据")
            return {}
        
        # 获取所有有关键词的语言
        available_languages = set(kw['language_code'] for kw in self.filtered_keywords)
        
        print(f"\n🌍 开始为所有语言生成文章")
        print(f"🎯 每种语言生成 {articles_per_language} 篇文章")
        print(f"📋 可用语言: {', '.join(available_languages)}")
        print("=" * 50)
        
        all_results = {}
        
        for language_code in available_languages:
            print(f"\n🔤 处理语言: {language_code}")
            
            results = self.generate_articles_by_language(
                language_code=language_code,
                limit=articles_per_language,
                sort_by='impressions'
            )
            
            if results:
                all_results[language_code] = results
        
        # 打印总结
        total_articles = sum(len(articles) for articles in all_results.values())
        print(f"\n🎉 全部语言文章生成完成!")
        print(f"📊 总计生成: {total_articles} 篇文章")
        print(f"🌐 涵盖语言: {len(all_results)} 种")
        
        for lang_code, articles in all_results.items():
            lang_name = articles[0].get('language_name', lang_code) if articles else lang_code
            print(f"   {lang_name} ({lang_code}): {len(articles)} 篇")
        
        return all_results
    
    def generate_priority_articles(self, priority_languages: List[str] = None, articles_per_language: int = 5) -> Dict[str, List[Dict]]:
        """为优先级语言生成文章"""
        if not self.filtered_keywords:
            print("❌ 请先分析GSC数据")
            return {}
        
        # 默认优先级语言
        if not priority_languages:
            priority_languages = ['en', 'zh', 'ko']
        
        # 筛选可用的优先级语言
        available_languages = set(kw['language_code'] for kw in self.filtered_keywords)
        valid_priority_languages = [lang for lang in priority_languages if lang in available_languages]
        
        if not valid_priority_languages:
            print("❌ 没有可用的优先级语言")
            return {}
        
        print(f"\n🎯 开始为优先级语言生成文章")
        print(f"📋 优先级语言: {', '.join(valid_priority_languages)}")
        print(f"📝 每种语言生成 {articles_per_language} 篇文章")
        print("=" * 50)
        
        priority_results = {}
        
        for language_code in valid_priority_languages:
            results = self.generate_articles_by_language(
                language_code=language_code,
                limit=articles_per_language,
                sort_by='impressions'
            )
            
            if results:
                priority_results[language_code] = results
        
        # 打印总结
        total_articles = sum(len(articles) for articles in priority_results.values())
        print(f"\n🏆 优先级语言文章生成完成!")
        print(f"📊 总计生成: {total_articles} 篇文章")
        
        return priority_results
    
    def run_analysis_only(self):
        """仅运行分析，不生成文章"""
        print("\n🔍 GSC数据分析模式")
        print("=" * 30)
        
        if self.analyze_gsc_data():
            # 导出筛选后的数据
            self.gsc_processor.export_filtered_data("filtered_gsc_keywords.csv")
            
            # 显示各语言top关键词
            available_languages = set(kw['language_code'] for kw in self.filtered_keywords)
            
            print(f"\n📋 各语言Top关键词预览:")
            for lang_code in available_languages:
                top_keywords = self.gsc_processor.get_top_keywords_by_language(lang_code, 5)
                if top_keywords:
                    lang_name = top_keywords[0].get('language_name', lang_code)
                    print(f"\n🌍 {lang_name} ({lang_code}):")
                    for i, kw in enumerate(top_keywords, 1):
                        print(f"   {i}. {kw['keyword']} (排名: {kw['rank']:.1f}, 展示: {kw['impressions']})")
    
    def interactive_mode(self):
        """交互式模式"""
        print("\n🎮 智能GSC博客生成器 - 交互式模式")
        print("=" * 50)
        
        while True:
            print("\n📋 请选择操作:")
            print("1. 🔍 分析GSC数据")
            print("2. 🌍 为所有语言生成文章")
            print("3. 🎯 为优先级语言生成文章") 
            print("4. 🔤 为指定语言生成文章")
            print("5. 📊 查看当前分析结果")
            print("0. ❌ 退出")
            
            choice = input("\n请输入选择 (0-5): ").strip()
            
            if choice == "0":
                print("👋 再见!")
                break
            elif choice == "1":
                self.run_analysis_only()
            elif choice == "2":
                if not self.filtered_keywords:
                    print("❌ 请先分析GSC数据")
                    continue
                
                articles_count = input("每种语言生成文章数量 (默认3): ").strip()
                articles_count = int(articles_count) if articles_count.isdigit() else 3
                
                self.generate_articles_for_all_languages(articles_count)
            elif choice == "3":
                if not self.filtered_keywords:
                    print("❌ 请先分析GSC数据")
                    continue
                
                articles_count = input("每种语言生成文章数量 (默认5): ").strip()
                articles_count = int(articles_count) if articles_count.isdigit() else 5
                
                self.generate_priority_articles(articles_per_language=articles_count)
            elif choice == "4":
                if not self.filtered_keywords:
                    print("❌ 请先分析GSC数据")
                    continue
                
                available_languages = set(kw['language_code'] for kw in self.filtered_keywords)
                print(f"可用语言: {', '.join(available_languages)}")
                
                lang_code = input("请输入语言代码: ").strip()
                if lang_code not in available_languages:
                    print("❌ 无效的语言代码")
                    continue
                
                articles_count = input("生成文章数量 (默认5): ").strip()
                articles_count = int(articles_count) if articles_count.isdigit() else 5
                
                self.generate_articles_by_language(lang_code, articles_count)
            elif choice == "5":
                if self.filtered_keywords:
                    self.gsc_processor.print_summary()
                else:
                    print("❌ 请先分析GSC数据")
            else:
                print("❌ 无效选择，请重试")

def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="智能GSC博客生成器")
    parser.add_argument("--csv-file", "-f", default="查询数.csv", help="GSC CSV文件路径")
    parser.add_argument("--mode", "-m", choices=["interactive", "analyze", "all", "priority"], default="interactive", help="运行模式")
    parser.add_argument("--articles-per-language", "-n", type=int, default=3, help="每种语言生成的文章数量")
    parser.add_argument("--min-impressions", type=int, default=10, help="最小展示量")
    parser.add_argument("--min-rank", type=float, default=4, help="最小排名")
    parser.add_argument("--max-rank", type=float, default=10, help="最大排名")
    
    args = parser.parse_args()
    
    # 初始化生成器
    generator = SmartGSCGenerator(args.csv_file)
    
    # 根据模式执行
    if args.mode == "analyze":
        generator.run_analysis_only()
    elif args.mode == "all":
        if generator.analyze_gsc_data(args.min_impressions, args.min_rank, args.max_rank):
            generator.generate_articles_for_all_languages(args.articles_per_language)
    elif args.mode == "priority":
        if generator.analyze_gsc_data(args.min_impressions, args.min_rank, args.max_rank):
            generator.generate_priority_articles(articles_per_language=args.articles_per_language)
    else:
        generator.interactive_mode()

if __name__ == "__main__":
    main() 