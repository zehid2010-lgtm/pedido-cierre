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
    <div className="ps-page-shell">
      <div className="ps-mountain-layer" aria-hidden="true" />
      <div className="ps-city-layer" aria-hidden="true" />

      <div className="ps-frame">
        <aside className="ps-sidebar">
          <div className="ps-brand">
            <div className="ps-brand-icon">
              <BarChart3 />
            </div>
            <div>
              <p>Pedido</p>
              <p>Sugerido</p>
              <span>Desarrollo Tucumán</span>
            </div>
          </div>

          <nav className="ps-side-nav">
            {items.map((item) => {
              const activo =
                pathname === item.to || pathname.startsWith(item.to + "/");
              const Icono = item.icon;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn("ps-nav-item", activo && "active")}
                >
                  <Icono />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ps-side-bottom">
            <div className="ps-tip-card">
              <Lightbulb />
              <p>Una mejor planificación genera grandes resultados.</p>
            </div>
            <span className="ps-version">v2.0.0</span>
          </div>
        </aside>

        <div className="ps-main">
          <header className="ps-header">
            <div className="ps-title-block">
              <p className="ps-eyebrow">Pedido Sugerido · Desarrollo Tucumán</p>
              <h1>{titulo}</h1>
              {subtitulo ? <p className="ps-subtitle">{subtitulo}</p> : null}
            </div>

            <div className="ps-header-cards">
              <div className="ps-top-card ps-update-card">
                <div className="ps-top-icon">
                  <Clock3 />
                </div>
                <div>
                  <span>Última actualización</span>
                  <strong>{ultimaActualizacion}</strong>
                </div>
              </div>

              <div className="ps-top-card ps-user-card">
                <div className="ps-user-avatar">{iniciales}</div>
                <div className="ps-user-info">
                  <strong>{nombre || "Usuario"}</strong>
                  <span>{rol ?? ""}</span>
                </div>

                <button
                  type="button"
                  onClick={() => void cerrarSesion()}
                  className="ps-logout"
                  aria-label="Cerrar sesión"
                >
                  <LogOut />
                </button>
              </div>
            </div>

            {referencia ? (
              <div className="ps-week-mobile">
                <span>Período {referencia.periodo}</span>
                <span>Semana {referencia.semana}</span>
                <span>{referencia.desde} al {referencia.hasta}</span>
              </div>
            ) : null}
          </header>

          <main className="ps-content">{children}</main>

          <footer className="ps-footer">
            <span>⌁ Desarrollo Tucumán</span>
            <span>Personas &nbsp; + &nbsp; Datos &nbsp; + &nbsp; Oportunidades</span>
          </footer>
        </div>
      </div>

      <nav className="ps-mobile-nav">
        {items.map((item) => {
          const activo =
            pathname === item.to || pathname.startsWith(item.to + "/");
          const Icono = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn("ps-mobile-item", activo && "active")}
            >
              <Icono />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
