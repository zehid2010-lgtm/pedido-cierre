import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: LayoutProtegido,
});

function LayoutProtegido() {
  const { session, cargando } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!cargando && !session) navigate({ to: "/", replace: true });
  }, [cargando, session, navigate]);

  if (cargando || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return <Outlet />;
}
