import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SinDatos } from "@/components/Indicadores";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { traerEquivalencias, type Equivalencia } from "@/lib/datos";

export const Route = createFileRoute("/_authenticated/equivalencias")({
  head: () => ({
    meta: [
      { title: "Equivalencias MPR — Pedido Sugerido Tucumán" },
      { name: "description", content: "Tabla de unidades por pack para cada MPR, editable por el Administrador." },
      { property: "og:title", content: "Equivalencias MPR — Pedido Sugerido Tucumán" },
      { property: "og:description", content: "Unidades por pack de cada MPR." },
    ],
  }),
  component: Equivalencias,
});

function Equivalencias() {
  const { esAdmin } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["equivalencias"], queryFn: traerEquivalencias });
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState({ mpr: "", descripcion: "", unidades: "" });

  const guardar = useMutation({
    mutationFn: async (fila: { mpr: string; descripcion: string | null; unidades_por_pack: number | null }) => {
      const { error } = await supabase.from("equivalencias_mpr").upsert(
        {
          mpr: fila.mpr,
          descripcion: fila.descripcion,
          unidades_por_pack: fila.unidades_por_pack,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mpr" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Equivalencia guardada");
      qc.invalidateQueries({ queryKey: ["equivalencias"] });
      qc.invalidateQueries({ queryKey: ["cruce"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (data ?? []).filter(
      (e) => !texto || e.mpr.toLowerCase().includes(texto) || (e.descripcion ?? "").toLowerCase().includes(texto),
    );
  }, [data, busqueda]);

  return (
    <AppShell titulo="Equivalencias MPR" subtitulo="Unidades por pack">
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {!esAdmin ? (
            <p className="rounded-xl border border-alerta/40 bg-alerta-soft px-4 py-3 text-sm text-alerta-foreground">
              Solo un Administrador puede modificar las equivalencias.
            </p>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-card">
              <p className="text-sm font-bold uppercase tracking-wide">Nueva equivalencia</p>
              <Input
                value={nuevo.mpr}
                onChange={(e) => setNuevo({ ...nuevo, mpr: e.target.value })}
                placeholder="MPR"
                className="h-11"
              />
              <Input
                value={nuevo.descripcion}
                onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                placeholder="Descripción"
                className="h-11"
              />
              <Input
                value={nuevo.unidades}
                onChange={(e) => setNuevo({ ...nuevo, unidades: e.target.value })}
                placeholder="Unidades por pack"
                inputMode="decimal"
                className="h-11"
              />
              <Button
                className="h-11 w-full"
                disabled={!nuevo.mpr.trim() || guardar.isPending}
                onClick={() =>
                  guardar.mutate(
                    {
                      mpr: nuevo.mpr.trim(),
                      descripcion: nuevo.descripcion.trim() || null,
                      unidades_por_pack: nuevo.unidades ? Number(nuevo.unidades.replace(",", ".")) : null,
                    },
                    { onSuccess: () => setNuevo({ mpr: "", descripcion: "", unidades: "" }) },
                  )
                }
              >
                <Plus className="size-4" /> Agregar
              </Button>
            </div>
          )}

          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar MPR"
            className="h-12"
          />

          <div className="space-y-3">
            {filtradas.map((e) => (
              <FilaEquivalencia
                key={e.mpr}
                fila={e}
                editable={esAdmin}
                onGuardar={(descripcion, unidades) =>
                  guardar.mutate({ mpr: e.mpr, descripcion, unidades_por_pack: unidades })
                }
              />
            ))}
            {filtradas.length === 0 ? (
              <SinDatos mensaje="Todavía no hay equivalencias cargadas. Sin equivalencia, el faltante se muestra solo en unidades." />
            ) : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function FilaEquivalencia({
  fila,
  editable,
  onGuardar,
}: {
  fila: Equivalencia;
  editable: boolean;
  onGuardar: (descripcion: string | null, unidades: number | null) => void;
}) {
  const [descripcion, setDescripcion] = useState(fila.descripcion ?? "");
  const [unidades, setUnidades] = useState(fila.unidades_por_pack?.toString() ?? "");

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
      <p className="text-sm font-bold">{fila.mpr}</p>
      {editable ? (
        <div className="mt-2 space-y-2">
          <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Descripción" className="h-11" />
          <div className="flex gap-2">
            <Input
              value={unidades}
              onChange={(e) => setUnidades(e.target.value)}
              inputMode="decimal"
              placeholder="Unidades por pack"
              className="h-11"
            />
            <Button
              variant="secondary"
              className="h-11 shrink-0"
              onClick={() =>
                onGuardar(descripcion.trim() || null, unidades ? Number(unidades.replace(",", ".")) : null)
              }
            >
              <Save className="size-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{fila.descripcion ?? "—"}</span>
          <span className="numero-tabular font-bold">
            {fila.unidades_por_pack ? `${fila.unidades_por_pack} u/pack` : "pendiente"}
          </span>
        </div>
      )}
    </div>
  );
}
