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
  let user_uuid = "";

  const token = await getBearerToken();

  if (token) {
    // api key
    if (token.startsWith("sk-")) {
      const user_uuid = await getUserUuidByApiKey(token);

      return user_uuid || "";
    }
  }

  const session = await auth();
  if (session && session.user && session.user.uuid) {
    user_uuid = session.user.uuid;
  }

  return user_uuid;
}

export async function getBearerToken() {
  const h = await headers();
  const auth = h.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
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
    // 新用户赠送100积分，有效期12个月
    const success = await giftCredits(
      user_uuid,
      100,
      '新用户注册赠送积分',
      12
    );

    if (success) {
      console.log(`[Credits] New user ${user_uuid} received 100 gift credits`);
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
    if (!user_uuid) {
      return false;
    }

    // Check if user has any paid orders
    const { getOrdersByUserUuid } = await import("@/models/order");
    const orders = await getOrdersByUserUuid(user_uuid);
    
    if (orders && orders.length > 0) {
      // User has paid orders, check if any are still valid
      const now = new Date();
      for (const order of orders) {
        if (order.status === 'paid') {
          // For one-time purchases, consider them premium
          if (order.interval === 'one-time') {
            return true;
          }
          
          // For subscriptions, check if not expired
          if (order.expired_at) {
            const expiredAt = new Date(order.expired_at);
            if (expiredAt > now) {
              return true;
            }
          }
        }
      }
    }

    return false;
  } catch (e) {
    console.log("check user is premium failed: ", e);
    return false;
  }
}
