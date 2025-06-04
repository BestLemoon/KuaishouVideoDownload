import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { decryptBatchData } from '@/lib/encryption';
import BatchDownloadResultClient from '@/components/downloads/BatchDownloadResultClient';
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

interface BatchDownloadResultPageProps {
  searchParams: Promise<{ token?: string }>;
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