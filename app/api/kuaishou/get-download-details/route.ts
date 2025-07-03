export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { decryptVideoUrl } from '@/lib/encryption';
import { consumeCredits, calculateRequiredCredits, createDownloadHistory, generateDownloadNo } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * 从 URL 中提取文件名
 */
function getFileName(url: string, resolution: string): string {
  const urlParts = url.split('/')
  let filename = urlParts[urlParts.length - 1].split('?')[0]
  const extension = filename.split('.').pop() || 'mp4'
  filename = filename.replace(`.${extension}`, '')
  return `KuaishouVideoDownload_${filename}_${resolution}.${extension}`
}

/**
 * POST /api/kuaishou/get-download-details - 验证权限并返回快手视频URL和文件名（零流量）
 */
export async function POST(request: Request) {
  let t: any;
  
  try {
    t = await getTranslations('api');
    const { token, original_url, video_id } = await request.json();
    
    if (!token) {
      return respErr(t('download.missing_token'));
    }

    // 解密 token 获取视频信息
    let videoInfo;
    try {
      videoInfo = await decryptVideoUrl(token);
    } catch (error) {
      return respErr(t('download.invalid_token'));
    }

    // 验证视频 URL（快手视频URL通常包含特定域名）
    if (!videoInfo.url.includes('kuaishou') && !videoInfo.url.includes('kwai')) {
      return respErr(t('download.invalid_video_url'));
    }

    // 获取用户会话（用于记录下载历史，可选）
    const session = await auth();
    let user_uuid = null;

    console.log('[get-download-details] 检查用户会话:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userUuid: session?.user?.uuid ? '已获取' : '未获取',
      userId: session?.user?.id ? '已获取' : '未获取',
      userEmail: session?.user?.email ? '已获取' : '未获取'
    });

    if (session?.user) {
      // 优先使用uuid字段，如果没有则使用id字段
      user_uuid = session.user.uuid || session.user.id;

      if (!user_uuid && session.user.email) {
        console.log('[get-download-details] 通过email查找用户UUID');
        const { findUserByEmail } = await import('@/models/user');
        const user = await findUserByEmail(session.user.email);
        user_uuid = user?.uuid;
        console.log('[get-download-details] 通过email查找结果:', user_uuid ? '已找到' : '未找到');
      }
    }

    console.log('[get-download-details] 最终用户UUID:', user_uuid ? '已获取' : '未获取');

    // 生成文件名
    const filename = getFileName(videoInfo.url, videoInfo.resolution);

    // 验证视频URL可访问性（HEAD请求）
    try {
      const headResponse = await fetch(videoInfo.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        }
      });

      if (!headResponse.ok) {
        throw new Error(t('download.video_fetch_failed', { status: headResponse.status.toString() }));
      }

      // 记录下载历史（仅当用户已登录时）
      if (user_uuid) {
        console.log('[get-download-details] 开始记录下载历史');
        const download_no = generateDownloadNo();
        const contentLength = headResponse.headers.get('content-length');

        const historyRecord = {
          download_no,
          user_uuid,
          video_url: videoInfo.url,
          url: original_url || undefined, // 使用通用的url字段
          original_tweet_url: original_url || undefined, // 保持向后兼容
          video_resolution: videoInfo.resolution,
          video_quality: videoInfo.quality,
          file_name: filename,
          file_size: contentLength ? parseInt(contentLength) : undefined,
          credits_consumed: 0, // 免费下载，无积分消耗
          download_status: 'completed',
          platform: 'kuaishou', // 标识为快手平台
          username: undefined, // 快手不使用username字段
          status_id: undefined, // 快手不使用status_id字段
          video_id: video_id || undefined, // 使用video_id字段
          description: `免费下载${videoInfo.resolution}快手视频`
        };

        console.log('[get-download-details] 下载历史记录数据:', {
          download_no,
          user_uuid,
          platform: 'kuaishou',
          video_resolution: videoInfo.resolution,
          file_name: filename
        });

        const historyCreated = await createDownloadHistory(historyRecord);
        if (!historyCreated) {
          console.error('[get-download-details] 下载历史记录创建失败，但继续处理下载请求');
        } else {
          console.log('[get-download-details] 下载历史记录创建成功');
        }
      } else {
        console.log('[get-download-details] 用户未登录，跳过下载历史记录');
      }

      // 返回下载详情给前端
      return respData({
        videoUrl: videoInfo.url,
        filename: filename,
        creditsRemaining: 0, // 免费模式下不显示积分
      });

    } catch (error) {
      console.error('Error verifying video URL:', error);
      return respErr(t('download.video_verification_failed'));
    }

  } catch (error) {
    console.error('Error getting download details:', error);
    return respErr(error instanceof Error ? error.message : t('download.unknown_error'));
  }
}
