import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getTranslations } from "next-intl/server";
import { getUserApikeys } from "@/models/apikey";
import { getUserUuid, checkUserIsPremium } from "@/services/user";
import moment from "moment";
import DeleteButton from "./delete-button";
import { Metadata } from "next";

// 强制动态渲染，避免静态生成时的错误
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params: promiseParams }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await promiseParams;
  const t = await getTranslations();

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/api-keys`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/api-keys`;
  }

  return {
    title: t("api_keys.title"),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();

  const user_uuid = await getUserUuid();
  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  // 检查用户是否为付费用户
  const isPremium = await checkUserIsPremium(user_uuid);
  const data = await getUserApikeys(user_uuid);

  // API文档链接
  const apiDocUrl = `/${locale}/posts/twitterdown-api-doc-${locale}`;

  const table: TableSlotType = {
    title: t("api_keys.title"),
    tip: {
      title: isPremium ? t("api_keys.tip") : t("api_keys.premium_only_tip"),
    },
    toolbar: {
      items: isPremium ? [
        {
          title: t("api_keys.view_api_docs"),
          url: apiDocUrl,
          icon: "RiFileTextLine",
          variant: "outline" as const,
          target: "_blank",
        },
        {
          title: t("api_keys.create_api_key"),
          url: "/api-keys/create",
          icon: "RiAddLine",
        }
      ] : [
        {
          title: t("api_keys.view_api_docs"),
          url: apiDocUrl,
          icon: "RiFileTextLine",
          variant: "outline" as const,
          target: "_blank",
        },
        {
          title: t("api_keys.upgrade_to_premium"),
          url: "/#pricing",
          icon: "RiVipCrown2Line",
          variant: "default" as const,
        },
      ],
    },
    columns: [
      {
        title: t("api_keys.table.name"),
        name: "title",
      },
      {
        title: t("api_keys.table.key"),
        name: "api_key",
        type: "copy",
        callback: (item: any) => {
          return item.api_key.slice(0, 4) + "..." + item.api_key.slice(-4);
        },
      },
      {
        title: t("api_keys.table.created_at"),
        name: "created_at",
        callback: (item: any) => {
          return moment(item.created_at).fromNow();
        },
      },
      ...(isPremium ? [{
        title: t("api_keys.table.actions"),
        name: "actions",
        callback: (item: any) => {
          return <DeleteButton apiKey={item.api_key} />;
        },
      }] : []),
    ],
    data,
    empty_message: t("api_keys.no_api_keys"),
  };

  return <TableSlot {...table} />;
}
