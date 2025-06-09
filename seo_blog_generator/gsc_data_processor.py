#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GSC Data Processor
处理Google Search Console数据，筛选符合条件的关键词
"""

import pandas as pd
import re
from typing import List, Dict, Tuple
from language_detector import LanguageDetector

class GSCDataProcessor:
    def __init__(self, csv_file_path: str):
        """初始化GSC数据处理器"""
        self.csv_file_path = csv_file_path
        self.language_detector = LanguageDetector()
        self.data = None
        self.filtered_keywords = None
        
        print(f"📊 GSC数据处理器初始化")
        print(f"📂 数据文件: {csv_file_path}")
    
    def load_data(self) -> bool:
        """加载CSV数据"""
        try:
            self.data = pd.read_csv(self.csv_file_path)
            print(f"✅ 成功加载数据: {len(self.data)} 行")
            
            # 显示数据基本信息
            print(f"📋 数据列: {list(self.data.columns)}")
            return True
            
        except Exception as e:
            print(f"❌ 数据加载失败: {e}")
            return False
    
    def clean_and_prepare_data(self):
        """清理和准备数据"""
        if self.data is None:
            print("❌ 数据未加载")
            return False
        
        try:
            # 处理排名列，移除%符号并转换为数值
            if '点击率' in self.data.columns:
                self.data['点击率_数值'] = self.data['点击率'].astype(str).str.replace('%', '').astype(float)
            
            # 确保数值列为正确类型
            numeric_columns = ['点击次数', '展示', '排名']
            for col in numeric_columns:
                if col in self.data.columns:
                    self.data[col] = pd.to_numeric(self.data[col], errors='coerce')
            
            # 移除包含NaN的行
            self.data = self.data.dropna(subset=['热门查询', '展示', '排名'])
            
            print(f"✅ 数据清理完成: {len(self.data)} 行有效数据")
            return True
            
        except Exception as e:
            print(f"❌ 数据清理失败: {e}")
            return False
    
    def filter_keywords(self, min_impressions: int = 10, min_rank: float = 4, max_rank: float = 10) -> List[Dict]:
        """筛选符合条件的关键词
        
        Args:
            min_impressions: 最小展示量
            min_rank: 最小排名（排名越大越靠后）
            max_rank: 最大排名
        """
        if self.data is None:
            print("❌ 数据未加载")
            return []
        
        try:
            # 应用筛选条件
            filtered_data = self.data[
                (self.data['展示'] > min_impressions) &
                (self.data['排名'] > min_rank) &
                (self.data['排名'] < max_rank)
            ].copy()
            
            print(f"\n🔍 筛选条件:")
            print(f"   展示量 > {min_impressions}")
            print(f"   排名 > {min_rank} 且 < {max_rank}")
            print(f"📊 筛选结果: {len(filtered_data)} 个关键词")
            
            # 转换为字典列表，并添加语言检测
            keywords_list = []
            for _, row in filtered_data.iterrows():
                keyword = row['热门查询']
                
                # 检测语言
                detected_language = self.language_detector.detect_language(keyword)
                language_name = self.language_detector.supported_locales.get(detected_language, 'Unknown')
                
                # 只保留支持的语言
                if detected_language in self.language_detector.supported_locales:
                    keyword_data = {
                        'keyword': keyword,
                        'clicks': int(row['点击次数']) if pd.notna(row['点击次数']) else 0,
                        'impressions': int(row['展示']),
                        'rank': float(row['排名']),
                        'ctr': row.get('点击率_数值', 0.0),
                        'language_code': detected_language,
                        'language_name': language_name
                    }
                    keywords_list.append(keyword_data)
            
            # 按语言分组统计
            language_stats = {}
            for kw in keywords_list:
                lang_code = kw['language_code']
                if lang_code not in language_stats:
                    language_stats[lang_code] = {
                        'count': 0,
                        'language_name': kw['language_name'],
                        'keywords': []
                    }
                language_stats[lang_code]['count'] += 1
                language_stats[lang_code]['keywords'].append(kw['keyword'])
            
            print(f"\n🌐 语言分布:")
            for lang_code, stats in language_stats.items():
                print(f"   {stats['language_name']} ({lang_code}): {stats['count']} 个")
                print(f"      示例: {', '.join(stats['keywords'][:3])}")
            
            self.filtered_keywords = keywords_list
            return keywords_list
            
        except Exception as e:
            print(f"❌ 关键词筛选失败: {e}")
            return []
    
    def get_keywords_by_language(self, language_code: str = None) -> List[Dict]:
        """获取指定语言的关键词"""
        if not self.filtered_keywords:
            print("❌ 请先执行关键词筛选")
            return []
        
        if language_code:
            return [kw for kw in self.filtered_keywords if kw['language_code'] == language_code]
        else:
            return self.filtered_keywords
    
    def get_top_keywords_by_language(self, language_code: str, limit: int = 10, sort_by: str = 'impressions') -> List[Dict]:
        """获取指定语言的top关键词
        
        Args:
            language_code: 语言代码
            limit: 返回数量
            sort_by: 排序依据 ('impressions', 'clicks', 'rank')
        """
        keywords = self.get_keywords_by_language(language_code)
        
        if not keywords:
            return []
        
        # 排序
        if sort_by == 'rank':
            # 排名越小越好
            keywords.sort(key=lambda x: x['rank'])
        else:
            # 展示量和点击量越大越好
            keywords.sort(key=lambda x: x[sort_by], reverse=True)
        
        return keywords[:limit]
    
    def export_filtered_data(self, output_file: str = "filtered_keywords.csv"):
        """导出筛选后的数据"""
        if not self.filtered_keywords:
            print("❌ 没有筛选数据可导出")
            return False
        
        try:
            df = pd.DataFrame(self.filtered_keywords)
            df.to_csv(output_file, index=False, encoding='utf-8')
            print(f"✅ 筛选数据已导出: {output_file}")
            return True
            
        except Exception as e:
            print(f"❌ 数据导出失败: {e}")
            return False
    
    def get_summary_stats(self) -> Dict:
        """获取汇总统计信息"""
        if not self.filtered_keywords:
            return {}
        
        stats = {
            'total_keywords': len(self.filtered_keywords),
            'languages': {},
            'avg_rank': sum(kw['rank'] for kw in self.filtered_keywords) / len(self.filtered_keywords),
            'total_impressions': sum(kw['impressions'] for kw in self.filtered_keywords),
            'total_clicks': sum(kw['clicks'] for kw in self.filtered_keywords)
        }
        
        # 按语言统计
        for kw in self.filtered_keywords:
            lang_code = kw['language_code']
            if lang_code not in stats['languages']:
                stats['languages'][lang_code] = {
                    'name': kw['language_name'],
                    'count': 0,
                    'avg_rank': 0,
                    'impressions': 0,
                    'clicks': 0
                }
            
            stats['languages'][lang_code]['count'] += 1
            stats['languages'][lang_code]['impressions'] += kw['impressions']
            stats['languages'][lang_code]['clicks'] += kw['clicks']
        
        # 计算各语言平均排名
        for lang_code in stats['languages']:
            lang_keywords = [kw for kw in self.filtered_keywords if kw['language_code'] == lang_code]
            stats['languages'][lang_code]['avg_rank'] = sum(kw['rank'] for kw in lang_keywords) / len(lang_keywords)
        
        return stats
    
    def print_summary(self):
        """打印汇总信息"""
        stats = self.get_summary_stats()
        
        if not stats:
            print("❌ 无统计数据")
            return
        
        print(f"\n📊 GSC数据汇总统计")
        print("=" * 50)
        print(f"📝 总关键词数: {stats['total_keywords']}")
        print(f"📈 总展示量: {stats['total_impressions']:,}")
        print(f"👆 总点击量: {stats['total_clicks']:,}")
        print(f"📍 平均排名: {stats['avg_rank']:.2f}")
        
        print(f"\n🌐 各语言统计:")
        for lang_code, lang_stats in stats['languages'].items():
            print(f"   {lang_stats['name']} ({lang_code}):")
            print(f"      关键词数: {lang_stats['count']}")
            print(f"      展示量: {lang_stats['impressions']:,}")
            print(f"      点击量: {lang_stats['clicks']:,}")
            print(f"      平均排名: {lang_stats['avg_rank']:.2f}")

def main():
    """测试函数"""
    processor = GSCDataProcessor("查询数.csv")
    
    if processor.load_data():
        if processor.clean_and_prepare_data():
            keywords = processor.filter_keywords()
            processor.print_summary()
            
            # 导出筛选后的数据
            processor.export_filtered_data()

if __name__ == "__main__":
    main() 