export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getVideoInfo } from '@/lib/twitter';
import { encryptVideoUrl, encryptBatchData } from '@/lib/encryption';
import { validateTwitterUrls, normalizeTwitterUrl } from '@/lib/url-validator';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

// 批量处理的限制
const MAX_BATCH_SIZE = 10;
const PROCESS_DELAY = 500; // 每个请求之间的延迟（毫秒）

/**
 * POST /api/twitter/batch - 批量解析Twitter视频URL
 */
export async function POST(req: Request) {
  try {
    const t = await getTranslations('api');
    
    // 获取用户会话（可选，用于保存历史记录）
    const session = await auth();

    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls)) {
      return respErr('URLs array is required');
    }

    // 限制批量处理数量
    if (urls.length > MAX_BATCH_SIZE) {
      return respErr(t('batch.max_urls_exceeded', { max: MAX_BATCH_SIZE }));
    }

    // 验证URL格式
    const normalizedUrls = urls.map(url => normalizeTwitterUrl(url));
    const validation = validateTwitterUrls(normalizedUrls);

    if (validation.invalid.length > 0) {
      return respErr(t('batch.invalid_urls_found'));
    }

    if (validation.valid.length === 0) {
      return respErr(t('batch.no_valid_urls'));
    }

    console.log(`[Batch] Processing ${validation.valid.length} URLs for user ${session?.user?.email || 'anonymous'}`);

    // 批量处理URL
    const results = [];
    const errors = [];

    for (let i = 0; i < validation.valid.length; i++) {
      const url = validation.valid[i];
      
      try {
        console.log(`[Batch] Processing URL ${i + 1}/${validation.valid.length}: ${url}`);
        
        const result = await getVideoInfo(url);
        
        if ('error' in result) {
          console.error(`[Batch] Video info error for ${url}:`, result.error);
          errors.push({
            url,
            error: result.error
          });
          continue;
        }

        // 从 URL 中提取 username 和 status ID
        const match = url.match(/(?:twitter\.com|x\.com)\/([^/]+)\/status\/(\d+)/);
        const username = match ? match[1] : null;
        const statusId = match ? match[2] : null;

        // 为每个视频生成加密的下载token
        const videosWithTokens = await Promise.all(
          result.videos.map(async (video) => {
            const token = await encryptVideoUrl({
              url: video.url,
              resolution: video.resolution,
              quality: video.quality,
            });
            
            return {
              ...video,
              downloadUrl: `/api/twitter/get-download-details?token=${token}`
            };
          })
        );

        // 构建响应数据
        const processedResult = {
          originalUrl: url,
          thumbnail: result.thumbnail || null,
          videos: videosWithTokens,
          text: result.text,
          username,
          statusId,
          processedAt: new Date().toISOString()
        };

        results.push(processedResult);

        // 添加延迟以避免请求过于频繁
        if (i < validation.valid.length - 1) {
          await new Promise(resolve => setTimeout(resolve, PROCESS_DELAY));
        }

      } catch (error) {
        console.error(`[Batch] Error processing ${url}:`, error);
        errors.push({
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`[Batch] Completed. Successful: ${results.length}, Failed: ${errors.length}`);

    // 加密批量数据而不是直接返回
    const batchData = {
      results,
      errors,
      summary: {
        total: validation.valid.length,
        successful: results.length,
        failed: errors.length
      }
    };

    const encryptedToken = await encryptBatchData(batchData);

    return respData({
      token: encryptedToken,
      summary: batchData.summary // 只返回摘要信息，不暴露详细数据
    });

  } catch (error) {
    console.error('[Batch] Error processing batch request:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to process batch request');
  }
} 