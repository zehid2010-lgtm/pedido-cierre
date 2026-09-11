import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Boxes, ClipboardList, Upload, Users, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/panel", label: "Panel", icon: BarChart3, soloAdmin: false },
  { to: "/clientes", label: "Clientes", icon: Users, soloAdmin: false },
  { to: "/pendientes", label: "Pendientes", icon: ClipboardList, soloAdmin: false },
  { to: "/equivalencias", label: "Packs", icon: Boxes, soloAdmin: false },
  { to: "/importar", label: "Importar", icon: Upload, soloAdmin: true },
] as const;

export function AppShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  const { nombre, rol, esAdmin, cerrarSesion } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((i) => !i.soloAdmin || esAdmin);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="brand-gradient sticky top-0 z-30 text-primary-foreground shadow-raised">
        <div className="mx-auto max-w-5xl px-4 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                Pedido Sugerido · Desarrollo Tucumán
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold uppercase">{titulo}</h1>
              {subtitulo ? <p className="mt-0.5 text-sm opacity-80">{subtitulo}</p> : null}
            </div>
            <button
              onClick={cerrarSesion}
              className="shrink-0 rounded-lg bg-white/10 p-2 transition-colors hover:bg-white/20"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs opacity-85">
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">{nombre || "Usuario"}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium capitalize">
              {rol ?? "…"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl">
          {items.map((item) => {
            const activo = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icono = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  activo ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-colors",
                    activo ? "bg-primary/10" : "bg-transparent",
                  )}
                >
                  <Icono className="size-5" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
