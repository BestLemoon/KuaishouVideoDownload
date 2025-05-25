

import Empty from "@/components/blocks/empty";
import TableSlot from "@/components/console/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getUserCreditHistory } from "@/models/credit";
import { getTranslations } from "next-intl/server";
import { getUserCreditBalance } from "@/models/credit";
import { getUserUuid } from "@/services/user";
import moment from "moment";
import { redirect } from "next/navigation";

export default async function () {
  const t = await getTranslations();

  const user_uuid = await getUserUuid();

  const callbackUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/my-credits`;
  if (!user_uuid) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const data = await getUserCreditHistory(user_uuid, 100, 0);

  const userCredits = await getUserCreditBalance(user_uuid);

  const table: TableSlotType = {
    title: t("my_credits.title"),
    tip: {
      title: t("my_credits.left_tip", {
        left_credits: userCredits?.available_credits || 0,
      }),
    },
    toolbar: {
      items: [
        {
          title: t("my_credits.recharge"),
          url: "/#pricing",
          target: "_blank",
        },
      ],
    },
    columns: [
      {
        title: t("my_credits.table.trans_no"),
        name: "trans_no",
      },
      {
        title: t("my_credits.table.trans_type"),
        name: "trans_type",
      },
      {
        title: t("my_credits.table.credits"),
        name: "credits",
      },
      {
        title: t("my_credits.table.updated_at"),
        name: "created_at",
        callback: (v: any) => {
          return moment(v.created_at).format("YYYY-MM-DD HH:mm:ss");
        },
      },
    ],
    data,
    empty_message: t("my_credits.no_credits"),
  };

  return <TableSlot {...table} />;
}
