#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Language Detector for Multilingual SEO Blog Generator
检测关键词语言并与网站支持的语言进行匹配
"""

import re
import unicodedata
from typing import List, Dict, Set, Tuple

class LanguageDetector:
    def __init__(self):
        """初始化语言检测器"""
        # 网站支持的语言及其映射
        self.supported_locales = {
            'en': 'English',
            'zh': 'Chinese (Simplified)',
            'zh-tw': 'Chinese (Traditional)',
            'ko': 'Korean',
            'ja': 'Japanese',
            'fr': 'French',
            'es': 'Spanish',
            'ar': 'Arabic',
            'de': 'German'
        }
        
        # 语言检测规则
        self.language_patterns = {
            'en': {
                'script': 'latin',
                'keywords': ['download', 'twitter', 'video', 'online', 'free', 'save', 'downloader', 'link']
            },
            'zh': {
                'script': 'cjk',
                'keywords': ['下载', '推特', '视频', '在线', '免费', '保存', '下载器', '链接']
            },
            'zh-tw': {
                'script': 'cjk',
                'keywords': ['下載', '推特', '影片', '線上', '免費', '儲存', '下載器', '連結']
            },
            'ko': {
                'script': 'hangul',
                'keywords': ['다운로드', '트위터', '비디오', '온라인', '무료', '저장', '다운로더', '링크', '동영상', '다운']
            },
            'ja': {
                'script': 'cjk',
                'keywords': ['ダウンロード', 'ツイッター', 'ビデオ', 'オンライン', '無料', '保存', 'ダウンローダー', 'リンク']
            },
            'fr': {
                'script': 'latin',
                'keywords': ['télécharger', 'twitter', 'vidéo', 'en ligne', 'gratuit', 'sauvegarder', 'téléchargeur', 'lien']
            },
            'es': {
                'script': 'latin',
                'keywords': ['descargar', 'twitter', 'video', 'en línea', 'gratis', 'guardar', 'descargador', 'enlace']
            },
            'ar': {
                'script': 'arabic',
                'keywords': ['تحميل', 'تويتر', 'فيديو', 'على الإنترنت', 'مجاني', 'حفظ', 'محمل', 'رابط']
            },
            'de': {
                'script': 'latin',
                'keywords': ['herunterladen', 'twitter', 'video', 'online', 'kostenlos', 'speichern', 'downloader', 'link', 'erstellen', 'vorlage']
            }
        }
    
    def detect_script(self, text: str) -> str:
        """检测文本的字符集"""
        if not text:
            return 'unknown'
        
        # 统计不同字符集的字符数量
        script_counts = {
            'latin': 0,
            'cjk': 0,
            'hangul': 0,
            'arabic': 0,
            'cyrillic': 0
        }
        
        for char in text:
            if char.isspace() or char.isdigit() or not char.isalpha():
                continue
                
            # 获取字符的Unicode分类
            try:
                script_name = unicodedata.name(char, '').split()[0]
                
                if 'LATIN' in script_name:
                    script_counts['latin'] += 1
                elif 'CJK' in script_name or 'IDEOGRAPH' in script_name:
                    script_counts['cjk'] += 1
                elif 'HANGUL' in script_name:
                    script_counts['hangul'] += 1
                elif 'ARABIC' in script_name:
                    script_counts['arabic'] += 1
                elif 'CYRILLIC' in script_name:
                    script_counts['cyrillic'] += 1
            except:
                continue
        
        # 返回最多的字符集
        if max(script_counts.values()) == 0:
            return 'latin'  # 默认为拉丁字符
        
        return max(script_counts.items(), key=lambda x: x[1])[0]
    
    def detect_language_by_keywords(self, text: str) -> List[str]:
        """通过关键词检测语言"""
        text_lower = text.lower()
        detected_languages = []
        
        for locale, rules in self.language_patterns.items():
            keyword_matches = sum(1 for keyword in rules['keywords'] if keyword in text_lower)
            if keyword_matches > 0:
                detected_languages.append((locale, keyword_matches))
        
        # 按匹配度排序
        detected_languages.sort(key=lambda x: x[1], reverse=True)
        return [lang[0] for lang in detected_languages]
    
    def detect_language(self, text: str) -> str:
        """检测文本语言"""
        if not text or not text.strip():
            return 'en'  # 默认英语
        
        text = text.strip()
        
        # 1. 通过字符集检测
        script = self.detect_script(text)
        
        # 2. 通过关键词检测
        keyword_languages = self.detect_language_by_keywords(text)
        
        # 3. 综合判断
        if script == 'hangul':
            return 'ko'
        elif script == 'arabic':
            return 'ar'
        elif script == 'cjk':
            # CJK字符需要进一步区分中日韩
            if keyword_languages:
                for lang in keyword_languages:
                    if lang in ['zh', 'zh-tw', 'ja']:
                        return lang
            return 'zh'  # 默认简体中文
        elif script == 'latin':
            # 拉丁字符通过关键词判断
            if keyword_languages:
                return keyword_languages[0]
            return 'en'  # 默认英语
        
        return 'en'  # 默认英语
    
    def filter_keywords_by_supported_languages(self, keywords: List[str]) -> Dict[str, List[str]]:
        """过滤关键词，按支持的语言分组"""
        language_keywords = {}
        
        for keyword in keywords:
            detected_lang = self.detect_language(keyword)
            
            # 只保留网站支持的语言
            if detected_lang in self.supported_locales:
                if detected_lang not in language_keywords:
                    language_keywords[detected_lang] = []
                language_keywords[detected_lang].append(keyword)
        
        return language_keywords
    
    def get_language_stats(self, keywords: List[str]) -> Dict[str, Dict[str, any]]:
        """获取关键词语言统计信息"""
        language_keywords = self.filter_keywords_by_supported_languages(keywords)
        
        stats = {}
        for locale, kws in language_keywords.items():
            stats[locale] = {
                'language_name': self.supported_locales[locale],
                'keyword_count': len(kws),
                'sample_keywords': kws[:5],  # 前5个示例
                'percentage': round(len(kws) / len(keywords) * 100, 1)
            }
        
        return stats
    
    def load_keywords_from_file(self, file_path: str) -> List[str]:
        """从文件加载关键词"""
        keywords = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        keywords.append(line)
        except Exception as e:
            print(f"❌ 读取关键词文件失败: {e}")
        
        return keywords 