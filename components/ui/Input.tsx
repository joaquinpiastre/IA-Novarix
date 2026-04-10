import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }
>(({ className = "", label, error, id, ...props }, ref) => {
  const inputId = id ?? props.name;
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm text-[#C4B5FD]">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60
          px-3 py-2.5 text-sm text-white placeholder:text-[#7C6FAE]
          focus:border-[#7B2FF7] focus:outline-none focus:ring-1 focus:ring-[#7B2FF7]/50
          ${error ? "border-[#EF4444]" : ""}
          ${className}
        `}
        {...props}
      />
      {error ? <p className="text-xs text-[#EF4444]">{error}</p> : null}
    </div>
  );
});
Input.displayName = "Input";
