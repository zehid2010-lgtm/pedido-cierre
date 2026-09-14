import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bookmark,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  LogOut,
  MoreVertical,
  Route as RouteIcon,
  Search,
  Upload,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { nf, nf1, traerCruce, type FilaCliente, type Semaforo } from "@/lib/datos";

type FiltroEstado = Semaforo | "ambiguo" | "todos";

type ReferenciaSemana = {
  periodo: string;
  semana: string;
  desde: string;
  hasta: string;
};

const FILAS_POR_PAGINA = 20;

const ESTADOS: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "todos", etiqueta: "Todos" },
  { valor: "critico", etiqueta: "Críticos" },
  { valor: "amarillo", etiqueta: "Por cerrar" },
  { valor: "verde", etiqueta: "Cumplidos" },
  { valor: "ambiguo", etiqueta: "Ambiguos" },
];

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Resultado por Cliente — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content:
          "Listado analítico de clientes con ruta, pedido sugerido, compra semanal, faltante, resultado y estado.",
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

  const importacionId = data?.importacion.id ?? "";
  const idEsUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      importacionId,
    );

  const { data: semanaFuente } = useQuery({
    queryKey: ["semana-fuente", importacionId],
    enabled: Boolean(data && idEsUuid),
    queryFn: async (): Promise<string | null> => {
      const { data: muestraDetalle } = await supabase
        .from("origen_detalle")
        .select("data")
        .eq("importacion_id", importacionId)
        .limit(1);

      const semana = ((muestraDetalle?.[0]?.data ?? {}) as Record<string, unknown>)[
        "Semana"
      ];
      return semana === null || semana === undefined || semana === ""
        ? null
        : String(semana);
    },
  });

  const [ruta, setRuta] = useState("todas");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
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
      const coincideEstado =
        estado === "todos"
          ? true
          : estado === "ambiguo"
            ? Boolean(c.tieneAmbiguedad)
            : !c.tieneAmbiguedad && c.estado === estado;

      return (
        (ruta === "todas" || c.ruta === ruta) &&
        coincideEstado &&
        (!q ||
          c.cliente.toLowerCase().includes(q) ||
          c.razon_social.toLowerCase().includes(q))
      );
    });
  }, [data, ruta, estado, busqueda]);

  const resumen = useMemo(() => {
    const total = filtrados.length;
    const sugerido = filtrados.reduce((acc, c) => acc + c.sugerido, 0);
    const compradoAplicado = filtrados.reduce(
      (acc, c) => acc + Math.min(c.comprado, c.sugerido),
      0,
    );
    const cumplimiento =
      sugerido > 0 ? Math.min((compradoAplicado / sugerido) * 100, 100) : 0;
    const faltante = filtrados.reduce((acc, c) => acc + c.faltante, 0);
    const conCompra = filtrados.filter((c) => c.comprado > 0).length;
    const sinCompra = total - conCompra;

    return {
      total,
      cumplimiento,
      faltante,
      conCompra,
      sinCompra,
      pctConCompra: total > 0 ? (conCompra / total) * 100 : 0,
      pctSinCompra: total > 0 ? (sinCompra / total) * 100 : 0,
    };
  }, [filtrados]);

  const referencia = useMemo(() => {
    const base = referenciaSemana(data?.importacion.created_at);
    if (!base) return null;
    return semanaFuente ? { ...base, semana: semanaFuente } : base;
  }, [data?.importacion.created_at, semanaFuente]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * FILAS_POR_PAGINA;
  const hasta = Math.min(desde + FILAS_POR_PAGINA, filtrados.length);
  const filasPagina = filtrados.slice(desde, hasta);

  const actualizarFiltro = (cambio: () => void) => {
    cambio();
    setPagina(1);
  };

  const abrirCliente = (cliente: string) => {
    void navigate({
      to: "/clientes/$cliente",
      params: { cliente },
    });
  };

  const exportarCsv = () => {
    if (!filtrados.length) return;

    const encabezados = [
      "Cliente",
      "Codigo",
      "Ruta",
      "Pedido Sugerido",
      "Compra Semana",
      "Faltante",
      "Resultado",
      "Estado",
    ];

    const filas = filtrados.map((c) => [
      c.razon_social,
      c.cliente,
      c.ruta,
      Math.round(c.sugerido),
      Math.round(c.comprado),
      Math.round(c.faltante),
      c.cumplimientoOficial ?? "",
      etiquetaEstado(c),
    ]);

    const csv = [encabezados, ...filas]
      .map((fila) => fila.map(valorCsv).join(";"))
      .join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido-sugerido-clientes-${referencia?.semana ?? "actual"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const nav = [
    { to: "/panel", label: "Panel", icon: BarChart3, visible: true },
    { to: "/clientes", label: "Clientes", icon: Users, visible: true },
    { to: "/pendientes", label: "Pendientes", icon: ClipboardList, visible: true },
    { to: "/equivalencias", label: "Cajas", icon: Boxes, visible: true },
    { to: "/importar", label: "Importar", icon: Upload, visible: esAdmin },
  ] as const;

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#e9eef3] text-[#18212a]">
      {/* Encabezado superior: título + período/semana/rango */}
      <header className="sticky top-0 z-30 border-b border-[#dce2e7] bg-white/95 px-3 py-2.5 shadow-[0_6px_18px_rgba(31,45,61,0.08)] backdrop-blur sm:px-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-xl">
              <span className="font-black">PEDIDO SUGERIDO:</span> ARCA | Tucumán
            </h1>
            <p className="truncate text-[11px] text-[#6a7680]">
              Resultado por Cliente
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-3">
            <DatoCabecera titulo="Período" valor={referencia?.periodo ?? "—"} />
            <Separador />
            <DatoCabecera titulo="Semana" valor={referencia?.semana ?? "—"} />
            <Separador />
            <DatoCabecera
              titulo="Fechas"
              valor={
                referencia ? `${referencia.desde} al ${referencia.hasta}` : "—"
              }
            />
            <Separador />
            <button
              type="button"
              className="rounded-lg p-2 text-[#111b24] transition hover:bg-[#f1f4f6]"
              title={`${nombre || "Usuario"} · ${rol ?? ""}`}
              aria-label="Información de usuario"
            >
              <Bookmark className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => void cerrarSesion()}
              className="rounded-lg p-2 text-[#6a7680] transition hover:bg-[#f1f4f6] hover:text-[#c90016]"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-5" />
            </button>
          </div>
        </div>

        {/* Navegación desktop (sin sidebar) */}
        <nav className="mt-2 hidden gap-1 lg:flex">
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
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition " +
                    (activo
                      ? "bg-[#c90016] text-white"
                      : "text-[#5b6670] hover:bg-[#f1f4f6]")
                  }
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
        </nav>
      </header>

      {/* Contenido principal a ancho completo */}
      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col p-2 pb-20 sm:p-3 lg:pb-3">
        {isLoading ? (
          <div className="flex min-h-[420px] flex-1 items-center justify-center rounded-[18px] bg-white shadow-sm">
            <div className="text-center">
              <div className="mx-auto size-9 animate-spin rounded-full border-4 border-[#e4e8ec] border-t-[#c90016]" />
              <p className="mt-3 text-sm font-semibold text-[#6a7680]">
                Cargando clientes...
              </p>
            </div>
          </div>
        ) : !data ? (
          <div className="rounded-[18px] bg-white p-10 text-center text-sm text-[#6a7680] shadow-sm">
            Todavía no hay datos procesados.
          </div>
        ) : (
          <>
            {/* KPIs compactos en una sola fila responsive */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              <Kpi
                icono={<BarChart3 className="size-6" />}
                titulo="Rtdo Semana"
                valor={`${nf1.format(resumen.cumplimiento)} %`}
                className="bg-gradient-to-br from-[#ffffff] to-[#dfe4e8]"
              />
              <Kpi
                icono={<CalendarDays className="size-6" />}
                titulo="Faltante total"
                valor={nf.format(Math.round(resumen.faltante))}
                detalle="unidades"
                className="bg-gradient-to-br from-[#ffffff] to-[#dfe4e8]"
              />
              <Kpi
                icono={<Users className="size-6" />}
                titulo="Total Clientes"
                valor={nf.format(resumen.total)}
              />
              <Kpi
                icono={
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#13b981] text-white">
                    <CheckCircle2 className="size-5" />
                  </span>
                }
                titulo="Clientes con compra"
                valor={nf.format(resumen.conCompra)}
                detalle={`${nf1.format(resumen.pctConCompra)} %`}
              />
              <Kpi
                icono={
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#ef2b2d] text-white">
                    <XCircle className="size-5" />
                  </span>
                }
                titulo="Clientes sin compra"
                valor={nf.format(resumen.sinCompra)}
                detalle={`${nf1.format(resumen.pctSinCompra)} %`}
              />
            </div>

            {/* Controles: Ruta (muy visible) + Buscar + Estado */}
            <div className="mt-3 grid grid-cols-1 gap-2 rounded-[16px] bg-white p-3 shadow-[0_10px_28px_rgba(31,45,61,0.10)] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
              <label className="block rounded-[10px] border-2 border-[#f0202e] bg-[#fff8f8] p-2 shadow-[0_0_0_2px_rgba(240,32,46,0.08)]">
                <span className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#1d2730]">
                  <RouteIcon className="size-4" />
                  Ruta
                </span>
                <select
                  value={ruta}
                  onChange={(e) => actualizarFiltro(() => setRuta(e.target.value))}
                  className="h-10 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-sm font-bold outline-none transition focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
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
                <span className="mb-1 flex items-center gap-1.5 text-[12px] font-black">
                  <Search className="size-4" />
                  Buscar cliente
                </span>
                <input
                  value={busqueda}
                  onChange={(e) => actualizarFiltro(() => setBusqueda(e.target.value))}
                  placeholder="Nombre o código"
                  className="h-10 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-sm outline-none transition placeholder:text-[#9aa4ad] focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-black text-[#1d2730]">
                  Estado
                </span>
                <select
                  value={estado}
                  onChange={(e) =>
                    actualizarFiltro(() => setEstado(e.target.value as FiltroEstado))
                  }
                  className="h-10 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-sm font-semibold outline-none transition focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
                >
                  {ESTADOS.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Listado */}
            <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_10px_28px_rgba(31,45,61,0.10)]">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-2">
                  <Users className="size-6 shrink-0 text-[#111b24]" />
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black">
                      Resultado por Cliente
                    </h2>
                    <p className="text-xs text-[#7b8791]">
                      {filtrados.length} clientes · Ruta{" "}
                      {ruta === "todas" ? "Todas" : ruta}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={exportarCsv}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#d6dde3] bg-[#f7f9fa] px-3 text-xs font-bold text-[#1d2730] transition hover:bg-white"
                  >
                    <Download className="size-4" />
                    Exportar
                  </button>

                  <span className="hidden text-[11px] text-[#5f6b75] sm:inline">
                    {filtrados.length === 0
                      ? "Sin resultados"
                      : `Mostrando ${desde + 1} - ${hasta} de ${filtrados.length} clientes`}
                  </span>

                  <Paginacion
                    pagina={paginaActual}
                    total={totalPaginas}
                    setPagina={setPagina}
                  />
                </div>
              </div>

              {/* Móvil: filas compactas de dos líneas */}
              <div className="px-2 pb-3 lg:hidden">
                {filasPagina.map((c) => (
                  <button
                    key={c.cliente}
                    type="button"
                    onClick={() => abrirCliente(c.cliente)}
                    className="block w-full border-b border-[#e4e8eb] px-2 py-2 text-left transition hover:bg-[#f6f9fb]"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[13px] font-semibold">
                        {c.razon_social}
                      </span>
                      <EstadoVisual cliente={c} />
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-[#5f6b75]">
                      <span className="truncate">
                        #{c.cliente} · Ruta {c.ruta} · Sug.{" "}
                        {nf.format(Math.round(c.sugerido))} · Compra{" "}
                        {nf.format(Math.round(c.comprado))}
                      </span>
                      <span
                        className={
                          "numero-tabular shrink-0 font-bold " +
                          (c.faltante > 0 ? "text-[#d51525]" : "text-[#139b70]")
                        }
                      >
                        Falt. {nf.format(Math.round(c.faltante))}
                      </span>
                    </span>
                  </button>
                ))}

                {filasPagina.length === 0 ? (
                  <div className="py-14 text-center text-sm text-[#7b8791]">
                    No hay clientes con esos filtros.
                  </div>
                ) : null}
              </div>

              {/* Desktop: tabla con encabezado sticky y scroll vertical interno */}
              <div className="hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3 lg:block lg:max-h-[calc(100vh-330px)]">
                <table className="w-full border-separate border-spacing-0 text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#26343e] text-white">
                      <Th>Cliente</Th>
                      <Th>Código</Th>
                      <Th className="text-center">Ruta</Th>
                      <Th className="text-right">Pedido Sugerido</Th>
                      <Th className="text-right">Compra Semana</Th>
                      <Th className="text-right">Faltante</Th>
                      <Th className="text-right">Resultado</Th>
                      <Th className="text-center">Estado</Th>
                      <Th className="w-10" />
                    </tr>
                  </thead>

                  <tbody>
                    {filasPagina.map((c) => (
                      <tr
                        key={c.cliente}
                        tabIndex={0}
                        role="button"
                        onClick={() => abrirCliente(c.cliente)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            abrirCliente(c.cliente);
                          }
                        }}
                        className="group cursor-pointer bg-white transition hover:bg-[#f6f9fb] focus:bg-[#f6f9fb] focus:outline-none"
                      >
                        <Td className="max-w-[260px] font-semibold">
                          <span className="block truncate">{c.razon_social}</span>
                        </Td>
                        <Td className="font-medium">{c.cliente}</Td>
                        <Td className="text-center font-bold">{c.ruta}</Td>
                        <Td className="numero-tabular text-right font-semibold">
                          {nf.format(Math.round(c.sugerido))}
                        </Td>
                        <Td className="numero-tabular text-right font-semibold">
                          {nf.format(Math.round(c.comprado))}
                        </Td>
                        <Td
                          className={
                            "numero-tabular text-right font-bold " +
                            (c.faltante > 0 ? "text-[#d51525]" : "text-[#139b70]")
                          }
                        >
                          {nf.format(Math.round(c.faltante))}
                        </Td>
                        <Td className="numero-tabular text-right font-bold">
                          {c.cumplimientoOficial !== null
                            ? `${nf1.format(c.cumplimientoOficial)} %`
                            : "—"}
                        </Td>
                        <Td className="text-center">
                          <EstadoVisual cliente={c} />
                        </Td>
                        <Td className="text-center">
                          <MoreVertical className="mx-auto size-4 text-[#66727c] opacity-70 transition group-hover:opacity-100" />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filasPagina.length === 0 ? (
                  <div className="py-14 text-center text-sm text-[#7b8791]">
                    No hay clientes con esos filtros.
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Navegación inferior móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dce2e7] bg-white/95 px-2 py-1.5 shadow-[0_-6px_20px_rgba(31,45,61,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-lg justify-around">
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
                    "flex min-w-[58px] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold " +
                    (activo ? "text-[#c90016]" : "text-[#68747e]")
                  }
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
}

function Kpi({
  icono,
  titulo,
  valor,
  detalle,
  className = "bg-white",
}: {
  icono: ReactNode;
  titulo: string;
  valor: string;
  detalle?: string;
  className?: string;
}) {
  return (
    <div
      className={
        "flex min-h-[76px] items-center gap-3 rounded-[14px] border border-white/60 px-3 py-2 shadow-[0_8px_20px_rgba(31,45,61,0.08)] " +
        className
      }
    >
      <div className="shrink-0 text-[#111b24]">{icono}</div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-[#1f2932]">{titulo}</p>
        <div className="flex items-baseline gap-2">
          <p className="numero-tabular text-[22px] font-black leading-tight text-[#0f1820]">
            {valor}
          </p>
          {detalle ? (
            <span className="text-[11px] font-semibold text-[#5f6b75]">{detalle}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DatoCabecera({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1">
      <CalendarDays className="size-4 shrink-0 text-[#111b24]" />
      <div className="leading-tight">
        <p className="text-[9px] font-medium text-[#5f6b75]">{titulo}</p>
        <p className="numero-tabular text-[12px] font-black text-[#111b24]">{valor}</p>
      </div>
    </div>
  );
}

function Separador() {
  return <span className="hidden h-8 w-px bg-[#dce2e7] sm:block" />;
}

function Th({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={
        "whitespace-nowrap border-b border-[#344550] bg-[#26343e] px-2.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wide first:rounded-tl-lg last:rounded-tr-lg " +
        className
      }
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={
        "border-b border-[#e4e8eb] px-2.5 py-2 align-middle text-[11px] " +
        className
      }
    >
      {children}
    </td>
  );
}

function EstadoVisual({ cliente }: { cliente: FilaCliente }) {
  const ambiguo = Boolean(cliente.tieneAmbiguedad);

  const estilo = ambiguo
    ? "bg-[#7c8791] text-white"
    : cliente.estado === "verde"
      ? "bg-[#20bd86] text-white"
      : cliente.estado === "amarillo"
        ? "bg-[#ffd358] text-[#4c3a00]"
        : "bg-[#ff4c55] text-white";

  return (
    <span
      className={
        "inline-flex min-w-[72px] shrink-0 items-center justify-center rounded-[5px] px-2 py-1 text-[10px] font-black " +
        estilo
      }
    >
      {etiquetaEstado(cliente)}
    </span>
  );
}

function etiquetaEstado(cliente: FilaCliente) {
  if (cliente.tieneAmbiguedad) return "Ambiguo";
  if (cliente.estado === "verde") return "Cumplido";
  if (cliente.estado === "amarillo") return "Por cerrar";
  return "Crítico";
}

function Paginacion({
  pagina,
  total,
  setPagina,
}: {
  pagina: number;
  total: number;
  setPagina: (pagina: number) => void;
}) {
  const paginas = paginasVisibles(pagina, total);

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setPagina(Math.max(1, pagina - 1))}
        disabled={pagina <= 1}
        className="flex size-8 items-center justify-center rounded-lg border border-[#dce2e7] bg-white text-[#52606b] disabled:opacity-35"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </button>

      {paginas.map((p, index) =>
        p === "..." ? (
          <span key={`sep-${index}`} className="px-1 text-xs text-[#66727c]">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => setPagina(p)}
            className={
              "flex size-8 items-center justify-center rounded-lg border text-xs font-black transition " +
              (p === pagina
                ? "border-[#d20b1f] bg-[#d20b1f] text-white"
                : "border-[#dce2e7] bg-white text-[#26323c] hover:bg-[#f5f7f9]")
            }
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => setPagina(Math.min(total, pagina + 1))}
        disabled={pagina >= total}
        className="flex size-8 items-center justify-center rounded-lg border border-[#dce2e7] bg-white text-[#52606b] disabled:opacity-35"
        aria-label="Página siguiente"
      >
        <ChevronRight className="size-4" />
      </button>
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
  if (pagina >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];

  return [1, "...", pagina - 1, pagina, pagina + 1, "...", total];
}

function referenciaSemana(fechaIso?: string | null): ReferenciaSemana | null {
  if (!fechaIso) return null;

  const [anio, mes, diaMes] = fechaIso.slice(0, 10).split("-").map(Number);
  if (anio === undefined || mes === undefined || diaMes === undefined) return null;
  if (![anio, mes, diaMes].every(Number.isFinite)) return null;

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
    ((jueves.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7,
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

function valorCsv(valor: unknown) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}
