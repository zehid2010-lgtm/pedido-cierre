import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarraCumplimiento, EstadoBadge, SinDatos } from "@/components/Indicadores";
import { Input } from "@/components/ui/input";
import { nf, nf1, traerCruce, type Semaforo } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content: "Listado de clientes con cumplimiento oficial, sugerido, comprado y faltante en unidades y packs.",
      },
      { property: "og:title", content: "Clientes — Pedido Sugerido Tucumán" },
      { property: "og:description", content: "Cumplimiento, sugerido, comprado y faltante por cliente." },
    ],
  }),
  component: Clientes,
});

function Clientes() {
  const { data, isLoading } = useQuery({ queryKey: ["cruce"], queryFn: traerCruce });
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<Semaforo | "todos">("todos");
  const [ruta, setRuta] = useState("todas");

  const rutas = useMemo(
    () => Array.from(new Set((data?.clientes ?? []).map((c) => c.ruta))).sort(),
    [data],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (data?.clientes ?? []).filter(
      (c) =>
        (ruta === "todas" || c.ruta === ruta) &&
        (estado === "todos" || c.estado === estado) &&
        (!texto ||
          c.cliente.toLowerCase().includes(texto) ||
          c.razon_social.toLowerCase().includes(texto)),
    );
  }, [data, busqueda, estado, ruta]);

  return (
    <AppShell titulo="Clientes" subtitulo={`${filtrados.length} clientes`}>
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos importados." />
      ) : (
        <div className="space-y-4">
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por número o razón social"
            className="h-12"
          />
          <div className="flex flex-wrap gap-2">
            {(["todos", "critico", "amarillo", "verde"] as const).map((e) => (
              <button
                key={e}
                onClick={() => setEstado(e)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (estado === e
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-muted-foreground")
                }
              >
                {e === "todos" ? "Todos" : e === "critico" ? "Críticos" : e === "amarillo" ? "Por cerrar" : "Cumplidos"}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["todas", ...rutas].map((r) => (
              <button
                key={r}
                onClick={() => setRuta(r)}
                className={
                  "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors " +
                  (ruta === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-muted-foreground")
                }
              >
                {r === "todas" ? "Todas las rutas" : `Ruta ${r}`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtrados.map((c) => (
              <Link
                key={c.cliente}
                to="/clientes/$cliente"
                params={{ cliente: c.cliente }}
                className="block rounded-2xl border border-border bg-surface p-4 shadow-card active:scale-[0.995]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      #{c.cliente} · Ruta {c.ruta}
                    </p>
                    <p className="truncate text-base font-semibold">{c.razon_social}</p>
                  </div>
                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <EstadoBadge estado={c.estado} />
                  <span className="numero-tabular text-xl font-bold">
                    {c.cumplimientoOficial !== null ? `${nf1.format(c.cumplimientoOficial)}%` : "—"}
                  </span>
                </div>
                <div className="mt-2">
                  <BarraCumplimiento valor={c.cumplimientoOficial} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <Dato titulo="Sugerido" valor={nf.format(Math.round(c.sugerido))} />
                  <Dato titulo="Comprado" valor={nf.format(Math.round(c.comprado))} />
                  <Dato titulo="Faltante" valor={nf.format(Math.round(c.faltante))} destacado />
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {c.faltantePacks !== null ? `≈ ${nf1.format(c.faltantePacks)} packs` : "Sin equivalencia de packs"}
                  {c.equivalenciaPendiente ? " · equivalencia pendiente" : ""}
                </p>
              </Link>
            ))}
            {filtrados.length === 0 ? <SinDatos mensaje="No hay clientes con esos filtros." /> : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Dato({ titulo, valor, destacado }: { titulo: string; valor: string; destacado?: boolean }) {
  return (
    <div className={"rounded-xl px-2 py-2 " + (destacado ? "bg-critico-soft" : "bg-muted")}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className={"numero-tabular text-sm font-bold " + (destacado ? "text-critico" : "")}>{valor}</p>
    </div>
  );
}
