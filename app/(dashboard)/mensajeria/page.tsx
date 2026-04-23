import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { MensajeriaApp } from "@/components/mensajeria/MensajeriaApp";

export const dynamic = "force-dynamic";

export default async function MensajeriaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return <MensajeriaApp />;
}
