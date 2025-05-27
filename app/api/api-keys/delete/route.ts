import { respData, respErr } from "@/lib/resp";
import { deleteApikey } from "@/models/apikey";
import { getUserUuid, checkUserIsPremium } from "@/services/user";

export async function POST(req: Request) {
  try {
    const { api_key } = await req.json();
    
    if (!api_key) {
      return respErr("API key is required");
    }

    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("Please login first");
    }

    // 检查用户是否为付费用户
    const isPremium = await checkUserIsPremium(user_uuid);
    if (!isPremium) {
      return respErr("API key management is only available for premium users");
    }

    const success = await deleteApikey(api_key, user_uuid);
    
    if (!success) {
      return respErr("Failed to delete API key");
    }

    return respData({ 
      success: true,
      message: "API key deleted successfully" 
    });

  } catch (error) {
    console.error("Delete API key error:", error);
    return respErr("Failed to delete API key");
  }
} 