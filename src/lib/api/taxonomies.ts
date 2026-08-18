import { fetchApi } from '../api-client';
import { useQuery, UseQueryResult } from '@tanstack/react-query';

export interface TaxonomyOption {
  id: number;
  key: string;
  label: string;
  emoji?: string;
  category?: string;
  colorValue?: string | null;
  textColor?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export const taxonomyKeys = {
  all: ['taxonomies'] as const,
  feelings: () => [...taxonomyKeys.all, 'feelings'] as const,
  activities: (category?: string) => [...taxonomyKeys.all, 'activities', category] as const,
  categories: () => [...taxonomyKeys.all, 'categories'] as const,
  tags: () => [...taxonomyKeys.all, 'tags'] as const,
  backgroundStyles: () => [...taxonomyKeys.all, 'background-styles'] as const,
};

export const taxonomyApi = {
  getFeelings: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    return fetchApi<{ data: TaxonomyOption[] }>(
      `/taxonomies/feelings${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  getActivities: async (search?: string, category?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (category) params.set('category', category);
    return fetchApi<{ data: TaxonomyOption[] }>(
      `/taxonomies/activities${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  getCategories: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    return fetchApi<{ data: TaxonomyOption[] }>(
      `/taxonomies/categories${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  getTags: async (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    return fetchApi<{ data: TaxonomyOption[] }>(
      `/taxonomies/tags${params.toString() ? `?${params.toString()}` : ''}`,
    );
  },

  getBackgroundStyles: async () => {
    return fetchApi<{ data: TaxonomyOption[] }>('/taxonomies/background-styles');
  },
};

export function useFeelings(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: taxonomyKeys.feelings(),
    queryFn: () => taxonomyApi.getFeelings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

export function useActivities(
  category?: string
): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: taxonomyKeys.activities(category),
    queryFn: () => taxonomyApi.getActivities(undefined, category),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function usePostCategories(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: taxonomyKeys.categories(),
    queryFn: () => taxonomyApi.getCategories(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useContentTags(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: taxonomyKeys.tags(),
    queryFn: () => taxonomyApi.getTags(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useBackgroundStyles(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: taxonomyKeys.backgroundStyles(),
    queryFn: () => taxonomyApi.getBackgroundStyles(),
    staleTime: 60 * 60 * 1000, // 1 hour - less frequently changing
    retry: 1,
  });
}
