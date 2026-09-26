import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/actualizar")({
  beforeLoad: () => {
    throw redirect({ to: "/importar", search: { build: "20" } as never });
  },
  component: () => null,
});
