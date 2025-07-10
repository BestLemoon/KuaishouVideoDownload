#!/usr/bin/env python3
"""
GitHub Actions 自动博客文章生成脚本 - 关键词驱动版本
"""
import os
import requests
import time
import random
import re
from datetime import datetime
from google.generativeai import configure, GenerativeModel
from supabase import create_client, Client
import uuid
from typing import List, Dict, Any

# 环境变量配置
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
UNSPLASH_ACCESS_KEY = os.getenv('UNSPLASH_ACCESS_KEY')
SITE_URL = os.getenv('NEXT_PUBLIC_WEB_URL', 'https://kuaishou-video-download.com')

# 初始化服务
configure(api_key=GEMINI_API_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def get_unsplash_image(query="short video"):
    """从Unsplash获取图片 - 优化为短视频相关关键词"""
    try:
        if not UNSPLASH_ACCESS_KEY:
            return "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80"

        # 短视频相关的关键词列表
        short_video_keywords = [
            "short video", "mobile video", "social media", "smartphone recording",
            "video content", "digital media", "content creation", "video editing",
            "mobile phone", "social network", "video streaming", "online video",
            "vertical video", "tiktok style", "video maker", "video production"
        ]

        # 随机选择一个短视频相关关键词，如果没有提供特定查询
        if query == "short video" or "kuaishou" in query.lower():
            query = random.choice(short_video_keywords)

        headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
        response = requests.get(
            f"https://api.unsplash.com/search/photos?query={query}&per_page=30&orientation=landscape",
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                photo = random.choice(data['results'])
                return f"{photo['urls']['regular']}?w=800&q=80"

        return "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80"
    except Exception as e:
        print(f"获取Unsplash图片失败: {e}")
        return "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80"

def generate_seed_keywords(language: str, count: int = 8) -> List[str]:
    """生成种子关键词"""
    model = GenerativeModel("gemini-2.5-flash-preview-05-20")
    
    prompt = f"""你是一位专业的SEO关键词研究专家，专注于快手视频下载相关的关键词研究。

## 任务
请为KuaishouVideoDownload（快手视频下载器）生成{count}个高价值的种子关键词。

## 关键词类型要求
请生成以下类型的关键词：
1. 🔍 搜索型关键词（用户直接搜索需求）
2. 📱 设备相关关键词（iPhone, Android, mobile等）
3. 📊 功能型关键词（batch download, HD quality等）
4. 💡 解决方案型关键词（how to, best way等）
5. 🌍 竞品和比较关键词（vs, alternative等）

## 目标语言
{language}

## 输出要求
- 直接输出{count}个关键词
- 每行一个关键词
- 不包含编号或符号
- 关键词应该具有搜索价值
- 避免过于宽泛或过于细分的词

请开始生成：

(唯一性标识: {int(time.time())})"""

    try:
        result = model.generate_content(prompt)
        if not result.text:
            raise ValueError("AI未能生成种子关键词")
        
        # 解析关键词
        keywords = []
        lines = result.text.strip().split('\n')
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
        print(f"✅ 生成了{len(keywords)}个{language}种子关键词")
        return keywords if keywords else get_default_seed_keywords(language, count)
        
    except Exception as e:
        print(f"❌ 种子关键词生成失败: {e}")
        return get_default_seed_keywords(language, count)

def get_default_seed_keywords(language: str, count: int) -> List[str]:
    """获取默认种子关键词"""
    if "chinese" in language.lower() or "中文" in language:
        default_keywords = [
            "快手视频下载",
            "快手视频保存",
            "快手短视频下载",
            "快手下载器",
            "快手视频下载工具",
            "快手视频保存",
            "快手短视频",
            "下载快手视频"
        ]
    else:
        default_keywords = [
            "kuaishou video downloader",
            "download kuaishou video",
            "kuaishou video download",
            "kuaishou downloader",
            "save kuaishou video",
            "kuaishou video saver",
            "download from kuaishou",
            "kuaishou media download"
        ]
    
    return default_keywords[:count]

def get_google_suggestions(keyword: str, max_suggestions: int = 8) -> List[str]:
    """使用Google自动完成API获取关键词建议"""
    try:
        url = "http://suggestqueries.google.com/complete/search"
        params = {
            'client': 'firefox',
            'q': keyword
        }
        
        print(f"🔍 获取'{keyword}'的Google自动完成建议...")
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
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

def expand_keywords_with_google(seed_keywords: List[str], max_per_keyword: int = 6) -> Dict[str, List[str]]:
    """使用Google自动完成扩展种子关键词"""
    expanded_keywords = {}
    
    print(f"\n🚀 开始扩展{len(seed_keywords)}个种子关键词...")
    
    for i, keyword in enumerate(seed_keywords, 1):
        print(f"\n进度: {i}/{len(seed_keywords)} - 处理: {keyword}")
        
        suggestions = get_google_suggestions(keyword, max_per_keyword)
        if suggestions:
            expanded_keywords[keyword] = suggestions
        
        # 避免请求过于频繁
        if i < len(seed_keywords):
            time.sleep(1)  # 1秒延迟
    
    return expanded_keywords

def generate_categorized_topics_by_keywords_with_count(expanded_keywords: Dict[str, List[str]], language: str, target_count: int) -> Dict[str, List[str]]:
    """根据扩展的关键词和目标数量，按分类生成文章题目"""
    model = GenerativeModel("gemini-2.5-flash-preview-05-20")

    # 将所有关键词合并成一个列表用于AI分析
    all_keywords = []
    for seed_keyword, suggestions in expanded_keywords.items():
        all_keywords.append(seed_keyword)
        all_keywords.extend(suggestions)

    # 去重
    unique_keywords = list(set(all_keywords))
    keywords_text = '\n'.join(f"- {kw}" for kw in unique_keywords[:50])  # 限制关键词数量

    # 根据目标数量分配文章类型
    if target_count <= 3:
        search_count = target_count
        tutorial_count = 0
        feature_count = 0
    elif target_count <= 5:
        search_count = target_count - 1
        tutorial_count = 1
        feature_count = 0
    elif target_count <= 8:
        search_count = target_count - 2
        tutorial_count = 1
        feature_count = 1
    else:
        search_count = target_count - 3
        tutorial_count = 2
        feature_count = 1

    prompt = f"""你是一位专业的SEO内容策略师，专注于KuaishouVideoDownload（快手视频下载器）相关的内容创作。

## 任务
基于以下扩展关键词，按照指定类别生成文章题目建议。

## 可用关键词：
{keywords_text}

## 文章类别要求：

### 🔍 搜索型关键词文章（需要{search_count}篇）
- 针对用户搜索意图，长尾关键词为主
- 如"how to download Kuaishou video on iPhone"
- 解决具体用户问题的文章
需要生成：{search_count}个题目

### 📘 教程型/列表型文章（需要{tutorial_count}篇）
- 增加分享率，适合内部链接
- 如"Top 5 Kuaishou Video Downloaders 2025"
- 比较、排行、完整指南类型
需要生成：{tutorial_count}个题目

### 🌍 功能介绍文章（需要{feature_count}篇）
- 介绍快手视频下载的各种功能和技巧
- 提升用户体验和产品认知
需要生成：{feature_count}个题目

## 语言要求
{language}

## 输出格式
请使用以下格式：

===SEARCH_KEYWORDS_START===
[{search_count}个搜索型文章题目，每行一个]
===SEARCH_KEYWORDS_END===

===TUTORIAL_LISTS_START===
[{tutorial_count}个教程型/列表型文章题目，每行一个]
===TUTORIAL_LISTS_END===

===FEATURE_CONTENT_START===
[{feature_count}个功能介绍文章题目，每行一个]
===FEATURE_CONTENT_END===

请确保所有题目都与提供的关键词相关，具有SEO价值：

(唯一性标识: {int(time.time())})"""

    try:
        result = model.generate_content(prompt)
        if not result.text:
            raise ValueError("AI未能生成分类文章题目")

        # 解析分类题目
        categories = {
            'search_keywords': extract_category_topics(result.text, "===SEARCH_KEYWORDS_START===", "===SEARCH_KEYWORDS_END==="),
            'tutorial_lists': extract_category_topics(result.text, "===TUTORIAL_LISTS_START===", "===TUTORIAL_LISTS_END==="),
            'feature_content': extract_category_topics(result.text, "===FEATURE_CONTENT_START===", "===FEATURE_CONTENT_END===")
        }

        print(f"✅ 成功生成分类文章题目:")
        for category, topics in categories.items():
            print(f"   {category}: {len(topics)}个题目")

        return categories

    except Exception as e:
        print(f"❌ 分类文章题目生成失败: {e}")
        return get_default_category_topics_with_count(language, target_count)

def generate_categorized_topics_by_keywords(expanded_keywords: Dict[str, List[str]], language: str) -> Dict[str, List[str]]:
    """根据扩展的关键词，按分类生成文章题目"""
    model = GenerativeModel("gemini-2.5-flash-preview-05-20")
    
    # 将所有关键词合并成一个列表用于AI分析
    all_keywords = []
    for seed_keyword, suggestions in expanded_keywords.items():
        all_keywords.append(seed_keyword)
        all_keywords.extend(suggestions)
    
    # 去重
    unique_keywords = list(set(all_keywords))
    keywords_text = '\n'.join(f"- {kw}" for kw in unique_keywords[:50])  # 限制关键词数量
    
    prompt = f"""你是一位专业的SEO内容策略师，专注于KuaishouVideoDownload（快手视频下载器）相关的内容创作。

## 任务
基于以下扩展关键词，按照指定类别生成文章题目建议。

## 可用关键词：
{keywords_text}

## 文章类别要求：

### 🔍 搜索型关键词文章（每日3篇）
- 针对用户搜索意图，长尾关键词为主
- 如"how to download Kuaishou video on iPhone"
- 解决具体用户问题的文章
需要生成：3个题目

### 📘 教程型/列表型文章（每日1篇）
- 增加分享率，适合内部链接
- 如"Top 5 Kuaishou Video Downloaders 2025"
- 比较、排行、完整指南类型
需要生成：1个题目

### 🌍 功能介绍文章（每日1篇）
- 介绍快手视频下载的各种功能和技巧
- 提升用户体验和产品认知
需要生成：1个题目

## 语言要求
{language}

## 输出格式
请使用以下格式：

===SEARCH_KEYWORDS_START===
[3个搜索型文章题目，每行一个]
===SEARCH_KEYWORDS_END===

===TUTORIAL_LISTS_START===
[1个教程型/列表型文章题目]
===TUTORIAL_LISTS_END===

===FEATURE_CONTENT_START===
[1个功能介绍文章题目]
===FEATURE_CONTENT_END===

请确保所有题目都与提供的关键词相关，具有SEO价值：

(唯一性标识: {int(time.time())})"""

    try:
        result = model.generate_content(prompt)
        if not result.text:
            raise ValueError("AI未能生成分类文章题目")
        
        # 解析分类题目
        categories = {
            'search_keywords': extract_category_topics(result.text, "===SEARCH_KEYWORDS_START===", "===SEARCH_KEYWORDS_END==="),
            'tutorial_lists': extract_category_topics(result.text, "===TUTORIAL_LISTS_START===", "===TUTORIAL_LISTS_END==="),
            'feature_content': extract_category_topics(result.text, "===FEATURE_CONTENT_START===", "===FEATURE_CONTENT_END===")
        }
        
        print(f"✅ 成功生成分类文章题目:")
        for category, topics in categories.items():
            print(f"   {category}: {len(topics)}个题目")
        
        return categories
        
    except Exception as e:
        print(f"❌ 分类文章题目生成失败: {e}")
        return get_default_category_topics(language)

def extract_category_topics(content: str, start_delimiter: str, end_delimiter: str) -> List[str]:
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

def get_default_category_topics_with_count(language: str, target_count: int) -> Dict[str, List[str]]:
    """根据目标数量获取默认分类题目"""
    # 根据语言获取基础题目模板
    if "hindi" in language.lower() or "हिंदी" in language:
        base_topics = {
            'search_keywords': [
                "कुआईशौ वीडियो डाउनलोड कैसे करें",
                "iPhone पर कुआईशौ वीडियो डाउनलोड करने का तरीका",
                "बिना वॉटरमार्क कुआईशौ वीडियो डाउनलोड",
                "कुआईशौ वीडियो डाउनलोडर ऐप",
                "मुफ्त कुआईशौ वीडियो डाउनलोड",
                "Android पर कुआईशौ वीडियो सेव करें",
                "कुआईशौ से HD वीडियो डाउनलोड",
                "कुआईशौ वीडियो ऑनलाइन डाउनलोड"
            ],
            'tutorial_lists': [
                "2025 के बेस्ट कुआईशौ वीडियो डाउनलोडर",
                "कुआईशौ वीडियो डाउनलोड के 5 आसान तरीके"
            ],
            'feature_content': [
                "कुआईशौ वीडियो डाउनलोड फीचर्स की जानकारी",
                "कुआईशौ डाउनलोडर की विशेषताएं"
            ]
        }
    elif "urdu" in language.lower() or "اردو" in language:
        base_topics = {
            'search_keywords': [
                "Kuaishou video download kaise kare",
                "iPhone mein Kuaishou video download",
                "Kuaishou video downloader app",
                "Free Kuaishou video download",
                "Android mein Kuaishou video save",
                "HD Kuaishou video download",
                "Online Kuaishou video download"
            ],
            'tutorial_lists': [
                "Best Kuaishou Video Downloaders 2025",
                "Kuaishou Video Download ke 5 Tarike"
            ],
            'feature_content': [
                "Kuaishou Video Download Features"
            ]
        }
    elif "indonesian" in language.lower() or "bahasa" in language.lower():
        base_topics = {
            'search_keywords': [
                "Cara download video Kuaishou",
                "Download video Kuaishou di iPhone",
                "Aplikasi download video Kuaishou",
                "Download video Kuaishou gratis",
                "Simpan video Kuaishou di Android",
                "Download video Kuaishou HD",
                "Download video Kuaishou online"
            ],
            'tutorial_lists': [
                "5 Aplikasi Download Video Kuaishou Terbaik 2025",
                "Cara Download Video Kuaishou Tanpa Watermark"
            ],
            'feature_content': [
                "Fitur Download Video Kuaishou"
            ]
        }
    elif "chinese" in language.lower() or "中文" in language:
        base_topics = {
            'search_keywords': [
                "如何在iPhone上下载快手视频",
                "快手视频下载器哪个最好用",
                "免费下载快手视频的方法",
                "安卓手机下载快手视频",
                "快手视频无水印下载",
                "在线快手视频下载工具",
                "快手短视频保存方法"
            ],
            'tutorial_lists': [
                "2025年最佳快手视频下载工具TOP5",
                "快手视频下载完整教程"
            ],
            'feature_content': [
                "快手视频下载功能详解"
            ]
        }
    else:  # English
        base_topics = {
            'search_keywords': [
                "How to download Kuaishou videos on iPhone",
                "Best Kuaishou video downloader 2024",
                "Free Kuaishou video download methods",
                "Download Kuaishou videos on Android",
                "Kuaishou video downloader without watermark",
                "Online Kuaishou video download tool",
                "Save Kuaishou videos to phone"
            ],
            'tutorial_lists': [
                "Top 5 Kuaishou Video Downloaders 2025",
                "Complete Guide to Kuaishou Video Download"
            ],
            'feature_content': [
                "Kuaishou Video Download Features Explained"
            ]
        }

    # 根据目标数量分配题目
    if target_count <= 3:
        search_count = target_count
        tutorial_count = 0
        feature_count = 0
    elif target_count <= 5:
        search_count = target_count - 1
        tutorial_count = 1
        feature_count = 0
    elif target_count <= 8:
        search_count = target_count - 2
        tutorial_count = 1
        feature_count = 1
    else:
        search_count = target_count - 3
        tutorial_count = 2
        feature_count = 1

    return {
        'search_keywords': base_topics['search_keywords'][:search_count],
        'tutorial_lists': base_topics['tutorial_lists'][:tutorial_count],
        'feature_content': base_topics['feature_content'][:feature_count]
    }

def get_default_category_topics(language: str) -> Dict[str, List[str]]:
    """获取默认分类题目"""
    return get_default_category_topics_with_count(language, 5)

def build_keywords_context(expanded_keywords: Dict[str, List[str]]) -> str:
    """构建关键词上下文字符串"""
    context_lines = []
    context_lines.append("相关关键词集合:")
    
    for seed, suggestions in expanded_keywords.items():
        context_lines.append(f"• {seed}")
        for suggestion in suggestions[:5]:  # 每个种子词最多5个建议
            context_lines.append(f"  - {suggestion}")
    
    return '\n'.join(context_lines)

def extract_delimiter_content(text, start_delimiter, end_delimiter):
    """提取分隔符之间的内容，并进行清理"""
    start_index = text.find(start_delimiter)
    if start_index == -1:
        return None
    start_index += len(start_delimiter)

    end_index = text.find(end_delimiter, start_index)
    if end_index == -1:
        return None

    content = text[start_index:end_index].strip()

    # 清理可能残留的格式标记
    content = clean_content_markers(content)

    return content

def clean_content_markers(content):
    """清理内容中的格式标记"""
    import re

    # 移除所有===标记
    content = re.sub(r'===.*?===', '', content, flags=re.DOTALL)

    # 移除多余的空行
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

    # 清理开头和结尾的空白
    content = content.strip()

    return content

def validate_and_clean_content(content, content_type="content"):
    """验证并清理内容，确保没有格式标记"""
    if not content:
        return content

    # 检查是否包含格式标记
    if "===" in content:
        print(f"⚠️ 检测到{content_type}中包含格式标记，正在清理...")
        content = clean_content_markers(content)
        print(f"✅ {content_type}清理完成")

    return content

def final_content_validation(title, description, content):
    """最终内容验证，确保所有内容都符合要求"""
    issues = []

    # 检查是否包含格式标记
    for field_name, field_content in [("标题", title), ("描述", description), ("内容", content)]:
        if field_content and "===" in field_content:
            issues.append(f"{field_name}包含格式标记")

    # 检查内容长度
    if not content or len(content.strip()) < 100:
        issues.append("内容过短")

    # 检查标题长度
    if not title or len(title.strip()) < 5:
        issues.append("标题过短")

    # 检查描述长度
    if not description or len(description.strip()) < 20:
        issues.append("描述过短")

    # 检查是否包含品牌相关内容
    brand_keywords = ["kuaishou", "快手", "video", "download"]
    content_lower = content.lower() if content else ""
    if not any(keyword in content_lower for keyword in brand_keywords):
        issues.append("内容缺少品牌相关关键词")

    if issues:
        return {
            "valid": False,
            "reason": "; ".join(issues)
        }

    return {
        "valid": True,
        "reason": "内容验证通过"
    }

def generate_slug(title):
    """生成URL友好的slug"""
    import re
    slug = title.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug.strip('-')

def generate_unique_slug(base_slug, locale):
    """生成唯一的slug"""
    slug = base_slug
    counter = 1
    
    while True:
        result = supabase.table("posts").select("slug").eq("slug", slug).eq("locale", locale).execute()
        if not result.data:
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    return slug

def generate_article(topic, language, locale, keywords_context=""):
    """生成单篇文章，带重试机制"""
    max_retries = 2  # 最多重试2次

    for attempt in range(max_retries + 1):
        try:
            if attempt > 0:
                print(f"🔄 第{attempt + 1}次尝试生成文章: {topic}")

            return _generate_article_attempt(topic, language, locale, keywords_context)

        except Exception as e:
            error_msg = str(e)
            if "格式标记" in error_msg and attempt < max_retries:
                print(f"⚠️ 第{attempt + 1}次尝试失败（格式标记问题），准备重试...")
                continue
            else:
                # 最后一次尝试失败，或者非格式标记问题
                print(f"❌ {language}文章生成失败 '{topic}': {e}")
                return {
                    "success": False,
                    "topic": topic,
                    "error": str(e),
                }

def _generate_article_attempt(topic, language, locale, keywords_context=""):
    """单次文章生成尝试"""
    print(f"正在生成{language}文章: {topic}")

    # 获取现有文章作为内链参考
    existing_posts = supabase.table("posts").select("title, slug, locale").eq("status", "online").eq("locale", locale).limit(10).execute()

    internal_links_text = ""
    if existing_posts.data:
        if locale == "en":
            internal_links_text = "\n## Existing Articles (for internal linking):\n"
            for post in existing_posts.data:
                url = f"{SITE_URL}/posts/{post['slug']}"
                internal_links_text += f"- [{post['title']}]({url})\n"
        else:
            internal_links_text = "\n## 现有文章列表（用于内链参考）：\n"
            for post in existing_posts.data:
                url = f"{SITE_URL}/zh/posts/{post['slug']}"
                internal_links_text += f"- [{post['title']}]({url})\n"

    model = GenerativeModel("gemini-2.5-flash-preview-05-20")

    # 构建关键词上下文
    keywords_section = ""
    if keywords_context:
        keywords_section = f"""

## 关键词优化指导
基于以下相关关键词优化你的内容：
{keywords_context}

**关键词使用要求：**
- 自然地将这些关键词融入文章中
- 在标题、小标题和正文中合理分布关键词
- 确保关键词使用不影响内容的自然性和可读性
- 优先使用长尾关键词和语义相关的词汇"""

    # 根据语言和地区设置提示词
    if locale == "en":
        prompt = f"""You are a professional SEO content creator specializing in KuaishouVideoDownload (Kuaishou video downloader) related content.

## Task
Please create a high-quality SEO blog article for this topic: {topic}

## Requirements
- Article length: 1000-1500 words
- Language: English
- Natural, fluent writing style that avoids AI-generated traces
- Use Markdown format
- Include proper heading structure (H1, H2, H3)
- Must include at least 3 internal links to our existing related articles
- Include 2-3 high-quality external links (to authoritative websites)
- SEO optimized with naturally integrated relevant keywords

{internal_links_text}

{keywords_section}

## Internal Link Requirements
- Must naturally insert at least 3 links to the above existing articles within the content
- Internal links should be relevant to the article content and naturally integrated into paragraphs
- Use descriptive anchor text, not just "click here"
- Link format: [anchor text](URL)

## External Link Requirements
- Include 2-3 links to authoritative websites
- External links should be related to Kuaishou, video downloading, social media
- Add appropriate context for external links

## Output Format
Use the following delimiter format:

===TITLE_START===
[SEO-optimized title, max 60 characters]
===TITLE_END===

===SLUG_START===
[URL-friendly English slug, e.g., kuaishou-video-download-guide]
===SLUG_END===

===DESCRIPTION_START===
[Meta description, 150-160 characters, engaging summary]
===DESCRIPTION_END===

===CONTENT_START===
[Complete article content in Markdown format, must include at least 3 internal links and 2-3 external links]
===CONTENT_END===

Please generate natural, fluent content that avoids obvious AI-generated traces:

(Internal note for uniqueness: {int(time.time())})"""

    elif locale == "hi":
        prompt = f"""आप एक पेशेवर SEO कंटेंट क्रिएटर हैं जो KuaishouVideoDownload (कुआईशौ वीडियो डाउनलोडर) संबंधित कंटेंट में विशेषज्ञ हैं।

## कार्य
इस विषय पर एक उच्च गुणवत्ता वाला SEO ब्लॉग लेख बनाएं: {topic}

## आवश्यकताएं
- लेख की लंबाई: 1000-1500 शब्द
- भाषा: हिंदी
- प्राकृतिक, धाराप्रवाह लेखन शैली जो AI-जनरेटेड निशान से बचे
- Markdown फॉर्मेट का उपयोग करें
- उचित शीर्षक संरचना शामिल करें (H1, H2, H3)
- हमारे मौजूदा संबंधित लेखों के लिए कम से कम 3 आंतरिक लिंक शामिल करना आवश्यक है
- 2-3 उच्च गुणवत्ता वाले बाहरी लिंक शामिल करें (प्राधिकरण वेबसाइटों के लिए)
- प्रासंगिक कीवर्ड के साथ SEO अनुकूलित

{internal_links_text}

{keywords_section}

## आंतरिक लिंक आवश्यकताएं
- कंटेंट में उपरोक्त मौजूदा लेखों के लिए कम से कम 3 लिंक प्राकृतिक रूप से डालना आवश्यक है
- आंतरिक लिंक लेख कंटेंट से संबंधित होने चाहिए और पैराग्राफ में प्राकृतिक रूप से एकीकृत होने चाहिए
- वर्णनात्मक एंकर टेक्स्ट का उपयोग करें, केवल "यहां क्लिक करें" नहीं
- लिंक फॉर्मेट: [एंकर टेक्स्ट](URL)

## बाहरी लिंक आवश्यकताएं
- प्राधिकरण वेबसाइटों के लिए 2-3 लिंक शामिल करें
- बाहरी लिंक कुआईशौ, वीडियो डाउनलोडिंग, सोशल मीडिया से संबंधित होने चाहिए
- बाहरी लिंक के लिए उचित संदर्भ जोड़ें

## आउटपुट फॉर्मेट
निम्नलिखित डिलिमिटर फॉर्मेट का उपयोग करें:

===TITLE_START===
[SEO-अनुकूलित शीर्षक, अधिकतम 60 वर्ण]
===TITLE_END===

===SLUG_START===
[URL-फ्रेंडली अंग्रेजी slug, जैसे: kuaishou-video-download-hindi-guide]
===SLUG_END===

===DESCRIPTION_START===
[मेटा विवरण, 150-160 वर्ण, आकर्षक सारांश]
===DESCRIPTION_END===

===CONTENT_START===
[Markdown फॉर्मेट में पूरा लेख कंटेंट, कम से कम 3 आंतरिक लिंक और 2-3 बाहरी लिंक शामिल करना आवश्यक है]
===CONTENT_END===

कृपया प्राकृतिक, धाराप्रवाह कंटेंट बनाएं जो स्पष्ट AI-जनरेटेड निशान से बचे:

(विशिष्टता के लिए आंतरिक नोट: {int(time.time())})"""

    elif locale == "bn":
        prompt = f"""آپ ایک پیشہ ور SEO کنٹینٹ کریٹر ہیں جو KuaishouVideoDownload (کوائی شو ویڈیو ڈاؤن لوڈر) سے متعلق کنٹینٹ میں مہارت رکھتے ہیں۔

## کام
اس موضوع پر ایک اعلیٰ معیار کا SEO بلاگ مضمون بنائیں: {topic}

## ضروریات
- مضمون کی لمبائی: 1000-1500 الفاظ
- زبان: اردو
- قدرتی، روانی سے لکھنے کا انداز جو AI-generated نشانات سے بچے
- Markdown فارمیٹ استعمال کریں
- مناسب عنوان کی ساخت شامل کریں (H1, H2, H3)
- ہمارے موجودہ متعلقہ مضامین کے لیے کم از کم 3 اندرونی لنکس شامل کرنا ضروری ہے
- 2-3 اعلیٰ معیار کے بیرونی لنکس شامل کریں (مستند ویب سائٹس کے لیے)
- متعلقہ کلیدی الفاظ کے ساتھ SEO کے لیے موزوں

{internal_links_text}

{keywords_section}

## اندرونی لنک کی ضروریات
- کنٹینٹ میں اوپر دیے گئے موجودہ مضامین کے لیے کم از کم 3 لنکس قدرتی طور پر داخل کرنا ضروری ہے
- اندرونی لنکس مضمون کے کنٹینٹ سے متعلق ہونے چاہیے اور پیراگرافس میں قدرتی طور پر شامل ہونے چاہیے
- وضاحتی anchor text استعمال کریں، صرف "یہاں کلک کریں" نہیں
- لنک فارمیٹ: [anchor text](URL)

## بیرونی لنک کی ضروریات
- مستند ویب سائٹس کے لیے 2-3 لنکس شامل کریں
- بیرونی لنکس کوائی شو، ویڈیو ڈاؤن لوڈنگ، سوشل میڈیا سے متعلق ہونے چاہیے
- بیرونی لنکس کے لیے مناسب سیاق و سباق شامل کریں

## آؤٹ پٹ فارمیٹ
مندرجہ ذیل delimiter فارمیٹ استعمال کریں:

===TITLE_START===
[SEO کے لیے موزوں عنوان، زیادہ سے زیادہ 60 حروف]
===TITLE_END===

===SLUG_START===
[URL-friendly انگریزی slug، جیسے: kuaishou-video-download-bengali-guide]
===SLUG_END===

===DESCRIPTION_START===
[میٹا تفصیل، 150-160 حروف، دلچسپ خلاصہ]
===DESCRIPTION_END===

===CONTENT_START===
[Markdown فارمیٹ میں مکمل مضمون کا کنٹینٹ، کم از کم 3 اندرونی لنکس اور 2-3 بیرونی لنکس شامل کرنا ضروری ہے]
===CONTENT_END===

براہ کرم قدرتی، روانی والا کنٹینٹ بنائیں جو واضح AI-generated نشانات سے بچے:

(منفردیت کے لیے اندرونی نوٹ: {int(time.time())})"""

    elif locale == "id":
        prompt = f"""Anda adalah seorang pembuat konten SEO profesional yang mengkhususkan diri dalam konten terkait KuaishouVideoDownload (pengunduh video Kuaishou).

## Tugas
Buatlah artikel blog SEO berkualitas tinggi untuk topik ini: {topic}

## Persyaratan
- Panjang artikel: 1000-1500 kata
- Bahasa: Bahasa Indonesia
- Gaya penulisan yang alami dan lancar yang menghindari jejak AI-generated
- Gunakan format Markdown
- Sertakan struktur judul yang tepat (H1, H2, H3)
- Harus menyertakan setidaknya 3 tautan internal ke artikel terkait yang sudah ada
- Sertakan 2-3 tautan eksternal berkualitas tinggi (ke situs web otoritatif)
- Dioptimalkan SEO dengan kata kunci relevan yang terintegrasi secara alami

{internal_links_text}

{keywords_section}

## Persyaratan Tautan Internal
- Harus secara alami menyisipkan setidaknya 3 tautan ke artikel yang sudah ada di atas dalam konten
- Tautan internal harus relevan dengan konten artikel dan terintegrasi secara alami ke dalam paragraf
- Gunakan anchor text yang deskriptif, bukan hanya "klik di sini"
- Format tautan: [anchor text](URL)

## Persyaratan Tautan Eksternal
- Sertakan 2-3 tautan ke situs web otoritatif
- Tautan eksternal harus terkait dengan Kuaishou, pengunduhan video, media sosial
- Tambahkan konteks yang tepat untuk tautan eksternal

## Format Output
Gunakan format delimiter berikut:

===TITLE_START===
[Judul yang dioptimalkan SEO, maksimal 60 karakter]
===TITLE_END===

===SLUG_START===
[Slug bahasa Inggris yang ramah URL, misalnya: kuaishou-video-download-indonesian-guide]
===SLUG_END===

===DESCRIPTION_START===
[Deskripsi meta, 150-160 karakter, ringkasan yang menarik]
===DESCRIPTION_END===

===CONTENT_START===
[Konten artikel lengkap dalam format Markdown, harus menyertakan setidaknya 3 tautan internal dan 2-3 tautan eksternal]
===CONTENT_END===

Harap buat konten yang alami dan lancar yang menghindari jejak AI-generated yang jelas:

(Catatan internal untuk keunikan: {int(time.time())})"""

    else:  # Default to Chinese
        prompt = f"""你是一位资深的SEO文章创作者，专注于 KuaishouVideoDownload（快手视频下载器）相关内容创作。

        ## 任务
        请为以下题目创作一篇高质量的SEO博客文章：{topic}

        ## 要求
        - 文章长度：1000-1500字
        - 语言：中文
        - 自然流畅的写作风格，避免AI生成的痕迹
        - 使用Markdown格式
        - 包含合适的标题结构（H1、H2、H3）
        - 必须包含至少3个内部链接到我们现有的相关文章
        - 包含2-3个高质量的外部链接（指向权威网站）
        - SEO优化，自然融入相关关键词

        {internal_links_text}

        {keywords_section}

        ## 内链要求
        - 必须在内容中自然插入至少3个指向上述现有文章的链接
        - 内链应与文章内容相关，自然融入到段落中
        - 使用描述性锚文本，不要只是"点击这里"
        - 链接格式：[锚文本](URL)

        ## 外链要求
        - 包含2-3个指向权威网站的链接
        - 外链应与快手、视频下载、社交媒体相关
        - 为外链添加适当的上下文

        ## 输出格式
        使用以下分隔符格式：

        ===TITLE_START===
        [SEO优化的标题，最多60个字符]
        ===TITLE_END===

        ===SLUG_START===
        [URL友好的英语slug，例如：kuaishou-video-download-chinese-guide]
        ===SLUG_END===

        ===DESCRIPTION_START===
        [元描述，150-160字符，吸引人的摘要]
        ===DESCRIPTION_END===

        ===CONTENT_START===
        [完整的文章内容，Markdown格式，必须包含至少3个内链和2-3个外链]
        ===CONTENT_END===

        请生成自然、流畅的内容，避免明显的AI生成痕迹：

        (内部唯一性标识: {int(time.time())})"""

    result = model.generate_content(prompt)
    text = result.text

    if not text:
        raise Exception("AI未能生成有效内容")

    # 调试：显示原始响应的前几行
    print(f"🔍 原始AI响应预览:")
    preview_lines = text.split('\n')[:5]
    for i, line in enumerate(preview_lines, 1):
        print(f"   {i}. {line[:100]}{'...' if len(line) > 100 else ''}")

    # 解析生成的内容
    title = extract_delimiter_content(text, "===TITLE_START===", "===TITLE_END===") or topic
    slug = extract_delimiter_content(text, "===SLUG_START===", "===SLUG_END===") or generate_slug(title)
    description = extract_delimiter_content(text, "===DESCRIPTION_START===", "===DESCRIPTION_END===") or f"关于{title}的详细指南"
    content = extract_delimiter_content(text, "===CONTENT_START===", "===CONTENT_END===")

    # 如果内容解析失败，使用原始文本但进行清理
    if not content:
        print("⚠️ 内容解析失败，使用原始文本并清理格式标记")
        content = clean_content_markers(text)

    # 二次验证和清理所有字段
    title = validate_and_clean_content(title, "标题")
    description = validate_and_clean_content(description, "描述")
    content = validate_and_clean_content(content, "内容")

    # 确保内容不为空
    if not content or len(content.strip()) < 100:
        raise Exception("生成的内容过短或为空")

    # 最终安全检查 - 如果检测到格式标记，直接重新生成
    if "===" in content or "===" in title or "===" in description:
        print("⚠️ 检测到格式标记残留，重新生成文章...")
        raise Exception("内容包含格式标记，需要重新生成")

    # 其他验证
    final_validation_result = final_content_validation(title, description, content)
    if not final_validation_result["valid"]:
        raise Exception(f"内容验证失败: {final_validation_result['reason']}")

    # 生成唯一slug
    final_slug = generate_unique_slug(slug, locale)

    # 获取封面图片 - 使用短视频相关关键词
    cover_url = get_unsplash_image("short video")

    # 为文章添加随机的时间偏移，让发布时间更自然
    publish_time = datetime.now()
    random_hours_back = random.randint(1, 72)
    random_minutes_back = random.randint(1, 60)
    publish_time = publish_time.replace(hour=max(0, publish_time.hour - random_hours_back % 24))
    publish_time = publish_time.replace(minute=max(0, publish_time.minute - random_minutes_back % 60))

    # 插入到数据库
    post_uuid = str(uuid.uuid4())
    insert_data = {
            "uuid": post_uuid,
            "slug": final_slug,
            "title": title,
            "description": description,
            "content": content,
            "cover_url": cover_url,
            "created_at": publish_time.isoformat(),
            "updated_at": publish_time.isoformat(),
            "status": "online",
            "locale": locale,
            "author_name": "KuaishouVideoDownload Team",
            "author_avatar_url": "https://www.kuaishou-video-download.com/logo.png"
        }

    result = supabase.table("posts").insert(insert_data).execute()

    if result.data:
        print(f"✅ {language}文章生成成功: {title}")
        return {
            "success": True,
            "topic": topic,
            "title": title,
            "uuid": post_uuid,
            "slug": final_slug,
            "cover_url": cover_url,
        }
    else:
        raise Exception("数据库插入失败")

def generate_keyword_driven_articles(language: str, locale: str, target_count: int = 5) -> Dict[str, Any]:
    """关键词驱动的文章生成流程"""
    try:
        print(f"\n🎯 开始{language}关键词驱动的内容生成流程（目标：{target_count}篇）...")

        # 步骤1: 生成种子关键词
        print(f"\n📊 步骤1: 生成{language}种子关键词")
        seed_keywords = generate_seed_keywords(language, max(6, target_count))

        if not seed_keywords:
            print(f"❌ {language}种子关键词生成失败")
            return {"success": 0, "failure": 0, "topics": [], "results": []}

        print(f"🔑 {language}种子关键词:")
        for i, keyword in enumerate(seed_keywords, 1):
            print(f"   {i}. {keyword}")

        # 步骤2: 使用Google自动完成扩展关键词
        print(f"\n🔍 步骤2: 扩展{language}关键词")
        expanded_keywords = expand_keywords_with_google(seed_keywords, 5)

        print(f"\n📈 {language}扩展后的关键词集合:")
        total_keywords = 0
        for seed, suggestions in expanded_keywords.items():
            print(f"   🌱 {seed}: {len(suggestions)}个建议")
            total_keywords += len(suggestions)
        print(f"   总计: {len(seed_keywords)}个种子关键词 → {total_keywords}个扩展关键词")

        # 步骤3: 基于关键词生成分类文章题目
        print(f"\n📝 步骤3: 生成{language}分类文章题目")
        categorized_topics = generate_categorized_topics_by_keywords_with_count(expanded_keywords, language, target_count)

        print(f"\n📚 {language}生成的分类文章题目:")
        all_topics = []
        for category, topics in categorized_topics.items():
            print(f"   📂 {category}: {len(topics)}个题目")
            for topic in topics:
                print(f"      • {topic}")
                all_topics.append((category, topic))

        # 限制文章数量到目标数量
        if len(all_topics) > target_count:
            all_topics = all_topics[:target_count]
            print(f"📏 限制文章数量到目标数量: {target_count}篇")

        # 步骤4: 执行文章生成
        print(f"\n🚀 步骤4: 开始生成{language}文章...")

        # 构建关键词上下文
        keywords_context = build_keywords_context(expanded_keywords)

        results = []
        success_count = 0
        failure_count = 0

        for category, topic in all_topics:
            topic_to_use = topic

            print(f"\n📝 生成文章: {topic_to_use} (分类: {category})")
            result = generate_article(topic_to_use, language, locale, keywords_context)
            results.append(result)

            if result["success"]:
                success_count += 1
                print(f"✅ 成功: {result['title']}")
            else:
                failure_count += 1
                print(f"❌ 失败: {result.get('error', '未知错误')}")

            # 延迟避免API限制
            time.sleep(3)

        print(f"\n🎉 {language}关键词驱动生成完成!")
        print(f"   📊 种子关键词: {len(seed_keywords)} 个")
        print(f"   🔍 扩展关键词: {total_keywords} 个")
        print(f"   📝 成功生成文章: {success_count} 篇")
        print(f"   ❌ 失败: {failure_count} 篇")

        return {
            "success": success_count,
            "failure": failure_count,
            "topics": [topic for _, topic in all_topics],
            "results": results,
            "seed_keywords": seed_keywords,
            "expanded_keywords": expanded_keywords,
            "categorized_topics": categorized_topics
        }

    except Exception as e:
        print(f"❌ {language}关键词驱动生成失败: {e}")
        return {"success": 0, "failure": 0, "topics": [], "results": []}

def main():
    """主函数 - 英文文章生成"""
    print("🚀 开始执行每日英文文章生成任务")
    print("📋 生成计划:")
    print("   🇺🇸 英语: 10篇")
    print("=" * 60)

    # 生成英文文章 (10篇)
    print("\n🇺🇸 开始英文关键词驱动生成...")
    english_results = generate_keyword_driven_articles("English", "en", 10)

    print(f"\n🎉 每日英文文章生成任务完成!")
    print("=" * 60)
    print(f"📊 统计结果:")
    print(f"   🇺🇸 英文: 成功 {english_results['success']} 篇，失败 {english_results['failure']} 篇")

    # 记录任务执行日志到数据库
    try:
        log_data = {
            "execution_date": datetime.now().date().isoformat(),
            "english_success": english_results["success"],
            "english_failure": english_results["failure"],
            "hindi_success": 0,
            "hindi_failure": 0,
            "bengali_success": 0,
            "bengali_failure": 0,
            "indonesian_success": 0,
            "indonesian_failure": 0,
            "total_success": english_results["success"],
            "total_failure": english_results["failure"],
            "generation_method": "keyword_driven_english_only",
            "created_at": datetime.now().isoformat()
        }
        supabase.table("auto_generation_logs").insert(log_data).execute()
        print(f"✅ 执行日志已记录到数据库")
    except Exception as log_error:
        print(f"⚠️ 日志记录失败（不影响主要功能）: {log_error}")

    return english_results

if __name__ == "__main__":
    import sys

    # 支持命令行参数
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()

        if command == "keywords":
            # 关键词驱动模式
            language = sys.argv[2] if len(sys.argv) > 2 else "all"
            count = int(sys.argv[3]) if len(sys.argv) > 3 else None

            print("🚀 启动关键词驱动文章生成模式")
            print(f"🌍 目标语言: {language}")
            if count:
                print(f"📊 目标数量: {count}篇")

            if language.lower() in ["chinese", "zh", "中文"]:
                target_count = count or 5
                print(f"\n🇨🇳 仅生成中文内容({target_count}篇)...")
                result = generate_keyword_driven_articles("Chinese (Simplified)", "zh", target_count)
                print(f"✅ 中文生成完成: 成功 {result['success']} 篇")
            elif language.lower() in ["english", "en", "英文"]:
                target_count = count or 10  # 默认改为10篇
                print(f"\n🇺🇸 仅生成英文内容({target_count}篇)...")
                result = generate_keyword_driven_articles("English", "en", target_count)
                print(f"✅ 英文生成完成: 成功 {result['success']} 篇")
            elif language.lower() in ["hindi", "hi", "हिंदी"]:
                target_count = count or 8
                print(f"\n🇮🇳 仅生成印地语内容({target_count}篇)...")
                result = generate_keyword_driven_articles("Hindi", "hi", target_count)
                print(f"✅ 印地语生成完成: 成功 {result['success']} 篇")
            elif language.lower() in ["urdu", "ur", "bn", "اردو"]:
                target_count = count or 3
                print(f"\n🇵🇰 仅生成乌尔都语内容({target_count}篇)...")
                result = generate_keyword_driven_articles("Urdu", "bn", target_count)
                print(f"✅ 乌尔都语生成完成: 成功 {result['success']} 篇")
            elif language.lower() in ["indonesian", "id", "bahasa"]:
                target_count = count or 3
                print(f"\n🇮🇩 仅生成印尼语内容({target_count}篇)...")
                result = generate_keyword_driven_articles("Indonesian", "id", target_count)
                print(f"✅ 印尼语生成完成: 成功 {result['success']} 篇")
            else:
                # 默认只生成英文
                target_count = count or 10
                print(f"\n🇺🇸 默认生成英文内容({target_count}篇)...")
                result = generate_keyword_driven_articles("English", "en", target_count)
                print(f"✅ 英文生成完成: 成功 {result['success']} 篇")
        else:
            print(f"❌ 未知命令: {command}")
            print("💡 可用命令:")
            print("   python auto_generate_articles.py keywords [language] [count]")
            print("   language 可选值:")
            print("     - english/en/英文 (默认10篇)")
            print("     - hindi/hi/हिंदी (默认8篇)")
            print("     - urdu/ur/bn/اردو (默认3篇)")
            print("     - indonesian/id/bahasa (默认3篇)")
            print("     - chinese/zh/中文 (默认5篇)")
            print("   count: 可选，指定生成文章数量")
            print("   示例:")
            print("     python auto_generate_articles.py keywords english 10")
            print("     python auto_generate_articles.py keywords english 15")
    else:
        # 默认执行关键词驱动的英文生成
        main()