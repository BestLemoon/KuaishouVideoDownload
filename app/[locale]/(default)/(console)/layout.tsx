import ConsoleLayout from "@/components/console/layout";
import { ReactNode } from "react";
import { Sidebar } from "@/types/blocks/sidebar";
import { getTranslations } from "next-intl/server";
import { getUserInfo } from "@/services/user";
import { redirect } from "next/navigation";



export default async function ({ children }: { children: ReactNode }) {
  try {
    const userInfo = await getUserInfo();
    if (!userInfo || !userInfo.email) {
      redirect("/auth/signin");
    }
  } catch (error) {
    // 如果获取用户信息失败，重定向到登录页
    console.error('[Layout] Console layout - 获取用户信息失败:', error);
    redirect("/auth/signin");
  }

  const t = await getTranslations();

  const sidebar: Sidebar = {
    nav: {
      items: [
        {
          title: t("user.my_orders"),
          url: "/my-orders",
          icon: "RiOrderPlayLine",
          is_active: false,
        },
        {
          title: t("my_credits.title"),
          url: "/my-credits",
          icon: "RiBankCardLine",
          is_active: false,
        },
        {
          title: t("download_history.title"),
          url: "/download-history",
          icon: "RiHistoryLine",
          is_active: false,
        },
        // {
        //   title: t("my_invites.title"),
        //   url: "/my-invites",
        //   icon: "RiMoneyCnyCircleFill",
        //   is_active: false,
        // },
        {
          title: t("api_keys.title"),
          url: "/api-keys",
          icon: "RiKey2Line",
          is_active: false,
        }
      ],
    },
  };

  return <ConsoleLayout sidebar={sidebar}>{children}</ConsoleLayout>;
}
