import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
};

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: () => api.get('/invoices').then((r) => r.data),
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => api.get(`/invoices/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      contractId: string;
      billingMonth: string;
      dueDate: string;
      electricityCurrentReading: number;
      waterCurrentReading: number;
      otherFees?: { name: string; amount: number }[];
      notes?: string;
    }) => api.post('/invoices', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}

export function useInvoicesByContract(contractId: string) {
  return useQuery({
    queryKey: [...invoiceKeys.all, 'by-contract', contractId] as const,
    queryFn: () => api.get('/invoices', { params: { contractId } }).then((r) => r.data),
    enabled: !!contractId,
  });
}

export function useLastInvoice(contractId: string | null) {
  return useQuery({
    queryKey: [...invoiceKeys.all, 'last', contractId] as const,
    queryFn: () =>
      api
        .get('/invoices', { params: { contractId, limit: 1 } })
        .then((r) => (Array.isArray(r.data) ? r.data[0] ?? null : null)),
    enabled: !!contractId,
  });
}

export function useInitiatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceId: string; method: string }) =>
      api.post('/payments', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: invoiceKeys.all }),
  });
}
