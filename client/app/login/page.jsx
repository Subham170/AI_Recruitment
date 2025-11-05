"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  Check,
  GraduationCap,
  Lock,
  Mail,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("candidate");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    login(email, password, role);
  };

  const roles = [
    {
      value: "candidate",
      label: "CANDIDATE",
      icon: GraduationCap,
    },
    {
      value: "recruiter",
      label: "RECRUITER",
      icon: Users,
    },
    {
      value: "admin",
      label: "ADMIN",
      icon: UserCheck,
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Green Informational Section */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-green-600 to-green-700">
        {/* Background Image Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80')",
          }}
        />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          {/* Top Logo/Branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">AI Recruitment</h2>
              <p className="text-sm text-green-100">Recruitment A+ Platform</p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-5xl font-bold mb-6 leading-tight">
              Find Your Perfect Match
            </h1>
            <p className="text-lg text-green-100 leading-relaxed max-w-md">
              Connect with top talent and opportunities. Streamline your
              recruitment process with AI-powered matching and intelligent
              candidate management.
            </p>
          </div>

          {/* Footer */}
          <div className="text-sm text-green-200">
            <p className="uppercase tracking-wide">
              AMERICA • AFRICA • ASIA • AUSTRALASIA
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Title */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Sign In
            </h2>
            <div className="w-16 h-1 bg-green-600 rounded-full"></div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Please select your role
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {roles.map((roleOption) => {
                  const Icon = roleOption.icon;
                  const isSelected = role === roleOption.value;
                  return (
                    <button
                      key={roleOption.value}
                      type="button"
                      onClick={() => setRole(roleOption.value)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
                        "hover:shadow-md cursor-pointer",
                        isSelected
                          ? "border-green-600 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      )}
                    >
                      <Icon className="w-6 h-6 mb-2" />
                      <span className="text-xs font-semibold">
                        {roleOption.label}
                      </span>
                      {isSelected && (
                        <Check className="absolute bottom-2 w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                EMAIL
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Type your Email"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                PASSWORD
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type your password"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-base"
              size="lg"
            >
              Login
            </Button>

            {/* Forgot Password */}
            <div className="text-center">
              <Link
                href="#"
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition"
              >
                Forgot your password?
              </Link>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="text-green-600 dark:text-green-400 hover:underline font-semibold"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
