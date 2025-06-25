import { NextResponse } from "next/server";

/**
 * 健康检查API端点
 * 用于验证API基础功能是否正常
 */
export async function GET() {
  try {
    const timestamp = new Date().toISOString();
    
    return NextResponse.json({
      status: "ok",
      timestamp,
      message: "API is working correctly"
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[API] /api/health - Health check failed:', error);
    
    return NextResponse.json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "API health check failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
}
