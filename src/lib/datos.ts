import { supabase } from "@/integrations/supabase/client";

export type Semaforo = "critico" | "amarillo" | "verde";

export function semaforo(cumplimiento: number | null | undefined): Semaforo {
  const v = cumplimiento ?? 0;
  if (v >= 100) return "verde";
  if (v >= 70) return "amarillo";
  return "critico";
}

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  critico: "Crítico",
  amarillo: "Por cerrar",
  verde: "Cumplido",
};

export function claseSemaforo(estado: Semaforo): string {
  return estado === "verde"
    ? "bg-exito-soft text-exito border-exito/30"
    : estado === "amarillo"
      ? "bg-alerta-soft text-alerta-foreground border-alerta/40"
      : "bg-critico-soft text-critico border-critico/30";
}

export function claseBarra(estado: Semaforo): string {
  return estado === "verde" ? "bg-exito" : estado === "amarillo" ? "bg-alerta" : "bg-critico";
}

export const nf = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export type Equivalencia = {
  mpr: string;
  descripcion: string | null;
  unidades_por_pack: number | null;
  updated_at: string;
};

export type Importacion = {
  id: string;
  created_at: string;
  archivo_consolidado: string | null;
  archivo_detalle: string | null;
  filas_consolidado: number;
  filas_detalle: number;
  estado: string;
  notas: string | null;
};

export type FilaDetalle = {
  id: number;
  cliente: string;
  razon_social: string | null;
  ruta: string | null;
  mpr: string;
  descripcion: string | null;
  pedido: number;
  sugerencia: number;
  faltante: number;
  cumplimientoPct?: number | null;
  estadoCruceCliente?: string | null;
  fechaVentas?: string | null;
};

export type FilaCliente = {
  cliente: string;
  razon_social: string;
  ruta: string;
  cumplimientoOficial: number | null;
  sugerido: number;
  comprado: number;
  faltante: number;
  faltantePacks: number | null;
  equivalenciaPendiente: boolean;
  estado: Semaforo;
  estadoVista?: string | null;
  tieneAmbiguedad?: boolean;
  fechaVentas?: string | null;
};

export async function traerUltimaImportacion(): Promise<Importacion | null> {
  const { data, error } = await supabase
    .from("importaciones")
    .select("*")
    .eq("estado", "procesada")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Importacion | null;
}

export async function traerImportaciones(): Promise<Importacion[]> {
  const { data, error } = await supabase
    .from("importaciones")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Importacion[];
}

export async function traerEquivalencias(): Promise<Equivalencia[]> {
  const { data, error } = await supabase.from("equivalencias_mpr").select("*").order("mpr");
  if (error) throw error;
  return (data ?? []) as Equivalencia[];
}

type VistaCliente = {
  cliente: string | number;
  razon_social: string | null;
  ruta: string | number | null;
  sugerido: number | string | null;
  comprado: number | string | null;
  faltante: number | string | null;
  cumplimiento_pct: number | string | null;
  estado: string | null;
  tiene_ambiguedad: boolean | null;
  fecha_ventas: string | null;
};

type VistaDetalle = {
  cliente: string | number;
  razon_social: string | null;
  ruta: string | number | null;
  mpr: string;
  sugerencia: number | string | null;
  comprado: number | string | null;
  faltante: number | string | null;
  cumplimiento_pct: number | string | null;
  estado_cruce_cliente: string | null;
  fecha_ventas: string | null;
};

type Orden = {
  columna: string;
  ascending?: boolean;
};

async function traerVistaCompleta<T>(tabla: string, columnas: string, ordenes: Orden[]): Promise<T[]> {
  const paso = 1000;
  let desde = 0;
  const acumulado: T[] = [];

  for (;;) {
    let consulta = (supabase as any).from(tabla).select(columnas);
    for (const orden of ordenes) {
      consulta = consulta.order(orden.columna, { ascending: orden.ascending ?? true });
    }

    const { data, error } = await consulta.range(desde, desde + paso - 1);
    if (error) throw error;

    const lote = (data ?? []) as T[];
    acumulado.push(...lote);

    if (lote.length < paso) break;
    desde += paso;
  }

  return acumulado;
}

export type Cruce = {
  importacion: Importacion;
  clientes: FilaCliente[];
  detalle: FilaDetalle[];
  equivalencias: Map<string, number>;
  descripcionesEquiv: Map<string, string>;
  cumplimientoGeneral: number | null;
};

/**
 * Capa de lectura automática.
 *
 * La app ya no recalcula Pedido Sugerido desde la última importación: toma los
 * resultados procesados por las vistas SQL que consumen las ventas cargadas por
 * Power Automate. Se conserva la misma interfaz Cruce/FilaCliente/FilaDetalle
 * para no romper las pantallas existentes.
 */
export async function traerCruce(): Promise<Cruce | null> {
  const [clientesVista, detalleVista, equivalencias, ultimaImportacion] = await Promise.all([
    traerVistaCompleta<VistaCliente>(
      "vw_pedido_sugerido_clientes",
      "cliente,razon_social,ruta,sugerido,comprado,faltante,cumplimiento_pct,estado,tiene_ambiguedad,fecha_ventas",
      [
        { columna: "cumplimiento_pct", ascending: true },
        { columna: "cliente", ascending: true },
      ],
    ),
    traerVistaCompleta<VistaDetalle>(
      "vw_pedido_sugerido_actual",
      "cliente,razon_social,ruta,mpr,sugerencia,comprado,faltante,cumplimiento_pct,estado_cruce_cliente,fecha_ventas",
      [
        { columna: "cliente", ascending: true },
        { columna: "mpr", ascending: true },
      ],
    ),
    traerEquivalencias(),
    traerUltimaImportacion(),
  ]);

  if (clientesVista.length === 0 && detalleVista.length === 0) return null;

  const mapaEquiv = new Map<string, number>();
  const descripciones = new Map<string, string>();
  for (const e of equivalencias) {
    if (e.unidades_por_pack && e.unidades_por_pack > 0) {
      mapaEquiv.set(e.mpr, Number(e.unidades_por_pack));
    }
    if (e.descripcion) descripciones.set(e.mpr, e.descripcion);
  }

  const detalle: FilaDetalle[] = detalleVista.map((fila, index) => ({
    id: index + 1,
    cliente: String(fila.cliente),
    razon_social: fila.razon_social,
    ruta: fila.ruta === null || fila.ruta === undefined ? null : String(fila.ruta),
    mpr: fila.mpr,
    descripcion: descripciones.get(fila.mpr) ?? null,
    // Se mantiene el nombre "pedido" porque las pantallas actuales ya lo usan.
    // En esta versión representa la compra real calculada por la vista SQL.
    pedido: Math.max(Number(fila.comprado ?? 0), 0),
    sugerencia: Math.max(Number(fila.sugerencia ?? 0), 0),
    faltante: Math.max(Number(fila.faltante ?? 0), 0),
    cumplimientoPct:
      fila.cumplimiento_pct === null || fila.cumplimiento_pct === undefined
        ? null
        : Math.max(Number(fila.cumplimiento_pct), 0),
    estadoCruceCliente: fila.estado_cruce_cliente,
    fechaVentas: fila.fecha_ventas,
  }));

  const detallePorCliente = new Map<string, FilaDetalle[]>();
  for (const fila of detalle) {
    const lista = detallePorCliente.get(fila.cliente);
    if (lista) lista.push(fila);
    else detallePorCliente.set(fila.cliente, [fila]);
  }

  const clientes: FilaCliente[] = clientesVista.map((fila) => {
    const cliente = String(fila.cliente);
    const cumplimiento =
      fila.cumplimiento_pct === null || fila.cumplimiento_pct === undefined
        ? null
        : Math.max(Math.min(Number(fila.cumplimiento_pct), 100), 0);

    const filas = detallePorCliente.get(cliente) ?? [];
    let packs = 0;
    let pendiente = false;

    for (const det of filas) {
      if (det.faltante <= 0) continue;
      const unidadesPorPack = mapaEquiv.get(det.mpr);
      if (unidadesPorPack && unidadesPorPack > 0) {
        packs += det.faltante / unidadesPorPack;
      } else {
        pendiente = true;
      }
    }

    const estadoVista = fila.estado ?? null;
    const ambiguo = Boolean(fila.tiene_ambiguedad) || estadoVista === "AMBIGUO";

    return {
      cliente,
      razon_social: fila.razon_social ?? "Sin razón social",
      ruta: fila.ruta === null || fila.ruta === undefined ? "Sin ruta" : String(fila.ruta),
      cumplimientoOficial: cumplimiento,
      sugerido: Math.max(Number(fila.sugerido ?? 0), 0),
      comprado: Math.max(Number(fila.comprado ?? 0), 0),
      faltante: Math.max(Number(fila.faltante ?? 0), 0),
      faltantePacks: packs > 0 ? packs : null,
      equivalenciaPendiente: pendiente,
      // Hasta que la UI tenga una etiqueta propia para AMBIGUO, se muestra como
      // crítico para que nunca sea interpretado como cumplido.
      estado: ambiguo ? "critico" : semaforo(cumplimiento),
      estadoVista,
      tieneAmbiguedad: ambiguo,
      fechaVentas: fila.fecha_ventas,
    };
  });

  clientes.sort((a, b) => {
    if (a.tieneAmbiguedad !== b.tieneAmbiguedad) return a.tieneAmbiguedad ? -1 : 1;
    return (a.cumplimientoOficial ?? 0) - (b.cumplimientoOficial ?? 0);
  });

  // Cumplimiento general ponderado: comprado aplicado / sugerido total.
  const sugeridoTotal = clientes.reduce((acc, c) => acc + c.sugerido, 0);
  const compradoTotal = clientes.reduce((acc, c) => acc + Math.min(c.comprado, c.sugerido), 0);
  const cumplimientoGeneral = sugeridoTotal > 0 ? Math.min((compradoTotal / sugeridoTotal) * 100, 100) : null;

  const fechas = [
    ...clientes.map((c) => c.fechaVentas).filter((v): v is string => Boolean(v)),
    ...detalle.map((d) => d.fechaVentas).filter((v): v is string => Boolean(v)),
  ].sort();
  const fechaVentas = fechas.length ? fechas[fechas.length - 1] : null;

  // Se conserva el objeto importacion porque varias pantallas existentes lo
  // esperan. La fecha visible se sincroniza con la última fecha de ventas.
  const importacion: Importacion = {
    id: ultimaImportacion?.id ?? `automatico-${fechaVentas ?? "sin-fecha"}`,
    created_at: fechaVentas ? `${fechaVentas}T12:00:00` : (ultimaImportacion?.created_at ?? new Date().toISOString()),
    archivo_consolidado: ultimaImportacion?.archivo_consolidado ?? "Actualización automática",
    archivo_detalle: ultimaImportacion?.archivo_detalle ?? "Power Automate / SCAU",
    filas_consolidado: clientes.length,
    filas_detalle: detalle.length,
    estado: "procesada",
    notas: "Datos calculados automáticamente desde vw_pedido_sugerido_clientes y vw_pedido_sugerido_actual.",
  };

  return {
    importacion,
    clientes,
    detalle,
    equivalencias: mapaEquiv,
    descripcionesEquiv: descripciones,
    cumplimientoGeneral,
  };
}
