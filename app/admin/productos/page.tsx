import { AdminPlaceholder } from "@/components/admin/AdminPlaceholder";

export default function AdminProductosPage() {
  return (
    <AdminPlaceholder title="Productos / Stock">
      <p className="mb-3">
        El catálogo en vivo puede llegar desde la <strong className="text-white">API GET</strong> que cada
        empresa configura en <strong className="text-white">Configuración → API de stock</strong>. Los
        agentes con <strong className="text-white">“Habilitar búsqueda de productos”</strong> consultan esa
        URL al responder.
      </p>
      <p className="mb-3">
        Además, en <strong className="text-white">Base de conocimiento</strong> el tenant puede subir un{" "}
        <strong className="text-white">Excel</strong> (se extrae el texto de las hojas y, opcionalmente, la
        IA lo normaliza como listado de productos) o <strong className="text-white">importar una URL</strong>{" "}
        pública para extraer texto, precios visibles e imágenes, también con normalización opcional por IA.
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
