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
    const { topic } = await request.json();

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

    const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://twitterdown.com";

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

    const results = [];

    // 生成英文文章
    try {
      const enPosts = existingPosts?.filter(post => post.locale === "en") || [];
      let enInternalLinksText = "";
      if (enPosts.length > 0) {
        enInternalLinksText += `\n## Existing Articles (for internal linking):\n`;
        enPosts.slice(0, 10).forEach(post => {
          const url = `${siteUrl}/posts/${post.slug}`;
          enInternalLinksText += `- [${post.title}](${url})\n`;
        });
      }

      const enPrompt = `You are a professional SEO content creator specializing in TwitterDown (Twitter video downloader) related content.

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

${enInternalLinksText}

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

(Internal note for uniqueness: ${Date.now()})`;

      const enResult = await model.generateContent(enPrompt);
      const enResponse = await enResult.response;
      const enText = enResponse.text();

      if (enText) {
        const enTitle = extractDelimiterContent(enText, "===TITLE_START===", "===TITLE_END===") || topic;
        const enSlug = extractDelimiterContent(enText, "===SLUG_START===", "===SLUG_END===") || generateSlug(enTitle);
        const enDescription = extractDelimiterContent(enText, "===DESCRIPTION_START===", "===DESCRIPTION_END===") || `Complete guide about ${enTitle}`;
        const enContent = extractDelimiterContent(enText, "===CONTENT_START===", "===CONTENT_END===") || enText;

        const enFinalSlug = await generateUniqueSlug(enSlug, "en");
        
        // 获取英文文章封面图片 - 使用短视频相关关键词
        const enCoverUrl = await getUnsplashImage("short video");
        
        const enPostUuid = uuidv4();
        // 为英文文章添加随机的时间偏移
        const randomHoursBackEn = Math.floor(Math.random() * 24) + 1;
        const randomMinutesBackEn = Math.floor(Math.random() * 60);
        const publishTimeEn = new Date();
        publishTimeEn.setHours(publishTimeEn.getHours() - randomHoursBackEn);
        publishTimeEn.setMinutes(publishTimeEn.getMinutes() - randomMinutesBackEn);
        const now = publishTimeEn.toISOString();

        const { data: enData, error: enError } = await supabase
          .from("posts")
          .insert({
            uuid: enPostUuid,
            slug: enFinalSlug,
            title: enTitle,
            description: enDescription,
            content: enContent,
            cover_url: enCoverUrl,
            created_at: now,
            updated_at: now,
            status: "online",
            locale: "en",
            author_name: "TwitterDown Team",
            author_avatar_url: "https://www.twitterdown.com/logo.png"
          })
          .select()
          .single();

        if (enError) {
          throw new Error(`英文文章数据库插入失败: ${enError.message}`);
        }

        results.push({
          language: "English",
          title: enData.title,
          uuid: enData.uuid,
          slug: enData.slug,
          cover_url: enData.cover_url,
        });
      }
    } catch (error) {
      console.error("English article generation error:", error);
      results.push({
        language: "English",
        error: error instanceof Error ? error.message : "英文文章生成失败",
      });
    }

    // 等待1秒避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 生成中文文章
    try {
      const zhPosts = existingPosts?.filter(post => post.locale === "zh") || [];
      let zhInternalLinksText = "";
      if (zhPosts.length > 0) {
        zhInternalLinksText += `\n## 现有文章列表（用于内链参考）：\n`;
        zhPosts.slice(0, 10).forEach(post => {
          const url = `${siteUrl}/zh/posts/${post.slug}`;
          zhInternalLinksText += `- [${post.title}](${url})\n`;
        });
      }

      const zhPrompt = `你是一位资深的SEO文章创作者，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

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

${zhInternalLinksText}

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

      const zhResult = await model.generateContent(zhPrompt);
      const zhResponse = await zhResult.response;
      const zhText = zhResponse.text();

      if (zhText) {
        const zhTitle = extractDelimiterContent(zhText, "===TITLE_START===", "===TITLE_END===") || topic;
        const zhSlug = extractDelimiterContent(zhText, "===SLUG_START===", "===SLUG_END===") || generateSlug(zhTitle);
        const zhDescription = extractDelimiterContent(zhText, "===DESCRIPTION_START===", "===DESCRIPTION_END===") || `关于${zhTitle}的详细指南`;
        const zhContent = extractDelimiterContent(zhText, "===CONTENT_START===", "===CONTENT_END===") || zhText;

        const zhFinalSlug = await generateUniqueSlug(zhSlug, "zh");
        
        // 获取中文文章封面图片
        const zhCoverUrl = await getUnsplashImage("twitter video download social media");
        
        const zhPostUuid = uuidv4();
        // 为中文文章添加随机的时间偏移（与英文文章不同的时间）
        const randomHoursBackZh = Math.floor(Math.random() * 24) + 1;
        const randomMinutesBackZh = Math.floor(Math.random() * 60);
        const publishTimeZh = new Date();
        publishTimeZh.setHours(publishTimeZh.getHours() - randomHoursBackZh);
        publishTimeZh.setMinutes(publishTimeZh.getMinutes() - randomMinutesBackZh);
        const now = publishTimeZh.toISOString();

        const { data: zhData, error: zhError } = await supabase
          .from("posts")
          .insert({
            uuid: zhPostUuid,
            slug: zhFinalSlug,
            title: zhTitle,
            description: zhDescription,
            content: zhContent,
            cover_url: zhCoverUrl,
            created_at: now,
            updated_at: now,
            status: "online",
            locale: "zh",
            author_name: "TwitterDown Team",
            author_avatar_url: "https://www.twitterdown.com/logo.png"
          })
          .select()
          .single();

        if (zhError) {
          throw new Error(`中文文章数据库插入失败: ${zhError.message}`);
        }

        results.push({
          language: "中文",
          title: zhData.title,
          uuid: zhData.uuid,
          slug: zhData.slug,
          cover_url: zhData.cover_url,
        });
      }
    } catch (error) {
      console.error("Chinese article generation error:", error);
      results.push({
        language: "中文",
        error: error instanceof Error ? error.message : "中文文章生成失败",
      });
    }

    return NextResponse.json({
      success: true,
      articles: results,
    });

  } catch (error) {
    console.error("Bilingual generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "双语文章生成失败",
      },
      { status: 500 }
    );
  }
}

async function generateArticle(model: any, topic: string, language: string, locale: string) {
  const prompt = `你是一位资深的SEO文章创作者，专注于 TwitterDown（Twitter视频下载器）相关内容创作。

## 任务
请为以下题目创作一篇高质量的SEO博客文章：${topic}

## 要求
- 文章长度约1000字
- 语言：${language}
- 自然流畅的写作风格
- 包含3-5个相关外部链接
- 使用Markdown格式
- 包含适当的标题结构

## 输出格式
使用以下分隔符格式：

===TITLE_START===
[SEO优化的标题，最多60个字符]
===TITLE_END===

===SLUG_START===
[URL友好的slug]
===SLUG_END===

===DESCRIPTION_START===
[元描述，150-160字符]
===DESCRIPTION_END===

===CONTENT_START===
[完整的文章内容，Markdown格式]
===CONTENT_END===

请开始生成：

(内部注释，确保独特性: ${Date.now()})`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  if (!text) {
    throw new Error(`${language}文章生成失败: AI未能生成有效内容`);
  }

  // 解析生成的内容
  const title = extractDelimiterContent(text, "===TITLE_START===", "===TITLE_END===") || topic;
  const slug = extractDelimiterContent(text, "===SLUG_START===", "===SLUG_END===") || generateSlug(title);
  const description = extractDelimiterContent(text, "===DESCRIPTION_START===", "===DESCRIPTION_END===") || `关于${title}的详细指南`;
  const content = extractDelimiterContent(text, "===CONTENT_START===", "===CONTENT_END===") || text;

  // 生成唯一slug
  const finalSlug = await generateUniqueSlug(slug, locale);

  // 插入到数据库
  const postUuid = uuidv4();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("posts")
    .insert({
      uuid: postUuid,
      slug: finalSlug,
      title,
      description,
      content,
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
    throw new Error(`${language}文章数据库插入失败: ${error.message}`);
  }

  return {
    title: data.title,
    uuid: data.uuid,
    slug: data.slug,
    language,
  };
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