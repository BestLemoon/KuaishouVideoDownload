export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getVideoInfo } from '@/lib/kuaishou';
import { encryptBatchData, encryptVideoUrl } from '@/lib/encryption';
import { auth } from "@/auth";
import { getTranslations } from 'next-intl/server';
import { isValidKuaishouUrl, validateKuaishouUrls, normalizeKuaishouUrl } from '@/lib/url-validator';

const MAX_BATCH_SIZE = 10; // 限制批量处理数量

/**
 * POST /api/kuaishou/batch - 批量解析快手视频URL
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
    const normalizedUrls = urls.map(url => normalizeKuaishouUrl(url));
    const validation = validateKuaishouUrls(normalizedUrls);

    if (validation.invalid.length > 0) {
      return respErr(t('batch.invalid_urls_found'));
    }

    if (validation.valid.length === 0) {
      return respErr(t('batch.no_valid_urls'));
    }

    console.log(`[Batch] Processing ${validation.valid.length} Kuaishou URLs`);

    // 并行处理所有URL
    const results = await Promise.allSettled(
      validation.valid.map(async (url) => {
        try {
          const result = await getVideoInfo(url);
          
          if ('error' in result) {
            return {
              url,
              success: false,
              error: result.error
            };
          }

          // 从 URL 中提取视频ID
          const match = url.match(/(?:kuaishou\.com|kwai\.com|v\.kuaishou\.com)\/(?:short-video\/)?([a-zA-Z0-9_-]+)/i);
          const videoId = match ? match[1] : null;

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
                downloadUrl: `/api/kuaishou/get-download-details?token=${token}`
                // 故意移除原始的 video.url，只保留必要信息
              };
            })
          );

          return {
            url,
            success: true,
            data: {
              thumbnail: result.thumbnail || null,
              videos: videosWithTokens,
              text: result.text,
              videoId
            }
          };
        } catch (error) {
          return {
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // 分离成功和失败的结果
    const successful: any[] = [];
    const failed: any[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        if (result.value.success) {
          successful.push(result.value);
        } else {
          failed.push(result.value);
        }
      } else {
        failed.push({
          url: 'unknown',
          success: false,
          error: result.reason?.message || 'Processing failed'
        });
      }
    });

    console.log(`[Batch] Results: ${successful.length} successful, ${failed.length} failed`);

    // 如果没有成功的结果
    if (successful.length === 0) {
      return respErr(t('batch.all_urls_failed'));
    }

    // 加密批量数据
    const encryptedToken = await encryptBatchData({
      successful,
      failed,
      total: urls.length,
      processed_at: new Date().toISOString()
    });

    return respData({
      token: encryptedToken,
      summary: {
        total: urls.length,
        successful: successful.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('[Batch] Error processing batch request:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to process batch request');
  }
}
