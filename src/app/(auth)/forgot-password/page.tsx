"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, AlertCircle, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError("Email address is required.");
      return false;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!validateEmail()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Always show success to prevent account enumeration
      setSuccess(true);
    } catch (err: any) {
      // Safe fallback even if network fails
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
          <p className="text-sm text-gray-500 mt-2">
            If an account matches <strong>{email}</strong>, we have sent a secure password reset link. Please check your inbox and spam folder.
          </p>
        </div>
        <Button 
          onClick={() => router.push("/login")}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          Return to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Reset password
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-1">
          <label htmlFor="forgotEmailInput" className="block text-sm font-semibold text-gray-700">
            Email address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="forgotEmailInput"
              type="email"
              required
              disabled={loading}
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onBlur={validateEmail}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "emailErrorMsg" : undefined}
              className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                emailError 
                  ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" 
                  : "border-gray-200 focus:ring-purple-500/20 focus:border-purple-500"
              }`}
            />
          </div>
          {emailError && (
            <p id="emailErrorMsg" className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {emailError}
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold flex justify-center gap-2 mt-6 focus-visible:ring-2 focus-visible:ring-purple-500 transition-all outline-none"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Send Reset Link
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
        Remember your password?{" "}
        <button
          onClick={() => router.push("/login")}
          className="font-bold text-purple-600 hover:text-purple-500 transition-colors focus-visible:underline outline-none"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
