import { fetchApi } from '../api-client';
import { useMutation, useQuery, UseQueryResult } from '@tanstack/react-query';
import { TaxonomyOption } from './taxonomies';

export interface CreateBackgroundStyleInput {
  label: string;
  colorValue: string;
  textColor: string;
  sortOrder?: number;
}

export interface UpdateBackgroundStyleInput {
  label?: string;
  colorValue?: string;
  textColor?: string;
  sortOrder?: number;
  isActive?: boolean;
}

const adminTaxonomyKeys = {
  all: ['admin', 'taxonomies'] as const,
  backgroundStyles: () => [...adminTaxonomyKeys.all, 'background-styles'] as const,
};

export const adminTaxonomyApi = {
  listBackgroundStyles: async () => {
    return fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/background-styles');
  },

  createBackgroundStyle: async (input: CreateBackgroundStyleInput) => {
    return fetchApi<{ data: TaxonomyOption }>(
      '/admin/taxonomies/background-styles',
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );
  },

  updateBackgroundStyle: async (id: number, input: UpdateBackgroundStyleInput) => {
    return fetchApi<{ data: TaxonomyOption }>(
      `/admin/taxonomies/background-styles/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      }
    );
  },

  deleteBackgroundStyle: async (id: number) => {
    return fetchApi<{ success: boolean }>(
      `/admin/taxonomies/background-styles/${id}`,
      {
        method: 'DELETE',
      }
    );
  },
};

export function useAdminBackgroundStyles(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: adminTaxonomyKeys.backgroundStyles(),
    queryFn: () => adminTaxonomyApi.listBackgroundStyles(),
  });
}

export function useCreateBackgroundStyle() {
  return useMutation({
    mutationFn: (input: CreateBackgroundStyleInput) =>
      adminTaxonomyApi.createBackgroundStyle(input),
  });
}

export function useUpdateBackgroundStyle() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBackgroundStyleInput }) =>
      adminTaxonomyApi.updateBackgroundStyle(id, input),
  });
}

export function useDeleteBackgroundStyle() {
  return useMutation({
    mutationFn: (id: number) => adminTaxonomyApi.deleteBackgroundStyle(id),
  });
}
