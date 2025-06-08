import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取Google自动完成建议
async function getGoogleSuggestions(keyword: string, maxSuggestions = 10): Promise<string[]> {
  try {
    const url = `http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TwitterDown SEO Bot)',
      },
      signal: AbortSignal.timeout(10000), // 10秒超时
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (Array.isArray(data) && data.length >= 2 && Array.isArray(data[1])) {
      const suggestions = data[1].slice(0, maxSuggestions);
      
      // 过滤和清理建议
      return suggestions
        .filter((suggestion: any) => typeof suggestion === 'string' && suggestion.trim())
        .map((suggestion: string) => {
          // 处理Unicode转义字符
          try {
            return decodeURIComponent(suggestion.replace(/\\u[\dA-F]{4}/gi, 
              match => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
            ));
          } catch {
            return suggestion;
          }
        });
    }
    
    return [];
  } catch (error) {
    console.error(`获取关键词"${keyword}"的Google建议失败:`, error);
    return [];
  }
}

// 生成种子关键词
async function generateSeedKeywords(language: string, count: number = 10): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

  const prompt = `你是一位专业的SEO关键词研究专家，专注于Twitter视频下载相关的关键词研究。

## 任务
请为TwitterDown（Twitter视频下载器）生成${count}个高价值的种子关键词。

## 关键词类型要求
请生成以下类型的关键词：
1. 🔍 搜索型关键词（用户直接搜索需求）
2. 📱 设备相关关键词（iPhone, Android, mobile等）
3. 📊 功能型关键词（batch download, HD quality等）
4. 💡 解决方案型关键词（how to, best way等）
5. 🌍 竞品和比较关键词（vs, alternative等）

## 目标语言
${language}

## 输出要求
- 直接输出${count}个关键词
- 每行一个关键词
- 不包含编号或符号
- 关键词应该具有搜索价值
- 避免过于宽泛或过于细分的词

请开始生成：

(唯一性标识: ${Date.now()})`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI未能生成种子关键词");
    }

    // 解析关键词
    const keywords = text.trim().split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#') && !line.startsWith('-'))
      .map((keyword: string) => {
        // 清理可能的编号和符号
        return keyword.replace(/^\d+\.?\s*/, '').replace(/^[•\-\*]\s*/, '').trim().replace(/['"]/g, '');
      })
      .filter((keyword: string) => keyword && keyword.length > 2)
      .slice(0, count);

    return keywords.length > 0 ? keywords : getDefaultSeedKeywords(language, count);
  } catch (error) {
    console.error("种子关键词生成失败:", error);
    return getDefaultSeedKeywords(language, count);
  }
}

// 获取默认种子关键词
function getDefaultSeedKeywords(language: string, count: number): string[] {
  const isChineseLanguage = language.toLowerCase().includes("chinese") || language.includes("中文");
  
  const defaultKeywords = isChineseLanguage ? [
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
  ] : [
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
  ];

  return defaultKeywords.slice(0, count);
}

// 基于扩展关键词生成分类文章题目
async function generateCategorizedTopics(
  expandedKeywords: Record<string, string[]>, 
  language: string
): Promise<Record<string, string[]>> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

  // 合并所有关键词
  const allKeywords = Object.entries(expandedKeywords).flatMap(([seed, suggestions]) => [seed, ...suggestions]);
  const uniqueKeywords = [...new Set(allKeywords)];
  const keywordsText = uniqueKeywords.slice(0, 50).map(kw => `- ${kw}`).join('\n');

  const prompt = `你是一位专业的SEO内容策略师，专注于TwitterDown（Twitter视频下载器）相关的内容创作。

## 任务
基于以下扩展关键词，按照指定类别生成文章题目建议。

## 可用关键词：
${keywordsText}

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
${language}

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

(唯一性标识: ${Date.now()})`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI未能生成分类文章题目");
    }

    // 解析分类题目
    const categories = {
      search_keywords: extractCategoryTopics(text, "===SEARCH_KEYWORDS_START===", "===SEARCH_KEYWORDS_END==="),
      tutorial_lists: extractCategoryTopics(text, "===TUTORIAL_LISTS_START===", "===TUTORIAL_LISTS_END==="),
      bilingual_content: extractCategoryTopics(text, "===BILINGUAL_CONTENT_START===", "===BILINGUAL_CONTENT_END==="),
      ab_test_keywords: extractCategoryTopics(text, "===AB_TEST_KEYWORDS_START===", "===AB_TEST_KEYWORDS_END===")
    };

    return categories;
  } catch (error) {
    console.error("分类文章题目生成失败:", error);
    return getDefaultCategoryTopics(language);
  }
}

// 从分隔符中提取分类题目
function extractCategoryTopics(content: string, startDelimiter: string, endDelimiter: string): string[] {
  try {
    const startIdx = content.indexOf(startDelimiter);
    const endIdx = content.indexOf(endDelimiter);

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const sectionContent = content.substring(startIdx + startDelimiter.length, endIdx).trim();

      // 解析题目
      return sectionContent.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && !line.startsWith('==='))
        .map(topic => topic.replace(/^\d+\.?\s*/, '').replace(/^[•\-\*]\s*/, '').trim())
        .filter(topic => topic);
    }

    return [];
  } catch {
    return [];
  }
}

// 获取默认分类题目
function getDefaultCategoryTopics(language: string): Record<string, string[]> {
  const isChineseLanguage = language.toLowerCase().includes("chinese") || language.includes("中文");

  if (isChineseLanguage) {
    return {
      search_keywords: [
        "如何在iPhone上下载Twitter视频",
        "Twitter视频下载器哪个最好用",
        "免费下载Twitter视频的方法"
      ],
      tutorial_lists: [
        "2025年最佳Twitter视频下载工具TOP5"
      ],
      bilingual_content: [
        "Twitter视频下载完整指南 | Complete Twitter Video Download Guide",
        "批量下载Twitter视频方法 | How to Bulk Download Twitter Videos",
        "Twitter视频质量选择技巧 | Twitter Video Quality Selection Tips"
      ],
      ab_test_keywords: [
        "Twitter视频下载的法律问题解析",
        "企业如何合规使用Twitter视频内容"
      ]
    };
  } else {
    return {
      search_keywords: [
        "How to download Twitter videos on iPhone",
        "Best Twitter video downloader 2024",
        "Free Twitter video download methods"
      ],
      tutorial_lists: [
        "Top 5 Twitter Video Downloaders 2025"
      ],
      bilingual_content: [
        "Complete Twitter Video Download Guide | Twitter视频下载完整指南",
        "How to Bulk Download Twitter Videos | 批量下载Twitter视频方法",
        "Twitter Video Quality Selection Tips | Twitter视频质量选择技巧"
      ],
      ab_test_keywords: [
        "Legal aspects of Twitter video downloading",
        "Enterprise Twitter content management strategies"
      ]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { language = "English", generateArticles = false } = await request.json();

    const results: any = {
      success: true,
      step1_seedKeywords: [],
      step2_expandedKeywords: {},
      step3_categorizedTopics: {},
      step4_generatedArticles: [],
      summary: {}
    };

    // 步骤1: 生成种子关键词
    console.log("步骤1: 生成种子关键词");
    const seedKeywords = await generateSeedKeywords(language, 8);
    results.step1_seedKeywords = seedKeywords;

    // 步骤2: 使用Google自动完成扩展关键词
    console.log("步骤2: 扩展关键词");
    const expandedKeywords: Record<string, string[]> = {};
    
    for (const keyword of seedKeywords) {
      const suggestions = await getGoogleSuggestions(keyword, 8);
      if (suggestions.length > 0) {
        expandedKeywords[keyword] = suggestions;
      }
      
      // 避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    results.step2_expandedKeywords = expandedKeywords;

    // 步骤3: 生成分类文章题目
    console.log("步骤3: 生成分类题目");
    const categorizedTopics = await generateCategorizedTopics(expandedKeywords, language);
    results.step3_categorizedTopics = categorizedTopics;

    // 计算统计信息
    const totalKeywords = Object.values(expandedKeywords).reduce((sum, arr) => sum + arr.length, 0);
    const totalTopics = Object.values(categorizedTopics).reduce((sum, arr) => sum + arr.length, 0);
    
    results.summary = {
      seedKeywordsCount: seedKeywords.length,
      expandedKeywordsCount: totalKeywords,
      totalTopicsCount: totalTopics,
      categoryBreakdown: Object.fromEntries(
        Object.entries(categorizedTopics).map(([category, topics]) => [category, topics.length])
      )
    };

    // 如果需要生成文章，继续步骤4
    if (generateArticles) {
      console.log("步骤4: 生成文章 (此功能需要调用其他API端点)");
      results.step4_generatedArticles = {
        message: "文章生成功能需要调用 /api/seo-blog/batch-generate 端点",
        topics: Object.values(categorizedTopics).flat()
      };
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error("关键词驱动生成失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "关键词驱动生成失败",
      },
      { status: 500 }
    );
  }
} 