"use client";

import React from "react";
import { MessageSquare } from "lucide-react";

export default function MessagesIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/20 text-center select-none h-full">
      <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-4 animate-bounce duration-[3000ms]">
        <MessageSquare className="w-8 h-8" />
      </div>
      <h2 className="font-extrabold text-gray-950 text-base">Select a conversation</h2>
      <p className="text-xs text-gray-400 max-w-xs mt-1.5 leading-relaxed">
        Choose a chat from the inbox on the left or visit a user's profile to start a new thread.
      </p>
    </div>
  );
}
