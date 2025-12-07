"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Search,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

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
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Subtle radial gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(6, 182, 212, 0.08), transparent 70%)",
          }}
        ></div>
        <div
          className="absolute bottom-0 left-0 w-1/2 h-1/2"
          style={{
            background:
              "radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 70%)",
          }}
        ></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-400/15 to-blue-500/15 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/15 to-cyan-400/15 rounded-full blur-3xl animate-pulse-delay-500"></div>

        {/* Floating Icons */}
        <div className="absolute top-20 left-10 animate-float-slow opacity-30">
          <div className="bg-cyan-400/20 backdrop-blur-sm rounded-full p-3 border border-cyan-400/30">
            <Users className="w-5 h-5 text-cyan-500" />
          </div>
        </div>
        <div className="absolute top-40 right-20 animate-float-medium opacity-30">
          <div className="bg-blue-500/20 backdrop-blur-sm rounded-full p-3 border border-blue-500/30">
            <Search className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="absolute bottom-32 right-10 animate-float-slow-delay opacity-30">
          <div className="bg-teal-400/20 backdrop-blur-sm rounded-full p-3 border border-teal-400/30">
            <CheckCircle className="w-5 h-5 text-teal-500" />
          </div>
        </div>
        <div className="absolute bottom-20 left-20 animate-float-medium-delay opacity-30">
          <div className="bg-cyan-400/20 backdrop-blur-sm rounded-full p-3 border border-cyan-400/30">
            <Zap className="w-5 h-5 text-cyan-500" />
          </div>
        </div>

        {/* Particles */}
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 bg-cyan-400/40 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${8 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="rounded-full overflow-hidden">
              <Image
                src="/Logo.png"
                alt="AI Recruitment Logo"
                width={64}
                height={64}
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            AI Recruitment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Sign in to access your account
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl shadow-2xl p-8 border border-gray-200/50 dark:border-slate-700/50 hover:shadow-cyan-500/10 transition-all duration-300">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="h-11 pl-10 border-gray-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-cyan-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 pl-10 pr-10 border-gray-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyan-500 focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300"
              size="lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Don't have an account?{" "}
            <a
              href="#"
              className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
            >
              Contact administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
