

import { respData, respErr } from "@/lib/resp";
import { getUserUuid, checkUserIsPremium } from "@/services/user";
import { NextResponse } from "next/server";

// 简单的内存缓存，用于缓存用户状态
const userStatusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

export async function GET() {
  try {
    console.log('[API] /api/user-status - 开始处理请求');

    const user_uuid = await getUserUuid();
    console.log('[API] /api/user-status - 获取用户UUID:', user_uuid ? '已获取' : '未获取');

    if (!user_uuid) {
      const response = respData({
        isLoggedIn: false,
        isPremium: false,
        canUseFree: true
      });

      console.log('[API] /api/user-status - 返回未登录用户状态');

      // 为未登录用户设置较短的缓存
      return new NextResponse(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // 1分钟缓存
        },
      });
    }

    // 检查缓存
    const cacheKey = `user_status_${user_uuid}`;
    const cached = userStatusCache.get(cacheKey);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`[Cache Hit] User status for ${user_uuid}`);
      return new NextResponse(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300', // 5分钟缓存
          'X-Cache': 'HIT',
        },
      });
    }

    // 缓存未命中，查询数据库
    console.log(`[API] /api/user-status - 缓存未命中，查询数据库 for ${user_uuid}`);

    let isPremium = false;
    try {
      // 添加超时机制，避免数据库查询过长时间
      const premiumCheckPromise = checkUserIsPremium(user_uuid);
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Premium check timeout')), 5000); // 5秒超时
      });

      isPremium = await Promise.race([premiumCheckPromise, timeoutPromise]);
      console.log(`[API] /api/user-status - 用户Premium状态:`, isPremium);
    } catch (premiumCheckError) {
      console.error('[API] /api/user-status - 检查Premium状态失败:', premiumCheckError);
      // 继续执行，使用默认值false，确保API不会因为Premium检查失败而整体失败
      isPremium = false;
    }

    const responseData = respData({
      isLoggedIn: true,
      isPremium,
      canUseFree: true // This will be managed by frontend localStorage
    });

    console.log('[API] /api/user-status - 准备返回数据:', responseData);

    // 更新缓存
    userStatusCache.set(cacheKey, {
      data: responseData,
      timestamp: now
    });

    // 清理过期缓存（简单的清理策略）
    if (userStatusCache.size > 1000) { // 防止内存泄漏
      for (const [key, value] of userStatusCache.entries()) {
        if ((now - value.timestamp) > CACHE_TTL) {
          userStatusCache.delete(key);
        }
      }
    }

    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300', // 5分钟缓存
        'X-Cache': 'MISS',
      },
    });
  } catch (e) {
    console.error("[API] /api/user-status - 处理请求失败:", e);
    console.error("[API] /api/user-status - 错误堆栈:", e instanceof Error ? e.stack : 'No stack trace');

    // 返回默认的未登录状态而不是错误，避免前端报错
    const fallbackResponse = respData({
      isLoggedIn: false,
      isPremium: false,
      canUseFree: true
    });

    return new NextResponse(JSON.stringify(fallbackResponse), {
      status: 200, // 返回200状态码，避免前端认为是网络错误
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache', // 错误不缓存
        'X-Error': 'fallback-response',
      },
    });
  }
}