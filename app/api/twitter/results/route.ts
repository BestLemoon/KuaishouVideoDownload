

import { respData, respErr } from "@/lib/resp";
import { decryptBatchData } from '@/lib/encryption';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * POST /api/twitter/results - 安全获取单个下载结果
 */
export async function POST(req: Request) {
  try {
    const t = await getTranslations('api');
    
    // 用户认证检查（可选，单个下载可能允许匿名）
    const session = await auth();

    const { token } = await req.json();
    
    if (!token) {
      return respErr('Token is required');
    }

    console.log(`[Single Results] Fetching download results for user ${session?.user?.email || 'anonymous'}`);

    // 解密数据
    const downloadData = await decryptBatchData(token);

    return respData(downloadData);

  } catch (error) {
    console.error('[Single Results] Error fetching download results:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to fetch download results');
  }
} 