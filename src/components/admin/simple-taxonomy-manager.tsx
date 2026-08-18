'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TaxonomyOption } from '@/lib/api/taxonomies';

interface FormState {
  key: string;
  label: string;
  emoji: string;
  category: string;
  sortOrder?: number;
}

const EMPTY_FORM: FormState = { key: '', label: '', emoji: '', category: '' };

export interface SimpleTaxonomyManagerProps {
  title: string;
  description: string;
  queryKeyForInvalidation: readonly unknown[];
  hasEmoji?: boolean;
  hasCategory?: boolean;
  list: { data?: { data: TaxonomyOption[] }; isLoading: boolean };
  create: {
    mutateAsync: (input: { key: string; label: string; emoji?: string; category?: string; sortOrder?: number }) => Promise<unknown>;
    isPending: boolean;
  };
  update: {
    mutateAsync: (args: {
      id: number;
      input: { label?: string; emoji?: string; category?: string; sortOrder?: number; isActive?: boolean };
    }) => Promise<unknown>;
    isPending: boolean;
  };
  remove: { mutateAsync: (id: number) => Promise<unknown>; isPending: boolean };
}

/** Shared CRUD shell for the four "plain" taxonomies (Feeling, Activity,
 * Category, ContentTag) — Background Style keeps its own page since it
 * needs color pickers and gradient preview that don't generalize here. */
export function SimpleTaxonomyManager({
  title,
  description,
  queryKeyForInvalidation,
  hasEmoji = false,
  hasCategory = false,
  list,
  create,
  update,
  remove,
}: SimpleTaxonomyManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);

  const items = list.data?.data || [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeyForInvalidation });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId && !formData.key.trim()) {
      toast.error('A stable key is required');
      return;
    }
    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }
    if (hasEmoji && !formData.emoji.trim()) {
      toast.error('Emoji is required');
      return;
    }

    try {
      if (editingId) {
        await update.mutateAsync({
          id: editingId,
          input: {
            label: formData.label,
            emoji: hasEmoji ? formData.emoji : undefined,
            category: hasCategory ? formData.category : undefined,
            sortOrder: formData.sortOrder,
          },
        });
        toast.success(`${title.slice(0, -1)} updated`);
      } else {
        await create.mutateAsync({
          key: formData.key,
          label: formData.label,
          emoji: hasEmoji ? formData.emoji : undefined,
          category: hasCategory ? formData.category || 'General' : undefined,
          sortOrder: formData.sortOrder,
        });
        toast.success(`${title.slice(0, -1)} created`);
      }
      invalidate();
      setShowForm(false);
      setEditingId(null);
      setFormData(EMPTY_FORM);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  const handleEdit = (item: TaxonomyOption) => {
    setFormData({
      key: item.key,
      label: item.label,
      emoji: item.emoji || '',
      category: item.category || '',
      sortOrder: item.sortOrder,
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this? This cannot be undone.')) return;
    try {
      await remove.mutateAsync(id);
      toast.success('Deleted');
      invalidate();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete');
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await update.mutateAsync({ id, input: { isActive: !isActive } });
      invalidate();
      toast.success(isActive ? 'Disabled' : 'Enabled');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{title}</h1>
        <p className="text-gray-600">{description}</p>
      </div>

      {!showForm && (
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData(EMPTY_FORM);
          }}
          className="mb-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {title.slice(0, -1)}
        </Button>
      )}

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              {editingId ? `Edit ${title.slice(0, -1)}` : `Create New ${title.slice(0, -1)}`}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stable Key {editingId && <span className="text-gray-400 font-normal">(cannot be changed)</span>}
              </label>
              <Input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                placeholder="e.g., happy"
                disabled={Boolean(editingId)}
                className="w-full disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
              <Input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Happy"
                className="w-full"
              />
            </div>

            {hasEmoji && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
                <Input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="e.g., 😊"
                  className="w-32"
                />
              </div>
            )}

            {hasCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Pet Care"
                  className="w-full"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order (optional)</label>
              <Input
                type="number"
                value={formData.sortOrder ?? ''}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value ? parseInt(e.target.value) : undefined })
                }
                placeholder="0"
                className="w-full"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                disabled={create.isPending || update.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {list.isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Nothing here yet. Create one to get started.</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center gap-4">
                {hasEmoji && <div className="text-3xl flex-shrink-0 w-10 text-center">{item.emoji}</div>}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.label}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                    <div>key: {item.key}</div>
                    {hasCategory && item.category && <div>Category: {item.category}</div>}
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(item)} disabled={create.isPending || update.isPending}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(item.id, item.isActive)}
                    disabled={update.isPending}
                  >
                    {item.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} disabled={remove.isPending}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
