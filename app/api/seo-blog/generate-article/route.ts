import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取Unsplash随机图片 - 优化为短视频相关关键词
async function getUnsplashImage(query: string = "short video"): Promise<string> {
  try {
    // 如果没有设置Unsplash Access Key，返回默认图片
    if (!process.env.UNSPLASH_ACCESS_KEY) {
      console.log("Unsplash Access Key not set, using default image");
      return "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80";
    }

    // 短视频相关的关键词列表
    const shortVideoKeywords = [
      "short video", "mobile video", "social media", "smartphone recording",
      "video content", "digital media", "content creation", "video editing",
      "mobile phone", "social network", "video streaming", "online video",
      "vertical video", "tiktok style", "video maker", "video production"
    ];

    // 如果查询是默认的短视频或包含特定关键词，随机选择一个短视频相关关键词
    if (query === "short video" || query.toLowerCase().includes("twitter") || query.toLowerCase().includes("kuaishou")) {
      query = shortVideoKeywords[Math.floor(Math.random() * shortVideoKeywords.length)];
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

export async function POST(request: NextRequest) {
  try {
    const { topic, language } = await request.json();

    if (!topic) {
      throw new Error("文章题目不能为空");
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
    const otherLanguagePosts = existingPosts?.filter(post => post.locale !== locale) || [];
    
    // 构建内链列表
    let internalLinksText = "";
    if (sameLanguagePosts.length > 0) {
      internalLinksText += `\n## 现有文章列表（用于内链参考）：\n`;
      sameLanguagePosts.slice(0, 10).forEach(post => {
        const url = post.locale === "en" 
          ? `${siteUrl}/posts/${post.slug}`
          : `${siteUrl}/${post.locale}/posts/${post.slug}`;
        internalLinksText += `- [${post.title}](${url})\n`;
      });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const prompt = `你是一位资深的SEO文章创作者，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

## 任务
请为以下题目创作一篇高质量的SEO博客文章：${topic}

## 要求
- 文章长度约1000-1500字
- 语言：${language}
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

(内部注释，确保独特性: ${Date.now()})`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("AI未能生成有效内容");
    }

    // 解析生成的内容
    const title = extractDelimiterContent(text, "===TITLE_START===", "===TITLE_END===") || topic;
    const slug = extractDelimiterContent(text, "===SLUG_START===", "===SLUG_END===") || generateSlug(title);
    const description = extractDelimiterContent(text, "===DESCRIPTION_START===", "===DESCRIPTION_END===") || `关于${title}的详细指南`;
    const content = extractDelimiterContent(text, "===CONTENT_START===", "===CONTENT_END===") || text;

    // 生成唯一slug
    const finalSlug = await generateUniqueSlug(slug, locale);

    // 获取Unsplash封面图片 - 使用短视频相关关键词
    const coverUrl = await getUnsplashImage("short video");

    // 插入到数据库
    const postUuid = uuidv4();
    // 为文章添加随机的时间偏移，让发布时间更自然
    // 在当前时间基础上随机减去 1-24 小时
    const randomHoursBack = Math.floor(Math.random() * 24) + 1;
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

    return NextResponse.json({
      success: true,
      article: {
        title: data.title,
        uuid: data.uuid,
        slug: data.slug,
        cover_url: data.cover_url,
      },
    });

  } catch (error) {
    console.error("Article generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "文章生成失败",
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