"use client";

import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Code,
  Copy,
  FileText,
  Info,
  Server,
  User,
  X,
} from "lucide-react";
import { useState } from "react";

// Improved color structure with better contrast and modern design
const variantStyles = {
  error: {
    container: "border-l-4 border-red-500 bg-white shadow-xl shadow-red-500/10",
    iconBg: "bg-red-500",
    icon: "text-white",
    title: "text-gray-900",
    message: "text-gray-700",
    badge: "bg-red-100 text-red-700 border border-red-200",
    mainErrorBg: "bg-red-600 border border-red-500",
    mainErrorText: "text-white",
    dialogHeader: "bg-red-500 text-white",
    IconComponent: AlertCircle,
  },
  warning: {
    container:
      "border-l-4 border-amber-500 bg-white shadow-xl shadow-amber-500/10",
    iconBg: "bg-amber-500",
    icon: "text-white",
    title: "text-gray-900",
    message: "text-gray-700",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    mainErrorBg: "bg-amber-600 border border-amber-500",
    mainErrorText: "text-white",
    dialogHeader: "bg-amber-500 text-white",
    IconComponent: AlertTriangle,
  },
  success: {
    container:
      "border-l-4 border-emerald-500 bg-white shadow-xl shadow-emerald-500/10",
    iconBg: "bg-emerald-500",
    icon: "text-white",
    title: "text-gray-900",
    message: "text-gray-700",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    mainErrorBg: "bg-emerald-600 border border-emerald-500",
    mainErrorText: "text-white",
    dialogHeader: "bg-emerald-500 text-white",
    IconComponent: CheckCircle2,
  },
  info: {
    container:
      "border-l-4 border-blue-500 bg-white shadow-xl shadow-blue-500/10",
    iconBg: "bg-blue-500",
    icon: "text-white",
    title: "text-gray-900",
    message: "text-gray-700",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    mainErrorBg: "bg-blue-600 border border-blue-500",
    mainErrorText: "text-white",
    dialogHeader: "bg-blue-500 text-white",
    IconComponent: Info,
  },
};

// Extract main error from details array
function extractMainError(details) {
  if (!Array.isArray(details) || details.length === 0) return null;

  // Count error occurrences
  const errorCounts = {};
  details.forEach((detail) => {
    if (typeof detail === "string") {
      const errorMatch = detail.match(/^[^:]+:\s*(.+)$/);
      if (errorMatch) {
        const errorMsg = errorMatch[1].trim();
        errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
      }
    } else if (detail?.error) {
      // Handle structured error objects
      const errorMsg = detail.error;
      errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
    } else if (detail?.string) {
      // Handle objects with string property
      const errorMatch = detail.string.match(/^[^:]+:\s*(.+)$/);
      if (errorMatch) {
        const errorMsg = errorMatch[1].trim();
        errorCounts[errorMsg] = (errorCounts[errorMsg] || 0) + 1;
      }
    }
  });

  // Find the most common error
  const sortedErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]);
  if (sortedErrors.length > 0) {
    return {
      message: sortedErrors[0][0],
      count: sortedErrors[0][1],
      total: details.length,
    };
  }

  return null;
}

export function Notification({
  variant = "error",
  title,
  message,
  details,
  mainError,
  onDismiss,
  dismissible = true,
  className,
}) {
  const [copied, setCopied] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const styles = variantStyles[variant] || variantStyles.error;
  const Icon = styles.IconComponent;

  const hasDetails =
    details &&
    (Array.isArray(details)
      ? details.length > 0
      : Object.keys(details).length > 0);

  // Extract main error if not provided
  const extractedMainError =
    mainError ||
    (hasDetails && Array.isArray(details) ? extractMainError(details) : null);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <>
      <div
        className={cn(
          "relative transition-all duration-300 animate-in slide-in-from-top-2 rounded-lg w-full",
          styles.container,
          className
        )}
        role="alert"
      >
        <div className="flex items-start gap-4 p-5 w-full">
          {/* Icon */}
          <div
            className={cn(
              "shrink-0 w-12 h-12 rounded-lg flex items-center justify-center shadow-sm",
              styles.iconBg
            )}
          >
            <Icon className={cn("h-6 w-6", styles.icon)} />
          </div>

          {/* Content - Full Width Layout */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 w-full">
            {/* Header Row - Full Width */}
            <div className="flex items-start justify-between gap-4 w-full">
              <div className="flex-1 min-w-0">
                {title && (
                  <AlertTitle
                    className={cn(
                      "text-lg font-bold leading-tight mb-2",
                      styles.title
                    )}
                  >
                    {title}
                  </AlertTitle>
                )}
                <AlertDescription
                  className={cn("text-sm leading-relaxed", styles.message)}
                >
                  {message}
                </AlertDescription>
              </div>
              {dismissible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                  className="h-8 w-8 p-0 shrink-0 hover:bg-gray-100 rounded-lg opacity-70 hover:opacity-100 transition-opacity text-gray-600"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Main Error Display - Full Width with Better Layout */}
            {extractedMainError && (
              <div
                className={cn(
                  "p-4 rounded-lg border w-full",
                  styles.mainErrorBg
                )}
              >
                <div className="flex items-start justify-between gap-4 w-full">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className="text-xs font-semibold px-3 py-1 rounded-md bg-white/20 text-white border border-white/30">
                        Main Issue
                      </span>
                      {extractedMainError.count > 1 && (
                        <span className="text-sm font-medium text-white opacity-90 whitespace-nowrap">
                          ({extractedMainError.count} of{" "}
                          {extractedMainError.total} failures)
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-base font-medium leading-relaxed wrap-break-word",
                        styles.mainErrorText
                      )}
                    >
                      {extractedMainError.message}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(extractedMainError.message)}
                    className="h-8 w-8 p-0 shrink-0 hover:bg-white/20 rounded-lg text-white"
                    title="Copy error message"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* View Details Button - Full Width */}
            {hasDetails && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-center gap-2 font-medium",
                      variant === "error" && "border-red-200 hover:bg-red-50",
                      variant === "warning" &&
                        "border-amber-200 hover:bg-amber-50",
                      variant === "success" &&
                        "border-emerald-200 hover:bg-emerald-50",
                      variant === "info" && "border-blue-200 hover:bg-blue-50"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    View All Details (
                    {Array.isArray(details)
                      ? details.length
                      : Object.keys(details).length}
                    )
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
                  <DialogHeader
                    className={cn(
                      "px-6 py-5 rounded-t-lg shrink-0",
                      styles.dialogHeader
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {title} - Detailed Information
                        </DialogTitle>
                        <DialogDescription className="text-white/90 mt-2">
                          {Array.isArray(details)
                            ? `${details.length} ${
                                details.length === 1 ? "item" : "items"
                              } with detailed information`
                            : "Error details and technical information"}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <ScrollArea className="flex-1 min-h-0 px-6 py-5 overflow-y-auto">
                    <div className="space-y-4">
                      {Array.isArray(details) ? (
                        details.map((detail, idx) => {
                          const isString = typeof detail === "string";
                          let candidateName,
                            errorMsg,
                            errorCode,
                            httpStatus,
                            technicalDetails;

                          if (isString) {
                            const parts = detail.split(":");
                            candidateName = parts[0] || "Unknown";
                            errorMsg =
                              parts.slice(1).join(":").trim() ||
                              "Unknown error";
                          } else {
                            candidateName = detail.name || "Unknown Candidate";
                            errorMsg =
                              detail.error || detail.message || "Unknown error";
                            errorCode = detail.errorCode;
                            httpStatus = detail.httpStatus;
                            technicalDetails = detail.details;
                          }

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                    styles.iconBg
                                  )}
                                >
                                  <User
                                    className={cn("h-5 w-5", styles.icon)}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-bold text-gray-900 dark:text-gray-50 text-base">
                                      {candidateName}
                                    </h4>
                                    {errorCode && (
                                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <Code className="inline h-3 w-3 mr-1" />
                                        {errorCode}
                                      </span>
                                    )}
                                    {httpStatus && (
                                      <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        <Server className="inline h-3 w-3 mr-1" />
                                        HTTP {httpStatus}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                                    {errorMsg}
                                  </p>
                                  {technicalDetails &&
                                    typeof technicalDetails === "object" &&
                                    Object.keys(technicalDetails).length >
                                      0 && (
                                      <details className="mt-3">
                                        <summary className="cursor-pointer text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors flex items-center gap-1">
                                          <Code className="h-3 w-3" />
                                          Technical Details
                                        </summary>
                                        <div className="mt-2 p-3 bg-gray-900 dark:bg-gray-950 rounded border border-gray-700">
                                          <pre className="text-xs text-gray-300 overflow-x-auto">
                                            {JSON.stringify(
                                              technicalDetails,
                                              null,
                                              2
                                            )}
                                          </pre>
                                        </div>
                                      </details>
                                    )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="space-y-3">
                          {Object.entries(details).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700"
                            >
                              <span className="font-semibold min-w-[140px] text-gray-700 dark:text-gray-300">
                                {key}:
                              </span>
                              <span className="flex-1 wrap-break-word text-gray-600 dark:text-gray-400">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
