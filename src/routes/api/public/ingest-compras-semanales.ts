import { createFileRoute } from "@tanstack/react-router";

type CompraEntrada = {
  fecha_venta?: unknown;
  cliente?: unknown;
  razon_social?: unknown;
  ruta?: unknown;
  mpr?: unknown;
  descripcion_mpr?: unknown;
  cantidad_unidades?: unknown;
  identificador_origen?: unknown;
};

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const s = String(valor).trim();
  return s === "" ? null : s;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const normalizado = String(valor).trim().replace(",", ".");
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/ingest-compras-semanales")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Validación de clave de integración
        const claveEsperada = process.env["POWER_AUTOMATE_INGEST_KEY"];
        const claveRecibida = request.headers.get("x-ingest-key");
        if (!claveEsperada || !claveRecibida || claveRecibida !== claveEsperada) {
          return json({ error: "No autorizado" }, 401);
        }

        let cuerpo: unknown;
        try {
          cuerpo = await request.json();
        } catch {
          return json({ error: "Cuerpo JSON inválido" }, 400);
        }

        // Acepta un objeto único o una lista de objetos
        const filas: CompraEntrada[] = Array.isArray(cuerpo)
          ? cuerpo
          : cuerpo && typeof cuerpo === "object"
            ? [cuerpo as CompraEntrada]
            : [];

        if (filas.length === 0) {
          return json({ error: "No se recibieron registros" }, 400);
        }

        // Validación de obligatorios y normalización
        const registros: {
          fecha_venta: string;
          cliente: string;
          razon_social: string | null;
          ruta: string | null;
          mpr: string;
          descripcion_mpr: string | null;
          cantidad_unidades: number;
          identificador_origen: string;
        }[] = [];
        const errores: { indice: number; error: string }[] = [];

        filas.forEach((fila, indice) => {
          const fecha_venta = texto(fila.fecha_venta);
          const cliente = texto(fila.cliente);
          const mpr = texto(fila.mpr);
          const identificador_origen = texto(fila.identificador_origen);
          const cantidad_unidades = numero(fila.cantidad_unidades);

          const faltantes: string[] = [];
          if (!fecha_venta) faltantes.push("fecha_venta");
          if (!cliente) faltantes.push("cliente");
          if (!mpr) faltantes.push("mpr");
          if (cantidad_unidades === null) faltantes.push("cantidad_unidades");
          if (!identificador_origen) faltantes.push("identificador_origen");

          if (faltantes.length > 0) {
            errores.push({
              indice,
              error: `Faltan o son inválidos: ${faltantes.join(", ")}`,
            });
            return;
          }

          if (Number.isNaN(Date.parse(`${fecha_venta}T00:00:00Z`))) {
            errores.push({ indice, error: "fecha_venta no es una fecha válida" });
            return;
          }

          registros.push({
            fecha_venta: fecha_venta!,
            cliente: cliente!,
            razon_social: texto(fila.razon_social),
            ruta: texto(fila.ruta),
            mpr: mpr!,
            descripcion_mpr: texto(fila.descripcion_mpr),
            cantidad_unidades: cantidad_unidades!,
            identificador_origen: identificador_origen!,
          });
        });

        if (errores.length > 0) {
          return json(
            {
              error:
                "Hay registros con datos obligatorios faltantes o inválidos",
              detalles: errores,
            },
            400,
          );
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const { error, data } = await supabaseAdmin
          .from("compras_semanales")
          .upsert(registros, { onConflict: "identificador_origen" })
          .select("id");

        if (error) {
          console.error("Error en upsert compras_semanales:", error);
          return json({ error: "No se pudieron guardar las compras" }, 500);
        }

        return json(
          {
            ok: true,
            recibidos: filas.length,
            insertados_actualizados: data?.length ?? registros.length,
          },
          200,
        );
      },
    },
  },
});
