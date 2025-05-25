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
  return `TwitterDown_${filename}_${resolution}.${extension}`
}

/**
 * POST /api/twitter/get-download-details - 验证权限并返回Twitter URL和文件名（零流量）
 */
export async function POST(request: Request) {
  let t: any;
  
  try {
    t = await getTranslations('api');
    const { token, original_url, username, status_id } = await request.json();
    
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

    // 验证视频 URL
    if (!videoInfo.url.startsWith('https://video.twimg.com/')) {
      return respErr(t('download.invalid_video_url'));
    }

    // 用户认证检查
    const session = await auth();
    if (!session?.user) {
      return respErr(t('auth.login_required_download'));
    }

    // 获取用户UUID
    let user_uuid = session.user.uuid;
    if (!user_uuid && session.user.email) {
      const { findUserByEmail } = await import('@/models/user');
      const user = await findUserByEmail(session.user.email);
      user_uuid = user?.uuid;
    }
    
    if (!user_uuid) {
      return respErr(t('auth.login_required_download'));
    }

    // 计算所需积分
    const required_credits = calculateRequiredCredits(videoInfo.resolution);
    
    // 扣除积分
    const creditResult = await consumeCredits(
      user_uuid,
      required_credits,
      `下载${videoInfo.resolution}视频`,
      videoInfo.resolution,
      videoInfo.url
    );

    if (!creditResult.success) {
      if (creditResult.messageKey) {
        const message = creditResult.messageKey === 'credits.insufficient' && creditResult.params
          ? t(creditResult.messageKey, creditResult.params)
          : t(creditResult.messageKey);
        return respErr(message);
      }
      return respErr(creditResult.message || t('credits.deduction_failed'));
    }

    // 生成文件名
    const filename = getFileName(videoInfo.url, videoInfo.resolution);

    // 验证视频URL可访问性（HEAD请求）
    try {
      const headResponse = await fetch(videoInfo.url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!headResponse.ok) {
        throw new Error(t('download.video_fetch_failed', { status: headResponse.status.toString() }));
      }

      // 记录下载历史
      const download_no = generateDownloadNo();
      const contentLength = headResponse.headers.get('content-length');
      
      await createDownloadHistory({
        download_no,
        user_uuid,
        video_url: videoInfo.url,
        original_tweet_url: original_url || undefined,
        video_resolution: videoInfo.resolution,
        video_quality: videoInfo.quality,
        file_name: filename,
        file_size: contentLength ? parseInt(contentLength) : undefined,
        credits_consumed: required_credits,
        download_status: 'completed',
        username: username || undefined,
        status_id: status_id || undefined,
        description: `下载${videoInfo.resolution}视频`
      });

      console.log(`[Credits] User ${user_uuid} consumed ${required_credits} credits for ${videoInfo.resolution} video, remaining: ${creditResult.balance?.available_credits}`);
      console.log(`[Download] Download history recorded: ${download_no}`);

      // 返回下载详情给前端
      return respData({
        videoUrl: videoInfo.url,
        filename: filename,
        creditsRemaining: creditResult.balance?.available_credits || 0,
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