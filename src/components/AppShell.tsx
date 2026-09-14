import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LogOut,
  Upload,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { useAuth } from "@/lib/auth";
import { traerCruce } from "@/lib/datos";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/panel", label: "Inicio", icon: BarChart3, soloAdmin: false },
  { to: "/clientes", label: "Clientes", icon: Users, soloAdmin: false },
  { to: "/pendientes", label: "Pendientes", icon: ClipboardList, soloAdmin: false },
  { to: "/equivalencias", label: "Cajas", icon: Boxes, soloAdmin: false },
  { to: "/importar", label: "Importar", icon: Upload, soloAdmin: true },
] as const;

type ReferenciaSemana = {
  periodo: string;
  semana: string;
  desde: string;
  hasta: string;
};

function referenciaSemana(fechaIso?: string | null): ReferenciaSemana | null {
  if (!fechaIso) return null;

  const ymd = fechaIso.slice(0, 10);
  const partes = ymd.split("-").map(Number);

  if (partes.length !== 3 || partes.some((n) => !Number.isFinite(n))) {
    return null;
  }

  const [anio, mes, diaMes] = partes as [number, number, number];
  const fecha = new Date(Date.UTC(anio, mes - 1, diaMes));
  const diaSemana = fecha.getUTCDay() || 7;

  const lunes = new Date(fecha);
  lunes.setUTCDate(fecha.getUTCDate() - (diaSemana - 1));

  const domingo = new Date(lunes);
  domingo.setUTCDate(lunes.getUTCDate() + 6);

  const jueves = new Date(fecha);
  jueves.setUTCDate(fecha.getUTCDate() + (4 - diaSemana));

  const anioSemana = jueves.getUTCFullYear();
  const inicioAnio = new Date(Date.UTC(anioSemana, 0, 1));
  const numeroSemana = Math.ceil(
    (((jueves.getTime() - inicioAnio.getTime()) / 86400000) + 1) / 7,
  );

  const fmt = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });

  return {
    periodo: `${anio}${String(mes).padStart(2, "0")}`,
    semana: `${anioSemana}${String(numeroSemana).padStart(2, "0")}`,
    desde: fmt.format(lunes),
    hasta: fmt.format(domingo),
  };
}

export function AppShell({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string | undefined;
  children: ReactNode;
}) {
  const { nombre, rol, esAdmin, cerrarSesion } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((i) => !i.soloAdmin || esAdmin);

  const { data } = useQuery({
    queryKey: ["cruce"],
    queryFn: traerCruce,
  });

  const referencia = referenciaSemana(data?.importacion.created_at);
  const ultimaActualizacion = data?.importacion.created_at
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.importacion.created_at))
    : "—";

  const iniciales = (nombre || "RM")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef4f8] text-[#102235]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[208px] shrink-0 bg-gradient-to-b from-[#0c4d79] to-[#073b63] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#228ff0] shadow-lg">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <p className="text-[15px] font-black leading-tight">Pedido</p>
              <p className="text-[15px] font-black leading-tight">Sugerido</p>
              <p className="mt-1 text-[10px] text-white/65">Desarrollo Tucumán</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1.5 px-2">
            {items.map((item) => {
              const activo =
                pathname === item.to || pathname.startsWith(item.to + "/");
              const Icono = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors",
                    activo
                      ? "bg-[#1d7fe5] text-white shadow-lg"
                      : "text-white/85 hover:bg-white/10",
                  )}
                >
                  <Icono className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto px-4 pb-6">
            <div className="mb-2 flex items-end gap-1">
              <span className="h-2 w-7 bg-[#249deb]" />
              <span className="h-3 w-7 bg-[#249deb]" />
              <span className="h-5 w-8 bg-[#249deb]" />
              <span className="h-7 w-9 bg-[#249deb]" />
            </div>
            <p className="text-xs font-bold">Gestión comercial</p>
            <p className="text-[10px] text-white/65">en movimiento</p>
            <p className="mt-3 text-[10px] text-white/45">v6.6</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="bg-gradient-to-r from-[#075184] via-[#08769f] to-[#08a1ce] px-4 py-4 text-white shadow-sm sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/78">
                  Pedido Sugerido · Desarrollo Tucumán
                </p>
                <h1 className="mt-1 truncate text-3xl font-black leading-none">
                  {titulo}
                </h1>
                {subtitulo ? (
                  <p className="mt-2 text-sm text-white/90">{subtitulo}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl bg-[#075d89]/70 px-4 py-2.5 sm:block">
                  <p className="text-[9px] font-semibold text-white/65">
                    Última actualización
                  </p>
                  <p className="text-xs font-black">{ultimaActualizacion}</p>
                </div>

                <div className="flex size-10 items-center justify-center rounded-full bg-[#3488ea] text-sm font-black">
                  {iniciales}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-black">{nombre || "Usuario"}</p>
                  <p className="text-[10px] text-white/75 capitalize">
                    {rol ?? ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void cerrarSesion()}
                  className="flex size-11 items-center justify-center rounded-xl bg-white/15 transition hover:bg-white/25"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            </div>

            {referencia ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold lg:hidden">
                <span className="rounded-full bg-white/15 px-2.5 py-1">
                  Período {referencia.periodo}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">
                  Semana {referencia.semana}
                </span>
                <span className="rounded-full bg-white/15 px-2.5 py-1">
                  {referencia.desde} al {referencia.hasta}
                </span>
              </div>
            ) : null}
          </header>

          <main className="min-w-0 p-3 pb-24 sm:p-4 lg:p-5 lg:pb-5">
            {children}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-5xl">
          {items.map((item) => {
            const activo =
              pathname === item.to || pathname.startsWith(item.to + "/");
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
