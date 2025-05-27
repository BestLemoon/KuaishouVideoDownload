export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getVideoInfo } from '@/lib/twitter';
import { getApiKey } from '@/services/apikey';
import { getUserUuidByApiKey } from '@/models/apikey';
import { checkUserIsPremium } from '@/services/user';

// 带状态码的错误返回函数
function respErrWithStatus(message: string, status: number = 400) {
  return new Response(JSON.stringify({
    code: -1,
    message: message
  }), {
    status: status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * POST /api/v1/twitter - API版本的Twitter视频URL解析 (仅付费用户可用)
 */
export async function POST(req: Request) {
  try {
    // 1. 验证API Key
    const apiKey = getApiKey(req);
    if (!apiKey) {
      return respErrWithStatus('Missing API key. Please include Authorization header with "Bearer YOUR_API_KEY"', 401);
    }

    // 2. 根据API Key获取用户UUID
    const user_uuid = await getUserUuidByApiKey(apiKey);
    if (!user_uuid) {
      return respErrWithStatus('Invalid API key', 401);
    }

    // 3. 检查用户是否为付费用户
    const isPremium = await checkUserIsPremium(user_uuid);
    if (!isPremium) {
      return respErrWithStatus('API access is only available for premium users. Please upgrade your account.', 403);
    }

    // 4. 解析请求参数
    const { url } = await req.json();
    
    if (!url) {
      return respErrWithStatus('URL parameter is required', 400);
    }

    // 5. 验证URL格式
    const urlPattern = /(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/;
    if (!urlPattern.test(url)) {
      return respErrWithStatus('Invalid Twitter/X URL format. Expected format: https://twitter.com/username/status/1234567890 or https://x.com/username/status/1234567890', 400);
    }

    console.log('[API v1] Processing URL:', url);

    // 6. 获取视频信息
    const result = await getVideoInfo(url);
    
    if ('error' in result) {
      console.error('[API v1] Video info error:', result.error);
      return respErrWithStatus(result.error, 422);
    }

    // 7. 从 URL 中提取信息
    const match = url.match(urlPattern);
    const username = match ? match[1] : null;
    const statusId = match ? match[2] : null;

    // 8. 构建API响应数据（API版本直接返回原始URL，不加密）
    const responseData = {
      success: true,
      data: {
        thumbnail: result.thumbnail || null,
        videos: result.videos.map(video => ({
          resolution: video.resolution,
          quality: video.quality,
          url: video.url // API版本直接返回原始URL
        })),
        text: result.text,
        username,
        statusId,
        processed_at: new Date().toISOString()
      }
    };

    console.log('[API v1] Successfully processed video');
    
    return respData(responseData.data);

  } catch (error) {
    console.error('[API v1] Error parsing video:', error);
    
    if (error instanceof SyntaxError) {
      return respErrWithStatus('Invalid JSON in request body', 400);
    }
    
    return respErrWithStatus(
      error instanceof Error ? error.message : 'Failed to parse video', 
      500
    );
  }
}

/**
 * GET /api/v1/twitter - API接口文档
 */
export async function GET() {
  const documentation = {
    name: "TwitterDown API v1",
    description: "Extract video information from Twitter/X URLs",
    version: "1.0.0",
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer YOUR_API_KEY",
      note: "Only available for premium users"
    },
    endpoints: {
      "POST /api/v1/twitter": {
        description: "Extract video information from Twitter/X URL",
        request: {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_API_KEY"
          },
          body: {
            url: "https://twitter.com/username/status/1234567890"
          }
        },
        response: {
          success: {
            code: 0,
            data: {
              thumbnail: "string|null",
              videos: [
                {
                  resolution: "string",
                  quality: "string", 
                  url: "string"
                }
              ],
              text: "string",
              username: "string",
              statusId: "string",
              processed_at: "ISO 8601 timestamp"
            }
          },
          error: {
            code: -1,
            message: "Error description",
            http_status: "HTTP status code"
          }
        }
      }
    },
    error_codes: {
      400: "Bad Request - Missing or invalid parameters",
      401: "Unauthorized - Missing or invalid API key",
      403: "Forbidden - Premium subscription required",
      422: "Unprocessable Entity - Unable to process the Twitter URL",
      500: "Internal Server Error - Server error occurred"
    },
    examples: {
      curl: `curl -X POST "https://yourapp.com/api/v1/twitter" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{"url": "https://twitter.com/username/status/1234567890"}'`
    }
  };

  return respData(documentation);
} 