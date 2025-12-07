"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

export default function ComingSoon({ title, description, icon: Icon }) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <Card className="max-w-md w-full border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardContent className="pt-12 pb-8 text-center">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full blur-xl"></div>
              <div className="relative p-4 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-300/30 dark:border-cyan-600/30">
                {Icon ? (
                  <Icon className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <Clock className="h-12 w-12 text-cyan-600 dark:text-cyan-400" />
                )}
              </div>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">
            {title || "Coming Soon"}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {description ||
              "This feature is currently under development. We're working hard to bring it to you soon!"}
          </p>
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-200 hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
