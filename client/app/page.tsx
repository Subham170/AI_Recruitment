"use client";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  CheckCircle,
  LogIn,
  Play,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = () => {
    router.push("/login");
  };

  if (loading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0e27] text-white overflow-hidden relative">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* AI Recruitment Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Recruitment Icons */}
        <div className="absolute top-20 left-10 animate-float-slow">
          <div className="bg-cyan-400/10 backdrop-blur-sm rounded-full p-4 border border-cyan-400/20">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
        <div className="absolute top-40 right-20 animate-float-medium">
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-full p-4 border border-blue-500/20">
            <Search className="w-6 h-6 text-blue-400" />
          </div>
        </div>
        <div className="absolute bottom-32 left-1/4 animate-float-slow-delay">
          <div className="bg-teal-400/10 backdrop-blur-sm rounded-full p-4 border border-teal-400/20">
            <CheckCircle className="w-6 h-6 text-teal-400" />
          </div>
        </div>
        <div className="absolute top-1/3 right-1/3 animate-float-medium-delay">
          <div className="bg-cyan-400/10 backdrop-blur-sm rounded-full p-4 border border-cyan-400/20">
            <Zap className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
        <div className="absolute bottom-20 right-10 animate-float-slow">
          <div className="bg-blue-500/10 backdrop-blur-sm rounded-full p-4 border border-blue-500/20">
            <Sparkles className="w-6 h-6 text-blue-400" />
          </div>
        </div>

        {/* Animated Connection Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          <defs>
            <linearGradient
              id="lineGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <line
            x1="10%"
            y1="20%"
            x2="30%"
            y2="40%"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line"
          />
          <line
            x1="70%"
            y1="30%"
            x2="90%"
            y2="50%"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line-delay"
          />
          <line
            x1="25%"
            y1="60%"
            x2="45%"
            y2="80%"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            className="animate-draw-line-delay-2"
          />
        </svg>

        {/* Floating Particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400/30 rounded-full animate-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="rounded-full overflow-hidden">
            <Image
              src="/Logo.png"
              alt="AI Recruitment Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <span className="text-xl font-bold">AI RECRUITMENT</span>
        </div>

        {/* Login Button */}
        <Button
          onClick={handleLogin}
          variant="outline"
          className="group relative border-cyan-400/50 text-white hover:bg-cyan-400/10 hover:border-cyan-400 rounded-lg px-6 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-400/25 overflow-hidden"
        >
          {/* Animated background gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 via-cyan-400/10 to-cyan-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>

          {/* Button content */}
          <span className="relative flex items-center">
            <LogIn className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:translate-x-1" />
            <span className="relative">Login</span>
          </span>

          {/* Glow effect */}
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 bg-cyan-400/20 blur-xl transition-opacity duration-300 -z-10"></div>
        </Button>
      </header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-120px)]">
          {/* Left Side - Text Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-white">Streamline Your</span>
                <br />
                <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Recruitment Process
                </span>
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed max-w-lg">
                Our AI-powered recruitment system will streamline your hiring
                process & automatically match candidates to job postings across
                multiple platforms.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleLogin}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white border-0 rounded-lg px-8 py-6 text-lg font-semibold shadow-lg shadow-cyan-500/25"
              >
                Get Started
              </Button>
              <Button
                variant="ghost"
                className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-400/10 rounded-lg px-8 py-6 text-lg font-semibold"
              >
                <Play className="w-5 h-5 mr-2 fill-cyan-400" />
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Right Side - Visual Graphic */}
          <div className="relative h-[600px] lg:h-[700px] flex items-center justify-center">
            {/* Abstract 3D Graphic */}
            <div className="relative w-full h-full">
              {/* Base gradient blob */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-96 h-96">
                  {/* Animated gradient orbs */}
                  <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-cyan-400/30 rounded-full blur-3xl animate-pulse-delay-1000"></div>
                  <div className="absolute top-1/2 left-0 w-72 h-72 bg-gradient-to-br from-teal-400/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse-delay-500"></div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="absolute top-10 left-0 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">
                    Job Postings
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">129 Active</p>
                </div>
              </div>

              <div className="absolute top-1/3 right-0 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">
                    Applications
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">
                    129 Matched
                  </p>
                </div>
              </div>

              <div className="absolute bottom-20 right-1/4 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-gray-300">
                    Candidates
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">
                    129 Processed
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
