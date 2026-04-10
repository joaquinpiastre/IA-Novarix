import { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const base =
  "inline-flex items-center justify-center font-semibold rounded-input transition-all focus:outline-none focus:ring-2 focus:ring-[#7B2FF7]/50 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-br from-[#7B2FF7] to-[#A855F7] text-white shadow-[0_0_20px_rgba(123,47,247,0.25)] hover:opacity-95",
  secondary:
    "border border-[#7B2FF7]/50 bg-transparent text-[#C4B5FD] hover:bg-[#2D0A5E]/80",
  ghost: "bg-transparent text-[#A855F7] hover:bg-[#2D0A5E]/50",
  danger: "bg-[#EF4444] text-white hover:bg-[#dc2626]",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "text-sm px-3 py-1.5",
  md: "text-sm px-4 py-2.5",
  lg: "text-base px-6 py-3",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";
