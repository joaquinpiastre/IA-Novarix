import { DashboardHeader } from "./DashboardHeader";

export function PageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <DashboardHeader title={title} />
      <div className="mt-8">{children}</div>
    </>
  );
}
