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
        <div className="mock-glass flex min-h-[420px] items-center justify-center rounded-[26px]">
          <Loader2 className="size-8 animate-spin text-[#58eaff]" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados." />
      ) : (
        <div className="space-y-4">
          <section className="mock-glass rounded-[24px] px-5 py-5">
            <div className="grid gap-4 lg:grid-cols-[0.82fr_1.42fr_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#a8cadc]">
                  Ruta
                </span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#9bdcff]" />
                  <select
                    value={ruta}
                    onChange={(e) => {
                      setRuta(e.target.value);
                      setPagina(1);
                    }}
                    className="mock-control h-12 w-full appearance-none rounded-[14px] pl-11 pr-10 text-sm font-black text-white outline-none"
                  >
                    <option value="todas">Todas las rutas</option>
                    {rutas.map((r) => (
                      <option key={r} value={r}>
                        Ruta {r}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 rotate-90 text-[#add7ea]" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#a8cadc]">
                  Buscar cliente
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#a6d5e9]" />
                  <input
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPagina(1);
                    }}
                    placeholder="Buscar por código, razón social o nombre..."
                    className="mock-control h-12 w-full rounded-[14px] pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-[#8aafc2]"
                  />
                </div>
              </label>

              <p className="pb-3 text-[11px] font-semibold text-[#bdd4e0] lg:whitespace-nowrap">
                {filtrados.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${inicio + 1}–${fin} de ${filtrados.length} clientes`}
              </p>
            </div>
          </section>

          <section className="space-y-3">
            {filas.map((c) => {
              const cumplimiento = c.cumplimientoOficial ?? 0;
              const porcentaje = Math.max(0, Math.min(100, cumplimiento));

              const tono =
                c.tieneAmbiguedad
                  ? "#8da3b6"
                  : c.estado === "verde"
                    ? "#55e3ad"
                    : c.estado === "amarillo"
                      ? "#ffc33a"
                      : "#ff6676";

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
                  className="mock-client-row group block rounded-[18px] px-5 py-4"
                >
                  <div className="grid items-center gap-4 xl:grid-cols-[62px_minmax(280px,1.65fr)_170px_145px_90px_90px_90px_28px]">
                    <div className="flex size-[52px] items-center justify-center rounded-full border border-[#78cfff]/25 bg-gradient-to-br from-[#2a6ca5]/80 to-[#15426f]/90] text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.16)]">
                      {inicialesCliente(c.razon_social)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-white">
                        {c.razon_social}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#95b8ca]">
                        #{c.cliente} · Ruta {c.ruta}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                        style={{ backgroundColor: tono, color: tono }}
                      />
                      <span className="text-[11px] font-bold text-white/90">
                        {estado}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="relative flex size-[50px] items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#55eaff ${porcentaje}%, rgba(111, 216, 255, .17) 0)`,
                        }}
                      >
                        <div className="absolute inset-[6px] rounded-full bg-[#113957]" />
                      </div>

                      <strong className="numero-tabular text-[17px] font-black text-white">
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

                    <ChevronRight className="size-5 text-[#8bdcff] transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/7 pt-3 xl:hidden">
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
            <div className="mock-glass rounded-[24px] p-8">
              <SinDatos mensaje="No hay clientes para esa ruta o búsqueda." />
            </div>
          ) : null}

          {filtrados.length > 0 && totalPaginas > 1 ? (
            <div className="mock-glass flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3">
              <p className="text-xs font-semibold text-[#9abdd2]">
                Mostrando {inicio + 1}–{fin} de {filtrados.length} clientes
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                  className="mock-control flex size-9 items-center justify-center rounded-lg text-[#c7e2f0] disabled:opacity-35"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {paginasVisibles(paginaActual, totalPaginas).map((p, index) =>
                  p === "..." ? (
                    <span key={`sep-${index}`} className="px-1 text-xs text-[#86aabd]">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPagina(p)}
                      className={
                        "flex size-9 items-center justify-center rounded-lg border text-xs font-black " +
                        (p === paginaActual
                          ? "border-[#6be7ff] bg-[#148cf1] text-white shadow-[0_0_18px_rgba(60,190,255,.28)]"
                          : "border-white/10 bg-white/5 text-[#bad5e3]")
                      }
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
                  className="mock-control flex size-9 items-center justify-center rounded-lg text-[#c7e2f0] disabled:opacity-35"
                  aria-label="Página siguiente"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
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
    <div className="hidden border-l border-white/10 pl-4 xl:block">
      <p className="text-[10px] font-semibold text-[#8faec0]">{label}</p>
      <p
        className={
          "numero-tabular mt-0.5 text-[12px] font-black " +
          (danger ? "text-[#ff6a78]" : "text-white")
        }
      >
        {nf.format(value)}
      </p>
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
    <div className="rounded-xl border border-white/7 bg-white/[0.035] px-2 py-2 text-center">
      <p className="text-[9px] font-semibold text-[#89aabd]">{label}</p>
      <p
        className={
          "numero-tabular text-[12px] font-black " +
          (danger ? "text-[#ff6a78]" : "text-white")
        }
      >
        {nf.format(value)}
      </p>
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
