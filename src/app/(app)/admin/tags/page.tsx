'use client';

import { SimpleTaxonomyManager } from '@/components/admin/simple-taxonomy-manager';
import {
  useAdminContentTags,
  useCreateContentTag,
  useUpdateContentTag,
  useDeleteContentTag,
} from '@/lib/api/admin-taxonomies';

export default function AdminContentTagsPage() {
  const list = useAdminContentTags();
  const create = useCreateContentTag();
  const update = useUpdateContentTag();
  const remove = useDeleteContentTag();

  return (
    <SimpleTaxonomyManager
      title="Content Tags"
      description="Manage Content Tags. Deleting a tag removes it from any posts that used it."
      queryKeyForInvalidation={['admin', 'taxonomies', 'tags']}
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
