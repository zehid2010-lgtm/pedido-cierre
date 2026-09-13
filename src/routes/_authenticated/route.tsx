import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, LogIn } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: LayoutProtegido,
});

function LayoutProtegido() {
  const { session, cargando } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Acceso />;
  }

  return <Outlet />;
}

function Acceso() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setEnviando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setError("Correo o contraseña incorrectos.");
    }

    setEnviando(false);
  }

  return (
    <div className="brand-gradient flex min-h-screen items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-raised">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LogIn className="size-6" />
        </div>

        <h1 className="mt-4 text-center text-2xl font-bold uppercase">
          Pedido Sugerido
        </h1>

        <p className="mt-1 text-center text-sm text-muted-foreground">
          Desarrollo Tucumán
        </p>

        <form onSubmit={ingresar} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Correo
            </label>

            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@empresa.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Contraseña
            </label>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              required
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-xl bg-critico-soft px-3 py-2 text-sm font-semibold text-critico">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              "Ingresar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
