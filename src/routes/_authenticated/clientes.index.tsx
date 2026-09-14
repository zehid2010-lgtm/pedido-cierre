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
        <div className="glass-panel flex min-h-[420px] items-center justify-center rounded-[24px]">
          <Loader2 className="size-8 animate-spin text-[#56dcff]" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados." />
      ) : (
        <div className="space-y-4">
          <section className="glass-panel rounded-[22px] p-4 sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[0.78fr_1.35fr_auto] lg:items-end">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#9cc7df]">
                  Ruta
                </span>

                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#66d8ff]" />
                  <select
                    value={ruta}
                    onChange={(e) => {
                      setRuta(e.target.value);
                      setPagina(1);
                    }}
                    className="glass-control h-12 w-full appearance-none rounded-xl pl-11 pr-10 text-sm font-black text-white outline-none transition focus:border-[#55dfff]"
                  >
                    <option value="todas">Todas las rutas</option>
                    {rutas.map((r) => (
                      <option key={r} value={r}>
                        Ruta {r}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 rotate-90 text-[#a9cce0]" />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#9cc7df]">
                  Buscar cliente
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#78b9db]" />
                  <input
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setPagina(1);
                    }}
                    placeholder="Buscar por código, razón social o nombre..."
                    className="glass-control h-12 w-full rounded-xl pl-11 pr-4 text-sm font-semibold text-white outline-none placeholder:text-[#7eabc4] focus:border-[#55dfff]"
                  />
                </div>
              </label>

              <div className="pb-3 text-xs font-semibold text-[#a9c9dc] lg:whitespace-nowrap">
                {filtrados.length === 0
                  ? "Sin resultados"
                  : `Mostrando ${inicio + 1}–${fin} de ${filtrados.length} clientes`}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            {filas.map((c) => {
              const cumplimiento = c.cumplimientoOficial ?? 0;
              const porcentaje = Math.max(0, Math.min(100, cumplimiento));

              const tonoEstado = c.tieneAmbiguedad
                ? "#91a7b7"
                : c.estado === "verde"
                  ? "#42e6a4"
                  : c.estado === "amarillo"
                    ? "#ffc43d"
                    : "#ff5d70";

              const etiqueta = c.tieneAmbiguedad
                ? "Ambiguo"
                : c.estado === "verde"
                  ? "Cumplido"
                  : c.estado === "amarillo"
                    ? "Por cerrar"
                    : "Crítico";

              const iniciales = inicialesCliente(c.razon_social);

              return (
                <Link
                  key={c.cliente}
                  to="/clientes/$cliente"
                  params={{ cliente: c.cliente }}
                  className="glass-row group block rounded-[18px] px-4 py-3.5 transition hover:-translate-y-[1px] hover:border-[#62dfff]/45 sm:px-5"
                >
                  <div className="grid items-center gap-3 xl:grid-cols-[58px_minmax(250px,1.5fr)_170px_110px_100px_92px_92px_92px_26px]">
                    <div className="flex size-12 items-center justify-center rounded-full border border-[#72d9ff]/25 bg-gradient-to-br from-[#2b6ea8]/80 to-[#164975]/80 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,.12)]">
                      {iniciales}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black text-white">
                        {c.razon_social}
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#8bb7d0]">
                        #{c.cliente} · Ruta {c.ruta}
                      </p>
                    </div>

                    <div className="flex items-center">
                      <span
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold"
                        style={{
                          borderColor: `${tonoEstado}33`,
                          color: c.estado === "amarillo" ? "#ffe09a" : tonoEstado,
                          backgroundColor: `${tonoEstado}14`,
                        }}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: tonoEstado }}
                        />
                        {etiqueta}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="relative flex size-12 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#51e3ff ${porcentaje}%, rgba(122, 214, 255, 0.13) 0)`,
                        }}
                      >
                        <div className="absolute inset-[6px] rounded-full bg-[#103a5e]/95" />
                        <span className="relative z-10 text-[10px] font-black text-white xl:hidden">
                          {nf1.format(cumplimiento)}%
                        </span>
                      </div>
                      <span className="numero-tabular hidden text-[15px] font-black text-white xl:block">
                        {nf1.format(cumplimiento)}%
                      </span>
                    </div>

                    <Metrica label="Sug." valor={Math.round(c.sugerido)} color="#ffffff" />
                    <Metrica label="Comp." valor={Math.round(c.comprado)} color="#d9fff0" />
                    <Metrica
                      label="Falt."
                      valor={Math.round(c.faltante)}
                      color={c.faltante > 0 ? "#ff6979" : "#42e6a4"}
                    />

                    <div className="hidden xl:block" />

                    <ChevronRight className="size-5 text-[#8bd7f7] transition group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/7 pt-3 xl:hidden">
                    <MetricaMovil label="Sug." valor={Math.round(c.sugerido)} />
                    <MetricaMovil label="Comp." valor={Math.round(c.comprado)} />
                    <MetricaMovil
                      label="Falt."
                      valor={Math.round(c.faltante)}
                      alerta={c.faltante > 0}
                    />
                  </div>
                </Link>
              );
            })}

            {filas.length === 0 ? (
              <div className="glass-panel rounded-[22px] p-8">
                <SinDatos mensaje="No hay clientes para esa ruta o búsqueda." />
              </div>
            ) : null}
          </section>

          {filtrados.length > 0 ? (
            <section className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-4 py-3">
              <p className="text-xs font-semibold text-[#9abdd2]">
                Mostrando {inicio + 1}–{fin} de {filtrados.length} clientes
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(Math.max(1, paginaActual - 1))}
                  className="glass-control flex size-9 items-center justify-center rounded-lg text-[#b8d8e9] disabled:opacity-35"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {paginasVisibles(paginaActual, totalPaginas).map((p, index) =>
                  p === "..." ? (
                    <span key={`sep-${index}`} className="px-1 text-xs text-[#789db5]">
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPagina(p)}
                      className={
                        "flex size-9 items-center justify-center rounded-lg border text-xs font-black transition " +
                        (p === paginaActual
                          ? "border-[#54dfff] bg-[#1f8ef1] text-white shadow-[0_0_18px_rgba(46,173,255,.35)]"
                          : "border-white/10 bg-white/5 text-[#b9d4e3] hover:bg-white/10")
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
                  className="glass-control flex size-9 items-center justify-center rounded-lg text-[#b8d8e9] disabled:opacity-35"
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

function Metrica({
  label,
  valor,
  color,
}: {
  label: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="hidden border-l border-white/10 pl-4 text-center xl:block">
      <p className="text-[10px] font-semibold text-[#89abc0]">{label}</p>
      <p className="numero-tabular mt-0.5 text-[12px] font-black" style={{ color }}>
        {nf.format(valor)}
      </p>
    </div>
  );
}

function MetricaMovil({
  label,
  valor,
  alerta = false,
}: {
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/7 bg-white/[0.035] px-2 py-2 text-center">
      <p className="text-[9px] font-semibold text-[#7fa5bc]">{label}</p>
      <p
        className={
          "numero-tabular text-[12px] font-black " +
          (alerta ? "text-[#ff6979]" : "text-white")
        }
      >
        {nf.format(valor)}
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
