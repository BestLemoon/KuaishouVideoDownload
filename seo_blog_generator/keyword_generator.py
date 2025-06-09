import requests
import json
import re
import time
import google.generativeai as genai
from typing import List, Dict, Any
from config import GEMINI_API_KEY, GEMINI_MODEL

class KeywordGenerator:
    """关键词生成器，负责生成和扩展关键词"""
    
    def __init__(self):
        """初始化关键词生成器"""
        self.api_key = GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("❌ GEMINI_API_KEY 未设置")
        
        # 配置 Gemini API
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel(GEMINI_MODEL)
        
        print("✅ 关键词生成器初始化成功")
    
    def generate_seed_keywords(self, target_language="English", count=10) -> List[str]:
        """与AI对话生成种子关键词"""
        try:
            prompt = f"""你是一位专业的SEO关键词研究专家，专注于Twitter视频下载相关的关键词研究。

## 任务
请为TwitterDown（Twitter视频下载器）生成{count}个高价值的种子关键词。

## 关键词类型要求
请生成以下类型的关键词：
1. 🔍 搜索型关键词（用户直接搜索需求）
2. 📱 设备相关关键词（iPhone, Android, mobile等）
3. 📊 功能型关键词（batch download, HD quality等）
4. 💡 解决方案型关键词（how to, best way等）
5. 🌍 竞品和比较关键词（vs, alternative等）

## 目标语言
{target_language}

## 输出要求
- 直接输出{count}个关键词
- 每行一个关键词
- 不包含编号或符号
- 关键词应该具有搜索价值
- 避免过于宽泛或过于细分的词

请开始生成：

(唯一性标识: {int(time.time())})"""

            print(f"🧠 与AI对话生成{count}个{target_language}种子关键词...")
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8,
                    top_k=40,
                    top_p=0.9
                )
            )
            
            if not response.text:
                raise ValueError("AI未能生成种子关键词")
            
            # 解析关键词
            keywords = []
            lines = response.text.strip().split('\n')
            for line in lines:
                line = line.strip()
                if line and not line.startswith('#') and not line.startswith('-'):
                    # 清理可能的编号和符号
                    keyword = re.sub(r'^\d+\.?\s*', '', line)
                    keyword = re.sub(r'^[•\-\*]\s*', '', keyword)
                    keyword = keyword.strip('"').strip("'").strip()
                    if keyword and len(keyword) > 2:
                        keywords.append(keyword)
            
            # 确保返回指定数量
            keywords = keywords[:count]
            
            print(f"✅ 成功生成{len(keywords)}个种子关键词")
            return keywords
            
        except Exception as e:
            print(f"❌ 种子关键词生成失败: {e}")
            return self._get_default_seed_keywords(target_language, count)
    
    def get_google_suggestions(self, keyword: str, max_suggestions=10) -> List[str]:
        """使用Google自动完成API获取关键词建议"""
        try:
            # Google自动完成API URL
            url = "http://suggestqueries.google.com/complete/search"
            params = {
                'client': 'firefox',
                'q': keyword
            }
            
            print(f"🔍 获取'{keyword}'的Google自动完成建议...")
            
            # 发送请求
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            # 解析响应
            suggestions_data = response.json()
            if len(suggestions_data) >= 2 and isinstance(suggestions_data[1], list):
                suggestions = suggestions_data[1][:max_suggestions]
                
                # 过滤和清理建议
                filtered_suggestions = []
                for suggestion in suggestions:
                    if isinstance(suggestion, str) and suggestion.strip():
                        # 移除Unicode转义字符
                        clean_suggestion = suggestion.encode().decode('unicode_escape')
                        filtered_suggestions.append(clean_suggestion)
                
                print(f"✅ 获取到{len(filtered_suggestions)}个自动完成建议")
                return filtered_suggestions
            else:
                print("⚠️ 没有获取到有效的自动完成建议")
                return []
                
        except Exception as e:
            print(f"❌ 获取Google自动完成建议失败: {e}")
            return []
    
    def expand_keywords_with_google(self, seed_keywords: List[str], max_per_keyword=5) -> Dict[str, List[str]]:
        """使用Google自动完成扩展种子关键词"""
        expanded_keywords = {}
        
        print(f"\n🚀 开始扩展{len(seed_keywords)}个种子关键词...")
        
        for i, keyword in enumerate(seed_keywords, 1):
            print(f"\n进度: {i}/{len(seed_keywords)} - 处理: {keyword}")
            
            suggestions = self.get_google_suggestions(keyword, max_per_keyword)
            if suggestions:
                expanded_keywords[keyword] = suggestions
            
            # 避免请求过于频繁
            if i < len(seed_keywords):
                time.sleep(1)  # 1秒延迟
        
        return expanded_keywords
    
    def generate_article_topics_by_category(self, expanded_keywords: Dict[str, List[str]], target_language="English") -> Dict[str, List[str]]:
        """根据扩展的关键词，按分类生成文章题目"""
        try:
            # 将所有关键词合并成一个列表用于AI分析
            all_keywords = []
            for seed_keyword, suggestions in expanded_keywords.items():
                all_keywords.append(seed_keyword)
                all_keywords.extend(suggestions)
            
            # 去重
            unique_keywords = list(set(all_keywords))
            keywords_text = '\n'.join(f"- {kw}" for kw in unique_keywords[:50])  # 限制关键词数量
            
            prompt = f"""你是一位专业的SEO内容策略师，专注于TwitterDown（Twitter视频下载器）相关的内容创作。

## 任务
基于以下扩展关键词，按照指定类别生成文章题目建议。

## 可用关键词：
{keywords_text}

## 文章类别要求：

### 🔍 搜索型关键词文章（每日3篇）
- 针对用户搜索意图，长尾关键词为主
- 如"how to download Twitter video on iPhone"
- 解决具体用户问题的文章
需要生成：3个题目

### 📘 教程型/列表型文章（每日1篇）  
- 增加分享率，适合内部链接
- 如"Top 5 Twitter Video Downloaders 2025"
- 比较、排行、完整指南类型
需要生成：1个题目

### 🌍 中英文对照内容（每日2-5篇）
- 一键双语输出，适配中英文流量，提升页面密度
- 同一主题的中英文版本
需要生成：3个题目（同一主题，但请同时提供中英文版本）

### 🧪 A/B测试型冷启动关键词（每日1-2篇）
- 每天试验冷门关键词，观察有无意外流量  
- 探索性的、新颖的角度
需要生成：2个题目

## 语言要求
{target_language}

## 输出格式
请使用以下格式：

===SEARCH_KEYWORDS_START===
[3个搜索型文章题目，每行一个]
===SEARCH_KEYWORDS_END===

===TUTORIAL_LISTS_START===
[1个教程型/列表型文章题目]
===TUTORIAL_LISTS_END===

===BILINGUAL_CONTENT_START===
[3个双语文章题目，格式：中文题目 | English Title]
===BILINGUAL_CONTENT_END===

===AB_TEST_KEYWORDS_START===
[2个A/B测试型文章题目，每行一个]
===AB_TEST_KEYWORDS_END===

请确保所有题目都与提供的关键词相关，具有SEO价值：

(唯一性标识: {int(time.time())})"""

            print(f"📝 基于扩展关键词生成分类文章题目...")
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.8,
                    top_k=40,
                    top_p=0.9
                )
            )
            
            if not response.text:
                raise ValueError("AI未能生成分类文章题目")
            
            # 解析分类题目
            categories = {
                'search_keywords': self._extract_category_topics(response.text, "===SEARCH_KEYWORDS_START===", "===SEARCH_KEYWORDS_END==="),
                'tutorial_lists': self._extract_category_topics(response.text, "===TUTORIAL_LISTS_START===", "===TUTORIAL_LISTS_END==="),
                'bilingual_content': self._extract_category_topics(response.text, "===BILINGUAL_CONTENT_START===", "===BILINGUAL_CONTENT_END==="),
                'ab_test_keywords': self._extract_category_topics(response.text, "===AB_TEST_KEYWORDS_START===", "===AB_TEST_KEYWORDS_END===")
            }
            
            print(f"✅ 成功生成分类文章题目:")
            for category, topics in categories.items():
                print(f"   {category}: {len(topics)}个题目")
            
            return categories
            
        except Exception as e:
            print(f"❌ 分类文章题目生成失败: {e}")
            return self._get_default_category_topics(target_language)
    
    def _extract_category_topics(self, content: str, start_delimiter: str, end_delimiter: str) -> List[str]:
        """从分隔符中提取分类题目"""
        try:
            start_idx = content.find(start_delimiter)
            end_idx = content.find(end_delimiter)
            
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                start_idx += len(start_delimiter)
                section_content = content[start_idx:end_idx].strip()
                
                # 解析题目
                topics = []
                lines = section_content.split('\n')
                for line in lines:
                    line = line.strip()
                    if line and not line.startswith('#') and not line.startswith('==='):
                        # 清理编号和符号
                        topic = re.sub(r'^\d+\.?\s*', '', line)
                        topic = re.sub(r'^[•\-\*]\s*', '', topic)
                        topic = topic.strip()
                        if topic:
                            topics.append(topic)
                
                return topics
            
            return []
            
        except Exception:
            return []
    
    def _get_default_seed_keywords(self, language: str, count: int) -> List[str]:
        """获取默认种子关键词"""
        if "chinese" in language.lower() or "中文" in language:
            default_keywords = [
                "twitter视频下载",
                "推特视频保存", 
                "社交媒体视频下载",
                "twitter下载器",
                "视频下载工具",
                "twitter保存",
                "推特视频",
                "下载twitter",
                "twitter视频",
                "社交视频下载"
            ]
        else:
            default_keywords = [
                "twitter video downloader",
                "download twitter video",
                "twitter video download",
                "twitter downloader",
                "save twitter video",
                "twitter video saver",
                "download from twitter",
                "twitter media download",
                "twitter video tool",
                "social media downloader"
            ]
        
        return default_keywords[:count]
    
    def _get_default_category_topics(self, language: str) -> Dict[str, List[str]]:
        """获取默认分类题目"""
        if "chinese" in language.lower() or "中文" in language:
            return {
                'search_keywords': [
                    "如何在iPhone上下载Twitter视频",
                    "Twitter视频下载器哪个最好用",
                    "免费下载Twitter视频的方法"
                ],
                'tutorial_lists': [
                    "2025年最佳Twitter视频下载工具TOP5"
                ],
                'bilingual_content': [
                    "Twitter视频下载完整指南 | Complete Twitter Video Download Guide",
                    "批量下载Twitter视频方法 | How to Bulk Download Twitter Videos",
                    "Twitter视频质量选择技巧 | Twitter Video Quality Selection Tips"
                ],
                'ab_test_keywords': [
                    "Twitter视频下载的法律问题解析",
                    "企业如何合规使用Twitter视频内容"
                ]
            }
        else:
            return {
                'search_keywords': [
                    "How to download Twitter videos on iPhone",
                    "Best Twitter video downloader 2024",
                    "Free Twitter video download methods"
                ],
                'tutorial_lists': [
                    "Top 5 Twitter Video Downloaders 2025"
                ],
                'bilingual_content': [
                    "Complete Twitter Video Download Guide | Twitter视频下载完整指南",
                    "How to Bulk Download Twitter Videos | 批量下载Twitter视频方法", 
                    "Twitter Video Quality Selection Tips | Twitter视频质量选择技巧"
                ],
                'ab_test_keywords': [
                    "Legal aspects of Twitter video downloading",
                    "Enterprise Twitter content management strategies"
                ]
            } 