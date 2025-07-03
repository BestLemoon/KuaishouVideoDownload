export const runtime = 'edge'

import { respData, respErr } from "@/lib/resp";
import { decryptBatchData } from '@/lib/encryption';

/**
 * POST /api/kuaishou/results - 解密快手视频解析结果
 */
export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return respErr('Token is required');
    }

    // 解密数据
    const decryptedData = await decryptBatchData(token);
    if (!decryptedData) {
      return respErr('Invalid or expired token');
    }

    console.log('[Results] Returning decrypted data');

    return respData(decryptedData);

  } catch (error) {
    console.error('[Results] Error decrypting results:', error);
    return respErr(error instanceof Error ? error.message : 'Failed to decrypt results');
  }
}
