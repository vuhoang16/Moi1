import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export const contractKeys = {
  all: ['contracts'] as const,
  list: () => [...contractKeys.all, 'list'] as const,
  detail: (id: string) => [...contractKeys.all, 'detail', id] as const,
};

export function useContracts() {
  return useQuery({
    queryKey: contractKeys.list(),
    queryFn: () => api.get('/contracts').then((r) => r.data),
  });
}

export function useContract(id: string) {
  return useQuery({
    queryKey: contractKeys.detail(id),
    queryFn: () => api.get(`/contracts/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      role,
      signatureBase64,
    }: {
      contractId: string;
      role: 'landlord' | 'tenant';
      signatureBase64: string;
    }) =>
      api
        .post(`/contracts/${contractId}/sign-${role}`, { signatureBase64 })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: contractKeys.all }),
  });
}
