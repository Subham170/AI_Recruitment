"use client";

import { GlassCard, GlassPageShell } from "@/components/GlassShell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LeanLogo = () => (
  <div className="flex items-center justify-center gap-3 text-2xl font-semibold tracking-wide text-slate-900 select-none">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/40">
      <Sparkles className="h-5 w-5 text-white" />
    </div>
    <span className="text-[#1e3a8a]">AI Recruitment</span>
  </div>
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Redirect to role-specific dashboard
      if (user.role) {
        router.push(`/dashboard/${user.role}`);
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      await login(email, password);
      // AuthContext will handle the redirect to role-specific dashboard
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
      setLoading(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <GlassPageShell>
      <GlassCard className="p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <LeanLogo />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Sign in to your workspace
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Email
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

          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-xs font-bold uppercase tracking-wide text-slate-600"
            >
              Password
            </Label>
            <div className="group relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12 rounded-2xl border border-white/70 bg-white/70 pl-11 pr-11 text-slate-800 placeholder:text-slate-500 shadow-inner shadow-white/50 backdrop-blur-xl transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/80"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-indigo-500 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? (
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
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="#"
            className="text-sm font-semibold text-slate-500 transition-colors hover:text-indigo-600"
            onClick={(e) => e.preventDefault()}
          >
            Forgot password?
          </Link>
        </div>
      </GlassCard>
    </GlassPageShell>
  );
}
