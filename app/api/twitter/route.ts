export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getVideoInfo } from '@/lib/twitter';
import { encryptVideoUrl, encryptBatchData } from '@/lib/encryption';

// Cache video info responses for 1 hour
const VIDEO_INFO_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

// Clean cache function
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of VIDEO_INFO_CACHE.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      VIDEO_INFO_CACHE.delete(key);
    }
  }
}

/**
 * POST /api/twitter - 解析Twitter视频URL
 */
export async function POST(req: Request) {
  // Clean expired cache entries on each request
  cleanCache();

  try {
    const { url } = await req.json();
    
    if (!url) {
      return respErr('URL is required');
    }

    // Check cache first
    const cachedData = VIDEO_INFO_CACHE.get(url);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      console.log('[Debug] Returning cached data for:', url);
      return respData(cachedData.data);
    }

    console.log('[Debug] Processing URL:', url);

    const result = await getVideoInfo(url);
    
    if ('error' in result) {
      console.error('[Debug] Video info error:', result.error);
      return respErr(result.error);
    }

    // 从 URL 中提取 username 和 status ID
    const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
    const username = match ? match[1] : null;
    const statusId = match ? match[2] : null;

    // 为每个视频生成加密的下载token，不暴露原始URL
    const videosWithTokens = await Promise.all(
      result.videos.map(async (video) => {
        const token = await encryptVideoUrl({
          url: video.url,
          resolution: video.resolution,
          quality: video.quality,
        });
        
        return {
          resolution: video.resolution,
          quality: video.quality,
          downloadUrl: `/api/twitter/get-download-details?token=${token}`
          // 故意移除原始的 video.url，只保留必要信息
        };
      })
    );

    // 构建响应数据
    const responseData = {
      thumbnail: result.thumbnail || null,
      videos: videosWithTokens,
      text: result.text,
      username,
      statusId
    };

    // 加密响应数据，不直接返回
    const encryptedToken = await encryptBatchData(responseData);

    const response = {
      token: encryptedToken
    };

    // Cache the successful response (缓存加密后的数据)
    VIDEO_INFO_CACHE.set(url, {
      data: response,
      timestamp: Date.now()
    });

    console.log('[Debug] Final response with encrypted token');
    
    return respData(response);

  } catch (error) {
    console.error('[Debug] Error parsing video:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to parse video');
  }
} 