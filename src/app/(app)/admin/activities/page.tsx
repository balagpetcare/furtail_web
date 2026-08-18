'use client';

import { SimpleTaxonomyManager } from '@/components/admin/simple-taxonomy-manager';
import {
  useAdminActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
} from '@/lib/api/admin-taxonomies';

export default function AdminActivitiesPage() {
  const list = useAdminActivities();
  const create = useCreateActivity();
  const update = useUpdateActivity();
  const remove = useDeleteActivity();

  return (
    <SimpleTaxonomyManager
      title="Activities"
      description="Manage the Activity options available in Create Post"
      queryKeyForInvalidation={['admin', 'taxonomies', 'activities']}
      hasEmoji
      hasCategory
      list={list}
      create={{
        mutateAsync: (input) =>
          create.mutateAsync({
            key: input.key,
            label: input.label,
            emoji: input.emoji || '',
            category: input.category || 'General',
            sortOrder: input.sortOrder,
          }),
        isPending: create.isPending,
      }}
      update={{ mutateAsync: update.mutateAsync, isPending: update.isPending }}
      remove={{ mutateAsync: remove.mutateAsync, isPending: remove.isPending }}
    />
  );
}
