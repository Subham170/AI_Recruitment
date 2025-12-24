"use client";

import { GlassCard, GlassPageShell } from "@/components/GlassShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/lib/api";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const LeanLogo = () => (
  <div className="flex items-center justify-center w-full">
    <Image
      src="/LEAN_IT_LOGO.png"
      alt="LEAN IT Logo"
      width={300}
      height={90}
      className="h-20 w-full max-w-md object-contain"
      priority
    />
  </div>
);

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Redirect to forgot password if no email
      router.push("/forgot-password");
    }
  }, [searchParams, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetPassword(
        email,
        newPassword,
        confirmPassword
      );
      if (response.success) {
        setSuccess("Password reset successfully! Redirecting to login...");
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        setError(response.message || "Failed to reset password. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Failed to reset password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <GlassPageShell>
      <GlassCard className="p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LeanLogo />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your new password below
          </p>
          {email && (
            <p className="mt-1 text-xs text-slate-500">
              {email}
            </p>
          )}
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="mb-6 bg-red-50/80 backdrop-blur"
          >
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50/80 backdrop-blur border-green-200">
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="newPassword"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              New Password
            </Label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-2xl border border-white/70 bg-white/70 pl-11 pr-11 text-slate-800 placeholder:text-slate-500 shadow-inner shadow-white/50 backdrop-blur-xl transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/80"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-indigo-500 focus:outline-none"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Must be at least 6 characters long
            </p>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Confirm Password
            </Label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-2xl border border-white/70 bg-white/70 pl-11 pr-11 text-slate-800 placeholder:text-slate-500 shadow-inner shadow-white/50 backdrop-blur-xl transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/80"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-indigo-500 focus:outline-none"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="group h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-px hover:shadow-2xl hover:bg-slate-800 disabled:opacity-70"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Resetting Password...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Reset Password
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href={`/verify-otp?email=${encodeURIComponent(email)}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            Back to Login
          </Link>
        </div>
      </GlassCard>
    </GlassPageShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <GlassPageShell>
        <GlassCard className="p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <LeanLogo />
            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Loading...
            </p>
          </div>
        </GlassCard>
      </GlassPageShell>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

