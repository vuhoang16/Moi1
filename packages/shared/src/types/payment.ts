export type PaymentMethod = 'momo' | 'zalopay' | 'vietqr' | 'tien_mat';
export type PaymentStatus = 'cho_xu_ly' | 'thanh_cong' | 'that_bai' | 'hoan_tien';

export interface Payment {
  id: string;
  invoiceId: string;
  contractId: string;
  tenantId: string;
  landlordId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayTransactionId?: string;
  gatewayOrderId: string;
  paidAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}
