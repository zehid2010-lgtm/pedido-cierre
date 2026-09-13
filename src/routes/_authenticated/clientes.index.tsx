import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bookmark,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  LogOut,
  MoreVertical,
  RotateCcw,
  Route as RouteIcon,
  Search,
  SlidersHorizontal,
  Upload,
  Users,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { nf, nf1, traerCruce, type FilaCliente, type Semaforo } from "@/lib/datos";

type FiltroEstado = Semaforo | "ambiguo" | "todos";

type Filtros = {
  ruta: string;
  jefe: string;
  territorio: string;
  cedi: string;
  estado: FiltroEstado;
  busqueda: string;
};

type MetaCliente = {
  jefe: string;
  territorio: string;
  cedi: string;
};

type MetadataFuente = {
  porCliente: Map<string, MetaCliente>;
  jefes: string[];
  territorios: string[];
  cedis: string[];
  zona: string;
  semanaFuente: string | null;
};

type ReferenciaSemana = {
  periodo: string;
  semana: string;
  desde: string;
  hasta: string;
};

const FILTROS_INICIALES: Filtros = {
  ruta: "todas",
  jefe: "todos",
  territorio: "todos",
  cedi: "todos",
  estado: "todos",
  busqueda: "",
};

const FILAS_POR_PAGINA = 20;

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

  const { data: metadata } = useQuery({
    queryKey: ["metadata-clientes", importacionId],
    enabled: Boolean(data && idEsUuid),
    queryFn: async (): Promise<MetadataFuente> => {
      const { data: consolidado, error: errorConsolidado } = await supabase
        .from("origen_consolidado")
        .select("data")
        .eq("importacion_id", importacionId)
        .range(0, 999);

      if (errorConsolidado) throw errorConsolidado;

      const porCliente = new Map<string, MetaCliente>();
      const jefes = new Set<string>();
      const territorios = new Set<string>();
      const cedis = new Set<string>();

      for (const fila of consolidado ?? []) {
        const raw = (fila.data ?? {}) as Record<string, unknown>;
        const outCl = texto(raw["Out-CL"]);
        const cliente = normalizarClienteId(outCl);

        if (!cliente) continue;

        const jefe = texto(raw["Jefe"]);
        const territorio = texto(raw["Territorio"]);
        const cedi = texto(raw["Cedi"]);

        porCliente.set(cliente, {
          jefe: jefe || "—",
          territorio: territorio || "—",
          cedi: cedi || "—",
        });

        if (jefe && jefe.toLowerCase() !== "total") jefes.add(jefe);
        if (territorio && territorio.toLowerCase() !== "total") territorios.add(territorio);
        if (cedi && cedi.toLowerCase() !== "total") cedis.add(cedi);
      }

      const { data: muestraDetalle } = await supabase
        .from("origen_detalle")
        .select("data")
        .eq("importacion_id", importacionId)
        .limit(1);

      const rawDetalle = ((muestraDetalle?.[0]?.data ?? {}) as Record<string, unknown>);
      const zona = texto(rawDetalle["Zona"]) || "Arg Sur";
      const semana = rawDetalle["Semana"];

      return {
        porCliente,
        jefes: Array.from(jefes).sort((a, b) => a.localeCompare(b, "es")),
        territorios: Array.from(territorios).sort((a, b) => a.localeCompare(b, "es")),
        cedis: Array.from(cedis).sort((a, b) => a.localeCompare(b, "es")),
        zona,
        semanaFuente:
          semana === null || semana === undefined || semana === ""
            ? null
            : String(semana),
      };
    },
  });

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [borrador, setBorrador] = useState<Filtros>(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(1);

  const rutas = useMemo(
    () =>
      Array.from(new Set((data?.clientes ?? []).map((c) => c.ruta))).sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true }),
      ),
    [data],
  );

  const filtrados = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();

    return (data?.clientes ?? []).filter((c) => {
      const meta = metadata?.porCliente.get(normalizarClienteId(c.cliente));
      const coincideEstado =
        filtros.estado === "todos"
          ? true
          : filtros.estado === "ambiguo"
            ? Boolean(c.tieneAmbiguedad)
            : !c.tieneAmbiguedad && c.estado === filtros.estado;

      return (
        (filtros.ruta === "todas" || c.ruta === filtros.ruta) &&
        (filtros.jefe === "todos" || meta?.jefe === filtros.jefe) &&
        (filtros.territorio === "todos" || meta?.territorio === filtros.territorio) &&
        (filtros.cedi === "todos" || meta?.cedi === filtros.cedi) &&
        coincideEstado &&
        (!q ||
          c.cliente.toLowerCase().includes(q) ||
          c.razon_social.toLowerCase().includes(q))
      );
    });
  }, [data, filtros, metadata]);

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
    return metadata?.semanaFuente
      ? { ...base, semana: metadata.semanaFuente }
      : base;
  }, [data?.importacion.created_at, metadata?.semanaFuente]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / FILAS_POR_PAGINA));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const paginaActual = Math.min(pagina, totalPaginas);
  const desde = (paginaActual - 1) * FILAS_POR_PAGINA;
  const hasta = Math.min(desde + FILAS_POR_PAGINA, filtrados.length);
  const filasPagina = filtrados.slice(desde, hasta);

  const aplicarFiltros = () => {
    setFiltros(borrador);
    setPagina(1);
  };

  const limpiarFiltros = () => {
    setBorrador(FILTROS_INICIALES);
    setFiltros(FILTROS_INICIALES);
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
      "Jefe",
      "Territorio",
      "CEDI",
      "Pedido Sugerido",
      "Compra Semana",
      "Faltante",
      "Resultado",
      "Estado",
    ];

    const filas = filtrados.map((c) => {
      const meta = metadata?.porCliente.get(normalizarClienteId(c.cliente));

      return [
        c.razon_social,
        c.cliente,
        c.ruta,
        meta?.jefe ?? "",
        meta?.territorio ?? "",
        meta?.cedi ?? "",
        Math.round(c.sugerido),
        Math.round(c.comprado),
        Math.round(c.faltante),
        c.cumplimientoOficial ?? "",
        etiquetaEstado(c),
      ];
    });

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

  const panelFiltros = (
    <FiltrosPanel
      borrador={borrador}
      setBorrador={setBorrador}
      rutas={rutas}
      jefes={metadata?.jefes ?? []}
      territorios={metadata?.territorios ?? []}
      cedis={metadata?.cedis ?? []}
      periodo={referencia?.periodo ?? "—"}
      semana={referencia?.semana ?? "—"}
      zona={metadata?.zona ?? "Arg Sur"}
      aplicar={aplicarFiltros}
      limpiar={limpiarFiltros}
    />
  );

  return (
    <div className="min-h-screen bg-[#e9eef3] text-[#18212a]">
      <div className="mx-auto max-w-[1580px] p-2 sm:p-3">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-3">
          <aside className="hidden lg:block">
            <div className="sticky top-3 rounded-[18px] bg-[#c90016] p-2.5 shadow-[0_12px_35px_rgba(0,0,0,0.16)]">
              <Link
                to="/panel"
                className="flex h-[78px] flex-col items-center justify-center rounded-[14px] bg-white text-[#c90016] shadow-sm"
              >
                <Building2 className="size-8" strokeWidth={2.4} />
                <span className="mt-1 text-[13px] font-black tracking-tight">
                  ARCA CONTINENTAL
                </span>
              </Link>

              <div className="mt-2 overflow-hidden rounded-[12px] bg-white">
                <div className="flex items-center gap-2 bg-[#d50b1e] px-3 py-2 text-sm font-extrabold text-white">
                  <SlidersHorizontal className="size-4" />
                  Filtros
                </div>
                <div className="p-2.5">{panelFiltros}</div>
              </div>

              <nav className="mt-2 grid grid-cols-5 gap-1 rounded-[12px] bg-white p-1.5">
                {nav
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const activo = item.to === "/clientes";
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={item.label}
                        className={
                          "flex min-w-0 flex-col items-center justify-center rounded-lg px-1 py-2 text-[9px] font-bold transition " +
                          (activo
                            ? "bg-[#c90016] text-white"
                            : "text-[#5b6670] hover:bg-[#f1f4f6]")
                        }
                      >
                        <Icon className="size-4" />
                        <span className="mt-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
              </nav>
            </div>
          </aside>

          <section className="min-w-0">
            <header className="rounded-[18px] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(31,45,61,0.10)] sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-semibold tracking-tight sm:text-[25px]">
                    <span className="font-black">PEDIDO SUGERIDO:</span>{" "}
                    ARCA | Tucumán | Planta Tucumán
                  </h1>
                  <p className="mt-0.5 text-xs text-[#6a7680] lg:hidden">
                    Resultado por Cliente
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                  <DatoCabecera
                    icono={<CalendarDays className="size-4" />}
                    titulo="Período"
                    valor={referencia?.periodo ?? "—"}
                  />
                  <Separador />
                  <DatoCabecera
                    icono={<CalendarDays className="size-4" />}
                    titulo="Semana"
                    valor={referencia?.semana ?? "—"}
                  />
                  <Separador />
                  <DatoCabecera
                    icono={<CalendarDays className="size-4" />}
                    titulo=""
                    valor={
                      referencia
                        ? `${referencia.desde} al ${referencia.hasta}`
                        : "—"
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
            </header>

            <details className="mt-3 rounded-[16px] bg-white shadow-sm lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-extrabold text-[#c90016]">
                <Filter className="size-4" />
                Filtros
              </summary>
              <div className="border-t border-[#e5e9ed] p-4">{panelFiltros}</div>
            </details>

            {isLoading ? (
              <div className="mt-3 flex min-h-[420px] items-center justify-center rounded-[18px] bg-white shadow-sm">
                <div className="text-center">
                  <div className="mx-auto size-9 animate-spin rounded-full border-4 border-[#e4e8ec] border-t-[#c90016]" />
                  <p className="mt-3 text-sm font-semibold text-[#6a7680]">
                    Cargando clientes...
                  </p>
                </div>
              </div>
            ) : !data ? (
              <div className="mt-3 rounded-[18px] bg-white p-10 text-center text-sm text-[#6a7680] shadow-sm">
                Todavía no hay datos procesados.
              </div>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2.5 xl:grid-cols-5">
                  <Kpi
                    icono={<BarChart3 className="size-7" />}
                    titulo="Rtdo Semana"
                    valor={`${nf1.format(resumen.cumplimiento)} %`}
                    className="bg-gradient-to-br from-[#ffffff] to-[#dfe4e8]"
                  />
                  <Kpi
                    icono={<CalendarDays className="size-7" />}
                    titulo="Faltante total"
                    valor={nf.format(Math.round(resumen.faltante))}
                    detalle="unidades"
                    className="bg-gradient-to-br from-[#ffffff] to-[#dfe4e8]"
                  />
                  <Kpi
                    icono={<Users className="size-7" />}
                    titulo="Total Clientes"
                    valor={nf.format(resumen.total)}
                  />
                  <Kpi
                    icono={
                      <span className="flex size-10 items-center justify-center rounded-full bg-[#13b981] text-white">
                        <CheckCircle2 className="size-6" />
                      </span>
                    }
                    titulo="Clientes con compra"
                    valor={nf.format(resumen.conCompra)}
                    detalle={`${nf1.format(resumen.pctConCompra)} %`}
                  />
                  <Kpi
                    icono={
                      <span className="flex size-10 items-center justify-center rounded-full bg-[#ef2b2d] text-white">
                        <XCircle className="size-6" />
                      </span>
                    }
                    titulo="Clientes sin compra"
                    valor={nf.format(resumen.sinCompra)}
                    detalle={`${nf1.format(resumen.pctSinCompra)} %`}
                  />
                </div>

                <section className="mt-3 overflow-hidden rounded-[18px] bg-white shadow-[0_10px_28px_rgba(31,45,61,0.10)]">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                      <Users className="size-6 text-[#111b24]" />
                      <div>
                        <h2 className="text-lg font-black">Resultado por Cliente</h2>
                        <p className="text-xs text-[#7b8791]">
                          {filtrados.length} clientes · Ruta{" "}
                          {filtros.ruta === "todas" ? "Todas" : filtros.ruta}
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

                  <div className="overflow-x-auto px-3 pb-3 sm:px-4">
                    <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-[12px]">
                      <thead>
                        <tr className="bg-[#26343e] text-white">
                          <Th className="w-10 rounded-l-lg text-center">#</Th>
                          <Th>Cliente</Th>
                          <Th>Código</Th>
                          <Th className="text-center">Ruta</Th>
                          <Th>Jefe</Th>
                          <Th>Territorio</Th>
                          <Th className="text-right">Pedido Sugerido</Th>
                          <Th className="text-right">Compra Semana</Th>
                          <Th className="text-right">Faltante</Th>
                          <Th className="text-right">Resultado</Th>
                          <Th className="text-center">Estado</Th>
                          <Th className="w-10 rounded-r-lg" />
                        </tr>
                      </thead>

                      <tbody>
                        {filasPagina.map((c, index) => {
                          const meta = metadata?.porCliente.get(
                            normalizarClienteId(c.cliente),
                          );
                          return (
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
                              <Td className="text-center text-[#5c6872]">
                                {desde + index + 1}
                              </Td>
                              <Td className="max-w-[220px] font-semibold">
                                <span className="block truncate">{c.razon_social}</span>
                              </Td>
                              <Td className="font-medium">{c.cliente}</Td>
                              <Td className="text-center font-bold">{c.ruta}</Td>
                              <Td className="max-w-[180px]">
                                <span className="block truncate">
                                  {meta?.jefe ?? "—"}
                                </span>
                              </Td>
                              <Td>{meta?.territorio ?? "Tucumán"}</Td>
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
                          );
                        })}
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
          </section>
        </div>
      </div>

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

function FiltrosPanel({
  borrador,
  setBorrador,
  rutas,
  jefes,
  territorios,
  cedis,
  periodo,
  semana,
  zona,
  aplicar,
  limpiar,
}: {
  borrador: Filtros;
  setBorrador: (valor: Filtros) => void;
  rutas: string[];
  jefes: string[];
  territorios: string[];
  cedis: string[];
  periodo: string;
  semana: string;
  zona: string;
  aplicar: () => void;
  limpiar: () => void;
}) {
  const actualizar = <K extends keyof Filtros>(campo: K, valor: Filtros[K]) => {
    setBorrador({ ...borrador, [campo]: valor });
  };

  return (
    <div className="space-y-2.5">
      <FiltroSelect titulo="Período" valor={periodo} deshabilitado />
      <FiltroSelect titulo="Semana" valor={semana} deshabilitado />

      <FiltroSelect
        titulo="Jefe"
        valor={borrador.jefe}
        onChange={(v) => actualizar("jefe", v)}
        opciones={[
          { valor: "todos", etiqueta: "Todos" },
          ...jefes.map((j) => ({ valor: j, etiqueta: j })),
        ]}
      />

      <div className="rounded-[10px] border-2 border-[#f0202e] bg-[#fff8f8] p-2 shadow-[0_0_0_2px_rgba(240,32,46,0.08)]">
        <label className="mb-1 flex items-center gap-1.5 text-[12px] font-black text-[#1d2730]">
          <RouteIcon className="size-4" />
          Ruta
        </label>
        <select
          value={borrador.ruta}
          onChange={(e) => actualizar("ruta", e.target.value)}
          className="h-9 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-sm font-semibold outline-none transition focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
        >
          <option value="todas">Todas las rutas</option>
          {rutas.map((r) => (
            <option key={r} value={r}>
              Ruta {r}
            </option>
          ))}
        </select>
      </div>

      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-[12px] font-black">
          <Search className="size-4" />
          Buscar cliente
        </span>
        <input
          value={borrador.busqueda}
          onChange={(e) => actualizar("busqueda", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") aplicar();
          }}
          placeholder="Nombre, código o razón social"
          className="h-9 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-xs outline-none transition placeholder:text-[#9aa4ad] focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
        />
      </label>

      <FiltroSelect
        titulo="Territorio"
        valor={borrador.territorio}
        onChange={(v) => actualizar("territorio", v)}
        opciones={[
          { valor: "todos", etiqueta: "Todos" },
          ...territorios.map((t) => ({ valor: t, etiqueta: t })),
        ]}
      />

      <FiltroSelect titulo="Zona" valor={zona} deshabilitado />

      <FiltroSelect
        titulo="CEDI"
        valor={borrador.cedi}
        onChange={(v) => actualizar("cedi", v)}
        opciones={[
          { valor: "todos", etiqueta: "Todos" },
          ...cedis.map((c) => ({ valor: c, etiqueta: c })),
        ]}
      />

      <FiltroSelect
        titulo="Estado"
        valor={borrador.estado}
        onChange={(v) => actualizar("estado", v as FiltroEstado)}
        opciones={[
          { valor: "todos", etiqueta: "Todos" },
          { valor: "critico", etiqueta: "Críticos" },
          { valor: "amarillo", etiqueta: "Por cerrar" },
          { valor: "verde", etiqueta: "Cumplidos" },
          { valor: "ambiguo", etiqueta: "Ambiguos" },
        ]}
      />

      <button
        type="button"
        onClick={aplicar}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#d20b1f] text-sm font-black text-white shadow-sm transition hover:bg-[#ba0014]"
      >
        <Filter className="size-4" />
        Aplicar filtros
      </button>

      <button
        type="button"
        onClick={limpiar}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#f0f3f5] text-sm font-black text-[#26323c] transition hover:bg-[#e5eaee]"
      >
        <RotateCcw className="size-4" />
        Limpiar
      </button>
    </div>
  );
}

function FiltroSelect({
  titulo,
  valor,
  opciones,
  onChange,
  deshabilitado = false,
}: {
  titulo: string;
  valor: string;
  opciones?: { valor: string; etiqueta: string }[];
  onChange?: (valor: string) => void;
  deshabilitado?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-black text-[#1d2730]">
        {titulo}
      </span>
      <select
        value={valor}
        disabled={deshabilitado}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-9 w-full rounded-lg border border-[#ccd5dc] bg-white px-2.5 text-sm font-medium outline-none transition disabled:cursor-default disabled:bg-[#f7f9fa] disabled:text-[#49555f] focus:border-[#c90016] focus:ring-2 focus:ring-[#c90016]/15"
      >
        {deshabilitado ? (
          <option value={valor}>{valor}</option>
        ) : (
          opciones?.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))
        )}
      </select>
    </label>
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
        "flex min-h-[96px] items-center justify-center gap-3 rounded-[16px] border border-white/60 px-4 py-3 shadow-[0_8px_20px_rgba(31,45,61,0.08)] " +
        className
      }
    >
      <div className="shrink-0 text-[#111b24]">{icono}</div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-[#1f2932]">{titulo}</p>
        <div className="flex items-baseline gap-2">
          <p className="numero-tabular text-[27px] font-black leading-tight text-[#0f1820]">
            {valor}
          </p>
          {detalle ? (
            <span className="text-[12px] font-semibold text-[#5f6b75]">{detalle}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DatoCabecera({
  icono,
  titulo,
  valor,
}: {
  icono: ReactNode;
  titulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="text-[#111b24]">{icono}</span>
      <div className="leading-tight">
        {titulo ? (
          <p className="text-[9px] font-medium text-[#5f6b75]">{titulo}</p>
        ) : null}
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
        "whitespace-nowrap border-b border-[#344550] px-2.5 py-2.5 text-left text-[10px] font-black uppercase tracking-wide " +
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
        "inline-flex min-w-[78px] items-center justify-center rounded-[5px] px-2 py-1 text-[10px] font-black " +
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

function texto(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function normalizarClienteId(valor: string) {
  const match = valor.match(/\d+/);
  if (!match) return "";
  const limpio = match[0].replace(/^0+/, "");
  return limpio || "0";
}

function valorCsv(valor: unknown) {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}
