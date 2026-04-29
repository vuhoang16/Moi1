import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Property } from '@rentapp/shared';

export const propertyKeys = {
  all: ['properties'] as const,
  list: (params?: object) => [...propertyKeys.all, 'list', params] as const,
  detail: (id: string) => [...propertyKeys.all, 'detail', id] as const,
};

export function useProperties(params?: object) {
  return useQuery({
    queryKey: propertyKeys.list(params),
    queryFn: () => api.get('/properties', { params }).then((r) => r.data),
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => api.get(`/properties/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Property>) => api.post('/properties', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}

export function useUpdateProperty(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Property>) => api.patch(`/properties/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/properties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: propertyKeys.all }),
  });
}
