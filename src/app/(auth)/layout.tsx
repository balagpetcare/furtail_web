import React from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex lg:grid lg:grid-cols-12">
      {/* Left 55-60% Branded Visual/Hero Panel (Desktop only) */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Subtle decorative background (Vanilla CSS styled) */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-300 via-red-500 to-purple-800 pointer-events-none" />
        
        <div className="flex items-center gap-2 z-10">
          <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
          <span className="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-pink-200">
            FURTAIL
          </span>
        </div>

        {/* Future Custom Hero Artwork Dedicated Slot Placeholder */}
        <div className="my-auto max-w-xl z-10 space-y-6">
          <h1 className="text-5xl font-black leading-tight tracking-tight">
            Connecting pet lovers, adoption networks, and community support.
          </h1>
          <p className="text-lg text-purple-100 font-medium">
            Join the most trusted social platform for pets. Securely connect, share moments, and adopt pets with a first-party verified WPA account.
          </p>
          {/* Component slot for future custom hero artwork */}
          <div className="w-full h-48 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm relative overflow-hidden group hover:border-white/20 transition-all">
            <span className="text-sm font-semibold tracking-wider uppercase text-purple-300/60 group-hover:text-purple-300 transition-all">
              [ Custom Hero Artwork Slot ]
            </span>
          </div>
        </div>

        <div className="text-sm text-purple-200/80 z-10 flex justify-between">
          <span>© 2026 Furtail Inc.</span>
        </div>
      </div>

      {/* Right 40-45% Form Panel (Primary Content) */}
      <div className="flex-1 flex flex-col justify-between py-12 px-4 sm:px-6 lg:col-span-5 xl:col-span-4 lg:px-8 bg-gray-50 min-h-screen lg:min-h-0">
        <div className="flex-1 flex flex-col justify-center">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <Link href="/" className="flex items-center gap-2 mb-6 text-gray-500 hover:text-gray-900 transition-colors w-fit focus-visible:ring-2 focus-visible:ring-purple-500 rounded-lg outline-none">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Home</span>
            </Link>
            
            {/* Logo visible only on mobile */}
            <h2 className="lg:hidden text-center text-3xl font-black text-purple-600 tracking-tight mb-2">
              Furtail
            </h2>
          </div>

          <div className="sm:mx-auto sm:w-full sm:max-w-md mt-4">
            <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
              {children}
            </div>
          </div>
        </div>

        {/* Subtle Footer Links visible on all device widths */}
        <div className="mt-8 text-center text-xs text-gray-400 space-x-4 border-t border-gray-100/50 pt-4">
          <a href="/terms" className="hover:underline hover:text-gray-600 transition-all outline-none focus-visible:underline">Terms</a>
          <span>•</span>
          <a href="/privacy" className="hover:underline hover:text-gray-600 transition-all outline-none focus-visible:underline">Privacy</a>
          <span>•</span>
          <a href="/help" className="hover:underline hover:text-gray-600 transition-all outline-none focus-visible:underline">Help</a>
        </div>
      </div>
    </div>
  );
}
