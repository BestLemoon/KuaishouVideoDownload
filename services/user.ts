import { CreditsAmount, CreditsTransType, increaseCredits } from "./credit";
import { findUserByEmail, findUserByUuid, insertUser } from "@/models/user";

import { User } from "@/types/user";
import { auth } from "@/auth";
import { getOneYearLaterTimestr } from "@/lib/time";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { giftCredits } from '@/models/credit';

export async function saveUser(user: User) {
  try {
    const existUser = await findUserByEmail(user.email);
    if (!existUser) {
      await insertUser(user);

      // increase credits for new user, expire in one year
      await increaseCredits({
        user_uuid: user.uuid || "",
        trans_type: CreditsTransType.NewUser,
        credits: CreditsAmount.NewUserGet,
        expired_at: getOneYearLaterTimestr(),
      });
    } else {
      user.id = existUser.id;
      user.uuid = existUser.uuid;
      user.created_at = existUser.created_at;
    }

    return user;
  } catch (e) {
    console.log("save user failed: ", e);
    throw e;
  }
}

export async function getUserUuid() {
  try {
    // 在静态渲染时直接返回空字符串，避免动态服务器使用错误
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      return "";
    }

    console.log('[Service] getUserUuid - 开始获取用户UUID');
    let user_uuid = "";

    const token = await getBearerToken();
    console.log('[Service] getUserUuid - Bearer token:', token ? '已获取' : '未获取');

    if (token) {
      // api key
      if (token.startsWith("sk-")) {
        console.log('[Service] getUserUuid - 使用API Key获取用户UUID');
        const user_uuid = await getUserUuidByApiKey(token);
        console.log('[Service] getUserUuid - API Key用户UUID:', user_uuid ? '已获取' : '未获取');
        return user_uuid || "";
      }
    }

    console.log('[Service] getUserUuid - 尝试从session获取用户UUID');
    const session = await auth();
    console.log('[Service] getUserUuid - Session状态:', session ? '已获取' : '未获取');

    if (session && session.user && session.user.uuid) {
      user_uuid = session.user.uuid;
      console.log('[Service] getUserUuid - Session用户UUID:', user_uuid ? '已获取' : '未获取');
    }

    console.log('[Service] getUserUuid - 最终返回UUID:', user_uuid ? '已获取' : '未获取');
    return user_uuid;
  } catch (error) {
    // 如果是动态服务器使用错误，静默处理
    if (error instanceof Error && error.message.includes('Dynamic server usage')) {
      console.log('[Service] getUserUuid - 静态渲染时跳过用户UUID获取');
      return "";
    }
    console.error('[Service] getUserUuid - 获取用户UUID失败:', error);
    return "";
  }
}

export async function getBearerToken() {
  try {
    // 检查是否在构建时或静态渲染环境中
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      // 在构建时返回空字符串，避免访问headers
      return "";
    }

    const h = await headers();
    const auth = h.get("Authorization");
    if (!auth) {
      return "";
    }

    return auth.replace("Bearer ", "");
  } catch (error) {
    // 如果在静态渲染时调用，headers()会抛出错误，我们捕获并返回空字符串
    console.log('[Service] getBearerToken - 静态渲染时跳过header检查');
    return "";
  }
}

export async function getUserEmail() {
  let user_email = "";

  const session = await auth();
  if (session && session.user && session.user.email) {
    user_email = session.user.email;
  }

  return user_email;
}

export async function getUserInfo() {
  let user_uuid = await getUserUuid();

  if (!user_uuid) {
    return;
  }

  const user = await findUserByUuid(user_uuid);

  return user;
}

/**
 * 新用户注册后赠送积分
 */
export async function handleNewUserGift(user_uuid: string): Promise<boolean> {
  try {
    // 新用户赠送10积分，有效期12个月
    const success = await giftCredits(
      user_uuid,
      10,
      '新用户注册赠送积分',
      12
    );

    if (success) {
      console.log(`[Credits] New user ${user_uuid} received 10 gift credits`);
    } else {
      console.error(`[Credits] Failed to gift credits to new user ${user_uuid}`);
    }

    return success;
  } catch (error) {
    console.error('Failed to handle new user gift:', error);
    return false;
  }
}

/**
 * 检查用户是否已经获得过新用户积分
 */
export async function checkUserGiftReceived(user_uuid: string): Promise<boolean> {
  try {
    const { getSupabaseClient } = await import('@/models/db');
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('credits')
      .select('id')
      .eq('user_uuid', user_uuid)
      .eq('trans_type', 'gift')
      .eq('description', '新用户注册赠送积分')
      .limit(1);

    if (error) {
      console.error('Failed to check user gift status:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Failed to check user gift status:', error);
    return false;
  }
}

export async function checkUserIsPremium(user_uuid: string): Promise<boolean> {
  try {
    console.log('[Service] checkUserIsPremium - 开始检查用户Premium状态:', user_uuid);

    if (!user_uuid) {
      console.log('[Service] checkUserIsPremium - 用户UUID为空，返回false');
      return false;
    }

    // Check if user has any paid orders
    console.log('[Service] checkUserIsPremium - 查询用户订单');
    const { getOrdersByUserUuid } = await import("@/models/order");
    const orders = await getOrdersByUserUuid(user_uuid);
    console.log('[Service] checkUserIsPremium - 用户订单数量:', orders ? orders.length : 0);

    if (orders && orders.length > 0) {
      // User has paid orders, check if any are still valid
      const now = new Date();
      console.log('[Service] checkUserIsPremium - 检查订单有效性，当前时间:', now.toISOString());

      for (const order of orders) {
        console.log('[Service] checkUserIsPremium - 检查订单:', {
          order_no: order.order_no,
          status: order.status,
          interval: order.interval,
          expired_at: order.expired_at
        });

        if (order.status === 'paid') {
          // For one-time purchases, consider them premium
          if (order.interval === 'one-time') {
            console.log('[Service] checkUserIsPremium - 找到一次性付费订单，返回true');
            return true;
          }

          // For subscriptions, check if not expired
          if (order.expired_at) {
            const expiredAt = new Date(order.expired_at);
            console.log('[Service] checkUserIsPremium - 订阅到期时间:', expiredAt.toISOString());
            if (expiredAt > now) {
              console.log('[Service] checkUserIsPremium - 订阅未过期，返回true');
              return true;
            } else {
              console.log('[Service] checkUserIsPremium - 订阅已过期');
            }
          }
        }
      }
    }

    console.log('[Service] checkUserIsPremium - 未找到有效的付费订单，返回false');
    return false;
  } catch (e) {
    console.error("[Service] checkUserIsPremium - 检查用户Premium状态失败:", e);
    console.error("[Service] checkUserIsPremium - 错误堆栈:", e instanceof Error ? e.stack : 'No stack trace');
    return false;
  }
}
