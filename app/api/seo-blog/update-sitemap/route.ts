import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 获取所有已发布的文章，包含创建时间
    const { data: posts, error } = await supabase
      .from("posts")
      .select("slug, locale, created_at")
      .eq("status", "online");

    if (error) {
      throw new Error(`获取文章数据失败: ${error.message}`);
    }

    // 读取现有的sitemap
    const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    let existingUrls = new Set<string>();
    
    if (fs.existsSync(sitemapPath)) {
      const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
      if (urlMatches) {
        urlMatches.forEach(match => {
          const url = match.replace(/<\/?loc>/g, "");
          existingUrls.add(url);
        });
      }
    }

    // 生成新的URL条目
    let newUrlsAdded = 0;
    const siteUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://twitterdown.com";
    const newEntries: string[] = [];

    posts?.forEach(post => {
      const { slug, locale, created_at } = post;
      if (!slug) return;

      const url = locale === "en" 
        ? `${siteUrl}/posts/${slug}`
        : `${siteUrl}/${locale}/posts/${slug}`;

      if (!existingUrls.has(url)) {
        // 使用文章的实际创建时间而不是当前时间
        const lastmod = created_at || new Date().toISOString();
        const entry = `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
        newEntries.push(entry);
        newUrlsAdded++;
      }
    });

    if (newUrlsAdded > 0) {
      // 读取现有sitemap并添加新条目
      let sitemapContent = "";
      if (fs.existsSync(sitemapPath)) {
        sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
      } else {
        // 创建基本的sitemap结构
        sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
      }

      // 在</urlset>之前插入新条目
      const insertPosition = sitemapContent.lastIndexOf("</urlset>");
      if (insertPosition !== -1) {
        const beforeClosing = sitemapContent.substring(0, insertPosition);
        const afterClosing = sitemapContent.substring(insertPosition);
        const updatedContent = beforeClosing + newEntries.join("\n") + "\n" + afterClosing;
        
        fs.writeFileSync(sitemapPath, updatedContent, "utf-8");
      }
    }

    return NextResponse.json({
      success: true,
      message: newUrlsAdded > 0 
        ? `成功添加 ${newUrlsAdded} 个新 URL 到 sitemap`
        : "sitemap 已是最新，无需更新",
      addedCount: newUrlsAdded,
    });

  } catch (error) {
    console.error("Sitemap update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sitemap更新失败",
      },
      { status: 500 }
    );
  }
} 