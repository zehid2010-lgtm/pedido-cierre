import * as XLSX from "xlsx";

export const HOJA_REQUERIDA = "Export";

export type FilaOriginal = Record<string, unknown>;

export class ErrorEstructura extends Error {}

/** Normaliza un encabezado: minúsculas, sin acentos ni signos. */
export function normalizar(texto: string): string {
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Lee la hoja "Export" de un archivo Excel y devuelve las filas originales,
 * sin reordenar ni renombrar columnas. La fuente se conserva tal cual llega.
 */
export async function leerHojaExport(archivo: File): Promise<{
  columnas: string[];
  filas: FilaOriginal[];
}> {
  const buffer = await archivo.arrayBuffer();
  let libro: XLSX.WorkBook;
  try {
    libro = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ErrorEstructura(
      `No se pudo leer "${archivo.name}". Verificá que sea un archivo Excel válido (.xlsx o .xls).`,
    );
  }

  const nombreHoja = libro.SheetNames.find((h) => normalizar(h) === normalizar(HOJA_REQUERIDA));
  if (!nombreHoja) {
    throw new ErrorEstructura(
      `El archivo "${archivo.name}" no tiene la hoja "${HOJA_REQUERIDA}". Hojas encontradas: ${
        libro.SheetNames.join(", ") || "ninguna"
      }.`,
    );
  }

  const hoja = libro.Sheets[nombreHoja]!;
  const filas = XLSX.utils.sheet_to_json<FilaOriginal>(hoja, { defval: null, raw: true });
  if (filas.length === 0) {
    throw new ErrorEstructura(`La hoja "${HOJA_REQUERIDA}" de "${archivo.name}" está vacía.`);
  }
  const columnas = Object.keys(filas[0] ?? {});
  return { columnas, filas };
}

/** Busca la columna original cuyo nombre coincide con alguno de los candidatos. */
export function buscarColumna(columnas: string[], candidatos: string[]): string | null {
  const normalizadas = columnas.map((c) => ({ original: c, norm: normalizar(c) }));
  for (const candidato of candidatos) {
    const c = normalizar(candidato);
    const exacta = normalizadas.find((n) => n.norm === c);
    if (exacta) return exacta.original;
  }
  for (const candidato of candidatos) {
    const c = normalizar(candidato);
    const parcial = normalizadas.find((n) => n.norm.includes(c));
    if (parcial) return parcial.original;
  }
  return null;
}

export function aNumero(valor: unknown): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;
  const texto = valor.toString().trim().replace(/%/g, "").replace(/\s/g, "");
  const limpio =
    texto.includes(",") && texto.lastIndexOf(",") > texto.lastIndexOf(".")
      ? texto.replace(/\./g, "").replace(",", ".")
      : texto.replace(/,/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : 0;
}

/** Devuelve el cumplimiento siempre en escala 0-100. */
export function aPorcentaje(valor: unknown): number {
  const n = aNumero(valor);
  if (n > 0 && n <= 1.5 && typeof valor !== "string") return n * 100;
  if (typeof valor === "string" && valor.includes("%")) return n;
  return n <= 1.5 && n > 0 ? n * 100 : n;
}

export function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return valor.toString().trim();
}

export const CANDIDATOS = {
  cliente: ["out-cli", "out cli", "outnum", "out num", "numero de cliente", "nro cliente", "n cliente", "cod cliente", "codigo cliente", "cliente"],
  razonSocial: ["razon social", "nombre cliente", "nombre del cliente", "descripcion cliente", "razon"],
  ruta: ["ruta", "reparto", "route"],
  cumplimiento: ["resultado", "cumplimiento", "cumpl", "porcentaje cumplimiento", "compliance"],
  mpr: ["mpr", "material", "sku", "producto", "codigo producto"],
  descripcion: ["descripcion mpr", "descripcion producto", "descripcion", "detalle", "producto descripcion"],
  pedido: ["pedido", "comprado", "compra", "venta", "cantidad pedido"],
  sugerencia: ["sugerencia", "sugerido", "pedido sugerido", "cantidad sugerida"],
};
