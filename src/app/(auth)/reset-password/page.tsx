"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validatePassword = () => {
    if (!password) {
      setPasswordError("Password is required.");
      return false;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = () => {
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      return false;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset token is missing or invalid.");
      return;
    }

    const isPasswordVal = validatePassword();
    const isConfirmPasswordVal = validateConfirmPassword();

    if (!isPasswordVal || !isConfirmPasswordVal) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Password reset failed");

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. The reset link may have expired or is invalid.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading;

  if (success) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Password Reset Complete</h2>
          <p className="text-sm text-gray-500 mt-2">
            Your password has been successfully updated. You can now log in with your new password.
          </p>
        </div>
        <Button 
          onClick={() => router.push("/login")}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Set new password
        </h2>
        <p className="text-sm text-gray-500 mt-2">Enter your new secure password below to update your account access.</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!token ? (
        <div className="text-center p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm">
          Invalid or expired password reset link. Please request a new link.
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4" noValidate>
          {/* Password field */}
          <div className="space-y-1">
            <label htmlFor="resetPasswordInput" className="block text-sm font-semibold text-gray-700">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="resetPasswordInput"
                type={showPassword ? "text" : "password"}
                required
                disabled={disabled}
                placeholder="min 8 characters"
                value={password}
                onBlur={validatePassword}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                className={`w-full pl-10 pr-10 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                  passwordError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
                }`}
              />
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 outline-none"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {passwordError}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1">
            <label htmlFor="confirmResetPasswordInput" className="block text-sm font-semibold text-gray-700">Confirm Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                id="confirmResetPasswordInput"
                type="password"
                required
                disabled={disabled}
                placeholder="re-enter password"
                value={confirmPassword}
                onBlur={validateConfirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError("");
                }}
                className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                  confirmPasswordError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
                }`}
              />
            </div>
            {confirmPasswordError && (
              <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {confirmPasswordError}
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={disabled} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold flex justify-center gap-2 mt-6 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-all outline-none"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Reset Password
          </Button>
        </form>
      )}
    </div>
  );
}
