export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { getUserCreditBalance } from '@/models/credit';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * GET /api/credits/balance - 查询用户积分余额
 */
export async function GET(request: Request) {
  try {
    const t = await getTranslations('api');
    
    // 用户认证
    const session = await auth();
    if (!session?.user) {
      return respErr(t('auth.login_required'));
    }

    // 优先使用uuid，如果没有则尝试用email查找
    let user_uuid = session.user.uuid;
    if (!user_uuid && session.user.email) {
      const { findUserByEmail } = await import('@/models/user');
      const user = await findUserByEmail(session.user.email);
      user_uuid = user?.uuid;
    }
    
    if (!user_uuid) {
      return respErr(t('auth.login_required'));
    }

    // 获取积分余额
    const balance = await getUserCreditBalance(user_uuid);

    return respData(balance);

  } catch (error) {
    console.error('Failed to get credit balance:', error);
    const t = await getTranslations('api');
    return respErr(t('credits.get_balance_failed'));
  }
} 