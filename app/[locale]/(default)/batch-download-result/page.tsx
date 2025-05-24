export const runtime = "edge";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decryptBatchData } from '@/lib/encryption';
import BatchDownloadResultClient from '@/components/downloads/BatchDownloadResultClient';

interface BatchDownloadResultPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function BatchDownloadResult({ searchParams }: BatchDownloadResultPageProps) {
  // 服务器端认证检查
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/signin');
  }

  const params = await searchParams;
  const token = params.token;
  if (!token) {
    redirect('/');
  }

  try {
    // 服务器端数据解密
    const batchData = await decryptBatchData(token);
    
    return <BatchDownloadResultClient batchData={batchData as any} />;
  } catch (error) {
    console.error('Failed to decrypt batch data:', error);
    redirect('/');
  }
} 