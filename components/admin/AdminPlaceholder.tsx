import { Card } from "@/components/ui/Card";

export function AdminPlaceholder({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-white">{title}</h1>
      <Card className="text-sm leading-relaxed text-[#C4B5FD]">{children}</Card>
    </div>
  );
}
