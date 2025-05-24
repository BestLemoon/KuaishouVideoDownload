export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getUserCreditHistory } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * GET /api/credits/history - 查询用户积分交易记录
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

    // 获取积分交易记录
    const history = await getUserCreditHistory(user_uuid, limit, offset);

    return respData({
      user_uuid,
      history,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    });

  } catch (error) {
    console.error('Failed to get credit history:', error);
    const t = await getTranslations('api');
    return respErr(t('credits.get_history_failed'));
  }
} 