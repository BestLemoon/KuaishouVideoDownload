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

// 简单的内存缓存，避免重复调用
let userUuidCache: { uuid: string; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export async function getUserUuid() {
  try {
    // 在静态渲染时直接返回空字符串，避免动态服务器使用错误
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      return "";
    }

    // 检查缓存
    if (userUuidCache && Date.now() - userUuidCache.timestamp < CACHE_DURATION) {
      return userUuidCache.uuid;
    }

    let user_uuid = "";

    const token = await getBearerToken();

    if (token) {
      // api key
      if (token.startsWith("sk-")) {
        const apiKeyUuid = await getUserUuidByApiKey(token);
        user_uuid = apiKeyUuid || "";
        if (user_uuid) {
          // 更新缓存
          userUuidCache = { uuid: user_uuid, timestamp: Date.now() };
          return user_uuid;
        }
      }
    }

    const session = await auth();

    if (session && session.user) {
      // 优先使用uuid字段，如果没有则使用id字段
      user_uuid = session.user.uuid || session.user.id || "";

      // 如果还是没有UUID，尝试通过email查找用户
      if (!user_uuid && session.user.email) {
        const user = await findUserByEmail(session.user.email);
        user_uuid = user?.uuid || "";
      }
    }

    // 更新缓存
    if (user_uuid) {
      userUuidCache = { uuid: user_uuid, timestamp: Date.now() };
    }

    return user_uuid;
  } catch (error) {
    // 如果是动态服务器使用错误，静默处理
    if (error instanceof Error && error.message.includes('Dynamic server usage')) {
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

// Premium状态缓存
let premiumStatusCache: Map<string, { isPremium: boolean; timestamp: number }> = new Map();
const PREMIUM_CACHE_DURATION = 10 * 60 * 1000; // 10分钟缓存

export async function checkUserIsPremium(user_uuid: string): Promise<boolean> {
  try {
    if (!user_uuid) {
      return false;
    }

    // 检查缓存
    const cached = premiumStatusCache.get(user_uuid);
    if (cached && Date.now() - cached.timestamp < PREMIUM_CACHE_DURATION) {
      return cached.isPremium;
    }

    // Check if user has any paid orders
    const { getOrdersByUserUuid } = await import("@/models/order");
    const orders = await getOrdersByUserUuid(user_uuid);

    let isPremium = false;

    if (orders && orders.length > 0) {
      // User has paid orders, check if any are still valid
      const now = new Date();

      for (const order of orders) {
        if (order.status === 'paid') {
          // For one-time purchases, consider them premium
          if (order.interval === 'one-time') {
            isPremium = true;
            break;
          }

          // For subscriptions, check if not expired
          if (order.expired_at) {
            const expiredAt = new Date(order.expired_at);
            if (expiredAt > now) {
              isPremium = true;
              break;
            }
          }
        }
      }
    }

    // 更新缓存
    premiumStatusCache.set(user_uuid, { isPremium, timestamp: Date.now() });

    // 清理过期的缓存条目（简单的清理策略）
    if (premiumStatusCache.size > 100) {
      const now = Date.now();
      for (const [key, value] of premiumStatusCache.entries()) {
        if (now - value.timestamp > PREMIUM_CACHE_DURATION) {
          premiumStatusCache.delete(key);
        }
      }
    }

    return isPremium;
  } catch (e) {
    console.error("[Service] checkUserIsPremium - 检查用户Premium状态失败:", e);
    return false;
  }
}

/**
 * 清理用户相关的缓存
 */
export function clearUserCache(user_uuid?: string) {
  if (user_uuid) {
    // 清理特定用户的缓存
    premiumStatusCache.delete(user_uuid);
    if (userUuidCache && userUuidCache.uuid === user_uuid) {
      userUuidCache = null;
    }
  } else {
    // 清理所有缓存
    premiumStatusCache.clear();
    userUuidCache = null;
  }
}

/**
 * 获取缓存统计信息（用于调试）
 */
export function getCacheStats() {
  return {
    userUuidCache: userUuidCache ? {
      uuid: userUuidCache.uuid,
      age: Date.now() - userUuidCache.timestamp
    } : null,
    premiumCacheSize: premiumStatusCache.size,
    premiumCacheEntries: Array.from(premiumStatusCache.entries()).map(([uuid, data]) => ({
      uuid,
      isPremium: data.isPremium,
      age: Date.now() - data.timestamp
    }))
  };
}
