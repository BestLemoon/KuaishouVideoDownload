import {
  CreditsTransType,
  increaseCredits,
  updateCreditForOrder,
} from "./credit";
import { findOrderByOrderNo, updateOrderStatus } from "@/models/order";
import { getIsoTimestr, getOneYearLaterTimestr } from "@/lib/time";
import { chargeCredits } from '@/models/credit';

import Stripe from "stripe";
import { updateAffiliateForOrder } from "./affiliate";

export async function handleOrderSession(session: Stripe.Checkout.Session) {
  try {
    if (
      !session ||
      !session.metadata ||
      !session.metadata.order_no ||
      session.payment_status !== "paid"
    ) {
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    const order = await findOrderByOrderNo(order_no);
    if (!order || order.status !== "created") {
      throw new Error("invalid order");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(order_no, "paid", paid_at, paid_email, paid_detail);

    if (order.user_uuid) {
      if (order.credits > 0) {
        // 使用新积分系统充值
        await chargeCredits(
          order.user_uuid,
          order.credits,
          order_no,
          `购买积分包: ${order.product_name}`,
          order.valid_months || undefined
        );

        // 保持兼容旧系统
        await updateCreditForOrder(order);
        
        console.log(`[Credits] User ${order.user_uuid} charged ${order.credits} credits from order ${order_no}`);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order);
    }

    console.log(
      "handle order session successed: ",
      order_no,
      paid_at,
      paid_email,
      paid_detail
    );
  } catch (e) {
    console.log("handle order session failed: ", e);
    throw e;
  }
}
