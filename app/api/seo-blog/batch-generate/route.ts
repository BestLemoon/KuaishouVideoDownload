import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取Unsplash随机图片
async function getUnsplashImage(query: string = "technology"): Promise<string> {
  try {
    // 如果没有设置Unsplash Access Key，返回默认图片
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.log("Unsplash Access Key not set, using default image");
      return "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
    }

    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&w=1200&h=600`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.log("Unsplash API failed, using default image");
      return "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
    }

    const data = await response.json();
    return data.urls.regular || "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
  } catch (error) {
    console.error("Error fetching Unsplash image:", error);
    return "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
  }
}

// 单个主题的文章生成函数
async function generateSingleArticle(
  topic: string, 
  index: number, 
  locale: string, 
  internalLinksText: string,
  genAI: GoogleGenerativeAI
): Promise<{ success: boolean; topic: string; [key: string]: any }> {
  try {
    // 添加随机延迟以避免API限制，但不阻塞其他任务
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + index * 200));

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    // 创建语言特定的提示词
    const prompt = locale === "en" ? 
    `You are a professional SEO content creator specializing in TwitterDown (Twitter video downloader) related content.

## Task
Please create a high-quality SEO blog article for this topic: ${topic}

## Requirements
- Article length: 1000-1500 words
- Language: English
- Natural, fluent writing style that avoids AI-generated traces
- Use Markdown format
- Include proper heading structure (H1, H2, H3)
- **Must include at least 3 internal links** to our existing related articles
- Include 2-3 high-quality external links (to authoritative websites)
- SEO optimized with naturally integrated relevant keywords

${internalLinksText}

## Internal Link Requirements
- Must naturally insert at least 3 links to the above existing articles within the content
- Internal links should be relevant to the article content and naturally integrated into paragraphs
- Use descriptive anchor text, not just "click here"
- Link format: [anchor text](URL)

## External Link Requirements
- Include 2-3 links to authoritative websites
- External links should be related to Twitter, video downloading, social media
- Add appropriate context for external links

## Output Format
Use the following delimiter format:

===TITLE_START===
[SEO-optimized title, max 60 characters]
===TITLE_END===

===SLUG_START===
[URL-friendly slug]
===SLUG_END===

===DESCRIPTION_START===
[Meta description, 150-160 characters, engaging summary]
===DESCRIPTION_END===

===CONTENT_START===
[Complete article content in Markdown format, must include at least 3 internal links and 2-3 external links]
===CONTENT_END===

Please generate natural, fluent content that avoids obvious AI-generated traces:

(Internal note for uniqueness: ${Date.now()}-${index})` :

    `你是一位资深的SEO文章创作者，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

## 任务
请为以下题目创作一篇高质量的SEO博客文章：${topic}

## 要求
- 文章长度约1000-1500字
- 语言：中文
- 自然流畅的写作风格，避免AI痕迹
- 使用Markdown格式
- 包含适当的标题结构（H1, H2, H3）
- **必须包含至少3个内链**，指向我们现有的相关文章
- 包含2-3个高质量的外部链接（指向权威网站）
- 针对搜索引擎优化，自然融入相关关键词

${internalLinksText}

## 内链要求
- 必须在文章中自然地插入至少3个指向上述现有文章的链接
- 内链应该与文章内容相关，自然融入段落中
- 使用描述性的锚文本，不要只写"点击这里"
- 链接格式：[锚文本](URL)

## 外链要求
- 包含2-3个指向权威网站的外部链接
- 外链应该与Twitter、视频下载、社交媒体相关
- 为外链添加适当的上下文说明

## 输出格式
使用以下分隔符格式：

===TITLE_START===
[SEO优化的标题，最多60个字符]
===TITLE_END===

===SLUG_START===
[URL友好的slug]
===SLUG_END===

===DESCRIPTION_START===
[元描述，150-160字符，吸引人的摘要]
===DESCRIPTION_END===

===CONTENT_START===
[完整的文章内容，Markdown格式，必须包含至少3个内链和2-3个外链]
===CONTENT_END===

请开始生成，确保内容自然流畅，避免明显的AI生成痕迹：

(内部注释，确保独特性: ${Date.now()}-${index})`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI未能生成有效内容");
    }

    // 解析生成的内容
    const title = extractDelimiterContent(text, "===TITLE_START===", "===TITLE_END===") || topic;
    const slug = extractDelimiterContent(text, "===SLUG_START===", "===SLUG_END===") || generateSlug(title);
    const description = extractDelimiterContent(text, "===DESCRIPTION_START===", "===DESCRIPTION_END===") || 
      (locale === "en" ? `Complete guide about ${title}` : `关于${title}的详细指南`);
    const content = extractDelimiterContent(text, "===CONTENT_START===", "===CONTENT_END===") || text;

    // 生成唯一slug
    const finalSlug = await generateUniqueSlug(slug, locale);

    // 获取Unsplash封面图片
    const coverUrl = await getUnsplashImage("twitter");

    // 插入到数据库
    const postUuid = uuidv4();
    // 为每篇文章添加随机的时间偏移，让发布时间更自然
    // 在当前时间基础上随机减去 1-72 小时（1-3天内的随机时间）
    const randomHoursBack = Math.floor(Math.random() * 72) + 1;
    const randomMinutesBack = Math.floor(Math.random() * 60);
    const publishTime = new Date();
    publishTime.setHours(publishTime.getHours() - randomHoursBack);
    publishTime.setMinutes(publishTime.getMinutes() - randomMinutesBack);
    const now = publishTime.toISOString();

    const { data, error } = await supabase
      .from("posts")
      .insert({
        uuid: postUuid,
        slug: finalSlug,
        title,
        description,
        content,
        cover_url: coverUrl,
        created_at: now,
        updated_at: now,
        status: "online",
        locale,
        author_name: "TwitterDown Team",
        author_avatar_url: "https://www.twitterdown.com/logo.png"
      })
      .select()
      .single();

    if (error) {
      throw new Error(`数据库插入失败: ${error.message}`);
    }

    return {
      success: true,
      topic,
      title: data.title,
      uuid: data.uuid,
      slug: data.slug,
      cover_url: data.cover_url,
    };

  } catch (error) {
    console.error(`Topic "${topic}" generation error:`, error);
    return {
      success: false,
      topic,
      error: error instanceof Error ? error.message : "文章生成失败",
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { topics, language, concurrency = 3 } = await request.json();

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      throw new Error("题目列表不能为空");
    }

    // 获取现有文章作为内链参考
    const { data: existingPosts } = await supabase
      .from("posts")
      .select("title, slug, locale")
      .eq("status", "online")
      .limit(20)
      .order("created_at", { ascending: false });

    const locale = language.toLowerCase().includes("chinese") || language.includes("中文") ? "zh" : "en";
    const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://twitterdown.com";
    
    // 筛选相同语言的文章作为内链候选
    const sameLanguagePosts = existingPosts?.filter(post => post.locale === locale) || [];
    
    // 构建内链列表
    let internalLinksText = "";
    if (sameLanguagePosts.length > 0) {
      if (locale === "en") {
        internalLinksText += `\n## Existing Articles (for internal linking):\n`;
        sameLanguagePosts.slice(0, 10).forEach(post => {
          const url = `${siteUrl}/posts/${post.slug}`;
          internalLinksText += `- [${post.title}](${url})\n`;
        });
      } else {
        internalLinksText += `\n## 现有文章列表（用于内链参考）：\n`;
        sameLanguagePosts.slice(0, 10).forEach(post => {
          const url = `${siteUrl}/zh/posts/${post.slug}`;
          internalLinksText += `- [${post.title}](${url})\n`;
        });
      }
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // 限制并发数量，避免API限制
    const maxConcurrency = Math.min(concurrency, 5); // 最大并发数限制为5
    const results: Array<{ success: boolean; topic: string; [key: string]: any }> = [];

    // 分批处理主题
    for (let i = 0; i < topics.length; i += maxConcurrency) {
      const batch = topics.slice(i, i + maxConcurrency);
      
      // 使用Promise.allSettled来并发处理这批主题
      const batchPromises = batch.map((topic, batchIndex) => 
        generateSingleArticle(topic, i + batchIndex, locale, internalLinksText, genAI)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      // 处理批次结果
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            topic: '未知主题',
            error: result.reason?.message || '生成失败',
          });
        }
      });

      // 在批次之间添加延迟，避免API限制
      if (i + maxConcurrency < topics.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: topics.length,
        success: successCount,
        failure: failureCount,
        concurrency: maxConcurrency,
        message: `批量生成完成：成功 ${successCount} 篇，失败 ${failureCount} 篇（并发数：${maxConcurrency}）`
      }
    });

  } catch (error) {
    console.error("Batch generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "批量生成失败",
      },
      { status: 500 }
    );
  }
}

function extractDelimiterContent(content: string, startDelimiter: string, endDelimiter: string): string {
  const startIdx = content.indexOf(startDelimiter);
  const endIdx = content.indexOf(endDelimiter);
  
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    return content.substring(startIdx + startDelimiter.length, endIdx).trim();
  }
  return "";
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[-\s]+/g, '-')
    .trim();
}

async function generateUniqueSlug(baseSlug: string, locale: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const { data } = await supabase
      .from("posts")
      .select("slug")
      .eq("slug", slug)
      .eq("locale", locale)
      .single();

    if (!data) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
} 