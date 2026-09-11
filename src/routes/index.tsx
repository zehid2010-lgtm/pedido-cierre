import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LockKeyhole, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ingresar — Pedido Sugerido Desarrollo Tucumán" },
      {
        name: "description",
        content:
          "Acceso del equipo comercial al seguimiento de pedido sugerido, faltantes por MPR y pendientes de Desarrollo en Tucumán.",
      },
      { property: "og:title", content: "Ingresar — Pedido Sugerido Desarrollo Tucumán" },
      {
        property: "og:description",
        content: "Acceso del equipo comercial al seguimiento de pedido sugerido en Tucumán.",
      },
    ],
  }),
  component: Ingreso,
});

function Ingreso() {
  const { session, cargando } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<"ingresar" | "registrar">("ingresar");
  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!cargando && session) navigate({ to: "/panel", replace: true });
  }, [cargando, session, navigate]);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "ingresar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
        if (error) throw error;
        navigate({ to: "/panel", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: clave,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nombre },
          },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/panel", replace: true });
        else toast.success("Cuenta creada. Revisá tu correo para confirmarla y después ingresá.");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No se pudo completar la operación";
      toast.error(
        msg.includes("Invalid login credentials") ? "Correo o contraseña incorrectos" : msg,
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="brand-gradient flex min-h-screen flex-col justify-center px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 text-primary-foreground">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/15">
            <Truck className="size-6" />
          </span>
          <h1 className="mt-4 text-3xl font-bold uppercase leading-tight">Pedido Sugerido</h1>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-75">
            Desarrollo Tucumán
          </p>
          <p className="mt-3 text-sm opacity-85">
            Seguimiento del sugerido, lo comprado y el faltante por MPR para cerrar la semana.
          </p>
        </div>

        <div className="rounded-2xl bg-surface p-5 shadow-raised">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
            {(["ingresar", "registrar"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={
                  "rounded-lg py-2 text-sm font-semibold capitalize transition-colors " +
                  (modo === m ? "bg-surface text-primary shadow-card" : "text-muted-foreground")
                }
              >
                {m === "ingresar" ? "Ingresar" : "Crear cuenta"}
              </button>
            ))}
          </div>

          <form onSubmit={enviar} className="space-y-4">
            {modo === "registrar" ? (
              <div className="space-y-1.5">
                <Label htmlFor="nombre">Nombre y apellido</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="h-12"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@empresa.com"
                required
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clave">Contraseña</Label>
              <Input
                id="clave"
                type="password"
                autoComplete={modo === "ingresar" ? "current-password" : "new-password"}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
                minLength={6}
                className="h-12"
              />
            </div>
            <Button type="submit" disabled={enviando} className="h-12 w-full text-base font-semibold">
              {enviando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LockKeyhole className="size-4" />
              )}
              {modo === "ingresar" ? "Ingresar" : "Crear cuenta"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            El primer usuario registrado queda como Administrador. Los siguientes ingresan con perfil
            Desarrollo (solo lectura).
          </p>
        </div>
      </div>
    </div>
  );
}
