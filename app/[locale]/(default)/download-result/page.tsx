

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decryptBatchData } from '@/lib/encryption';
import DownloadResultClient from '@/components/downloads/DownloadResultClient';

interface DownloadResultPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function DownloadResultPage({ searchParams }: DownloadResultPageProps) {
  // 服务器端认证检查（可选，单个下载可能允许匿名）
  const session = await auth();

  const params = await searchParams;
  const token = params.token;
  if (!token) {
    redirect('/');
  }

  try {
    // 服务器端数据解密
    const downloadData = await decryptBatchData(token);
    
    return <DownloadResultClient downloadData={downloadData as any} />;
  } catch (error) {
    console.error('Failed to decrypt download data:', error);
    redirect('/');
  }
} 