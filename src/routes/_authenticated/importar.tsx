import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileJson, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  crearRespaldoLocal,
  guardarImportacionLocal,
  restaurarRespaldoLocal,
  semaforo,
  traerImportaciones,
  type FilaCliente,
  type FilaDetalle,
  type Importacion,
} from "@/lib/datos";
import {
  ErrorEstructura,
  aNumero,
  aPorcentaje,
  buscarColumna,
  leerHojaExport,
} from "@/lib/excel";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar Excel — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content:
          "Carga local de los dos archivos Excel originales, sin enviar información a servidores externos.",
      },
    ],
  }),
  component: Importar,
});

const COLS_ID_CLIENTE = [
  "out-cli",
  "out cli",
  "outnum",
  "out num",
  "numero de cliente",
  "nro cliente",
  "codigo cliente",
  "cod cliente",
];
const COLS_RAZON = ["razon social", "nombre cliente", "razon", "nombre"];
const COLS_RUTA = ["ruta", "route", "zona"];
const COLS_JEFE = ["jefe", "jefe objetivo", "jdv"];
const COLS_CUMPL = ["resultado", "cumplimiento", "% cumplimiento", "cumpl", "porcentaje"];
const COLS_MPR = ["mpr", "material", "codigo mpr", "producto"];
const COLS_DESC = ["descripcion", "descripcion mpr", "detalle", "descripcion material"];
const COLS_PEDIDO = ["pedido", "comprado", "pedido unidades"];
const COLS_SUG = ["sugerencia", "sugerido", "sugerencia unidades"];

type Paso = { texto: string; ok: boolean };

type ConsolidadoProcesado = {
  cliente: string;
  razon_social: string | null;
  ruta: string | null;
  cumplimiento: number | null;
};

function buscarIdCliente(columnas: string[]): string | null {
  const directa = buscarColumna(columnas, COLS_ID_CLIENTE);
  if (directa) return directa;

  const porOut = columnas.find((columna) => {
    const n = columna
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    return n === "outcli" || n === "outnum" || (n.startsWith("out") && (n.includes("cli") || n.includes("num")));
  });
  if (porOut) return porOut;

  return buscarColumna(columnas, ["cliente"]);
}

function buscarRazonSocial(columnas: string[], columnaId: string | null): string | null {
  const directa = buscarColumna(columnas, COLS_RAZON);
  if (directa) return directa;

  const columnaCliente = buscarColumna(columnas, ["cliente"]);
  return columnaCliente && columnaCliente !== columnaId ? columnaCliente : null;
}

function normalizarRuta(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  const soloDigitos = texto.replace(/\D/g, "");
  if (!soloDigitos) return texto;
  return String(Number(soloDigitos));
}

function esRutaDesarrolloTucuman(valor: unknown): boolean {
  const ruta = Number(normalizarRuta(valor));
  return Number.isFinite(ruta) && ruta >= 3140 && ruta <= 3145;
}

function esJefeRicardoZehid(valor: unknown): boolean {
  const texto = String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return texto.includes("ricardo") && texto.includes("zehid");
}

function Importar() {
  const qc = useQueryClient();
  const [consolidado, setConsolidado] = useState<File | null>(null);
  const [detalle, setDetalle] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errores, setErrores] = useState<string[]>([]);
  const [pasos, setPasos] = useState<Paso[]>([]);

  const { data: historial } = useQuery({
    queryKey: ["importaciones"],
    queryFn: traerImportaciones,
  });

  const agregarPaso = (texto: string, ok = true) =>
    setPasos((p) => [...p, { texto, ok }]);

  const descargarRespaldo = async () => {
    const respaldo = await crearRespaldoLocal();
    if (!respaldo) {
      toast.error("Todavía no hay datos locales para respaldar.");
      return;
    }

    const blob = new Blob([JSON.stringify(respaldo)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedido-sugerido-respaldo-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Respaldo descargado");
  };

  const restaurarRespaldo = async (archivo: File | null) => {
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      await restaurarRespaldoLocal(JSON.parse(texto));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cruce"] }),
        qc.invalidateQueries({ queryKey: ["equivalencias"] }),
        qc.invalidateQueries({ queryKey: ["importaciones"] }),
      ]);
      toast.success("Respaldo restaurado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo restaurar el respaldo.",
      );
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

    try {
      const fuente1 = await leerHojaExport(consolidado);
      agregarPaso(`Fuente 1 validada: hoja "Export" con ${fuente1.filas.length} filas.`);

      const fuente2 = await leerHojaExport(detalle);
      agregarPaso(`Fuente 2 validada: hoja "Export" con ${fuente2.filas.length} filas.`);

      const resultadoFuente1 = buscarColumna(fuente1.columnas, COLS_CUMPL);
      const indiceResultadoFuente1 = resultadoFuente1
        ? fuente1.columnas.indexOf(resultadoFuente1)
        : -1;

      const cCliente =
        buscarIdCliente(fuente1.columnas) ??
        (indiceResultadoFuente1 > 0 ? fuente1.columnas[indiceResultadoFuente1 - 1] : null) ??
        fuente1.columnas[4] ??
        null;

      const dCliente =
        buscarIdCliente(fuente2.columnas) ??
        fuente2.columnas[0] ??
        null;

      const c = {
        cliente: cCliente,
        razon: buscarRazonSocial(fuente1.columnas, cCliente),
        ruta: buscarColumna(fuente1.columnas, COLS_RUTA),
        jefe: buscarColumna(fuente1.columnas, COLS_JEFE),
        cumpl: buscarColumna(fuente1.columnas, COLS_CUMPL),
      };

      const d = {
        cliente: dCliente,
        razon: buscarRazonSocial(fuente2.columnas, dCliente),
        ruta: buscarColumna(fuente2.columnas, COLS_RUTA),
        jefe: buscarColumna(fuente2.columnas, COLS_JEFE),
        mpr: buscarColumna(fuente2.columnas, COLS_MPR),
        desc: buscarColumna(fuente2.columnas, COLS_DESC),
        pedido: buscarColumna(fuente2.columnas, COLS_PEDIDO),
        sug: buscarColumna(fuente2.columnas, COLS_SUG),
      };

      const faltantes: string[] = [];
      if (!c.cliente) faltantes.push("Fuente 1: falta la columna de Cliente.");
      if (!c.cumpl) faltantes.push("Fuente 1: falta la columna de Cumplimiento.");
      if (!d.cliente) faltantes.push("Fuente 2: falta la columna de Cliente.");
      if (!d.mpr) faltantes.push("Fuente 2: falta la columna de MPR.");
      if (!d.pedido) faltantes.push("Fuente 2: falta la columna de Pedido.");
      if (!d.sug) faltantes.push("Fuente 2: falta la columna de Sugerencia.");

      if (faltantes.length) {
        setErrores([
          ...faltantes,
          `Columnas leídas en Fuente 1: ${fuente1.columnas.join(" | ")}`,
          `Columnas leídas en Fuente 2: ${fuente2.columnas.join(" | ")}`,
        ]);
        throw new ErrorEstructura("La estructura de los archivos no coincide con lo esperado.");
      }

      const filasConsolidado: ConsolidadoProcesado[] = fuente1.filas
        .filter((f) => {
          if (c.jefe) return esJefeRicardoZehid(f[c.jefe]);
          return !c.ruta || esRutaDesarrolloTucuman(f[c.ruta]);
        })
        .map((f) => ({
          cliente: String(f[c.cliente!] ?? "").trim(),
          razon_social: c.razon ? (f[c.razon] ?? null)?.toString() ?? null : null,
          ruta: c.ruta ? normalizarRuta(f[c.ruta]) : null,
          cumplimiento: c.cumpl ? aPorcentaje(f[c.cumpl]) : null,
        }))
        .filter((f) => f.cliente);

      const filasDetalle: FilaDetalle[] = fuente2.filas
        .filter((f) => {
          if (d.jefe) return esJefeRicardoZehid(f[d.jefe]);
          return !d.ruta || esRutaDesarrolloTucuman(f[d.ruta]);
        })
        .map((f, i) => {
          const pedido = Math.max(aNumero(f[d.pedido!]), 0);
          const sugerencia = Math.max(aNumero(f[d.sug!]), 0);
          return {
            id: i + 1,
            cliente: String(f[d.cliente!] ?? "").trim(),
            razon_social: d.razon ? (f[d.razon] ?? null)?.toString() ?? null : null,
            ruta: d.ruta ? normalizarRuta(f[d.ruta]) : null,
            mpr: String(f[d.mpr!] ?? "").trim(),
            descripcion: d.desc ? (f[d.desc] ?? null)?.toString() ?? null : null,
            pedido,
            sugerencia,
            faltante: Math.max(sugerencia - pedido, 0),
            cumplimientoPct:
              sugerencia > 0 ? Math.min((Math.min(pedido, sugerencia) / sugerencia) * 100, 100) : 100,
            estadoCruceCliente: null,
            fechaVentas: null,
          };
        })
        .filter((f) => f.cliente && f.mpr);

      const consolidadoPorCliente = new Map(
        filasConsolidado.map((f) => [f.cliente, f] as const),
      );

      const detallePorCliente = new Map<string, FilaDetalle[]>();
      for (const fila of filasDetalle) {
        const lista = detallePorCliente.get(fila.cliente);
        if (lista) lista.push(fila);
        else detallePorCliente.set(fila.cliente, [fila]);
      }

      const ids = new Set<string>([
        ...filasConsolidado.map((f) => f.cliente),
        ...filasDetalle.map((f) => f.cliente),
      ]);

      const clientes: FilaCliente[] = [...ids].map((cliente) => {
        const cons = consolidadoPorCliente.get(cliente);
        const det = detallePorCliente.get(cliente) ?? [];

        const sugerido = det.reduce((acc, f) => acc + f.sugerencia, 0);
        const comprado = det.reduce(
          (acc, f) => acc + Math.min(Math.max(f.pedido, 0), Math.max(f.sugerencia, 0)),
          0,
        );
        const faltante = det.reduce((acc, f) => acc + f.faltante, 0);

        const cumplimientoDetalle =
          sugerido > 0 ? Math.min((comprado / sugerido) * 100, 100) : null;
        const cumplimiento =
          cons?.cumplimiento !== null && cons?.cumplimiento !== undefined
            ? Math.max(Math.min(cons.cumplimiento, 100), 0)
            : cumplimientoDetalle;

        const primera = det[0];

        return {
          cliente,
          razon_social:
            cons?.razon_social?.trim() ||
            primera?.razon_social?.trim() ||
            "Sin razón social",
          ruta: cons?.ruta?.trim() || primera?.ruta?.trim() || "Sin ruta",
          cumplimientoOficial: cumplimiento,
          sugerido,
          comprado,
          faltante,
          faltantePacks: null,
          equivalenciaPendiente: false,
          estado: semaforo(cumplimiento),
          estadoVista: null,
          tieneAmbiguedad: false,
          fechaVentas: null,
        };
      });

      const ahora = new Date().toISOString();
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `local-${Date.now()}`;

      const importacion: Importacion = {
        id,
        created_at: ahora,
        archivo_consolidado: consolidado.name,
        archivo_detalle: detalle.name,
        filas_consolidado: filasConsolidado.length,
        filas_detalle: filasDetalle.length,
        estado: "procesada",
        notas: "Procesado y guardado únicamente en este navegador.",
      };

      await guardarImportacionLocal({ importacion, clientes, detalle: filasDetalle });

      agregarPaso(
        `Cruce procesado: ${clientes.length} clientes y ${filasDetalle.length} líneas por MPR.`,
      );
      agregarPaso("Filtro aplicado: solo clientes y rutas del Jefe Ricardo Zehid.");
      agregarPaso("Datos guardados localmente en este dispositivo.");

      toast.success("Importación completada");
      setConsolidado(null);
      setDetalle(null);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["cruce"] }),
        qc.invalidateQueries({ queryKey: ["importaciones"] }),
      ]);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido en la importación";
      setErrores((prev) => (prev.length ? prev : [msg]));
      agregarPaso(msg, false);
      toast.error(msg);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AppShell
      titulo="Importar"
      subtitulo="Datos privados · guardados solo en este dispositivo"
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <p className="font-bold">Modo GitHub sin Supabase · Importador v21</p>
          <p className="mt-1 text-muted-foreground">
            Los archivos se procesan dentro de tu navegador. No se publican en GitHub ni se envían a una base externa.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11"
            onClick={() => void descargarRespaldo()}
          >
            <Download className="size-4" />
            Descargar respaldo
          </Button>

          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
            <FileJson className="size-4" />
            Restaurar respaldo
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                void restaurarRespaldo(e.target.files?.[0] ?? null);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

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
          detalle="Cliente, MPR, Pedido y Sugerencia."
          archivo={detalle}
          onArchivo={setDetalle}
        />

        <Button
          onClick={procesar}
          disabled={procesando || !consolidado || !detalle}
          className="h-12 w-full text-base font-semibold"
        >
          {procesando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Validar y guardar en este dispositivo
        </Button>

        {errores.length ? (
          <div className="rounded-2xl border border-critico/30 bg-critico-soft p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-critico">
              <AlertCircle className="size-4" /> Errores de estructura
            </p>
            <ul className="mt-2 space-y-1 text-xs text-critico">
              {errores.map((e) => (
                <li key={e} className="break-words">• {e}</li>
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
            Últimas importaciones de este dispositivo
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
                      {h.filas_consolidado} clientes · {h.filas_detalle} líneas MPR
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-exito-soft px-2.5 py-1 text-[11px] font-bold uppercase text-exito">
                    local
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Todavía no hay importaciones en este navegador.
            </p>
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
          {archivo ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <FileSpreadsheet className="size-5" />
          )}
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
