"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
    <div className="flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary-foreground blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-primary-foreground blur-3xl"></div>
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="AI Recruitment Logo"
              width={48}
              height={48}
              className="object-contain"
            />
            <span className="text-xl font-bold text-primary-foreground">
              AI Recruitment
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
            <span className="text-sm font-medium text-primary-foreground">
              AI-Powered Platform
            </span>
          </div>
          <h2 className="mb-6 text-balance text-4xl font-bold leading-tight text-primary-foreground lg:text-5xl">
            Welcome to the Future of Recruitment
          </h2>
          <p className="text-pretty text-lg leading-relaxed text-primary-foreground/90">
            AI-powered platform designed for recruiters, managers, and
            administrators to streamline hiring processes and find the perfect
            candidates faster.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 space-y-3">
            {[
              "Intelligent candidate matching",
              "Automated screening process",
              "Real-time analytics dashboard",
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20">
                  <div className="h-2 w-2 rounded-full bg-primary-foreground"></div>
                </div>
                <span className="text-sm text-primary-foreground/80">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-foreground/60">
          © 2025 AI Recruitment. All rights reserved.
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col justify-center bg-gradient-to-b from-background to-muted/20 px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <Image
              src="/Logo.png"
              alt="AI Recruitment Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="text-xl font-semibold text-foreground">
              AI Recruitment
            </span>
          </Link>

          <div className="mb-10">
            <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
              Sign in to your account
            </h1>
            <p className="text-base text-muted-foreground">
              Enter your credentials to access the platform
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-foreground"
              >
                Email address
              </Label>
              <div className="group relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 pl-10 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-foreground"
              >
                Password
              </Label>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-10 pr-10 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-primary focus:outline-none"
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
              className="group h-12 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
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

          <div className="mt-10 border-t border-border pt-6">
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              By signing in, you agree to our{" "}
              <Link
                href="/terms"
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline"
              >
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
