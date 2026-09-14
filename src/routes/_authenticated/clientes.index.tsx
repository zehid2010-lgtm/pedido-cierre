import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { SinDatos } from "@/components/Indicadores";
import { nf, nf1, traerCruce } from "@/lib/datos";

const FILAS_POR_PAGINA = 50;

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content:
          "Listado de clientes con ruta, estado, cumplimiento, sugerido, comprado y faltante.",
      },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { data, isLoading } = useQuery({
    queryKey: ["cruce"],
    queryFn: traerCruce,
  });

  const [ruta, setRuta] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  const rutas = useMemo(
    () =>
      Array.from(new Set((data?.clientes ?? []).map((c) => c.ruta))).sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true }),
      ),
    [data],
  );

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return (data?.clientes ?? []).filter((c) => {
      const coincideRuta = ruta === "todas" || c.ruta === ruta;
      const coincideBusqueda =
        !q ||
        c.cliente.toLowerCase().includes(q) ||
        c.razon_social.toLowerCase().includes(q);

      return coincideRuta && coincideBusqueda;
    });
  }, [data, ruta, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * FILAS_POR_PAGINA;
  const fin = Math.min(inicio + FILAS_POR_PAGINA, filtrados.length);
  const filas = filtrados.slice(inicio, fin);

  return (
    <AppShell
      titulo="Clientes"
      subtitulo={`${filtrados.length} clientes · Seguimiento del cumplimiento`}
    >
      {isLoading ? (
        <div className="ps-glass ps-loading">
          <Loader2 className="size-7 animate-spin text-[#55eaff]" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados." />
      ) : (
        <div className="ps-clients-page">
          <section className="ps-glass ps-filter-panel">
            <label className="ps-field">
              <span className="ps-field-label">Ruta</span>
              <div className="ps-control-wrap">
                <MapPin className="ps-control-icon" />
                <select
                  value={ruta}
                  onChange={(e) => {
                    setRuta(e.target.value);
                    setPagina(1);
                  }}
                  className="ps-control ps-select"
                >
                  <option value="todas">Todas las rutas</option>
                  {rutas.map((r) => (
                    <option key={r} value={r}>
                      Ruta {r}
                    </option>
                  ))}
                </select>
                <ChevronRight className="ps-select-chevron" />
              </div>
            </label>

            <label className="ps-field">
              <span className="ps-field-label">Buscar cliente</span>
              <div className="ps-control-wrap">
                <Search className="ps-control-icon" />
                <input
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setPagina(1);
                  }}
                  placeholder="Buscar por código, razón social o nombre..."
                  className="ps-control ps-search"
                />
              </div>
            </label>

            <p className="ps-count">
              {filtrados.length === 0
                ? "Sin resultados"
                : `Mostrando ${inicio + 1}–${fin} de ${filtrados.length} clientes`}
            </p>
          </section>

          <section className="ps-client-list">
            {filas.map((c) => {
              const cumplimiento = c.cumplimientoOficial ?? 0;
              const porcentaje = Math.max(0, Math.min(100, cumplimiento));

              const tono =
                c.tieneAmbiguedad
                  ? "#8ea6b8"
                  : c.estado === "verde"
                    ? "#54e4ab"
                    : c.estado === "amarillo"
                      ? "#ffc23b"
                      : "#ff6878";

              const estado =
                c.tieneAmbiguedad
                  ? "Ambiguo"
                  : c.estado === "verde"
                    ? "Cumplido"
                    : c.estado === "amarillo"
                      ? "Por cerrar"
                      : "Crítico";

              return (
                <Link
                  key={c.cliente}
                  to="/clientes/$cliente"
                  params={{ cliente: c.cliente }}
                  className="ps-client-card"
                >
                  <div className="ps-avatar">
                    {inicialesCliente(c.razon_social)}
                  </div>

                  <div className="ps-client-main">
                    <p className="ps-client-name">{c.razon_social}</p>
                    <p className="ps-client-meta">
                      #{c.cliente} · Ruta {c.ruta}
                    </p>
                  </div>

                  <div className="ps-status">
                    <span
                      className="ps-status-dot"
                      style={{ backgroundColor: tono, color: tono }}
                    />
                    <span>{estado}</span>
                  </div>

                  <div className="ps-progress-wrap">
                    <svg
                      className="ps-progress-ring"
                      viewBox="0 0 40 40"
                      aria-hidden="true"
                    >
                      <circle
                        className="ps-progress-track"
                        cx="20"
                        cy="20"
                        r="16"
                      />
                      <circle
                        className="ps-progress-bar"
                        cx="20"
                        cy="20"
                        r="16"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - porcentaje}
                      />
                    </svg>
                    <strong className="ps-progress-value">
                      {nf1.format(cumplimiento)}%
                    </strong>
                  </div>

                  <Metric label="Sug." value={Math.round(c.sugerido)} />
                  <Metric label="Comp." value={Math.round(c.comprado)} />
                  <Metric
                    label="Falt."
                    value={Math.round(c.faltante)}
                    danger={c.faltante > 0}
                  />

                  <ChevronRight className="ps-row-chevron" />

                  <div className="ps-mobile-metrics">
                    <MobileMetric label="Sug." value={Math.round(c.sugerido)} />
                    <MobileMetric label="Comp." value={Math.round(c.comprado)} />
                    <MobileMetric
                      label="Falt."
                      value={Math.round(c.faltante)}
                      danger={c.faltante > 0}
                    />
                  </div>
                </Link>
              );
            })}
          </section>

          {filas.length === 0 ? (
            <div className="ps-glass ps-empty">
              <SinDatos mensaje="No hay clientes para esa ruta o búsqueda." />
            </div>
          ) : null}

          {filtrados.length > 0 && totalPaginas > 1 ? (
            <section className="ps-glass ps-pagination">
              <p>
                Mostrando {inicio + 1}–{fin} de {filtrados.length} clientes
              </p>

              <div className="ps-pagination-actions">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                  className="ps-page-btn"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {paginasVisibles(paginaActual, totalPaginas).map((p, index) =>
                  p === "..." ? (
                    <span key={`sep-${index}`} className="ps-page-sep">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPagina(p)}
                      className={"ps-page-btn " + (p === paginaActual ? "active" : "")}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() =>
                    setPagina(Math.min(totalPaginas, paginaActual + 1))
                  }
                  className="ps-page-btn"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function inicialesCliente(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function Metric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="ps-metric">
      <span>{label}</span>
      <strong className={danger ? "danger" : ""}>{nf.format(value)}</strong>
    </div>
  );
}

function MobileMetric({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div className="ps-mobile-metric">
      <span>{label}</span>
      <strong className={danger ? "danger" : ""}>{nf.format(value)}</strong>
    </div>
  );
}

function paginasVisibles(
  pagina: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  if (pagina <= 4) return [1, 2, 3, 4, 5, "...", total];

  if (pagina >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", pagina - 1, pagina, pagina + 1, "...", total];
}
