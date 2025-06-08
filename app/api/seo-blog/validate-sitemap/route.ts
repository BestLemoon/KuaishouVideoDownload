import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
    
    if (!fs.existsSync(sitemapPath)) {
      throw new Error("sitemap.xml 文件不存在");
    }

    const sitemapContent = fs.readFileSync(sitemapPath, "utf-8");
    
    // 基本验证
    if (!sitemapContent.includes('<?xml')) {
      throw new Error("sitemap 格式错误：缺少XML声明");
    }

    if (!sitemapContent.includes('<urlset')) {
      throw new Error("sitemap 格式错误：缺少urlset元素");
    }

    // 统计URL数量
    const urlMatches = sitemapContent.match(/<url>/g);
    const urlCount = urlMatches ? urlMatches.length : 0;

    // 检查是否有有效的loc元素
    const locMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g);
    const locCount = locMatches ? locMatches.length : 0;

    if (urlCount !== locCount) {
      throw new Error(`发现无效的URL元素：${urlCount}个URL元素，但只有${locCount}个有效的loc元素`);
    }

    return NextResponse.json({
      success: true,
      message: `sitemap 验证通过，共 ${urlCount} 个 URL`,
      urlCount,
    });

  } catch (error) {
    console.error("Sitemap validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sitemap验证失败",
      },
      { status: 500 }
    );
  }
} 