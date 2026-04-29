import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const checklistKeys = {
  all: ['checklists'] as const,
  byContract: (contractId: string) => [...checklistKeys.all, 'contract', contractId] as const,
};

export function useChecklistsByContract(contractId: string) {
  return useQuery({
    queryKey: checklistKeys.byContract(contractId),
    queryFn: () => api.get(`/checklists/by-contract/${contractId}`).then((r) => r.data),
    enabled: !!contractId,
  });
}
