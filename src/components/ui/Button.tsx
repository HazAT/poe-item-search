import { forwardRef, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-poe-gray hover:bg-poe-gray-alt text-poe-beige border border-poe-gray-alt",
  primary: "bg-poe-blue hover:bg-poe-blue-alt text-poe-white border border-poe-blue-alt",
  secondary: "bg-poe-gold/30 hover:bg-poe-gold/40 text-poe-gold font-semibold border border-poe-gold",
  danger: "bg-poe-red hover:bg-poe-red-alt text-poe-white border border-poe-red-alt",
  ghost: "bg-transparent hover:bg-poe-gray text-poe-beige border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "md", className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          font-body rounded transition-colors
          focus:outline-none focus:ring-2 focus:ring-poe-gold focus:ring-offset-1 focus:ring-offset-poe-black
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
