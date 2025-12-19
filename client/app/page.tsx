"use client";

import { GlassBackground } from "@/components/GlassShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, CheckCircle2, Sparkles, Target, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef2f7]">
      <GlassBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <Image
              src="/LEAN_IT_LOGO.png"
              alt="LEAN IT Logo"
              width={200}
              height={60}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <Button asChild className="shadow-sm shadow-slate-400/30">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-1.5 backdrop-blur-xl shadow-sm shadow-slate-400/20">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-slate-700">
              AI-Powered Recruitment
            </span>
          </div>
          <h1 className="mb-6 max-w-4xl text-balance text-5xl font-bold tracking-tight text-slate-900 md:text-6xl lg:text-7xl">
            Transform Your Hiring Process with AI
          </h1>
          <p className="mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-slate-600 md:text-xl">
            Empower your recruitment team with intelligent automation.
            Streamline candidate sourcing, screening, and management for
            recruiters, managers, and administrators.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button
              size="lg"
              asChild
              className="text-base shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-px transition-all"
            >
              <Link href="/login">Get Started</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base bg-white/60 backdrop-blur-xl border-white/70 text-slate-800 hover:bg-white"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative z-10 border-t border-white/40 bg-white/40 py-20 backdrop-blur-2xl"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Built for Modern Recruitment Teams
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg text-slate-600">
              Comprehensive tools designed for every role in your recruitment
              workflow
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-8 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                For Recruiters
              </h3>
              <p className="text-slate-600 leading-relaxed">
                AI-powered candidate matching, automated screening, and
                intelligent recommendations to find the perfect fit faster.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-8 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
                <Target className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                For Managers
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Real-time pipeline visibility, team performance insights, and
                data-driven decision making to optimize hiring outcomes.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/70 p-8 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-slate-900">
                For Administrators
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Comprehensive analytics, system configuration, and user
                management with enterprise-grade security and compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="relative z-10 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Why Choose Our Platform?
            </h2>
            <p className="mb-8 text-pretty text-lg leading-relaxed text-slate-600">
              Experience the future of recruitment with AI-driven insights and
              automation that saves time and improves hiring quality.
            </p>
            <ul className="space-y-4">
              {[
                "Reduce time-to-hire by up to 60%",
                "Improve candidate quality with AI matching",
                "Streamline collaboration across teams",
                "Access real-time analytics and reporting",
                "Ensure compliance and data security",
              ].map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-indigo-600" />
                  <span className="text-slate-800">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 border-y border-white/40 bg-linear-to-r from-indigo-600 via-sky-500 to-violet-500 py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Transform Your Recruitment?
          </h2>
          <p className="mb-8 text-pretty text-lg leading-relaxed opacity-90">
            Join leading organizations using AI to build better teams, faster.
          </p>
          <Button
            size="lg"
            variant="secondary"
            asChild
            className="text-base shadow-lg shadow-slate-900/30"
          >
            <Link href="/login">Access Platform</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/40 bg-white/70 py-12 backdrop-blur-2xl">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Image
                  src="/LEAN_IT_LOGO.png"
                  alt="LEAN IT Logo"
                  width={160}
                  height={48}
                  className="h-12 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-slate-600">
                AI-powered recruitment platform for modern teams
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-slate-900">
                Product
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-slate-900">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Careers
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-slate-900">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-slate-600">
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    Compliance
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/40 pt-8 text-center text-sm text-slate-500">
            © 2025 LEAN IT. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
