import { redirect } from "next/navigation";

export default function ConversacionDetalleRedirect({ params }: { params: { id: string } }) {
  redirect(`/conversaciones?c=${params.id}`);
}
