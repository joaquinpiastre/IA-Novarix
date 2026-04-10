import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export default function AdminMcpPage() {
  return (
    <AdminPlaceholder title="Servidores MCP">
      <p className="mb-3">
        El <strong className="text-white">Model Context Protocol</strong> permite conectar herramientas
        externas (bases de datos, APIs, filesystem) a modelos compatibles.
      </p>
      <p>
        Esta sección está preparada para cuando integres MCP en Novarix: registro de endpoints, scopes por
        tenant y asignación a bots. Hoy el flujo principal es WhatsApp + conocimiento + API de stock.
      </p>
    </AdminPlaceholder>
  );
}
