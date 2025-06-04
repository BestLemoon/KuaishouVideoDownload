import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getUsers } from "@/models/user";
import moment from "moment";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: promiseParams }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await promiseParams;
  // const t = await getTranslations({ locale, namespace: "AdminUsers" });

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/admin/users`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/admin/users`;
  }

  return {
    // title: t("title"),
    // description: t("description"),
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function () {
  const users = await getUsers(1, 50);

  const columns: TableColumn[] = [
    { name: "uuid", title: "UUID" },
    { name: "email", title: "Email" },
    { name: "nickname", title: "Name" },
    {
      name: "avatar_url",
      title: "Avatar",
      callback: (row) => (
        <img src={row.avatar_url} className="w-10 h-10 rounded-full" />
      ),
    },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: "All Users",
    columns,
    data: users,
  };

  return <TableSlot {...table} />;
}
