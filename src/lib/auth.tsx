import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Rol = "administrador" | "desarrollo";

type AuthValue = {
  session: Session | null;
  user: User | null;
  rol: Rol | null;
  nombre: string;
  esAdmin: boolean;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  rol: null,
  nombre: "",
  esAdmin: false,
  cargando: true,
  cerrarSesion: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [nombre, setNombre] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion);
      if (!nuevaSesion) {
        setRol(null);
        setNombre("");
      }
      setCargando(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) return;
    let activo = true;
    (async () => {
      const [{ data: roles }, { data: perfil }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profiles").select("nombre").eq("id", uid).maybeSingle(),
      ]);
      if (!activo) return;
      const lista = (roles ?? []).map((r) => r.role as Rol);
      setRol(lista.includes("administrador") ? "administrador" : (lista[0] ?? "desarrollo"));
      setNombre(perfil?.nombre ?? session?.user?.email?.split("@")[0] ?? "");
    })();
    return () => {
      activo = false;
    };
  }, [session?.user?.id, session?.user?.email]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRol(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        rol,
        nombre,
        esAdmin: rol === "administrador",
        cargando,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
