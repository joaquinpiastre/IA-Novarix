export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        bg-gradient-to-br from-[#2D0A5E]/60 to-[#4A1A9E]/30
        backdrop-blur-md
        border border-[#7B2FF7]/30
        rounded-xl p-6
        shadow-[0_0_20px_rgba(123,47,247,0.15)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
