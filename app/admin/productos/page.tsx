import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export default function AdminProductosPage() {
  return (
    <AdminPlaceholder title="Productos / Stock">
      <p className="mb-3">
        El catálogo en vivo llega desde la <strong className="text-white">API GET</strong> que cada empresa
        configura en <strong className="text-white">Configuración → API de stock</strong>. Los agentes con{" "}
        <strong className="text-white">“Habilitar búsqueda de productos”</strong> consultan esa URL al
        responder.
      </p>
      <p className="mb-3">
        Para un catálogo persistido en base de datos (CRUD de productos en Novarix), se puede extender el
        modelo en una siguiente iteración.
      </p>
      <p>
        Resumen por tenant: menú <strong className="text-white">Integraciones</strong>.
      </p>
    </AdminPlaceholder>
  );
}
