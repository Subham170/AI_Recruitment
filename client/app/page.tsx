"use client";

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header>
        <div className="mx-auto flex max-w-7xl items-center justify-end px-6 py-4">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-secondary-foreground">
              AI-Powered Recruitment
            </span>
          </div>
          <h1 className="mb-6 max-w-4xl text-balance text-5xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Transform Your Hiring Process with AI
          </h1>
          <p className="mb-10 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Empower your recruitment team with intelligent automation.
            Streamline candidate sourcing, screening, and management for
            recruiters, managers, and administrators.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild className="text-base">
              <Link href="/login">Get Started</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base bg-transparent"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="border-t border-border bg-muted/30 py-20"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Built for Modern Recruitment Teams
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
              Comprehensive tools designed for every role in your recruitment
              workflow
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                For Recruiters
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered candidate matching, automated screening, and
                intelligent recommendations to find the perfect fit faster.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                For Managers
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-time pipeline visibility, team performance insights, and
                data-driven decision making to optimize hiring outcomes.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                For Administrators
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Comprehensive analytics, system configuration, and user
                management with enterprise-grade security and compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Why Choose Our Platform?
            </h2>
            <p className="mb-8 text-pretty text-lg leading-relaxed text-muted-foreground">
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
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-border bg-primary py-20 text-primary-foreground">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Ready to Transform Your Recruitment?
          </h2>
          <p className="mb-8 text-pretty text-lg leading-relaxed opacity-90">
            Join leading organizations using AI to build better teams, faster.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base">
            <Link href="/login">Access Platform</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Image
                  src="/Logo.png"
                  alt="AI Recruitment Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                />
                <span className="font-semibold text-foreground">
                  AI Recruitment
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered recruitment platform for modern teams
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Product
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
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
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
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
              <h4 className="mb-4 text-sm font-semibold text-foreground">
                Legal
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
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
          <div className="mt-12 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            © 2025 AI Recruitment. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
