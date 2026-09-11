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

async function traerTodo<T>(
  tabla: "clientes_consolidado" | "detalle_mpr",
  columnas: string,
  importacionId: string,
): Promise<T[]> {
  const paso = 1000;
  let desde = 0;
  const acumulado: T[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from(tabla)
      .select(columnas)
      .eq("importacion_id", importacionId)
      .order("id")
      .range(desde, desde + paso - 1);
    if (error) throw error;
    const lote = (data ?? []) as unknown as T[];
    acumulado.push(...lote);
    if (lote.length < paso) break;
    desde += paso;
  }
  return acumulado;
}

export type Consolidado = {
  cliente: string;
  razon_social: string | null;
  ruta: string | null;
  cumplimiento: number | null;
};

export type Cruce = {
  importacion: Importacion;
  clientes: FilaCliente[];
  detalle: FilaDetalle[];
  equivalencias: Map<string, number>;
  descripcionesEquiv: Map<string, string>;
  cumplimientoGeneral: number | null;
};

/**
 * Capa de procesamiento: cruza la fuente consolidada (oficial) con el detalle
 * por MPR. Nunca modifica las fuentes originales.
 */
export async function traerCruce(): Promise<Cruce | null> {
  const importacion = await traerUltimaImportacion();
  if (!importacion) return null;

  const [consolidado, detalle, equivalencias] = await Promise.all([
    traerTodo<Consolidado>("clientes_consolidado", "cliente,razon_social,ruta,cumplimiento", importacion.id),
    traerTodo<FilaDetalle>(
      "detalle_mpr",
      "id,cliente,razon_social,ruta,mpr,descripcion,pedido,sugerencia,faltante",
      importacion.id,
    ),
    traerEquivalencias(),
  ]);

  const mapaEquiv = new Map<string, number>();
  const descripciones = new Map<string, string>();
  for (const e of equivalencias) {
    if (e.unidades_por_pack && e.unidades_por_pack > 0) mapaEquiv.set(e.mpr, Number(e.unidades_por_pack));
    if (e.descripcion) descripciones.set(e.mpr, e.descripcion);
  }

  const porCliente = new Map<string, FilaDetalle[]>();
  for (const fila of detalle) {
    const lista = porCliente.get(fila.cliente);
    if (lista) lista.push(fila);
    else porCliente.set(fila.cliente, [fila]);
  }

  const oficial = new Map(consolidado.map((c) => [c.cliente, c]));
  const claves = new Set<string>([...oficial.keys(), ...porCliente.keys()]);

  const clientes: FilaCliente[] = [];
  for (const clave of claves) {
    const filas = porCliente.get(clave) ?? [];
    const info = oficial.get(clave);
    const sugerido = filas.reduce((a, f) => a + Number(f.sugerencia ?? 0), 0);
    const comprado = filas.reduce((a, f) => a + Number(f.pedido ?? 0), 0);
    // El faltante se suma por MPR: la sobrecompra de un MPR no compensa a otro.
    const faltante = filas.reduce((a, f) => a + Number(f.faltante ?? 0), 0);

    let packs = 0;
    let pendiente = false;
    for (const f of filas) {
      if (Number(f.faltante ?? 0) <= 0) continue;
      const uxp = mapaEquiv.get(f.mpr);
      if (uxp) packs += Number(f.faltante) / uxp;
      else pendiente = true;
    }

    const cumplimientoOficial =
      info?.cumplimiento !== null && info?.cumplimiento !== undefined
        ? Number(info.cumplimiento)
        : sugerido > 0
          ? Math.min((comprado / sugerido) * 100, 999)
          : null;

    clientes.push({
      cliente: clave,
      razon_social: info?.razon_social ?? filas[0]?.razon_social ?? "Sin razón social",
      ruta: info?.ruta ?? filas[0]?.ruta ?? "Sin ruta",
      cumplimientoOficial,
      sugerido,
      comprado,
      faltante,
      faltantePacks: packs > 0 ? packs : null,
      equivalenciaPendiente: pendiente,
      estado: semaforo(cumplimientoOficial),
    });
  }

  clientes.sort((a, b) => (a.cumplimientoOficial ?? 0) - (b.cumplimientoOficial ?? 0));

  const conDato = clientes.filter((c) => c.cumplimientoOficial !== null);
  const cumplimientoGeneral = conDato.length
    ? conDato.reduce((a, c) => a + (c.cumplimientoOficial ?? 0), 0) / conDato.length
    : null;

  return {
    importacion,
    clientes,
    detalle,
    equivalencias: mapaEquiv,
    descripcionesEquiv: descripciones,
    cumplimientoGeneral,
  };
}
