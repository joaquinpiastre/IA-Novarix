import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-conversaciones",
  display: "swap",
});

export default function ConversacionesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${plusJakarta.variable} -mx-3 -mt-3 mb-4 min-h-0 font-sans sm:-mx-4 sm:-mt-4 md:-mx-8 md:-mt-8 md:mb-8`}
      style={{ fontFamily: "var(--font-conversaciones), ui-sans-serif, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
