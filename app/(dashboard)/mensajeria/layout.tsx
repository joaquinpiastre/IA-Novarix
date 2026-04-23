import { Plus_Jakarta_Sans } from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-mensajeria",
  display: "swap",
});

export default function MensajeriaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${plusJakarta.variable} -mx-8 -mt-8 mb-8 min-h-0 font-sans`}
      style={{ fontFamily: "var(--font-mensajeria), ui-sans-serif, system-ui, sans-serif" }}
    >
      {children}
    </div>
  );
}
