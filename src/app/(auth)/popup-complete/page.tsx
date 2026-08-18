"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { publishCentralAuthPopupResult } from "@/lib/auth/popup";

function PopupCompleteContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    // The callback route has already validated state, exchanged the code,
    // and set the session cookie before this page ever loads — this page
    // only tells the opener the outcome and closes. No OAuth/session
    // material is ever included in the message.
    publishCentralAuthPopupResult(success, window.location.origin);

    const timer = window.setTimeout(() => {
      try {
        window.close();
      } catch {
        // Best-effort only; the fallback UI below remains visible.
      }
      setClosed(true);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [success]);

  if (!success) {
    return (
      <div className="text-center">
        <p className="text-gray-700 font-semibold mb-2">Couldn&apos;t complete sign-in</p>
        <p className="text-gray-500 text-sm">Please close this window and try again.</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-gray-700 font-semibold mb-2">Sign-in complete</p>
      <p className="text-gray-500 text-sm">{closed ? "You can close this window." : "Finishing up..."}</p>
    </div>
  );
}

export default function PopupCompletePage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
      <PopupCompleteContent />
    </Suspense>
  );
}
