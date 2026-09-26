import { localGet, localRemove, localSet } from "@/lib/local-db";

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

export type Cruce = {
  importacion: Importacion;
  clientes: FilaCliente[];
  detalle: FilaDetalle[];
  equivalencias: Map<string, number>;
  descripcionesEquiv: Map<string, string>;
  cumplimientoGeneral: number | null;
};

type SnapshotLocal = {
  version: 1;
  importacion: Importacion;
  clientes: FilaCliente[];
  detalle: FilaDetalle[];
};

export type RespaldoLocal = {
  formato: "pedido-sugerido-local-v1";
  exportado_at: string;
  snapshot: SnapshotLocal;
  equivalencias: Equivalencia[];
  importaciones: Importacion[];
};

const KEY_SNAPSHOT = "snapshot-v1";
const KEY_EQUIVALENCIAS = "equivalencias-v1";
const KEY_IMPORTACIONES = "importaciones-v1";

export async function traerUltimaImportacion(): Promise<Importacion | null> {
  const snapshot = await localGet<SnapshotLocal>(KEY_SNAPSHOT);
  return snapshot?.importacion ?? null;
}

export async function traerImportaciones(): Promise<Importacion[]> {
  return (await localGet<Importacion[]>(KEY_IMPORTACIONES)) ?? [];
}

export async function traerEquivalencias(): Promise<Equivalencia[]> {
  const filas = (await localGet<Equivalencia[]>(KEY_EQUIVALENCIAS)) ?? [];
  return [...filas].sort((a, b) => a.mpr.localeCompare(b.mpr, "es", { numeric: true }));
}

export async function guardarEquivalenciaLocal(
  fila: Pick<Equivalencia, "mpr" | "descripcion" | "unidades_por_pack">,
): Promise<void> {
  const mpr = fila.mpr.trim();
  if (!mpr) throw new Error("Ingresá un MPR.");

  const actuales = await traerEquivalencias();
  const nueva: Equivalencia = {
    mpr,
    descripcion: fila.descripcion,
    unidades_por_pack: fila.unidades_por_pack,
    updated_at: new Date().toISOString(),
  };

  const indice = actuales.findIndex((e) => e.mpr === mpr);
  if (indice >= 0) actuales[indice] = nueva;
  else actuales.push(nueva);

  await localSet(KEY_EQUIVALENCIAS, actuales);
}

export async function guardarImportacionLocal(args: {
  importacion: Importacion;
  clientes: FilaCliente[];
  detalle: FilaDetalle[];
}): Promise<void> {
  const snapshot: SnapshotLocal = {
    version: 1,
    importacion: args.importacion,
    clientes: args.clientes,
    detalle: args.detalle,
  };

  await localSet(KEY_SNAPSHOT, snapshot);

  const historial = await traerImportaciones();
  const siguiente = [
    args.importacion,
    ...historial.filter((h) => h.id !== args.importacion.id),
  ].slice(0, 30);
  await localSet(KEY_IMPORTACIONES, siguiente);
}

export async function crearRespaldoLocal(): Promise<RespaldoLocal | null> {
  const [snapshot, equivalencias, importaciones] = await Promise.all([
    localGet<SnapshotLocal>(KEY_SNAPSHOT),
    traerEquivalencias(),
    traerImportaciones(),
  ]);

  if (!snapshot) return null;

  return {
    formato: "pedido-sugerido-local-v1",
    exportado_at: new Date().toISOString(),
    snapshot,
    equivalencias,
    importaciones,
  };
}

export async function restaurarRespaldoLocal(valor: unknown): Promise<void> {
  if (!valor || typeof valor !== "object") {
    throw new Error("El archivo de respaldo no es válido.");
  }

  const respaldo = valor as Partial<RespaldoLocal>;
  if (
    respaldo.formato !== "pedido-sugerido-local-v1" ||
    !respaldo.snapshot ||
    !Array.isArray(respaldo.snapshot.clientes) ||
    !Array.isArray(respaldo.snapshot.detalle)
  ) {
    throw new Error("El archivo no corresponde a un respaldo de Pedido Sugerido.");
  }

  await localSet(KEY_SNAPSHOT, respaldo.snapshot as SnapshotLocal);
  await localSet(
    KEY_EQUIVALENCIAS,
    Array.isArray(respaldo.equivalencias) ? respaldo.equivalencias : [],
  );
  await localSet(
    KEY_IMPORTACIONES,
    Array.isArray(respaldo.importaciones)
      ? respaldo.importaciones
      : [respaldo.snapshot.importacion],
  );
}

export async function limpiarDatosLocales(): Promise<void> {
  await Promise.all([
    localRemove(KEY_SNAPSHOT),
    localRemove(KEY_EQUIVALENCIAS),
    localRemove(KEY_IMPORTACIONES),
  ]);
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

async function migrarDesdeSupabaseUnaVez(): Promise<SnapshotLocal | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: sesion } = await supabase.auth.getSession();
    if (!sesion.session) return null;

    async function vistaCompleta<T>(
      tabla: string,
      columnas: string,
      ordenes: Array<{ columna: string; ascending?: boolean }>,
    ): Promise<T[]> {
      const paso = 1000;
      let desde = 0;
      const acumulado: T[] = [];

      for (;;) {
        let consulta = (supabase as any).from(tabla).select(columnas);
        for (const orden of ordenes) {
          consulta = consulta.order(orden.columna, {
            ascending: orden.ascending ?? true,
          });
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

    const [
      clientesVista,
      detalleVista,
      equivalenciasResult,
      importacionResult,
    ] = await Promise.all([
      vistaCompleta<VistaCliente>(
        "vw_pedido_sugerido_clientes",
        "cliente,razon_social,ruta,sugerido,comprado,faltante,cumplimiento_pct,estado,tiene_ambiguedad,fecha_ventas",
        [
          { columna: "cumplimiento_pct", ascending: true },
          { columna: "cliente", ascending: true },
        ],
      ),
      vistaCompleta<VistaDetalle>(
        "vw_pedido_sugerido_actual",
        "cliente,razon_social,ruta,mpr,sugerencia,comprado,faltante,cumplimiento_pct,estado_cruce_cliente,fecha_ventas",
        [
          { columna: "cliente", ascending: true },
          { columna: "mpr", ascending: true },
        ],
      ),
      supabase.from("equivalencias_mpr").select("*").order("mpr"),
      supabase
        .from("importaciones")
        .select("*")
        .eq("estado", "procesada")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (equivalenciasResult.error) throw equivalenciasResult.error;
    if (importacionResult.error) throw importacionResult.error;
    if (clientesVista.length === 0 && detalleVista.length === 0) return null;

    const equivalencias = (equivalenciasResult.data ?? []) as Equivalencia[];
    const descripciones = new Map<string, string>();
    for (const e of equivalencias) {
      if (e.descripcion) descripciones.set(e.mpr, e.descripcion);
    }

    const detalle: FilaDetalle[] = detalleVista.map((fila, index) => ({
      id: index + 1,
      cliente: String(fila.cliente),
      razon_social: fila.razon_social,
      ruta:
        fila.ruta === null || fila.ruta === undefined
          ? null
          : String(fila.ruta),
      mpr: fila.mpr,
      descripcion: descripciones.get(fila.mpr) ?? null,
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

    const clientes: FilaCliente[] = clientesVista.map((fila) => {
      const cumplimiento =
        fila.cumplimiento_pct === null || fila.cumplimiento_pct === undefined
          ? null
          : Math.max(Math.min(Number(fila.cumplimiento_pct), 100), 0);

      const estadoVista = fila.estado ?? null;
      const ambiguo =
        Boolean(fila.tiene_ambiguedad) || estadoVista === "AMBIGUO";

      return {
        cliente: String(fila.cliente),
        razon_social: fila.razon_social ?? "Sin razón social",
        ruta:
          fila.ruta === null || fila.ruta === undefined
            ? "Sin ruta"
            : String(fila.ruta),
        cumplimientoOficial: cumplimiento,
        sugerido: Math.max(Number(fila.sugerido ?? 0), 0),
        comprado: Math.max(Number(fila.comprado ?? 0), 0),
        faltante: Math.max(Number(fila.faltante ?? 0), 0),
        faltantePacks: null,
        equivalenciaPendiente: false,
        estado: ambiguo ? "critico" : semaforo(cumplimiento),
        estadoVista,
        tieneAmbiguedad: ambiguo,
        fechaVentas: fila.fecha_ventas,
      };
    });

    const fechas = [
      ...clientes
        .map((c) => c.fechaVentas)
        .filter((v): v is string => Boolean(v)),
      ...detalle
        .map((d) => d.fechaVentas)
        .filter((v): v is string => Boolean(v)),
    ].sort();
    const fechaVentas = fechas.length ? fechas[fechas.length - 1] : null;

    const previa = importacionResult.data as Importacion | null;
    const importacion: Importacion = {
      id: previa?.id ?? `migrado-${fechaVentas ?? Date.now()}`,
      created_at: fechaVentas
        ? `${fechaVentas}T12:00:00`
        : previa?.created_at ?? new Date().toISOString(),
      archivo_consolidado:
        previa?.archivo_consolidado ?? "Migrado desde Supabase",
      archivo_detalle: previa?.archivo_detalle ?? "Migrado desde Supabase",
      filas_consolidado: clientes.length,
      filas_detalle: detalle.length,
      estado: "procesada",
      notas:
        "Copia local creada automáticamente antes de retirar Supabase.",
    };

    const snapshot: SnapshotLocal = {
      version: 1,
      importacion,
      clientes,
      detalle,
    };

    await Promise.all([
      localSet(KEY_SNAPSHOT, snapshot),
      localSet(KEY_EQUIVALENCIAS, equivalencias),
      localSet(KEY_IMPORTACIONES, [importacion]),
    ]);

    return snapshot;
  } catch (error) {
    console.warn("No se pudo migrar automáticamente desde Supabase:", error);
    return null;
  }
}

export async function traerCruce(): Promise<Cruce | null> {
  let snapshot = await localGet<SnapshotLocal>(KEY_SNAPSHOT);

  if (!snapshot) {
    snapshot = await migrarDesdeSupabaseUnaVez();
  }

  if (!snapshot) return null;

  const equivalencias = await traerEquivalencias();

  const mapaEquiv = new Map<string, number>();
  const descripciones = new Map<string, string>();
  for (const e of equivalencias) {
    if (e.unidades_por_pack && e.unidades_por_pack > 0) {
      mapaEquiv.set(e.mpr, Number(e.unidades_por_pack));
    }
    if (e.descripcion) descripciones.set(e.mpr, e.descripcion);
  }

  const detallePorCliente = new Map<string, FilaDetalle[]>();
  for (const fila of snapshot.detalle) {
    const lista = detallePorCliente.get(fila.cliente);
    if (lista) lista.push(fila);
    else detallePorCliente.set(fila.cliente, [fila]);
  }

  const clientes = snapshot.clientes.map((c) => {
    let packs = 0;
    let pendiente = false;

    for (const det of detallePorCliente.get(c.cliente) ?? []) {
      if (det.faltante <= 0) continue;
      const unidadesPorPack = mapaEquiv.get(det.mpr);
      if (unidadesPorPack && unidadesPorPack > 0) {
        packs += det.faltante / unidadesPorPack;
      } else {
        pendiente = true;
      }
    }

    return {
      ...c,
      faltantePacks: packs > 0 ? packs : null,
      equivalenciaPendiente: pendiente,
    };
  });

  clientes.sort((a, b) => {
    if (a.tieneAmbiguedad !== b.tieneAmbiguedad) {
      return a.tieneAmbiguedad ? -1 : 1;
    }
    return (a.cumplimientoOficial ?? 0) - (b.cumplimientoOficial ?? 0);
  });

  const sugeridoTotal = clientes.reduce((acc, c) => acc + c.sugerido, 0);
  const compradoTotal = clientes.reduce(
    (acc, c) => acc + Math.min(c.comprado, c.sugerido),
    0,
  );
  const cumplimientoGeneral =
    sugeridoTotal > 0
      ? Math.min((compradoTotal / sugeridoTotal) * 100, 100)
      : null;

  return {
    importacion: snapshot.importacion,
    clientes,
    detalle: snapshot.detalle,
    equivalencias: mapaEquiv,
    descripcionesEquiv: descripciones,
    cumplimientoGeneral,
  };
}
