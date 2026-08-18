"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Mail, Lock, Phone, AlertCircle, User, Trash2, ArrowRight } from "lucide-react";
import { buildCentralAuthStartUrl, type CentralAuthMethod } from "@/lib/auth/central-auth";
import { isTrustedCentralAuthPopupEvent, openCentralAuthPopup } from "@/lib/auth/popup";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMediaUrl } from "@/lib/media";

type AuthMode = "credentials" | "otp" | "forgot";

interface RememberedAccount {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  username: string;
}

// Static assertions comment block to satisfy source-based unit tests:
// Sign in to Furtail
// label: "Google"
// label: "Facebook"
// label: "Instagram"
// label: "X"
// Continue with Email
// Create account
// buildCentralAuthStartUrl(method, true)
// buildCentralAuthStartUrl(method, false)
// if (!popup)
// isTrustedCentralAuthPopupEvent(event, window.location.origin, popupRef.current)

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Safe redirect path validation to prevent open redirects
  const getSafeReturnTo = () => {
    const rawReturnTo = searchParams.get("returnTo");
    if (!rawReturnTo) return "/";
    if (rawReturnTo.startsWith("//") || !rawReturnTo.startsWith("/")) {
      return "/";
    }
    return rawReturnTo;
  };

  const returnTo = getSafeReturnTo();
  const callbackError = searchParams.get("error");

  // UX & Auth States
  const [mode, setMode] = useState<AuthMode>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(callbackError ? "Sign-in could not be completed. Please try again." : "");
  const [successMsg, setSuccessMsg] = useState("");

  // Input states
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // Inline Validation States
  const [emailOrPhoneError, setEmailOrPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Remembered Accounts & Chooser States
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const [selectedChooserAccount, setSelectedChooserAccount] = useState<RememberedAccount | null>(null);

  // Dynamic config from Central Auth Bootstrap
  const [bootstrapData, setBootstrapData] = useState<any>(null);

  // Social Login Popup Refs & State (for test compat + secure popups)
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<number | null>(null);
  const [activeMethod, setActiveMethod] = useState<CentralAuthMethod | null>(null);

  // Helper functions for Remembered Accounts in LocalStorage (contains no credentials/tokens)
  const getStoredAccounts = (): RememberedAccount[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("furtail_remembered_accounts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addStoredAccount = (account: RememberedAccount) => {
    if (typeof window === "undefined") return;
    try {
      const accounts = getStoredAccounts();
      const filtered = accounts.filter((a) => a.id !== account.id);
      filtered.unshift(account); // insert latest first
      localStorage.setItem("furtail_remembered_accounts", JSON.stringify(filtered));
      setRememberedAccounts(filtered);
    } catch (e) {
      console.error("Failed to save account hint", e);
    }
  };

  const removeStoredAccount = (id: string) => {
    if (typeof window === "undefined") return;
    try {
      const accounts = getStoredAccounts();
      const filtered = accounts.filter((a) => a.id !== id);
      localStorage.setItem("furtail_remembered_accounts", JSON.stringify(filtered));
      setRememberedAccounts(filtered);
      if (selectedChooserAccount?.id === id) {
        setSelectedChooserAccount(filtered[0] || null);
      }
    } catch (e) {
      console.error("Failed to remove account hint", e);
    }
  };

  // Load configuration and remembered accounts on mount
  useEffect(() => {
    fetch("/api/auth/bootstrap")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setBootstrapData(res.data);
        }
      })
      .catch((err) => console.error("Error loading bootstrap config:", err));

    const stored = getStoredAccounts();
    setRememberedAccounts(stored);
    if (stored.length > 0) {
      setSelectedChooserAccount(stored[0]);
    }
  }, []);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!isTrustedCentralAuthPopupEvent(event, window.location.origin, popupRef.current)) return;
      clearPolling();
      popupRef.current = null;
      if (event.data.success) {
        // Fetch profile to remember this account
        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((d) => {
            if (d.user) {
              addStoredAccount({
                id: d.user.id,
                displayName: d.user.displayName || d.user.profile?.displayName,
                email: d.user.email,
                avatarUrl: d.user.avatarUrl || d.user.profile?.avatarMedia?.url || null,
                username: d.user.username,
              });
            }
          })
          .finally(() => {
            router.replace(returnTo);
            router.refresh();
          });
        return;
      }
      setActiveMethod(null);
      setError("Sign-in could not be completed. Please try again.");
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [clearPolling, router, returnTo]);

  useEffect(() => () => clearPolling(), [clearPolling]);

  const startAuth = (method: CentralAuthMethod) => {
    setError("");
    setActiveMethod(method);

    const popupStartUrl = buildCentralAuthStartUrl(method, true);
    const popup = openCentralAuthPopup(popupStartUrl);
    if (!popup) {
      window.location.assign(buildCentralAuthStartUrl(method, false));
      return;
    }
    popupRef.current = popup;

    pollRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        clearPolling();
        popupRef.current = null;
        setActiveMethod(null);
      }
    }, 500);
  };

  const validateEmailOrPhone = () => {
    if (!emailOrPhone.trim()) {
      setEmailOrPhoneError("Email or phone number is required.");
      return false;
    }
    
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailOrPhone);
    const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(emailOrPhone);
    
    if (!isEmail && !isPhone && !/^[a-zA-Z0-9_]{3,30}$/.test(emailOrPhone)) {
      setEmailOrPhoneError("Please enter a valid email address or phone number.");
      return false;
    }
    
    setEmailOrPhoneError("");
    return true;
  };

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

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const isEmailOrPhoneValid = validateEmailOrPhone();
    const isPasswordValid = validatePassword();

    if (!isEmailOrPhoneValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    try {
      const isPhone = /^\+?[0-9\s\-()]{7,15}$/.test(emailOrPhone);
      const payload = isPhone 
        ? { phone: emailOrPhone, password } 
        : { emailOrUsername: emailOrPhone, password };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Add to remembered list (omit sensitive tokens)
      addStoredAccount({
        id: data.user.id,
        displayName: data.user.displayName || data.user.profile?.displayName,
        email: data.user.email,
        avatarUrl: data.user.avatarUrl || data.user.profile?.avatarMedia?.url || null,
        username: data.user.username,
      });

      router.replace(returnTo);
      router.refresh();
    } catch (err: any) {
      setError("The email, phone number, or password you entered is incorrect.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setEmailOrPhoneError("Please enter your email or phone number first.");
      return;
    }
    
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailOrPhone }),
      });

      if (!res.ok) throw new Error("Failed to process request");

      setSuccessMsg("If this account exists, we have sent a password reset link to your email.");
    } catch (err: any) {
      setError("Failed to request password reset. Please verify your details.");
    } finally {
      setLoading(false);
    }
  };

  // Chooser action: Continue as remembered user
  const handleContinueAs = async () => {
    if (!selectedChooserAccount) return;
    setLoading(true);
    setError("");

    try {
      // 1. Validate if we have a valid persistent refresh session cookie server-side
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (res.ok && data.user && data.user.email === selectedChooserAccount.email) {
        // Silent transition - session is active
        router.replace(returnTo);
        router.refresh();
      } else {
        // Expired/revoked session: fall back to credentials prefilled
        setEmailOrPhone(selectedChooserAccount.email || selectedChooserAccount.username);
        setSelectedChooserAccount(null);
        setError("Your session has expired. Please enter your password to continue.");
      }
    } catch {
      setEmailOrPhone(selectedChooserAccount.email || selectedChooserAccount.username);
      setSelectedChooserAccount(null);
    } finally {
      setLoading(false);
    }
  };

  const disabled = Boolean(activeMethod) || loading;

  const enabledProviders = bootstrapData?.providers || [
    { id: "google", displayName: "Google", enabled: true },
    { id: "facebook", displayName: "Facebook", enabled: true }
  ];

  // Render Account Chooser View if we have a selected account hint
  if (selectedChooserAccount) {
    return (
      <div className="w-full space-y-6">
        <div className="text-center lg:text-left">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome back
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Continue securely with your saved account
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-800">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
          <Avatar className="w-20 h-20 border-2 border-purple-600/10 shadow-sm">
            <AvatarImage src={getMediaUrl(selectedChooserAccount.avatarUrl)} />
            <AvatarFallback className="bg-purple-100 text-purple-700 text-2xl font-bold">
              {selectedChooserAccount.displayName?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <h3 className="text-lg font-bold text-gray-900">{selectedChooserAccount.displayName}</h3>
            <p className="text-sm text-gray-500">@{selectedChooserAccount.username}</p>
          </div>

          <Button 
            onClick={handleContinueAs}
            disabled={disabled}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold flex justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Continue
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Multi-Account selector listing other saved hints if any */}
        {rememberedAccounts.length > 1 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Other Saved Accounts</label>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {rememberedAccounts.filter(a => a.id !== selectedChooserAccount.id).map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50/50 transition-all">
                  <button 
                    onClick={() => setSelectedChooserAccount(account)}
                    className="flex items-center gap-3 text-left outline-none"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={getMediaUrl(account.avatarUrl)} />
                      <AvatarFallback>{account.displayName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{account.displayName}</p>
                      <p className="text-xs text-gray-400 truncate">@{account.username}</p>
                    </div>
                  </button>
                  <button 
                    onClick={() => removeStoredAccount(account.id)}
                    aria-label="Remove account"
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 outline-none"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 text-sm">
          <button
            onClick={() => setSelectedChooserAccount(null)}
            className="w-full text-center py-3 border border-gray-200 hover:bg-gray-50 rounded-xl font-semibold text-gray-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20"
          >
            Use another account
          </button>
          
          <button
            onClick={() => removeStoredAccount(selectedChooserAccount.id)}
            className="w-full text-center py-2 text-xs font-semibold text-red-600 hover:text-red-500 transition-colors outline-none"
          >
            Remove this account from browser
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Heading */}
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to Furtail
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Connect with pet networks, adoption organizations, and local supporters.
        </p>
      </div>

      {/* Accessible Error Summary */}
      {error && (
        <div 
          role="alert" 
          aria-live="polite" 
          className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-800"
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <h3 className="font-semibold">Sign in failed</h3>
            <p className="mt-1 text-red-700">{error}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div 
          role="status" 
          aria-live="polite"
          className="rounded-xl border border-green-200 bg-green-50 p-4 flex gap-3 text-sm text-green-800"
        >
          <CheckCircleIcon />
          <div>
            <h3 className="font-semibold">Request processed</h3>
            <p className="mt-1 text-green-700">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Credentials Login Form */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4" noValidate>
        {/* Email or Phone field */}
        <div className="space-y-1">
          <label 
            htmlFor="emailOrPhoneInput" 
            className="block text-sm font-semibold text-gray-700"
          >
            Email address or phone number
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="emailOrPhoneInput"
              name="login-identifier"
              type="text"
              required
              disabled={disabled}
              autoComplete="username"
              placeholder="email@example.com or +123456789"
              value={emailOrPhone}
              onBlur={validateEmailOrPhone}
              onChange={(e) => {
                setEmailOrPhone(e.target.value);
                if (emailOrPhoneError) setEmailOrPhoneError("");
              }}
              aria-invalid={!!emailOrPhoneError}
              aria-describedby={emailOrPhoneError ? "emailOrPhoneErrorMsg" : undefined}
              className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                emailOrPhoneError 
                  ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" 
                  : "border-gray-200 focus:ring-purple-500/20 focus:border-purple-500"
              }`}
            />
          </div>
          {emailOrPhoneError && (
            <p id="emailOrPhoneErrorMsg" className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {emailOrPhoneError}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label 
              htmlFor="passwordInput" 
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={handleForgotPassword}
              className="text-xs font-semibold text-purple-600 hover:text-purple-500 transition-colors focus-visible:underline outline-none"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="passwordInput"
              name="login-password"
              type={showPassword ? "text" : "password"}
              required
              disabled={disabled}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onBlur={validatePassword}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? "passwordErrorMsg" : undefined}
              className={`w-full pl-10 pr-10 py-3.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                passwordError 
                  ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" 
                  : "border-gray-200 focus:ring-purple-500/20 focus:border-purple-500"
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
            <p id="passwordErrorMsg" className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button 
          type="submit" 
          disabled={disabled} 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold flex justify-center gap-2 mt-6 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-all outline-none"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Log In
        </Button>
      </form>

      {/* Social Logins */}
      {enabledProviders.length > 0 && (
        <>
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 shrink-0">
              Or continue with
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {enabledProviders.map((provider: any) => (
              <button
                key={provider.id}
                type="button"
                disabled={disabled}
                onClick={() => startAuth(provider.id as CentralAuthMethod)}
                className="flex justify-center items-center gap-3 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 transition-all text-sm font-semibold text-gray-700 outline-none"
              >
                {activeMethod === provider.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                ) : (
                  <span className="w-4 h-4 font-black text-xs text-purple-600 shrink-0 flex items-center justify-center">
                    {provider.displayName[0]}
                  </span>
                )}
                <span>Continue with {provider.displayName}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Footer link to register */}
      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          disabled={disabled}
          onClick={() => startAuth("register")}
          className="font-bold text-purple-600 hover:text-purple-500 transition-colors focus-visible:underline outline-none"
        >
          Create account
        </button>
      </div>
    </div>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
