import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="font-bold text-2xl text-purple-600 tracking-tight">Furtail</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-purple-600 font-medium hidden sm:block">Log In</Link>
            <Button className="rounded-full bg-purple-600 hover:bg-purple-700">Sign Up</Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-gray-50 border-t border-gray-100 py-12 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} Furtail. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
