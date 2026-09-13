import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock,
  Loader2,
  PackageSearch,
  Upload,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BarraCumplimiento, SinDatos, Tarjeta } from "@/components/Indicadores";
import { nf, nf1, traerCruce, type Semaforo } from "@/lib/datos";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";

const ACCESOS = [
  { to: "/clientes", label: "Clientes", detalle: "Cumplimiento y faltante", icon: Users, soloAdmin: false },
  {
    to: "/pendientes",
    label: "Pendientes Desarrollo",
    detalle: "MPR con faltante > 0",
    icon: ClipboardList,
    soloAdmin: false,
  },
  {
    to: "/equivalencias",
    label: "Equivalencias MPR",
    detalle: "Unidades por pack",
    icon: Boxes,
    soloAdmin: false,
  },
  {
    to: "/importar",
    label: "Importar Excel",
    detalle: "Carga manual de respaldo",
    icon: Upload,
    soloAdmin: true,
  },
] as const;

type FiltroEstado = Semaforo | "ambiguo" | "todos";

export const Route = createFileRoute("/_authenticated/panel")({
  head: () => ({
    meta: [
      { title: "Panel general — Pedido Sugerido Tucumán" },
      {
        name: "description",
        content: "Cumplimiento, clientes críticos, por cerrar, cumplidos y ambiguos.",
      },
      { property: "og:title", content: "Panel general — Pedido Sugerido Tucumán" },
      { property: "og:description", content: "Cumplimiento consolidado del equipo en Tucumán." },
    ],
  }),
  component: Panel,
});

function Panel() {
  const { esAdmin } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ["cruce"], queryFn: traerCruce });

  const [ruta, setRuta] = useState("todas");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [busqueda, setBusqueda] = useState("");

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
  }, [data, ruta, estado, busqueda]);

  const resumen = useMemo(() => {
    const ambiguos = filtrados.filter((c) => c.tieneAmbiguedad).length;
    const criticos = filtrados.filter((c) => !c.tieneAmbiguedad && c.estado === "critico").length;
    const porCerrar = filtrados.filter((c) => !c.tieneAmbiguedad && c.estado === "amarillo").length;
    const cumplidos = filtrados.filter((c) => !c.tieneAmbiguedad && c.estado === "verde").length;

    const sugerido = filtrados.reduce((a, c) => a + c.sugerido, 0);
    const compradoAplicado = filtrados.reduce((a, c) => a + Math.min(c.comprado, c.sugerido), 0);
    const cumplimiento = sugerido > 0 ? Math.min((compradoAplicado / sugerido) * 100, 100) : null;

    const faltante = filtrados.reduce((a, c) => a + c.faltante, 0);
    return { criticos, porCerrar, cumplidos, ambiguos, cumplimiento, faltante };
  }, [filtrados]);

  const fechaActualizacion = data
    ? new Date(data.importacion.created_at).toLocaleDateString("es-AR")
    : null;

  return (
    <AppShell
      titulo="Panel general"
      subtitulo={fechaActualizacion ? `Actualizado al ${fechaActualizacion}` : undefined}
    >
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <SinDatos mensaje="Todavía no hay datos procesados para mostrar." />
      ) : (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cumplimiento general
            </p>
            <p className="numero-tabular mt-1 text-5xl font-bold leading-none">
              {resumen.cumplimiento !== null ? `${nf1.format(resumen.cumplimiento)}%` : "—"}
            </p>
            <div className="mt-3">
              <BarraCumplimiento valor={resumen.cumplimiento} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {filtrados.length} clientes considerados · cálculo ponderado por sugerido
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Tarjeta
              titulo="Críticos"
              valor={resumen.criticos}
              detalle="Menos de 70%"
              tono="critico"
              icono={<AlertTriangle className="size-4 text-critico" />}
            />
            <Tarjeta
              titulo="Por cerrar"
              valor={resumen.porCerrar}
              detalle="Entre 70% y 99%"
              tono="amarillo"
              icono={<Clock className="size-4 text-alerta-foreground" />}
            />
            <Tarjeta
              titulo="Cumplidos"
              valor={resumen.cumplidos}
              detalle="100%"
              tono="verde"
              icono={<CheckCircle2 className="size-4 text-exito" />}
            />
            <Tarjeta
              titulo="Ambiguos"
              valor={resumen.ambiguos}
              detalle="Requieren revisión de cliente"
              icono={<CircleHelp className="size-4 text-muted-foreground" />}
            />
            <Tarjeta
              titulo="Faltante total"
              valor={nf.format(Math.round(resumen.faltante))}
              detalle="Unidades por MPR"
              icono={<PackageSearch className="size-4 text-primary" />}
            />
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filtros
            </p>

            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente o razón social"
              className="h-11"
            />

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Ruta
              </label>
              <select
                value={ruta}
                onChange={(e) => setRuta(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          </div>

          <Link
            to="/clientes"
            className="block rounded-2xl border border-border bg-surface p-4 text-center text-sm font-semibold text-primary shadow-card"
          >
            Ver listado completo de clientes
          </Link>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3">
        {ACCESOS.filter((a) => !a.soloAdmin || esAdmin).map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="rounded-2xl border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <a.icon className="size-5" />
            </span>
            <p className="mt-2 text-sm font-bold">{a.label}</p>
            <p className="text-xs text-muted-foreground">{a.detalle}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
