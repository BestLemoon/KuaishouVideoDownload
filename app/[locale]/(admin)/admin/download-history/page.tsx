import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getAllDownloadHistory } from "@/models/credit";
import { findUserByUuid } from "@/models/user";
import moment from "moment";

export default async function () {
  // 获取所有用户下载历史
  const downloadHistory = await getAllDownloadHistory(100, 0);

  const columns: TableColumn[] = [
    {
      name: "user_uuid",
      title: "User UUID",
      callback: (item: any) => {
        return item.user_uuid ? item.user_uuid.substring(0, 8) + "..." : "-";
      },
    },
    { 
      name: "original_tweet_url", 
      title: "Original Tweet",
      allowHtml: true,
      callback: (item: any) => {
        if (item.original_tweet_url && item.username) {
          return `<a href="${item.original_tweet_url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">@${item.username}</a>`;
        } else if (item.username) {
          return `@${item.username}`;
        }
        return "-";
      }
    },
    {
      name: "video_resolution",
      title: "Resolution",
      callback: (item: any) => item.video_resolution || "-"
    },
    {
      name: "video_quality",
      title: "Quality",
      callback: (item: any) => item.video_quality || "-"
    },
    {
      name: "credits_consumed",
      title: "Credits Used",
      callback: (item: any) => `${item.credits_consumed || 0}`
    },
    {
      name: "download_status",
      title: "Status",
      allowHtml: true,
      callback: (item: any) => {
        const status = item.download_status || "unknown";
        if (status === "completed") {
          return `<span class="text-green-600 font-medium">Completed</span>`;
        } else if (status === "failed") {
          return `<span class="text-red-600 font-medium">Failed</span>`;
        }
        return `<span class="text-gray-600">${status}</span>`;
      }
    },
    {
      name: "created_at",
      title: "Download Time",
      callback: (item: any) =>
        moment(item.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: "All Download History",
    description: "View all users' video download records",
    columns: columns,
    data: downloadHistory,
    empty_message: "No download history found",
  };

  return <TableSlot {...table} />;
} 