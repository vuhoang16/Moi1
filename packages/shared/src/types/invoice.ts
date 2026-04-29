export type InvoiceStatus = 'chua_thanh_toan' | 'da_thanh_toan' | 'qua_han';

export interface OtherFee {
  name: string;
  amount: number;
}

export interface Invoice {
  id: string;
  contractId: string;
  roomId: string;
  tenantId: string;
  landlordId: string;
  billingMonth: string;
  dueDate: string;
  baseRent: number;
  electricityPrevReading: number;
  electricityCurrentReading: number;
  electricityUsage: number;
  electricityAmount: number;
  waterPrevReading: number;
  waterCurrentReading: number;
  waterUsage: number;
  waterAmount: number;
  otherFees: OtherFee[];
  totalAmount: number;
  status: InvoiceStatus;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
