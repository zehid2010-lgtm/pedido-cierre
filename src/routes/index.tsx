import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Boxes, ClipboardList, Truck, Upload, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pedido Sugerido — Desarrollo Tucumán" },
      {
        name: "description",
        content:
          "Seguimiento del pedido sugerido por cliente y MPR: cumplimiento, faltantes y pendientes de Desarrollo en Tucumán.",
      },
      { property: "og:title", content: "Pedido Sugerido — Desarrollo Tucumán" },
      {
        property: "og:description",
        content: "Seguimiento del pedido sugerido y del faltante por MPR para el equipo de Desarrollo.",
      },
    ],
  }),
  component: Inicio,
});

const TARJETAS = [
  {
    to: "/panel",
    label: "Dashboard",
    detalle: "Cumplimiento general y estados de clientes",
    icon: BarChart3,
  },
  {
    to: "/clientes",
    label: "Clientes",
    detalle: "Sugerido, comprado y faltante por cliente",
    icon: Users,
  },
  {
    to: "/pendientes",
    label: "Pendientes Desarrollo",
    detalle: "MPR con faltante para la tercera visita",
    icon: ClipboardList,
  },
  {
    to: "/equivalencias",
    label: "Equivalencias",
    detalle: "Unidades por pack de cada MPR",
    icon: Boxes,
  },
  {
    to: "/importar",
    label: "Importación",
    detalle: "Cargar los dos Excel originales",
    icon: Upload,
  },
] as const;

function Inicio() {
  return (
    <div className="brand-gradient min-h-screen px-5 py-10 text-primary-foreground">
      <div className="mx-auto w-full max-w-md">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/15">
          <Truck className="size-6" />
        </span>
        <h1 className="mt-4 text-3xl font-bold uppercase leading-tight">
          Pedido Sugerido - Desarrollo Tucumán
        </h1>
        <p className="mt-3 text-sm opacity-85">
          Herramienta de campo para seguir el sugerido, lo comprado y el faltante por MPR. Versión
          de demostración con datos de ejemplo.
        </p>

        <div className="mt-8 space-y-3">
          {TARJETAS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-4 rounded-2xl bg-surface p-4 text-foreground shadow-raised transition-transform active:scale-[0.98]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <t.icon className="size-5" />
              </span>
              <span>
                <span className="block text-base font-bold">{t.label}</span>
                <span className="block text-xs text-muted-foreground">{t.detalle}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
