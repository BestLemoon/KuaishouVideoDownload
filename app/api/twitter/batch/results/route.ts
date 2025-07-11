

import { respData, respErr } from "@/lib/resp";
import { decryptBatchData } from '@/lib/encryption';
import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';

/**
 * POST /api/twitter/batch/results - 安全获取批量下载结果
 */
export async function POST(req: Request) {
  try {
    const t = await getTranslations('api');
    
    // 获取用户会话（可选）
    const session = await auth();

    const { token } = await req.json();
    
    if (!token) {
      return respErr('Token is required');
    }

    console.log(`[Batch Results] Fetching batch results for user ${session?.user?.email || 'anonymous'}`);

    // 解密批量数据
    const batchData = await decryptBatchData(token);

    return respData(batchData);

  } catch (error) {
    console.error('[Batch Results] Error fetching batch results:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to fetch batch results');
  }
} 