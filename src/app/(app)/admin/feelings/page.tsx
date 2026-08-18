'use client';

import { SimpleTaxonomyManager } from '@/components/admin/simple-taxonomy-manager';
import {
  useAdminFeelings,
  useCreateFeeling,
  useUpdateFeeling,
  useDeleteFeeling,
} from '@/lib/api/admin-taxonomies';

export default function AdminFeelingsPage() {
  const list = useAdminFeelings();
  const create = useCreateFeeling();
  const update = useUpdateFeeling();
  const remove = useDeleteFeeling();

  return (
    <SimpleTaxonomyManager
      title="Feelings"
      description="Manage the Feeling options available in Create Post"
      queryKeyForInvalidation={['admin', 'taxonomies', 'feelings']}
      hasEmoji
      list={list}
      create={{
        mutateAsync: (input) => create.mutateAsync({ key: input.key, label: input.label, emoji: input.emoji || '', sortOrder: input.sortOrder }),
        isPending: create.isPending,
      }}
      update={{ mutateAsync: update.mutateAsync, isPending: update.isPending }}
      remove={{ mutateAsync: remove.mutateAsync, isPending: remove.isPending }}
    />
  );
}
