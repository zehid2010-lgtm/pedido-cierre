import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarraCumplimiento, EstadoBadge, SinDatos, Tarjeta } from "@/components/Indicadores";
import { nf, nf1, traerCruce } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/clientes/$cliente")({
  head: () => ({
    meta: [
      { title: "Detalle de cliente — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content: "Sugerido, comprado y faltante por MPR de un cliente, con conversión a packs.",
      },
      { property: "og:title", content: "Detalle de cliente — Pedido Sugerido Tucumán" },
      { property: "og:description", content: "Faltante por MPR del cliente, en unidades y packs." },
    ],
  }),
  component: DetalleCliente,
});

function DetalleCliente() {
  const { cliente } = Route.useParams();
  const { data, isLoading } = useQuery({ queryKey: ["cruce"], queryFn: traerCruce });

  const info = data?.clientes.find((c) => c.cliente === cliente);
  const filas = useMemo(
    () =>
      (data?.detalle ?? [])
        .filter((f) => f.cliente === cliente)
        .sort((a, b) => Number(b.faltante) - Number(a.faltante)),
    [data, cliente],
  );

  return (
    <AppShell titulo={info?.razon_social ?? `Cliente ${cliente}`} subtitulo={`#${cliente}`}>
      <Link to="/clientes" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
        <ArrowLeft className="size-4" /> Volver a clientes
      </Link>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !info ? (
        <SinDatos mensaje="No se encontró el cliente en los datos actuales." />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Ruta {info.ruta}
                </p>
                <p className="text-lg font-semibold">{info.razon_social}</p>
              </div>
              <EstadoBadge estado={info.estado} ambiguo={info.tieneAmbiguedad} />
            </div>
            <p className="numero-tabular mt-3 text-4xl font-bold leading-none">
              {info.cumplimientoOficial !== null ? `${nf1.format(info.cumplimientoOficial)}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Cumplimiento calculado sobre sugerido y comprado</p>
            <div className="mt-3">
              <BarraCumplimiento valor={info.cumplimientoOficial} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Tarjeta titulo="Sugerido" valor={nf.format(Math.round(info.sugerido))} />
            <Tarjeta titulo="Comprado" valor={nf.format(Math.round(info.comprado))} />
            <Tarjeta
              titulo="Faltante"
              valor={nf.format(Math.round(info.faltante))}
              tono="critico"
              detalle={info.faltantePacks !== null ? `≈ ${nf1.format(info.faltantePacks)} packs` : "Sin equivalencia"}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-bold uppercase tracking-wide">Detalle por MPR</p>
              <p className="text-xs text-muted-foreground">
                Faltante = sugerencia − comprado, calculado MPR por MPR
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="bg-surface-strong text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">MPR</th>
                    <th className="px-3 py-2 text-right">Comprado</th>
                    <th className="px-3 py-2 text-right">Sugerencia</th>
                    <th className="px-3 py-2 text-right">Faltante</th>
                    <th className="px-3 py-2 text-right">U × pack</th>
                    <th className="px-3 py-2 text-right">Faltante packs</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => {
                    const uxp = data?.equivalencias.get(f.mpr) ?? null;
                    const faltante = Number(f.faltante);
                    return (
                      <tr key={f.id} className="border-t border-border/60">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold">{f.mpr}</p>
                          <p className="text-xs text-muted-foreground">
                            {f.descripcion ?? data?.descripcionesEquiv.get(f.mpr) ?? "—"}
                          </p>
                        </td>
                        <td className="numero-tabular px-3 py-2.5 text-right">{nf.format(Number(f.pedido))}</td>
                        <td className="numero-tabular px-3 py-2.5 text-right">{nf.format(Number(f.sugerencia))}</td>
                        <td
                          className={
                            "numero-tabular px-3 py-2.5 text-right font-bold " +
                            (faltante > 0 ? "text-critico" : "text-exito")
                          }
                        >
                          {nf.format(faltante)}
                        </td>
                        <td className="numero-tabular px-3 py-2.5 text-right">{uxp ? nf.format(uxp) : "—"}</td>
                        <td className="numero-tabular px-3 py-2.5 text-right">
                          {faltante <= 0 ? (
                            "—"
                          ) : uxp ? (
                            nf1.format(faltante / uxp)
                          ) : (
                            <span className="text-[11px] font-semibold uppercase text-alerta-foreground">
                              equivalencia pendiente
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
