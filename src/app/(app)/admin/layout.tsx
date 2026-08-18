import React from 'react';
import Link from 'next/link';
import { Palette } from 'lucide-react';

export const metadata = {
  title: 'Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="container flex items-center h-16 gap-8">
          <h1 className="text-lg font-bold text-gray-900">Furtail Admin</h1>
          <nav className="flex gap-6">
            <Link
              href="/admin/background-styles"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <Palette className="w-4 h-4" />
              Background Styles
            </Link>
          </nav>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}
