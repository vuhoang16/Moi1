import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const depositKeys = {
  all: ['deposits'] as const,
  byContract: (contractId: string) => [...depositKeys.all, 'contract', contractId] as const,
};

export function useDepositByContract(contractId: string) {
  return useQuery({
    queryKey: depositKeys.byContract(contractId),
    queryFn: () => api.get(`/deposits/by-contract/${contractId}`).then((r) => r.data),
    enabled: !!contractId,
  });
}

export function useUpdateDeposit(contractId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      action: 'collect' | 'refund' | 'partial-deduct';
      method?: string;
      transactionId?: string;
      deductedAmount?: number;
      deductionReason?: string;
      notes?: string;
    }) => api.patch(`/deposits/by-contract/${contractId}`, data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: depositKeys.byContract(contractId) }),
  });
}
