import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SinDatos } from "@/components/Indicadores";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { traerImportaciones } from "@/lib/datos";
import {
  ErrorEstructura,
  aNumero,
  aPorcentaje,
  buscarColumna,
  leerHojaExport,
  type FilaOriginal,
} from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar Excel — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content:
          "Carga de los dos archivos Excel originales (consolidado por cliente y detalle por MPR) con validación de la hoja Export.",
      },
      { property: "og:title", content: "Importar Excel — Pedido Sugerido Tucumán" },
      {
        property: "og:description",
        content: "Carga y validación de las dos fuentes originales del pedido sugerido.",
      },
    ],
  }),
  component: Importar,
});

const COLS_CLIENTE = ["numero de cliente", "nro cliente", "cliente", "codigo cliente", "cod cliente"];
const COLS_RAZON = ["razon social", "nombre cliente", "razon", "nombre"];
const COLS_RUTA = ["ruta", "route", "zona"];
const COLS_CUMPL = ["cumplimiento", "% cumplimiento", "cumpl", "porcentaje"];
const COLS_MPR = ["mpr", "material", "codigo mpr", "producto"];
const COLS_DESC = ["descripcion", "descripcion mpr", "detalle", "descripcion material"];
const COLS_PEDIDO = ["pedido", "comprado", "pedido unidades"];
const COLS_SUG = ["sugerencia", "sugerido", "sugerencia unidades"];

type Paso = { texto: string; ok: boolean };

function Importar() {
  const { esAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [consolidado, setConsolidado] = useState<File | null>(null);
  const [detalle, setDetalle] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [pasos, setPasos] = useState<Paso[]>([]);

  const { data: historial } = useQuery({ queryKey: ["importaciones"], queryFn: traerImportaciones });

  if (!esAdmin) {
    return (
      <AppShell titulo="Importar" subtitulo="Solo Administrador">
        <SinDatos mensaje="Tu perfil es Desarrollo (solo lectura). La carga de los archivos Excel la realiza un Administrador." />
      </AppShell>
    );
  }

  const agregarPaso = (texto: string, ok = true) => setPasos((p) => [...p, { texto, ok }]);

  const insertarPorLotes = async <T,>(tabla: string, filas: T[]) => {
    const lote = 500;
    for (let i = 0; i < filas.length; i += lote) {
      const { error } = await supabase.from(tabla as never).insert(filas.slice(i, i + lote) as never);
      if (error) throw new Error(`${tabla}: ${error.message}`);
    }
  };

  const procesar = async () => {
    if (!consolidado || !detalle) {
      toast.error("Cargá los dos archivos antes de procesar.");
      return;
    }
    setProcesando(true);
    setErrores([]);
    setPasos([]);
    let importacionId: string | null = null;
    try {
      // 1) Validación de estructura de ambas fuentes ANTES de escribir nada.
      const fuente1 = await leerHojaExport(consolidado);
      agregarPaso(`Fuente 1 validada: hoja "Export" con ${fuente1.filas.length} filas.`);
      const fuente2 = await leerHojaExport(detalle);
      agregarPaso(`Fuente 2 validada: hoja "Export" con ${fuente2.filas.length} filas.`);

      const c = {
        cliente: buscarColumna(fuente1.columnas, COLS_CLIENTE),
        razon: buscarColumna(fuente1.columnas, COLS_RAZON),
        ruta: buscarColumna(fuente1.columnas, COLS_RUTA),
        cumpl: buscarColumna(fuente1.columnas, COLS_CUMPL),
      };
      const d = {
        cliente: buscarColumna(fuente2.columnas, COLS_CLIENTE),
        razon: buscarColumna(fuente2.columnas, COLS_RAZON),
        ruta: buscarColumna(fuente2.columnas, COLS_RUTA),
        mpr: buscarColumna(fuente2.columnas, COLS_MPR),
        desc: buscarColumna(fuente2.columnas, COLS_DESC),
        pedido: buscarColumna(fuente2.columnas, COLS_PEDIDO),
        sug: buscarColumna(fuente2.columnas, COLS_SUG),
      };

      const faltantes: string[] = [];
      if (!c.cliente) faltantes.push('Fuente 1: falta la columna de Cliente.');
      if (!c.cumpl) faltantes.push('Fuente 1: falta la columna de Cumplimiento.');
      if (!d.cliente) faltantes.push('Fuente 2: falta la columna de Cliente.');
      if (!d.mpr) faltantes.push('Fuente 2: falta la columna de MPR.');
      if (!d.pedido) faltantes.push('Fuente 2: falta la columna de Pedido.');
      if (!d.sug) faltantes.push('Fuente 2: falta la columna de Sugerencia.');
      if (faltantes.length) {
        setErrores([
          ...faltantes,
          `Columnas leídas en Fuente 1: ${fuente1.columnas.join(" | ")}`,
          `Columnas leídas en Fuente 2: ${fuente2.columnas.join(" | ")}`,
        ]);
        throw new ErrorEstructura("La estructura de los archivos no coincide con lo esperado.");
      }

      // 2) Cabecera de importación.
      const { data: imp, error: errImp } = await supabase
        .from("importaciones")
        .insert({
          created_by: user?.id ?? null,
          archivo_consolidado: consolidado.name,
          archivo_detalle: detalle.name,
          filas_consolidado: fuente1.filas.length,
          filas_detalle: fuente2.filas.length,
          estado: "pendiente",
        })
        .select("id")
        .single();
      if (errImp) throw new Error(errImp.message);
      importacionId = imp.id as string;

      // 3) Copia lógica de las fuentes originales (sin modificar columnas).
      await insertarPorLotes(
        "origen_consolidado",
        fuente1.filas.map((fila: FilaOriginal, i) => ({
          importacion_id: importacionId,
          fila: i + 1,
          data: fila,
        })),
      );
      await insertarPorLotes(
        "origen_detalle",
        fuente2.filas.map((fila: FilaOriginal, i) => ({
          importacion_id: importacionId,
          fila: i + 1,
          data: fila,
        })),
      );
      agregarPaso("Copia original de ambas fuentes guardada sin modificaciones.");

      // 4) Capa de procesamiento.
      const filasConsolidado = fuente1.filas
        .map((f) => ({
          importacion_id: importacionId,
          cliente: String(f[c.cliente!] ?? "").trim(),
          razon_social: c.razon ? (f[c.razon] ?? null)?.toString() ?? null : null,
          ruta: c.ruta ? (f[c.ruta] ?? null)?.toString() ?? null : null,
          cumplimiento: aPorcentaje(f[c.cumpl!]),
        }))
        .filter((f) => f.cliente);

      const filasDetalle = fuente2.filas
        .map((f) => ({
          importacion_id: importacionId,
          cliente: String(f[d.cliente!] ?? "").trim(),
          razon_social: d.razon ? (f[d.razon] ?? null)?.toString() ?? null : null,
          ruta: d.ruta ? (f[d.ruta] ?? null)?.toString() ?? null : null,
          mpr: String(f[d.mpr!] ?? "").trim(),
          descripcion: d.desc ? (f[d.desc] ?? null)?.toString() ?? null : null,
          pedido: aNumero(f[d.pedido!]),
          sugerencia: aNumero(f[d.sug!]),
        }))
        .filter((f) => f.cliente && f.mpr);

      await insertarPorLotes("clientes_consolidado", filasConsolidado);
      await insertarPorLotes("detalle_mpr", filasDetalle);
      agregarPaso(
        `Cruce procesado: ${filasConsolidado.length} clientes y ${filasDetalle.length} líneas por MPR.`,
      );

      const { error: errEstado } = await supabase
        .from("importaciones")
        .update({ estado: "procesada" })
        .eq("id", importacionId);
      if (errEstado) throw new Error(errEstado.message);

      agregarPaso("Importación marcada como procesada.");
      toast.success("Importación completada.");
      setConsolidado(null);
      setDetalle(null);
      qc.invalidateQueries({ queryKey: ["cruce"] });
      qc.invalidateQueries({ queryKey: ["importaciones"] });
    } catch (error) {
      if (importacionId) {
        await supabase
          .from("importaciones")
          .update({ estado: "error", notas: error instanceof Error ? error.message : null })
          .eq("id", importacionId);
      }
      const msg = error instanceof Error ? error.message : "Error desconocido en la importación";
      setErrores((prev) => (prev.length ? prev : [msg]));
      agregarPaso(msg, false);
      toast.error(msg);
    } finally {
      setProcesando(false);
      qc.invalidateQueries({ queryKey: ["importaciones"] });
    }
  };

  return (
    <AppShell titulo="Importar" subtitulo="Dos archivos Excel originales · hoja «Export»">
      <div className="space-y-4">
        <CampoArchivo
          numero={1}
          titulo="Consolidado por cliente"
          detalle="Fuente oficial del cumplimiento por cliente/ruta."
          archivo={consolidado}
          onArchivo={setConsolidado}
        />
        <CampoArchivo
          numero={2}
          titulo="Detalle por cliente + MPR"
          detalle="Cliente, MPR, Pedido, Sugerencia y Cumplimiento."
          archivo={detalle}
          onArchivo={setDetalle}
        />

        <Button
          onClick={procesar}
          disabled={procesando || !consolidado || !detalle}
          className="h-12 w-full text-base font-semibold"
        >
          {procesando ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Validar y procesar las dos fuentes
        </Button>

        {errores.length ? (
          <div className="rounded-2xl border border-critico/30 bg-critico-soft p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-critico">
              <AlertCircle className="size-4" /> Errores de estructura
            </p>
            <ul className="mt-2 space-y-1 text-xs text-critico">
              {errores.map((e) => (
                <li key={e} className="break-words">
                  • {e}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {pasos.length ? (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Proceso
            </p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {pasos.map((p, i) => (
                <li key={i} className={p.ok ? "text-foreground" : "text-critico"}>
                  {p.ok ? "✓" : "✕"} {p.texto}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Últimas importaciones
          </p>
          {historial?.length ? (
            <ul className="mt-2 divide-y divide-border">
              {historial.map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {new Date(h.created_at).toLocaleString("es-AR")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.filas_consolidado} filas consolidado · {h.filas_detalle} filas detalle
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase " +
                      (h.estado === "procesada"
                        ? "bg-exito-soft text-exito"
                        : h.estado === "error"
                          ? "bg-critico-soft text-critico"
                          : "bg-muted text-muted-foreground")
                    }
                  >
                    {h.estado}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Todavía no hay importaciones.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CampoArchivo({
  numero,
  titulo,
  detalle,
  archivo,
  onArchivo,
}: {
  numero: number;
  titulo: string;
  detalle: string;
  archivo: File | null;
  onArchivo: (f: File | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {archivo ? <CheckCircle2 className="size-5" /> : <FileSpreadsheet className="size-5" />}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Fuente {numero}
          </p>
          <p className="text-sm font-semibold">{titulo}</p>
          <p className="text-xs text-muted-foreground">{detalle}</p>
          <p className="mt-1 truncate text-xs font-semibold text-primary">
            {archivo ? archivo.name : "Tocá para elegir el archivo .xlsx"}
          </p>
        </div>
      </div>
      <input
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
