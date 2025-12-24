"use client";

import { GlassCard, GlassPageShell } from "@/components/GlassShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/lib/api";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const LeanLogo = () => (
  <div className="flex items-center justify-center w-full px-4 py-2">
    <Image
      src="/LEAN AI POWERED orginal.png"
      alt="LEAN AI Logo"
      width={300}
      height={90}
      className="h-16 w-full max-w-xs object-contain"
      priority
    />
  </div>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!email) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.forgotPassword(email);
      setSuccess(response.message || "OTP has been sent to your email address");
      // Redirect to OTP verification page after 2 seconds
      setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
      setLoading(false);
    }
  };

  return (
    <GlassPageShell>
      <GlassCard className="p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LeanLogo />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Forgot Password?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email address and we'll send you an OTP to reset your password
          </p>
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
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Email Address
            </Label>
            <div className="group relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-2xl border border-white/70 bg-white/70 pl-11 text-slate-800 placeholder:text-slate-500 shadow-inner shadow-white/50 backdrop-blur-xl transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/80"
              />
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
                Sending OTP...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send OTP
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </GlassCard>
    </GlassPageShell>
  );
}

