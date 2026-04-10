import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export default function AdminVectorizacionPage() {
  return (
    <AdminPlaceholder title="Vectorización">
      <p className="mb-3">
        Para RAG de gran volumen (PDFs largos, muchos documentos), se puede indexar en una base vectorial
        (Pinecone, pgvector, etc.) y recuperar chunks relevantes por consulta.
      </p>
      <p>
        Hoy el conocimiento se envía como contexto de texto (archivos + notas + catálogo API). Acá podrás
        ver jobs de indexación y estado por tenant cuando lo implementemos.
      </p>
    </AdminPlaceholder>
  );
}
