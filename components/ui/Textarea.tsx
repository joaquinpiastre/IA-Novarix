import { forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }
>(({ className = "", label, error, id, ...props }, ref) => {
  const tid = id ?? props.name;
  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={tid} className="block text-sm text-[#C4B5FD]">
          {label}
        </label>
      ) : null}
      <textarea
        ref={ref}
        id={tid}
        className={`
          w-full min-h-[140px] rounded-input border border-[#7B2FF7]/30 bg-[#0A0118]/60
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
Textarea.displayName = "Textarea";
