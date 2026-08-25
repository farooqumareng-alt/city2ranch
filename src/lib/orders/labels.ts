import type { OrderStatus } from "@/lib/orders/status";

/** Customer/staff-facing copy for each order status — one place so the
 *  wording stays consistent across /orders, /internal/dispatch, and
 *  /internal/driver. */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  priced: "Awaiting payment",
  payment_pending: "Payment processing",
  paid: "Confirmed — awaiting driver",
  driver_assigned: "Driver assigned",
  picked_up: "Picked up",
  in_transit: "On the way",
  completed: "Delivered",
  cancelled: "Cancelled",
  failed: "Needs attention",
};
