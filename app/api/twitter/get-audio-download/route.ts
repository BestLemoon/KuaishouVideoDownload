export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getVideoInfo } from '@/lib/twitter';
import { consumeCredits, createDownloadHistory, generateDownloadNo } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';
import { SignJWT } from 'jose';

/**
 * 生成音频下载的JWT token
 */
async function generateAudioJWT(videoUrl: string, filename: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET_KEY || 'default-secret');
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    url: videoUrl,
    filename: filename,
    nbf: now,
    exp: now + 3600, // 1小时后过期
    iat: now
  };

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .sign(secret);

  return jwt;
}

/**
 * 获取最低画质的视频URL
 */
function getLowestQualityVideo(videos: any[]): any {
  if (videos.length === 0) return null;
  
  // 按分辨率排序，获取最低画质
  const sorted = videos.sort((a, b) => {
    const heightA = parseInt(a.resolution.replace('p', ''));
    const heightB = parseInt(b.resolution.replace('p', ''));
    return heightA - heightB;
  });
  
  return sorted[0];
}

/**
 * POST /api/twitter/get-audio-download - 获取音频下载链接
 */
export async function POST(request: Request) {
  let t: any;
  
  try {
    t = await getTranslations('api');
    const { original_url, username, status_id } = await request.json();
    
    if (!original_url) {
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

    // 获取视频信息
    const videoInfo = await getVideoInfo(original_url);
    if ('error' in videoInfo) {
      return respErr(videoInfo.error);
    }

    // 获取最低画质的视频URL
    const lowestQualityVideo = getLowestQualityVideo(videoInfo.videos);
    if (!lowestQualityVideo) {
      return respErr(t('download.no_video_found'));
    }

    // 扣除积分（音频下载也需要1个积分）
    const required_credits = 1;
    const creditResult = await consumeCredits(
      user_uuid,
      required_credits,
      '下载音频',
      'MP3',
      lowestQualityVideo.url
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

    // 生成音频文件名
    const tweetId = status_id || original_url.split('/status/')[1]?.split('?')[0] || 'audio';
    const audioFilename = `TwitterDown-${username || 'user'}-${tweetId}-(128kbps).mp3`;

    // 生成JWT token
    const jwtToken = await generateAudioJWT(lowestQualityVideo.url, audioFilename);

    // 构建音频下载URL
    const audioDownloadUrl = `https://s1.twcdn.net/download-mp3?file=${jwtToken}`;

    // 记录下载历史
    const download_no = generateDownloadNo();
    await createDownloadHistory({
      download_no,
      user_uuid,
      video_url: lowestQualityVideo.url,
      original_tweet_url: original_url,
      video_resolution: 'MP3',
      video_quality: 'Audio',
      file_name: audioFilename,
      file_size: undefined, // 音频文件大小未知
      credits_consumed: required_credits,
      download_status: 'completed',
      username: username || undefined,
      status_id: status_id || undefined,
      description: '下载音频'
    });

    console.log(`[Credits] User ${user_uuid} consumed ${required_credits} credits for audio download, remaining: ${creditResult.balance?.available_credits}`);
    console.log(`[Download] Audio download history recorded: ${download_no}`);

    // 尝试直接下载音频并返回blob
    try {
      const audioResponse = await fetch(audioDownloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!audioResponse.ok) {
        throw new Error(`Audio download failed: ${audioResponse.status}`);
      }

      const audioBlob = await audioResponse.arrayBuffer();

      return respData({
        audioBlob: Array.from(new Uint8Array(audioBlob)),
        filename: audioFilename,
        creditsRemaining: creditResult.balance?.available_credits || 0,
      });

    } catch (error) {
      console.error('Error downloading audio:', error);
      // 如果直接下载失败，返回URL让前端处理
      return respData({
        audioUrl: audioDownloadUrl,
        filename: audioFilename,
        creditsRemaining: creditResult.balance?.available_credits || 0,
      });
    }

  } catch (error) {
    console.error('Error getting audio download:', error);
    return respErr(error instanceof Error ? error.message : t('download.unknown_error'));
  }
} 