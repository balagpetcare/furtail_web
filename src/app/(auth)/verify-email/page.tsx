"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Verification token is missing.");
      setLoading(false);
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Email verification failed");

        setSuccess(true);
      } catch (err: any) {
        setError(err.message || "Invalid or expired verification token.");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full text-center space-y-6">
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Verifying your email...</h2>
          <p className="text-sm text-gray-500">Please wait while we confirm your activation code</p>
        </div>
      ) : success ? (
        <div className="space-y-4">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
          <p className="text-sm text-gray-500">Your account is now active and ready to use.</p>
          <Button 
            onClick={() => router.push("/login")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold"
          >
            Go to Sign In
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <XCircle className="w-16 h-16 text-red-600 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Verification Failed</h2>
          <p className="text-sm text-red-600">{error}</p>
          <Button 
            onClick={() => router.push("/login")}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold"
          >
            Go to Sign In
          </Button>
        </div>
      )}
    </div>
  );
}
