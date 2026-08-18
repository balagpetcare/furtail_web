'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Edit2, Trash2, Eye } from 'lucide-react';
import {
  useAdminBackgroundStyles,
  useCreateBackgroundStyle,
  useUpdateBackgroundStyle,
  useDeleteBackgroundStyle,
  CreateBackgroundStyleInput,
} from '@/lib/api/admin-taxonomies';
import { toast } from 'sonner';
import { TaxonomyOption } from '@/lib/api/taxonomies';

export default function AdminBackgroundStylesPage() {
  const queryClient = useQueryClient();
  const { data: stylesData, isLoading } = useAdminBackgroundStyles();
  const createMutation = useCreateBackgroundStyle();
  const updateMutation = useUpdateBackgroundStyle();
  const deleteMutation = useDeleteBackgroundStyle();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreateBackgroundStyleInput>({
    label: '',
    colorValue: '#f3f4f6',
    textColor: '#1f2937',
  });

  const styles = stylesData?.data || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label.trim() || !formData.colorValue || !formData.textColor) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          input: {
            label: formData.label,
            colorValue: formData.colorValue,
            textColor: formData.textColor,
            sortOrder: formData.sortOrder,
          },
        });
        toast.success('Background style updated');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Background style created');
      }

      queryClient.invalidateQueries({ queryKey: ['admin', 'taxonomies', 'background-styles'] });
      setShowForm(false);
      setEditingId(null);
      setFormData({ label: '', colorValue: '#f3f4f6', textColor: '#1f2937' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save background style';
      toast.error(errorMessage);
    }
  };

  const handleEdit = (style: TaxonomyOption) => {
    setFormData({
      label: style.label,
      colorValue: style.colorValue || '#f3f4f6',
      textColor: style.textColor || '#1f2937',
      sortOrder: style.sortOrder,
    });
    setEditingId(style.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this background style?')) return;

    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Background style deleted');
      queryClient.invalidateQueries({ queryKey: ['admin', 'taxonomies', 'background-styles'] });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete background style';
      toast.error(errorMessage);
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await updateMutation.mutateAsync({
        id,
        input: { isActive: !isActive },
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'taxonomies', 'background-styles'] });
      toast.success(isActive ? 'Background style disabled' : 'Background style enabled');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update background style';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Background Styles</h1>
        <p className="text-gray-600">Manage text post background styles for all users</p>
      </div>

      {/* Create Button */}
      {!showForm && (
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({ label: '', colorValue: '#f3f4f6', textColor: '#1f2937' });
          }}
          className="mb-6"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Background Style
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">
              {editingId ? 'Edit Background Style' : 'Create New Background Style'}
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
                Label
              </label>
              <Input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Sunset Orange"
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.colorValue}
                    onChange={(e) => setFormData({ ...formData, colorValue: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.colorValue}
                    onChange={(e) => setFormData({ ...formData, colorValue: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={formData.textColor}
                    onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
              <div
                className="p-6 rounded-lg text-center text-sm font-medium"
                style={{
                  backgroundColor: formData.colorValue,
                  color: formData.textColor,
                }}
              >
                This is how your background will look
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order (optional)
              </label>
              <Input
                type="number"
                value={formData.sortOrder || ''}
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
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update' : 'Create'} Background Style
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Styles List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Loading background styles...</div>
      ) : styles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No background styles yet. Create one to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {styles.map((style) => (
              <div key={style.id} className="p-4 flex items-center gap-4">
                {/* Preview Swatch */}
                <div
                  className="w-16 h-16 rounded-lg flex-shrink-0 border border-gray-300"
                  style={{
                    backgroundColor: style.colorValue || '#f3f4f6',
                  }}
                  title={`Text color: ${style.textColor || '#1f2937'}`}
                >
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-semibold rounded-lg"
                    style={{
                      color: style.textColor || '#1f2937',
                    }}
                  >
                    <Eye className="w-3 h-3" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{style.label}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                    <div>Background: {style.colorValue}</div>
                    <div>Text: {style.textColor || '#1f2937'}</div>
                    {style.sortOrder !== undefined && <div>Order: {style.sortOrder}</div>}
                  </div>
                  <div className="mt-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        style.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {style.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(style)}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(style.id, style.isActive)}
                    disabled={updateMutation.isPending}
                  >
                    {style.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(style.id)}
                    disabled={deleteMutation.isPending}
                  >
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
