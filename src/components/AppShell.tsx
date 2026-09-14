import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  Clock3,
  Lightbulb,
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
    <div className="mock-page min-h-screen overflow-x-hidden text-white">
      <div className="mock-scene">
        <div className="mock-city-lights" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen max-w-[1520px] p-2 lg:p-4">
        <div className="mock-outer-frame flex min-h-[calc(100vh-32px)] overflow-hidden rounded-[26px]">
          <aside className="mock-sidebar hidden w-[278px] shrink-0 text-white lg:flex lg:flex-col">
            <div className="flex items-center gap-4 border-b border-white/10 px-6 py-6">
              <div className="flex size-[54px] items-center justify-center rounded-2xl border border-[#7ceaff]/30 bg-gradient-to-br from-[#24a3ff] to-[#0f68dd] shadow-[0_0_24px_rgba(63,192,255,.38)]">
                <BarChart3 className="size-7" />
              </div>
              <div>
                <p className="text-[17px] font-black leading-tight">Pedido</p>
                <p className="text-[17px] font-black leading-tight">Sugerido</p>
                <p className="mt-1.5 text-[11px] text-[#9ec4d7]">
                  Desarrollo Tucumán
                </p>
              </div>
            </div>

            <nav className="mt-5 space-y-2 px-3">
              {items.map((item) => {
                const activo =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                const Icono = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-4 rounded-[16px] px-4 py-4 text-[15px] font-bold transition",
                      activo
                        ? "mock-nav-active text-white"
                        : "text-[#c5dce8] hover:bg-white/7 hover:text-white",
                    )}
                  >
                    <Icono className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto p-4">
              <div className="mock-tip rounded-[20px] px-4 py-4">
                <div className="flex items-center gap-3">
                  <Lightbulb className="size-5 text-[#5cecff]" />
                  <p className="text-xs font-semibold leading-relaxed text-[#d1e8f3]">
                    Una mejor planificación genera grandes resultados.
                  </p>
                </div>
              </div>
              <p className="mt-5 px-2 text-[10px] text-white/40">v2.0.0</p>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="px-5 pb-4 pt-5 sm:px-7 lg:px-8 lg:pt-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.23em] text-[#92dcff]">
                    Pedido Sugerido · Desarrollo Tucumán
                  </p>
                  <h1 className="mt-2 truncate text-[44px] font-black leading-none text-white">
                    {titulo}
                  </h1>
                  {subtitulo ? (
                    <p className="mt-2.5 text-[15px] text-[#d4e6ef]">
                      {subtitulo}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="mock-top-card hidden min-w-[225px] items-center gap-3 rounded-[18px] px-4 py-3 sm:flex">
                    <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/6">
                      <Clock3 className="size-5 text-[#a9eaff]" />
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold text-[#9bbdce]">
                        Última actualización
                      </p>
                      <p className="mt-0.5 text-[13px] font-black text-white">
                        {ultimaActualizacion}
                      </p>
                    </div>
                  </div>

                  <div className="mock-top-card flex min-w-[275px] items-center gap-3 rounded-[18px] px-3 py-3">
                    <div className="flex size-12 items-center justify-center rounded-full border border-[#73dcff]/25 bg-gradient-to-br from-[#3f8fff] to-[#2458d5] text-sm font-black">
                      {iniciales}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {nombre || "Usuario"}
                      </p>
                      <p className="mt-0.5 text-[10px] capitalize text-[#a0c4d7]">
                        {rol ?? ""}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void cerrarSesion()}
                      className="flex size-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/7 text-[#daf0fa] transition hover:bg-white/14"
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

            <main className="min-w-0 px-4 pb-24 sm:px-6 lg:px-8 lg:pb-8">
              {children}
            </main>

            <div className="hidden items-center justify-between px-8 pb-3 text-[9px] text-[#8eb7ca] lg:flex">
              <span>⌁ Desarrollo Tucumán</span>
              <span>Personas &nbsp; + &nbsp; Datos &nbsp; + &nbsp; Oportunidades</span>
            </div>
          </div>
        </div>
      </div>

      <nav className="mock-mobile-nav fixed inset-x-2 bottom-2 z-40 rounded-2xl lg:hidden">
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
                  activo ? "text-[#65e8ff]" : "text-[#8eacbd]",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-xl",
                    activo ? "bg-[#168df3]/20" : "bg-transparent",
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
