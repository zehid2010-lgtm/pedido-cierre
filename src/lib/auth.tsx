import { createContext, useContext, type ReactNode } from "react";

export type Rol = "administrador" | "desarrollo";

type UsuarioLocal = {
  id: string;
  email: string | null;
};

type AuthValue = {
  session: { local: true } | null;
  user: UsuarioLocal | null;
  rol: Rol | null;
  nombre: string;
  esAdmin: boolean;
  cargando: boolean;
  cerrarSesion: () => Promise<void>;
};

const valorLocal: AuthValue = {
  session: { local: true },
  user: { id: "local-admin", email: null },
  rol: "administrador",
  nombre: "richar miguel",
  esAdmin: true,
  cargando: false,
  cerrarSesion: async () => {},
};

const AuthContext = createContext<AuthValue>(valorLocal);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={valorLocal}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
