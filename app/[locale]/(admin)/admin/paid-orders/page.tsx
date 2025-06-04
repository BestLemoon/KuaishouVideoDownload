import { TableColumn } from "@/types/blocks/table";
import TableSlot from "@/components/dashboard/slots/table";
import { Table as TableSlotType } from "@/types/slots/table";
import { getPaiedOrders } from "@/models/order";
import moment from "moment";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: promiseParams }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await promiseParams;
  // const t = await getTranslations({ locale, namespace: "AdminPaidOrders" });

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/admin/paid-orders`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/admin/paid-orders`;
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
  const orders = await getPaiedOrders(1, 50);

  const columns: TableColumn[] = [
    { name: "order_no", title: "Order No" },
    { name: "paid_email", title: "Paid Email" },
    { name: "product_name", title: "Product Name" },
    { name: "amount", title: "Amount" },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: "Paid Orders",
    columns,
    data: orders,
  };

  return <TableSlot {...table} />;
}
