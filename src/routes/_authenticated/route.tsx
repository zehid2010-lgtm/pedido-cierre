import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: LayoutLocal,
});

function LayoutLocal() {
  return <Outlet />;
}
