import { ApikeyStatus, insertApikey } from "@/models/apikey";

import { Apikey } from "@/types/apikey";
import Empty from "@/components/blocks/empty";
import FormSlot from "@/components/console/slots/form";
import { Form as FormSlotType } from "@/types/slots/form";
import { getIsoTimestr } from "@/lib/time";
import { getNonceStr } from "@/lib/hash";
import { getTranslations } from "next-intl/server";
import { getUserUuid, checkUserIsPremium } from "@/services/user";
import { redirect } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({ params: promiseParams }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await promiseParams;
  const t = await getTranslations();

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/api-keys/create`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/api-keys/create`;
  }

  return {
    title: t("api_keys.create_api_key_meta_title") || t("api_keys.create_api_key"),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function () {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();
  if (!user_uuid) {
    return <Empty message="no auth" />;
  }

  // 检查用户是否为付费用户
  const isPremium = await checkUserIsPremium(user_uuid);
  if (!isPremium) {
    // 重定向到付费页面
    redirect("/#pricing");
  }

  const form: FormSlotType = {
    title: t("api_keys.create_api_key"),
    crumb: {
      items: [
        {
          title: t("api_keys.title"),
          url: "/api-keys",
        },
        {
          title: t("api_keys.create_api_key"),
          is_active: true,
        },
      ],
    },
    fields: [
      {
        title: t("api_keys.form.name"),
        name: "title",
        type: "text",
        placeholder: t("api_keys.form.name_placeholder"),
        validation: {
          required: true,
        },
      },
    ],
    passby: {
      user_uuid,
    },
    submit: {
      button: {
        title: t("api_keys.form.submit"),
      },
      handler: async (data: FormData, passby: any) => {
        "use server";

        const { user_uuid } = passby;
        if (!user_uuid) {
          const t = await getTranslations();
          throw new Error(t("api_keys.errors.no_auth"));
        }

        // 再次检查用户是否为付费用户
        const isPremium = await checkUserIsPremium(user_uuid);
        if (!isPremium) {
          const t = await getTranslations();
          throw new Error(t("api_keys.errors.premium_required"));
        }

        const title = data.get("title") as string;
        if (!title || !title.trim()) {
          const t = await getTranslations();
          throw new Error(t("api_keys.errors.invalid_params"));
        }

        const key = `sk-${getNonceStr(32)}`;

        const apikey: Apikey = {
          user_uuid,
          api_key: key,
          title,
          created_at: getIsoTimestr(),
          status: ApikeyStatus.Created,
        };

        try {
          await insertApikey(apikey);

          const t = await getTranslations();
          return {
            status: "success",
            message: t("api_keys.messages.created_success"),
            redirect_url: "/api-keys",
          };
        } catch (e: any) {
          console.error(e);
          const t = await getTranslations();
          throw new Error(t("api_keys.errors.create_failed", { error: e.message }));
        }
      },
    },
  };

  return <FormSlot {...form} />;
}
