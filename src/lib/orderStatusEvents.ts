export const ORDER_STATUS_CHANGE_EVENT = "ghopyeong:order-status-change";

export type OrderStatusChangeDetail = {
  status: string;
  code: string | null;
};
