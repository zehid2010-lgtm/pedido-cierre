import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EstadoBadge, SinDatos } from "@/components/Indicadores";
import { Input } from "@/components/ui/input";
import { nf, nf1, traerCruce } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/pendientes")({
  head: () => ({
    meta: [
      { title: "Pendientes Desarrollo — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content: "Solo los MPR con faltante mayor a cero, ordenados por cliente prioritario y mayor faltante.",
      },
      { property: "og:title", content: "Pendientes Desarrollo — Pedido Sugerido Tucumán" },
      { property: "og:description", content: "Lo que queda por cerrar en la tercera visita." },
    ],
  }),
  component: Pendientes,
});

function Pendientes() {
  const { data, isLoading } = useQuery({ queryKey: ["cruce"], queryFn: traerCruce });
  const [busqueda, setBusqueda] = useState("");
  const [ruta, setRuta] = useState("todas");

  const rutas = useMemo(
    () =>
      Array.from(new Set((data?.clientes ?? []).map((c) => c.ruta))).sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true }),
      ),
    [data],
  );

  const grupos = useMemo(() => {
    if (!data) return [];
    const texto = busqueda.trim().toLowerCase();
    return data.clientes
      .filter((c) => c.faltante > 0)
      .filter((c) => ruta === "todas" || c.ruta === ruta)
      .filter(
        (c) =>
          !texto || c.cliente.toLowerCase().includes(texto) || c.razon_social.toLowerCase().includes(texto),
      )
      .map((c) => ({
        cliente: c,
        filas: data.detalle
          .filter((f) => f.cliente === c.cliente && Number(f.faltante) > 0)
          .sort((a, b) => Number(b.faltante) - Number(a.faltante)),
      }))
      .sort((a, b) => {
        if (a.cliente.tieneAmbiguedad !== b.cliente.tieneAmbiguedad) {
          return a.cliente.tieneAmbiguedad ? -1 : 1;
        }
        const prioridad = { critico: 0, amarillo: 1, verde: 2 } as const;
        const p = prioridad[a.cliente.estado] - prioridad[b.cliente.estado];
        return p !== 0 ? p : b.cliente.faltante - a.cliente.faltante;
      });
  }, [data, busqueda, ruta]);

  return (
    <AppShell titulo="Pendientes Desarrollo" subtitulo={`${grupos.length} clientes con faltante`}>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados." />
      ) : (
        <div className="space-y-4">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar cliente"
            className="h-12"
          />

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Ruta
            </label>
            <select
              value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="todas">Todas las rutas</option>
              {rutas.map((r) => (
                <option key={r} value={r}>
                  Ruta {r}
                </option>
              ))}
            </select>
          </div>

          {grupos.map(({ cliente, filas }) => (
            <div key={cliente.cliente} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
              <Link
                to="/clientes/$cliente"
                params={{ cliente: cliente.cliente }}
                className="flex items-start justify-between gap-3 border-b border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    #{cliente.cliente} · Ruta {cliente.ruta}
                  </p>
                  <p className="truncate font-semibold">{cliente.razon_social}</p>
                  <div className="mt-1.5">
                    <EstadoBadge estado={cliente.estado} ambiguo={cliente.tieneAmbiguedad} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="numero-tabular text-xl font-bold text-critico">
                    {nf.format(Math.round(cliente.faltante))}
                  </p>
                  <p className="text-[11px] text-muted-foreground">unidades</p>
                  <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground" />
                </div>
              </Link>
              <ul className="divide-y divide-border/60">
                {filas.map((f) => {
                  const uxp = data.equivalencias.get(f.mpr) ?? null;
                  const faltante = Number(f.faltante);
                  return (
                    <li key={f.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{f.mpr}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {f.descripcion ?? data.descripcionesEquiv.get(f.mpr) ?? "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="numero-tabular text-sm font-bold text-critico">{nf.format(faltante)} u.</p>
                        <p className="text-[11px] text-muted-foreground">
                          {uxp ? `${nf1.format(faltante / uxp)} packs` : "equivalencia pendiente"}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {grupos.length === 0 ? <SinDatos mensaje="No hay pendientes con esos filtros." /> : null}
        </div>
      )}
    </AppShell>
  );
}
