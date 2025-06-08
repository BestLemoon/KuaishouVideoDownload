import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const { theme, language, count } = await request.json();

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `你是一位资深的SEO内容策划师，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

## 任务
请为 TwitterDown 生成 ${count || 5} 个高质量的SEO博客文章题目建议。

## 主题方向
${theme || "围绕Twitter视频下载、社交媒体内容管理、视频保存技巧等相关话题"}

## 要求
- 标题应该吸引点击，解决用户痛点
- 符合SEO最佳实践，包含相关关键词
- 每个标题控制在60字符以内
- 适合 ${language} 语言用户
- 题目应该实用、有价值

## 输出格式
请直接输出 ${count || 5} 个题目，每行一个，不需要编号：

题目1
题目2
题目3
...

请开始生成：

(内部注释，确保独特性: ${Date.now()})`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI未能生成有效内容");
    }

    // 解析题目
    const topics = text.trim().split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line && !line.startsWith('#') && !line.startsWith('-'))
      .map((topic: string) => {
        // 清理可能的编号
        return topic.replace(/^\d+\.?\s*/, '').replace(/^[•\-\*]\s*/, '').trim();
      })
      .filter((topic: string) => topic)
      .slice(0, count || 5);

    return NextResponse.json({
      success: true,
      topics,
    });

  } catch (error) {
    console.error("Topic generation error:", error);
    
    // 返回默认题目作为备选
    const defaultTopicsZh = [
      "Twitter视频下载完整指南：最佳工具和方法推荐",
      "如何批量保存Twitter视频：提升工作效率的秘诀",
      "社交媒体内容管理：Twitter视频归档最佳实践",
      "Twitter视频下载常见问题解决方案大全",
      "移动端下载Twitter视频：iOS和Android完整教程"
    ];
    
    const defaultTopicsEn = [
      "The Complete Guide to Downloading Twitter Videos: Best Tools and Methods",
      "How to Bulk Save Twitter Videos: Secrets to Boost Your Workflow",
      "Social Media Content Management: Best Practices for Archiving Twitter Videos",
      "Common Problems and Solutions for Downloading Twitter Videos",
      "How to Download Twitter Videos on Mobile: A Complete iOS and Android Tutorial"
    ];

    const { language = "English", count = 5 } = await request.json().catch(() => ({}));
    const isChineseLanguage = language.toLowerCase().includes("chinese") || language.includes("中文");
    const fallbackTopics = isChineseLanguage ? defaultTopicsZh : defaultTopicsEn;

    return NextResponse.json({
      success: true,
      topics: fallbackTopics.slice(0, count),
      fallback: true,
    });
  }
} 