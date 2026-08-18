import { fetchApi } from '../api-client';
import { useMutation, useQuery, UseQueryResult } from '@tanstack/react-query';
import { TaxonomyOption } from './taxonomies';

export interface CreateFeelingInput {
  key: string;
  label: string;
  emoji: string;
  sortOrder?: number;
}

export interface UpdateFeelingInput {
  label?: string;
  emoji?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateActivityInput {
  key: string;
  label: string;
  emoji: string;
  category: string;
  sortOrder?: number;
}

export interface UpdateActivityInput {
  label?: string;
  emoji?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateCategoryInput {
  key: string;
  label: string;
  sortOrder?: number;
}

export interface UpdateCategoryInput {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateContentTagInput {
  key: string;
  label: string;
  sortOrder?: number;
}

export interface UpdateContentTagInput {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateBackgroundStyleInput {
  key: string;
  label: string;
  styleType?: 'solid' | 'gradient' | 'pattern';
  colorValue?: string | null;
  colorValueEnd?: string | null;
  textColor?: string;
  sortOrder?: number;
}

export interface UpdateBackgroundStyleInput {
  label?: string;
  styleType?: 'solid' | 'gradient' | 'pattern';
  colorValue?: string | null;
  colorValueEnd?: string | null;
  textColor?: string;
  sortOrder?: number;
  isActive?: boolean;
}

const adminTaxonomyKeys = {
  all: ['admin', 'taxonomies'] as const,
  feelings: () => [...adminTaxonomyKeys.all, 'feelings'] as const,
  activities: () => [...adminTaxonomyKeys.all, 'activities'] as const,
  categories: () => [...adminTaxonomyKeys.all, 'categories'] as const,
  tags: () => [...adminTaxonomyKeys.all, 'tags'] as const,
  backgroundStyles: () => [...adminTaxonomyKeys.all, 'background-styles'] as const,
};

// NOTE: fetchApi (see lib/api-client.ts) already JSON.stringifies a raw
// object `body` itself — passing a pre-stringified string here would be
// double-encoded and rejected by the backend's express.json() parser. Every
// mutation below passes the raw input object, matching postsApi.createPost's
// convention.
export const adminTaxonomyApi = {
  // ── Feelings ────────────────────────────────────────────────────────
  listFeelings: async () => fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/feelings'),
  createFeeling: async (input: CreateFeelingInput) =>
    fetchApi<{ data: TaxonomyOption }>('/admin/taxonomies/feelings', { method: 'POST', body: input }),
  updateFeeling: async (id: number, input: UpdateFeelingInput) =>
    fetchApi<{ data: TaxonomyOption }>(`/admin/taxonomies/feelings/${id}`, { method: 'PATCH', body: input }),
  deleteFeeling: async (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/taxonomies/feelings/${id}`, { method: 'DELETE' }),

  // ── Activities ──────────────────────────────────────────────────────
  listActivities: async () => fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/activities'),
  createActivity: async (input: CreateActivityInput) =>
    fetchApi<{ data: TaxonomyOption }>('/admin/taxonomies/activities', { method: 'POST', body: input }),
  updateActivity: async (id: number, input: UpdateActivityInput) =>
    fetchApi<{ data: TaxonomyOption }>(`/admin/taxonomies/activities/${id}`, { method: 'PATCH', body: input }),
  deleteActivity: async (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/taxonomies/activities/${id}`, { method: 'DELETE' }),

  // ── Categories ──────────────────────────────────────────────────────
  listCategories: async () => fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/categories'),
  createCategory: async (input: CreateCategoryInput) =>
    fetchApi<{ data: TaxonomyOption }>('/admin/taxonomies/categories', { method: 'POST', body: input }),
  updateCategory: async (id: number, input: UpdateCategoryInput) =>
    fetchApi<{ data: TaxonomyOption }>(`/admin/taxonomies/categories/${id}`, { method: 'PATCH', body: input }),
  deleteCategory: async (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/taxonomies/categories/${id}`, { method: 'DELETE' }),

  // ── Content Tags ────────────────────────────────────────────────────
  listContentTags: async () => fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/tags'),
  createContentTag: async (input: CreateContentTagInput) =>
    fetchApi<{ data: TaxonomyOption }>('/admin/taxonomies/tags', { method: 'POST', body: input }),
  updateContentTag: async (id: number, input: UpdateContentTagInput) =>
    fetchApi<{ data: TaxonomyOption }>(`/admin/taxonomies/tags/${id}`, { method: 'PATCH', body: input }),
  deleteContentTag: async (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/taxonomies/tags/${id}`, { method: 'DELETE' }),

  // ── Background Styles ───────────────────────────────────────────────
  listBackgroundStyles: async () =>
    fetchApi<{ data: TaxonomyOption[] }>('/admin/taxonomies/background-styles'),
  createBackgroundStyle: async (input: CreateBackgroundStyleInput) =>
    fetchApi<{ data: TaxonomyOption }>('/admin/taxonomies/background-styles', { method: 'POST', body: input }),
  updateBackgroundStyle: async (id: number, input: UpdateBackgroundStyleInput) =>
    fetchApi<{ data: TaxonomyOption }>(`/admin/taxonomies/background-styles/${id}`, {
      method: 'PATCH',
      body: input,
    }),
  deleteBackgroundStyle: async (id: number) =>
    fetchApi<{ success: boolean }>(`/admin/taxonomies/background-styles/${id}`, { method: 'DELETE' }),
};

// ── Feelings hooks ──────────────────────────────────────────────────────

export function useAdminFeelings(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({ queryKey: adminTaxonomyKeys.feelings(), queryFn: adminTaxonomyApi.listFeelings });
}
export function useCreateFeeling() {
  return useMutation({ mutationFn: (input: CreateFeelingInput) => adminTaxonomyApi.createFeeling(input) });
}
export function useUpdateFeeling() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFeelingInput }) =>
      adminTaxonomyApi.updateFeeling(id, input),
  });
}
export function useDeleteFeeling() {
  return useMutation({ mutationFn: (id: number) => adminTaxonomyApi.deleteFeeling(id) });
}

// ── Activities hooks ─────────────────────────────────────────────────────

export function useAdminActivities(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({ queryKey: adminTaxonomyKeys.activities(), queryFn: adminTaxonomyApi.listActivities });
}
export function useCreateActivity() {
  return useMutation({ mutationFn: (input: CreateActivityInput) => adminTaxonomyApi.createActivity(input) });
}
export function useUpdateActivity() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateActivityInput }) =>
      adminTaxonomyApi.updateActivity(id, input),
  });
}
export function useDeleteActivity() {
  return useMutation({ mutationFn: (id: number) => adminTaxonomyApi.deleteActivity(id) });
}

// ── Categories hooks ─────────────────────────────────────────────────────

export function useAdminCategories(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({ queryKey: adminTaxonomyKeys.categories(), queryFn: adminTaxonomyApi.listCategories });
}
export function useCreateCategory() {
  return useMutation({ mutationFn: (input: CreateCategoryInput) => adminTaxonomyApi.createCategory(input) });
}
export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCategoryInput }) =>
      adminTaxonomyApi.updateCategory(id, input),
  });
}
export function useDeleteCategory() {
  return useMutation({ mutationFn: (id: number) => adminTaxonomyApi.deleteCategory(id) });
}

// ── Content Tags hooks ───────────────────────────────────────────────────

export function useAdminContentTags(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({ queryKey: adminTaxonomyKeys.tags(), queryFn: adminTaxonomyApi.listContentTags });
}
export function useCreateContentTag() {
  return useMutation({
    mutationFn: (input: CreateContentTagInput) => adminTaxonomyApi.createContentTag(input),
  });
}
export function useUpdateContentTag() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateContentTagInput }) =>
      adminTaxonomyApi.updateContentTag(id, input),
  });
}
export function useDeleteContentTag() {
  return useMutation({ mutationFn: (id: number) => adminTaxonomyApi.deleteContentTag(id) });
}

// ── Background Styles hooks ──────────────────────────────────────────────

export function useAdminBackgroundStyles(): UseQueryResult<{ data: TaxonomyOption[] }, Error> {
  return useQuery({
    queryKey: adminTaxonomyKeys.backgroundStyles(),
    queryFn: adminTaxonomyApi.listBackgroundStyles,
  });
}
export function useCreateBackgroundStyle() {
  return useMutation({
    mutationFn: (input: CreateBackgroundStyleInput) => adminTaxonomyApi.createBackgroundStyle(input),
  });
}
export function useUpdateBackgroundStyle() {
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateBackgroundStyleInput }) =>
      adminTaxonomyApi.updateBackgroundStyle(id, input),
  });
}
export function useDeleteBackgroundStyle() {
  return useMutation({ mutationFn: (id: number) => adminTaxonomyApi.deleteBackgroundStyle(id) });
}
