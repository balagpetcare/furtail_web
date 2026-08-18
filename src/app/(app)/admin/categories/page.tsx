'use client';

import { SimpleTaxonomyManager } from '@/components/admin/simple-taxonomy-manager';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '@/lib/api/admin-taxonomies';

export default function AdminCategoriesPage() {
  const list = useAdminCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();

  return (
    <SimpleTaxonomyManager
      title="Categories"
      description="Manage the Post Category taxonomy (distinct from Post.type and Post.category)"
      queryKeyForInvalidation={['admin', 'taxonomies', 'categories']}
      list={list}
      create={{
        mutateAsync: (input) => create.mutateAsync({ key: input.key, label: input.label, sortOrder: input.sortOrder }),
        isPending: create.isPending,
      }}
      update={{ mutateAsync: update.mutateAsync, isPending: update.isPending }}
      remove={{ mutateAsync: remove.mutateAsync, isPending: remove.isPending }}
    />
  );
}
