'use client';

import Link from 'next/link';
import { Palette, ChevronRight, SmileIcon, Zap, Grid3x3, Hash } from 'lucide-react';

const ADMIN_SECTIONS = [
  {
    id: 'feelings',
    title: 'Feelings',
    description: 'Manage the Feeling options available in Create Post',
    href: '/admin/feelings',
    icon: SmileIcon,
  },
  {
    id: 'activities',
    title: 'Activities',
    description: 'Manage the Activity options available in Create Post',
    href: '/admin/activities',
    icon: Zap,
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Manage the Post Category taxonomy',
    href: '/admin/categories',
    icon: Grid3x3,
  },
  {
    id: 'tags',
    title: 'Content Tags',
    description: 'Manage Content Tags selectable when creating a post',
    href: '/admin/tags',
    icon: Hash,
  },
  {
    id: 'background-styles',
    title: 'Background Styles',
    description: 'Manage text post background colors and text colors for all users',
    href: '/admin/background-styles',
    icon: Palette,
  },
];

export default function AdminPage() {
  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Administration</h1>
        <p className="text-gray-600">Manage Furtail taxonomy and content settings</p>
      </div>

      <div className="grid gap-4">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.id}
              href={section.href}
              className="block p-6 border border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-100 group-hover:bg-purple-100 rounded-lg transition-colors">
                    <Icon className="w-6 h-6 text-gray-700 group-hover:text-purple-700" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-gray-900">{section.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
