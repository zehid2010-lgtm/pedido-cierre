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

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists"))
    return "Ese correo ya tiene una cuenta. Usá la pestaña Ingresar.";
  if (m.includes("password") && (m.includes("least") || m.includes("short")))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("weak") || m.includes("pwned") || m.includes("leaked"))
    return "La contraseña es demasiado débil o conocida. Elegí otra más segura.";
  if (m.includes("invalid") && m.includes("email"))
    return "El correo no es válido.";
  if (m.includes("email not confirmed"))
    return "Tenés que confirmar tu correo antes de ingresar. Revisá tu bandeja.";
  if (m.includes("rate limit"))
    return "Demasiados intentos. Esperá unos minutos y probá de nuevo.";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "No se pudo conectar con el servidor. Verificá tu conexión o usá la dirección oficial de la app.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "El registro de cuentas está deshabilitado.";
  return msg;
}

function Acceso() {
  const [modo, setModo] = useState<"ingresar" | "crear">("ingresar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function ingresar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setAviso("");
    setEnviando(true);

    try {
      if (modo === "ingresar") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setError(
            error.message.toLowerCase().includes("invalid login")
              ? "Correo o contraseña incorrectos."
              : traducirError(error.message),
          );
        }
      } else {
        if (!nombre.trim()) {
          setError("Ingresá tu nombre y apellido.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: new URL(import.meta.env.BASE_URL, window.location.origin).toString(),
            data: { nombre: nombre.trim() },
          },
        });
        if (error) {
          setError(traducirError(error.message));
        } else if (!data.session) {
          setAviso(
            "Cuenta creada. Revisá tu correo y confirmá el enlace para poder ingresar.",
          );
          setModo("ingresar");
        }
      }
    } catch (err) {
      setError(traducirError(err instanceof Error ? err.message : String(err)));
    } finally {
      setEnviando(false);
    }
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

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["ingresar", "crear"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setModo(m);
                setError("");
              }}
              className={
                "h-9 rounded-lg text-sm font-bold " +
                (modo === m
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground")
              }
            >
              {m === "ingresar" ? "Ingresar" : "Crear cuenta"}
            </button>
          ))}
        </div>

        {aviso ? (
          <div className="mt-4 rounded-xl bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {aviso}
          </div>
        ) : null}

        <form onSubmit={ingresar} className="mt-4 space-y-4">
          {modo === "crear" ? (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Nombre y apellido
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre Apellido"
                required
                autoComplete="name"
              />
            </div>
          ) : null}

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
              autoComplete={modo === "crear" ? "new-password" : "current-password"}
              minLength={6}
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
              modo === "crear" ? "Crear cuenta" : "Ingresar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
