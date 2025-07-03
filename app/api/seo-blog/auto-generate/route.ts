import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 验证手动触发的密钥（用于前端调用）
function validateManualTrigger(request: NextRequest): boolean {
  // 检查是否是手动触发
  const { searchParams } = new URL(request.url);
  const manualTrigger = searchParams.get('manual');
  const secret = searchParams.get('secret');
  
  // 允许手动触发（简化验证，因为主要通过GitHub Actions运行）
  return manualTrigger === 'true' && secret === 'test';
}

// 生成题目建议
async function generateTopics(language: string, count: number = 5): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

  const prompt = `你是一位资深的SEO内容策划师，专注于 KuaishouVideoDownload（快手视频下载器）相关内容创作。

## 任务
请为 KuaishouVideoDownload 生成 ${count} 个高质量的SEO博客文章题目建议。

## 主题方向
围绕快手视频下载、社交媒体内容管理、视频保存技巧、内容创作工具等相关话题

## 要求
- 标题应该吸引点击，解决用户痛点
- 符合SEO最佳实践，包含相关关键词
- 每个标题控制在60字符以内
- 适合 ${language} 语言用户
- 题目应该实用、有价值
- 确保每个题目都是独特的，避免重复

## 输出格式
请直接输出 ${count} 个题目，每行一个，不需要编号：

题目1
题目2
题目3
...

请开始生成：

(内部注释，确保独特性: ${Date.now()})`;

  try {
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
      .slice(0, count);

    return topics.length > 0 ? topics : getDefaultTopics(language, count);
  } catch (error) {
    console.error("Topic generation error:", error);
    return getDefaultTopics(language, count);
  }
}

// 默认题目备选
function getDefaultTopics(language: string, count: number): string[] {
  const defaultTopicsZh = [
    "快手视频下载终极指南：2024年最新方法汇总",
    "如何批量保存快手视频：专业技巧分享",
    "社交媒体内容管理：快手视频归档策略",
    "快手视频下载工具对比：免费vs付费方案",
    "移动端快手视频下载：完整操作教程",
    "快手视频质量选择指南：如何下载高清视频",
    "快手直播视频录制与下载方法详解",
    "快手视频格式转换：常见问题解决方案"
  ];
  
  const defaultTopicsEn = [
    "Complete Kuaishou Video Download Guide: Latest Methods for 2024",
    "How to Bulk Download Kuaishou Videos: Professional Tips",
    "Social Media Content Management: Kuaishou Video Archiving Strategies",
    "Kuaishou Video Download Tools Comparison: Free vs Premium Solutions",
    "Mobile Kuaishou Video Download: Complete Tutorial",
    "Kuaishou Video Quality Selection Guide: Download HD Videos",
    "Kuaishou Live Video Recording and Download Methods",
    "Kuaishou Video Format Conversion: Common Issues Solutions"
  ];

  const isChineseLanguage = language.toLowerCase().includes("chinese") || language.includes("中文");
  const fallbackTopics = isChineseLanguage ? defaultTopicsZh : defaultTopicsEn;
  
  return fallbackTopics.slice(0, count);
}

// 调用批量生成API
async function callBatchGenerate(topics: string[], language: string): Promise<any> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_WEB_URL || 'https://kuaishou-video-download.com'}/api/seo-blog/batch-generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topics,
        language,
        concurrency: 2 // 定时任务使用较低并发数，避免资源占用过高
      }),
    });

    if (!response.ok) {
      throw new Error(`批量生成API调用失败: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Batch generate API call error:", error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证手动触发权限（现在主要通过GitHub Actions运行）
    if (!validateManualTrigger(request)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - 仅支持手动触发" },
        { status: 401 }
      );
    }

    console.log("🚀 开始执行每日自动文章生成任务");

    const results = {
      chinese: { success: 0, failure: 0, topics: [] as string[], results: [] as any[] },
      english: { success: 0, failure: 0, topics: [] as string[], results: [] as any[] }
    };

    // 生成中文文章
    try {
      console.log("📝 生成中文题目...");
      const chineseTopics = await generateTopics("Chinese", 5);
      results.chinese.topics = chineseTopics;
      
      console.log("🇨🇳 开始生成中文文章...");
      // 使用低并发数，避免自动生成过于集中
      const chineseResult = await callBatchGenerate(chineseTopics, "Chinese");
      
      if (chineseResult.success) {
        results.chinese.results = chineseResult.results;
        results.chinese.success = chineseResult.summary.success;
        results.chinese.failure = chineseResult.summary.failure;
        console.log(`✅ 中文文章生成完成：成功 ${results.chinese.success} 篇，失败 ${results.chinese.failure} 篇`);
      }
    } catch (error) {
      console.error("❌ 中文文章生成失败:", error);
      results.chinese.failure = 5;
    }

    // 等待一段时间避免API限制
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 生成英文文章
    try {
      console.log("📝 生成英文题目...");
      const englishTopics = await generateTopics("English", 5);
      results.english.topics = englishTopics;
      
      console.log("🇺🇸 开始生成英文文章...");
      const englishResult = await callBatchGenerate(englishTopics, "English");
      
      if (englishResult.success) {
        results.english.results = englishResult.results;
        results.english.success = englishResult.summary.success;
        results.english.failure = englishResult.summary.failure;
        console.log(`✅ 英文文章生成完成：成功 ${results.english.success} 篇，失败 ${results.english.failure} 篇`);
      }
    } catch (error) {
      console.error("❌ 英文文章生成失败:", error);
      results.english.failure = 5;
    }

    const totalSuccess = results.chinese.success + results.english.success;
    const totalFailure = results.chinese.failure + results.english.failure;

    console.log(`🎉 每日文章生成任务完成：总计成功 ${totalSuccess} 篇，失败 ${totalFailure} 篇`);

    // 记录任务执行日志到数据库（可选）
    try {
      await supabase.from('auto_generation_logs').insert({
        execution_date: new Date().toISOString().split('T')[0],
        chinese_success: results.chinese.success,
        chinese_failure: results.chinese.failure,
        english_success: results.english.success,
        english_failure: results.english.failure,
        total_success: totalSuccess,
        total_failure: totalFailure,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.warn("日志记录失败（不影响主要功能）:", logError);
    }

    return NextResponse.json({
      success: true,
      message: `每日文章生成完成：成功 ${totalSuccess} 篇，失败 ${totalFailure} 篇`,
      results,
      summary: {
        total_articles: totalSuccess + totalFailure,
        success_count: totalSuccess,
        failure_count: totalFailure,
        chinese: `${results.chinese.success}/${results.chinese.success + results.chinese.failure}`,
        english: `${results.english.success}/${results.english.success + results.english.failure}`,
        execution_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("自动生成任务执行失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "自动生成任务失败",
      },
      { status: 500 }
    );
  }
}

// 允许GET请求用于手动触发（简化处理）
export async function GET(request: NextRequest) {
  try {
    // 检查是否是手动触发
    const { searchParams } = new URL(request.url);
    const manualTrigger = searchParams.get('manual');
    const secret = searchParams.get('secret');

    console.log("GET请求参数:", { manualTrigger, secret, hasSecret: !!secret });

    if (manualTrigger === 'true' && secret === 'test') {
      console.log("🎯 手动触发验证通过，开始执行任务...");
      
      // 直接执行任务逻辑，跳过POST方法的权限验证
      const results = {
        chinese: { success: 0, failure: 0, topics: [] as string[], results: [] as any[] },
        english: { success: 0, failure: 0, topics: [] as string[], results: [] as any[] }
      };

      console.log("🚀 开始执行手动触发的文章生成任务");

      // 生成中文文章
      try {
        console.log("📝 生成中文题目...");
        const chineseTopics = await generateTopics("Chinese", 5);
        results.chinese.topics = chineseTopics;
        
        console.log("🇨🇳 开始生成中文文章...");
        const chineseResult = await callBatchGenerate(chineseTopics, "Chinese");
        
        if (chineseResult.success) {
          results.chinese.results = chineseResult.results;
          results.chinese.success = chineseResult.summary.success;
          results.chinese.failure = chineseResult.summary.failure;
          console.log(`✅ 中文文章生成完成：成功 ${results.chinese.success} 篇，失败 ${results.chinese.failure} 篇`);
        }
      } catch (error) {
        console.error("❌ 中文文章生成失败:", error);
        results.chinese.failure = 5;
      }

      // 等待一段时间避免API限制
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 生成英文文章
      try {
        console.log("📝 生成英文题目...");
        const englishTopics = await generateTopics("English", 5);
        results.english.topics = englishTopics;
        
        console.log("🇺🇸 开始生成英文文章...");
        const englishResult = await callBatchGenerate(englishTopics, "English");
        
        if (englishResult.success) {
          results.english.results = englishResult.results;
          results.english.success = englishResult.summary.success;
          results.english.failure = englishResult.summary.failure;
          console.log(`✅ 英文文章生成完成：成功 ${results.english.success} 篇，失败 ${results.english.failure} 篇`);
        }
      } catch (error) {
        console.error("❌ 英文文章生成失败:", error);
        results.english.failure = 5;
      }

      const totalSuccess = results.chinese.success + results.english.success;
      const totalFailure = results.chinese.failure + results.english.failure;

      console.log(`🎉 手动触发任务完成：总计成功 ${totalSuccess} 篇，失败 ${totalFailure} 篇`);

      return NextResponse.json({
        success: true,
        message: `手动生成完成：成功 ${totalSuccess} 篇，失败 ${totalFailure} 篇`,
        results,
        summary: {
          total_articles: totalSuccess + totalFailure,
          success_count: totalSuccess,
          failure_count: totalFailure,
          chinese: `${results.chinese.success}/${results.chinese.success + results.chinese.failure}`,
          english: `${results.english.success}/${results.english.success + results.english.failure}`,
          execution_time: new Date().toISOString(),
          triggered_manually: true
        }
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        error: "手动触发需要参数: manual=true&secret=test",
        debug: {
          manualTrigger,
          secretProvided: !!secret,
          secretValue: secret,
          expected: "test"
        }
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET request error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "手动触发执行失败: " + (error instanceof Error ? error.message : "未知错误")
      },
      { status: 500 }
    );
  }
} 