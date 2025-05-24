export const runtime = 'edge'

import { respErr } from "@/lib/resp";
import { decryptVideoUrl } from '@/lib/encryption';
import { consumeCredits, calculateRequiredCredits, createDownloadHistory, generateDownloadNo } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * 从 URL 中提取文件名
 */
function getFileName(url: string, resolution: string): string {
  // 从原始 URL 中提取文件名
  const urlParts = url.split('/')
  let filename = urlParts[urlParts.length - 1].split('?')[0]
  
  // 移除文件扩展名
  const extension = filename.split('.').pop() || 'mp4'
  filename = filename.replace(`.${extension}`, '')
  
  // 添加网站名称前缀、分辨率和扩展名
  return `TwitterDown_${filename}_${resolution}.${extension}`
}

/**
 * GET /api/twitter/download - 下载视频（需要积分）
 */
export async function GET(request: Request) {
  let t: any;
  
  try {
    t = await getTranslations('api');
    const url = new URL(request.url);
    
    // 获取并验证 token
    const token = url.searchParams.get('token');
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

    try {
      // 获取视频内容
      const videoResponse = await fetch(videoInfo.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!videoResponse.ok) {
        throw new Error(t('download.video_fetch_failed', { status: videoResponse.status.toString() }));
      }

      // 记录下载历史
      const download_no = generateDownloadNo();
      const contentLength = videoResponse.headers.get('content-length');
      
      // 从 URL 参数中获取原始推文信息（如果有的话）
      const originalUrl = url.searchParams.get('original_url') || undefined;
      const username = url.searchParams.get('username') || undefined;
      const statusId = url.searchParams.get('status_id') || undefined;
      
      await createDownloadHistory({
        download_no,
        user_uuid,
        video_url: videoInfo.url,
        original_tweet_url: originalUrl,
        video_resolution: videoInfo.resolution,
        video_quality: videoInfo.quality,
        file_name: filename,
        file_size: contentLength ? parseInt(contentLength) : undefined,
        credits_consumed: required_credits,
        download_status: 'completed',
        username,
        status_id: statusId,
        description: `下载${videoInfo.resolution}视频`
      });

      // 设置响应头
      const headers = new Headers({
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'video/mp4',
        'Cache-Control': 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'X-Credits-Consumed': required_credits.toString(),
        'X-Credits-Remaining': creditResult.balance?.available_credits?.toString() || '0',
        'X-Download-No': download_no,
      });
      
      // 如果视频源提供了内容长度，也设置它
      if (contentLength) {
        headers.set('Content-Length', contentLength);
        headers.set('Accept-Ranges', 'bytes');
      }

      console.log(`[Credits] User ${user_uuid} consumed ${required_credits} credits for ${videoInfo.resolution} video, remaining: ${creditResult.balance?.available_credits}`);
      console.log(`[Download] Download history recorded: ${download_no}`);

      // 返回视频流
      return new Response(videoResponse.body, {
        headers,
        status: 200
      });

    } catch (error) {
      console.error('视频下载错误:', error);
      
      // 记录失败的下载历史
      const download_no = generateDownloadNo();
      await createDownloadHistory({
        download_no,
        user_uuid,
        video_url: videoInfo.url,
        video_resolution: videoInfo.resolution,
        video_quality: videoInfo.quality,
        file_name: filename,
        credits_consumed: required_credits,
        download_status: 'failed',
        description: `下载${videoInfo.resolution}视频失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
      
      return respErr(t('download.download_failed'));
    }

  } catch (error) {
    console.error('下载处理错误:', error);
    if (!t) {
      t = await getTranslations('api');
    }
    return respErr(t('download.server_error'));
  }
}