import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  Search,
  Upload,
  Users,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
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
  const navigate = useNavigate();
  const { nombre, rol, esAdmin, cerrarSesion } = useAuth();

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
  const paginaSegura = Math.min(pagina, totalPaginas);
  const inicio = (paginaSegura - 1) * FILAS_POR_PAGINA;
  const fin = Math.min(inicio + FILAS_POR_PAGINA, filtrados.length);
  const filas = filtrados.slice(inicio, fin);

  const ultimaActualizacion = data?.importacion.created_at
    ? new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.importacion.created_at))
    : "—";

  const irACliente = (cliente: string) => {
    void navigate({
      to: "/clientes/$cliente",
      params: { cliente },
    });
  };

  const nav = [
    { to: "/panel", label: "Inicio", icon: BarChart3, visible: true },
    { to: "/clientes", label: "Clientes", icon: Users, visible: true },
    { to: "/pendientes", label: "Pendientes", icon: ClipboardList, visible: true },
    { to: "/equivalencias", label: "Cajas", icon: Boxes, visible: true },
    { to: "/importar", label: "Importar", icon: Upload, visible: esAdmin },
  ] as const;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#eef4f8] text-[#0e2032]">
      <div className="flex min-h-screen">
        {/* SIDEBAR DESKTOP */}
        <aside className="hidden w-[210px] shrink-0 bg-gradient-to-b from-[#0d4976] to-[#083b63] text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#29a2ff]">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <p className="text-[15px] font-black leading-tight">Pedido</p>
              <p className="text-[15px] font-black leading-tight">Sugerido</p>
              <p className="mt-1 text-[10px] text-white/70">Desarrollo Tucumán</p>
            </div>
          </div>

          <nav className="mt-4 space-y-1.5 px-2">
            {nav
              .filter((item) => item.visible)
              .map((item) => {
                const Icon = item.icon;
                const activo = item.to === "/clientes";
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition " +
                      (activo
                        ? "bg-[#197de0] text-white shadow-lg"
                        : "text-white/85 hover:bg-white/10")
                    }
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          <div className="mt-auto px-5 pb-6">
            <div className="mb-2 flex items-end gap-1">
              <span className="h-2 w-6 bg-[#249deb]" />
              <span className="h-3 w-7 bg-[#249deb]" />
              <span className="h-5 w-8 bg-[#249deb]" />
              <span className="h-7 w-9 bg-[#249deb]" />
            </div>
            <p className="text-xs font-bold">Gestión comercial</p>
            <p className="text-[10px] text-white/70">en movimiento</p>
            <p className="mt-3 text-[10px] text-white/50">v6.6</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="bg-gradient-to-r from-[#075284] via-[#0a6e9e] to-[#0ba3d0] px-4 py-4 text-white shadow-sm sm:px-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                  Pedido Sugerido · Desarrollo Tucumán
                </p>
                <h1 className="mt-1 text-3xl font-black leading-none">Clientes</h1>
                <p className="mt-2 text-sm text-white/90">
                  {filtrados.length} clientes · Seguimiento del cumplimiento
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl bg-[#0a638f]/70 px-4 py-2.5 sm:block">
                  <p className="text-[9px] font-semibold text-white/70">
                    Última actualización
                  </p>
                  <p className="text-xs font-black">{ultimaActualizacion}</p>
                </div>

                <div className="flex size-11 items-center justify-center rounded-full bg-[#2a8be2] text-sm font-black shadow-inner">
                  {(nombre || "RM")
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")
                    .toUpperCase()}
                </div>

                <div className="hidden sm:block">
                  <p className="text-sm font-black">{nombre || "Usuario"}</p>
                  <p className="text-[10px] text-white/80">{rol || ""}</p>
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
          </header>

          <main className="p-3 sm:p-5">
            {/* FILTROS ÚNICOS */}
            <section className="rounded-2xl bg-white p-3 shadow-[0_8px_24px_rgba(15,45,70,0.08)] sm:p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto] lg:items-end">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[#526274]">
                    Ruta
                  </span>
                  <select
                    value={ruta}
                    onChange={(e) => {
                      setRuta(e.target.value);
                      setPagina(1);
                    }}
                    className="h-12 w-full rounded-xl border border-[#cedbe5] bg-white px-4 text-sm font-black outline-none transition focus:border-[#2388d8] focus:ring-2 focus:ring-[#2388d8]/15"
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
                  <span className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-[#526274]">
                    Buscar cliente
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#7a8b9a]" />
                    <input
                      type="search"
                      value={busqueda}
                      onChange={(e) => {
                        setBusqueda(e.target.value);
                        setPagina(1);
                      }}
                      placeholder="Buscar por código, razón social o nombre..."
                      className="h-12 w-full rounded-xl border border-[#cedbe5] bg-white pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-[#7a8b9a] focus:border-[#2388d8] focus:ring-2 focus:ring-[#2388d8]/15"
                    />
                  </div>
                </label>

                <p className="pb-3 text-xs font-semibold text-[#647487] lg:whitespace-nowrap">
                  {filtrados.length === 0
                    ? "Sin resultados"
                    : `Mostrando ${inicio + 1}–${fin} de ${filtrados.length} clientes`}
                </p>
              </div>
            </section>

            {/* LISTADO */}
            <section className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(15,45,70,0.08)]">
              {isLoading ? (
                <div className="flex min-h-[420px] items-center justify-center">
                  <Loader2 className="size-7 animate-spin text-[#2388d8]" />
                </div>
              ) : !data ? (
                <div className="p-10 text-center text-sm text-[#718294]">
                  Todavía no hay datos procesados.
                </div>
              ) : (
                <>
                  {/* DESKTOP TABLE */}
                  <div className="hidden xl:block">
                    <div className="grid grid-cols-[105px_minmax(210px,1.7fr)_70px_140px_200px_95px_95px_95px_80px_32px] items-center gap-2 bg-[#e8f0f6] px-4 py-3 text-[10px] font-black text-[#536679]">
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
                            ? "#15a36f"
                            : c.estado === "amarillo"
                              ? "#f2a600"
                              : "#f02f3e";

                      return (
                        <button
                          key={c.cliente}
                          type="button"
                          onClick={() => irACliente(c.cliente)}
                          className={
                            "grid w-full grid-cols-[105px_minmax(210px,1.7fr)_70px_140px_200px_95px_95px_95px_80px_32px] items-center gap-2 border-b border-[#e6edf2] px-4 py-2.5 text-left transition hover:bg-[#f7fafc] " +
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
                              className="size-2.5 rounded-full"
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
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#e3ebf1]">
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
                                "numero-tabular inline-flex min-w-[68px] justify-end rounded-lg px-2 py-1 text-[12px] font-black " +
                                (c.faltante > 0
                                  ? "bg-[#ffe2e4] text-[#d9182b]"
                                  : "bg-[#def5e9] text-[#13885f]")
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

                          <ChevronRight className="size-4 text-[#5b7185]" />
                        </button>
                      );
                    })}
                  </div>

                  {/* TABLET / MOBILE LIST */}
                  <div className="xl:hidden">
                    {filas.map((c, index) => {
                      const cumplimiento = c.cumplimientoOficial ?? 0;
                      const tono =
                        c.tieneAmbiguedad
                          ? "#718294"
                          : c.estado === "verde"
                            ? "#15a36f"
                            : c.estado === "amarillo"
                              ? "#f2a600"
                              : "#f02f3e";

                      return (
                        <button
                          key={c.cliente}
                          type="button"
                          onClick={() => irACliente(c.cliente)}
                          className={
                            "block w-full border-b border-[#e6edf2] px-3 py-2.5 text-left transition hover:bg-[#f7fafc] " +
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
                              <ChevronRight className="size-4 text-[#5b7185]" />
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
                              <b className="text-[#d9182b]">
                                {nf.format(Math.round(c.faltante))}
                              </b>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {filas.length === 0 ? (
                    <div className="p-10 text-center text-sm text-[#718294]">
                      No hay clientes para esa ruta o búsqueda.
                    </div>
                  ) : null}

                  {/* PAGINATION */}
                  {filtrados.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6edf2] px-4 py-4">
                      <p className="text-xs font-semibold text-[#647487]">
                        Mostrando {inicio + 1}–{fin} de {filtrados.length} clientes
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={paginaSegura <= 1}
                          onClick={() => setPagina(Math.max(1, paginaSegura - 1))}
                          className="flex size-9 items-center justify-center rounded-lg border border-[#d7e1e8] bg-white text-[#4e6476] disabled:opacity-35"
                        >
                          <ChevronLeft className="size-4" />
                        </button>

                        {paginasVisibles(paginaSegura, totalPaginas).map((p, i) =>
                          p === "..." ? (
                            <span
                              key={`sep-${i}`}
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
                                (p === paginaSegura
                                  ? "border-[#197de0] bg-[#197de0] text-white"
                                  : "border-[#d7e1e8] bg-white text-[#273b4d]")
                              }
                            >
                              {p}
                            </button>
                          ),
                        )}

                        <button
                          type="button"
                          disabled={paginaSegura >= totalPaginas}
                          onClick={() =>
                            setPagina(Math.min(totalPaginas, paginaSegura + 1))
                          }
                          className="flex size-9 items-center justify-center rounded-lg border border-[#d7e1e8] bg-white text-[#4e6476] disabled:opacity-35"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* MOBILE NAV */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[#dce5ec] bg-white/95 px-1 py-1.5 shadow-[0_-4px_20px_rgba(15,45,70,0.08)] backdrop-blur lg:hidden">
        {nav
          .filter((item) => item.visible)
          .map((item) => {
            const Icon = item.icon;
            const activo = item.to === "/clientes";

            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex min-w-[60px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold " +
                  (activo ? "text-[#197de0]" : "text-[#65778a]")
                }
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </div>
  );
}

function paginasVisibles(
  pagina: number,
  total: number,
): Array<number | "..."> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (pagina <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (pagina >= total - 3) {
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "...", pagina - 1, pagina, pagina + 1, "...", total];
}
