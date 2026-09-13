import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: LayoutProtegido,
});

// Modo demostración: se navega sin sesión mientras se valida la primera versión.
// La verificación de sesión y roles se reactiva al conectar el acceso real.
function LayoutProtegido() {
  return <Outlet />;
}
