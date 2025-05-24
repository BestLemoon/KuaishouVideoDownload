export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getUserDownloadHistory, getUserDownloadStats } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * GET /api/twitter/download/history - 查询用户下载历史
 */
export async function GET(request: Request) {
  try {
    const t = await getTranslations('api');
    
    // 用户认证
    const session = await auth();
    if (!session?.user?.id) {
      return respErr(t('auth.login_required'));
    }

    const user_uuid = session.user.id;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeStats = url.searchParams.get('include_stats') === 'true';

    // 获取下载历史
    const history = await getUserDownloadHistory(user_uuid, limit, offset);
    
    // 如果需要统计信息，也获取统计数据
    let stats = undefined;
    if (includeStats) {
      stats = await getUserDownloadStats(user_uuid);
    }

    return respData({
      user_uuid,
      history,
      stats,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    });

  } catch (error) {
    console.error('Failed to get download history:', error);
    const t = await getTranslations('api');
    return respErr(t('download.get_history_failed'));
  }
} 