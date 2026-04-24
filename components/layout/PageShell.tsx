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
      <div className="mt-2 sm:mt-3 md:mt-8">{children}</div>
    </>
  );
}
