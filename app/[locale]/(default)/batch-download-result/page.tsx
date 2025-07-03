import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decryptBatchData } from '@/lib/encryption';
import BatchDownloadResultClient from '@/components/downloads/BatchDownloadResultClient';
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { extractKuaishouInfo } from '@/lib/url-validator';

interface BatchDownloadResultPageProps {
  searchParams: Promise<{ token?: string }>;
}

interface BatchData {
  successful?: Array<{
    url: string;
    data?: {
      videoId?: string;
      thumbnail?: string;
      videos?: Array<any>;
      text?: string;
    };
  }>;
  failed?: Array<{
    url: string;
    error: string;
  }>;
  total?: number;
}

export async function generateMetadata({ params: promiseParams }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await promiseParams;
  const t = await getTranslations();

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/batch-download-result`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/batch-download-result`;
  }

  return {
    title: t("batch_download_result.title"),
    robots: { index: false, follow: false },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function BatchDownloadResult({ searchParams }: BatchDownloadResultPageProps) {
  const params = await searchParams;
  const token = params.token;
  if (!token) {
    redirect('/');
  }

  try {
    // 服务器端数据解密
    const batchData = await decryptBatchData(token) as BatchData;

    // 确保数据结构正确
    const formattedBatchData = {
      results: batchData.successful?.map((item: any) => {
        // 从URL中动态提取域名信息
        const { videoId, domain } = extractKuaishouInfo(item.url);
        
        return {
          originalUrl: item.url,
          videoId: videoId || 'unknown',
          domain: domain || 'kuaishou.com', // 如果提取失败，使用默认值
          thumbnail: item.data?.thumbnail || null,
          videos: item.data?.videos || [],
          text: item.data?.text || '',
          processedAt: new Date().toISOString()
        };
      }) || [],
      errors: batchData.failed?.map((item: any) => ({
        url: item.url,
        error: item.error
      })) || [],
      summary: {
        total: batchData.total || 0,
        successful: batchData.successful?.length || 0,
        failed: batchData.failed?.length || 0
      }
    };

    return <BatchDownloadResultClient batchData={formattedBatchData} />;
  } catch (error) {
    console.error('Failed to decrypt batch data:', error);
    redirect('/');
  }
} 