export type ContractStatus = 'nhap' | 'cho_ky' | 'hieu_luc' | 'het_han' | 'da_huy';

export interface Contract {
  id: string;
  roomId: string;
  landlordId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  electricityStartReading: number;
  waterStartReading: number;
  terms: string;
  status: ContractStatus;
  pdfUrl?: string;
  landlordSignatureUrl?: string;
  tenantSignatureUrl?: string;
  landlordSignedAt?: string;
  tenantSignedAt?: string;
  createdAt: string;
  updatedAt: string;
}
