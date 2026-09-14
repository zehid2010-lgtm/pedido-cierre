import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock3,
  LogOut,
  Sparkles,
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
    <div className="app-shell-bg min-h-screen overflow-x-hidden text-white">
      <div className="relative z-10 flex min-h-screen gap-0 lg:p-3">
        <aside className="glass-sidebar hidden w-[235px] shrink-0 overflow-hidden rounded-[22px] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-[#78ddff]/25 bg-gradient-to-br from-[#2e9cff] to-[#0f6bd8] shadow-[0_0_28px_rgba(36,157,255,.35)]">
              <BarChart3 className="size-7" />
            </div>
            <div>
              <p className="text-[16px] font-black leading-tight">Pedido</p>
              <p className="text-[16px] font-black leading-tight">Sugerido</p>
              <p className="mt-1 text-[10px] text-[#91bdd5]">Desarrollo Tucumán</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1.5 px-3">
            {items.map((item) => {
              const activo =
                pathname === item.to || pathname.startsWith(item.to + "/");
              const Icono = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all",
                    activo
                      ? "nav-active-glow text-white"
                      : "text-[#c2d9e7] hover:bg-white/7 hover:text-white",
                  )}
                >
                  <Icono className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-[#66dfff]/20 bg-[#0b4770]/35 p-4 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-[#6ee8ff]">
                <Sparkles className="size-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                  Gestión comercial
                </span>
              </div>
              <p className="text-xs font-bold leading-relaxed text-white">
                Una mejor planificación genera grandes resultados.
              </p>
            </div>
            <p className="mt-4 text-[10px] text-white/35">v2.0.0</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="px-4 pb-4 pt-5 sm:px-6 lg:px-7 lg:pt-4">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#83d8ff]">
                  Pedido Sugerido · Desarrollo Tucumán
                </p>
                <h1 className="mt-1 truncate text-4xl font-black leading-none text-white drop-shadow-sm">
                  {titulo}
                </h1>
                {subtitulo ? (
                  <p className="mt-2 text-[15px] text-[#d4eaf6]">{subtitulo}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="glass-header-card hidden min-w-[200px] items-center gap-3 rounded-2xl px-4 py-3 sm:flex">
                  <div className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/8">
                    <Clock3 className="size-4 text-[#8ce9ff]" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[#8fbad1]">
                      Última actualización
                    </p>
                    <p className="text-xs font-black text-white">{ultimaActualizacion}</p>
                  </div>
                </div>

                <div className="glass-header-card flex items-center gap-3 rounded-2xl px-3 py-2.5">
                  <div className="flex size-11 items-center justify-center rounded-full border border-[#6bdcff]/25 bg-gradient-to-br from-[#368dff] to-[#1c5bd6] text-sm font-black shadow-[0_0_20px_rgba(48,128,255,.28)]">
                    {iniciales}
                  </div>

                  <div className="hidden min-w-[140px] sm:block">
                    <p className="truncate text-sm font-black text-white">
                      {nombre || "Usuario"}
                    </p>
                    <p className="text-[10px] capitalize text-[#9ac5db]">
                      {rol ?? ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void cerrarSesion()}
                    className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/7 text-[#d7edf8] transition hover:bg-white/14 hover:text-white"
                    aria-label="Cerrar sesión"
                  >
                    <LogOut className="size-5" />
                  </button>
                </div>
              </div>
            </div>

            {referencia ? (
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold lg:hidden">
                <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1">
                  Período {referencia.periodo}
                </span>
                <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1">
                  Semana {referencia.semana}
                </span>
                <span className="rounded-full border border-white/10 bg-white/7 px-2.5 py-1">
                  {referencia.desde} al {referencia.hasta}
                </span>
              </div>
            ) : null}
          </header>

          <main className="min-w-0 px-3 pb-24 sm:px-4 lg:px-6 lg:pb-6">
            {children}
          </main>
        </div>
      </div>

      <nav className="glass-mobile-nav fixed inset-x-2 bottom-2 z-40 rounded-2xl lg:hidden">
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
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors",
                  activo ? "text-[#63e2ff]" : "text-[#8cabbf]",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl transition-all",
                    activo
                      ? "bg-[#178cff]/20 shadow-[0_0_16px_rgba(31,155,255,.22)]"
                      : "bg-transparent",
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
