export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getUserDownloadHistoryByPlatform, getUserDownloadStatsByPlatform } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * GET /api/kuaishou/download/history - 查询用户快手下载历史
 */
export async function GET(request: Request) {
  try {
    const t = await getTranslations('api');

    // 用户认证
    const session = await auth();
    if (!session?.user) {
      return respErr(t('auth.login_required'));
    }

    // 获取用户UUID，优先使用uuid字段，如果没有则使用id字段
    let user_uuid = session.user.uuid || session.user.id;

    // 如果还是没有UUID，尝试通过email查找用户
    if (!user_uuid && session.user.email) {
      const { findUserByEmail } = await import('@/models/user');
      const user = await findUserByEmail(session.user.email);
      user_uuid = user?.uuid;
    }

    if (!user_uuid) {
      return respErr(t('auth.user_not_found'));
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const includeStats = url.searchParams.get('include_stats') === 'true';

    // 使用优化的平台特定查询函数
    const { records: kuaishouHistory, total } = await getUserDownloadHistoryByPlatform(
      user_uuid,
      'kuaishou',
      limit,
      offset
    );

    // 如果需要统计信息，也获取统计数据
    let stats = undefined;
    if (includeStats) {
      stats = await getUserDownloadStatsByPlatform(user_uuid, 'kuaishou');
    }

    return respData({
      user_uuid,
      history: kuaishouHistory,
      stats,
      pagination: {
        limit,
        offset,
        total,
        has_more: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Failed to get Kuaishou download history:', error);
    const t = await getTranslations('api');
    return respErr(t('download.get_history_failed'));
  }
}
