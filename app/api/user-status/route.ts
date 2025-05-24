export const runtime = "edge";

import { respData, respErr } from "@/lib/resp";
import { getUserUuid, checkUserIsPremium } from "@/services/user";

export async function GET() {
  try {
    const user_uuid = await getUserUuid();
    
    if (!user_uuid) {
      return respData({
        isLoggedIn: false,
        isPremium: false,
        canUseFree: true
      });
    }

    const isPremium = await checkUserIsPremium(user_uuid);

    return respData({
      isLoggedIn: true,
      isPremium,
      canUseFree: true // This will be managed by frontend localStorage
    });
  } catch (e) {
    console.error("Get user status failed:", e);
    return respErr("Failed to get user status");
  }
} 