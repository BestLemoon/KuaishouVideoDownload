export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { decryptBatchData } from '@/lib/encryption';

/**
 * POST /api/kuaishou/batch/results - 获取批量处理结果
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return respErr('Token is required');
    }

    // 解密批量数据
    const batchData = await decryptBatchData(token);
    if (!batchData) {
      return respErr('Invalid or expired token');
    }

    console.log(`[Batch Results] Returning results for ${batchData.total} URLs`);

    return respData(batchData);

  } catch (error) {
    console.error('[Batch Results] Error getting batch results:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to get batch results');
  }
}
