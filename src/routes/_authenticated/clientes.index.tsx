import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarraCumplimiento, EstadoBadge, SinDatos } from "@/components/Indicadores";
import { Input } from "@/components/ui/input";
import { nf, nf1, traerCruce, type Semaforo } from "@/lib/datos";

type FiltroEstado = Semaforo | "ambiguo" | "todos";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content: "Listado de clientes con cumplimiento, sugerido, comprado y faltante en unidades y packs.",
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
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [ruta, setRuta] = useState("todas");

  const rutas = useMemo(
    () =>
      Array.from(new Set((data?.clientes ?? []).map((c) => c.ruta))).sort((a, b) =>
        a.localeCompare(b, "es", { numeric: true }),
      ),
    [data],
  );

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (data?.clientes ?? []).filter((c) => {
      const coincideEstado =
        estado === "todos"
          ? true
          : estado === "ambiguo"
            ? Boolean(c.tieneAmbiguedad)
            : !c.tieneAmbiguedad && c.estado === estado;

      return (
        (ruta === "todas" || c.ruta === ruta) &&
        coincideEstado &&
        (!texto ||
          c.cliente.toLowerCase().includes(texto) ||
          c.razon_social.toLowerCase().includes(texto))
      );
    });
  }, [data, busqueda, estado, ruta]);

  return (
    <AppShell titulo="Clientes" subtitulo={`${filtrados.length} clientes`}>
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
            placeholder="Buscar por número o razón social"
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

          <div className="flex flex-wrap gap-2">
            {(["todos", "critico", "amarillo", "verde", "ambiguo"] as const).map((e) => (
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
                {e === "todos"
                  ? "Todos"
                  : e === "critico"
                    ? "Críticos"
                    : e === "amarillo"
                      ? "Por cerrar"
                      : e === "verde"
                        ? "Cumplidos"
                        : "Ambiguos"}
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
                  <EstadoBadge estado={c.estado} ambiguo={c.tieneAmbiguedad} />
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
