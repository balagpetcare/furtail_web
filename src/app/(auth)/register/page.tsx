"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Lock, User, Loader2, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Input states
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Validation states
  const [displayNameError, setDisplayNameError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [agreeTermsError, setAgreeTermsError] = useState("");

  const validateDisplayName = () => {
    if (!displayName.trim()) {
      setDisplayNameError("Display name is required.");
      return false;
    }
    setDisplayNameError("");
    return true;
  };

  const validateUsername = () => {
    if (!username.trim()) {
      setUsernameError("Username is required.");
      return false;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setUsernameError("Username must be 3-30 characters and contain only letters, numbers, or underscores.");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError("Email address is required.");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePhone = () => {
    if (phone && !/^\+?[0-9\s\-()]{7,15}$/.test(phone)) {
      setPhoneError("Please enter a valid phone number or leave it blank.");
      return false;
    }
    setPhoneError("");
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isDisplayNameVal = validateDisplayName();
    const isUsernameVal = validateUsername();
    const isEmailVal = validateEmail();
    const isPhoneVal = validatePhone();
    const isPasswordVal = validatePassword();
    const isConfirmPasswordVal = validateConfirmPassword();

    if (!agreeTerms) {
      setAgreeTermsError("You must agree to the Terms of Service and Privacy Policy.");
      return;
    } else {
      setAgreeTermsError("");
    }

    if (
      !isDisplayNameVal ||
      !isUsernameVal ||
      !isEmailVal ||
      !isPhoneVal ||
      !isPasswordVal ||
      !isConfirmPasswordVal
    ) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          phone: phone || undefined,
          displayName,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An account with this email or username already exists.");
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading;

  if (success) {
    return (
      <div className="w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
          <Mail className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Registration Successful</h2>
          <p className="text-sm text-gray-500 mt-2">
            Please check your email <strong>{email}</strong> for a verification link to activate your account.
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
          Create your account
        </h2>
        <p className="text-sm text-gray-500 mt-2">Join the pet-loving community today</p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 text-sm text-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4" noValidate>
        {/* Display Name */}
        <div className="space-y-1">
          <label htmlFor="displayNameInput" className="block text-sm font-semibold text-gray-700">Display Name</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <User className="w-5 h-5" />
            </span>
            <input
              id="displayNameInput"
              type="text"
              required
              disabled={disabled}
              placeholder="e.g. John Doe"
              value={displayName}
              onBlur={validateDisplayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (displayNameError) setDisplayNameError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                displayNameError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
              }`}
            />
          </div>
          {displayNameError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {displayNameError}
            </p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1">
          <label htmlFor="usernameInput" className="block text-sm font-semibold text-gray-700">Username</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <User className="w-5 h-5" />
            </span>
            <input
              id="usernameInput"
              type="text"
              required
              disabled={disabled}
              placeholder="choose a username"
              value={username}
              onBlur={validateUsername}
              onChange={(e) => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                usernameError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
              }`}
            />
          </div>
          {usernameError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {usernameError}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label htmlFor="emailInput" className="block text-sm font-semibold text-gray-700">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Mail className="w-5 h-5" />
            </span>
            <input
              id="emailInput"
              type="email"
              required
              disabled={disabled}
              placeholder="you@example.com"
              value={email}
              onBlur={validateEmail}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                emailError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
              }`}
            />
          </div>
          {emailError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {emailError}
            </p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1">
          <label htmlFor="phoneInput" className="block text-sm font-semibold text-gray-700">Phone Number (Optional)</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Phone className="w-5 h-5" />
            </span>
            <input
              id="phoneInput"
              type="tel"
              disabled={disabled}
              placeholder="e.g. +8801700000000"
              value={phone}
              onBlur={validatePhone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                phoneError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
              }`}
            />
          </div>
          {phoneError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {phoneError}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <label htmlFor="passwordInput" className="block text-sm font-semibold text-gray-700">Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="passwordInput"
              type="password"
              required
              disabled={disabled}
              placeholder="min 8 characters"
              value={password}
              onBlur={validatePassword}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
                passwordError ? "border-red-300 focus:ring-red-500/20" : "border-gray-200"
              }`}
            />
          </div>
          {passwordError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {passwordError}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label htmlFor="confirmPasswordInput" className="block text-sm font-semibold text-gray-700">Confirm Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Lock className="w-5 h-5" />
            </span>
            <input
              id="confirmPasswordInput"
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
              className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus-visible:ring-2 focus-visible:ring-purple-500/20 focus-visible:border-purple-500 ${
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

        {/* Agree Terms Checkbox */}
        <div className="space-y-1 pt-2">
          <div className="flex items-start gap-3">
            <input
              id="agreeTermsInput"
              type="checkbox"
              disabled={disabled}
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                if (e.target.checked) setAgreeTermsError("");
              }}
              className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded focus-visible:ring-2 outline-none"
            />
            <label htmlFor="agreeTermsInput" className="text-sm text-gray-500 leading-tight select-none">
              I agree to the <a href="/terms" className="text-purple-600 font-semibold hover:underline outline-none focus-visible:underline">Terms of Service</a> and <a href="/privacy" className="text-purple-600 font-semibold hover:underline outline-none focus-visible:underline">Privacy Policy</a>.
            </label>
          </div>
          {agreeTermsError && (
            <p className="text-xs font-medium text-red-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {agreeTermsError}
            </p>
          )}
        </div>

        {/* Submit */}
        <Button 
          type="submit" 
          disabled={disabled} 
          className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-6 font-semibold flex justify-center gap-2 mt-6 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 transition-all outline-none"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          Register
        </Button>
      </form>

      <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t border-gray-100">
        Already have an account?{" "}
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
