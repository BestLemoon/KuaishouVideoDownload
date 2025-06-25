import { respData } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { NextResponse } from "next/server";

/**
 * 简化版用户状态API
 * 只检查用户是否登录，不检查Premium状态，避免复杂的数据库查询
 */
export async function GET() {
  try {
    console.log('[API] /api/user-status-simple - 开始处理请求');
    
    const user_uuid = await getUserUuid();
    console.log('[API] /api/user-status-simple - 获取用户UUID:', user_uuid ? '已获取' : '未获取');
    
    const responseData = respData({
      isLoggedIn: !!user_uuid,
      isPremium: false, // 暂时设为false，避免复杂查询
      canUseFree: true
    });
    
    console.log('[API] /api/user-status-simple - 返回数据:', responseData);
    
    return new NextResponse(JSON.stringify(responseData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60', // 1分钟缓存
      },
    });
  } catch (e) {
    console.error("[API] /api/user-status-simple - 处理请求失败:", e);
    
    // 返回默认的未登录状态
    const fallbackResponse = respData({
      isLoggedIn: false,
      isPremium: false,
      canUseFree: true
    });
    
    return new NextResponse(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Error': 'fallback-response',
      },
    });
  }
}
