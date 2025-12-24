"use client";

import { GlassCard, GlassPageShell } from "@/components/GlassShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/lib/api";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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

export default function VerifyOTPPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      // Redirect to forgot password if no email
      router.push("/forgot-password");
    }
  }, [searchParams, router]);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    if (digit) {
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-focus next input
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1].focus();
      }
    } else {
      // Clear current input
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pastedData[i] || "";
      }
      setOtp(newOtp);

      // Focus the last filled input or the last input
      const lastFilledIndex = Math.min(pastedData.length - 1, 5);
      if (inputRefs.current[lastFilledIndex]) {
        inputRefs.current[lastFilledIndex].focus();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const otpString = otp.join("");

    if (!email || !otpString) {
      setError("Please enter your email and OTP");
      setLoading(false);
      return;
    }

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits of the OTP");
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.verifyOTP(email, otpString);
      if (response.success) {
        setSuccess("OTP verified successfully! Redirecting...");
        // Redirect to reset password page
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        setError(response.message || "Invalid OTP. Please try again.");
        setLoading(false);
        // Clear OTP on error
        setOtp(["", "", "", "", "", ""]);
        // Focus first input
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
    } catch (err) {
      setError(err.message || "Failed to verify OTP. Please try again.");
      setLoading(false);
      // Clear OTP on error
      setOtp(["", "", "", "", "", ""]);
      // Focus first input
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  };

  return (
    <GlassPageShell>
      <GlassCard className="p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LeanLogo />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Verify OTP</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter the 6-digit OTP sent to your email
          </p>
          {email && <p className="mt-1 text-xs text-slate-500">{email}</p>}
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
            <Label className="text-xs font-bold uppercase tracking-wide text-slate-600 block text-center">
              OTP Code
            </Label>
            <div
              className="flex items-center justify-center gap-2"
              onPaste={handlePaste}
            >
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className="h-14 w-14 rounded-xl border-2 border-white/70 bg-white/70 text-center text-2xl font-bold text-slate-800 shadow-inner shadow-white/50 backdrop-blur-xl transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/80 focus:bg-white"
                />
              ))}
            </div>
            <p className="text-xs text-slate-500 text-center">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          <Button
            type="submit"
            className="group h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-px hover:shadow-2xl hover:bg-slate-800 disabled:opacity-70"
            disabled={loading || otp.join("").length !== 6}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                Verifying...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Verify OTP
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/forgot-password"
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
