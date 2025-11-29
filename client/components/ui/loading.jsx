"use client";

import { Loader2 } from "lucide-react";

/**
 * Loading component with spinner animation
 * @param {Object} props
 * @param {string} [props.message] - Optional loading message
 * @param {string} [props.size] - Size of the spinner (sm, md, lg)
 */
export default function Loading({ message = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <Loader2
        className={`${sizeClasses[size]} animate-spin text-primary`}
        aria-hidden="true"
      />
      <p
        className={`${textSizeClasses[size]} text-muted-foreground font-medium`}
      >
        {message}
      </p>
    </div>
  );
}
