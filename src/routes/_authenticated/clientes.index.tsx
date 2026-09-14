import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

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
          "Listado compacto de clientes con ruta, estado, cumplimiento, sugerido, comprado, faltante y cajas.",
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
        <div className="flex min-h-[420px] items-center justify-center rounded-2xl bg-white shadow-card">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados." />
      ) : (
        <div className="space-y-3">
          <section className="rounded-2xl bg-white p-3 shadow-card">
            <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr_auto] lg:items-end">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[#5d6d7c]">
                  Ruta
                </span>
                <select
                  value={ruta}
                  onChange={(e) => {
                    setRuta(e.target.value);
                    setPagina(1);
                  }}
                  className="h-12 w-full rounded-xl border border-[#ccd9e3] bg-white px-4 text-sm font-black outline-none transition focus:border-[#1d7fe5] focus:ring-2 focus:ring-[#1d7fe5]/15"
                >
                  <option value="todas">Todas las rutas</option>
                  {rutas.map((r) => (
                    <option key={r} value={r}>
                      Ruta {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[#5d6d7c]">
                  Buscar cliente
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7d8d9d]" />
                  <input
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPagina(1);
                    }}
                    placeholder="Buscar por código, razón social o nombre..."
                    className="h-12 w-full rounded-xl border border-[#ccd9e3] bg-white pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-[#8796a5] focus:border-[#1d7fe5] focus:ring-2 focus:ring-[#1d7fe5]/15"
                  />
                </div>
              </label>

              <p className="pb-3 text-xs font-semibold text-[#6b7b8b] lg:whitespace-nowrap">
                {filtrados.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${inicio + 1}–${fin} de ${filtrados.length} clientes`}
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl bg-white shadow-card">
            <div className="hidden xl:block">
              <div className="grid grid-cols-[90px_minmax(210px,1.7fr)_65px_120px_190px_90px_90px_90px_70px_28px] items-center gap-2 bg-[#e8f0f6] px-3 py-3 text-[10px] font-black text-[#53677a]">
                <span>Código</span>
                <span>Cliente</span>
                <span>Ruta</span>
                <span>Estado</span>
                <span>Cumplimiento</span>
                <span className="text-right">Sugerido</span>
                <span className="text-right">Comprado</span>
                <span className="text-right">Faltante</span>
                <span className="text-right">Cajas</span>
                <span />
              </div>

              {filas.map((c, index) => {
                const cumplimiento = c.cumplimientoOficial ?? 0;
                const tono =
                  c.tieneAmbiguedad
                    ? "#718294"
                    : c.estado === "verde"
                      ? "#13a369"
                      : c.estado === "amarillo"
                        ? "#f1a500"
                        : "#ed2637";

                return (
                  <Link
                    key={c.cliente}
                    to="/clientes/$cliente"
                    params={{ cliente: c.cliente }}
                    className={
                      "grid grid-cols-[90px_minmax(210px,1.7fr)_65px_120px_190px_90px_90px_90px_70px_28px] items-center gap-2 border-b border-[#e7edf2] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#f7fafc] " +
                      (index % 2 ? "bg-[#fbfdfe]" : "bg-white")
                    }
                  >
                    <span className="text-[12px] font-black">{c.cliente}</span>

                    <span className="truncate text-[12px] font-bold">
                      {c.razon_social}
                    </span>

                    <span className="text-[12px] font-semibold">{c.ruta}</span>

                    <span className="flex items-center gap-2 text-[11px] font-semibold">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tono }}
                      />
                      {c.tieneAmbiguedad
                        ? "Ambiguo"
                        : c.estado === "verde"
                          ? "Cumplido"
                          : c.estado === "amarillo"
                            ? "Por cerrar"
                            : "Crítico"}
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#e2ebf1]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, cumplimiento))}%`,
                            backgroundColor: tono,
                          }}
                        />
                      </span>
                      <strong className="numero-tabular w-10 text-right text-[11px]">
                        {nf1.format(cumplimiento)}%
                      </strong>
                    </span>

                    <span className="numero-tabular text-right text-[12px]">
                      {nf.format(Math.round(c.sugerido))}
                    </span>

                    <span className="numero-tabular text-right text-[12px]">
                      {nf.format(Math.round(c.comprado))}
                    </span>

                    <span className="text-right">
                      <span
                        className={
                          "numero-tabular inline-flex min-w-[62px] justify-end rounded-lg px-2 py-1 text-[12px] font-black " +
                          (c.faltante > 0
                            ? "bg-[#ffe1e4] text-[#d8192b]"
                            : "bg-[#dcf4e8] text-[#11865d]")
                        }
                      >
                        {nf.format(Math.round(c.faltante))}
                      </span>
                    </span>

                    <span className="numero-tabular text-right text-[12px]">
                      {c.faltantePacks !== null
                        ? `≈ ${nf1.format(c.faltantePacks)}`
                        : "—"}
                    </span>

                    <ChevronRight className="size-4 text-[#5d7184]" />
                  </Link>
                );
              })}
            </div>

            <div className="xl:hidden">
              {filas.map((c, index) => {
                const cumplimiento = c.cumplimientoOficial ?? 0;
                const tono =
                  c.tieneAmbiguedad
                    ? "#718294"
                    : c.estado === "verde"
                      ? "#13a369"
                      : c.estado === "amarillo"
                        ? "#f1a500"
                        : "#ed2637";

                return (
                  <Link
                    key={c.cliente}
                    to="/clientes/$cliente"
                    params={{ cliente: c.cliente }}
                    className={
                      "block border-b border-[#e7edf2] px-3 py-2.5 transition last:border-b-0 hover:bg-[#f7fafc] " +
                      (index % 2 ? "bg-[#fbfdfe]" : "bg-white")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black">
                          {c.razon_social}
                        </p>
                        <p className="text-[10px] font-semibold text-[#718294]">
                          #{c.cliente} · Ruta {c.ruta}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className="numero-tabular text-sm font-black">
                          {nf1.format(cumplimiento)}%
                        </span>
                        <ChevronRight className="size-4 text-[#5d7184]" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tono }}
                      />
                      <span className="text-[10px] font-bold">
                        {c.tieneAmbiguedad
                          ? "Ambiguo"
                          : c.estado === "verde"
                            ? "Cumplido"
                            : c.estado === "amarillo"
                              ? "Por cerrar"
                              : "Crítico"}
                      </span>

                      <span className="ml-auto text-[10px] font-semibold text-[#65778a]">
                        Sug.{" "}
                        <b className="text-[#17283a]">
                          {nf.format(Math.round(c.sugerido))}
                        </b>{" "}
                        · Comp.{" "}
                        <b className="text-[#17283a]">
                          {nf.format(Math.round(c.comprado))}
                        </b>{" "}
                        · Falt.{" "}
                        <b className="text-[#d8192b]">
                          {nf.format(Math.round(c.faltante))}
                        </b>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            {filas.length === 0 ? (
              <div className="p-8">
                <SinDatos mensaje="No hay clientes para esa ruta o búsqueda." />
              </div>
            ) : null}

            {filtrados.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7edf2] px-4 py-4">
                <p className="text-xs font-semibold text-[#6a7b8d]">
                  Mostrando {inicio + 1}–{fin} de {filtrados.length} clientes
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={paginaActual <= 1}
                    onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                    className="flex size-9 items-center justify-center rounded-lg border border-[#d7e1e8] bg-white text-[#4f6476] disabled:opacity-35"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  {paginasVisibles(paginaActual, totalPaginas).map((p, index) =>
                    p === "..." ? (
                      <span
                        key={`sep-${index}`}
                        className="px-1 text-xs text-[#697b8d]"
                      >
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
                            ? "border-[#1d7fe5] bg-[#1d7fe5] text-white"
                            : "border-[#d7e1e8] bg-white text-[#273b4d]")
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
                    className="flex size-9 items-center justify-center rounded-lg border border-[#d7e1e8] bg-white text-[#4f6476] disabled:opacity-35"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </AppShell>
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
