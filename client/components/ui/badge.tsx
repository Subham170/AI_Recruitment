import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const badgeIconVariants = cva(
  "flex items-center justify-center rounded-full h-4 w-4 flex-shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary",
        secondary: "bg-secondary/20 text-secondary-foreground",
        destructive: "bg-destructive/20 text-destructive",
        outline: "bg-foreground/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showIconContainer?: boolean;
}

// Memoized helper to check if element is an icon
const isIconElement = (element: React.ReactNode): boolean => {
  return (
    React.isValidElement(element) &&
    typeof element.type !== "string" &&
    typeof element.type !== "number"
  );
};

const Badge = React.memo(
  ({
    className,
    variant,
    children,
    showIconContainer = true,
    ...props
  }: BadgeProps) => {
    // Check if first child is an icon (React element)
    const childrenArray = React.Children.toArray(children);
    const firstChild = childrenArray[0];
    const isIcon = isIconElement(firstChild);

    if (isIcon && showIconContainer) {
      const icon = firstChild as React.ReactElement<{ className?: string }>;
      const restChildren = childrenArray.slice(1);

      return (
        <div
          className={cn(badgeVariants({ variant }), className)}
          role="status"
          {...props}
        >
          <span
            className={cn(badgeIconVariants({ variant }))}
            aria-hidden="true"
          >
            {React.cloneElement(icon, {
              className: cn("h-2.5 w-2.5", icon.props.className),
            })}
          </span>
          {restChildren.length > 0 && <span>{restChildren}</span>}
        </div>
      );
    }

    return (
      <div
        className={cn(badgeVariants({ variant }), className)}
        role="status"
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, badgeIconVariants, badgeVariants };
