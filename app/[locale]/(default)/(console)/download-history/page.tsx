
import { getUserDownloadHistory } from "@/models/credit";
import { getUserUuid, checkUserIsPremium } from "@/services/user";

import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getTranslations } from "next-intl/server";
import moment from "moment";
import { redirect } from "next/navigation";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();
 
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/download-history`;
 
  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/download-history`;
  }
 
  return {
    title: t("download_history.title"),
    description: t("download_history.description"),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function () {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  const callbackUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/download-history`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // 检查用户是否为付费用户
  const isPremium = await checkUserIsPremium(user_uuid);
  
  // 获取用户下载历史
  const downloadHistory = await getUserDownloadHistory(user_uuid, 50, 0);
  
  // 免费版只显示最近3条记录
  const displayHistory = isPremium ? downloadHistory : downloadHistory.slice(0, 3);

  // 格式化文件大小
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return "-";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const columns: TableColumn[] = [
    {
      name: "original_video_url",
      title: t("download_history.table.original_video"),
      allowHtml: true,
      callback: (item: any) => {
        // 优先使用 url 字段，如果没有则使用 original_tweet_url
        const originalUrl = item.url || item.original_tweet_url;

        if (originalUrl) {
          return `<a href="${originalUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${originalUrl}</a>`;
        }
        return "-";
      }
    },
    {
      name: "video_resolution",
      title: t("download_history.table.video_resolution"),
      callback: (item: any) => item.video_resolution || "-"
    },
    {
      name: "video_quality",
      title: t("download_history.table.video_quality"),
      callback: (item: any) => item.video_quality || "-"
    },
    {
      name: "credits_consumed",
      title: t("download_history.table.credits_consumed"),
      callback: (item: any) => `${item.credits_consumed || 0}`
    },
    {
      name: "download_status",
      title: t("download_history.table.download_status"),
      allowHtml: true,
      callback: (item: any) => {
        const status = item.download_status || "unknown";
        if (status === "completed") {
          return `<span class="text-green-600 font-medium">${t("download_history.status.completed")}</span>`;
        } else if (status === "failed") {
          return `<span class="text-red-600 font-medium">${t("download_history.status.failed")}</span>`;
        }
        return `<span class="text-gray-600">${status}</span>`;
      }
    },
    {
      name: "created_at",
      title: t("download_history.table.created_at"),
      callback: (item: any) =>
        moment(item.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: t("download_history.title"),
    description: isPremium 
      ? t("download_history.description")
      : t("download_history.description_free", { count: 3 }),
    columns: columns,
    data: displayHistory,
    empty_message: t("download_history.no_history"),
  };

  return (
    <div>
      <TableSlot {...table} />
      {!isPremium && downloadHistory.length > 3 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                {t("download_history.upgrade_prompt.title")}
              </h3>
              <p className="text-blue-700">
                {t("download_history.upgrade_prompt.message", { 
                  total: downloadHistory.length,
                  visible: 3 
                })}
              </p>
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              {t("download_history.upgrade_prompt.button")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
} 