import type { ReactNode } from "react";
import { claseBarra, claseSemaforo, ETIQUETA_SEMAFORO, semaforo, type Semaforo } from "@/lib/datos";
import { cn } from "@/lib/utils";

export function EstadoBadge({
  estado,
  ambiguo = false,
}: {
  estado: Semaforo;
  ambiguo?: boolean;
}) {
  if (ambiguo) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
        <span className="size-2 rounded-full bg-muted-foreground" />
        Ambiguo
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        claseSemaforo(estado),
      )}
    >
      <span className={cn("size-2 rounded-full", claseBarra(estado))} />
      {ETIQUETA_SEMAFORO[estado]}
    </span>
  );
}

export function BarraCumplimiento({ valor }: { valor: number | null }) {
  const estado = semaforo(valor);
  const ancho = Math.max(0, Math.min(100, valor ?? 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", claseBarra(estado))} style={{ width: `${ancho}%` }} />
    </div>
  );
}

export function Tarjeta({
  titulo,
  valor,
  detalle,
  tono = "neutro",
  icono,
}: {
  titulo: string;
  valor: ReactNode;
  detalle?: string;
  tono?: "neutro" | "critico" | "amarillo" | "verde";
  icono?: ReactNode;
}) {
  const tonos: Record<string, string> = {
    neutro: "bg-surface border-border",
    critico: "bg-critico-soft border-critico/25",
    amarillo: "bg-alerta-soft border-alerta/30",
    verde: "bg-exito-soft border-exito/25",
  };
  return (
    <div className={cn("rounded-2xl border p-4 shadow-card", tonos[tono])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
        {icono}
      </div>
      <p className="numero-tabular mt-1 text-3xl font-bold leading-none">{valor}</p>
      {detalle ? <p className="mt-1.5 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}

export function SinDatos({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-sm text-muted-foreground">{mensaje}</p>
    </div>
  );
}
